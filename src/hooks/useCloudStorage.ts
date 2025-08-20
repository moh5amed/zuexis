import { useState, useEffect, useCallback } from 'react';
import { cloudStorageService, CloudStorageProvider, VideoClip, TranscriptionData, AnalysisData } from '../services/cloudStorageService';
import { useAuth } from '../contexts/AuthContext';

export const useCloudStorage = () => {
  const { user } = useAuth();
  const [providers, setProviders] = useState<CloudStorageProvider[]>([]);
  const [connectedProviders, setConnectedProviders] = useState<CloudStorageProvider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load providers and check connections on mount
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
          console.error('Failed to load providers:', err);
          setError('Failed to load cloud storage providers');
        }
      };
      
      loadProviders();
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
        case 'one-drive':
          result = await cloudStorageService.connectOneDrive();
          break;
        case 'dropbox':
          result = await cloudStorageService.connectDropbox();
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
  
  // Upload a video clip
  const uploadVideoClip = useCallback(async (
    providerId: string,
    videoFile: File,
    projectId?: string,
    metadata?: {
      duration?: number;
      resolution?: string;
      description?: string;
    }
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await cloudStorageService.uploadVideoClip(providerId, videoFile, projectId, metadata);
      
      if (result.success) {
        return { success: true, clipId: result.clipId };
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

  return {
    // State
    providers,
    connectedProviders,
    isLoading,
    error,
    
    // Provider management
    connectProvider,
    disconnectProvider,
    isProviderConnected,
    refreshProviders,
    
    // Video clip management
    uploadVideoClip,
    getVideoClips,
    downloadVideoClip,
    
    // Transcription management
    saveTranscription,
    getTranscription,
    
    // Analysis management
    saveAnalysis,
    getAnalysis,
    
    // Project management
    getProjectContent,
    shareProject,
    getSharedProjects,
    
    // Utility
    clearError
  };
};
