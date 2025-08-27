// 🎵 AUDIO PROCESSOR SERVICE
// Handles audio extraction, Whisper transcription, and AI analysis

export interface AudioSegment {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  transcript: string;
  confidence: number;
  language: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  keywords: string[];
  emotionalTone: string;
  audioData?: ArrayBuffer; // Optional audio data for the segment
}

export interface AudioAnalysis {
  segments: AudioSegment[];
  totalDuration: number;
  language: string;
  transcriptionQuality: number;
  averageConfidence: number;
  contentSummary: string;
  emotionalRange: number;
  speechClarity: number;
  processingTime: number;
}

export interface AudioClip {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  audioData: ArrayBuffer;
  transcript: string;
  aiInsights: {
    viralPotential: number;
    suggestedCaption: string;
    suggestedHashtags: string[];
    targetAudience: string[];
    engagementHooks: string[];
  };
}

export class AudioProcessorService {
  public isInitialized = false;
  private whisperTranscriber: any = null;

  constructor() {
    console.log('🎵 [AudioProcessor] Initializing audio processing service...');
  }

  async initialize(): Promise<void> {
    try {
      await this.initializeWhisper();
      this.isInitialized = true;
      console.log('✅ [AudioProcessor] Audio processing service ready');
    } catch (error) {
      console.error('❌ [AudioProcessor] Initialization failed:', error);
      throw error;
    }
  }

  private async initializeWhisper(): Promise<void> {
    try {
      const { WhisperTranscriber } = await import('whisper-web-transcriber');
      this.whisperTranscriber = new WhisperTranscriber();
      
      // Test the available methods
      console.log('🔍 [AudioProcessor] Whisper methods available:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.whisperTranscriber)));
      console.log('🔍 [AudioProcessor] Whisper instance properties:', Object.keys(this.whisperTranscriber));
      
      // Check for the correct methods this Whisper package uses
      if (typeof this.whisperTranscriber.startRecording === 'function' && 
          typeof this.whisperTranscriber.startTranscriptionPolling === 'function') {
        console.log('✅ [AudioProcessor] Whisper recording methods found (startRecording + startTranscriptionPolling)');
        console.log('🔍 [AudioProcessor] This appears to be a real-time Whisper package');
      } else if (typeof this.whisperTranscriber.transcribe === 'function') {
        console.log('✅ [AudioProcessor] Whisper transcribe method found');
      } else if (typeof this.whisperTranscriber.recognize === 'function') {
        console.log('✅ [AudioProcessor] Whisper recognize method found');
      } else {
        console.warn('⚠️ [AudioProcessor] No known transcription method found, using fallback');
        this.whisperTranscriber = null;
        return;
      }
      
      console.log('✅ [AudioProcessor] Whisper transcriber initialized successfully');
    } catch (error) {
      console.warn('⚠️ [AudioProcessor] Whisper not available, using fallback:', error);
      this.whisperTranscriber = null;
    }
  }

  async extractAudioFromVideo(videoFile: ArrayBuffer): Promise<ArrayBuffer> {
    console.log('🎵 [AudioProcessor] ==========================================');
    console.log('🎵 [AudioProcessor] STARTING AUDIO EXTRACTION PROCESS');
    console.log('🎵 [AudioProcessor] ==========================================');
    console.log(`🎵 [AudioProcessor] Input video size: ${videoFile.byteLength} bytes`);
    console.log(`🎵 [AudioProcessor] Timestamp: ${new Date().toISOString()}`);
    
    try {
      // STEP 1: Create video element
      console.log('🎵 [AudioProcessor] STEP 1: Creating video element...');
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true; // Mute to avoid audio feedback loops
      video.controls = false;
      video.style.display = 'none';
      
      console.log('🎵 [AudioProcessor] Video element created, setting source...');
      const videoBlob = new Blob([videoFile], { type: 'video/mp4' });
      const videoUrl = URL.createObjectURL(videoBlob);
      video.src = videoUrl;
      console.log(`🎵 [AudioProcessor] Video source set: ${videoUrl.substring(0, 50)}...`);

      // STEP 2: Wait for metadata with detailed logging
      console.log('🎵 [AudioProcessor] STEP 2: Waiting for video metadata...');
      await Promise.race([
        new Promise<void>((resolve, reject) => {
          console.log('🎵 [AudioProcessor] Setting up metadata event listeners...');
          
          const metadataHandler = () => {
            console.log('🎵 [AudioProcessor] ✅ Video metadata loaded successfully');
            console.log(`🎵 [AudioProcessor] Video duration: ${video.duration}s`);
            console.log(`🎵 [AudioProcessor] Video dimensions: ${video.videoWidth}x${video.videoHeight}`);
            console.log(`🎵 [AudioProcessor] Video readyState: ${video.readyState}`);
            resolve();
          };
          
          const errorHandler = (event: Event) => {
            console.error('🎵 [AudioProcessor] ❌ Video error event:', event);
            console.error('🎵 [AudioProcessor] Video error details:', video.error);
            reject(new Error(`Video loading failed: ${video.error?.message || 'Unknown error'}`));
          };
          
          video.addEventListener('loadedmetadata', metadataHandler, { once: true });
          video.addEventListener('error', errorHandler, { once: true });
          video.addEventListener('loadstart', () => console.log('🎵 [AudioProcessor] Video load started'));
          video.addEventListener('durationchange', () => console.log('🎵 [AudioProcessor] Video duration changed'));
          video.addEventListener('loadeddata', () => console.log('🎵 [AudioProcessor] Video data loaded'));
        }),
        new Promise<void>((_, reject) => {
          const timeoutId = setTimeout(() => {
            console.error('🎵 [AudioProcessor] ❌ Video metadata loading timeout after 10s');
            console.error('🎵 [AudioProcessor] Video readyState:', video.readyState);
            console.error('🎵 [AudioProcessor] Video networkState:', video.networkState);
            reject(new Error('Video metadata loading timeout'));
          }, 10000);
          
          // Cleanup timeout if metadata loads successfully
          video.addEventListener('loadedmetadata', () => clearTimeout(timeoutId), { once: true });
        })
      ]);

      // STEP 3: Create audio context and setup
      console.log('🎵 [AudioProcessor] STEP 3: Setting up audio context...');
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log(`🎵 [AudioProcessor] Audio context created, sample rate: ${audioContext.sampleRate}Hz`);
      
      const source = audioContext.createMediaElementSource(video);
      console.log('🎵 [AudioProcessor] Media element source created');
      
      const destination = audioContext.createMediaStreamDestination();
      console.log('🎵 [AudioProcessor] Media stream destination created');
      
      source.connect(destination);
      console.log('🎵 [AudioProcessor] Audio nodes connected');

      // STEP 4: Prepare video for playback
      console.log('🎵 [AudioProcessor] STEP 4: Preparing video for playback...');
      video.currentTime = 0;
      console.log('🎵 [AudioProcessor] Video currentTime set to 0');
      
      // Wait for video to be ready to play with detailed logging
      console.log('🎵 [AudioProcessor] Waiting for video to be ready to play...');
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('🎵 [AudioProcessor] ❌ Video play timeout after 5s');
          console.error('🎵 [AudioProcessor] Video readyState:', video.readyState);
          console.error('🎵 [AudioProcessor] Video paused:', video.paused);
          reject(new Error('Video play timeout'));
        }, 5000);
        
        const canPlayHandler = () => {
          console.log('🎵 [AudioProcessor] ✅ Video can play event fired');
          console.log(`🎵 [AudioProcessor] Video readyState: ${video.readyState}`);
          console.log(`🎵 [AudioProcessor] Video paused: ${video.paused}`);
          clearTimeout(timeout);
          resolve();
        };
        
        const playErrorHandler = (event: Event) => {
          console.error('🎵 [AudioProcessor] ❌ Video play error event:', event);
          clearTimeout(timeout);
          reject(new Error('Video play failed'));
        };
        
        video.addEventListener('canplay', canPlayHandler, { once: true });
        video.addEventListener('error', playErrorHandler, { once: true });
        video.addEventListener('canplaythrough', () => console.log('🎵 [AudioProcessor] Video can play through'));
        video.addEventListener('progress', () => console.log('🎵 [AudioProcessor] Video progress event'));
      });

      console.log('🎵 [AudioProcessor] Video ready to play, starting audio extraction...');

      // STEP 5: Start video playback with speed optimization for long videos
      console.log('🎵 [AudioProcessor] STEP 5: Starting video playback...');
      
      // Speed optimization: for videos longer than 10 minutes, increase playback rate
      const videoDuration = video.duration || 0;
      if (videoDuration > 600) { // 10 minutes
        const speedMultiplier = Math.min(4, Math.max(1, videoDuration / 300)); // 1x to 4x speed
        video.playbackRate = speedMultiplier;
        console.log(`🚀 [AudioProcessor] SPEED OPTIMIZATION: Video duration ${videoDuration}s, using ${speedMultiplier}x playback rate`);
      }
      
      try {
        const playPromise = video.play();
        console.log('🎵 [AudioProcessor] Video.play() called, waiting for promise...');
        await playPromise;
        console.log('🎵 [AudioProcessor] ✅ Video playback started successfully');
        console.log(`🎵 [AudioProcessor] Video currentTime: ${video.currentTime}s`);
        console.log(`🎵 [AudioProcessor] Video playbackRate: ${video.playbackRate}`);
      } catch (playError) {
        console.warn('⚠️ [AudioProcessor] Video play failed, continuing with audio extraction:', playError);
        console.warn('🎵 [AudioProcessor] Video play error details:', {
          name: (playError as Error).name,
          message: (playError as Error).message,
          stack: (playError as Error).stack
        });
      }

      // STEP 6: Create MediaRecorder with fallback mime types
      console.log('🎵 [AudioProcessor] STEP 6: Creating MediaRecorder...');
      let mediaRecorder: MediaRecorder | null = null;
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm;codecs=vorbis',
        'audio/webm',
        'audio/mp4'
      ];

      console.log('🎵 [AudioProcessor] Testing supported MIME types...');
      for (const mimeType of mimeTypes) {
        const isSupported = MediaRecorder.isTypeSupported(mimeType);
        console.log(`🎵 [AudioProcessor] MIME type ${mimeType}: ${isSupported ? '✅ SUPPORTED' : '❌ NOT SUPPORTED'}`);
        
        if (isSupported && !mediaRecorder) {
          try {
            mediaRecorder = new MediaRecorder(destination.stream, { mimeType });
            console.log(`🎵 [AudioProcessor] ✅ MediaRecorder created with MIME type: ${mimeType}`);
            break;
          } catch (recorderError) {
            console.warn(`🎵 [AudioProcessor] ⚠️ Failed to create MediaRecorder with ${mimeType}:`, recorderError);
          }
        }
      }

      if (!mediaRecorder) {
        throw new Error('No supported audio format found - all MIME types failed');
      }

      // STEP 7: Setup MediaRecorder event handlers
      console.log('🎵 [AudioProcessor] STEP 7: Setting up MediaRecorder event handlers...');
      const audioChunks: Blob[] = [];
      let isRecording = false;
      let recordingStartTime = 0;
      
      return new Promise((resolve, reject) => {
                 // Setup timeout for extraction - allow up to 30 minutes for long videos
         const maxExtractionTime = Math.min(1800000, (video.duration || 60) * 1000 + 60000); // 30 minutes max, or video duration + 60s
         console.log(`🎵 [AudioProcessor] Setting extraction timeout: ${maxExtractionTime}ms (${Math.round(maxExtractionTime/1000)}s)`);
         
         const extractionTimeout = setTimeout(() => {
           if (isRecording) {
             console.warn('⚠️ [AudioProcessor] Audio extraction timeout, stopping recording');
             console.warn(`🎵 [AudioProcessor] Recording duration: ${Date.now() - recordingStartTime}ms`);
             mediaRecorder!.stop();
           }
         }, maxExtractionTime);

        // Data available handler
        mediaRecorder.ondataavailable = (event) => {
          console.log(`🎵 [AudioProcessor] 📊 Data available event: size=${event.data.size}, type=${event.data.type}`);
          if (event.data.size > 0) {
            audioChunks.push(event.data);
            console.log(`🎵 [AudioProcessor] ✅ Audio chunk ${audioChunks.length} added: ${event.data.size} bytes`);
          } else {
            console.warn('🎵 [AudioProcessor] ⚠️ Empty data chunk received');
          }
        };

        // Recording start handler
        mediaRecorder.onstart = () => {
          isRecording = true;
          recordingStartTime = Date.now();
          console.log('🎵 [AudioProcessor] ✅ Audio recording started');
          console.log(`🎵 [AudioProcessor] Recording start time: ${new Date(recordingStartTime).toISOString()}`);
          console.log(`🎵 [AudioProcessor] MediaRecorder state: ${mediaRecorder.state}`);
        };

        // Recording stop handler
        mediaRecorder.onstop = async () => {
          const recordingDuration = Date.now() - recordingStartTime;
          isRecording = false;
          clearTimeout(extractionTimeout);
          
          console.log('🎵 [AudioProcessor] 🛑 Audio recording stopped');
          console.log(`🎵 [AudioProcessor] Recording duration: ${recordingDuration}ms`);
          console.log(`🎵 [AudioProcessor] Total chunks recorded: ${audioChunks.length}`);
          console.log(`🎵 [AudioProcessor] Total audio data: ${audioChunks.reduce((sum, chunk) => sum + chunk.size, 0)} bytes`);
          
          try {
            if (audioChunks.length === 0) {
              throw new Error('No audio data recorded - all chunks were empty');
            }

            console.log('🎵 [AudioProcessor] Processing recorded audio chunks...');
            const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
            console.log(`🎵 [AudioProcessor] Audio blob created: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
            
            const audioBuffer = await audioBlob.arrayBuffer();
            console.log(`🎵 [AudioProcessor] Audio buffer created: ${audioBuffer.byteLength} bytes`);
            
            // Cleanup
            console.log('🎵 [AudioProcessor] Cleaning up resources...');
            video.pause();
            video.removeAttribute('src');
            video.load();
            URL.revokeObjectURL(videoUrl);
            audioContext.close();
            
            console.log(`✅ [AudioProcessor] Audio extracted successfully: ${audioBuffer.byteLength} bytes`);
            console.log('🎵 [AudioProcessor] ==========================================');
            console.log('🎵 [AudioProcessor] AUDIO EXTRACTION COMPLETED SUCCESSFULLY');
            console.log('🎵 [AudioProcessor] ==========================================');
            resolve(audioBuffer);
            
                      } catch (error) {
              console.error('❌ [AudioProcessor] Audio processing failed:', error);
              console.error('🎵 [AudioProcessor] Error details:', {
                name: (error as Error).name,
                message: (error as Error).message,
                stack: (error as Error).stack
              });
              reject(error);
            }
        };

        // Error handler
        mediaRecorder.onerror = (event) => {
          console.error('❌ [AudioProcessor] MediaRecorder error event:', event);
          console.error('🎵 [AudioProcessor] MediaRecorder error details:', {
            state: mediaRecorder.state
          });
          reject(new Error(`MediaRecorder error: ${event.type || 'Unknown error'}`));
        };

                 // Start recording - optimized for speed: smaller chunks, faster processing
         console.log('🎵 [AudioProcessor] Starting MediaRecorder...');
         mediaRecorder.start(500); // Record in 500ms chunks for faster processing
         console.log(`🎵 [AudioProcessor] MediaRecorder started with ${500}ms timeslice`);
        
        // Setup recording stop conditions
        const stopRecording = () => {
          if (isRecording && mediaRecorder.state === 'recording') {
            console.log('🎵 [AudioProcessor] 🛑 Stopping audio recording via stop condition');
            mediaRecorder.stop();
          } else {
            console.log(`🎵 [AudioProcessor] Stop condition triggered but not recording: isRecording=${isRecording}, state=${mediaRecorder.state}`);
          }
        };

        // Stop when video ends
        video.addEventListener('ended', () => {
          console.log('🎵 [AudioProcessor] 🎬 Video ended event fired, stopping recording');
          stopRecording();
        }, { once: true });
        
        // Fallback: stop after video duration + buffer
        const videoDuration = video.duration || 60;
        const fallbackTimeout = (videoDuration * 1000) + 5000;
        console.log(`🎵 [AudioProcessor] Setting fallback timeout: ${fallbackTimeout}ms (video duration: ${videoDuration}s + 5s buffer)`);
        
        setTimeout(() => {
          console.log('🎵 [AudioProcessor] ⏰ Fallback timeout reached, stopping recording');
          stopRecording();
        }, fallbackTimeout);

                 // Monitor recording progress - optimized for speed: more frequent updates
         let progressInterval = setInterval(() => {
           if (isRecording) {
             const elapsed = Date.now() - recordingStartTime;
             const totalSize = audioChunks.reduce((sum, chunk) => sum + chunk.size, 0);
             const chunksPerSecond = audioChunks.length / (elapsed / 1000);
             console.log(`🎵 [AudioProcessor] 📊 Recording progress: ${elapsed}ms elapsed, ${audioChunks.length} chunks, ${totalSize} bytes, ${chunksPerSecond.toFixed(1)} chunks/sec`);
           } else {
             clearInterval(progressInterval);
           }
         }, 1000); // Update every second for better monitoring

      });

    } catch (error) {
      console.error('❌ [AudioProcessor] Audio extraction failed:', error);
      console.error('🎵 [AudioProcessor] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      console.error('🎵 [AudioProcessor] ==========================================');
      console.error('🎵 [AudioProcessor] AUDIO EXTRACTION FAILED');
      console.error('🎵 [AudioProcessor] ==========================================');
      throw error;
    }
  }

  async transcribeAudio(audioData: ArrayBuffer): Promise<AudioAnalysis> {
    console.log('🎵 [AudioProcessor] Starting audio transcription...');
    
    try {
      if (!this.whisperTranscriber) {
        console.log('⚠️ [AudioProcessor] Whisper not available, using fallback transcription');
        return this.createFallbackTranscription(audioData);
      }

      const audioBlob = new Blob([audioData], { type: 'audio/webm' });
      
      // Try different method names that Whisper packages might use
      let transcription: any;
      
      if (typeof this.whisperTranscriber.startRecording === 'function' && 
          typeof this.whisperTranscriber.startTranscriptionPolling === 'function') {
        console.log('🎵 [AudioProcessor] Using real-time Whisper methods...');
        
        // This is a real-time Whisper package - we need to handle it differently
        try {
          // Initialize the real-time transcription
          await this.whisperTranscriber.initialize();
          console.log('🎵 [AudioProcessor] Real-time Whisper initialized');
          
          // For real-time Whisper, we'll use a different approach
          // Since we have pre-recorded audio, we'll use the fallback for now
          console.log('🎵 [AudioProcessor] Real-time Whisper detected but pre-recorded audio provided - using fallback');
          return this.createFallbackTranscription(audioData);
          
        } catch (rtError) {
          console.warn('🎵 [AudioProcessor] Real-time Whisper initialization failed:', rtError);
          return this.createFallbackTranscription(audioData);
        }
        
      } else if (typeof this.whisperTranscriber.transcribe === 'function') {
        console.log('🎵 [AudioProcessor] Using transcribe method...');
        transcription = await this.whisperTranscriber.transcribe(audioBlob);
        
      } else if (typeof this.whisperTranscriber.recognize === 'function') {
        console.log('🎵 [AudioProcessor] Using recognize method...');
        transcription = await this.whisperTranscriber.recognize(audioBlob);
        
      } else {
        throw new Error('No transcription method available on Whisper instance');
      }
      
      if (transcription) {
        console.log('✅ [AudioProcessor] Whisper transcription complete');
        console.log('🔍 [AudioProcessor] Transcription result structure:', Object.keys(transcription || {}));
        
        const segments = this.parseWhisperResults(transcription);
        
        return {
          segments,
          totalDuration: this.calculateTotalDuration(segments),
          language: this.detectLanguage(segments),
          transcriptionQuality: this.calculateTranscriptionQuality(segments),
          averageConfidence: this.calculateAverageConfidence(segments),
          contentSummary: this.generateContentSummary(segments),
          emotionalRange: this.calculateEmotionalRange(segments),
          speechClarity: this.calculateSpeechClarity(segments),
          processingTime: Date.now()
        };
      }
      
      throw new Error('Transcription returned no results');

    } catch (error) {
      console.error('❌ [AudioProcessor] Transcription failed:', error);
      console.error('🎵 [AudioProcessor] Error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      return this.createFallbackTranscription(audioData);
    }
  }

  private createFallbackTranscription(audioData: ArrayBuffer): AudioAnalysis {
    const estimatedDuration = Math.max(10, audioData.byteLength / 10000);
    
    const segments: AudioSegment[] = [
      {
        id: 'fallback-segment-1',
        startTime: 0,
        endTime: estimatedDuration / 2,
        duration: estimatedDuration / 2,
        transcript: 'Audio content detected',
        confidence: 0.6,
        language: 'en',
        sentiment: 'neutral',
        keywords: ['audio', 'content'],
        emotionalTone: 'neutral'
      }
    ];

    return {
      segments,
      totalDuration: estimatedDuration,
      language: 'en',
      transcriptionQuality: 0.6,
      averageConfidence: 0.6,
      contentSummary: 'Audio content detected with fallback transcription',
      emotionalRange: 0.5,
      speechClarity: 0.6,
      processingTime: Date.now()
    };
  }

  private parseWhisperResults(transcription: any): AudioSegment[] {
    const segments: AudioSegment[] = [];
    
    if (transcription && transcription.segments) {
      transcription.segments.forEach((segment: any, index: number) => {
        segments.push({
          id: `audio-segment-${index}`,
          startTime: segment.start || 0,
          endTime: segment.end || 0,
          duration: (segment.end || 0) - (segment.start || 0),
          transcript: segment.text || '',
          confidence: segment.confidence || 0.8,
          language: segment.language || 'en',
          sentiment: this.analyzeSentiment(segment.text || ''),
          keywords: this.extractKeywords(segment.text || ''),
          emotionalTone: this.analyzeEmotionalTone(segment.text || '')
        });
      });
    }

    return segments;
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['good', 'great', 'amazing', 'awesome', 'excellent'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disgusting'];
    
    const lowerText = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) positiveCount++;
    });
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) negativeCount++;
    });
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at'];
    
    return words
      .filter(word => word.length > 3 && !stopWords.includes(word))
      .slice(0, 5);
  }

  private analyzeEmotionalTone(text: string): string {
    const emotionalWords = {
      'excited': ['wow', 'amazing', 'incredible', 'unbelievable'],
      'calm': ['peaceful', 'quiet', 'gentle', 'soft'],
      'energetic': ['fast', 'quick', 'dynamic', 'powerful']
    };
    
    const lowerText = text.toLowerCase();
    
    for (const [tone, words] of Object.entries(emotionalWords)) {
      if (words.some(word => lowerText.includes(word))) {
        return tone;
      }
    }
    
    return 'neutral';
  }

  private calculateTotalDuration(segments: AudioSegment[]): number {
    if (segments.length === 0) return 0;
    return Math.max(...segments.map(s => s.endTime));
  }

  private detectLanguage(segments: AudioSegment[]): string {
    if (segments.length === 0) return 'en';
    return segments[0].language || 'en';
  }

  private calculateTranscriptionQuality(segments: AudioSegment[]): number {
    if (segments.length === 0) return 0;
    const avgConfidence = segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length;
    return Math.min(1, avgConfidence * 1.2);
  }

  private calculateAverageConfidence(segments: AudioSegment[]): number {
    if (segments.length === 0) return 0;
    return segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length;
  }

  private generateContentSummary(segments: AudioSegment[]): string {
    if (segments.length === 0) return 'No content detected';
    const transcripts = segments.map(s => s.transcript).join(' ');
    const words = transcripts.split(/\s+/).slice(0, 20);
    return words.join(' ') + (words.length >= 20 ? '...' : '');
  }

  private calculateEmotionalRange(segments: AudioSegment[]): number {
    if (segments.length === 0) return 0;
    const sentiments = segments.map(s => s.sentiment);
    const uniqueSentiments = new Set(sentiments);
    return uniqueSentiments.size / 3;
  }

  private calculateSpeechClarity(segments: AudioSegment[]): number {
    if (segments.length === 0) return 0;
    const avgConfidence = segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length;
    return avgConfidence;
  }

  async createAudioClip(
    audioData: ArrayBuffer,
    startTime: number,
    endTime: number
  ): Promise<ArrayBuffer> {
    console.log(`🎵 [AudioProcessor] Creating audio clip from ${startTime}s to ${endTime}s`);
    console.log(`🎵 [AudioProcessor] Input audio data: ${audioData.byteLength} bytes, startTime: ${startTime}s, endTime: ${endTime}s`);
    
    try {
      // Check if ArrayBuffer is detached
      if (audioData.byteLength === 0) {
        throw new Error('ArrayBuffer is detached or empty');
      }
      
      // Create a copy of the ArrayBuffer to prevent detachment issues
      const audioDataCopy = audioData.slice(0);
      console.log(`🎵 [AudioProcessor] Created copy of audio data: ${audioDataCopy.byteLength} bytes`);
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log(`🎵 [AudioProcessor] Audio context created with sample rate: ${audioContext.sampleRate}Hz`);
      
      const audioBuffer = await audioContext.decodeAudioData(audioDataCopy);
      console.log(`🎵 [AudioProcessor] Audio decoded: ${audioBuffer.length} samples, ${audioBuffer.numberOfChannels} channels`);
      
      const startSample = Math.floor(startTime * audioBuffer.sampleRate);
      const endSample = Math.floor(endTime * audioBuffer.sampleRate);
      const clipLength = endSample - startSample;
      
      console.log(`🎵 [AudioProcessor] Creating clip: samples ${startSample} to ${endSample}, length: ${clipLength}`);
      
      if (clipLength <= 0) {
        throw new Error(`Invalid clip length: ${clipLength} samples`);
      }
      
      const clipBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        clipLength,
        audioBuffer.sampleRate
      );
      
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        const clipChannelData = clipBuffer.getChannelData(channel);
        
        for (let i = 0; i < clipLength; i++) {
          clipChannelData[i] = channelData[startSample + i];
        }
      }
      
      const clipArrayBuffer = await this.audioBufferToArrayBuffer(clipBuffer);
      console.log(`✅ [AudioProcessor] Audio clip created: ${clipArrayBuffer.byteLength} bytes`);
      return clipArrayBuffer;
      
    } catch (error) {
      console.error('❌ [AudioProcessor] Audio clip creation failed:', error);
      console.error('🎵 [AudioProcessor] Error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      
      // Return a minimal fallback audio clip
      console.log('🎵 [AudioProcessor] Creating fallback audio clip...');
      const fallbackDuration = Math.max(1, endTime - startTime);
      const fallbackSamples = Math.floor(fallbackDuration * 44100); // 44.1kHz
      const fallbackBuffer = new ArrayBuffer(fallbackSamples * 2); // 16-bit
      const view = new Int16Array(fallbackBuffer);
      
      // Fill with silence
      for (let i = 0; i < fallbackSamples; i++) {
        view[i] = 0;
      }
      
      console.log(`🎵 [AudioProcessor] Fallback audio clip created: ${fallbackBuffer.byteLength} bytes`);
      return fallbackBuffer;
    }
  }

  private async audioBufferToArrayBuffer(audioBuffer: AudioBuffer): Promise<ArrayBuffer> {
    const length = audioBuffer.length;
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);
    
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return arrayBuffer;
  }

  async cleanup(): Promise<void> {
    this.isInitialized = false;
    this.whisperTranscriber = null;
    console.log('🧹 [AudioProcessor] Cleanup completed');
  }
}

export const audioProcessor = new AudioProcessorService();
