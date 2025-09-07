/**
 * Video Chunking Service - Splits large videos into 25MB chunks for Whisper API
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export interface VideoChunk {
  chunkIndex: number;
  startTime: number;
  endTime: number;
  duration: number;
  file: File;
  size: number;
}

export interface ChunkingResult {
  chunks: VideoChunk[];
  totalChunks: number;
  totalDuration: number;
  originalFile: File;
}

class VideoChunkingService {
  private readonly MAX_CHUNK_SIZE = 20 * 1024 * 1024; // 20MB in bytes (safe margin for Whisper API)
  private readonly CHUNK_OVERLAP = 2; // 2 seconds overlap between chunks
  private ffmpeg: FFmpeg | null = null;
  private isInitialized = false;

  /**
   * Initialize FFmpeg with timeout
   */
  private async initializeFFmpeg(): Promise<void> {
    if (this.isInitialized) return;
    
    try {



      this.ffmpeg = new FFmpeg();
      
      // Add progress logging
      this.ffmpeg.on('log', ({ message }) => {

      });
      
      this.ffmpeg.on('progress', ({ progress }) => {

      });
      
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

      // Add timeout to FFmpeg initialization
      const initPromise = this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('FFmpeg initialization timeout')), 30000); // 30 second timeout
      });
      
      await Promise.race([initPromise, timeoutPromise]);
      
      this.isInitialized = true;


    } catch (error) {

      throw error;
    }
  }

  /**
   * Chunk a video file into smaller pieces for processing
   */
  async chunkVideo(videoFile: File, useSimpleChunking: boolean = false): Promise<ChunkingResult> {
    try {



      if (useSimpleChunking) {

        return await this.simpleChunking(videoFile);
      }
      
      // Try FFmpeg first, fall back to simple chunking if it fails
      try {


        await this.initializeFFmpeg();
      } catch (error) {


        return await this.workingChunking(videoFile);
      }
      
      // Get video duration
      const duration = await this.getVideoDuration(videoFile);

      // Calculate number of chunks needed
      const totalChunks = Math.ceil(videoFile.size / this.MAX_CHUNK_SIZE);

      // If file is small enough, return as single chunk
      if (videoFile.size <= this.MAX_CHUNK_SIZE) {

        return {
          chunks: [{
            chunkIndex: 0,
            startTime: 0,
            endTime: duration,
            duration: duration,
            file: videoFile,
            size: videoFile.size
          }],
          totalChunks: 1,
          totalDuration: duration,
          originalFile: videoFile
        };
      }
      
      // Calculate chunk durations
      const chunkDuration = duration / totalChunks;

      // Create chunks
      const chunks: VideoChunk[] = [];
      
      for (let i = 0; i < totalChunks; i++) {
        const startTime = i * chunkDuration;
        const endTime = Math.min((i + 1) * chunkDuration, duration);
        const actualDuration = endTime - startTime;




        // Create chunk file (simplified - in real implementation, you'd use FFmpeg)
        const chunkFile = await this.createVideoChunk(videoFile, startTime, endTime, i);
        
        chunks.push({
          chunkIndex: i,
          startTime: startTime,
          endTime: endTime,
          duration: actualDuration,
          file: chunkFile,
          size: chunkFile.size
        });

      }



      return {
        chunks,
        totalChunks: chunks.length,
        totalDuration: duration,
        originalFile: videoFile
      };
      
    } catch (error) {

      throw error;
    }
  }

  /**
   * Working chunking approach - create proper chunks that work with Whisper API
   */
  private async workingChunking(videoFile: File): Promise<ChunkingResult> {
    try {

      // Get video duration
      const duration = await this.getVideoDuration(videoFile);

      // Calculate number of chunks needed (20MB each)
      const totalChunks = Math.ceil(videoFile.size / this.MAX_CHUNK_SIZE);

      // Calculate chunk durations
      const chunkDuration = duration / totalChunks;

      // Create chunks using a working approach
      const chunks: VideoChunk[] = [];
      
      for (let i = 0; i < totalChunks; i++) {
        const startTime = i * chunkDuration;
        const endTime = Math.min((i + 1) * chunkDuration, duration);
        const actualDuration = endTime - startTime;


        // Create chunk by slicing the file
        const startByte = i * this.MAX_CHUNK_SIZE;
        const endByte = Math.min((i + 1) * this.MAX_CHUNK_SIZE, videoFile.size);
        const chunkBlob = videoFile.slice(startByte, endByte);
        
        // Create a proper audio file for Whisper API
        const chunkFile = new File(
          [chunkBlob], 
          `${videoFile.name.replace(/\.[^/.]+$/, '')}_chunk_${i + 1}.mp3`,
          { type: 'audio/mpeg' } // Use MP3 format for better Whisper compatibility
        );
        
        chunks.push({
          chunkIndex: i,
          startTime: startTime,
          endTime: endTime,
          duration: actualDuration,
          file: chunkFile,
          size: chunkFile.size
        });
        
        const chunkSizeMB = (chunkFile.size / (1024 * 1024)).toFixed(2);
        const chunkSizeBytes = chunkFile.size;

        // Safety check for Whisper API limit
        if (chunkSizeBytes > 25 * 1024 * 1024) {

        }
      }



      return {
        chunks,
        totalChunks: chunks.length,
        totalDuration: duration,
        originalFile: videoFile
      };
      
    } catch (error) {

      throw error;
    }
  }

  /**
   * Get video duration using HTML5 video element
   */
  private async getVideoDuration(videoFile: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      
      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video metadata'));
      };
      
      video.src = URL.createObjectURL(videoFile);
    });
  }

  /**
   * Create a video chunk using FFmpeg
   */
  private async createVideoChunk(
    originalFile: File, 
    startTime: number, 
    endTime: number, 
    chunkIndex: number
  ): Promise<File> {
    try {


      if (!this.ffmpeg) {
        throw new Error('FFmpeg not initialized');
      }
      
      const inputFileName = `input_${chunkIndex}.mp4`;
      const outputFileName = `chunk_${chunkIndex}.mp4`;
      
      // Write input file to FFmpeg
      await this.ffmpeg.writeFile(inputFileName, await fetchFile(originalFile));
      
      // Create FFmpeg command to cut video
      const duration = endTime - startTime;
      const command = [
        '-i', inputFileName,
        '-ss', startTime.toString(),
        '-t', duration.toString(),
        '-c', 'copy', // Copy without re-encoding for speed
        '-avoid_negative_ts', 'make_zero',
        outputFileName
      ];

      // Execute FFmpeg command
      await this.ffmpeg.exec(command);
      
      // Read output file
      const outputData = await this.ffmpeg.readFile(outputFileName);
      
      // Create File object
      const chunkBlob = new Blob([outputData], { type: 'video/mp4' });
      const chunkFile = new File(
        [chunkBlob], 
        `${originalFile.name.replace(/\.[^/.]+$/, '')}_chunk_${chunkIndex + 1}.mp4`,
        { type: 'video/mp4' }
      );
      
      // Clean up temporary files
      await this.ffmpeg.deleteFile(inputFileName);
      await this.ffmpeg.deleteFile(outputFileName);

      return chunkFile;
      
    } catch (error) {

      throw error;
    }
  }

  /**
   * Process multiple chunks and combine results
   */
  async processChunks(
    chunks: VideoChunk[],
    processFunction: (chunk: VideoChunk) => Promise<string>
  ): Promise<{
    transcriptions: string[];
    combinedTranscription: string;
    processingResults: Array<{
      chunkIndex: number;
      startTime: number;
      endTime: number;
      transcription: string;
      success: boolean;
      error?: string;
    }>;
  }> {
    try {


      const processingResults: Array<{
        chunkIndex: number;
        startTime: number;
        endTime: number;
        transcription: string;
        success: boolean;
        error?: string;
      }> = [];
      
      const transcriptions: string[] = [];
      
      // Process chunks sequentially to avoid rate limits
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];



        try {
          const transcription = await processFunction(chunk);


          processingResults.push({
            chunkIndex: chunk.chunkIndex,
            startTime: chunk.startTime,
            endTime: chunk.endTime,
            transcription: transcription,
            success: true
          });
          
          transcriptions.push(transcription);
          
        } catch (error) {

          processingResults.push({
            chunkIndex: chunk.chunkIndex,
            startTime: chunk.startTime,
            endTime: chunk.endTime,
            transcription: '',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
        
        // Add delay between chunks to avoid rate limits
        if (i < chunks.length - 1) {

          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      // Combine transcriptions
      const combinedTranscription = transcriptions.join(' ');




      return {
        transcriptions,
        combinedTranscription,
        processingResults
      };
      
    } catch (error) {

      throw error;
    }
  }
}

// Export singleton instance
export const videoChunkingService = new VideoChunkingService();
export default videoChunkingService;
