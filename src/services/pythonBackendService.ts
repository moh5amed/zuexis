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
    baseUrl: 'https://zuexisbacckend.onrender.com',
    timeout: 600000, // Increased to 10 minutes for large video uploads
    maxRetries: 3
  }) {
    this.config = config;
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('🔌 [PythonBackend] Testing connection...');
      console.log('🔌 [PythonBackend] Testing URL:', `${this.config.baseUrl}/api/frontend/status`);
      
      const response = await this.makeRequest('/api/frontend/status', 'GET');
      
      console.log('🔌 [PythonBackend] Connection test response:', response);
      
      this.isConnected = response.success;
      return response.success;
    } catch (error) {
      console.error('❌ [PythonBackend] Connection failed:', error);
      console.error('❌ [PythonBackend] Connection error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown'
      });
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
      console.log('🔍 [PythonBackend] DETAILED DATA ANALYSIS:');
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
            console.log('📦 [PythonBackend] Large video file detected, using chunked upload');
            console.log('📦 [PythonBackend] File size:', (projectData.videoFile.size / (1024 * 1024)).toFixed(2), 'MB');
            
            // Use chunked upload for large files
            const chunkedUploadService = new ChunkedUploadService(this.config.baseUrl);
            const uploadResult = await chunkedUploadService.uploadVideoInChunks(projectData.videoFile, projectData);
            
            if (uploadResult.success) {
              console.log('✅ [PythonBackend] Chunked upload completed successfully');
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
              console.error('❌ [PythonBackend] Chunked upload failed:', uploadResult.error);
              throw new Error(`Chunked upload failed: ${uploadResult.error}`);
            }
          } else {
            // Use regular FormData for smaller files
            console.log('📁 [PythonBackend] Small video file detected, using regular FormData upload');
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
      console.log('📤 [PythonBackend] FINAL PAYLOAD BEING SENT TO BACKEND:');
      console.log('   - Full Payload Object:', payload);
      console.log('   - Payload Keys:', Object.keys(payload));
      
      // Check if we can serialize the payload to JSON (for logging purposes)
      try {
        const jsonPayload = JSON.stringify(payload);
        console.log('   - Payload Size (JSON):', jsonPayload.length, 'characters');
      } catch (jsonError) {
        console.log('   - Payload Size: Cannot serialize to JSON (contains File object)');
        console.log('   - JSON Error:', jsonError instanceof Error ? jsonError.message : 'Unknown error');
      }
      
      if (payload.videoFile) {
        if (payload.videoFile instanceof File) {
          console.log('   - Video File in Payload:', {
            type: 'File object',
            name: payload.videoFile.name,
            size: (payload.videoFile.size / (1024 * 1024)).toFixed(2) + ' MB',
            lastModified: new Date(payload.videoFile.lastModified).toISOString()
          });
        } else if (typeof payload.videoFile === 'string') {
          console.log('   - Video File in Payload:', {
            type: 'string (base64)',
            length: payload.videoFile.length,
            preview: payload.videoFile.substring(0, 100) + '...'
          });
        } else {
          console.log('   - Video File in Payload:', {
            type: typeof payload.videoFile,
            value: payload.videoFile
          });
        }
      }

      console.log('🚀 [PythonBackend] SENDING REQUEST TO BACKEND:');
      console.log('   - Endpoint: /api/frontend/process-project');
      console.log('   - Full URL:', `${this.config.baseUrl}/api/frontend/process-project`);
      
      // Get payload size safely
      if (payload.videoFile instanceof File) {
        console.log('   - Payload Size: File object (will be sent as FormData)');
        console.log('   - Video File Size:', (payload.videoFile.size / (1024 * 1024)).toFixed(2), 'MB');
      } else {
        try {
          const jsonSize = JSON.stringify(payload).length;
          console.log('   - Payload Size (JSON):', jsonSize, 'characters');
        } catch (jsonError) {
          console.log('   - Payload Size: Cannot determine (JSON serialization failed)');
        }
      }
      
      console.log('   - Request Type:', payload.videoFile instanceof File ? 'FormData' : 'JSON');
      
      console.log('⏳ [PythonBackend] Calling makeRequest...');
      const response = await this.makeRequest<PythonBackendProcessingResult>(
        '/api/frontend/process-project',
        'POST',
        payload
      );
      console.log('✅ [PythonBackend] makeRequest completed successfully');

      console.log('✅ [PythonBackend] Backend response received successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ [PythonBackend] Video processing error:', error);
      console.error('❌ [PythonBackend] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown',
        stack: error instanceof Error ? error.stack : 'Unknown'
      });
      
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
        console.log('⏰ [PythonBackend] Request timeout reached, aborting...');
        controller.abort();
      }, this.config.timeout);
      
      console.log('⏰ [PythonBackend] Timeout set for:', this.config.timeout, 'ms');
      console.log('⏰ [PythonBackend] AbortController created:', controller.signal.aborted ? 'Already aborted' : 'Ready');

      const options: RequestInit = {
        method,
        signal: controller.signal
      };
      
      console.log('📋 [PythonBackend] Request options created:', {
        method: options.method,
        hasSignal: !!options.signal,
        signalAborted: options.signal?.aborted || false
      });

      if (data && method === 'POST') {
        // Check if this is a video processing request with video files
        if (endpoint === '/api/frontend/process-project' && data.videoFile && data.videoFile instanceof File) {
          console.log('📁 [PythonBackend] Creating FormData for video upload...');
          
          // Always use FormData for video files - it's much more efficient than base64
          const formData = new FormData();
          
          console.log('📁 [PythonBackend] Adding text fields to FormData...');
          // Add all text fields
          formData.append('projectName', data.projectName);
          formData.append('description', data.description);
          formData.append('sourceType', data.sourceType);
          formData.append('targetPlatforms', JSON.stringify(data.targetPlatforms));
          formData.append('aiPrompt', data.aiPrompt);
          formData.append('processingOptions', JSON.stringify(data.processingOptions));
          formData.append('numClips', data.numClips?.toString() || '3');
          
          console.log('📁 [PythonBackend] Adding video file to FormData...');
          // Add the video file directly
          formData.append('videoFile', data.videoFile);
          
          console.log('📁 [PythonBackend] FormData created successfully:');
          const entries = Array.from(formData.entries());
          console.log('   - FormData entries count:', entries.length);
          for (const [key, value] of entries) {
            if (value instanceof File) {
              console.log(`   - ${key}: File(${value.name}, ${(value.size / (1024 * 1024)).toFixed(2)} MB)`);
            } else {
              console.log(`   - ${key}: ${typeof value} = ${String(value).substring(0, 100)}...`);
            }
          }
          
          console.log('📁 [PythonBackend] Setting FormData as request body...');
          options.body = formData;
          
          // Test FormData validity
          try {
            console.log('📁 [PythonBackend] Testing FormData validity...');
            const testEntries = Array.from(formData.entries());
            console.log('📁 [PythonBackend] FormData test successful, entries:', testEntries.length);
          } catch (formDataError) {
            console.error('❌ [PythonBackend] FormData validation failed:', formDataError);
          }
          
          // Don't set Content-Type for FormData, let browser set it with boundary
          
          console.log('🌐 [PythonBackend] HTTP REQUEST DETAILS (FormData):');
          console.log('   - URL:', url);
          console.log('   - Method:', method);
          console.log('   - Using FormData for video file upload');
          console.log('   - Video file name:', data.videoFile.name);
          console.log('   - Video file size:', (data.videoFile.size / (1024 * 1024)).toFixed(2), 'MB');
          console.log('   - FormData is much more efficient than base64 for large files');
        } else {
          // Use JSON for regular requests (non-video requests)
          options.headers = { 'Content-Type': 'application/json' };
          options.body = JSON.stringify(data);
          
          console.log('🌐 [PythonBackend] HTTP REQUEST DETAILS (JSON):');
          console.log('   - URL:', url);
          console.log('   - Method:', method);
          console.log('   - Headers:', options.headers);
          console.log('   - Body Size:', options.body.length, 'characters');
          console.log('   - Body Preview:', options.body.substring(0, 200) + '...');
        }
      }

      console.log('🚀 [PythonBackend] ABOUT TO MAKE FETCH REQUEST:');
      console.log('   - URL:', url);
      console.log('   - Method:', method);
      console.log('   - Timeout:', this.config.timeout, 'ms');
      console.log('   - Request body type:', typeof options.body);
      if (options.body instanceof FormData) {
        console.log('   - Request body size: FormData');
      } else if (typeof options.body === 'string') {
        console.log('   - Request body size:', options.body.length, 'characters');
      } else {
        console.log('   - Request body size: Unknown type');
      }
      
      // Log options safely (avoid circular references)
      try {
        const safeOptions = {
          method: options.method,
          headers: options.headers,
          body: options.body instanceof FormData ? 'FormData' : typeof options.body,
          signal: options.signal ? 'AbortSignal' : 'None'
        };
        console.log('   - Safe Options:', safeOptions);
      } catch (optionsError) {
        console.log('   - Options: Cannot serialize (circular reference)');
      }
      
      try {
        console.log('🔄 [PythonBackend] Starting fetch request...');
        console.log('⏰ [PythonBackend] Request start time:', new Date().toISOString());
        
        // Add progress logging for large uploads
        if (options.body instanceof FormData) {
          console.log('📤 [PythonBackend] Uploading large video file via FormData...');
          console.log('⏳ [PythonBackend] This may take several minutes for large files...');
        }
        
        console.log('🔄 [PythonBackend] Calling fetch() now...');
        const response = await fetch(url, options);
        console.log('✅ [PythonBackend] Fetch request completed successfully!');
        console.log('⏰ [PythonBackend] Request end time:', new Date().toISOString());
        
        // Clear timeout since request completed
        clearTimeout(timeoutId);
        
        console.log('📥 [PythonBackend] Response received:');
        console.log('   - Status:', response.status, response.statusText);
        console.log('   - OK:', response.ok);
        console.log('   - Headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          console.error('❌ [PythonBackend] Response not OK:', response.status, response.statusText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        console.log('🔄 [PythonBackend] Parsing response JSON...');
        const responseData = await response.json();
        console.log('✅ [PythonBackend] JSON parsed successfully');
        
        // Log the response from the backend
        console.log('📥 [PythonBackend] BACKEND RESPONSE RECEIVED:');
        console.log('   - Status:', response.status, response.statusText);
        console.log('   - Response Headers:', Object.fromEntries(response.headers.entries()));
        console.log('   - Response Data:', responseData);
        console.log('   - Response Type:', typeof responseData);
        
        return { success: true, data: responseData };
      } catch (fetchError) {
        console.error('❌ [PythonBackend] Fetch request failed:', fetchError);
        console.error('❌ [PythonBackend] Fetch error details:', {
          name: fetchError instanceof Error ? fetchError.name : 'Unknown',
          message: fetchError instanceof Error ? fetchError.message : 'Unknown',
          stack: fetchError instanceof Error ? fetchError.stack : 'Unknown'
        });
        
        clearTimeout(timeoutId);
        throw fetchError;
      }

    } catch (error) {
      console.error('❌ [PythonBackend] Request error:', error);
      
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
      console.error('❌ [PythonBackend] Project status check error:', error);
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
      console.error('❌ [PythonBackend] Get latest clips error:', error);
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
      console.error('❌ [PythonBackend] Get test video data error:', error);
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
