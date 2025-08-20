// 🐍 Python Backend Integration Service
// Handles communication with the Python Flask backend for video processing and AI analysis

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
  transcription?: string;
  message: string;
}

class PythonBackendService {
  private config: PythonBackendConfig;
  private isConnected: boolean = false;

  constructor(config: PythonBackendConfig = {
    baseUrl: 'http://localhost:5000',
    timeout: 1800000, // Increased to 30 minutes for video processing with AI analysis
    maxRetries: 3
  }) {
    this.config = config;
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('🔌 [PythonBackend] Testing connection...');
      const response = await this.makeRequest('/api/frontend/status', 'GET');
      this.isConnected = response.success;
      return response.success;
    } catch (error) {
      console.error('❌ [PythonBackend] Connection failed:', error);
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
          payload.videoFile = await this.fileToBase64(projectData.videoFile);
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
      console.log('   - Payload Size (JSON):', JSON.stringify(payload).length, 'characters');
      if (payload.videoFile) {
        console.log('   - Video File in Payload:', {
          type: typeof payload.videoFile,
          length: payload.videoFile.length,
          preview: payload.videoFile.substring(0, 100) + '...'
        });
      }

      const response = await this.makeRequest<PythonBackendProcessingResult>(
        '/api/frontend/process-project',
        'POST',
        payload
      );

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
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
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      };

      if (data && method === 'POST') {
        options.body = JSON.stringify(data);
        console.log('🌐 [PythonBackend] HTTP REQUEST DETAILS:');
        console.log('   - URL:', url);
        console.log('   - Method:', method);
        console.log('   - Headers:', options.headers);
        console.log('   - Body Size:', options.body.length, 'characters');
        console.log('   - Body Preview:', options.body.substring(0, 200) + '...');
      }

      try {
        const response = await fetch(url, options);
        
        // Clear timeout since request completed
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json();
        
        // Log the response from the backend
        console.log('📥 [PythonBackend] BACKEND RESPONSE RECEIVED:');
        console.log('   - Status:', response.status, response.statusText);
        console.log('   - Response Headers:', Object.fromEntries(response.headers.entries()));
        console.log('   - Response Data:', responseData);
        console.log('   - Response Type:', typeof responseData);
        
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
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
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
        error: error instanceof Error ? error.message : 'Unknown error'
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
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getTestVideoData(): Promise<PythonBackendResponse<PythonBackendProcessingResult>> {
    try {
      // Get test video data for frontend testing
      const response = await this.makeRequest<PythonBackendProcessingResult>('/api/frontend/test-video-display', 'GET');
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const pythonBackendService = new PythonBackendService();
