import { useState, useEffect, useCallback } from 'react';
import { ProcessingProgress, ProcessingStage } from '../services/aiProcessor';
import { aiProcessorService } from '../services/aiProcessor';
import { localStorageService } from '../services/localStorage';

interface UseProcessingProgressReturn {
  progress: ProcessingProgress | null;
  isProcessing: boolean;
  startProcessing: (projectId: string, options: any) => Promise<void>;
  pauseProcessing: () => void;
  resumeProcessing: () => void;
  cancelProcessing: () => void;
  getProcessingStatus: () => string;
}

export const useProcessingProgress = (): UseProcessingProgressReturn => {
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // Progress update callback
  const handleProgressUpdate = useCallback((newProgress: ProcessingProgress) => {
    setProgress(newProgress);
    
    // Log detailed progress to console for developers
    if (newProgress.status === 'completed') {
    } else if (newProgress.status === 'failed') {
    }
  }, []);

  // Start processing
  const startProcessing = useCallback(async (projectId: string, options: any) => {
    try {
      setIsProcessing(true);
      setCurrentProjectId(projectId);
      
      // Initialize progress tracking
      const initialProgress: ProcessingProgress = {
        overallProgress: 0,
        currentStage: 'Initializing',
        currentStageProgress: 0,
        stages: [],
        estimatedTimeRemaining: 0,
        startTime: Date.now(),
        elapsedTime: 0,
        status: 'initializing',
        performanceMetrics: {
          cacheHits: 0,
          cacheMisses: 0,
          parallelTasks: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          networkLatency: 0
        },
        debugInfo: {
          currentOperation: 'Initializing processing pipeline',
          activeThreads: 0,
          queueLength: 0,
          resourceStatus: 'Initializing',
          optimizationFlags: []
        }
      };
      
      setProgress(initialProgress);
      
      // Get the project object first
      const project = await localStorageService.getProject(projectId);
      if (!project) {
        throw new Error(`Project not found with ID: ${projectId}`);
      }
      
      // Start the actual processing
      const result = await aiProcessorService.processProject(project, options);
      
      if (result.success) {
        // Update progress to completed
        setProgress(prev => prev ? {
          ...prev,
          status: 'completed',
          overallProgress: 100,
          currentStage: 'Completed',
          currentStageProgress: 100
        } : null);
      } else {
        setProgress(prev => prev ? {
          ...prev,
          status: 'failed',
          currentStage: 'Failed',
          currentStageProgress: 0
        } : null);
      }
      
    } catch (error) {
      setProgress(prev => prev ? {
        ...prev,
        status: 'failed',
        currentStage: 'Error',
        currentStageProgress: 0
      } : null);
    } finally {
      setIsProcessing(false);
      setCurrentProjectId(null);
    }
  }, []);

  // Pause processing
  const pauseProcessing = useCallback(() => {
    setProgress(prev => prev ? {
      ...prev,
      status: 'paused'
    } : null);
  }, []);

  // Resume processing
  const resumeProcessing = useCallback(() => {
    setProgress(prev => prev ? {
      ...prev,
      status: 'processing'
    } : null);
  }, []);

  // Cancel processing
  const cancelProcessing = useCallback(() => {
    if (currentProjectId) {
      // Note: In a real implementation, you'd want to actually cancel the processing
    }
    
    setProgress(prev => prev ? {
      ...prev,
      status: 'failed',
      currentStage: 'Cancelled',
      currentStageProgress: 0
    } : null);
    
    setIsProcessing(false);
    setCurrentProjectId(null);
  }, [currentProjectId]);

  // Get processing status
  const getProcessingStatus = useCallback(() => {
    if (!progress) return 'idle';
    return progress.status;
  }, [progress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isProcessing) {
      }
    };
  }, [isProcessing]);

  return {
    progress,
    isProcessing,
    startProcessing,
    pauseProcessing,
    resumeProcessing,
    cancelProcessing,
    getProcessingStatus
  };
};
