// 🎬 Focused Video Clipper Backend Integration Service
// Handles communication with the focused video clipper backend for video processing and AI analysis

export interface FocusedVideoClipperConfig {
  baseUrl: string;
  timeout: number;
  maxRetries: number;
}

export interface FocusedVideoClipperResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface FocusedVideoClipperClip {
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
  download_url: string;
}

export interface FocusedVideoClipperProcessingResult {
  success: boolean;
  message: string;
  projectName: string;
  clipsGenerated: number;
  clips: FocusedVideoClipperClip[];
  transcription?: string; // Legacy field for backward compatibility
  fullVideoTranscription?: string; // Full video transcription text
  processing_options: any;
  timestamp: string;
}

class FocusedVideoClipperService {
  private config: FocusedVideoClipperConfig;
  private isConnected: boolean = false;

  constructor(config: FocusedVideoClipperConfig = {
    baseUrl: import.meta.env.VITE_FOCUSED_BACKEND_URL || 'https://farmguard5.onrender.com', // Deployed Render backend
    timeout: 1800000, // 30 minutes for large video uploads
    maxRetries: 3
  }) {
    this.config = config;
  }

  async testConnection(): Promise<boolean> {
    try {


      const response = await this.makeRequest('/api/health', 'GET');

      // Check if response is successful and has the expected structure
      if (response.success && response.data) {
        // Check if the health endpoint returned a healthy status
        const isHealthy = response.data.status === 'healthy' || response.data.service;

        this.isConnected = isHealthy;
        return isHealthy;
      } else {

        this.isConnected = false;
        return false;
      }
    } catch (error) {

      // Check if it's a CSP error
      if (error instanceof Error && error.message.includes('Content Security Policy')) {

      }
      
      this.isConnected = false;
      return false;
    }
  }

  async processVideo(projectData: {
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
  }, onProgress?: (progress: any) => void): Promise<FocusedVideoClipperResponse<FocusedVideoClipperProcessingResult>> {
    try {
      if (!(await this.testConnection())) {
        throw new Error('Focused video clipper backend not connected');
      }


      // Check if we should use chunked upload for large files
      if (projectData.sourceType === 'file' && projectData.videoFile instanceof File) {
        const fileSizeMB = projectData.videoFile.size / (1024 * 1024);

        // TEMPORARILY DISABLE CHUNKED UPLOAD - All chunks are timing out
        // Use regular upload for all files until chunked upload is fixed
        if (fileSizeMB > 10) {


        }
      }

      const payload: any = {
        projectName: projectData.projectName,
        description: projectData.description,
        sourceType: projectData.sourceType,
        provider: (projectData as any).provider,
        fileId: (projectData as any).fileId,
        googleAccessToken: (projectData as any).googleAccessToken,
        targetPlatforms: projectData.targetPlatforms,
        aiPrompt: projectData.aiPrompt,
        processingOptions: projectData.processingOptions,
        numClips: projectData.numClips || 3
      };

      if (projectData.sourceType === 'file' && projectData.videoFile) {
        if (projectData.videoFile instanceof File) {
          payload.videoFile = projectData.videoFile;
        } else {
          payload.videoFile = projectData.videoFile;
        }
      } else if (projectData.sourceType === 'url' && projectData.sourceUrl) {
        payload.sourceUrl = projectData.sourceUrl;
      } else if (projectData.sourceType === 'text' && projectData.sourceText) {
        payload.sourceText = projectData.sourceText;
      }

      const response = await this.makeRequest<FocusedVideoClipperProcessingResult>(
        '/api/process-video',
        'POST',
        payload
      );

      // Transform the response to match the expected interface
      if (response.success && response.data) {
        const transformedData: FocusedVideoClipperProcessingResult = {
          success: response.data.success,
          message: response.data.message,
          projectName: response.data.project_name,
          clipsGenerated: response.data.clips_generated,
          clips: response.data.clips.map((clip: any, index: number) => ({
            id: `clip_${index + 1}`,
            clip_number: index + 1,
            filename: clip.filename,
            filepath: clip.filepath,
            start_time: 0, // Default values for missing fields
            end_time: 30,
            duration: 30,
            viral_score: 8,
            content_type: 'viral',
            caption: `Viral clip ${index + 1}`,
            hashtags: ['viral', 'trending', 'amazing'],
            target_audience: 'general',
            platforms: ['tiktok', 'instagram', 'youtube'],
            segment_text: `Clip ${index + 1} content`,
            viral_potential: 8,
            engagement: 7,
            story_value: 8,
            audio_impact: 7,
            download_url: clip.download_url
          })),
          transcription: response.data.transcription,
          fullVideoTranscription: response.data.transcription,
          processing_options: response.data.processing_options,
          timestamp: response.data.timestamp
        };
        
        return {
          success: true,
          data: transformedData
        };
      }
      
      return response;
    } catch (error) {

      let errorMessage = 'Unknown error';
      if (error instanceof Error) {

        if (error.message.includes('Failed to fetch')) {
          if (error.message.includes('Content Security Policy')) {
            errorMessage = 'CSP Error: farmguard5.onrender.com is blocked. Please check the Content Security Policy configuration.';
          } else {
            errorMessage = `Focused video clipper backend is not accessible. Please check the server status at ${import.meta.env.VITE_FOCUSED_BACKEND_URL || 'https://farmguard5.onrender.com'}.`;
          }
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

  private async makeRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' = 'GET', 
    data?: any
  ): Promise<FocusedVideoClipperResponse<T>> {
    try {
      const url = `${this.config.baseUrl}${endpoint}`;
      
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
        if (endpoint === '/api/process-video' && data.videoFile && data.videoFile instanceof File) {

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
          
          options.body = formData;





        } else {
          // Use JSON for regular requests
          options.headers = { 'Content-Type': 'application/json' };
          options.body = JSON.stringify(data);




        }
      }



      if (method === 'POST') {
        try {

        } catch {}
      }
      const response = await fetch(url, options);
      
      clearTimeout(timeoutId);



      if (!response.ok) {

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();


      return { success: true, data: responseData };
    } catch (error) {

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: `Request timed out after ${this.config.timeout / 1000} seconds. Video processing may still be running on the backend.`
        };
      }
      
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {

        if (error.message.includes('Failed to fetch')) {
          if (error.message.includes('Content Security Policy')) {
            errorMessage = 'CSP Error: farmguard5.onrender.com is blocked. Please check the Content Security Policy configuration.';
          } else {
            errorMessage = `Focused video clipper backend is not accessible. Please check the server status at ${import.meta.env.VITE_FOCUSED_BACKEND_URL || 'https://farmguard5.onrender.com'}.`;
          }
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

  async downloadClip(filename: string): Promise<Blob | null> {
    try {
      const url = `${this.config.baseUrl}/api/download/${filename}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to download clip: ${response.statusText}`);
      }
      
      return await response.blob();
    } catch (error) {

      return null;
    }
  }

  async getTranscription(filename: string): Promise<string | null> {
    try {
      const url = `${this.config.baseUrl}/api/transcription/${filename}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to get transcription: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.transcription || null;
    } catch (error) {

      return null;
    }
  }

  async getAnalysis(filename: string): Promise<any | null> {
    try {
      const url = `${this.config.baseUrl}/api/analysis/${filename}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to get analysis: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.analysis || null;
    } catch (error) {

      return null;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * 🚀 SUPER FAST: Process video using chunked upload
   */
  private async processVideoChunked(
    projectData: any,
    onProgress?: (progress: any) => void
  ): Promise<FocusedVideoClipperResponse<FocusedVideoClipperProcessingResult>> {
    try {

      // Import chunked upload service dynamically to avoid circular imports
      const { chunkedVideoUploadService } = await import('./chunkedVideoUploadService');
      
      // Configure for MAXIMUM speed with smaller chunks for reliability
      chunkedVideoUploadService.updateConfig({
        chunkSizeMB: 5, // 5MB chunks for better reliability
        maxConcurrentChunks: 8, // Fewer parallel chunks for stability
        retryAttempts: 2, // More retries for reliability
        compressionQuality: 0.7 // Better quality for reliability
      });

      const result = await chunkedVideoUploadService.processVideoChunked(
        projectData.videoFile,
        projectData,
        (progress) => {
          if (onProgress) {
            onProgress({
              ...progress,
              message: `Processing chunk ${progress.currentChunk || 0}/${progress.totalChunks}...`,
              speed: `${progress.speed.toFixed(1)} MB/s`
            });
          }
        }
      );

      // Check if chunked upload failed and fallback to regular upload
      if (!result.success || result.failedChunks > result.totalChunks / 2) {

        throw new Error('Chunked upload failed, using regular upload');
      }

      // Transform result to match expected format
      return {
        success: true,
        data: {
          success: true,
          message: result.message,
          project_name: projectData.projectName,
          clips_generated: result.chunksProcessed,
          clips: result.results || [],
          transcription: '',
          processing_options: projectData.processingOptions,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Chunked upload failed'
      };
    }
  }
}

export const focusedVideoClipperService = new FocusedVideoClipperService();
