import { ProcessingOptions } from './aiProcessor';

export interface PersistentJob {
  id: string;
  user_id: string;
  project_name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  current_stage: string;
  file_path: string;
  output_path?: string;
  clips_generated: number;
  transcription?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  processing_options: string;
}

export interface JobStage {
  id: number;
  job_id: string;
  stage_name: string;
  status: 'pending' | 'processing' | 'completed';
  progress: number;
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface JobStatus {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  current_stage: string;
  stages: JobStage[];
  clips_generated: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface JobResults {
  job_id: string;
  user_id: string;
  project_name: string;
  total_segments: number;
  selected_clips: number;
  clips_generated: number;
  clips: string[];
  full_transcript: string;
  processing_options: ProcessingOptions;
  generation_timestamp: string;
}

export interface StartProcessingRequest {
  userId: string;
  projectName: string;
  sourceType: 'file' | 'url' | 'text';
  videoFile?: string; // base64 data
  sourceUrl?: string;
  sourceText?: string;
  processingOptions: ProcessingOptions;
  targetPlatforms: string[];
  aiPrompt?: string;
  description?: string;
}

export interface StartProcessingResponse {
  success: boolean;
  job_id: string;
  message: string;
  status_url: string;
}

class PersistentProcessingService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'http://localhost:5000/api/frontend';
  }

  /**
   * Start persistent processing that continues in background
   */
  async startProcessing(request: StartProcessingRequest): Promise<StartProcessingResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/start-persistent-processing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start processing');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to start persistent processing:', error);
      throw error;
    }
  }

  /**
   * Get current status of a processing job
   */
  async getJobStatus(jobId: string): Promise<JobStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/job-status/${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get job status');
      }

      const data = await response.json();
      return data.status;
    } catch (error) {
      console.error('Failed to get job status:', error);
      throw error;
    }
  }

  /**
   * Get all jobs for a specific user
   */
  async getUserJobs(userId: string): Promise<PersistentJob[]> {
    try {
      const response = await fetch(`${this.baseUrl}/user-jobs/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get user jobs');
      }

      const data = await response.json();
      return data.jobs;
    } catch (error) {
      console.error('Failed to get user jobs:', error);
      throw error;
    }
  }

  /**
   * Get results of a completed job
   */
  async getJobResults(jobId: string): Promise<JobResults> {
    try {
      const response = await fetch(`${this.baseUrl}/job-results/${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get job results');
      }

      const data = await response.json();
      return data.results;
    } catch (error) {
      console.error('Failed to get job results:', error);
      throw error;
    }
  }

  /**
   * Poll job status until completion
   */
  async pollJobStatus(jobId: string, onProgress?: (status: JobStatus) => void): Promise<JobStatus> {
    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        try {
          const status = await this.getJobStatus(jobId);
          
          if (onProgress) {
            onProgress(status);
          }

          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(pollInterval);
            resolve(status);
          }
        } catch (error) {
          clearInterval(pollInterval);
          reject(error);
        }
      }, 2000); // Poll every 2 seconds

      // Set a timeout to prevent infinite polling
      setTimeout(() => {
        clearInterval(pollInterval);
        reject(new Error('Job status polling timeout'));
      }, 300000); // 5 minutes timeout
    });
  }

  /**
   * Convert file to base64 for upload
   */
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsDataURL(file);
    });
  }
}

export const persistentProcessingService = new PersistentProcessingService();
export default persistentProcessingService;
