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

  /**
   * Check network connectivity before starting uploads
   */
  private async checkNetworkConnectivity(): Promise<boolean> {
    try {

      // Try to fetch a simple endpoint to test connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      try {
        const response = await fetch(`${this.baseUrl}/api/health`, {
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {

          return true;
        } else {

          return false;
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
      
    } catch (error) {

      return false;
    }
  }

  async uploadVideoInChunks(
    file: File, 
    projectData: any
  ): Promise<ChunkedUploadResult> {
    try {


      // Check network connectivity before starting
      const isConnected = await this.checkNetworkConnectivity();
      if (!isConnected) {

      }
      
      const totalChunks = Math.ceil(file.size / this.config.chunkSize);

      const uploadedChunks: number[] = [];
      
      // Upload chunks sequentially
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * this.config.chunkSize;
        const end = Math.min(start + this.config.chunkSize, file.size);
        const chunkBlob = file.slice(start, end);


        const success = await this.uploadChunk({
          chunkIndex,
          totalChunks,
          chunkData: chunkBlob,
          fileName: file.name,
          projectId: projectData.projectName
        }, projectData);
        
        if (success.success) {
          uploadedChunks.push(chunkIndex);

          // Check if this was the last chunk and processing should start
          if (success.processingStarted && success.nextStep === 'video_processing') {

          }
        } else {

          return {
            success: false,
            message: `Failed to upload chunk ${chunkIndex + 1}`,
            uploadedChunks
          };
        }
      }

      return {
        success: true,
        message: `Successfully uploaded ${totalChunks} chunks`,
        uploadedChunks
      };
      
    } catch (error) {

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
    const maxRetryCycles = 3; // Maximum number of retry cycles (3 attempts per cycle)
    const cooldownTime = 15000; // 15 seconds cooldown between cycles
    
    for (let cycle = 1; cycle <= maxRetryCycles; cycle++) {

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {

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



          // Create a new AbortController for each attempt
          const controller = new AbortController();
          
          // Set timeout based on chunk size (larger chunks get more time)
          const chunkSizeMB = chunk.chunkData.size / (1024 * 1024);
          const dynamicTimeout = Math.max(this.config.timeout, chunkSizeMB * 30000); // 30 seconds per MB minimum

          const timeoutId = setTimeout(() => {

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

            if (response.ok) {
              const result = await response.json();

              if (result.success) {

                return {
                  success: true,
                  processingStarted: result.processingStarted || false,
                  nextStep: result.nextStep || '',
                  message: result.message || ''
                };
              } else {

              }
            } else {

              // Try to get error details from response
              try {
                const errorText = await response.text();

              } catch (e) {

              }
            }
            
          } catch (fetchError) {
            // Clear timeout since request failed
            clearTimeout(timeoutId);
            
            if (fetchError instanceof Error && fetchError.name === 'AbortError') {

              // Don't retry on abort - it's a timeout issue
              return { success: false };
            } else {
              throw fetchError; // Re-throw non-abort errors
            }
          }
          
        } catch (error) {

          // Check if this is a network connectivity error
          const isNetworkError = error instanceof TypeError && 
            (error.message.includes('Failed to fetch') || 
             error.message.includes('ERR_INTERNET_DISCONNECTED') ||
             error.message.includes('ERR_NETWORK_CHANGED') ||
             error.message.includes('ERR_NAME_NOT_RESOLVED'));
          
          if (isNetworkError) {

          }
          
          // If this is the last attempt of the current cycle, break to start cooldown
          if (attempt === maxRetries) {

            break; // Break out of attempt loop to start cooldown
          }
          
          // Wait before retry (exponential backoff)
          const waitTime = 1000 * Math.pow(2, attempt - 1);

          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      
      // If we've completed all cycles, return failure
      if (cycle === maxRetryCycles) {

        return { success: false };
      }
      
      // Cooldown between retry cycles (15 seconds)

      await new Promise(resolve => setTimeout(resolve, cooldownTime));
    }
    
    return { success: false };
  }

  /**
   * Test method to verify chunk upload functionality
   */
  async testChunkUpload(): Promise<boolean> {
    try {

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

      const success = await this.uploadChunk(testChunk, testProjectData);
      
      if (success.success) {

        return true;
      } else {

        return false;
      }
      
    } catch (error) {

      return false;
    }
  }
}

export default ChunkedUploadService;
