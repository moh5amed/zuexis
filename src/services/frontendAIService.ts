/**
 * Frontend AI Service - Handles Whisper API transcription and Gemini AI processing
 * Replicates the exact logic from viral_clip_backend.py
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { gstreamerVideoService, VideoChunk } from './gstreamerVideoService';

// Types matching the Python backend
export interface ViralSegment {
  start_time: number;
  end_time: number;
  duration: number;
  text: string;
  confidence: number;
  energy: number;
  pitch: number;
  sentiment: string;
  viral_score: number;
  viral_factors: string[];
  engagement_potential: string;
  content_type: string;
  emotional_impact: string;
  trending_keywords: string[];
  platform_suitability: {
    tiktok: number;
    instagram: number;
    youtube: number;
    twitter: number;
  };
}

export interface ViralClip {
  start_time: number;
  end_time: number;
  duration: number;
  viral_score: number;
  content_type: string;
  viral_factor: string;
  engagement_potential: string;
  caption: string;
  hashtags: string[];
  hook_line: string;
  call_to_action: string;
  thumbnail_suggestion: string;
  target_audience: string;
  platforms: string[];
  optimal_posting_time: string;
  cross_platform_adaptation: string;
  segment_text: string;
  reasoning: string;
  confidence_score: number;
  user_compliance_score: number;
}

export interface FrontendInputs {
  aiPrompt?: string;
  targetPlatforms?: string[];
  processingOptions?: any;
  projectName?: string;
  description?: string;
}

export interface ProcessingResult {
  success: boolean;
  clips: ViralClip[];
  transcription: string;
  analysis: any;
  error?: string;
}

class FrontendAIService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private safetySettings: any[] = [];

  constructor() {

    this.initializeGemini();

  }

  private initializeGemini() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;




    if (!apiKey) {


      return;
    }

    try {

      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        safetySettings: this.getSafetySettings()
      });


    } catch (error) {

    }
  }

  private getSafetySettings() {
    return [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH", 
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      }
    ];
  }

  /**
   * Transcribe video using OpenAI Whisper API with chunking support
   */
  async transcribeVideo(videoFile: File): Promise<string> {



    // Check if file needs chunking
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (videoFile.size > maxSize) {

      return await this.transcribeVideoWithGStreamerChunking(videoFile);
    } else {

      const transcription = await this.transcribeAudio(videoFile);




      return transcription;
    }
  }

  /**
   * Extract audio from video and create proper audio chunks
   */
  private async extractAudioChunks(videoFile: File): Promise<File[]> {
    try {

      // Create a video element to extract audio
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      return new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          try {
            // Create audio context
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = audioContext.createMediaElementSource(video);
            const destination = audioContext.createMediaStreamDestination();
            source.connect(destination);
            
            // Create MediaRecorder to capture audio
            const mediaRecorder = new MediaRecorder(destination.stream, {
              mimeType: 'audio/webm;codecs=opus'
            });
            
            const audioChunks: Blob[] = [];
            
            mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                audioChunks.push(event.data);
              }
            };
            
            mediaRecorder.onstop = () => {
              const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
              const audioFile = new File([audioBlob], 'extracted_audio.webm', { type: 'audio/webm' });

              // Now chunk the audio file
              this.chunkAudioFile(audioFile).then(resolve).catch(reject);
            };
            
            // Start recording
            mediaRecorder.start();
            
            // Play video to capture audio
            video.play();
            
            // Stop recording when video ends
            video.onended = () => {
              mediaRecorder.stop();
            };
            
            // Clean up
            window.URL.revokeObjectURL(video.src);
            
          } catch (error) {

            reject(error);
          }
        };
        
        video.onerror = () => {
          window.URL.revokeObjectURL(video.src);
          reject(new Error('Failed to load video for audio extraction'));
        };
        
        video.src = URL.createObjectURL(videoFile);
      });
      
    } catch (error) {

      throw error;
    }
  }

  /**
   * Chunk audio file into smaller pieces
   */
  private async chunkAudioFile(audioFile: File): Promise<File[]> {
    try {


      const maxChunkSize = 20 * 1024 * 1024; // 20MB chunks
      const totalChunks = Math.ceil(audioFile.size / maxChunkSize);
      const chunks: File[] = [];
      
      for (let i = 0; i < totalChunks; i++) {
        const startByte = i * maxChunkSize;
        const endByte = Math.min((i + 1) * maxChunkSize, audioFile.size);
        const chunkBlob = audioFile.slice(startByte, endByte);
        
        const chunkFile = new File(
          [chunkBlob], 
          `audio_chunk_${i + 1}.webm`,
          { type: 'audio/webm' }
        );
        
        chunks.push(chunkFile);

      }

      return chunks;
      
    } catch (error) {

      throw error;
    }
  }

  /**
   * Transcribe large video using audio chunking
   */
  private async transcribeVideoWithChunking(videoFile: File): Promise<string> {
    try {


      // Step 1: Extract audio from video and create chunks

      const audioChunks = await this.extractAudioChunks(videoFile);

      // Step 2: Process each audio chunk

      const transcriptions: string[] = [];
      
      for (let i = 0; i < audioChunks.length; i++) {
        const chunk = audioChunks[i];


        try {
          const transcription = await this.transcribeAudio(chunk);
          transcriptions.push(transcription);


        } catch (error) {

          // Continue with other chunks
        }
        
        // Add delay between chunks to avoid rate limits
        if (i < audioChunks.length - 1) {

          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      // Step 3: Combine results

      const combinedTranscription = transcriptions.join(' ');






      return combinedTranscription;
      
    } catch (error) {

      throw error;
    }
  }

  /**
   * Transcribe large video using GStreamer chunking
   */
  private async transcribeVideoWithGStreamerChunking(videoFile: File): Promise<string> {
    try {


      // Step 1: Use GStreamer to chunk the video

      const chunkingResult = await gstreamerVideoService.chunkVideo(videoFile);

      // Step 2: Process each chunk with Whisper API

      const processingResult = await gstreamerVideoService.processChunks(
        chunkingResult.chunks,
        async (chunk: VideoChunk) => {



          return await this.transcribeAudio(chunk.file);
        }
      );




      return processingResult.combinedTranscription;
      
    } catch (error) {


      return await this.transcribeVideoWithChunking(videoFile);
    }
  }

  /**
   * Process transcription with AI to get viral clips, captions, and hashtags
   */
  async processTranscriptionWithAI(transcription: string): Promise<{
    fullTranscription: string;
    viralClips: Array<{
      startTime: number;
      endTime: number;
      transcription: string;
      reason: string;
    }>;
    captions: string[];
    hashtags: string[];
  }> {
    try {




      if (!this.model) {

        throw new Error('Gemini AI model not initialized');
      }

      // Create segments from transcription

      const viralSegments = await this.extractAudioSegments(new File([], 'dummy'), transcription);

      // Process with AI

      const clips = await this.dualPassAIProcessing(viralSegments, transcription, 5);

      // Format results for the test page
      const viralClips = clips.map(clip => ({
        startTime: clip.start_time,
        endTime: clip.end_time,
        transcription: clip.segment_text,
        reason: clip.reasoning
      }));

      const captions = clips.map(clip => clip.caption);
      const hashtags = clips.flatMap(clip => clip.hashtags);







      return {
        fullTranscription: transcription,
        viralClips,
        captions,
        hashtags
      };
    } catch (error) {



      throw error;
    }
  }

  /**
   * Extract audio from video file for Whisper API
   */
  private async extractAudioFromVideo(videoFile: File): Promise<File> {
    try {


      // Try to create a proper audio file by changing the MIME type
      // This might work for some video formats that Whisper can handle
      const audioBlob = new Blob([videoFile], { type: 'audio/mp4' });
      const audioFile = new File(
        [audioBlob], 
        videoFile.name.replace(/\.[^/.]+$/, '') + '_audio.mp4',
        { type: 'audio/mp4' }
      );

      return audioFile;
      
    } catch (error) {

      throw error;
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper API
   */
  async transcribeAudio(audioFile: File): Promise<string> {
    try {

      // Check OpenAI API key
      const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;




      if (!openaiKey) {
        throw new Error('VITE_OPENAI_API_KEY not found in environment variables');
      }




      // Extract audio if it's a video file
      let processedFile = audioFile;
      if (audioFile.type.startsWith('video/')) {

        processedFile = await this.extractAudioFromVideo(audioFile);

      }
      
      // Additional safety check for chunk sizes
      const maxSize = 25 * 1024 * 1024; // 25MB in bytes
      const fileSizeMB = (audioFile.size / (1024 * 1024)).toFixed(2);
      
      if (audioFile.size > maxSize) {
        throw new Error(`File size (${fileSizeMB}MB) exceeds Whisper API limit (25MB)`);
      }
      
      // Warn if close to limit
      if (audioFile.size > 20 * 1024 * 1024) {

      }

      const formData = new FormData();
      formData.append('file', processedFile);
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');
      formData.append('response_format', 'json');





      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {

        controller.abort();
      }, 10 * 60 * 1000); // 10 minutes timeout
      
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);




      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(`Whisper API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();



      return result.text;
    } catch (error) {



      if (error instanceof Error) {
        if (error.name === 'AbortError') {

          throw new Error('Request timeout: The video file is too large or the API is taking too long to respond. Please try with a smaller video file (under 25MB).');
        } else if (error.message.includes('File too large')) {
          throw error; // Re-throw file size errors as-is
        } else if (error.message.includes('Failed to fetch')) {
          throw new Error('Network error: Unable to connect to OpenAI API. Please check your internet connection and try again.');
        }
      }
      
      throw error;
    }
  }

  /**
   * Extract audio segments from video (simplified version)
   * In a real implementation, you'd use Web Audio API or similar
   */
  async extractAudioSegments(videoFile: File, transcription: string): Promise<ViralSegment[]> {
    try {

      // For now, create segments based on transcription length
      // In a real implementation, you'd analyze the actual audio
      const words = transcription.split(' ');
      const segmentDuration = 10; // 10 seconds per segment
      const wordsPerSegment = Math.ceil(words.length / Math.ceil(words.length / 20)); // ~20 segments
      
      const segments: ViralSegment[] = [];
      
      for (let i = 0; i < words.length; i += wordsPerSegment) {
        const segmentWords = words.slice(i, i + wordsPerSegment);
        const startTime = (i / wordsPerSegment) * segmentDuration;
        const endTime = startTime + segmentDuration;
        
        segments.push({
          start_time: Math.round(startTime * 100) / 100,
          end_time: Math.round(endTime * 100) / 100,
          duration: segmentDuration,
          text: segmentWords.join(' '),
          confidence: 0.8 + Math.random() * 0.2,
          energy: Math.random(),
          pitch: Math.random(),
          sentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)],
          viral_score: Math.floor(Math.random() * 10) + 1,
          viral_factors: ['humor', 'surprise', 'emotion'],
          engagement_potential: 'high',
          content_type: 'comedy',
          emotional_impact: 'positive',
          trending_keywords: ['funny', 'viral', 'comedy'],
          platform_suitability: {
            tiktok: Math.random(),
            instagram: Math.random(),
            youtube: Math.random(),
            twitter: Math.random()
          }
        });
      }

      return segments;
    } catch (error) {

      throw error;
    }
  }

  /**
   * Dual-pass AI processing - replicates the exact Python logic
   */
  async dualPassAIProcessing(
    viralSegments: ViralSegment[], 
    fullTranscript: string, 
    numClipsRequested: number, 
    frontendInputs?: FrontendInputs
  ): Promise<ViralClip[]> {
    try {

      if (!this.model) {
        throw new Error('Gemini AI model not initialized');
      }

      // PASS 1: AI Generation

      const condensedTranscript = this.preprocessTranscriptionForAI(fullTranscript, viralSegments);
      
      const generationPrompt = this.createUltraAdvancedAIPrompt(
        condensedTranscript, 
        viralSegments, 
        numClipsRequested, 
        frontendInputs
      );



      const generationResult = await this.model.generateContent(generationPrompt);
      const generationResponse = await generationResult.response;
      const generationText = generationResponse.text();



      // Parse generation response
      const cleanedGeneration = this.cleanAIResponse(generationText);
      let generatedClips: ViralClip[] = [];
      
      if (typeof cleanedGeneration === 'object' && cleanedGeneration.selected_clips) {
        generatedClips = cleanedGeneration.selected_clips;
      } else if (typeof cleanedGeneration === 'string') {
        const parsed = JSON.parse(cleanedGeneration);
        generatedClips = parsed.selected_clips || [];
      }

      // PASS 2: Expert Review and Refinement

      const reviewPrompt = this.createExpertReviewPrompt(generatedClips, fullTranscript, frontendInputs);



      const reviewResult = await this.model.generateContent(reviewPrompt);
      const reviewResponse = await reviewResult.response;
      const reviewText = reviewResponse.text();



      // Parse review response
      const cleanedReview = this.cleanAIResponse(reviewText);
      let reviewResults: any = {};
      
      if (typeof cleanedReview === 'object' && cleanedReview.review_results) {
        reviewResults = cleanedReview.review_results;
      } else if (typeof cleanedReview === 'string') {
        const parsed = JSON.parse(cleanedReview);
        reviewResults = parsed.review_results || {};
      }
      
      const approvedClips = reviewResults.approved_clips || [];
      const refinedClips = reviewResults.refined_clips || [];
      const rejectedClips = reviewResults.rejected_clips || [];

      // Combine approved and refined clips
      let finalClips = [...approvedClips, ...refinedClips];
      
      // Ensure we have enough clips
      if (finalClips.length < numClipsRequested) {

        const fallbackClips = this.fallbackClipSelection(viralSegments, numClipsRequested - finalClips.length);
        finalClips = [...finalClips, ...fallbackClips];
      }
      
      // Limit to requested number
      finalClips = finalClips.slice(0, numClipsRequested);

      return finalClips;
      
    } catch (error) {

      // Fallback to basic selection
      return this.fallbackClipSelection(viralSegments, numClipsRequested);
    }
  }

  /**
   * Create ultra-advanced AI prompt - exact replica of Python version
   */
  private createUltraAdvancedAIPrompt(
    condensedTranscript: string, 
    viralSegments: ViralSegment[], 
    numClipsRequested: number, 
    frontendInputs?: FrontendInputs
  ): string {
    const userAIPrompt = frontendInputs?.aiPrompt || '';
    const userInstructions = this.buildStrictUserInstructions(frontendInputs);
    
    return `
🚨 **STRICT USER INSTRUCTION COMPLIANCE SYSTEM**

You are an AI content analyzer that MUST follow user instructions EXACTLY.
**USER INSTRUCTIONS ARE ABSOLUTE AND OVERRIDE ALL DEFAULT BEHAVIORS.**

📋 **USER'S SPECIFIC AI INSTRUCTIONS (MANDATORY TO FOLLOW):**
${userAIPrompt.trim() || 'No specific AI instructions provided - use standard viral content selection.'}

📊 **USER CONTEXT & REQUIREMENTS:**
${userInstructions}

🎯 **PRIMARY MISSION:**
Extract EXACTLY ${numClipsRequested} clips that follow the user's instructions above.
If user instructions conflict with viral content best practices, USER INSTRUCTIONS WIN.

📝 **TRANSCRIPT DATA:**
${condensedTranscript}

---  

🚨 **STRICT COMPLIANCE RULES:**

1. **USER INSTRUCTIONS ARE PRIORITY #1** - Follow them exactly as specified
2. **IGNORE DEFAULT VIRAL RULES** if they conflict with user instructions
3. **ADAPT SELECTION CRITERIA** to match user's specific requirements
4. **PRIORITIZE USER PREFERENCES** over generic viral content formulas

---

🧠 **SELECTION PROCESS (USER-CENTRIC):**

STEP 1: **ANALYZE USER INSTRUCTIONS**
- What specific content type does the user want?
- What style, tone, or focus areas are mentioned?
- What platforms or audiences are targeted?

STEP 2: **APPLY USER CRITERIA TO TRANSCRIPT**
- Filter segments based on user's specific requirements
- Ignore segments that don't match user instructions
- Prioritize content that aligns with user's vision

STEP 3: **VALIDATE AGAINST USER REQUIREMENTS**
- Does each selected clip meet user's criteria?
- Are the clips the type of content the user requested?
- Does the selection match user's stated preferences?

STEP 4: **QUALITY CONTROL FOR USER SATISFACTION**
- Ensure clips start/end at natural speech boundaries
- Verify content quality meets user's standards
- Confirm selection aligns with user's goals

---

🔍 **SELECTION PRIORITY (USER-FIRST):**

1. **USER INSTRUCTIONS COMPLIANCE** - Must follow exactly what user requested
2. **CONTENT RELEVANCE** - Must match user's specified content type/style
3. **TECHNICAL QUALITY** - Clean audio cuts, proper timing
4. **USER SATISFACTION** - Content that meets user's stated goals

---

🚨 **MANDATORY COMPLIANCE CHECKS:**

- ✅ Does each clip follow user's specific instructions?
- ✅ Is the content type/style what the user requested?
- ✅ Are the clips relevant to user's stated goals?
- ✅ Does the selection prioritize user preferences over generic rules?

---

✅ **REQUIRED OUTPUT FORMAT:**

{
    "selected_clips": [
        {
            "start_time": <float, 2 decimals>,
            "end_time": <float, 2 decimals>,
            "duration": <float>,
            "viral_score": <int 1-10>,
            "content_type": "<string - based on user instructions>",
            "viral_factor": "<string - why this matches user requirements>",
            "engagement_potential": "<string - how it serves user's goals>",
            "caption": "<string - optimized for user's target audience>",
            "hashtags": ["<string>", "<string>", ...],
            "hook_line": "<string - based on user's style preferences>",
            "call_to_action": "<string - aligned with user's goals>",
            "thumbnail_suggestion": "<string - matches user's aesthetic>",
            "target_audience": "<string - from user's specifications>",
            "platforms": ["<string>", "<string>", ...],
            "optimal_posting_time": "<string>",
            "cross_platform_adaptation": "<string>",
            "segment_text": "<string>",
            "reasoning": "<string - explain how this follows user instructions>",
            "confidence_score": <float 0.0-1.0>,
            "user_compliance_score": <int 1-10 - how well it follows user instructions>
        }
    ]
}

---  

🧠 **FINAL COMPLIANCE VERIFICATION:**

Before responding, verify:
- 🔴 **EVERY clip follows user's specific instructions**
- 🔴 **Content type/style matches user's requirements**
- 🔴 **Selection criteria prioritize user preferences**
- 🔴 **Output format is 100% valid JSON**

**REMEMBER: User instructions are LAW. Follow them exactly, even if they conflict with viral content best practices.**
`;
  }

  /**
   * Create expert review prompt - exact replica of Python version
   */
  private createExpertReviewPrompt(
    aiGeneratedClips: ViralClip[], 
    originalTranscript: string, 
    frontendInputs?: FrontendInputs
  ): string {
    const trendingContext = this.getTrendingContext();
    const userInstructions = this.buildUserInstructions(frontendInputs);
    
    return `
🚨 EXPERT REVIEW ROLE: 
You are a SENIOR CONTENT STRATEGIST with 20+ years of experience reviewing viral content for major platforms.
Your job is to REVIEW, VALIDATE, and REFINE the AI-generated clips to ensure maximum viral potential.

📋 REVIEW TASK:
Analyze the provided AI-generated clips and either APPROVE them as-is or REFINE them for better results.
Focus on QUALITY, ACCURACY, and VIRAL POTENTIAL.

🔍 CONTEXT FOR REVIEW:
- Trending Context: ${trendingContext}
- User Requirements: ${userInstructions}
- Original Transcript: ${originalTranscript.substring(0, 2000)}... (truncated for review)

📊 AI-GENERATED CLIPS TO REVIEW:
${JSON.stringify(aiGeneratedClips, null, 2)}

🚨 CRITICAL REVIEW CRITERIA:
1. SPEECH BOUNDARIES: Do clips start/end at natural speech breaks? (CRITICAL)
2. VIRAL POTENTIAL: Is the viral_score accurate? (Must be 9-10 for real viral potential)
3. CONTENT QUALITY: Are captions engaging and hashtags relevant?
4. PLATFORM FIT: Do clips work for the target platforms?
5. TIMING: Are durations optimal (15-60 seconds)?
6. EMOTIONAL IMPACT: Do clips have genuine emotional hooks?

✅ REVIEW RESPONSE FORMAT:

{
    "review_results": {
        "approved_clips": [
            // Clips that are perfect as-is
        ],
        "refined_clips": [
            // Clips that need minor adjustments
        ],
        "rejected_clips": [
            // Clips that don't meet standards
        ],
        "review_summary": {
            "total_reviewed": <number>,
            "approved_count": <number>,
            "refined_count": <number>,
            "rejected_count": <number>,
            "overall_quality_score": <float 0.0-1.0>,
            "recommendations": ["<string>", "<string>", ...]
        }
    }
}

🧠 EXPERT ANALYSIS FOCUS:
- Content authenticity and emotional resonance
- Platform-specific optimization opportunities
- Timing and pacing improvements
- Caption and hashtag effectiveness
- Viral potential accuracy assessment
- User instruction compliance verification

**Remember: Quality over quantity. Better to have fewer high-quality clips than many mediocre ones.**
`;
  }

  /**
   * Build strict user instructions context
   */
  private buildStrictUserInstructions(frontendInputs?: FrontendInputs): string {
    if (!frontendInputs) return 'No specific user requirements provided.';
    
    const parts = [];
    
    if (frontendInputs.projectName) {
      parts.push(`Project: ${frontendInputs.projectName}`);
    }
    
    if (frontendInputs.description) {
      parts.push(`Description: ${frontendInputs.description}`);
    }
    
    if (frontendInputs.targetPlatforms && frontendInputs.targetPlatforms.length > 0) {
      parts.push(`Target Platforms: ${frontendInputs.targetPlatforms.join(', ')}`);
    }
    
    if (frontendInputs.processingOptions) {
      const options = frontendInputs.processingOptions;
      if (options.targetDuration) parts.push(`Target Duration: ${options.targetDuration}s`);
      if (options.quality) parts.push(`Quality: ${options.quality}`);
      if (options.aiEnhancement) parts.push('AI Enhancement: Enabled');
    }
    
    return parts.length > 0 ? parts.join('\n') : 'No specific user requirements provided.';
  }

  /**
   * Build user instructions for review
   */
  private buildUserInstructions(frontendInputs?: FrontendInputs): string {
    return this.buildStrictUserInstructions(frontendInputs);
  }

  /**
   * Get trending context
   */
  private getTrendingContext(): string {
    return [
      "viral comedy moments",
      "stand up comedy highlights", 
      "funny clips",
      "viral humor",
      "comedy gold",
      "trending jokes",
      "viral content",
      "social media comedy"
    ].join(', ');
  }

  /**
   * Preprocess transcription for AI
   */
  private preprocessTranscriptionForAI(fullTranscript: string, viralSegments: ViralSegment[]): string {
    // Condense transcript to key points
    const words = fullTranscript.split(' ');
    const condensedLength = Math.min(500, words.length);
    return words.slice(0, condensedLength).join(' ');
  }

  /**
   * Clean AI response
   */
  private cleanAIResponse(responseText: string): any {
    try {
      // Remove markdown formatting
      let cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      cleaned = cleaned.replace(/```\n?/g, '');
      
      // Try to parse as JSON
      return JSON.parse(cleaned);
    } catch (error) {

      return responseText;
    }
  }

  /**
   * Fallback clip selection
   */
  private fallbackClipSelection(viralSegments: ViralSegment[], numClips: number): ViralClip[] {
    // Sort by viral score and take top clips
    const sortedSegments = viralSegments
      .sort((a, b) => b.viral_score - a.viral_score)
      .slice(0, numClips);
    
    return sortedSegments.map(segment => ({
      start_time: segment.start_time,
      end_time: segment.end_time,
      duration: segment.duration,
      viral_score: segment.viral_score,
      content_type: segment.content_type,
      viral_factor: segment.viral_factors.join(', '),
      engagement_potential: segment.engagement_potential,
      caption: `Check out this ${segment.content_type} moment!`,
      hashtags: segment.trending_keywords,
      hook_line: `You won't believe what happens next!`,
      call_to_action: 'Follow for more!',
      thumbnail_suggestion: 'Exciting moment',
      target_audience: 'General',
      platforms: ['tiktok', 'instagram'],
      optimal_posting_time: 'Evening',
      cross_platform_adaptation: 'Optimized for short-form',
      segment_text: segment.text,
      reasoning: 'Fallback selection based on viral score',
      confidence_score: 0.7,
      user_compliance_score: 6
    }));
  }

  /**
   * Main processing function
   */
  async processVideo(
    videoFile: File,
    numClips: number,
    frontendInputs?: FrontendInputs
  ): Promise<ProcessingResult> {
    try {

      // Step 1: Transcribe audio
      const transcription = await this.transcribeAudio(videoFile);

      // Step 2: Extract audio segments
      const viralSegments = await this.extractAudioSegments(videoFile, transcription);

      // Step 3: AI processing
      const clips = await this.dualPassAIProcessing(viralSegments, transcription, numClips, frontendInputs);

      return {
        success: true,
        clips,
        transcription,
        analysis: {
          segments_analyzed: viralSegments.length,
          clips_generated: clips.length,
          processing_method: 'dual_pass_ai'
        }
      };
      
    } catch (error) {

      return {
        success: false,
        clips: [],
        transcription: '',
        analysis: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const frontendAIService = new FrontendAIService();
export default frontendAIService;
