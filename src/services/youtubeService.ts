// YouTube Service for URL validation, metadata extraction, and video processing
// This service handles YouTube links and extracts video information

export interface YouTubeVideoMetadata {
  id: string;
  title: string;
  description: string;
  duration: number; // in seconds
  thumbnail: string;
  channelTitle: string;
  viewCount: number;
  publishedAt: string;
  tags: string[];
  categoryId: string;
  defaultLanguage?: string;
  defaultAudioLanguage?: string;
}

export interface YouTubeValidationResult {
  isValid: boolean;
  videoId?: string;
  error?: string;
}

export class YouTubeService {
  private static readonly YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|v\/|shorts\/)?([a-zA-Z0-9_-]{11})/;

  /**
   * Validates if a URL is a valid YouTube video URL
   */
  static validateYouTubeUrl(url: string): YouTubeValidationResult {
    const match = url.match(this.YOUTUBE_REGEX);
    
    if (!match) {
      return {
        isValid: false,
        error: 'Please enter a valid YouTube video URL'
      };
    }

    const videoId = match[5];
    if (!videoId || videoId.length !== 11) {
      return {
        isValid: false,
        error: 'Invalid YouTube video ID'
      };
    }

    return {
      isValid: true,
      videoId
    };
  }

  /**
   * Extracts video ID from YouTube URL
   */
  static extractVideoId(url: string): string | null {
    const match = url.match(this.YOUTUBE_REGEX);
    return match ? match[5] : null;
  }

  /**
   * Generates YouTube embed URL
   */
  static getEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}`;
  }

  /**
   * Generates YouTube thumbnail URL
   */
  static getThumbnailUrl(videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'medium'): string {
    const qualities = {
      default: 'default.jpg',
      medium: 'mqdefault.jpg',
      high: 'hqdefault.jpg',
      maxres: 'maxresdefault.jpg'
    };
    
    return `https://img.youtube.com/vi/${videoId}/${qualities[quality]}`;
  }

  /**
   * Generates YouTube watch URL
   */
  static getWatchUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  /**
   * Formats duration from seconds to human readable format
   */
  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Validates if video duration is within acceptable limits
   */
  static validateVideoDuration(duration: number, maxDuration: number = 3600): boolean {
    return duration > 0 && duration <= maxDuration;
  }

  /**
   * Checks if video is from a supported platform
   */
  static isSupportedPlatform(url: string): boolean {
    return this.validateYouTubeUrl(url).isValid;
  }
}
