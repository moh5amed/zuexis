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

      const connected = await pythonBackendService.testConnection();
      
      if (connected) {
        setIsConnected(true);
        setConnectionStatus('connected');

      } else {
        setIsConnected(false);
        setConnectionStatus('error');

      }
      
      return connected;
    } catch (error) {

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

        const connected = await testConnection();
        if (!connected) {
          throw new Error('Python backend not connected');
        }
      }

      setIsProcessing(true);


      // Log detailed information about the data being sent





      if (projectData.videoFile && projectData.videoFile instanceof File) {

      }




      const result = await pythonBackendService.processVideoProject(projectData);

      if (result.success && result.data) {


        return result.data;
      } else {

        throw new Error(result.error || 'Video processing failed');
      }
    } catch (error) {

      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [isConnected, testConnection]);

  const getLatestClips = useCallback(async (): Promise<PythonBackendProcessingResult | null> => {
    try {

      const result = await pythonBackendService.getLatestClips();
      
      if (result.success && result.data) {

        return result.data;
      } else {

        setLastError(result.error || 'Failed to retrieve latest clips');
        return null;
      }
    } catch (error) {

      setLastError(error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }, []);

  const getTestVideoData = useCallback(async (): Promise<PythonBackendProcessingResult | null> => {
    try {

      const result = await pythonBackendService.getTestVideoData();
      
      if (result.success && result.data) {

        return result.data;
      } else {

        setLastError(result.error || 'Failed to retrieve test video data');
        return null;
      }
    } catch (error) {

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
