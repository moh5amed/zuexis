// Enhanced Gemini Service for Smart Clip Selection
// Works with pre-analyzed video segments to select the best highlights

import { VideoSegment } from './videoProcessor';

export interface GeminiClipSuggestion {
  startTime: number;
  endTime: number;
  duration: number;
  reason: string;
  viralPotential: number;
  platformOptimization: {
    tiktok: boolean;
    youtubeShorts: boolean;
    instagram: boolean;
    twitter: boolean;
  };
  suggestedCaption: string;
  suggestedHashtags: string[];
  targetAudience: string[];
  engagementHooks: string[];
}

export interface GeminiAnalysisResult {
  selectedClips: GeminiClipSuggestion[];
  totalAnalyzed: number;
  processingTime: number;
  aiInsights: {
    contentTheme: string;
    viralElements: string[];
    audienceInsights: string[];
    platformRecommendations: string[];
  };
}

class EnhancedGeminiService {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor() {
    // Use environment variable or placeholder
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'your-gemini-api-key-here';
    this.model = 'gemini-1.5-flash';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    
    // Debug: Log API key status
    console.log('🔑 [GeminiService] API Key Status:', {
      hasEnvVar: !!import.meta.env.VITE_GEMINI_API_KEY,
      envVarValue: import.meta.env.VITE_GEMINI_API_KEY ? '***' + import.meta.env.VITE_GEMINI_API_KEY.slice(-4) : 'NOT_SET',
      finalKey: this.apiKey === 'your-gemini-api-key-here' ? 'PLACEHOLDER' : 'REAL_KEY'
    });
  }

  async analyzeVideoSegments(
    segments: VideoSegment[],
    projectTitle: string,
    targetPlatforms: string[],
    aiPrompt?: string
  ): Promise<GeminiAnalysisResult> {
    try {
      console.log('🤖 [GeminiService] Starting smart clip selection analysis...');
      console.log(`📊 [GeminiService] Analyzing ${segments.length} pre-filtered segments`);
      
      const startTime = Date.now();

      // Filter top segments (top 20-30% based on excitement score)
      const topSegments = segments
        .filter(segment => segment.isHighlight)
        .slice(0, Math.max(5, Math.floor(segments.length * 0.3)));

      console.log(`🎯 [GeminiService] Sending ${topSegments.length} top segments to Gemini for final selection`);

      // Create structured data for Gemini
      const analysisData = {
        projectTitle,
        targetPlatforms,
        userPrompt: aiPrompt || 'Find the most engaging and viral moments',
        segments: topSegments.map(segment => ({
          startTime: this.formatTime(segment.startTime),
          endTime: this.formatTime(segment.endTime),
          duration: segment.duration,
          excitementScore: segment.excitementScore,
          audioEnergy: segment.audioEnergy
        }))
      };

      // Generate Gemini prompt
      const prompt = this.generateClipSelectionPrompt(analysisData);
      
      // Call Gemini API
      const response = await this.callGeminiAPI(prompt);
      
      // Parse response
      const selectedClips = this.parseGeminiResponse(response, topSegments);
      
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ [GeminiService] Gemini analysis complete in ${processingTime}ms`);
      console.log(`🎬 [GeminiService] Selected ${selectedClips.length} final clips`);

      return {
        selectedClips,
        totalAnalyzed: topSegments.length,
        processingTime,
        aiInsights: this.extractAIInsights(response)
      };

    } catch (error) {
      console.error('❌ [GeminiService] Gemini analysis failed:', error);
      throw new Error(`Gemini analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateClipSelectionPrompt(data: any): string {
    return `You are an expert AI video editor specializing in creating viral social media content. Your task is to analyze video segments and select the most engaging moments for short-form content.

PROJECT: ${data.projectTitle}
TARGET PLATFORMS: ${data.targetPlatforms.join(', ')}
USER REQUEST: ${data.userPrompt}

VIDEO SEGMENTS TO ANALYZE:
${data.segments.map((seg: any, i: number) => 
  `${i + 1}. ${seg.startTime} - ${seg.endTime} (${seg.duration}s) | Excitement: ${(seg.excitementScore * 100).toFixed(1)}% | Audio Energy: ${(seg.audioEnergy * 100).toFixed(1)}%`
).join('\n')}

ANALYSIS CRITERIA:
- Select 3-8 segments that have the highest viral potential
- Prioritize segments with high excitement scores and audio energy
- Consider duration (prefer 15-60 seconds for social media)
- Ensure variety in content to appeal to different audience segments
- Focus on moments that can generate engagement (reactions, shares, comments)

OUTPUT FORMAT (JSON only, no other text):
{
  "selectedClips": [
    {
      "startTime": "00:00:15",
      "endTime": "00:00:45",
      "duration": 30,
      "reason": "High energy moment with clear emotional impact",
      "viralPotential": 0.9,
      "platformOptimization": {
        "tiktok": true,
        "youtubeShorts": true,
        "instagram": true,
        "twitter": false
      },
      "suggestedCaption": "This moment changed everything... 🔥",
      "suggestedHashtags": ["viral", "trending", "engagement", "content"],
      "targetAudience": ["young professionals", "content creators"],
      "engagementHooks": ["emotional reaction", "surprise element", "relatable moment"]
    }
  ],
  "aiInsights": {
    "contentTheme": "Personal transformation and growth",
    "viralElements": ["emotional storytelling", "authentic reactions", "clear takeaways"],
    "audienceInsights": ["Responds well to personal development content", "Values authenticity over polish"],
    "platformRecommendations": ["TikTok: Focus on emotional hooks", "YouTube Shorts: Emphasize educational value"]
  }
}

Remember: Output ONLY valid JSON. No explanations, no markdown, no additional text.`;
  }

  private async callGeminiAPI(prompt: string): Promise<string> {
    try {
      console.log('🌐 [GeminiService] Calling Gemini API...');
      console.log('🔑 [GeminiService] Using API Key:', this.apiKey === 'your-gemini-api-key-here' ? 'PLACEHOLDER' : '***' + this.apiKey.slice(-4));
      
      const response = await fetch(`${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
          safetySettings: [
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
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response format from Gemini API');
      }

      const content = data.candidates[0].content.parts[0].text;
      console.log('✅ [GeminiService] Gemini API call successful');
      
      return content;

    } catch (error) {
      console.error('❌ [GeminiService] Gemini API call failed:', error);
      throw error;
    }
  }

  private parseGeminiResponse(response: string, originalSegments: VideoSegment[]): GeminiClipSuggestion[] {
    try {
      console.log('🔍 [GeminiService] Parsing Gemini response...');
      
      // Extract JSON from response (handle any extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Gemini response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.selectedClips || !Array.isArray(parsed.selectedClips)) {
        throw new Error('Invalid clip selection format in Gemini response');
      }

      // Map Gemini suggestions to our format
      const selectedClips: GeminiClipSuggestion[] = parsed.selectedClips.map((clip: any) => ({
        startTime: this.parseTimeToSeconds(clip.startTime),
        endTime: this.parseTimeToSeconds(clip.endTime),
        duration: clip.duration || (this.parseTimeToSeconds(clip.endTime) - this.parseTimeToSeconds(clip.startTime)),
        reason: clip.reason || 'AI-selected highlight moment',
        viralPotential: clip.viralPotential || 0.8,
        platformOptimization: clip.platformOptimization || {
          tiktok: true,
          youtubeShorts: true,
          instagram: true,
          twitter: true
        },
        suggestedCaption: clip.suggestedCaption || 'Amazing moment! 🔥',
        suggestedHashtags: clip.suggestedHashtags || ['viral', 'trending', 'content'],
        targetAudience: clip.targetAudience || ['general audience'],
        engagementHooks: clip.engagementHooks || ['emotional impact', 'surprise element']
      }));

      console.log(`✅ [GeminiService] Successfully parsed ${selectedClips.length} clip suggestions`);
      return selectedClips;

    } catch (error) {
      console.error('❌ [GeminiService] Failed to parse Gemini response:', error);
      console.log('📝 [GeminiService] Raw response:', response);
      
      // Fallback: return basic suggestions based on excitement scores
      console.log('🔄 [GeminiService] Using fallback clip selection...');
      return this.generateFallbackClips(originalSegments);
    }
  }

  private generateFallbackClips(segments: VideoSegment[]): GeminiClipSuggestion[] {
    const topSegments = segments
      .filter(segment => segment.isHighlight)
      .slice(0, Math.min(5, segments.length));

    return topSegments.map(segment => ({
      startTime: segment.startTime,
      endTime: segment.endTime,
      duration: segment.duration,
      reason: `High excitement score: ${(segment.excitementScore * 100).toFixed(1)}%`,
      viralPotential: segment.excitementScore,
      platformOptimization: {
        tiktok: true,
        youtubeShorts: true,
        instagram: true,
        twitter: true
      },
      suggestedCaption: `Incredible moment at ${this.formatTime(segment.startTime)}! 🎬`,
      suggestedHashtags: ['viral', 'trending', 'content', 'highlights'],
      targetAudience: ['content consumers', 'social media users'],
      engagementHooks: ['high energy', 'engaging content', 'viral potential']
    }));
  }

  private extractAIInsights(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.aiInsights || {
          contentTheme: 'Engaging content with viral potential',
          viralElements: ['emotional impact', 'surprise elements', 'relatable moments'],
          audienceInsights: ['Responds to authentic content', 'Values emotional connection'],
          platformRecommendations: ['Optimize for short-form platforms', 'Focus on engagement hooks']
        };
      }
    } catch (error) {
      console.warn('⚠️ [GeminiService] Could not extract AI insights, using defaults');
    }

    return {
      contentTheme: 'Engaging content with viral potential',
      viralElements: ['emotional impact', 'surprise elements', 'relatable moments'],
      audienceInsights: ['Responds to authentic content', 'Values emotional connection'],
      platformRecommendations: ['Optimize for short-form platforms', 'Focus on engagement hooks']
    };
  }

  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private parseTimeToSeconds(timeString: string): number {
    const parts = timeString.split(':').map(Number);
    
    if (parts.length === 3) {
      // HH:MM:SS format
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      // MM:SS format
      return parts[0] * 60 + parts[1];
    } else {
      // Assume seconds
      return parts[0] || 0;
    }
  }

  // Legacy methods for backward compatibility
  async analyzeContentForClips(content: string, options: any): Promise<any> {
    console.log('🔄 [GeminiService] Using legacy method, redirecting to new architecture');
    return this.analyzeVideoSegments([], 'Legacy Content', ['general'], content);
  }

  async generateCaption(content: string, platform: string): Promise<string> {
    console.log('🔄 [GeminiService] Using legacy method, redirecting to new architecture');
    const result = await this.analyzeVideoSegments([], 'Legacy Content', [platform], content);
    return result.selectedClips[0]?.suggestedCaption || 'Amazing content! 🔥';
  }

  async generateHashtags(content: string, platform: string): Promise<string[]> {
    console.log('🔄 [GeminiService] Using legacy method, redirecting to new architecture');
    const result = await this.analyzeVideoSegments([], 'Legacy Content', [platform], content);
    return result.selectedClips[0]?.suggestedHashtags || ['viral', 'trending', 'content'];
  }
}

export const enhancedGeminiService = new EnhancedGeminiService();
