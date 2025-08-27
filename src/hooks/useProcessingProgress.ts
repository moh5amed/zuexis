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
      console.log('🎉 [useProcessingProgress] Processing completed successfully!');
      console.log(newProgress.getProcessingSummary?.() || 'Processing summary not available');
    } else if (newProgress.status === 'failed') {
      console.error('❌ [useProcessingProgress] Processing failed!');
    }
  }, []);

  // Start processing
  const startProcessing = useCallback(async (projectId: string, options: any) => {
    try {
      console.log('🚀 [useProcessingProgress] Starting video processing...');
      console.log(`🎯 [useProcessingProgress] Project ID: ${projectId}`);
      console.log(`⚙️ [useProcessingProgress] Options:`, JSON.stringify(options, null, 2));
      
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
        console.log('✅ [useProcessingProgress] Processing completed successfully');
        console.log(`📊 [useProcessingProgress] Generated ${result.clips.length} clips`);
        console.log(`⏱️ [useProcessingProgress] Processing time: ${result.processingTime}ms`);
        
        // Update progress to completed
        setProgress(prev => prev ? {
          ...prev,
          status: 'completed',
          overallProgress: 100,
          currentStage: 'Completed',
          currentStageProgress: 100
        } : null);
      } else {
        console.error('❌ [useProcessingProgress] Processing failed:', result.error);
        setProgress(prev => prev ? {
          ...prev,
          status: 'failed',
          currentStage: 'Failed',
          currentStageProgress: 0
        } : null);
      }
      
    } catch (error) {
      console.error('❌ [useProcessingProgress] Error during processing:', error);
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
    console.log('⏸️ [useProcessingProgress] Pausing processing...');
    setProgress(prev => prev ? {
      ...prev,
      status: 'paused'
    } : null);
  }, []);

  // Resume processing
  const resumeProcessing = useCallback(() => {
    console.log('▶️ [useProcessingProgress] Resuming processing...');
    setProgress(prev => prev ? {
      ...prev,
      status: 'processing'
    } : null);
  }, []);

  // Cancel processing
  const cancelProcessing = useCallback(() => {
    console.log('⏹️ [useProcessingProgress] Cancelling processing...');
    if (currentProjectId) {
      // Note: In a real implementation, you'd want to actually cancel the processing
      console.log(`⏹️ [useProcessingProgress] Cancelled processing for project: ${currentProjectId}`);
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
        console.log('🧹 [useProcessingProgress] Cleaning up processing on unmount');
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
