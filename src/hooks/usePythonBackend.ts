import { useState, useCallback } from 'react';
import { pythonBackendService, PythonBackendProcessingResult } from '../services/pythonBackendService';
import { ProcessingOptions } from '../services/aiProcessor';

interface UsePythonBackendReturn {
  isConnected: boolean;
  isProcessing: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastError: string | null;
  testConnection: () => Promise<boolean>;
  processVideo: (projectData: {
    projectName: string;
    description: string;
    sourceType: 'file' | 'url' | 'text';
    videoFile?: File | string;
    sourceUrl?: string;
    sourceText?: string;
    targetPlatforms: string[];
    aiPrompt: string;
    processingOptions: ProcessingOptions;
    numClips?: number;
  }) => Promise<PythonBackendProcessingResult | null>;
  getLatestClips: () => Promise<PythonBackendProcessingResult | null>;
  getTestVideoData: () => Promise<PythonBackendProcessingResult | null>;
  getConnectionStatus: () => boolean;
}

export const usePythonBackend = (): UsePythonBackendReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);

  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      setConnectionStatus('connecting');
      console.log('🔌 [usePythonBackend] Testing connection to Python backend...');
      
      const connected = await pythonBackendService.testConnection();
      
      if (connected) {
        setIsConnected(true);
        setConnectionStatus('connected');
        console.log('✅ [usePythonBackend] Python backend connected successfully');
      } else {
        setIsConnected(false);
        setConnectionStatus('error');
        console.error('❌ [usePythonBackend] Python backend connection failed');
      }
      
      return connected;
    } catch (error) {
      console.error('❌ [usePythonBackend] Connection test error:', error);
      setIsConnected(false);
      setConnectionStatus('error');
      return false;
    }
  }, []);

  const processVideo = useCallback(async (projectData: {
    projectName: string;
    description: string;
    sourceType: 'file' | 'url' | 'text';
    videoFile?: File | string;
    sourceUrl?: string;
    sourceText?: string;
    targetPlatforms: string[];
    aiPrompt: string;
    processingOptions: ProcessingOptions;
    numClips?: number;
  }): Promise<PythonBackendProcessingResult | null> => {
    try {
      if (!isConnected) {
        console.log('🔌 [usePythonBackend] Testing connection before processing...');
        const connected = await testConnection();
        if (!connected) {
          throw new Error('Python backend not connected');
        }
      }

      setIsProcessing(true);
      console.log('🎥 [usePythonBackend] Starting video processing with Python backend...');
      console.log('📊 [usePythonBackend] Project data:', projectData);
      
      // Log detailed information about the data being sent
      console.log('🔍 [usePythonBackend] DETAILED DATA ANALYSIS:');
      console.log('   - Project Name Type:', typeof projectData.projectName, 'Value:', projectData.projectName);
      console.log('   - Description Type:', typeof projectData.description, 'Value:', projectData.description);
      console.log('   - Source Type Type:', typeof projectData.sourceType, 'Value:', projectData.sourceType);
      console.log('   - Video File Type:', typeof projectData.videoFile, 'Value:', projectData.videoFile);
      if (projectData.videoFile && projectData.videoFile instanceof File) {
        console.log('   - Video File Details:', {
          name: projectData.videoFile.name,
          size: `${(projectData.videoFile.size / (1024 * 1024)).toFixed(2)} MB`,
          type: projectData.videoFile.type,
          lastModified: new Date(projectData.videoFile.lastModified).toISOString()
        });
      }
      console.log('   - Target Platforms Type:', typeof projectData.targetPlatforms, 'Value:', projectData.targetPlatforms);
      console.log('   - AI Prompt Type:', typeof projectData.aiPrompt, 'Value:', projectData.aiPrompt);
      console.log('   - Processing Options Type:', typeof projectData.processingOptions, 'Value:', projectData.processingOptions);
      console.log('   - Number of Clips Type:', typeof projectData.numClips, 'Value:', projectData.numClips);

      const result = await pythonBackendService.processVideoProject(projectData);

      if (result.success && result.data) {
        console.log('✅ [usePythonBackend] Video processing completed successfully');
        console.log(`📊 [usePythonBackend] Generated ${result.data.clipsGenerated} clips`);
        return result.data;
      } else {
        console.error('❌ [usePythonBackend] Video processing failed:', result.error);
        throw new Error(result.error || 'Video processing failed');
      }
    } catch (error) {
      console.error('❌ [usePythonBackend] Video processing error:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [isConnected, testConnection]);

  const getLatestClips = useCallback(async (): Promise<PythonBackendProcessingResult | null> => {
    try {
      console.log('🔄 [usePythonBackend] Retrieving latest clips from backend...');
      const result = await pythonBackendService.getLatestClips();
      
      if (result.success && result.data) {
        console.log('✅ [usePythonBackend] Retrieved latest clips successfully');
        return result.data;
      } else {
        console.error('❌ [usePythonBackend] Failed to retrieve latest clips:', result.error);
        setLastError(result.error || 'Failed to retrieve latest clips');
        return null;
      }
    } catch (error) {
      console.error('❌ [usePythonBackend] Error retrieving latest clips:', error);
      setLastError(error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }, []);

  const getTestVideoData = useCallback(async (): Promise<PythonBackendProcessingResult | null> => {
    try {
      console.log('🧪 [usePythonBackend] Getting test video data from backend...');
      const result = await pythonBackendService.getTestVideoData();
      
      if (result.success && result.data) {
        console.log('✅ [usePythonBackend] Retrieved test video data successfully');
        return result.data;
      } else {
        console.error('❌ [usePythonBackend] Failed to retrieve test video data:', result.error);
        setLastError(result.error || 'Failed to retrieve test video data');
        return null;
      }
    } catch (error) {
      console.error('❌ [usePythonBackend] Error retrieving test video data:', error);
      setLastError(error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }, []);

  const getConnectionStatus = useCallback((): boolean => {
    return pythonBackendService.getConnectionStatus();
  }, []);

  return {
    isConnected,
    isProcessing,
    connectionStatus,
    lastError,
    testConnection,
    processVideo,
    getLatestClips,
    getTestVideoData,
    getConnectionStatus
  };
};
