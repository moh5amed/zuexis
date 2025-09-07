import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import persistentProcessingService, {
  StartProcessingRequest,
  JobStatus,
  PersistentJob,
  JobResults
} from '../services/persistentProcessingService';
import { ProcessingOptions } from '../services/aiProcessor';

export interface UsePersistentProcessingReturn {
  // State
  isProcessing: boolean;
  currentJobId: string | null;
  currentJobStatus: JobStatus | null;
  userJobs: PersistentJob[];
  error: string | null;
  
  // Actions
  startProcessing: (request: Omit<StartProcessingRequest, 'userId'>) => Promise<string>;
  getJobStatus: (jobId: string) => Promise<JobStatus>;
  getUserJobs: () => Promise<void>;
  getJobResults: (jobId: string) => Promise<JobResults>;
  pollJobStatus: (jobId: string, onProgress?: (status: JobStatus) => void) => Promise<JobStatus>;
  
  // Utilities
  clearError: () => void;
  resetCurrentJob: () => void;
}

export const usePersistentProcessing = (): UsePersistentProcessingReturn => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [currentJobStatus, setCurrentJobStatus] = useState<JobStatus | null>(null);
  const [userJobs, setUserJobs] = useState<PersistentJob[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Reset current job
  const resetCurrentJob = useCallback(() => {
    setCurrentJobId(null);
    setCurrentJobStatus(null);
    setIsProcessing(false);
  }, []);

  // Start persistent processing
  const startProcessing = useCallback(async (
    request: Omit<StartProcessingRequest, 'userId'>
  ): Promise<string> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      setIsProcessing(true);
      setError(null);

      const fullRequest: StartProcessingRequest = {
        ...request,
        userId: user.id
      };

      const response = await persistentProcessingService.startProcessing(fullRequest);
      const jobId = response.job_id;
      
      setCurrentJobId(jobId);
      
      // Start polling for status updates
      pollJobStatus(jobId, (status) => {
        setCurrentJobStatus(status);
        if (status.status === 'completed' || status.status === 'failed') {
          setIsProcessing(false);
        }
      });

      return jobId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start processing';
      setError(errorMessage);
      setIsProcessing(false);
      throw err;
    }
  }, [user?.id]);

  // Get job status
  const getJobStatus = useCallback(async (jobId: string): Promise<JobStatus> => {
    try {
      const status = await persistentProcessingService.getJobStatus(jobId);
      setCurrentJobStatus(status);
      return status;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get job status';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Get user jobs
  const getUserJobs = useCallback(async () => {
    if (!user?.id) return;

    try {
      const jobs = await persistentProcessingService.getUserJobs(user.id);
      setUserJobs(jobs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get user jobs';
      setError(errorMessage);
    }
  }, [user?.id]);

  // Get job results
  const getJobResults = useCallback(async (jobId: string): Promise<JobResults> => {
    try {
      return await persistentProcessingService.getJobResults(jobId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get job results';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Poll job status
  const pollJobStatus = useCallback(async (
    jobId: string, 
    onProgress?: (status: JobStatus) => void
  ): Promise<JobStatus> => {
    try {
      return await persistentProcessingService.pollJobStatus(jobId, onProgress);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Job status polling failed';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Load user jobs on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      getUserJobs();
    }
  }, [user?.id, getUserJobs]);

  // Auto-refresh user jobs every 30 seconds when user is authenticated
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      getUserJobs();
    }, 30000);

    return () => clearInterval(interval);
  }, [user?.id, getUserJobs]);

  return {
    // State
    isProcessing,
    currentJobId,
    currentJobStatus,
    userJobs,
    error,
    
    // Actions
    startProcessing,
    getJobStatus,
    getUserJobs,
    getJobResults,
    pollJobStatus,
    
    // Utilities
    clearError,
    resetCurrentJob
  };
};
