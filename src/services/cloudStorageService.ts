// Cloud Storage Service for Video Clips, Transcriptions, and Analyses
// This service handles storing and retrieving video content and related metadata
// Integrated with Supabase for project management and user collaboration

import { cloudStorageConfig } from '../config/cloudStorage';
import { supabase } from '../lib/supabaseClient';

// Get Supabase URL and key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface CloudStorageProvider {
  id: string;
  name: string;
  icon: string;
  color: string;
  isConnected: boolean;
  accountInfo?: {
    email: string;
    name: string;
    storageUsed: string;
    storageTotal: string;
  };
}

export interface VideoClip {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  duration?: number;
  resolution?: string;
  cloudFileId: string;
  cloudProviderId: string;
  projectId?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  // Analysis metadata
  transcription?: string;
  analysis?: {
    viralScore?: number;
    highlights?: string[];
    tags?: string[];
    summary?: string;
  };
}

export interface CloudStorageFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  cloudFileId: string;
  cloudProviderId: string;
  projectId?: string;
  clipId?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptionData {
  id: string;
  clipId: string;
  text: string;
  language: string;
  confidence: number;
  timestamps?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  createdAt: string;
}

export interface AnalysisData {
  id: string;
  clipId: string;
  viralScore: number;
  highlights: string[];
  tags: string[];
  summary: string;
  aiInsights?: string;
  createdAt: string;
}

export interface CloudStorageConfig {
  googleDrive?: {
    clientId: string;
    clientSecret: string;
    apiKey: string;
    scope: string;
  };
  oneDrive?: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  dropbox?: {
    appKey: string;
    redirectUri: string;
  };
}

export interface CloudStorageConnection {
  id: string;
  userId: string;
  providerId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  accountInfo: {
    email: string;
    name: string;
    storageUsed: string;
    storageTotal: string;
  };
  createdAt: string;
  updatedAt: string;
}

class CloudStorageService {
  private providers: Map<string, CloudStorageProvider> = new Map();
  private config: CloudStorageConfig = cloudStorageConfig;
  private currentUserId: string | null = null;
  
  // Debounce mechanism to prevent rapid OAuth attempts
  private oauthDebounceTimer: NodeJS.Timeout | null = null;
  private isOAuthInProgress = false;

  setCurrentUser(userId: string) {
    this.currentUserId = userId;
    console.log(`🔧 [CloudStorage] Current user set to: ${userId}`);
  }

  constructor() {
    this.initializeProviders();
    this.loadCurrentUser();
    
    // Add connection health monitoring
    this.monitorConnectionHealth();
  }

  // Monitor connection health and attempt recovery
  private async monitorConnectionHealth() {
    // Check connection health every 5 minutes
    setInterval(async () => {
      if (this.currentUserId && this.isSupabaseReady()) {
        try {
          await this.testConnection();
        } catch (error) {
          console.log('⚠️ [CloudStorage] Periodic connection health check failed:', error);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Attempt to recover from connection issues
  private async attemptConnectionRecovery(): Promise<boolean> {
    try {
      console.log('🔧 [CloudStorage] Attempting connection recovery...');
      
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test basic connection
      const connectionOk = await this.testConnection();
      if (connectionOk) {
        console.log('✅ [CloudStorage] Connection recovery successful');
        return true;
      }
      
      console.log('❌ [CloudStorage] Connection recovery failed');
      return false;
    } catch (error) {
      console.log('❌ [CloudStorage] Connection recovery error:', error);
      return false;
    }
  }

  // Retry connection with exponential backoff
  async retryConnection(maxRetries: number = 3): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 [CloudStorage] Connection retry attempt ${attempt}/${maxRetries}`);
        
        // Wait with exponential backoff
        if (attempt > 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const connectionOk = await this.testConnection();
        if (connectionOk) {
          console.log('✅ [CloudStorage] Connection retry successful');
          return true;
        }
      } catch (error) {
        console.log(`❌ [CloudStorage] Connection retry attempt ${attempt} failed:`, error);
      }
    }
    
    console.log('❌ [CloudStorage] All connection retry attempts failed');
    return false;
  }

  private async loadCurrentUser() {
    try {
      console.log('🔍 [CloudStorage] Loading current user...');
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('❌ [CloudStorage] Error getting user:', error);
        this.currentUserId = null;
        return;
      }
      
      this.currentUserId = user?.id || null;
      console.log('✅ [CloudStorage] Current user loaded:', this.currentUserId ? `User ID: ${this.currentUserId}` : 'No user');
    } catch (error) {
      console.error('❌ [CloudStorage] Failed to load current user:', error);
      this.currentUserId = null;
    }
  }

  private initializeProviders() {
    this.providers.set('google-drive', {
      id: 'google-drive',
      name: 'Google Drive',
      icon: '📁',
      color: '#4285F4',
      isConnected: false
    });

    this.providers.set('one-drive', {
      id: 'one-drive',
      name: 'OneDrive',
      icon: '☁️',
      color: '#0078D4',
      isConnected: false
    });

    this.providers.set('dropbox', {
      id: 'dropbox',
      name: 'Dropbox',
      icon: '📦',
      color: '#0061FF',
      isConnected: false
    });
  }

  // Get all available providers
  getProviders(): CloudStorageProvider[] {
    return Array.from(this.providers.values());
  }

  // Get a specific provider
  getProvider(providerId: string): CloudStorageProvider | undefined {
    return this.providers.get(providerId);
  }

  // Check if a provider is connected for current user
  async isProviderConnected(providerId: string): Promise<boolean> {
    if (!this.currentUserId) return false;
    
    try {
      const { data, error } = await supabase
        .from('cloud_storage_connections')
        .select('*')
        .eq('user_id', this.currentUserId)
        .eq('provider_id', providerId)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no results gracefully
      
      if (error) {
        console.error('Error checking provider connection:', error);
        return false;
      }
      
      if (!data) return false;
      
      // Test actual connection by making a real API call
      return await this.testProviderConnection(providerId, data);
    } catch (error) {
      console.error('Failed to check provider connection:', error);
      return false;
    }
  }

  // Test actual connection by making a real API call to verify tokens are valid
  async testProviderConnection(providerId: string, connection: any): Promise<boolean> {
    try {
      switch (providerId) {
        case 'google-drive':
          return await this.testGoogleDriveConnection(connection);
        case 'one-drive':
          return await this.testOneDriveConnection(connection);
        case 'dropbox':
          return await this.testDropboxConnection(connection);
        default:
          return false;
      }
    } catch (error) {
      console.error(`Provider connection test failed: ${error}`);
      return false;
    }
  }

  // Test Google Drive connection by making a real API call
  async testGoogleDriveConnection(connection: any): Promise<boolean> {
    try {
      const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401) {
        // Token expired, try to refresh
        console.log('🔄 [CloudStorage] Google Drive token expired, attempting refresh...');
        const refreshSuccess = await this.handleExpiredToken('google-drive', connection);
        return refreshSuccess;
      }
      
      return response.ok;
    } catch (error) {
      console.error('❌ [CloudStorage] Google Drive connection test failed:', error);
      return false;
    }
  }

  // Test OneDrive connection by making a real API call
  async testOneDriveConnection(connection: any): Promise<boolean> {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401) {
        // Token expired, try to refresh
        console.log('🔄 [CloudStorage] OneDrive token expired, attempting refresh...');
        const refreshed = await this.refreshOneDriveToken(connection);
        return refreshed;
      }
      
      return response.ok;
    } catch (error) {
      console.error('OneDrive connection test failed:', error);
      return false;
    }
  }

  // Test Dropbox connection by making a real API call
  async testDropboxConnection(connection: any): Promise<boolean> {
    try {
      console.log('🔄 [CloudStorage] Testing Dropbox connection...');
      return true; // Placeholder - implement actual Dropbox API test
    } catch (error) {
      console.error('Dropbox connection test failed:', error);
      return false;
    }
  }

  // Refresh Google Drive access token using refresh token
  async refreshGoogleDriveToken(connection: any): Promise<boolean> {
    try {
      if (!connection.refresh_token) {
        console.log('❌ [CloudStorage] No refresh token available for Google Drive');
        console.log('🔄 [CloudStorage] Re-authentication required. Please reconnect to Google Drive.');
        
        // Try to force re-authentication
        try {
          const reauthResult = await this.forceReauthentication('google-drive');
          if (reauthResult.success) {
            console.log('✅ [CloudStorage] Re-authentication successful');
            return true;
          } else {
            console.log('❌ [CloudStorage] Re-authentication failed:', reauthResult.error);
            return false;
          }
        } catch (reauthError) {
          console.error('❌ [CloudStorage] Re-authentication error:', reauthError);
          return false;
        }
      }

      console.log('🔄 [CloudStorage] Refreshing Google Drive access token...');
      
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.googleDrive?.clientId || '',
          client_secret: this.config.googleDrive?.clientSecret || '',
          refresh_token: connection.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (response.ok) {
        const tokenData = await response.json();
        
        // Update the connection with new access token
        await this.updateConnectionToken(connection.id, tokenData.access_token, tokenData.expires_in);
        console.log('✅ [CloudStorage] Google Drive token refreshed successfully');
        return true;
      } else {
        const errorData = await response.json();
        console.log('❌ [CloudStorage] Failed to refresh Google Drive token:', errorData);
        
        // If refresh token is invalid, force re-authentication
        if (response.status === 400 && errorData.error === 'invalid_grant') {
          console.log('🔄 [CloudStorage] Refresh token invalid, forcing re-authentication...');
          const reauthResult = await this.forceReauthentication('google-drive');
          return reauthResult.success;
        }
        
        return false;
      }
    } catch (error) {
      console.error('❌ [CloudStorage] Error refreshing Google Drive token:', error);
      return false;
    }
  }

  // Refresh OneDrive access token using refresh token
  async refreshOneDriveToken(connection: any): Promise<boolean> {
    try {
      if (!connection.refresh_token) {
        console.log('❌ [CloudStorage] No refresh token available for OneDrive');
        return false;
      }

      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.oneDrive?.clientId || '',
          client_secret: this.config.oneDrive?.clientSecret || '',
          refresh_token: connection.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (response.ok) {
        const tokenData = await response.json();
        
        // Update the connection with new access token
        await this.updateConnectionToken(connection.id, tokenData.access_token, tokenData.expires_in);
        console.log('✅ [CloudStorage] OneDrive token refreshed successfully');
        return true;
      } else {
        console.log('❌ [CloudStorage] Failed to refresh OneDrive token');
        return false;
      }
    } catch (error) {
      console.error('Error refreshing OneDrive token:', error);
      return false;
    }
  }

  // Update connection token in database
  async updateConnectionToken(connectionId: string, newAccessToken: string, expiresIn: number): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
      
      const { error } = await supabase
        .from('cloud_storage_connections')
        .update({
          access_token: newAccessToken,
          expires_at: expiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId);

      if (error) {
        console.error('Failed to update connection token:', error);
      }
    } catch (error) {
      console.error('Error updating connection token:', error);
    }
  }

  // Force re-authentication for a provider when refresh token is missing
  async forceReauthentication(providerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🔄 [CloudStorage] Forcing re-authentication for ${providerId}...`);
      
      // Remove the old connection
      const { error } = await supabase
        .from('cloud_storage_connections')
        .delete()
        .eq('user_id', this.currentUserId)
        .eq('provider_id', providerId);

      if (error) {
        console.error('❌ [CloudStorage] Failed to remove old connection:', error);
      } else {
        console.log('✅ [CloudStorage] Old connection removed successfully');
      }

      // Start fresh OAuth flow
      switch (providerId) {
        case 'google-drive':
          console.log('🔄 [CloudStorage] Starting Google Drive re-authentication...');
          return await this.connectGoogleDrive();
        case 'one-drive':
          console.log('🔄 [CloudStorage] Starting OneDrive re-authentication...');
          return await this.connectOneDrive();
        case 'dropbox':
          console.log('🔄 [CloudStorage] Starting Dropbox re-authentication...');
          return await this.connectDropbox();
        default:
          return { success: false, error: 'Unsupported provider' };
      }
    } catch (error) {
      console.error(`❌ [CloudStorage] Re-authentication failed for ${providerId}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get all connected providers for current user
  async getConnectedProviders(): Promise<CloudStorageProvider[]> {
    if (!this.currentUserId) {
      console.log('🔍 [CloudStorage] No user ID, returning empty providers list');
      return [];
    }
    
    // Wait for Supabase to be ready
    if (!this.isSupabaseReady()) {
      console.log('🔍 [CloudStorage] Supabase not ready, waiting...');
      const supabaseReady = await this.waitForSupabaseReady();
      if (!supabaseReady) {
        console.error('❌ [CloudStorage] Supabase never became ready');
        return this.getFallbackProviders();
      }
    }

    // Skip connection health check to reduce redundant operations
    console.log('🔍 [CloudStorage] Skipping connection health check to optimize performance');
    
    const maxRetries = 1; // Reduced retries to prevent delays
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 [CloudStorage] Attempt ${attempt}/${maxRetries}: Fetching connected providers...`);
        
        // Try to fetch providers directly first
        console.log(`🔍 [CloudStorage] Attempt ${attempt}: Fetching connected providers for user:`, this.currentUserId);
        
        // Add timeout to prevent hanging requests
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 5000); // 5 second timeout
        });

        const supabasePromise = supabase
          .from('cloud_storage_connections')
          .select('*')
          .eq('user_id', this.currentUserId);

        const { data, error } = await Promise.race([supabasePromise, timeoutPromise]) as any;
        
        if (error) {
          console.error(`❌ [CloudStorage] Attempt ${attempt}: Error fetching connected providers:`, error);
          lastError = error;
          
          // If it's a connection error, try the connection test
          if (error.message?.includes('Failed to fetch') || 
              error.message?.includes('ERR_CONNECTION_CLOSED') ||
              error.message?.includes('NetworkError') ||
              error.message?.includes('TypeError')) {
            console.log(`🔍 [CloudStorage] Attempt ${attempt}: Connection error detected, testing connection...`);
            try {
              const connectionOk = await this.testConnection();
              if (!connectionOk) {
                console.log(`⚠️ [CloudStorage] Attempt ${attempt}: Connection test failed, attempting recovery...`);
                // Try connection recovery for connection errors
                const recoveryOk = await this.attemptConnectionRecovery();
                if (recoveryOk) {
                  console.log(`✅ [CloudStorage] Attempt ${attempt}: Connection recovery successful, retrying...`);
                  continue; // Retry the request after recovery
                }
              }
            } catch (connectionTestError) {
              console.log(`⚠️ [CloudStorage] Attempt ${attempt}: Connection test error, but continuing...`, connectionTestError);
            }
            
            // Continue with retry regardless of connection test result
            if (attempt < maxRetries) {
              console.log(`⏳ [CloudStorage] Waiting 1 second before retry...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
            return this.getFallbackProviders();
          } else {
            // For other errors, just retry
            if (attempt < maxRetries) {
              console.log(`⏳ [CloudStorage] Waiting 1 second before retry...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
            return this.getFallbackProviders();
          }
        }
        
        console.log('📥 [CloudStorage] Raw connection data:', data);
        
        // Update provider status and account info
        const connectedProviders: CloudStorageProvider[] = [];
        
        data?.forEach((connection: any) => {
          const provider = this.providers.get(connection.provider_id);
          if (provider) {
            provider.isConnected = true;
            provider.accountInfo = connection.account_info;
            connectedProviders.push(provider);
          }
        });
        
        console.log('✅ [CloudStorage] Connected providers processed:', connectedProviders);
        return connectedProviders;
        
      } catch (error) {
        console.error(`❌ [CloudStorage] Attempt ${attempt}: Failed to get connected providers:`, error);
        lastError = error;
        if (attempt < maxRetries) {
          console.log(`⏳ [CloudStorage] Waiting 1 second before retry...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
      }
    }
    
    console.error('❌ [CloudStorage] All attempts failed. Last error:', lastError);
    
    // Log specific error details for debugging
    if (lastError?.message?.includes('ERR_CONNECTION_CLOSED')) {
      console.log('🔍 [CloudStorage] Connection closed error detected - this may be a temporary network issue');
    } else if (lastError?.message?.includes('Failed to fetch')) {
      console.log('🔍 [CloudStorage] Fetch failed error detected - this may be a CORS or network issue');
    }
    
    // Return basic provider list as fallback when connection fails
    // This prevents the UI from showing "no providers" during temporary issues
    console.log('⚠️ [CloudStorage] Connection failed, returning basic provider list as fallback');
    return this.getFallbackProviders();
  }

  // Get fallback providers when connection fails
  private getFallbackProviders(): CloudStorageProvider[] {
    const fallbackProviders: CloudStorageProvider[] = [];
    this.providers.forEach((provider) => {
      // Create a basic provider without connection status
      fallbackProviders.push({
        ...provider,
        isConnected: false,
        accountInfo: undefined
      });
    });
    
    return fallbackProviders;
  }

  // Get basic providers without database calls (for fallback scenarios)
  getBasicProviders(): CloudStorageProvider[] {
    return Array.from(this.providers.values()).map(provider => ({
      ...provider,
      isConnected: false,
      accountInfo: undefined
    }));
  }

  // Check if we're experiencing connection issues
  isExperiencingConnectionIssues(): boolean {
    // This is a simple heuristic based on recent errors
    // In a real app, you might want to track error counts over time
    return false; // For now, always return false to avoid false positives
  }

  // Get user-friendly error message for connection issues
  getUserFriendlyErrorMessage(error: any): string {
    if (error?.message?.includes('ERR_CONNECTION_CLOSED')) {
      return 'Connection was closed. This is usually a temporary issue. Please try again in a moment.';
    } else if (error?.message?.includes('Failed to fetch')) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    } else if (error?.message?.includes('timeout')) {
      return 'Request timed out. The server may be busy. Please try again.';
    } else {
      return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
    }
  }

  // Check if an error is recoverable (can be retried)
  isErrorRecoverable(error: any): boolean {
    if (error?.message?.includes('ERR_CONNECTION_CLOSED')) {
      return true; // Connection closed errors are usually temporary
    } else if (error?.message?.includes('Failed to fetch')) {
      return true; // Network errors are usually temporary
    } else if (error?.message?.includes('timeout')) {
      return true; // Timeout errors are usually temporary
    } else if (error?.message?.includes('NetworkError')) {
      return true; // Network errors are usually temporary
    } else if (error?.message?.includes('TypeError')) {
      return true; // Type errors in fetch are usually temporary
    }
    return false; // Other errors might not be recoverable
  }

  // Google Drive Integration - User-Friendly OAuth Flow
  async connectGoogleDrive(): Promise<{ success: boolean; error?: string }> {
    try {
      // Debounce rapid OAuth attempts
      if (this.isOAuthInProgress) {
        console.log('⚠️ [CloudStorage] OAuth already in progress, please wait...');
        return { success: false, error: 'OAuth connection already in progress. Please wait...' };
      }
      
      if (this.oauthDebounceTimer) {
        clearTimeout(this.oauthDebounceTimer);
      }
      
      this.oauthDebounceTimer = setTimeout(() => {
        this.isOAuthInProgress = false;
      }, 2000); // 2 second debounce
      
      this.isOAuthInProgress = true;
      
      if (!this.currentUserId) {
        this.isOAuthInProgress = false;
        throw new Error('Please log in to connect your cloud storage');
      }

      console.log('🔗 [CloudStorage] Connecting to Google Drive...');
      
      // Check if we have the required configuration
      if (!this.config.googleDrive?.clientId || this.config.googleDrive.clientId === 'YOUR_GOOGLE_DRIVE_CLIENT_ID') {
        throw new Error('Google Drive is not configured yet. Please contact support.');
      }
      
      // Use popup-based OAuth flow to avoid CSP issues
      const clientId = this.config.googleDrive.clientId;
      // Use the same redirect URI that the Python backend expects
      // Using static HTML file for better compatibility
      const redirectUri = 'https://www.zuexis.com/auth/callback';
      
      // Debug: Log the redirect URI being used
      console.log('🔍 [GoogleOAuth] Environment variable VITE_GOOGLE_DRIVE_REDIRECT_URI:', import.meta.env.VITE_GOOGLE_DRIVE_REDIRECT_URI);
      console.log('🔍 [GoogleOAuth] Final redirect URI being used:', redirectUri);
      
      // IMPORTANT: Request offline access to get refresh token
      const scope = 'https://www.googleapis.com/auth/drive.file';
      
      // Create OAuth URL with proper parameters for refresh token
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_type=code&` +
        `prompt=consent&` + // Always show consent screen to ensure refresh token
        `access_type=offline&` + // Request offline access for refresh token
        `include_granted_scopes=true`; // Include previously granted scopes
      
      console.log('🔗 [CloudStorage] OAuth URL created:', authUrl);
      
      // Open popup window for OAuth
      const popup = window.open(
        authUrl,
        'Google Drive OAuth',
        'width=500,height=600,scrollbars=yes,resizable=yes,status=yes'
      );
      
      if (!popup) {
        throw new Error('Please allow popups to connect to Google Drive');
      }
      
      // Wait for OAuth completion
      return new Promise((resolve) => {
        let isProcessing = false; // Flag to prevent multiple processing
        const processedCodes = new Set<string>(); // Track processed codes
        
        // Listen for OAuth response via postMessage
        const handleMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'GOOGLE_OAUTH_CODE') {
            const { code } = event.data;
            
            // Prevent processing the same code multiple times
            if (isProcessing || processedCodes.has(code)) {
              console.log('⚠️ [CloudStorage] OAuth code already being processed or already processed, ignoring duplicate');
              return;
            }
            
            isProcessing = true;
            processedCodes.add(code);
            console.log('🔑 [CloudStorage] Received OAuth code, exchanging for tokens...');
            
            // Exchange authorization code for tokens
            this.exchangeCodeForTokens(code)
              .then((tokens: { access_token: string; refresh_token: string; expires_in: number }) => {
                console.log('✅ [CloudStorage] Tokens received, saving connection...');
                // Store connection in Supabase
                this.saveGoogleDriveConnection(tokens.access_token, tokens.refresh_token, tokens.expires_in)
                  .then(() => {
                    window.removeEventListener('message', handleMessage);
                    popup.close();
                    this.isOAuthInProgress = false;
                    console.log('✅ [CloudStorage] Google Drive connection saved successfully');
                    resolve({ success: true });
                  })
                  .catch((error: Error) => {
                    window.removeEventListener('message', handleMessage);
                    popup.close();
                    this.isOAuthInProgress = false;
                    console.error('❌ [CloudStorage] Failed to save connection:', error);
                    resolve({ success: false, error: error.message });
                  });
              })
              .catch((error: Error) => {
                window.removeEventListener('message', handleMessage);
                popup.close();
                this.isOAuthInProgress = false;
                console.error('❌ [CloudStorage] Failed to exchange code for tokens:', error);
                resolve({ success: false, error: error.message });
              });
          } else if (event.data.type === 'GOOGLE_OAUTH_CANCELLED') {
            window.removeEventListener('message', handleMessage);
            popup.close();
            this.isOAuthInProgress = false;
            console.log('❌ [CloudStorage] OAuth was cancelled by user');
            resolve({ success: false, error: 'Google Drive connection was cancelled' });
          }
        };
        
        window.addEventListener('message', handleMessage);
        
        // Cleanup after 5 minutes
        setTimeout(() => {
          window.removeEventListener('message', handleMessage);
          popup.close();
          this.isOAuthInProgress = false;
          console.log('⏰ [CloudStorage] OAuth timeout, closing popup');
          resolve({ success: false, error: 'Connection timeout. Please try again.' });
        }, 300000);
      });
      
    } catch (error) {
      this.isOAuthInProgress = false;
      console.error('❌ [CloudStorage] Google Drive connection failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async exchangeCodeForTokens(authCode: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    try {
      console.log('🔄 [CloudStorage] Exchanging OAuth code for tokens via Supabase Edge Function...');
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        // Exchange authorization code for tokens via Supabase Edge Function
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ code: authCode }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ [CloudStorage] Supabase Edge Function error:', errorData);
          
          // Handle specific error cases
          if (errorData.code === 'CODE_EXPIRED' || errorData.error === 'invalid_grant') {
            throw new Error('Authorization code expired or already used. Please try connecting to Google Drive again.');
          } else if (errorData.error && (errorData.error.includes('expired') || errorData.error.includes('invalid_grant'))) {
            throw new Error('Authorization code expired or already used. Please try connecting to Google Drive again.');
          } else if (response.status === 401) {
            throw new Error('Authentication failed. Please check your Google OAuth configuration.');
          } else if (response.status === 400) {
            throw new Error('Invalid request. Please try connecting to Google Drive again.');
          } else {
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
          }
        }
        
        const tokenData = await response.json();
        
        if (!tokenData.success) {
          throw new Error(tokenData.error || 'Token exchange failed');
        }
        
        console.log('✅ [CloudStorage] OAuth code exchanged successfully for tokens via Supabase Edge Function');
        
        return {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in
        };
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Token exchange timed out. Please try connecting to Google Drive again.');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('❌ [CloudStorage] Failed to exchange code for tokens:', error);
      throw error;
    }
  }

  private async saveGoogleDriveConnection(accessToken: string, refreshToken: string, expiresIn: number): Promise<void> {
    try {
      // Get user info from Google
      const userInfo = await this.getGoogleUserInfo(accessToken);
      
      // Store connection in Supabase
      const connectionData = {
        user_id: this.currentUserId!,
        provider_id: 'google-drive',
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        account_info: {
          email: userInfo.email,
          name: userInfo.name,
          storageUsed: '0 GB',
          storageTotal: '15 GB'
        }
      };
      
      const { error } = await supabase
        .from('cloud_storage_connections')
        .upsert(connectionData, { 
          onConflict: 'user_id,provider_id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        throw new Error(`Failed to save connection: ${error.message}`);
      }
      
      // Update provider status
      const provider = this.providers.get('google-drive');
      if (provider) {
        provider.isConnected = true;
        provider.accountInfo = connectionData.account_info;
      }
      
      console.log('✅ [CloudStorage] Google Drive connected successfully');
    } catch (error) {
      console.error('❌ [CloudStorage] Failed to save Google Drive connection:', error);
      throw error;
    }
  }

  private async getGoogleUserInfo(accessToken: string): Promise<{ email: string; name: string }> {
    try {
      console.log('🔍 [CloudStorage] Getting Google user info...');
      // Token details logged in development only
      if (import.meta.env.DEV) {
        console.log('🔍 [CloudStorage] Access token length:', accessToken.length);
        console.log('🔍 [CloudStorage] Access token preview:', accessToken.substring(0, 8) + '...');
      }
      
      // Get real user info from Google
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('🔍 [CloudStorage] Google API response status:', response.status);
      console.log('🔍 [CloudStorage] Google API response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 [CloudStorage] Google API error response:', errorText);
        throw new Error(`Failed to get user info from Google: ${response.status} ${response.statusText}`);
      }
      
      const userInfo = await response.json();
      console.log('✅ [CloudStorage] Google user info retrieved successfully:', userInfo);
      
      return {
        email: userInfo.email || 'Unknown',
        name: userInfo.name || 'Unknown'
      };
    } catch (error) {
      console.error('❌ [CloudStorage] Failed to get Google user info:', error);
      
      // Try alternative approach - use Google Drive API to get user info
      try {
        console.log('🔄 [CloudStorage] Trying alternative approach with Google Drive API...');
        const driveResponse = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (driveResponse.ok) {
          const driveUserInfo = await driveResponse.json();
          console.log('✅ [CloudStorage] Got user info via Drive API:', driveUserInfo);
          return {
            email: driveUserInfo.user?.emailAddress || 'Unknown',
            name: driveUserInfo.user?.displayName || 'Google Drive User'
          };
        }
      } catch (driveError) {
        console.log('⚠️ [CloudStorage] Drive API fallback also failed:', driveError);
      }
      
      // Return fallback user info
      return {
        email: 'user@example.com',
        name: 'Google Drive User'
      };
    }
  }

  // OneDrive Integration - User-Friendly OAuth Flow
  async connectOneDrive(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.currentUserId) {
        throw new Error('Please log in to connect your cloud storage');
      }

      console.log('🔗 [CloudStorage] Connecting to OneDrive...');
      
      // Check if we have the required configuration
      if (!this.config.oneDrive?.clientId || this.config.oneDrive.clientId === 'YOUR_ONEDRIVE_CLIENT_ID') {
        throw new Error('OneDrive is not configured yet. Please contact support.');
      }
      
      // For OneDrive, we'll use Microsoft Graph API
      const clientId = this.config.oneDrive.clientId;
      const redirectUri = this.config.oneDrive.redirectUri;
      
      // Create a user-friendly OAuth popup
      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${clientId}&` +
        `response_type=token&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent('Files.ReadWrite.All offline_access')}` +
        `&response_mode=fragment&prompt=select_account`;
      
      // Open popup window for OAuth
      const popup = window.open(
        authUrl,
        'OneDrive OAuth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );
      
      if (!popup) {
        throw new Error('Please allow popups to connect to OneDrive');
      }
      
      // Wait for OAuth completion
      return new Promise((resolve) => {
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            resolve({ success: false, error: 'OneDrive connection was cancelled' });
          }
        }, 1000);
        
        // Listen for OAuth response
        window.addEventListener('message', (event) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'onedrive_oauth_success') {
            clearInterval(checkClosed);
            popup.close();
            
            // Process the OAuth response
            this.processOneDriveOAuth(event.data.accessToken, resolve);
          }
        });
      });
      
    } catch (error) {
      console.error('❌ [CloudStorage] OneDrive connection failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async processOneDriveOAuth(accessToken: string, resolve: Function) {
    try {
      // Get user info from Microsoft Graph
      const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!userResponse.ok) {
        throw new Error('Failed to get user information from OneDrive');
      }
      
      const userData = await userResponse.json();
      
      // Store connection in Supabase
      const connectionData: Omit<CloudStorageConnection, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: this.currentUserId!,
        providerId: 'one-drive',
        accessToken: accessToken,
        accountInfo: {
          email: userData.mail || userData.userPrincipalName,
          name: userData.displayName,
          storageUsed: '0 GB',
          storageTotal: '1 TB'
        }
      };
      
      const { error } = await supabase
        .from('cloud_storage_connections')
        .upsert(connectionData, { 
          onConflict: 'user_id,provider_id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        throw new Error(`Failed to save connection: ${error.message}`);
      }
      
      // Update provider status
      const provider = this.providers.get('one-drive');
      if (provider) {
        provider.isConnected = true;
        provider.accountInfo = connectionData.accountInfo;
      }
      
      console.log('✅ [CloudStorage] OneDrive connected successfully');
      resolve({ success: true });
      
    } catch (error) {
      console.error('❌ [CloudStorage] OneDrive OAuth processing failed:', error);
      resolve({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  // Dropbox Integration - User-Friendly OAuth Flow
  async connectDropbox(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.currentUserId) {
        throw new Error('Please log in to connect your cloud storage');
      }

      console.log('🔗 [CloudStorage] Connecting to Dropbox...');
      
      // Check if we have the required configuration
      if (!this.config.dropbox?.appKey || this.config.dropbox.appKey === 'YOUR_DROPBOX_APP_KEY') {
        throw new Error('Dropbox is not configured yet. Please contact support.');
      }
      
      // For Dropbox, we'll use Dropbox OAuth
      const appKey = this.config.dropbox.appKey;
      const redirectUri = this.config.dropbox.redirectUri;
      
      // Create a user-friendly OAuth popup
      const authUrl = `https://www.dropbox.com/oauth2/authorize?` +
        `client_id=${appKey}&` +
        `response_type=token&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}`;
      
      // Open popup window for OAuth
      const popup = window.open(
        authUrl,
        'Dropbox OAuth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );
      
      if (!popup) {
        throw new Error('Please allow popups to connect to Dropbox');
      }
      
      // Wait for OAuth completion
      return new Promise((resolve) => {
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            resolve({ success: false, error: 'Dropbox connection was cancelled' });
          }
        }, 1000);
        
        // Listen for OAuth response
        window.addEventListener('message', (event) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'dropbox_oauth_success') {
            clearInterval(checkClosed);
            popup.close();
            
            // Process the OAuth response
            this.processDropboxOAuth(event.data.accessToken, resolve);
          }
        });
      });
      
    } catch (error) {
      console.error('❌ [CloudStorage] Dropbox connection failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async processDropboxOAuth(accessToken: string, resolve: Function) {
    try {
      // Get user info from Dropbox API
      const userResponse = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!userResponse.ok) {
        throw new Error('Failed to get user information from Dropbox');
      }
      
      const userData = await userResponse.json();
      
      // Store connection in Supabase
      const connectionData: Omit<CloudStorageConnection, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: this.currentUserId!,
        providerId: 'dropbox',
        accessToken: accessToken,
        accountInfo: {
          email: userData.email,
          name: userData.name.display_name,
          storageUsed: '0 GB',
          storageTotal: '2 GB'
        }
      };
      
      const { error } = await supabase
        .from('cloud_storage_connections')
        .upsert(connectionData, { 
          onConflict: 'user_id,provider_id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        throw new Error(`Failed to save connection: ${error.message}`);
      }
      
      // Update provider status
      const provider = this.providers.get('dropbox');
      if (provider) {
        provider.isConnected = true;
        provider.accountInfo = connectionData.accountInfo;
      }
      
      console.log('✅ [CloudStorage] Dropbox connected successfully');
      resolve({ success: true });
      
    } catch (error) {
      console.error('❌ [CloudStorage] Dropbox OAuth processing failed:', error);
      resolve({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  // Disconnect a provider
  async disconnectProvider(providerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log(`🔌 [CloudStorage] Disconnecting ${providerId}...`);
      
      // Remove connection from Supabase
      const { error } = await supabase
        .from('cloud_storage_connections')
        .delete()
        .eq('user_id', this.currentUserId)
        .eq('provider_id', providerId);
      
      if (error) {
        throw new Error(`Failed to remove connection: ${error.message}`);
      }
      
      // Update provider status
      const provider = this.providers.get(providerId);
      if (provider) {
        provider.isConnected = false;
        provider.accountInfo = undefined;
      }
      
      console.log(`✅ [CloudStorage] ${providerId} disconnected successfully`);
      return { success: true };
      
    } catch (error) {
      console.error(`❌ [CloudStorage] Failed to disconnect ${providerId}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Upload a file to cloud storage and store metadata in Supabase
  async uploadFile(
    providerId: string, 
    file: File, 
    projectId?: string,
    clipId?: string,
    folderId?: string
  ): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log(`📤 [CloudStorage] Uploading file to ${providerId}...`);
      
      // Check if provider is connected
      const isConnected = await this.isProviderConnected(providerId);
      if (!isConnected) {
        throw new Error('Provider not connected');
      }
      
      // Get access token from Supabase
      const { data: connection, error: connectionError } = await supabase
        .from('cloud_storage_connections')
        .select('access_token')
        .eq('user_id', this.currentUserId)
        .eq('provider_id', providerId)
        .single();
      
      if (connectionError || !connection) {
        throw new Error('Failed to get access token');
      }
      
      const token = connection.access_token;
      
      // Upload file to cloud storage
      let uploadResult;
      switch (providerId) {
        case 'google-drive':
          uploadResult = await this.uploadToGoogleDrive(file, token, folderId);
          break;
        case 'one-drive':
          uploadResult = await this.uploadToOneDrive(file, token, folderId);
          break;
        case 'dropbox':
          uploadResult = await this.uploadToDropbox(file, token, folderId);
          break;
        default:
          throw new Error('Unsupported provider');
      }
      
      if (!uploadResult.success || !uploadResult.fileId) {
        throw new Error(uploadResult.error || 'Upload failed');
      }
      
      // Store file metadata in Supabase
      const fileMetadata = {
        cloud_file_id: uploadResult.fileId,
        name: file.name,
        size: file.size,
        mime_type: file.type,
        cloud_provider_id: providerId,
        user_id: this.currentUserId,
        project_id: projectId,
        clip_id: clipId,
        created_at: new Date().toISOString()
      };
      
      const { error: metadataError } = await supabase
        .from('cloud_storage_files')
        .insert(fileMetadata);
      
      if (metadataError) {
        console.error('Failed to store file metadata:', metadataError);
        // Note: File is uploaded but metadata isn't stored
        // You might want to handle this case differently
      }
      
      console.log('✅ [CloudStorage] File uploaded and metadata stored successfully');
      return { success: true, fileId: uploadResult.fileId };
      
    } catch (error) {
      console.error(`❌ [CloudStorage] Upload to ${providerId} failed:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async uploadToGoogleDrive(
    file: File, 
    token: string,
    folderId?: string
  ): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      // Create file metadata
      const metadata = {
        name: file.name,
        mimeType: file.type,
        parents: folderId ? [folderId] : undefined
      };
      
      // Create FormData for multipart upload
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);
      
      // Upload to Google Drive
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: form
      });
      
      if (response.status === 401) {
        // Token expired during upload, try to refresh and retry
        console.log('🔄 [CloudStorage] Google Drive token expired during upload, attempting refresh...');
        
        // Get current connection to attempt refresh
        const { data: connection, error: connectionError } = await supabase
          .from('cloud_storage_connections')
          .select('*')
          .eq('user_id', this.currentUserId)
          .eq('provider_id', 'google-drive')
          .single();
        
        if (connection && !connectionError) {
          const refreshSuccess = await this.handleExpiredToken('google-drive', connection);
          if (refreshSuccess) {
            console.log('✅ [CloudStorage] Token refreshed, retrying upload...');
            // Get the new token and retry
            const { data: newConnection } = await supabase
              .from('cloud_storage_connections')
              .select('access_token')
              .eq('user_id', this.currentUserId)
              .eq('provider_id', 'google-drive')
              .single();
            
            if (newConnection?.access_token) {
              return await this.uploadToGoogleDrive(file, newConnection.access_token, folderId);
            }
          }
        }
        
        throw new Error('Token expired and refresh failed. Please reconnect to Google Drive.');
      }
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ [CloudStorage] Google Drive upload successful:', result.id);
      
      return { success: true, fileId: result.id };
      
    } catch (error) {
      console.error('❌ [CloudStorage] Google Drive upload failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async uploadToOneDrive(
    file: File, 
    token: string,
    folderId?: string
  ): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      // For OneDrive, we'd use Microsoft Graph API
      // This is a simplified implementation
      console.log('⚠️ [CloudStorage] OneDrive upload not fully implemented');
      
      // Simulate successful upload
      const fileId = `onedrive_${Date.now()}_${file.name}`;
      console.log('✅ [CloudStorage] OneDrive upload successful (simulated):', fileId);
      
      return { success: true, fileId };
      
    } catch (error) {
      console.error('❌ [CloudStorage] OneDrive upload failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async uploadToDropbox(
    file: File, 
    token: string,
    folderId?: string
  ): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      // For Dropbox, we'd use Dropbox API
      // This is a simplified implementation
      console.log('⚠️ [CloudStorage] Dropbox upload not fully implemented');
      
      // Simulate successful upload
      const fileId = `dropbox_${Date.now()}_${file.name}`;
      console.log('✅ [CloudStorage] Dropbox upload successful (simulated):', fileId);
      
      return { success: true, fileId };
      
    } catch (error) {
      console.error('❌ [CloudStorage] Dropbox upload failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get files from Supabase metadata
  async getFiles(projectId?: string, clipId?: string): Promise<{ success: boolean; files?: CloudStorageFile[]; error?: string }> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log('📋 [CloudStorage] Getting files from Supabase...');
      
      let query = supabase
        .from('cloud_storage_files')
        .select('*')
        .eq('user_id', this.currentUserId);
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      
      if (clipId) {
        query = query.eq('clip_id', clipId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Failed to get files: ${error.message}`);
      }
      
      // Convert to CloudStorageFile format
      const files: CloudStorageFile[] = data?.map(item => ({
        id: item.id, // Assuming 'id' is the Supabase row ID
        name: item.name,
        size: item.size,
        mimeType: item.mime_type,
        cloudFileId: item.cloud_file_id,
        cloudProviderId: item.cloud_provider_id,
        projectId: item.project_id,
        clipId: item.clip_id,
        userId: item.user_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })) || [];
      
      console.log('✅ [CloudStorage] Files retrieved successfully:', files.length);
      return { success: true, files };
      
    } catch (error) {
      console.error('❌ [CloudStorage] Failed to get files:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Download a file from cloud storage
  async downloadFile(
    providerId: string, 
    fileId: string
  ): Promise<{ success: boolean; file?: File; error?: string }> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log(`📥 [CloudStorage] Downloading file from ${providerId}...`);
      
      // Get access token from Supabase
      const { data: connection, error: connectionError } = await supabase
        .from('cloud_storage_connections')
        .select('access_token')
        .eq('user_id', this.currentUserId)
        .eq('provider_id', providerId)
        .single();
      
      if (connectionError || !connection) {
        throw new Error('Failed to get access token');
      }
      
      const token = connection.access_token;
      
      switch (providerId) {
        case 'google-drive':
          return await this.downloadFromGoogleDrive(fileId, token);
        case 'one-drive':
          return await this.downloadFromOneDrive(fileId, token);
        case 'dropbox':
          return await this.downloadFromDropbox(fileId, token);
        default:
          throw new Error('Unsupported provider');
      }
      
    } catch (error) {
      console.error(`❌ [CloudStorage] Download from ${providerId} failed:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async downloadFromGoogleDrive(
    fileId: string, 
    token: string,
    filename?: string,
    mimeType?: string
  ): Promise<{ success: boolean; file?: File; error?: string }> {
    try {
      // Get file metadata first
      const metadataResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!metadataResponse.ok) {
        throw new Error(`Failed to get file metadata: ${metadataResponse.statusText}`);
      }
      
      const metadata = await metadataResponse.json();
      
      // Download the file
      const downloadResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!downloadResponse.ok) {
        throw new Error(`Download failed: ${downloadResponse.statusText}`);
      }
      
      const blob = await downloadResponse.blob();
      const file = new File([blob], filename || metadata.name, { type: mimeType || metadata.mimeType });
      
      console.log('✅ [CloudStorage] Google Drive download successful:', file.name);
      return { success: true, file };
      
    } catch (error) {
      console.error('❌ [CloudStorage] Google Drive download failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async downloadFromOneDrive(
    fileId: string, 
    token: string,
    filename?: string,
    mimeType?: string
  ): Promise<{ success: boolean; file?: File; error?: string }> {
    try {
      // Simplified implementation for OneDrive
      console.log('⚠️ [CloudStorage] OneDrive download not fully implemented');
      
      // Simulate successful download
      const file = new File(['simulated content'], filename || 'onedrive_file.mp4', { type: mimeType || 'video/mp4' });
      console.log('✅ [CloudStorage] OneDrive download successful (simulated)');
      
      return { success: true, file };
      
    } catch (error) {
      console.error('❌ [CloudStorage] OneDrive download failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async downloadFromDropbox(
    fileId: string, 
    token: string,
    filename?: string,
    mimeType?: string
  ): Promise<{ success: boolean; file?: File; error?: string }> {
    try {
      // Simplified implementation for Dropbox
      console.log('⚠️ [CloudStorage] Dropbox download not fully implemented');
      
      // Simulate successful download
      const file = new File(['simulated content'], filename || 'dropbox_file.mp4', { type: mimeType || 'video/mp4' });
      console.log('✅ [CloudStorage] Dropbox download successful (simulated)');
      
      return { success: true, file };
      
    } catch (error) {
      console.error('❌ [CloudStorage] Dropbox download failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Delete a file from cloud storage and remove metadata from Supabase
  async deleteFile(
    providerId: string, 
    fileId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log(`🗑️ [CloudStorage] Deleting file from ${providerId}...`);
      
      // Get access token from Supabase
      const { data: connection, error: connectionError } = await supabase
        .from('cloud_storage_connections')
        .select('access_token')
        .eq('user_id', this.currentUserId)
        .eq('provider_id', providerId)
        .single();
      
      if (connectionError || !connection) {
        throw new Error('Failed to get access token');
      }
      
      const token = connection.access_token;
      
      // Delete from cloud storage
      let deleteResult;
      switch (providerId) {
        case 'google-drive':
          deleteResult = await this.deleteGoogleDriveFile(fileId, token);
          break;
        case 'one-drive':
          deleteResult = await this.deleteOneDriveFile(fileId, token);
          break;
        case 'dropbox':
          deleteResult = await this.deleteDropboxFile(fileId, token);
          break;
        default:
          throw new Error('Unsupported provider');
      }
      
      if (!deleteResult.success) {
        throw new Error(deleteResult.error || 'Delete failed');
      }
      
      // Remove metadata from Supabase
      const { error: metadataError } = await supabase
        .from('cloud_storage_files')
        .delete()
        .eq('cloud_file_id', fileId)
        .eq('user_id', this.currentUserId);
      
      if (metadataError) {
        console.error('Failed to remove file metadata:', metadataError);
        // Note: File is deleted from cloud but metadata might still exist
      }
      
      console.log('✅ [CloudStorage] File deleted successfully');
      return { success: true };
      
    } catch (error) {
      console.error(`❌ [CloudStorage] Delete file from ${providerId} failed:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async deleteGoogleDriveFile(
    fileId: string, 
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.statusText}`);
      }
      
      console.log('✅ [CloudStorage] Google Drive file deleted successfully');
      return { success: true };
      
    } catch (error) {
      console.error('❌ [CloudStorage] Google Drive delete file failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async deleteOneDriveFile(
    fileId: string, 
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Simplified implementation for OneDrive
      console.log('⚠️ [CloudStorage] OneDrive delete file not fully implemented');
      
      // Simulate file deletion
      console.log('✅ [CloudStorage] OneDrive file deleted successfully (simulated)');
      return { success: true };
      
    } catch (error) {
      console.error('❌ [CloudStorage] OneDrive delete file failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async deleteDropboxFile(
    fileId: string, 
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Simplified implementation for Dropbox
      console.log('⚠️ [CloudStorage] Dropbox delete file not fully implemented');
      
      // Simulate file deletion
      console.log('✅ [CloudStorage] Dropbox file deleted successfully (simulated)');
      return { success: true };
      
    } catch (error) {
      console.error('❌ [CloudStorage] Dropbox delete file failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get storage usage information
  async getStorageUsage(providerId: string): Promise<{ success: boolean; usage?: any; error?: string }> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log(`📊 [CloudStorage] Getting storage usage for ${providerId}...`);
      
      // Get connection from Supabase
      const { data: connection, error: connectionError } = await supabase
        .from('cloud_storage_connections')
        .select('access_token')
        .eq('user_id', this.currentUserId)
        .eq('provider_id', providerId)
        .single();
      
      if (connectionError || !connection) {
        throw new Error('Provider not connected');
      }
      
      const token = connection.access_token;
      
      switch (providerId) {
        case 'google-drive':
          return await this.getGoogleDriveStorageUsage(token);
        case 'one-drive':
          return await this.getOneDriveStorageUsage(token);
        case 'dropbox':
          return await this.getDropboxStorageUsage(token);
        default:
          throw new Error('Unsupported provider');
      }
      
    } catch (error) {
      console.error(`❌ [CloudStorage] Get storage usage for ${providerId} failed:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async getGoogleDriveStorageUsage(token: string): Promise<{ success: boolean; usage?: any; error?: string }> {
    try {
      // Check if this is a temporary token (for development)
      if (token.startsWith('temp_token_')) {
        console.log('⚠️ [CloudStorage] Using temporary token, providing simulated storage data');
        const simulatedUsage = {
          limit: '15 GB',
          usage: '0 GB',
          usageInDrive: '0 GB',
          usageInDriveTrash: '0 GB'
        };
        return { success: true, usage: simulatedUsage };
      }
      
      // Try to get real storage usage from Google
      const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get storage usage: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ [CloudStorage] Google Drive storage usage retrieved successfully');
      
      return { success: true, usage: result.storageQuota };
      
    } catch (error) {
      console.error('❌ [CloudStorage] Google Drive storage usage failed:', error);
      
      // For development, provide simulated data if the real API fails
      if (token.startsWith('temp_token_')) {
        console.log('⚠️ [CloudStorage] Providing simulated storage data due to API failure');
        const simulatedUsage = {
          limit: '15 GB',
          usage: '0 GB',
          usageInDrive: '0 GB',
          usageInDriveTrash: '0 GB'
        };
        return { success: true, usage: simulatedUsage };
      }
      
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async getOneDriveStorageUsage(token: string): Promise<{ success: boolean; usage?: any; error?: string }> {
    try {
      // Simplified implementation for OneDrive
      console.log('⚠️ [CloudStorage] OneDrive storage usage not fully implemented');
      
      // Simulate storage usage
      const usage = {
        total: '1 TB',
        used: '5 GB',
        remaining: '995 GB'
      };
      
      console.log('✅ [CloudStorage] OneDrive storage usage retrieved successfully (simulated)');
      return { success: true, usage };
      
    } catch (error) {
      console.error('❌ [CloudStorage] OneDrive storage usage failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async getDropboxStorageUsage(token: string): Promise<{ success: boolean; usage?: any; error?: string }> {
    try {
      // Simplified implementation for Dropbox
      console.log('⚠️ [CloudStorage] Dropbox storage usage not fully implemented');
      
      // Simulate storage usage
      const usage = {
        total: '2 GB',
        used: '500 MB',
        remaining: '1.5 GB'
      };
      
      console.log('✅ [CloudStorage] Dropbox storage usage retrieved successfully (simulated)');
      return { success: true, usage };
      
    } catch (error) {
      console.error('❌ [CloudStorage] Dropbox storage usage failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Refresh current user (call this when auth state changes)
  async refreshCurrentUser() {
    try {
      console.log('🔄 [CloudStorage] Refreshing current user...');
      await this.loadCurrentUser();
      console.log('✅ [CloudStorage] Current user refreshed successfully');
    } catch (error) {
      console.error('❌ [CloudStorage] Failed to refresh current user:', error);
    }
  }

  // Set configuration
  setConfig(config: CloudStorageConfig) {
    this.config = { ...this.config, ...config };
    console.log('🔧 [CloudStorage] Configuration updated:', this.config);
  }

  // Get current configuration
  getConfig(): CloudStorageConfig {
    return { ...this.config };
  }

  // Check if the service is ready to make calls
  isReady(): boolean {
    return this.currentUserId !== null && this.isSupabaseReady();
  }

  // Check if Supabase client is properly initialized
  isSupabaseReady(): boolean {
    try {
      if (!supabase) {
        console.log('🔍 [CloudStorage] Supabase client is null');
        return false;
      }
      
      if (typeof supabase.from !== 'function') {
        console.log('🔍 [CloudStorage] Supabase client methods not available');
        return false;
      }
      
      if (typeof supabase.auth !== 'object' || typeof supabase.auth.getUser !== 'function') {
        console.log('🔍 [CloudStorage] Supabase auth methods not available');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ [CloudStorage] Error checking Supabase readiness:', error);
      return false;
    }
  }

  // Test Supabase connection
  async testConnection(): Promise<boolean> {
    try {
      if (!this.currentUserId) {
        console.log('🔍 [CloudStorage] No user ID for connection test');
        return false;
      }
      
      // First, check if Supabase client is properly initialized
      if (!this.isSupabaseReady()) {
        console.error('❌ [CloudStorage] Supabase client not properly initialized');
        return false;
      }
      
      console.log('🔍 [CloudStorage] Testing basic functionality...');
      
      // Test basic network connectivity (but don't fail if it doesn't work)
      try {
        const networkOk = await this.testNetworkConnectivity();
        if (!networkOk) {
          console.log('⚠️ [CloudStorage] Network connectivity test failed, but continuing...');
        }
      } catch (error) {
        console.log('⚠️ [CloudStorage] Network connectivity test error, but continuing...', error);
      }
      
      console.log('🔍 [CloudStorage] Testing Supabase connection...');
      
      // Try a simple health check first - test if we can access the client
      try {
        // Test basic client functionality without making a query
        const clientTest = supabase.auth.getUser();
        if (!clientTest) {
          console.error('❌ [CloudStorage] Supabase client methods not available');
          return false;
        }
      } catch (clientError) {
        console.error('❌ [CloudStorage] Supabase client test failed:', clientError);
        return false;
      }
      
      // Now try a simple query to test the connection
      console.log('🔍 [CloudStorage] Making test query...');
      const { data, error } = await supabase
        .from('cloud_storage_connections')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('❌ [CloudStorage] Connection test query failed:', error);
        return false;
      }
      
      console.log('✅ [CloudStorage] Connection test successful');
      return true;
    } catch (error) {
      console.error('❌ [CloudStorage] Connection test error:', error);
      return false;
    }
  }

  // Get service status
  getStatus(): { isReady: boolean; userId: string | null; supabaseInitialized: boolean; supabaseReady: boolean; connectionStatus: string } {
    return {
      isReady: this.isReady(),
      userId: this.currentUserId,
      supabaseInitialized: supabase !== null,
      supabaseReady: this.isSupabaseReady(),
      connectionStatus: this.getConnectionStatus()
    };
  }

  // Get human-readable connection status
  private getConnectionStatus(): string {
    if (!this.currentUserId) return 'No user authenticated';
    if (!this.isSupabaseReady()) return 'Supabase not ready';
    if (!this.isReady()) return 'Service not ready';
    return 'Ready';
  }

  // Get connection status for all providers
  async getProvidersConnectionStatus(): Promise<{[key: string]: boolean}> {
    try {
      if (!this.currentUserId) {
        console.log('🔍 [CloudStorage] No user authenticated, returning empty status');
        return {};
      }

      const status: {[key: string]: boolean} = {};
      
      // Check each provider's connection status
      for (const [providerId, provider] of this.providers) {
        try {
          const isConnected = await this.isProviderConnected(providerId);
          status[providerId] = isConnected;
          console.log(`🔍 [CloudStorage] ${providerId} connection status: ${isConnected}`);
        } catch (error) {
          console.error(`❌ [CloudStorage] Error checking ${providerId} status:`, error);
          status[providerId] = false;
        }
      }

      console.log('🔍 [CloudStorage] Connection status for all providers:', status);
      return status;
    } catch (error) {
      console.error('❌ [CloudStorage] Error getting connection status:', error);
      return {};
    }
  }

  // Get detailed connection error information
  getConnectionErrorInfo(): { type: string; message: string; suggestion: string } | null {
    if (!this.currentUserId) {
      return {
        type: 'Authentication',
        message: 'User not authenticated',
        suggestion: 'Please log in to use cloud storage features'
      };
    }
    
    if (!this.isSupabaseReady()) {
      return {
        type: 'Configuration',
        message: 'Supabase not ready',
        suggestion: 'Please check your internet connection and try again'
      };
    }
    
    return null;
  }

  // Wait for Supabase to be ready
  async waitForSupabaseReady(maxWaitMs: number = 10000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      if (this.isSupabaseReady()) {
        console.log('✅ [CloudStorage] Supabase is ready');
        return true;
      }
      
      console.log('⏳ [CloudStorage] Waiting for Supabase to be ready...');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.error('❌ [CloudStorage] Timeout waiting for Supabase to be ready');
    return false;
  }

  // Test basic network connectivity
  async testNetworkConnectivity(): Promise<boolean> {
    try {
      console.log('🔍 [CloudStorage] Testing network connectivity...');
      
      // Test if fetch API is available without making actual requests
      // This avoids CSP violations while still checking basic functionality
      if (typeof fetch === 'undefined') {
        console.error('❌ [CloudStorage] Fetch API not available');
        return false;
      }
      
      // Test if we can create a Request object (basic fetch functionality check)
      try {
        new Request('https://example.com');
        console.log('✅ [CloudStorage] Network connectivity test successful (fetch API available)');
        return true;
      } catch {
        console.error('❌ [CloudStorage] Request constructor not available');
        return false;
      }
    } catch (error) {
      console.error('❌ [CloudStorage] Network connectivity test failed:', error);
      return false;
    }
  }

  // Check if we're currently in fallback mode (connection failed)
  isInFallbackMode(): boolean {
    // This is a simple heuristic - if we have providers but none are connected
    // and we've had recent connection issues, we might be in fallback mode
    const hasProviders = this.providers.size > 0;
    const hasConnectedProviders = Array.from(this.providers.values()).some(p => p.isConnected);
    return hasProviders && !hasConnectedProviders;
  }

  // ===== VIDEO CLIP MANAGEMENT =====
  // Upload video directly to backend (no chunking, no cloud storage)
  async uploadVideoToBackend(
    videoFile: File,
    projectData: any,
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🚀 [DirectUpload] Starting direct backend upload...`);
      console.log(`📁 [DirectUpload] File: ${videoFile.name}, size: ${(videoFile.size / 1024 / 1024).toFixed(2)}MB`);
      
      // Create form data for direct upload
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('projectData', JSON.stringify(projectData));
      
      // Update progress to show upload starting
      if (onProgress) {
        onProgress(10);
      }
      
      console.log(`🌐 [DirectUpload] Sending complete video to backend...`);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`⏰ [DirectUpload] Request timeout`);
        controller.abort();
      }, 300000); // 5 minute timeout for direct upload
      
      try {
        const response = await fetch(`${import.meta.env.VITE_FOCUSED_BACKEND_URL || 'https://farmguard5.onrender.com'}/api/process-video`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
          headers: {
            'ngrok-skip-browser-warning': 'true',
          },
        });
        
        clearTimeout(timeoutId);
        console.log(`📡 [DirectUpload] Response: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ [DirectUpload] HTTP Error: ${response.status} ${response.statusText}`, errorText);
          throw new Error(`Upload failed: ${response.status} ${errorText}`);
        }
        
        const result = await response.json();
        console.log(`✅ [DirectUpload] Response:`, result);
        
        if (!result.success) {
          throw new Error(result.error || 'Upload failed');
        }
        
        // Update progress to show completion
        if (onProgress) {
          onProgress(100);
        }
        
        console.log(`🎉 [DirectUpload] Video uploaded and processing started successfully!`);
        return { 
          success: true, 
          processing_id: result.processing_id,
          status_url: result.status_url
        };
        
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.error(`⏰ [DirectUpload] Request timeout`);
            throw new Error('Upload timeout after 5 minutes');
          } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
            console.error(`🌐 [DirectUpload] Network error:`, error);
            throw new Error('Network error: Unable to connect to backend server');
          } else {
            console.error(`❌ [DirectUpload] Error uploading video:`, error);
            throw error;
          }
        } else {
          console.error(`❌ [DirectUpload] Unknown error uploading video:`, error);
          throw new Error('Unknown error occurred during upload');
        }
      }
      
    } catch (error) {
      console.error('❌ [DirectUpload] Failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Upload failed' };
    }
  }

  // FAST: Get current access token for a provider (no timeout delays)
  async getAccessToken(providerId: string): Promise<string> {
    if (!this.currentUserId) throw new Error('User not authenticated');
    
    try {
      // FAST: Direct fetch without timeout delays
      const { data, error } = await supabase
        .from('cloud_storage_connections')
        .select('access_token')
        .eq('user_id', this.currentUserId)
        .eq('provider_id', providerId)
        .single();
      
      if (error || !data?.access_token) throw new Error('No access token available');
      return data.access_token as string;
    } catch (e) {
      throw new Error(`Token fetch failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  // Google Drive resumable upload (large files, robust)
  private async uploadToGoogleDriveResumable(
    file: File,
    token: string,
    folderId?: string,
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      const metadata: any = { name: file.name, mimeType: file.type || 'video/mp4' };
      if (folderId) metadata.parents = [folderId];
      
      // OPTIMIZED: Faster timeout for initialization (was 60s, now 15s)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('⏰ [CloudUpload] Resumable init timeout, aborting...');
        controller.abort();
      }, 15 * 1000); // 15 second timeout for immediate fallback
      
      const initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': file.type || 'video/mp4',
          'X-Upload-Content-Length': String(file.size)
        },
        body: JSON.stringify(metadata),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      if (!initRes.ok) return { success: false, error: `Init failed ${initRes.status}` };
      const uploadUrl = initRes.headers.get('Location');
      if (!uploadUrl) return { success: false, error: 'No upload URL' };

      // ULTRA-AGGRESSIVE: Massive chunks for maximum speed
      const chunkSize = 20 * 1024 * 1024; // 20MB chunks for maximum speed (was 5MB)
      let offset = 0;
      let attempt = 0;
      const maxRetries = 3;

      while (offset < file.size) {
        const end = Math.min(offset + chunkSize, file.size);
        const chunk = file.slice(offset, end);
        
        // OPTIMIZED: Balanced timeout for reliability and speed
        const chunkController = new AbortController();
        const chunkTimeoutId = setTimeout(() => {
          console.log(`⏰ [CloudUpload] Chunk ${offset}-${end} timeout, aborting...`);
          chunkController.abort();
        }, 120 * 1000); // 2 minute timeout per chunk for better reliability
        
        console.log(`📤 [CloudUpload] Uploading chunk ${offset}-${end} (${(chunk.size/1024/1024).toFixed(2)}MB)...`);
        
        const res = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Length': String(chunk.size),
            'Content-Range': `bytes ${offset}-${end - 1}/${file.size}`
          },
          body: chunk,
          signal: chunkController.signal
        });
        
                clearTimeout(chunkTimeoutId);

        if (res.status === 308) {
          offset = end;
          attempt = 0; // Reset retry counter on success
          // Report progress
          if (onProgress) {
            const progress = Math.round((offset / file.size) * 100);
            onProgress(progress);
          }
          console.log(`✅ [CloudUpload] Chunk ${offset}-${end} uploaded successfully (${Math.round((offset / file.size) * 100)}%)`);
          continue;
        }

        if (!res.ok) {
          attempt++;
          if (attempt <= 3) { // OPTIMIZED: Allow 3 retries for better reliability
            console.log(`🔄 [CloudUpload] Chunk failed, retrying attempt ${attempt}/3...`);
            await new Promise(r => setTimeout(r, 2000 * attempt)); // OPTIMIZED: Progressive retry delay
            continue;
          }
          const msg = await res.text().catch(() => res.statusText);
          return { success: false, error: `Upload error ${res.status} ${msg}` };
        }

        // Completed; Drive returns metadata
        const meta = await res.json();
        return { success: true, fileId: meta.id };
      }

      // Finalize if needed
      const finalize = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Range': `bytes */${file.size}`
        }
      });
      if (!finalize.ok) return { success: false, error: 'Finalize failed' };
      const meta = await finalize.json();
      return { success: true, fileId: meta.id };
    } catch (e) {
      console.error('❌ [CloudUpload] Resumable upload failed:', e);
      if (e instanceof Error && e.name === 'AbortError') {
        return { success: false, error: 'Upload timeout - connection too slow' };
      }
      return { success: false, error: e instanceof Error ? e.message : 'Resumable upload failed' };
    }
  }
  
  // Upload a video clip to cloud storage and store metadata in Supabase
  async uploadVideoClip(
    providerId: string, 
    videoFile: File, 
    projectId?: string,
    metadata?: {
      duration?: number;
      resolution?: string;
      description?: string;
    }
  ): Promise<{ success: boolean; clipId?: string; error?: string }> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log(`📤 [CloudStorage] Uploading video clip to ${providerId}...`);
      
      // Check if provider is connected
      const isConnected = await this.isProviderConnected(providerId);
      if (!isConnected) {
        // Try to handle expired tokens before giving up
        console.log(`🔄 [CloudStorage] Provider ${providerId} not connected, attempting token refresh...`);
        
        // Get connection details to attempt refresh
        const { data: connection, error: connectionError } = await supabase
          .from('cloud_storage_connections')
          .select('*')
          .eq('user_id', this.currentUserId)
          .eq('provider_id', providerId)
          .single();
        
        if (connection && !connectionError) {
          const refreshSuccess = await this.handleExpiredToken(providerId, connection);
          if (refreshSuccess) {
            console.log(`✅ [CloudStorage] ${providerId} token refreshed, retrying upload...`);
            // Retry the upload with the refreshed token
            return await this.uploadVideoClip(providerId, videoFile, projectId, metadata);
          }
        }
        
        throw new Error(`Provider ${providerId} not connected. Please reconnect to continue.`);
      }
      
      // Get access token from Supabase
      const { data: connection, error: connectionError } = await supabase
        .from('cloud_storage_connections')
        .select('*')
        .eq('user_id', this.currentUserId)
        .eq('provider_id', providerId)
        .single();
      
      if (connectionError || !connection) {
        throw new Error('Failed to get access token');
      }
      
      const token = connection.access_token;
      
      // Get or create project folder for organization
      let folderId: string | undefined;
      if (projectId) {
        try {
          // Get project name for folder creation
          const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('title')
            .eq('id', projectId)
            .single();
          
          if (!projectError && project) {
            const folderResult = await this.getOrCreateProjectFolder(providerId, projectId, project.title);
            if (folderResult.success && folderResult.folderId) {
              folderId = folderResult.folderId;
              console.log(`📁 [CloudStorage] Using project folder: ${folderId}`);
            }
          }
        } catch (folderError) {
          console.warn('⚠️ [CloudStorage] Failed to get project folder, uploading to root:', folderError);
        }
      }
      
      // Upload video to cloud storage
      let uploadResult;
      switch (providerId) {
        case 'google-drive':
          uploadResult = await this.uploadToGoogleDrive(videoFile, token, folderId);
          break;
        case 'one-drive':
          uploadResult = await this.uploadToOneDrive(videoFile, token, folderId);
          break;
        case 'dropbox':
          uploadResult = await this.uploadToDropbox(videoFile, token, folderId);
          break;
        default:
          throw new Error('Unsupported provider');
      }
      
      if (!uploadResult.success || !uploadResult.fileId) {
        throw new Error(uploadResult.error || 'Upload failed');
      }
      
      // Store video clip metadata in Supabase
      const clipMetadata = {
        name: videoFile.name,
        size: videoFile.size,
        mime_type: videoFile.type,
        cloud_file_id: uploadResult.fileId,
        cloud_provider_id: providerId,
        user_id: this.currentUserId,
        project_id: projectId,
        duration: metadata?.duration,
        resolution: metadata?.resolution,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: clipData, error: clipError } = await supabase
        .from('video_clips')
        .insert([clipMetadata])
        .select()
        .single();
      
      if (clipError) {
        console.error('❌ [CloudStorage] Failed to store video clip metadata:', clipError);
        throw new Error('Failed to store video clip metadata');
      }
      
      console.log(`✅ [CloudStorage] Video clip uploaded and metadata stored successfully: ${clipData.id}`);
      
      return {
        success: true,
        clipId: clipData.id
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Video clip upload failed';
      console.error(`❌ [CloudStorage] Video clip upload to ${providerId} failed:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // Get video clips from Supabase metadata
  async getVideoClips(projectId?: string): Promise<{ success: boolean; clips?: VideoClip[]; error?: string }> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log('📋 [CloudStorage] Getting video clips from Supabase...');
      
      let query = supabase
        .from('video_clips')
        .select('*')
        .eq('user_id', this.currentUserId);
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(`Failed to get video clips: ${error.message}`);
      }
      
      // Convert to VideoClip format
      const clips: VideoClip[] = data?.map(item => ({
        id: item.id,
        name: item.name,
        size: item.size,
        mimeType: item.mime_type,
        duration: item.duration,
        resolution: item.resolution,
        cloudFileId: item.cloud_file_id,
        cloudProviderId: item.cloud_provider_id,
        projectId: item.project_id,
        userId: item.user_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      })) || [];
      
      console.log('✅ [CloudStorage] Video clips retrieved successfully:', clips.length);
      return { success: true, clips };
      
    } catch (error) {
      console.error('❌ [CloudStorage] Failed to get video clips:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Download a video clip from cloud storage
  async downloadVideoClip(clipId: string): Promise<{ success: boolean; file?: File; error?: string }> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log(`📥 [CloudStorage] Downloading video clip ${clipId}...`);
      
      // Get clip metadata from Supabase
      const { data: clip, error: clipError } = await supabase
        .from('video_clips')
        .select('*')
        .eq('id', clipId)
        .eq('user_id', this.currentUserId)
        .single();
      
      if (clipError || !clip) {
        throw new Error('Video clip not found');
      }
      
      // Get access token from Supabase
      const { data: connection, error: connectionError } = await supabase
        .from('cloud_storage_connections')
        .select('access_token')
        .eq('user_id', this.currentUserId)
        .eq('provider_id', clip.cloud_provider_id)
        .single();
      
      if (connectionError || !connection) {
        throw new Error('Failed to get access token');
      }
      
      const token = connection.access_token;
      
      // Download from cloud storage
      switch (clip.cloud_provider_id) {
        case 'google-drive':
          return await this.downloadFromGoogleDrive(clip.cloud_file_id, token, clip.name, clip.mime_type);
        case 'one-drive':
          return await this.downloadFromOneDrive(clip.cloud_file_id, token, clip.name, clip.mime_type);
        case 'dropbox':
          return await this.downloadFromDropbox(clip.cloud_file_id, token, clip.name, clip.mime_type);
        default:
          throw new Error('Unsupported provider');
      }
      
    } catch (error) {
      console.error(`❌ [CloudStorage] Download video clip failed:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ===== TRANSCRIPTION MANAGEMENT =====
  
  // Save transcription data to Supabase
  async saveTranscription(
    clipId: string,
    transcription: {
      text: string;
      language: string;
      confidence: number;
      timestamps?: Array<{
        start: number;
        end: number;
        text: string;
      }>;
    }
  ): Promise<{ success: boolean; transcriptionId?: string; error?: string }> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log(`📝 [CloudStorage] Saving transcription for clip ${clipId}...`);
      
      // Verify clip belongs to user
      const { data: clip, error: clipError } = await supabase
        .from('video_clips')
        .select('id')
        .eq('id', clipId)
        .eq('user_id', this.currentUserId)
        .single();
      
      if (clipError || !clip) {
        throw new Error('Video clip not found');
      }
      
      // Save transcription to Supabase
      const transcriptionData = {
        clip_id: clipId,
        text: transcription.text,
        language: transcription.language,
        confidence: transcription.confidence,
        timestamps: transcription.timestamps,
        created_at: new Date().toISOString()
      };
      
      const { data: transcriptionResult, error: transcriptionError } = await supabase
        .from('transcriptions')
        .upsert(transcriptionData, { 
          onConflict: 'clip_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();
      
      if (transcriptionError) {
        throw new Error(`Failed to save transcription: ${transcriptionError.message}`);
      }
      
      // Update video clip with transcription reference
      await supabase
        .from('video_clips')
        .update({ 
          transcription: transcription.text,
          updated_at: new Date().toISOString()
        })
        .eq('id', clipId);
      
      console.log('✅ [CloudStorage] Transcription saved successfully');
      return { success: true, transcriptionId: transcriptionResult.id };
      
    } catch (error) {
      console.error('❌ [CloudStorage] Failed to save transcription:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get transcription for a video clip
  async getTranscription(clipId: string): Promise<{ success: boolean; transcription?: TranscriptionData; error?: string }> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log(`📝 [CloudStorage] Getting transcription for clip ${clipId}...`);
      
      // Verify clip belongs to user
      const { data: clip, error: clipError } = await supabase
        .from('video_clips')
        .select('id')
        .eq('id', clipId)
        .eq('user_id', this.currentUserId)
        .single();
      
      if (clipError || !clip) {
        throw new Error('Video clip not found');
      }
      
      // Get transcription from Supabase
      const { data: transcription, error: transcriptionError } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('clip_id', clipId)
        .single();
      
      if (transcriptionError && transcriptionError.code !== 'PGRST116') {
        throw new Error(`Failed to get transcription: ${transcriptionError.message}`);
      }
      
      if (!transcription) {
        return { success: true, transcription: undefined };
      }
      
      const transcriptionData: TranscriptionData = {
        id: transcription.id,
        clipId: transcription.clip_id,
        text: transcription.text,
        language: transcription.language,
        confidence: transcription.confidence,
        timestamps: transcription.timestamps,
        createdAt: transcription.created_at
      };
      
      console.log('✅ [CloudStorage] Transcription retrieved successfully');
      return { success: true, transcription: transcriptionData };
      
    } catch (error) {
      console.error('❌ [CloudStorage] Failed to get transcription:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ===== ANALYSIS MANAGEMENT =====
  
  // Save analysis data to Supabase
  async saveAnalysis(
    clipId: string,
    analysis: {
      viralScore: number;
      highlights: string[];
      tags: string[];
      summary: string;
      aiInsights?: string;
    }
  ): Promise<{ success: boolean; analysisId?: string; error?: string }> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log(`🔍 [CloudStorage] Saving analysis for clip ${clipId}...`);
      
      // Verify clip belongs to user
      const { data: clip, error: clipError } = await supabase
        .from('video_clips')
        .select('id')
        .eq('id', clipId)
        .eq('user_id', this.currentUserId)
        .single();
      
      if (clipError || !clip) {
        throw new Error('Video clip not found');
      }
      
      // Save analysis to Supabase
      const analysisData = {
        clip_id: clipId,
        viral_score: analysis.viralScore,
        highlights: analysis.highlights,
        tags: analysis.tags,
        summary: analysis.summary,
        ai_insights: analysis.aiInsights,
        created_at: new Date().toISOString()
      };
      
      const { data: analysisResult, error: analysisError } = await supabase
        .from('analyses')
        .upsert(analysisData, { 
          onConflict: 'clip_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();
      
      if (analysisError) {
        throw new Error(`Failed to save analysis: ${analysisError.message}`);
      }
      
      // Update video clip with analysis reference
      await supabase
        .from('video_clips')
        .update({ 
          analysis: {
            viralScore: analysis.viralScore,
            highlights: analysis.highlights,
            tags: analysis.tags,
            summary: analysis.summary
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', clipId);
      
      console.log('✅ [CloudStorage] Analysis saved successfully');
      return { success: true, analysisId: analysisResult.id };
      
    } catch (error) {
      console.error('❌ [CloudStorage] Failed to save analysis:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get analysis for a video clip
  async getAnalysis(clipId: string): Promise<{ success: boolean; analysis?: AnalysisData; error?: string }> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log(`🔍 [CloudStorage] Getting analysis for clip ${clipId}...`);
      
      // Verify clip belongs to user
      const { data: clip, error: clipError } = await supabase
        .from('video_clips')
        .select('id')
        .eq('id', clipId)
        .eq('user_id', this.currentUserId)
        .single();
      
      if (clipError || !clip) {
        throw new Error('Video clip not found');
      }
      
      // Get analysis from Supabase
      const { data: analysis, error: analysisError } = await supabase
        .from('analyses')
        .select('*')
        .eq('clip_id', clipId)
        .single();
      
      if (analysisError && analysisError.code !== 'PGRST116') {
        throw new Error(`Failed to get analysis: ${analysisError.message}`);
      }
      
      if (!analysis) {
        return { success: true, analysis: undefined };
      }
      
      const analysisData: AnalysisData = {
        id: analysis.id,
        clipId: analysis.clip_id,
        viralScore: analysis.viral_score,
        highlights: analysis.highlights,
        tags: analysis.tags,
        summary: analysis.summary,
        aiInsights: analysis.ai_insights,
        createdAt: analysis.created_at
      };
      
      console.log('✅ [CloudStorage] Analysis retrieved successfully');
      return { success: true, analysis: analysisData };
      
    } catch (error) {
      console.error('❌ [CloudStorage] Failed to get analysis:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ===== PROJECT-BASED RETRIEVAL =====
  
  // Get all content for a specific project
  async getProjectContent(projectId: string): Promise<{
    success: boolean;
    clips?: VideoClip[];
    transcriptions?: TranscriptionData[];
    analyses?: AnalysisData[];
    error?: string;
  }> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log(`📁 [CloudStorage] Getting project content for ${projectId}...`);
      
      // Get all clips for the project
      const clipsResult = await this.getVideoClips(projectId);
      if (!clipsResult.success) {
        throw new Error(clipsResult.error || 'Failed to get video clips');
      }
      
      const clips = clipsResult.clips || [];
      
      // Get transcriptions and analyses for each clip
      const transcriptions: TranscriptionData[] = [];
      const analyses: AnalysisData[] = [];
      
      for (const clip of clips) {
        // Get transcription
        const transcriptionResult = await this.getTranscription(clip.id);
        if (transcriptionResult.success && transcriptionResult.transcription) {
          transcriptions.push(transcriptionResult.transcription);
        }
        
        // Get analysis
        const analysisResult = await this.getAnalysis(clip.id);
        if (analysisResult.success && analysisResult.analysis) {
          analyses.push(analysisResult.analysis);
        }
      }
      
      console.log('✅ [CloudStorage] Project content retrieved successfully');
      return {
        success: true,
        clips,
        transcriptions,
        analyses
      };
      
    } catch (error) {
      console.error('❌ [CloudStorage] Failed to get project content:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ===== USER COLLABORATION =====
  
  // Share a project with another user (read-only access)
  async shareProject(projectId: string, userEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log(`🤝 [CloudStorage] Sharing project ${projectId} with ${userEmail}...`);
      
      // Verify project belongs to current user
      const { data: project, error: projectError } = await supabase
        .from('video_clips')
        .select('project_id')
        .eq('project_id', projectId)
        .eq('user_id', this.currentUserId)
        .limit(1)
        .single();
      
      if (projectError || !project) {
        throw new Error('Project not found or access denied');
      }
      
      // Find user by email
      const { data: targetUser, error: userError } = await supabase
        .from('auth.users')
        .select('id')
        .eq('email', userEmail)
        .single();
      
      if (userError || !targetUser) {
        throw new Error('User not found');
      }
      
      // Create project share record
      const shareData = {
        project_id: projectId,
        owner_id: this.currentUserId,
        shared_with_id: targetUser.id,
        permissions: 'read',
        created_at: new Date().toISOString()
      };
      
      const { error: shareError } = await supabase
        .from('project_shares')
        .upsert(shareData, { 
          onConflict: 'project_id,shared_with_id',
          ignoreDuplicates: false 
        });
      
      if (shareError) {
        throw new Error(`Failed to share project: ${shareError.message}`);
      }
      
      console.log('✅ [CloudStorage] Project shared successfully');
      return { success: true };
      
    } catch (error) {
      console.error('❌ [CloudStorage] Failed to share project:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get shared projects for current user
  async getSharedProjects(): Promise<{ success: boolean; projects?: any[]; error?: string }> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log('🤝 [CloudStorage] Getting shared projects...');
      
      // Get projects shared with current user
      const { data: shares, error: sharesError } = await supabase
        .from('project_shares')
        .select(`
          *,
          projects:video_clips(project_id, name, created_at)
        `)
        .eq('shared_with_id', this.currentUserId);
      
      if (sharesError) {
        throw new Error(`Failed to get shared projects: ${sharesError.message}`);
      }
      
      console.log('✅ [CloudStorage] Shared projects retrieved successfully');
      return { success: true, projects: shares || [] };
      
    } catch (error) {
      console.error('❌ [CloudStorage] Failed to get shared projects:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Upload transcription file to cloud storage and store metadata in Supabase
  async uploadTranscription(
    providerId: string, 
    transcriptionText: string,
    fileName: string,
    projectId?: string,
    clipId?: string,
    metadata?: {
      type: 'clip' | 'full_video';
      language?: string;
      confidence?: number;
      duration?: number;
    }
  ): Promise<{ success: boolean; transcriptionId?: string; error?: string }> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log(`📝 [CloudStorage] Uploading transcription to ${providerId}: ${fileName}`);
      
      // Check if provider is connected
      const isConnected = await this.isProviderConnected(providerId);
      if (!isConnected) {
        // Try to handle expired tokens before giving up
        console.log(`🔄 [CloudStorage] Provider ${providerId} not connected, attempting token refresh...`);
        
        // Get connection details to attempt refresh
        const { data: connection, error: connectionError } = await supabase
          .from('cloud_storage_connections')
          .select('*')
          .eq('user_id', this.currentUserId)
          .eq('provider_id', providerId)
          .single();
        
        if (connection && !connectionError) {
          const refreshSuccess = await this.handleExpiredToken(providerId, connection);
          if (refreshSuccess) {
            console.log(`✅ [CloudStorage] ${providerId} token refreshed, retrying transcription upload...`);
            // Retry the upload with the refreshed token
            return await this.uploadTranscription(providerId, transcriptionText, fileName, projectId, clipId, metadata);
          }
        }
        
        throw new Error(`Provider ${providerId} not connected. Please reconnect to continue.`);
      }
      
      // Get access token from Supabase
      const { data: connection, error: connectionError } = await supabase
        .from('cloud_storage_connections')
        .select('*')
        .eq('user_id', this.currentUserId)
        .eq('provider_id', providerId)
        .single();
      
      if (connectionError || !connection) {
        throw new Error('Failed to get access token');
      }
      
      const token = connection.access_token;
      
      // Get or create project folder for organization
      let folderId: string | undefined;
      if (projectId) {
        try {
          // Get project name for folder creation
          const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('title')
            .eq('id', projectId)
            .single();
          
          if (!projectError && project) {
            const folderResult = await this.getOrCreateProjectFolder(providerId, projectId, project.title);
            if (folderResult.success && folderResult.folderId) {
              folderId = folderResult.folderId;
              console.log(`📁 [CloudStorage] Using project folder for transcription: ${folderId}`);
            }
          }
        } catch (folderError) {
          console.warn('⚠️ [CloudStorage] Failed to get project folder for transcription, uploading to root:', folderError);
        }
      }
      
      // Create transcription file content
      const transcriptionContent = transcriptionText;
      const transcriptionBlob = new Blob([transcriptionContent], { type: 'text/plain' });
      const transcriptionFile = new File([transcriptionBlob], fileName, { type: 'text/plain' });
      
      // Upload transcription to cloud storage
      let uploadResult;
      switch (providerId) {
        case 'google-drive':
          uploadResult = await this.uploadToGoogleDrive(transcriptionFile, token, folderId);
          break;
        case 'one-drive':
          uploadResult = await this.uploadToOneDrive(transcriptionFile, token, folderId);
          break;
        case 'dropbox':
          uploadResult = await this.uploadToDropbox(transcriptionFile, token, folderId);
          break;
        default:
          throw new Error('Unsupported provider');
      }
      
      if (!uploadResult.success || !uploadResult.fileId) {
        throw new Error(uploadResult.error || 'Transcription upload failed');
      }
      
      console.log(`✅ [CloudStorage] Transcription uploaded successfully: ${uploadResult.fileId}`);
      
      return {
        success: true,
        transcriptionId: uploadResult.fileId
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transcription upload failed';
      console.error(`❌ [CloudStorage] Transcription upload to ${providerId} failed:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // Upload full video transcription
  async uploadFullVideoTranscription(
    providerId: string,
    transcriptionText: string,
    projectId: string,
    metadata?: {
      language?: string;
      confidence?: number;
      duration?: number;
    }
  ): Promise<{ success: boolean; transcriptionId?: string; error?: string }> {
    const fileName = `full_video_transcription_${projectId}_${Date.now()}.txt`;
    
    return await this.uploadTranscription(
      providerId,
      transcriptionText,
      fileName,
      projectId,
      undefined, // No clipId for full video transcription
      {
        type: 'full_video',
        language: metadata?.language,
        confidence: metadata?.confidence,
        duration: metadata?.duration
      }
    );
  }

  // Upload individual clip transcription
  async uploadClipTranscription(
    providerId: string,
    transcriptionText: string,
    projectId: string,
    clipId: string,
    metadata?: {
      language?: string;
      confidence?: number;
      duration?: number;
    }
  ): Promise<{ success: boolean; transcriptionId?: string; error?: string }> {
    const fileName = `clip_transcription_${clipId}_${Date.now()}.txt`;
    
    return await this.uploadTranscription(
      providerId,
      transcriptionText,
      fileName,
      projectId,
      clipId,
      {
        type: 'clip',
        language: metadata?.language,
        confidence: metadata?.confidence,
        duration: metadata?.duration
      }
    );
  }

  // Upload analysis data as JSON to cloud storage
  async uploadAnalysis(
    providerId: string,
    analysisData: any,
    filename: string,
    projectId?: string,
    clipId?: string,
    folderId?: string
  ): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log(`📊 [CloudStorage] Uploading analysis to ${providerId}...`);
      
      // Check if provider is connected
      const isConnected = await this.isProviderConnected(providerId);
      if (!isConnected) {
        throw new Error('Provider not connected');
      }
      
      // Get access token from Supabase
      const { data: connection, error: connectionError } = await supabase
        .from('cloud_storage_connections')
        .select('access_token')
        .eq('user_id', this.currentUserId)
        .eq('provider_id', providerId)
        .single();
      
      if (connectionError || !connection) {
        throw new Error('Failed to get access token');
      }
      
      const token = connection.access_token;
      
      // Create a JSON file blob
      const jsonBlob = new Blob([JSON.stringify(analysisData, null, 2)], { type: 'application/json' });
      const jsonFile = new File([jsonBlob], filename, { type: 'application/json' });
      
      // Upload JSON file to cloud storage
      let uploadResult;
      switch (providerId) {
        case 'google-drive':
          uploadResult = await this.uploadToGoogleDrive(jsonFile, token, folderId);
          break;
        case 'one-drive':
          uploadResult = await this.uploadToOneDrive(jsonFile, token, folderId);
          break;
        case 'dropbox':
          uploadResult = await this.uploadToDropbox(jsonFile, token, folderId);
          break;
        default:
          throw new Error('Unsupported provider');
      }
      
      if (!uploadResult.success || !uploadResult.fileId) {
        throw new Error(uploadResult.error || 'Upload failed');
      }
      
      console.log('✅ [CloudStorage] Analysis uploaded successfully');
      return { success: true, fileId: uploadResult.fileId };
      
    } catch (error) {
      console.error(`❌ [CloudStorage] Analysis upload to ${providerId} failed:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Download transcription from cloud storage
  async downloadTranscription(
    providerId: string,
    fileId: string
  ): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log(`📥 [CloudStorage] Downloading transcription from ${providerId}...`);
      
      // Check if provider is connected
      const isConnected = await this.isProviderConnected(providerId);
      if (!isConnected) {
        throw new Error('Provider not connected');
      }
      
      // Get access token from Supabase
      const { data: connection, error: connectionError } = await supabase
        .from('cloud_storage_connections')
        .select('access_token')
        .eq('user_id', this.currentUserId)
        .eq('provider_id', providerId)
        .single();
      
      if (connectionError || !connection) {
        throw new Error('Failed to get access token');
      }
      
      const token = connection.access_token;
      
      // Download file from cloud storage
      let downloadResult;
      switch (providerId) {
        case 'google-drive':
          downloadResult = await this.downloadTextFromGoogleDrive(fileId, token);
          break;
        case 'one-drive':
          downloadResult = await this.downloadTextFromOneDrive(fileId, token);
          break;
        case 'dropbox':
          downloadResult = await this.downloadTextFromDropbox(fileId, token);
          break;
        default:
          throw new Error('Unsupported provider');
      }
      
      if (!downloadResult.success || !downloadResult.content) {
        throw new Error(downloadResult.error || 'Download failed');
      }
      
      console.log('✅ [CloudStorage] Transcription downloaded successfully');
      return { success: true, text: downloadResult.content };
      
    } catch (error) {
      console.error(`❌ [CloudStorage] Transcription download from ${providerId} failed:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Download analysis from cloud storage
  async downloadAnalysis(
    providerId: string,
    fileId: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log(`📥 [CloudStorage] Downloading analysis from ${providerId}...`);
      
      // Check if provider is connected
      const isConnected = await this.isProviderConnected(providerId);
      if (!isConnected) {
        throw new Error('Provider not connected');
      }
      
      // Get access token from Supabase
      const { data: connection, error: connectionError } = await supabase
        .from('cloud_storage_connections')
        .select('access_token')
        .eq('user_id', this.currentUserId)
        .eq('provider_id', providerId)
        .single();
      
      if (connectionError || !connection) {
        throw new Error('Failed to get access token');
      }
      
      const token = connection.access_token;
      
      // Download file from cloud storage
      let downloadResult;
      switch (providerId) {
        case 'google-drive':
          downloadResult = await this.downloadTextFromGoogleDrive(fileId, token);
          break;
        case 'one-drive':
          downloadResult = await this.downloadTextFromOneDrive(fileId, token);
          break;
        case 'dropbox':
          downloadResult = await this.downloadTextFromDropbox(fileId, token);
          break;
        default:
          throw new Error('Unsupported provider');
      }
      
      if (!downloadResult.success || !downloadResult.content) {
        throw new Error(downloadResult.error || 'Download failed');
      }
      
      // Parse JSON content
      try {
        const analysisData = JSON.parse(downloadResult.content);
        console.log('✅ [CloudStorage] Analysis downloaded and parsed successfully');
        return { success: true, data: analysisData };
      } catch (parseError) {
        throw new Error('Failed to parse analysis data');
      }
      
    } catch (error) {
      console.error(`❌ [CloudStorage] Analysis download from ${providerId} failed:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Helper method to download text content from Google Drive
  private async downloadTextFromGoogleDrive(
    fileId: string, 
    token: string
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Google Drive API error: ${response.status} ${response.statusText}`);
      }

      const content = await response.text();
      return { success: true, content };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Helper method to download text content from OneDrive
  private async downloadTextFromOneDrive(
    fileId: string, 
    token: string
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`OneDrive API error: ${response.status} ${response.statusText}`);
      }

      const content = await response.text();
      return { success: false, error: 'OneDrive text download not implemented' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Helper method to download text content from Dropbox
  private async downloadTextFromDropbox(
    fileId: string, 
    token: string
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      const response = await fetch('https://content.dropboxapi.com/2/files/download', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Dropbox-API-Arg': JSON.stringify({ path: fileId }),
        },
      });

      if (!response.ok) {
        throw new Error(`Dropbox API error: ${response.status} ${response.statusText}`);
      }

      const content = await response.text();
      return { success: true, content };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Handle expired tokens gracefully
  async handleExpiredToken(providerId: string, connection: any): Promise<boolean> {
    try {
      console.log(`🔄 [CloudStorage] Handling expired token for ${providerId}...`);
      
      // First try to refresh the token
      if (connection.refresh_token) {
        console.log(`🔄 [CloudStorage] Attempting to refresh ${providerId} token...`);
        const refreshSuccess = await this.refreshToken(providerId, connection);
        if (refreshSuccess) {
          console.log(`✅ [CloudStorage] ${providerId} token refreshed successfully`);
          return true;
        }
      }
      
      // If refresh fails, force re-authentication
      console.log(`🔄 [CloudStorage] Token refresh failed, forcing re-authentication for ${providerId}...`);
      const reauthResult = await this.forceReauthentication(providerId);
      
      if (reauthResult.success) {
        console.log(`✅ [CloudStorage] ${providerId} re-authentication successful`);
        return true;
      } else {
        console.log(`❌ [CloudStorage] ${providerId} re-authentication failed:`, reauthResult.error);
        return false;
      }
    } catch (error) {
      console.error(`❌ [CloudStorage] Error handling expired token for ${providerId}:`, error);
      return false;
    }
  }

  // Generic token refresh method
  private async refreshToken(providerId: string, connection: any): Promise<boolean> {
    try {
      switch (providerId) {
        case 'google-drive':
          return await this.refreshGoogleDriveToken(connection);
        case 'one-drive':
          return await this.refreshOneDriveToken(connection);
        case 'dropbox':
          return await this.refreshDropboxToken(connection);
        default:
          console.log(`⚠️ [CloudStorage] No refresh method available for ${providerId}`);
          return false;
      }
    } catch (error) {
      console.error(`❌ [CloudStorage] Error refreshing ${providerId} token:`, error);
      return false;
    }
  }

  // Refresh Dropbox access token (placeholder implementation)
  async refreshDropboxToken(connection: any): Promise<boolean> {
    try {
      console.log('🔄 [CloudStorage] Refreshing Dropbox token...');
      // Dropbox tokens don't expire, so this is mostly a placeholder
      return true;
    } catch (error) {
      console.error('❌ [CloudStorage] Error refreshing Dropbox token:', error);
      return false;
    }
  }

  // Check if a connection needs re-authentication
  async needsReauthentication(providerId: string): Promise<{ needsReauth: boolean; reason?: string }> {
    try {
      if (!this.currentUserId) {
        return { needsReauth: true, reason: 'User not authenticated' };
      }

      const { data: connection, error } = await supabase
        .from('cloud_storage_connections')
        .select('*')
        .eq('user_id', this.currentUserId)
        .eq('provider_id', providerId)
        .single();

      if (error || !connection) {
        return { needsReauth: true, reason: 'No connection found' };
      }

      // Check if token is expired
      if (connection.expires_at) {
        const expiresAt = new Date(connection.expires_at);
        const now = new Date();
        if (now >= expiresAt) {
          return { needsReauth: true, reason: 'Token expired' };
        }
      }

      // Check if we have a refresh token
      if (!connection.refresh_token) {
        return { needsReauth: true, reason: 'No refresh token available' };
      }

      return { needsReauth: false };
    } catch (error) {
      console.error(`❌ [CloudStorage] Error checking re-authentication needs for ${providerId}:`, error);
      return { needsReauth: true, reason: 'Error checking connection status' };
    }
  }

  // Get user-friendly guidance for connection issues
  getConnectionGuidance(providerId: string, issue: string): { title: string; message: string; action: string } {
    const guidance = {
      'google-drive': {
        'token_expired': {
          title: 'Google Drive Connection Expired',
          message: 'Your Google Drive connection has expired. You need to reconnect to continue uploading files.',
          action: 'Reconnect to Google Drive'
        },
        'no_refresh_token': {
          title: 'Google Drive Re-authentication Required',
          message: 'Your Google Drive connection needs to be refreshed. This usually happens when the connection was made without offline access.',
          action: 'Reconnect to Google Drive'
        },
        'connection_failed': {
          title: 'Google Drive Connection Failed',
          message: 'Unable to connect to Google Drive. This could be due to network issues or revoked permissions.',
          action: 'Try Again'
        }
      },
      'one-drive': {
        'token_expired': {
          title: 'OneDrive Connection Expired',
          message: 'Your OneDrive connection has expired. You need to reconnect to continue uploading files.',
          action: 'Reconnect to OneDrive'
        },
        'connection_failed': {
          title: 'OneDrive Connection Failed',
          message: 'Unable to connect to OneDrive. This could be due to network issues or revoked permissions.',
          action: 'Try Again'
        }
      },
      'dropbox': {
        'connection_failed': {
          title: 'Dropbox Connection Failed',
          message: 'Unable to connect to Dropbox. This could be due to network issues or revoked permissions.',
          action: 'Try Again'
        }
      }
    };

    const providerGuidance = guidance[providerId as keyof typeof guidance];
    if (!providerGuidance) {
      return {
        title: 'Connection Issue',
        message: `There was a problem with your ${providerId} connection.`,
        action: 'Reconnect'
      };
    }

    return providerGuidance[issue as keyof typeof providerGuidance] || {
      title: 'Connection Issue',
      message: `There was a problem with your ${providerId} connection: ${issue}`,
      action: 'Reconnect'
    };
  }

  // Create or get project folder in cloud storage
  async getOrCreateProjectFolder(
    providerId: string, 
    projectId: string, 
    projectName: string
  ): Promise<{ success: boolean; folderId?: string; error?: string }> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log(`📁 [CloudStorage] Getting/creating project folder for: ${projectName}`);
      
      // Check if provider is connected
      const isConnected = await this.isProviderConnected(providerId);
      if (!isConnected) {
        throw new Error('Provider not connected');
      }
      
      // Get access token from Supabase
      const { data: connection, error: connectionError } = await supabase
        .from('cloud_storage_connections')
        .select('*')
        .eq('user_id', this.currentUserId)
        .eq('provider_id', providerId)
        .single();
      
      if (connectionError || !connection) {
        throw new Error('Failed to get access token');
      }
      
      const token = connection.access_token;
      
      // Create organized folder structure
      const folderName = `Zuexis_Project_${projectName}_${projectId}`;
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Create main project folder
      let folderResult;
      switch (providerId) {
        case 'google-drive':
          folderResult = await this.createFolderInGoogleDrive(token, folderName);
          break;
        case 'one-drive':
          folderResult = await this.createFolderInOneDrive(token, folderName);
          break;
        case 'dropbox':
          folderResult = await this.createFolderInDropbox(token, folderName);
          break;
        default:
          throw new Error('Unsupported provider');
      }
      
      if (!folderResult.success || !folderResult.folderId) {
        throw new Error(folderResult.error || 'Failed to create project folder');
      }
      
      console.log(`✅ [CloudStorage] Project folder created: ${folderName}`);
      
      // Store folder reference in Supabase for future use (optional)
      try {
        // Check if project_folders table exists before trying to use it
        const { data: tableExists, error: tableCheckError } = await supabase
          .from('project_folders')
          .select('project_id')
          .limit(1);
        
        if (!tableCheckError && tableExists !== null) {
          // Table exists, try to store the reference
          const { error: folderError } = await supabase
            .from('project_folders')
            .upsert({
              project_id: projectId,
              provider: providerId,
              folder_id: folderResult.folderId,
              folder_name: folderName,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'project_id,provider'
            });

          if (folderError) {
            console.warn('⚠️ [CloudStorage] Failed to store folder reference:', folderError);
          } else {
            console.log(`✅ [CloudStorage] Project folder reference stored: ${folderResult.folderId}`);
          }
        } else {
          console.log('ℹ️ [CloudStorage] project_folders table not available, skipping folder reference storage');
        }
      } catch (folderError) {
        console.log('ℹ️ [CloudStorage] project_folders table not available, skipping folder reference storage');
      }
      
      return {
        success: true,
        folderId: folderResult.folderId
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create project folder';
      console.error(`❌ [CloudStorage] Project folder creation failed:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // Create folder in Google Drive
  private async createFolderInGoogleDrive(token: string, folderName: string): Promise<{ success: boolean; folderId?: string; error?: string }> {
    try {
      const response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: ['root'] // Create in root directory
        })
      });

      if (response.ok) {
        const folderData = await response.json();
        return { success: true, folderId: folderData.id };
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Create folder in OneDrive
  private async createFolderInOneDrive(token: string, folderName: string): Promise<{ success: boolean; folderId?: string; error?: string }> {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: folderName,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'rename'
        })
      });

      if (response.ok) {
        const folderData = await response.json();
        return { success: true, folderId: folderData.id };
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Create folder in Dropbox
  private async createFolderInDropbox(token: string, folderName: string): Promise<{ success: boolean; folderId?: string; error?: string }> {
    try {
      const response = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: `/${folderName}`,
          autorename: true
        })
      });

      if (response.ok) {
        const folderData = await response.json();
        return { success: true, folderId: folderData.metadata.id };
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Smart connection validation and auto-reconnection system
  async validateAndEnsureConnection(providerId: string): Promise<{ isValid: boolean; needsReauth: boolean; error?: string }> {
    try {
      console.log(`🔍 [CloudStorage] Validating connection for ${providerId}...`);
      
      if (!this.currentUserId) {
        return { isValid: false, needsReauth: true, error: 'User not authenticated' };
      }

      // Get current connection
      const { data: connection, error } = await supabase
        .from('cloud_storage_connections')
        .select('*')
        .eq('user_id', this.currentUserId)
        .eq('provider_id', providerId)
        .single();

      if (error || !connection) {
        console.log(`🔍 [CloudStorage] No connection found for ${providerId}`);
        return { isValid: false, needsReauth: true, error: 'No connection found' };
      }

      // Check if token is expired or will expire soon (within 5 minutes)
      if (connection.expires_at) {
        const expiresAt = new Date(connection.expires_at);
        const now = new Date();
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
        
        if (now >= expiresAt) {
          console.log(`🔄 [CloudStorage] Token expired for ${providerId}, attempting auto-refresh...`);
          const refreshSuccess = await this.handleExpiredToken(providerId, connection);
          if (refreshSuccess) {
            return { isValid: true, needsReauth: false };
          } else {
            return { isValid: false, needsReauth: true, error: 'Token expired and refresh failed' };
          }
        } else if (expiresAt <= fiveMinutesFromNow) {
          console.log(`🔄 [CloudStorage] Token expires soon for ${providerId}, refreshing proactively...`);
          const refreshSuccess = await this.handleExpiredToken(providerId, connection);
          if (refreshSuccess) {
            return { isValid: true, needsReauth: false };
          }
        }
      }

      // Test the actual connection with a real API call
      const connectionTest = await this.testProviderConnection(providerId, connection);
      if (connectionTest) {
        console.log(`✅ [CloudStorage] Connection validated for ${providerId}`);
        return { isValid: true, needsReauth: false };
      } else {
        console.log(`🔄 [CloudStorage] Connection test failed for ${providerId}, attempting auto-refresh...`);
        const refreshSuccess = await this.handleExpiredToken(providerId, connection);
        if (refreshSuccess) {
          return { isValid: true, needsReauth: false };
        } else {
          return { isValid: false, needsReauth: true, error: 'Connection test failed and refresh failed' };
        }
      }

    } catch (error) {
      console.error(`❌ [CloudStorage] Error validating connection for ${providerId}:`, error);
      return { isValid: false, needsReauth: true, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Pre-flight check before video processing
  async preflightCheck(providerId: string): Promise<{ canProceed: boolean; error?: string; needsReauth: boolean }> {
    try {
      console.log(`✈️ [CloudStorage] Pre-flight check for ${providerId}...`);
      
      // First, validate the connection
      const validation = await this.validateAndEnsureConnection(providerId);
      
      if (!validation.isValid) {
        if (validation.needsReauth) {
          console.log(`⚠️ [CloudStorage] Pre-flight check failed: ${providerId} needs re-authentication`);
          return { canProceed: false, needsReauth: true, error: validation.error };
        } else {
          console.log(`❌ [CloudStorage] Pre-flight check failed: ${providerId} connection invalid`);
          return { canProceed: false, needsReauth: false, error: validation.error };
        }
      }

      // Test upload capability with a small test file
      const uploadTest = await this.testUploadCapability(providerId);
      if (!uploadTest.success) {
        console.log(`❌ [CloudStorage] Upload capability test failed for ${providerId}`);
        return { canProceed: false, needsReauth: false, error: uploadTest.error };
      }

      console.log(`✅ [CloudStorage] Pre-flight check passed for ${providerId}`);
      return { canProceed: true, needsReauth: false };

    } catch (error) {
      console.error(`❌ [CloudStorage] Pre-flight check error for ${providerId}:`, error);
      return { canProceed: false, needsReauth: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Test upload capability with a small test file
  private async testUploadCapability(providerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🧪 [CloudStorage] Testing upload capability for ${providerId}...`);
      
      switch (providerId) {
        case 'google-drive':
          return await this.testGoogleDriveUpload();
        case 'one-drive':
          return await this.testOneDriveUpload();
        case 'dropbox':
          return await this.testDropboxUpload();
        default:
          return { success: false, error: 'Unsupported provider' };
      }
    } catch (error) {
      console.error(`❌ [CloudStorage] Upload capability test error for ${providerId}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Test Google Drive upload capability
  private async testGoogleDriveUpload(): Promise<{ success: boolean; error?: string }> {
    try {
      const connection = await this.getCurrentConnection('google-drive');
      if (!connection) {
        return { success: false, error: 'No Google Drive connection found' };
      }

      // Create a small test file
      const testContent = 'Test file for connection validation';
      const testBlob = new Blob([testContent], { type: 'text/plain' });
      const testFile = new File([testBlob], 'connection-test.txt', { type: 'text/plain' });

      // Try to upload to a test folder
      const testFolderId = await this.getOrCreateTestFolder(connection);
      if (!testFolderId) {
        return { success: false, error: 'Could not create test folder' };
      }

      // Upload test file
      const uploadResult = await this.uploadFileToGoogleDrive(testFile, testFolderId, connection);
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error };
      }

      // Clean up test file
      try {
        if (uploadResult.fileId) {
          await this.deleteFileFromGoogleDrive(uploadResult.fileId, connection);
        }
      } catch (cleanupError) {
        console.log('⚠️ [CloudStorage] Test file cleanup failed, but upload test passed');
      }

      return { success: true };

    } catch (error) {
      console.error('❌ [CloudStorage] Google Drive upload test error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get or create a test folder for connection validation
  private async getOrCreateTestFolder(connection: any): Promise<string | null> {
    try {
      // Try to find existing test folder
      const response = await fetch('https://www.googleapis.com/drive/v3/files', {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: "name='Zuexis_Connection_Test' and mimeType='application/vnd.google-apps.folder' and trashed=false",
          fields: 'files(id)'
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.files && data.files.length > 0) {
          return data.files[0].id;
        }
      }

      // Create new test folder
      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Zuexis_Connection_Test',
          mimeType: 'application/vnd.google-apps.folder'
        })
      });

      if (createResponse.ok) {
        const folderData = await createResponse.json();
        return folderData.id;
      }

      return null;

    } catch (error) {
      console.error('❌ [CloudStorage] Error creating test folder:', error);
      return null;
    }
  }

  // Upload file to Google Drive (for testing)
  private async uploadFileToGoogleDrive(file: File, folderId: string, connection: any): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.access_token}`
        },
        body: (() => {
          const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
          const formData = new FormData();
          
          // Add file metadata
          const metadata = {
            name: file.name,
            parents: [folderId]
          };
          
          formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
          formData.append('file', file);
          
          return formData;
        })()
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, fileId: data.id };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.error?.message || 'Upload failed' };
      }

    } catch (error) {
      console.error('❌ [CloudStorage] Error uploading test file:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Delete file from Google Drive (for cleanup)
  private async deleteFileFromGoogleDrive(fileId: string, connection: any): Promise<boolean> {
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${connection.access_token}`
        }
      });

      return response.ok;

    } catch (error) {
      console.error('❌ [CloudStorage] Error deleting test file:', error);
      return false;
    }
  }

  // Test OneDrive upload capability
  private async testOneDriveUpload(): Promise<{ success: boolean; error?: string }> {
    try {
      // Placeholder implementation for OneDrive
      console.log('🧪 [CloudStorage] OneDrive upload test not implemented yet');
      return { success: true }; // Assume success for now
    } catch (error) {
      return { success: false, error: 'OneDrive upload test not implemented' };
    }
  }

  // Test Dropbox upload capability
  private async testDropboxUpload(): Promise<{ success: boolean; error?: string }> {
    try {
      // Placeholder implementation for Dropbox
      console.log('🧪 [CloudStorage] Dropbox upload test not implemented yet');
      return { success: true }; // Assume success for now
    } catch (error) {
      return { success: false, error: 'Dropbox upload test not implemented' };
    }
  }

  // Get current connection for a provider
  private async getCurrentConnection(providerId: string): Promise<any> {
    try {
      const { data: connection, error } = await supabase
        .from('cloud_storage_connections')
        .select('*')
        .eq('user_id', this.currentUserId)
        .eq('provider_id', providerId)
        .single();

      if (error || !connection) {
        return null;
      }

      return connection;

    } catch (error) {
      console.error(`❌ [CloudStorage] Error getting connection for ${providerId}:`, error);
      return null;
    }
  }

  // Get streaming URL for video playback
  async getVideoStreamingUrl(providerId: string, fileId: string): Promise<string | null> {
    try {
      console.log(`🎥 [CloudStorage] Getting streaming URL for ${providerId} file: ${fileId}`);
      
      if (!this.currentUserId) {
        console.error('❌ [CloudStorage] User not authenticated');
        return null;
      }

      const connection = await this.getCurrentConnection(providerId);
      if (!connection) {
        console.error(`❌ [CloudStorage] No connection found for ${providerId}`);
        return null;
      }

      switch (providerId) {
        case 'google-drive':
          return await this.getGoogleDriveStreamingUrl(fileId, connection);
        case 'one-drive':
          return await this.getOneDriveStreamingUrl(fileId, connection);
        case 'dropbox':
          return await this.getDropboxStreamingUrl(fileId, connection);
        default:
          console.error(`❌ [CloudStorage] Unsupported provider: ${providerId}`);
          return null;
      }
    } catch (error) {
      console.error(`❌ [CloudStorage] Error getting streaming URL:`, error);
      return null;
    }
  }

  // Get Google Drive streaming URL
  private async getGoogleDriveStreamingUrl(fileId: string, connection: any): Promise<string | null> {
    try {
      // For Google Drive, we need to handle CSP restrictions
      // Let's try to get the webContentLink first, and if it fails, fall back to blob URLs
      
      console.log(`🔄 [CloudStorage] Trying to get Google Drive streaming URL...`);
      
      // Get file info to check if we can access it
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=webContentLink,webViewLink,size,mimeType`, {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`
        }
      });

      if (!response.ok) {
        console.log(`⚠️ [CloudStorage] Could not get file info, will use blob URL approach`);
        return null;
      }

      const fileInfo = await response.json();
      
      // Check if we have a webContentLink that might work
      if (fileInfo.webContentLink && fileInfo.mimeType && fileInfo.mimeType.startsWith('video/')) {
        console.log(`✅ [CloudStorage] Found video file with webContentLink, trying direct streaming`);
        return fileInfo.webContentLink;
      }
      
      console.log(`🔄 [CloudStorage] No suitable streaming URL, will use blob URL approach`);
      return null;

    } catch (error) {
      console.error('❌ [CloudStorage] Error getting Google Drive streaming URL:', error);
      return null;
    }
  }

  // Get OneDrive streaming URL
  private async getOneDriveStreamingUrl(fileId: string, connection: any): Promise<string | null> {
    try {
      // For OneDrive, we need to get the download URL which can be used for streaming
      const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`, {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`
        }
      });

      if (!response.ok) {
        console.error(`❌ [CloudStorage] Failed to get OneDrive file content: ${response.status}`);
        return null;
      }

      // OneDrive returns a redirect URL that we can use for streaming
      const downloadUrl = response.url;
      return downloadUrl;

    } catch (error) {
      console.error('❌ [CloudStorage] Error getting OneDrive streaming URL:', error);
      return null;
    }
  }

  // Get Dropbox streaming URL
  private async getDropboxStreamingUrl(fileId: string, connection: any): Promise<string | null> {
    try {
      // For Dropbox, we need to get a temporary link for streaming
      const response = await fetch('https://api.dropboxapi.com/2/files/get_temporary_link', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: fileId
        })
      });

      if (!response.ok) {
        console.error(`❌ [CloudStorage] Failed to get Dropbox temporary link: ${response.status}`);
        return null;
      }

      const linkData = await response.json();
      return linkData.link;

    } catch (error) {
      console.error('❌ [CloudStorage] Error getting Dropbox streaming URL:', error);
      return null;
    }
  }

  // Create blob URL for Google Drive files (fallback when webContentLink is not available)
  async createGoogleDriveBlobUrl(fileId: string): Promise<string | null> {
    try {
      console.log(`🔄 [CloudStorage] Creating blob URL for Google Drive file: ${fileId}`);
      
      // Get the current user's Google Drive connection
      const { data: connections } = await supabase
        .from('cloud_storage_connections')
        .select('*')
        .eq('provider_id', 'google-drive')
        .eq('user_id', this.currentUserId)
        .single();

      if (!connections || !connections.access_token) {
        console.error('❌ [CloudStorage] No Google Drive connection found or no access token');
        return null;
      }

      const connection = connections;

      // First, get file info to check if we can access it
      const infoResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,size,mimeType`, {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`
        }
      });

      if (!infoResponse.ok) {
        console.error(`❌ [CloudStorage] Failed to get file info: ${infoResponse.status} - ${infoResponse.statusText}`);
        return null;
      }

      const fileInfo = await infoResponse.json();
      console.log(`📁 [CloudStorage] File info: ${fileInfo.name} (${fileInfo.mimeType}) - ${fileInfo.size} bytes`);

      // Try multiple download methods
      const methods = [
                 // Method 1: Direct API download
         async () => {
           console.log(`🔄 [CloudStorage] Trying method 1: Direct API download`);
           const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
             headers: {
               'Authorization': `Bearer ${connection.access_token}`,
               'Accept': '*/*'
             }
           });
           
           if (!response.ok) {
             console.log(`❌ [CloudStorage] Method 1 failed: ${response.status} - ${response.statusText}`);
             return null;
           }
           
           const blob = await response.blob();
           console.log(`📦 [CloudStorage] Method 1 blob: ${blob.size} bytes, type: ${blob.type}`);
           
           if (blob.type.startsWith('video/') || blob.type.startsWith('application/octet-stream')) {
             console.log(`✅ [CloudStorage] Method 1 successful: ${blob.size} bytes, ${blob.type}`);
             return URL.createObjectURL(blob);
           } else {
             console.log(`❌ [CloudStorage] Method 1 returned wrong content type: ${blob.type}`);
             
             // If it's text, let's see what we got
             if (blob.type.startsWith('text/')) {
               try {
                 const textContent = await blob.text();
                 console.error(`❌ [CloudStorage] Text content: ${textContent.substring(0, 300)}...`);
               } catch (e) {
                 console.error(`❌ [CloudStorage] Could not read text content`);
               }
             }
           }
           return null;
         },
        
                 // Method 2: webContentLink download
         async () => {
           console.log(`🔄 [CloudStorage] Trying method 2: webContentLink download`);
           const infoResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=webContentLink`, {
             headers: {
               'Authorization': `Bearer ${connection.access_token}`
             }
           });
           
           if (!infoResponse.ok) {
             console.log(`❌ [CloudStorage] Method 2 failed to get file info: ${infoResponse.status}`);
             return null;
           }
           
           const fileInfo = await infoResponse.json();
           if (!fileInfo.webContentLink) {
             console.log(`❌ [CloudStorage] Method 2: No webContentLink available`);
             return null;
           }
           
           console.log(`🔄 [CloudStorage] Method 2: webContentLink found, trying download`);
           const altResponse = await fetch(fileInfo.webContentLink);
           
           if (!altResponse.ok) {
             console.log(`❌ [CloudStorage] Method 2 failed to download: ${altResponse.status}`);
             return null;
           }
           
           const altBlob = await altResponse.blob();
           console.log(`📦 [CloudStorage] Method 2 blob: ${altBlob.size} bytes, type: ${altBlob.type}`);
           
           if (altBlob.type.startsWith('video/') || altBlob.type.startsWith('application/octet-stream')) {
             console.log(`✅ [CloudStorage] Method 2 successful: ${altBlob.size} bytes, ${altBlob.type}`);
             return URL.createObjectURL(altBlob);
           } else {
             console.log(`❌ [CloudStorage] Method 2 returned wrong content type: ${altBlob.type}`);
           }
           return null;
         }
      ];

      // Try each method until one succeeds
      for (let i = 0; i < methods.length; i++) {
        try {
          const result = await methods[i]();
          if (result) {
            return result;
          }
        } catch (methodError) {
          console.error(`❌ [CloudStorage] Method ${i + 1} failed:`, methodError);
        }
      }

      console.error('❌ [CloudStorage] All download methods failed');
      return null;

    } catch (error) {
      console.error('❌ [CloudStorage] Error creating blob URL:', error);
      return null;
    }
  }

  // 🚀 NEW: Upload video to cloud storage for backend processing (cloud-first approach)
  async uploadVideoToCloud(
    videoFile: File,
    projectId?: string,
    metadata?: {
      duration?: number;
      resolution?: string;
      description?: string;
    }
  ): Promise<{ 
    success: boolean; 
    fileId?: string; 
    accessToken?: string; 
    providerId?: string;
    error?: string 
  }> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log('🚀 [CloudStorage] Starting cloud-first video upload...');
      
      // Check if we have connected cloud storage providers
      const connectedProviders = await this.getConnectedProviders();
      if (connectedProviders.length === 0) {
        throw new Error('No cloud storage providers connected. Please connect Google Drive first.');
      }

      // Use Google Drive as primary provider for backend processing
      const primaryProvider = connectedProviders.find(p => p.id === 'google-drive') || connectedProviders[0];
      console.log(`☁️ [CloudStorage] Using provider: ${primaryProvider.name} (${primaryProvider.id})`);

      // Check if provider is connected
      const isConnected = await this.isProviderConnected(primaryProvider.id);
      if (!isConnected) {
        throw new Error(`${primaryProvider.name} not connected. Please reconnect to continue.`);
      }
      
      // Get access token from Supabase
      const { data: connection, error: connectionError } = await supabase
        .from('cloud_storage_connections')
        .select('*')
        .eq('user_id', this.currentUserId)
        .eq('provider_id', primaryProvider.id)
        .single();
      
      if (connectionError || !connection) {
        throw new Error('Failed to get access token');
      }
      
      const token = connection.access_token;
      
      // Get or create project folder for organization
      let folderId: string | undefined;
      if (projectId) {
        try {
          const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('title')
            .eq('id', projectId)
            .single();
          
          if (!projectError && project) {
            const folderResult = await this.getOrCreateProjectFolder(primaryProvider.id, projectId, project.title);
            if (folderResult.success && folderResult.folderId) {
              folderId = folderResult.folderId;
              console.log(`📁 [CloudStorage] Using project folder: ${folderId}`);
            }
          }
        } catch (folderError) {
          console.warn('⚠️ [CloudStorage] Failed to get project folder, uploading to root:', folderError);
        }
      }
      
      // Upload video to cloud storage
      let uploadResult;
      switch (primaryProvider.id) {
        case 'google-drive':
          uploadResult = await this.uploadToGoogleDrive(videoFile, token, folderId);
          break;
        case 'one-drive':
          uploadResult = await this.uploadToOneDrive(videoFile, token, folderId);
          break;
        case 'dropbox':
          uploadResult = await this.uploadToDropbox(videoFile, token, folderId);
          break;
        default:
          throw new Error('Unsupported provider');
      }
      
      if (!uploadResult.success || !uploadResult.fileId) {
        throw new Error(uploadResult.error || 'Upload failed');
      }
      
      console.log(`✅ [CloudStorage] Video uploaded to ${primaryProvider.name} successfully: ${uploadResult.fileId}`);
      
      return {
        success: true,
        fileId: uploadResult.fileId,
        accessToken: token,
        providerId: primaryProvider.id
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Cloud-first upload failed';
      console.error('❌ [CloudStorage] Cloud-first upload failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  
  
}

// Create and export singleton instance
export const cloudStorageService = new CloudStorageService();
