export interface ChunkedUploadConfig {
  chunkSize: number; // Size of each chunk in bytes
  maxRetries: number;
  timeout: number;
}

export interface UploadChunk {
  chunkIndex: number;
  totalChunks: number;
  chunkData: Blob;
  fileName: string;
  projectId: string;
}

export interface ChunkedUploadResult {
  success: boolean;
  message: string;
  uploadedChunks?: number[];
  error?: string;
}

export class ChunkedUploadService {
  private config: ChunkedUploadConfig;
  private baseUrl: string;

  constructor(baseUrl: string, config: ChunkedUploadConfig = {
    chunkSize: 5 * 1024 * 1024, // 5MB chunks
    maxRetries: 3,
    timeout: 120000 // 2 minutes per chunk (increased from 30 seconds)
  }) {
    this.baseUrl = baseUrl;
    this.config = config;
  }

  async uploadVideoInChunks(
    file: File, 
    projectData: any
  ): Promise<ChunkedUploadResult> {
    try {
      console.log('📦 [ChunkedUpload] Starting chunked upload for file:', file.name);
      console.log('📦 [ChunkedUpload] File size:', (file.size / (1024 * 1024)).toFixed(2), 'MB');
      
      const totalChunks = Math.ceil(file.size / this.config.chunkSize);
      console.log('📦 [ChunkedUpload] Total chunks needed:', totalChunks);
      
      const uploadedChunks: number[] = [];
      
      // Upload chunks sequentially
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * this.config.chunkSize;
        const end = Math.min(start + this.config.chunkSize, file.size);
        const chunkBlob = file.slice(start, end);
        
        console.log(`📦 [ChunkedUpload] Uploading chunk ${chunkIndex + 1}/${totalChunks}`);
        console.log(`📦 [ChunkedUpload] Chunk size: ${(chunkBlob.size / (1024 * 1024)).toFixed(2)} MB`);
        
        const success = await this.uploadChunk({
          chunkIndex,
          totalChunks,
          chunkData: chunkBlob,
          fileName: file.name,
          projectId: projectData.projectName
        }, projectData);
        
        if (success.success) {
          uploadedChunks.push(chunkIndex);
          console.log(`✅ [ChunkedUpload] Chunk ${chunkIndex + 1} uploaded successfully`);
          
          // Check if this was the last chunk and processing should start
          if (success.processingStarted && success.nextStep === 'video_processing') {
            console.log(`🎬 [ChunkedUpload] Video processing started for uploaded file`);
          }
        } else {
          console.error(`❌ [ChunkedUpload] Failed to upload chunk ${chunkIndex + 1}`);
          return {
            success: false,
            message: `Failed to upload chunk ${chunkIndex + 1}`,
            uploadedChunks
          };
        }
      }
      
      console.log('🎉 [ChunkedUpload] All chunks uploaded successfully!');
      return {
        success: true,
        message: `Successfully uploaded ${totalChunks} chunks`,
        uploadedChunks
      };
      
    } catch (error) {
      console.error('❌ [ChunkedUpload] Chunked upload failed:', error);
      return {
        success: false,
        message: `Chunked upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async uploadChunk(
    chunk: UploadChunk, 
    projectData: any
  ): Promise<{ success: boolean; processingStarted?: boolean; nextStep?: string; message?: string }> {
    const maxRetries = this.config.maxRetries;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📦 [ChunkedUpload] Attempt ${attempt}/${maxRetries} for chunk ${chunk.chunkIndex + 1}`);
        
        const formData = new FormData();
        formData.append('chunkIndex', chunk.chunkIndex.toString());
        formData.append('totalChunks', chunk.totalChunks.toString());
        formData.append('chunkData', chunk.chunkData, `chunk_${chunk.chunkIndex}.blob`);
        formData.append('fileName', chunk.fileName);
        formData.append('projectId', chunk.projectId);
        
        // Add project data
        formData.append('projectName', projectData.projectName);
        formData.append('description', projectData.description);
        formData.append('sourceType', projectData.sourceType);
        formData.append('targetPlatforms', JSON.stringify(projectData.targetPlatforms));
        formData.append('aiPrompt', projectData.aiPrompt);
        formData.append('processingOptions', JSON.stringify(projectData.processingOptions));
        formData.append('numClips', projectData.numClips?.toString() || '3');
        
        console.log(`📦 [ChunkedUpload] Sending chunk ${chunk.chunkIndex + 1} to backend...`);
        console.log(`📦 [ChunkedUpload] Chunk data size: ${chunk.chunkData.size} bytes`);
        console.log(`📦 [ChunkedUpload] FormData created with chunk data`);
        
        // Create a new AbortController for each attempt
        const controller = new AbortController();
        
        // Set timeout based on chunk size (larger chunks get more time)
        const chunkSizeMB = chunk.chunkData.size / (1024 * 1024);
        const dynamicTimeout = Math.max(this.config.timeout, chunkSizeMB * 30000); // 30 seconds per MB minimum
        
        console.log(`📦 [ChunkedUpload] Using timeout: ${dynamicTimeout}ms for ${chunkSizeMB.toFixed(2)}MB chunk`);
        
        const timeoutId = setTimeout(() => {
          console.log(`⏰ [ChunkedUpload] Timeout reached for chunk ${chunk.chunkIndex + 1}, aborting...`);
          controller.abort();
        }, dynamicTimeout);
        
        try {
          const response = await fetch(`${this.baseUrl}/api/frontend/upload-chunk`, {
            method: 'POST',
            body: formData,
            signal: controller.signal
          });
          
          // Clear timeout since request completed
          clearTimeout(timeoutId);
          
          console.log(`📦 [ChunkedUpload] Chunk ${chunk.chunkIndex + 1} response received:`, response.status, response.statusText);
          
          if (response.ok) {
            const result = await response.json();
            console.log(`📦 [ChunkedUpload] Chunk ${chunk.chunkIndex + 1} result:`, result);
            
            if (result.success) {
              return {
                success: true,
                processingStarted: result.processingStarted || false,
                nextStep: result.nextStep || '',
                message: result.message || ''
              };
            } else {
              console.error(`❌ [ChunkedUpload] Chunk upload failed:`, result.error);
            }
          } else {
            console.error(`❌ [ChunkedUpload] HTTP error:`, response.status, response.statusText);
            // Try to get error details from response
            try {
              const errorText = await response.text();
              console.error(`❌ [ChunkedUpload] Error response body:`, errorText);
            } catch (e) {
              console.error(`❌ [ChunkedUpload] Could not read error response:`, e);
            }
          }
          
        } catch (fetchError) {
          // Clear timeout since request failed
          clearTimeout(timeoutId);
          
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            console.error(`⏰ [ChunkedUpload] Request aborted for chunk ${chunk.chunkIndex + 1}:`, fetchError.message);
            // Don't retry on abort - it's a timeout issue
            return { success: false };
          } else {
            throw fetchError; // Re-throw non-abort errors
          }
        }
        
      } catch (error) {
        console.error(`❌ [ChunkedUpload] Attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          console.error(`❌ [ChunkedUpload] All ${maxRetries} attempts failed for chunk ${chunk.chunkIndex + 1}`);
          return { success: false };
        }
        
        // Wait before retry (exponential backoff)
        const waitTime = 1000 * Math.pow(2, attempt - 1);
        console.log(`⏳ [ChunkedUpload] Waiting ${waitTime}ms before retry ${attempt + 1}...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    return { success: false };
  }

  /**
   * Test method to verify chunk upload functionality
   */
  async testChunkUpload(): Promise<boolean> {
    try {
      console.log('🧪 [ChunkedUpload] Testing chunk upload functionality...');
      
      // Create a small test chunk
      const testData = new Blob(['This is a test chunk'], { type: 'text/plain' });
      const testChunk: UploadChunk = {
        chunkIndex: 0,
        totalChunks: 1,
        chunkData: testData,
        fileName: 'test.txt',
        projectId: 'test-project'
      };
      
      const testProjectData = {
        projectName: 'test-project',
        description: 'Test project',
        sourceType: 'file',
        targetPlatforms: ['tiktok'],
        aiPrompt: 'Test prompt',
        processingOptions: {},
        numClips: 3
      };
      
      console.log('🧪 [ChunkedUpload] Sending test chunk to backend...');
      const success = await this.uploadChunk(testChunk, testProjectData);
      
      if (success.success) {
        console.log('✅ [ChunkedUpload] Test chunk upload successful!');
        return true;
      } else {
        console.error('❌ [ChunkedUpload] Test chunk upload failed!');
        return false;
      }
      
    } catch (error) {
      console.error('❌ [ChunkedUpload] Test chunk upload error:', error);
      return false;
    }
  }
}

export default ChunkedUploadService;
