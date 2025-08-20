// 🎬 VIDEO-AUDIO MERGER SERVICE
// Merges video clips with their corresponding audio clips

export interface MergedClip {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  videoData: ArrayBuffer;
  audioData: ArrayBuffer;
  mergedData: ArrayBuffer;
  transcript: string;
}

export class VideoAudioMergerService {
  public isInitialized = false;

  constructor() {
    console.log('🎬 [VideoAudioMerger] Initializing video-audio merger service...');
  }

  async initialize(): Promise<void> {
    try {
      // Check if MediaRecorder supports the formats we need
      const supportedTypes = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') 
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,vorbis')
        ? 'video/webm;codecs=vp8,vorbis'
        : 'video/webm';

      console.log(`✅ [VideoAudioMerger] Using format: ${supportedTypes}`);
      this.isInitialized = true;
      console.log('✅ [VideoAudioMerger] Video-audio merger service ready');
    } catch (error) {
      console.error('❌ [VideoAudioMerger] Initialization failed:', error);
      throw error;
    }
  }

  async mergeVideoAndAudio(
    videoClip: ArrayBuffer,
    audioClip: ArrayBuffer,
    startTime: number,
    endTime: number,
    transcript: string
  ): Promise<MergedClip> {
    if (!this.isInitialized) {
      throw new Error('Video-audio merger not initialized');
    }

    console.log(`🎬 [VideoAudioMerger] Merging video and audio for ${startTime}s - ${endTime}s`);
    
    try {
      // Create video element for the video clip
      const video = document.createElement('video');
      video.src = URL.createObjectURL(new Blob([videoClip], { type: 'video/mp4' }));
      video.preload = 'metadata';

      // Wait for video metadata
      await new Promise<void>((resolve, reject) => {
        video.addEventListener('loadedmetadata', () => resolve());
        video.addEventListener('error', () => reject(new Error('Video loading failed')));
      });

      // Create audio element for the audio clip
      const audio = document.createElement('audio');
      audio.src = URL.createObjectURL(new Blob([audioClip], { type: 'audio/wav' }));
      audio.preload = 'metadata';

      // Wait for audio metadata
      await new Promise<void>((resolve, reject) => {
        audio.addEventListener('loadedmetadata', () => resolve());
        audio.addEventListener('error', () => reject(new Error('Audio loading failed')));
      });

      // Create canvas for video processing
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Set canvas size to match video dimensions
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;

      // Create video stream from canvas
      const videoStream = canvas.captureStream(30); // 30fps

      // Create audio stream from audio element
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioSource = audioContext.createMediaElementSource(audio);
      const audioDestination = audioContext.createMediaStreamDestination();
      audioSource.connect(audioDestination);

      // Combine video and audio streams
      const combinedStream = new MediaRecorder(
        new MediaStream([
          ...videoStream.getVideoTracks(),
          ...audioDestination.stream.getAudioTracks()
        ]),
        {
          mimeType: 'video/webm;codecs=vp9,opus',
          videoBitsPerSecond: 8000000 // 8 Mbps for high quality
        }
      );

      const recordedChunks: Blob[] = [];
      
      return new Promise((resolve, reject) => {
        combinedStream.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunks.push(event.data);
          }
        };

        combinedStream.onstop = async () => {
          try {
            const mergedBlob = new Blob(recordedChunks, { type: 'video/webm' });
            const mergedArrayBuffer = await mergedBlob.arrayBuffer();

            // Cleanup
            URL.revokeObjectURL(video.src);
            URL.revokeObjectURL(audio.src);
            audioContext.close();

            const mergedClip: MergedClip = {
              id: crypto.randomUUID(),
              startTime,
              endTime,
              duration: endTime - startTime,
              videoData: videoClip,
              audioData: audioClip,
              mergedData: mergedArrayBuffer,
              transcript
            };

            console.log(`✅ [VideoAudioMerger] Successfully merged video and audio: ${mergedArrayBuffer.byteLength} bytes`);
            resolve(mergedClip);

          } catch (error) {
            reject(error);
          }
        };

        // Start recording
        combinedStream.start();

        // Process frames to merge video and audio
        this.processFramesForMerge(video, canvas, ctx, startTime, endTime, combinedStream);

      });

    } catch (error) {
      console.error('❌ [VideoAudioMerger] Merge failed:', error);
      throw error;
    }
  }

  private processFramesForMerge(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    startTime: number,
    endTime: number,
    mediaRecorder: MediaRecorder
  ) {
    const duration = endTime - startTime;
    const frameInterval = 1000 / 30; // 30fps
    let currentTime = startTime;
    let frameCount = 0;

    const processFrame = () => {
      if (currentTime >= endTime) {
        mediaRecorder.stop();
        return;
      }

      // Set video time
      video.currentTime = currentTime;

      // Wait for seek to complete
      video.addEventListener('seeked', () => {
        // Draw frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Move to next frame
        currentTime += 0.033; // 1/30 second for 30fps
        frameCount++;

        // Continue processing
        requestAnimationFrame(() => {
          setTimeout(processFrame, frameInterval);
        });
      }, { once: true });
    };

    // Start frame processing
    processFrame();
  }

  async createThumbnail(videoData: ArrayBuffer, time: number = 0): Promise<string> {
    try {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(new Blob([videoData], { type: 'video/webm' }));
      video.preload = 'metadata';

      await new Promise<void>((resolve, reject) => {
        video.addEventListener('loadedmetadata', () => resolve());
        video.addEventListener('error', () => reject(new Error('Video loading failed')));
      });

      // Set to specific time
      video.currentTime = time;

      await new Promise<void>((resolve) => {
        video.addEventListener('seeked', () => resolve(), { once: true });
      });

      // Create canvas and draw frame
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 480;
      canvas.height = 270;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

      // Cleanup
      URL.revokeObjectURL(video.src);

      return dataUrl;

    } catch (error) {
      console.error('❌ [VideoAudioMerger] Thumbnail generation failed:', error);
      throw new Error('Thumbnail generation failed');
    }
  }

  async cleanup(): Promise<void> {
    this.isInitialized = false;
    console.log('🧹 [VideoAudioMerger] Cleanup completed');
  }
}

// Export singleton instance
export const videoAudioMerger = new VideoAudioMergerService();
