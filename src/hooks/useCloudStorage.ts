import { useState, useEffect, useCallback } from 'react';
import { cloudStorageService, CloudStorageProvider, VideoClip, CloudStorageFile, TranscriptionData, AnalysisData } from '../services/cloudStorageService';
import { useAuth } from '../contexts/AuthContext';

export const useCloudStorage = () => {
  const { user } = useAuth();
  const [providers, setProviders] = useState<CloudStorageProvider[]>([]);
  const [connectedProviders, setConnectedProviders] = useState<CloudStorageProvider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load providers and check connections on mount (NORMAL OPERATION)
  useEffect(() => {
    if (user) {
      const loadProviders = async () => {
        try {
          await cloudStorageService.refreshCurrentUser();
          const allProviders = cloudStorageService.getProviders();
          const connected = await cloudStorageService.getConnectedProviders();
          
          setProviders(allProviders);
          setConnectedProviders(connected);
        } catch (err) {
          setError('Failed to load cloud storage providers');
        }
      };
      
      loadProviders();
    } else {
      setProviders([]);
      setConnectedProviders([]);
    }
  }, [user]);

  // Real-time connection status checking (COMPLETELY DISABLED to prevent interference with uploads)
  useEffect(() => {
    if (!user) {
      return;
    }

    // COMPLETELY DISABLED: All automatic connection checking to prevent interference with uploads
    
    return () => {};
  }, [user]);

  // Manual refresh of connection status
  const refreshConnectionStatus = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Add retry logic for connection issues
      let retries = 0;
      const maxRetries = 2;
      
      while (retries <= maxRetries) {
        try {
          const realTimeConnected = await cloudStorageService.getConnectedProviders();
          setConnectedProviders(realTimeConnected);
          setError(null);
          break; // Success, exit retry loop
        } catch (err) {
          retries++;
          console.error(`Failed to refresh connection status (attempt ${retries}/${maxRetries + 1}):`, err);
          
          if (retries > maxRetries) {
            // Try connection recovery before giving up
            try {
              const recoveryOk = await cloudStorageService.retryConnection(2);
              if (recoveryOk) {
                // Try one more time after recovery
                const realTimeConnected = await cloudStorageService.getConnectedProviders();
                setConnectedProviders(realTimeConnected);
                setError(null);
                return;
              }
            } catch (recoveryError) {
              console.log('Connection recovery failed:', recoveryError);
            }
            
            const errorInfo = cloudStorageService.getConnectionErrorInfo();
            if (errorInfo) {
              setError(`${errorInfo.type}: ${errorInfo.message}. ${errorInfo.suggestion}`);
            } else {
              setError('Failed to refresh connection status after multiple attempts');
            }
            // Set fallback providers to prevent UI from showing empty state
            const fallbackProviders = cloudStorageService.getBasicProviders();
            setConnectedProviders(fallbackProviders);
          } else {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    } catch (err) {
      console.error('Failed to refresh connection status:', err);
      const userFriendlyMessage = cloudStorageService.getUserFriendlyErrorMessage(err);
      setError(userFriendlyMessage);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Auto-retry connection with exponential backoff
  const autoRetryConnection = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const recoveryOk = await cloudStorageService.retryConnection(3);
      if (recoveryOk) {
        // Try to get connected providers after recovery
        const realTimeConnected = await cloudStorageService.getConnectedProviders();
        setConnectedProviders(realTimeConnected);
        setError(null);
      } else {
        setError('Connection recovery failed. Please check your internet connection and try again.');
        // Set fallback providers
        const fallbackProviders = cloudStorageService.getBasicProviders();
        setConnectedProviders(fallbackProviders);
      }
    } catch (err) {
      console.error('Auto-retry connection failed:', err);
      const userFriendlyMessage = cloudStorageService.getUserFriendlyErrorMessage(err);
      setError(userFriendlyMessage);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Connect to a cloud storage provider
  const connectProvider = useCallback(async (providerId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let result;
      
      switch (providerId) {
        case 'google-drive':
          result = await cloudStorageService.connectGoogleDrive();
          break;
        default:
          throw new Error('Unsupported provider');
      }
      
      if (result.success) {
        // Refresh connected providers
        const connected = await cloudStorageService.getConnectedProviders();
        setConnectedProviders(connected);
        return { success: true };
      } else {
        throw new Error(result.error || 'Connection failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Disconnect from a cloud storage provider
  const disconnectProvider = useCallback(async (providerId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await cloudStorageService.disconnectProvider(providerId);
      
      if (result.success) {
        // Refresh connected providers
        const connected = await cloudStorageService.getConnectedProviders();
        setConnectedProviders(connected);
        return { success: true };
      } else {
        throw new Error(result.error || 'Disconnection failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Disconnection failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ===== VIDEO CLIP MANAGEMENT =====
  
  // Upload video clip with better error handling
  const uploadVideoClip = useCallback(async (
    providerId: string, 
    videoFile: File, 
    projectId?: string,
    metadata?: any
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`📤 [useCloudStorage] Starting upload to ${providerId}...`);
      
      // Check if provider needs re-authentication
      const reauthCheck = await cloudStorageService.needsReauthentication(providerId);
      if (reauthCheck.needsReauth) {
        const guidance = cloudStorageService.getConnectionGuidance(providerId, reauthCheck.reason || 'connection_failed');
        setError(`${guidance.title}: ${guidance.message}`);
        
        // Try to automatically handle re-authentication
        if (reauthCheck.reason === 'token_expired' || reauthCheck.reason === 'no_refresh_token') {
          console.log(`🔄 [useCloudStorage] Attempting automatic re-authentication for ${providerId}...`);
          try {
            const reauthResult = await cloudStorageService.forceReauthentication(providerId);
            if (reauthResult.success) {
              console.log(`✅ [useCloudStorage] Re-authentication successful, retrying upload...`);
              // Retry the upload
              return await cloudStorageService.uploadVideoClip(providerId, videoFile, projectId, metadata);
            } else {
              throw new Error(`Re-authentication failed: ${reauthResult.error}`);
            }
          } catch (reauthError) {
            console.error(`❌ [useCloudStorage] Re-authentication failed:`, reauthError);
            throw new Error(`Please manually reconnect to ${providerId} to continue.`);
          }
        }
        
        throw new Error(`Please reconnect to ${providerId} to continue.`);
      }
      
      // Proceed with upload
      const result = await cloudStorageService.uploadVideoClip(providerId, videoFile, projectId, metadata);
      
      if (result.success) {
        console.log(`✅ [useCloudStorage] Upload to ${providerId} successful`);
        // Refresh the connected providers list
        const connected = await cloudStorageService.getConnectedProviders();
        setConnectedProviders(connected);
        return result;
      } else {
        throw new Error(result.error || 'Upload failed');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      console.error(`❌ [useCloudStorage] Upload to ${providerId} failed:`, errorMessage);
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get video clips
  const getVideoClips = useCallback(async (projectId?: string) => {
    try {
      const result = await cloudStorageService.getVideoClips(projectId);
      
      if (result.success) {
        return { success: true, clips: result.clips };
      } else {
        throw new Error(result.error || 'Failed to get video clips');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get video clips';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Download a video clip
  const downloadVideoClip = useCallback(async (clipId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await cloudStorageService.downloadVideoClip(clipId);
      
      if (result.success) {
        return { success: true, file: result.file };
      } else {
        throw new Error(result.error || 'Download failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ===== TRANSCRIPTION MANAGEMENT =====
  
  // Save transcription
  const saveTranscription = useCallback(async (
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
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await cloudStorageService.saveTranscription(clipId, transcription);
      
      if (result.success) {
        return { success: true, transcriptionId: result.transcriptionId };
      } else {
        throw new Error(result.error || 'Failed to save transcription');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save transcription';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get transcription
  const getTranscription = useCallback(async (clipId: string) => {
    try {
      const result = await cloudStorageService.getTranscription(clipId);
      
      if (result.success) {
        return { success: true, transcription: result.transcription };
      } else {
        throw new Error(result.error || 'Failed to get transcription');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get transcription';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // ===== ANALYSIS MANAGEMENT =====
  
  // Save analysis
  const saveAnalysis = useCallback(async (
    clipId: string,
    analysis: {
      viralScore: number;
      highlights: string[];
      tags: string[];
      summary: string;
      aiInsights?: string;
    }
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await cloudStorageService.saveAnalysis(clipId, analysis);
      
      if (result.success) {
        return { success: true, analysisId: result.analysisId };
      } else {
        throw new Error(result.error || 'Failed to save analysis');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save analysis';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get analysis
  const getAnalysis = useCallback(async (clipId: string) => {
    try {
      const result = await cloudStorageService.getAnalysis(clipId);
      
      if (result.success) {
        return { success: true, analysis: result.analysis };
      } else {
        throw new Error(result.error || 'Failed to get analysis');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get analysis';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // ===== PROJECT MANAGEMENT =====
  
  // Get project content
  const getProjectContent = useCallback(async (projectId: string) => {
    try {
      const result = await cloudStorageService.getProjectContent(projectId);
      
      if (result.success) {
        return {
          success: true,
          clips: result.clips,
          transcriptions: result.transcriptions,
          analyses: result.analyses
        };
      } else {
        throw new Error(result.error || 'Failed to get project content');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get project content';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Share project
  const shareProject = useCallback(async (projectId: string, userEmail: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await cloudStorageService.shareProject(projectId, userEmail);
      
      if (result.success) {
        return { success: true };
      } else {
        throw new Error(result.error || 'Failed to share project');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share project';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get shared projects
  const getSharedProjects = useCallback(async () => {
    try {
      const result = await cloudStorageService.getSharedProjects();
      
      if (result.success) {
        return { success: true, projects: result.projects };
      } else {
        throw new Error(result.error || 'Failed to get shared projects');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get shared projects';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // ===== FILE MANAGEMENT =====
  
  // Upload a file to cloud storage
  const uploadFile = useCallback(async (
    providerId: string,
    file: File,
    projectId?: string,
    clipId?: string,
    folderId?: string
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await cloudStorageService.uploadFile(providerId, file, projectId, clipId, folderId);
      
      if (result.success) {
        return { success: true, fileId: result.fileId };
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get files from cloud storage
  const getFiles = useCallback(async (projectId?: string, clipId?: string): Promise<{ success: boolean; files?: CloudStorageFile[]; error?: string }> => {
    try {
      const result = await cloudStorageService.getFiles(projectId, clipId);
      
      if (result.success) {
        return { success: true, files: result.files };
      } else {
        throw new Error(result.error || 'Failed to get files');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get files';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Download a file from cloud storage
  const downloadFile = useCallback(async (
    providerId: string,
    fileId: string
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await cloudStorageService.downloadFile(providerId, fileId);
      
      if (result.success) {
        return { success: true, file: result.file };
      } else {
        throw new Error(result.error || 'Download failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete a file from cloud storage
  const deleteFile = useCallback(async (
    providerId: string,
    fileId: string
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await cloudStorageService.deleteFile(providerId, fileId);
      
      if (result.success) {
        return { success: true };
      } else {
        throw new Error(result.error || 'Delete failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Delete failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get storage usage for a provider
  const getStorageUsage = useCallback(async (providerId: string) => {
    try {
      const result = await cloudStorageService.getStorageUsage(providerId);
      
      if (result.success) {
        return { success: true, usage: result.usage };
      } else {
        throw new Error(result.error || 'Failed to get storage usage');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get storage usage';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Check if a provider is connected
  const isProviderConnected = useCallback(async (providerId: string) => {
    try {
      return await cloudStorageService.isProviderConnected(providerId);
    } catch (err) {
      console.error('Failed to check provider connection:', err);
      return false;
    }
  }, []);

  // Refresh providers
  const refreshProviders = useCallback(async () => {
    if (!user) return;
    
    try {
      const connected = await cloudStorageService.getConnectedProviders();
      setConnectedProviders(connected);
    } catch (err) {
      console.error('Failed to refresh providers:', err);
    }
  }, [user]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Upload transcription with better error handling
  const uploadTranscription = useCallback(async (
    providerId: string, 
    transcriptionText: string,
    fileName: string,
    projectId?: string,
    clipId?: string,
    metadata?: any
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`📝 [useCloudStorage] Starting transcription upload to ${providerId}...`);
      
      // Check if provider needs re-authentication
      const reauthCheck = await cloudStorageService.needsReauthentication(providerId);
      if (reauthCheck.needsReauth) {
        const guidance = cloudStorageService.getConnectionGuidance(providerId, reauthCheck.reason || 'connection_failed');
        setError(`${guidance.title}: ${guidance.message}`);
        
        // Try to automatically handle re-authentication
        if (reauthCheck.reason === 'token_expired' || reauthCheck.reason === 'no_refresh_token') {
          console.log(`🔄 [useCloudStorage] Attempting automatic re-authentication for ${providerId}...`);
          try {
            const reauthResult = await cloudStorageService.forceReauthentication(providerId);
            if (reauthResult.success) {
              console.log(`✅ [useCloudStorage] Re-authentication successful, retrying transcription upload...`);
              // Retry the upload
              return await cloudStorageService.uploadTranscription(providerId, transcriptionText, fileName, projectId, clipId, metadata);
            } else {
              throw new Error(`Re-authentication failed: ${reauthResult.error}`);
            }
          } catch (reauthError) {
            console.error(`❌ [useCloudStorage] Re-authentication failed:`, reauthError);
            throw new Error(`Please manually reconnect to ${providerId} to continue.`);
          }
        }
        
        throw new Error(`Please reconnect to ${providerId} to continue.`);
      }
      
      // Proceed with transcription upload
      const result = await cloudStorageService.uploadTranscription(providerId, transcriptionText, fileName, projectId, clipId, metadata);
      
      if (result.success) {
        console.log(`✅ [useCloudStorage] Transcription upload to ${providerId} successful`);
        // Refresh the connected providers list
        const connected = await cloudStorageService.getConnectedProviders();
        setConnectedProviders(connected);
        return result;
      } else {
        throw new Error(result.error || 'Transcription upload failed');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transcription upload failed';
      console.error(`❌ [useCloudStorage] Transcription upload to ${providerId} failed:`, errorMessage);
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Upload full video transcription
  const uploadFullVideoTranscription = useCallback(async (
    providerId: string,
    transcriptionText: string,
    projectId: string,
    metadata?: any
  ) => {
    return await cloudStorageService.uploadFullVideoTranscription(providerId, transcriptionText, projectId, metadata);
  }, []);

  // Upload individual clip transcription
  const uploadClipTranscription = useCallback(async (
    providerId: string,
    transcriptionText: string,
    projectId: string,
    clipId: string,
    metadata?: any
  ) => {
    return await cloudStorageService.uploadClipTranscription(providerId, transcriptionText, projectId, clipId, metadata);
  }, []);

  // Upload analysis to cloud storage
  const uploadAnalysis = useCallback(async (
    providerId: string,
    analysisData: any,
    filename: string,
    projectId?: string,
    clipId?: string,
    folderId?: string
  ) => {
    try {
      console.log('📊 [useCloudStorage] Uploading analysis...');
      throw new Error('Analysis upload temporarily disabled - debugging in progress');
    } catch (error) {
      console.error('❌ [useCloudStorage] Analysis upload error:', error);
      throw error;
    }
  }, []);

  // Download transcription from cloud storage
  const downloadTranscription = useCallback(async (
    providerId: string,
    fileId: string
  ) => {
    try {
      console.log('📥 [useCloudStorage] Downloading transcription...');
      throw new Error('Transcription download temporarily disabled - debugging in progress');
    } catch (error) {
      console.error('❌ [useCloudStorage] Transcription download error:', error);
      throw error;
    }
  }, []);

  // Download analysis from cloud storage
  const downloadAnalysis = useCallback(async (
    providerId: string,
    fileId: string
  ) => {
    try {
      console.log('📥 [useCloudStorage] Downloading analysis...');
      throw new Error('Analysis download temporarily disabled - debugging in progress');
    } catch (error) {
      console.error('❌ [useCloudStorage] Analysis download error:', error);
      throw error;
    }
  }, []);

  // Force re-authentication for a provider
  const forceReauthentication = useCallback(async (providerId: string) => {
    try {
      console.log(`🔄 [useCloudStorage] Forcing re-authentication for ${providerId}...`);
      
      // Check if method exists
      if (!cloudStorageService.forceReauthentication) {
        console.error('❌ [useCloudStorage] forceReauthentication method not found on cloudStorageService');
        throw new Error('forceReauthentication method not available');
      }
      
      const result = await cloudStorageService.forceReauthentication(providerId);
      
      if (result.success) {
        console.log(`✅ [useCloudStorage] Re-authentication successful for ${providerId}`);
        // Refresh the connection status
        await refreshConnectionStatus();
      } else {
        console.error(`❌ [useCloudStorage] Re-authentication failed for ${providerId}:`, result.error);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ [useCloudStorage] Re-authentication error for ${providerId}:`, error);
      throw error;
    }
  }, [refreshConnectionStatus]);

  // Handle re-authentication for a provider
  const handleReauthentication = useCallback(async (providerId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`🔄 [useCloudStorage] Handling re-authentication for ${providerId}...`);
      
      const result = await cloudStorageService.forceReauthentication(providerId);
      
      if (result.success) {
        console.log(`✅ [useCloudStorage] Re-authentication successful for ${providerId}`);
        // Refresh the connected providers list
        const connected = await cloudStorageService.getConnectedProviders();
        setConnectedProviders(connected);
        return { success: true };
      } else {
        const errorMessage = result.error || 'Re-authentication failed';
        console.error(`❌ [useCloudStorage] Re-authentication failed for ${providerId}:`, errorMessage);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Re-authentication failed';
      console.error(`❌ [useCloudStorage] Re-authentication error for ${providerId}:`, errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get connection guidance for a provider
  const getConnectionGuidance = useCallback((providerId: string, issue: string) => {
    return cloudStorageService.getConnectionGuidance(providerId, issue);
  }, []);

  // Check if a provider needs re-authentication
  const checkReauthenticationNeeds = useCallback(async (providerId: string) => {
    try {
      return await cloudStorageService.needsReauthentication(providerId);
    } catch (error) {
      console.error(`❌ [useCloudStorage] Error checking re-authentication needs for ${providerId}:`, error);
      return { needsReauth: true, reason: 'Error checking connection status' };
    }
  }, []);

  // Smart connection validation methods
  const validateAndEnsureConnection = useCallback(async (providerId: string) => {
    if (!cloudStorageService.validateAndEnsureConnection) {
      console.error('❌ [useCloudStorage] validateAndEnsureConnection method not found on cloudStorageService');
      throw new Error('validateAndEnsureConnection method not available');
    }
    return await cloudStorageService.validateAndEnsureConnection(providerId);
  }, []);

  const preflightCheck = useCallback(async (providerId: string) => {
    if (!cloudStorageService.preflightCheck) {
      console.error('❌ [useCloudStorage] preflightCheck method not found on cloudStorageService');
      throw new Error('preflightCheck method not available');
    }
    return await cloudStorageService.preflightCheck(providerId);
  }, []);

  // Auto-connection check when component mounts (disabled to reduce redundant checks)
  useEffect(() => {
    if (user?.id && cloudStorageService.setCurrentUser) {
      cloudStorageService.setCurrentUser(user.id);
      
      // Skip automatic connection check to reduce redundant operations
      console.log('🔍 [useCloudStorage] User set, skipping automatic connection check');
    }
  }, [user?.id]);

  // Check all cloud storage connections and auto-reconnect if needed
  const checkCloudStorageConnections = useCallback(async () => {
    if (!user?.id) return;

    try {
      console.log('🔍 [useCloudStorage] Checking cloud storage connections...');
      
      // Get connected providers
      const providers = await cloudStorageService.getConnectedProviders();
      
      for (const provider of providers) {
        if (provider.isConnected) {
          console.log(`🔍 [useCloudStorage] Validating connection for ${provider.id}...`);
          
          try {
            const validation = await validateAndEnsureConnection(provider.id);
            
            if (!validation.isValid && validation.needsReauth) {
              console.log(`⚠️ [useCloudStorage] ${provider.id} needs re-authentication`);
              // Don't auto-reconnect here, just log the issue
              // User will be prompted when they try to use it
            } else if (!validation.isValid) {
              console.log(`❌ [useCloudStorage] ${provider.id} connection invalid: ${validation.error}`);
            } else {
              console.log(`✅ [useCloudStorage] ${provider.id} connection validated`);
            }
          } catch (error) {
            console.error(`❌ [useCloudStorage] Error validating ${provider.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('❌ [useCloudStorage] Error checking cloud storage connections:', error);
    }
  }, [user?.id, validateAndEnsureConnection]);

  // Debug: Log available methods on cloudStorageService
  useEffect(() => {
    console.log('🔍 [useCloudStorage] Available methods on cloudStorageService:', {
      uploadFile: typeof cloudStorageService.uploadFile,
      isProviderConnected: typeof cloudStorageService.isProviderConnected,
      forceReauthentication: typeof cloudStorageService.forceReauthentication
    });
  }, []);

  return {
    // Connection management
    connectedProviders,
    isLoading,
    error,
    refreshConnectionStatus,
    autoRetryConnection,
    forceReauthentication,
    handleReauthentication,
    getConnectionGuidance,
    checkReauthenticationNeeds,
    
    // File management
    uploadFile,
    uploadVideoClip,
    uploadTranscription,
    uploadFullVideoTranscription,
    uploadClipTranscription,
    uploadAnalysis,
    
    // Provider management
    connectGoogleDrive: cloudStorageService.connectGoogleDrive.bind(cloudStorageService),
    disconnectProvider: cloudStorageService.disconnectProvider.bind(cloudStorageService),
    
    // Utility methods
    isProviderConnected,
    getConnectedProviders: cloudStorageService.getConnectedProviders.bind(cloudStorageService),
    getConnectionStatus: cloudStorageService.getProvidersConnectionStatus.bind(cloudStorageService),
    clearError,
    
    // Video streaming methods
    getVideoStreamingUrl: cloudStorageService.getVideoStreamingUrl.bind(cloudStorageService),
    createGoogleDriveBlobUrl: cloudStorageService.createGoogleDriveBlobUrl.bind(cloudStorageService),
    uploadVideoToCloud: cloudStorageService.uploadVideoToCloud.bind(cloudStorageService)
  };
};
