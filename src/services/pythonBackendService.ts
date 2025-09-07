// 🐍 Python Backend Integration Service
// Handles communication with the Python Flask backend for video processing and AI analysis

import ChunkedUploadService from './chunkedUploadService';

export interface PythonBackendConfig {
  baseUrl: string;
  timeout: number;
  maxRetries: number;
}

export interface PythonBackendResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PythonBackendClip {
  id: string;
  clip_number: number;
  filename: string;
  filepath: string;
  start_time: number;
  end_time: number;
  duration: number;
  viral_score: number;
  content_type: string;
  caption: string;
  hashtags: string[];
  target_audience: string;
  platforms: string[];
  segment_text: string;
  viral_potential: number;
  engagement: number;
  story_value: number;
  audio_impact: number;
  videoData?: string; // Base64 encoded video data for frontend display
}

export interface PythonBackendProcessingResult {
  success: boolean;
  projectName: string;
  clipsGenerated: number;
  clips: PythonBackendClip[];
  transcription?: string; // Legacy field for backward compatibility
  fullVideoTranscription?: string; // Full video transcription text
  message: string;
}

class PythonBackendService {
  private config: PythonBackendConfig;
  private isConnected: boolean = false;

  constructor(config: PythonBackendConfig = {
    baseUrl: import.meta.env.VITE_PYTHON_BACKEND_URL || 'https://zuexisbacckend.onrender.com',
    timeout: 600000, // Increased to 10 minutes for large video uploads
    maxRetries: 3
  }) {
    this.config = config;
  }

  async testConnection(): Promise<boolean> {
    try {


      const response = await this.makeRequest('/api/frontend/status', 'GET');

      this.isConnected = response.success;
      return response.success;
    } catch (error) {


      this.isConnected = false;
      return false;
    }
  }

  async processVideoProject(projectData: {
    projectName: string;
    description: string;
    sourceType: 'file' | 'url' | 'text';
    videoFile?: File | string;
    sourceUrl?: string;
    sourceText?: string;
    targetPlatforms: string[];
    aiPrompt: string;
    processingOptions: any;
    numClips?: number;
  }): Promise<PythonBackendResponse<PythonBackendProcessingResult>> {
    try {
      if (!(await this.testConnection())) {
        throw new Error('Python backend not connected');
      }

      // Log detailed information about the data being sent





      if (projectData.videoFile && projectData.videoFile instanceof File) {

      }




      const payload: any = {
        projectName: projectData.projectName,
        description: projectData.description,
        sourceType: projectData.sourceType,
        targetPlatforms: projectData.targetPlatforms,
        aiPrompt: projectData.aiPrompt,
        processingOptions: projectData.processingOptions,
        numClips: projectData.numClips || 3
      };

      if (projectData.sourceType === 'file' && projectData.videoFile) {
        if (projectData.videoFile instanceof File) {
          // Check if file is large enough to warrant chunked upload
          if (projectData.videoFile.size > 10 * 1024 * 1024) { // 10MB threshold


            // Use chunked upload for large files
            const chunkedUploadService = new ChunkedUploadService(this.config.baseUrl);
            const uploadResult = await chunkedUploadService.uploadVideoInChunks(projectData.videoFile, projectData);
            
            if (uploadResult.success) {

              return {
                success: true,
                data: {
                  projectName: projectData.projectName,
                  clipsGenerated: 0,
                  clips: [],
                  message: 'Video uploaded successfully via chunked upload. Processing will begin shortly.'
                }
              };
            } else {

              throw new Error(`Chunked upload failed: ${uploadResult.error}`);
            }
          } else {
            // Use regular FormData for smaller files

            payload.videoFile = projectData.videoFile; // Keep as File object
          }
        } else {
          payload.videoFile = projectData.videoFile;
        }
      } else if (projectData.sourceType === 'url' && projectData.sourceUrl) {
        payload.sourceUrl = projectData.sourceUrl;
      } else if (projectData.sourceType === 'text' && projectData.sourceText) {
        payload.sourceText = projectData.sourceText;
      }

      // Log the final payload being sent to the backend



      // Check if we can serialize the payload to JSON (for logging purposes)
      try {
        const jsonPayload = JSON.stringify(payload);

      } catch (jsonError) {


      }
      
      if (payload.videoFile) {
        if (payload.videoFile instanceof File) {

        } else if (typeof payload.videoFile === 'string') {

        } else {

        }
      }



      // Get payload size safely
      if (payload.videoFile instanceof File) {


      } else {
        try {
          const jsonSize = JSON.stringify(payload).length;

        } catch (jsonError) {

        }
      }


      const response = await this.makeRequest<PythonBackendProcessingResult>(
        '/api/frontend/process-project',
        'POST',
        payload
      );

      return response;
    } catch (error) {


      // Provide more specific error messages
      let errorMessage = 'Unknown error';
      
      if (error instanceof Error) {
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
          errorMessage = 'Backend server is not running. Please start the Python backend server.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. The video might be too large or the backend is overloaded.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('not connected')) {
          errorMessage = 'Python backend not connected. Please start the backend server.';
        } else {
          errorMessage = error.message;
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private async makeRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' = 'GET', 
    data?: any
  ): Promise<PythonBackendResponse<T>> {
    try {
      const url = `${this.config.baseUrl}${endpoint}`;
      
      // Create a more robust timeout mechanism
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {

        controller.abort();
      }, this.config.timeout);


      const options: RequestInit = {
        method,
        signal: controller.signal
      };

      if (data && method === 'POST') {
        // Check if this is a video processing request with video files
        if (endpoint === '/api/frontend/process-project' && data.videoFile && data.videoFile instanceof File) {

          // Always use FormData for video files - it's much more efficient than base64
          const formData = new FormData();

          // Add all text fields
          formData.append('projectName', data.projectName);
          formData.append('description', data.description);
          formData.append('sourceType', data.sourceType);
          formData.append('targetPlatforms', JSON.stringify(data.targetPlatforms));
          formData.append('aiPrompt', data.aiPrompt);
          formData.append('processingOptions', JSON.stringify(data.processingOptions));
          formData.append('numClips', data.numClips?.toString() || '3');

          // Add the video file directly
          formData.append('videoFile', data.videoFile);

          const entries = Array.from(formData.entries());

          for (const [key, value] of entries) {
            if (value instanceof File) {

            } else {

            }
          }

          options.body = formData;
          
          // Test FormData validity
          try {

            const testEntries = Array.from(formData.entries());

          } catch (formDataError) {

          }
          
          // Don't set Content-Type for FormData, let browser set it with boundary







        } else {
          // Use JSON for regular requests (non-video requests)
          options.headers = { 'Content-Type': 'application/json' };
          options.body = JSON.stringify(data);






        }
      }





      if (options.body instanceof FormData) {

      } else if (typeof options.body === 'string') {

      } else {

      }
      
      // Log options safely (avoid circular references)
      try {
        const safeOptions = {
          method: options.method,
          headers: options.headers,
          body: options.body instanceof FormData ? 'FormData' : typeof options.body,
          signal: options.signal ? 'AbortSignal' : 'None'
        };

      } catch (optionsError) {

      }
      
      try {


        // Add progress logging for large uploads
        if (options.body instanceof FormData) {


        }

        const response = await fetch(url, options);


        // Clear timeout since request completed
        clearTimeout(timeoutId);




        if (!response.ok) {

          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json();

        // Log the response from the backend





        return { success: true, data: responseData };
      } catch (fetchError) {


        clearTimeout(timeoutId);
        throw fetchError;
      }

    } catch (error) {

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: `Request timed out after ${this.config.timeout / 1000} seconds. Video processing may still be running on the backend.`
        };
      }
      
      // Provide more specific error messages
      let errorMessage = 'Unknown error';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Backend server is not running. Please start the Python backend server.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. The video might be too large or the backend is overloaded.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = error.message;
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  async checkProjectStatus(projectName: string): Promise<PythonBackendResponse<any>> {
    try {
      const response = await this.makeRequest(`/api/frontend/get-project-status/${projectName}`, 'GET');
      return response;
    } catch (error) {

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check project status'
      };
    }
  }

  async getLatestClips(): Promise<PythonBackendResponse<PythonBackendProcessingResult>> {
    try {
      // Get the latest clips from the viral_clips directory
      const response = await this.makeRequest<PythonBackendProcessingResult>('/api/frontend/get-latest-clips', 'GET');
      return response;
    } catch (error) {

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get latest clips'
      };
    }
  }

  async getTestVideoData(): Promise<PythonBackendResponse<PythonBackendProcessingResult>> {
    try {
      // Get test video data for frontend testing
      const response = await this.makeRequest<PythonBackendResponse<PythonBackendProcessingResult>>('/api/frontend/test-video-display', 'GET');
      return response;
    } catch (error) {

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get test video data'
      };
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const pythonBackendService = new PythonBackendService();
