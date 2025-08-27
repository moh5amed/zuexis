import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Download, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { useCloudStorage } from '../hooks/useCloudStorage';
import { cloudStorageService } from '../services/cloudStorageService';
import './VideoPlayer.css';

interface VideoPlayerProps {
  videoClip: {
    id: string;
    name: string;
    cloud_file_id: string;
    cloud_provider_id: string;
    duration?: number;
    resolution?: string;
  };
  className?: string;
  showControls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoClip,
  className = '',
  showControls = true,
  autoPlay = false,
  muted = false,
  loop = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { getVideoStreamingUrl, createGoogleDriveBlobUrl } = useCloudStorage();

  // Get streaming URL when component mounts
  useEffect(() => {
    // Only get URL if we don't already have one
    if (videoUrl) return;
    
    const getVideoUrl = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log(`🎥 [VideoPlayer] Getting streaming URL for ${videoClip.cloud_provider_id}:${videoClip.cloud_file_id}`);
        const url = await getVideoStreamingUrl(videoClip.cloud_provider_id, videoClip.cloud_file_id);
        
        if (url && videoClip.cloud_provider_id !== 'google-drive') {
          // For non-Google Drive providers, use the streaming URL
          console.log(`✅ [VideoPlayer] Got streaming URL: ${url.substring(0, 50)}...`);
          setVideoUrl(url);
        } else if (videoClip.cloud_provider_id === 'google-drive') {
          // For Google Drive, always create a blob URL for CSP compliance
          console.log(`🔄 [VideoPlayer] Creating blob URL for Google Drive (CSP compliance)`);
          try {
            setError(null); // Clear any previous errors
            const blobUrl = await createGoogleDriveBlobUrl(videoClip.cloud_file_id);
            if (blobUrl) {
              console.log(`✅ [VideoPlayer] Created blob URL: ${blobUrl.substring(0, 30)}...`);
              setVideoUrl(blobUrl);
            } else {
              setError('Unable to create video stream. Please check your Google Drive connection and try again.');
            }
          } catch (blobError) {
            console.error('❌ [VideoPlayer] Error creating blob URL:', blobError);
            setError('Failed to create video stream. Please check your Google Drive connection and refresh the page.');
          }
        } else if (url) {
          // Fallback for other providers
          console.log(`✅ [VideoPlayer] Using streaming URL: ${url.substring(0, 50)}...`);
          setVideoUrl(url);
        } else {
          console.error(`❌ [VideoPlayer] No streaming URL returned`);
          setError('Unable to get video streaming URL. Please check your cloud storage connection.');
        }
      } catch (err) {
        console.error('❌ [VideoPlayer] Error getting video URL:', err);
        setError('Failed to load video. Please try refreshing the page.');
      } finally {
        setIsLoading(false);
      }
    };

    getVideoUrl();
  }, [videoClip.cloud_provider_id, videoClip.cloud_file_id, createGoogleDriveBlobUrl]);

  // Handle video metadata loaded
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };

  // Handle time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Handle play/pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle mute/unmute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  // Handle seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      if (videoUrl && videoUrl.startsWith('blob:')) {
        console.log(`🧹 [VideoPlayer] Cleaning up blob URL: ${videoUrl.substring(0, 30)}...`);
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  // Format time
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle download
  const handleDownload = async () => {
    if (!videoClip) return;
    
    try {
      // Show loading state
      setIsDownloading(true);
      
      // Use the cloud storage service for proper download
      const { success, file, error } = await cloudStorageService.downloadVideoClip(videoClip.id);
      
      if (success && file) {
        // Create download link for the file
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = videoClip.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL
        URL.revokeObjectURL(url);
        
        console.log('✅ [VideoPlayer] Download successful:', file.name);
      } else {
        console.error('❌ [VideoPlayer] Download failed:', error);
        // Fallback to direct URL download if service fails
        if (videoUrl) {
          const link = document.createElement('a');
          link.href = videoUrl;
          link.download = videoClip.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch (error) {
      console.error('❌ [VideoPlayer] Download error:', error);
      // Fallback to direct URL download
      if (videoUrl) {
        const link = document.createElement('a');
        link.href = videoUrl;
        link.download = videoClip.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle external playback
  const handleExternalPlayback = () => {
    if (videoUrl) {
      window.open(videoUrl, '_blank');
    }
  };

     if (isLoading) {
     return (
       <div className={`loading-state bg-gray-800 rounded-xl flex items-center justify-center ${className}`}>
        <div className="text-center p-8">
          <Loader2 className="h-8 w-8 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading video...</p>
        </div>
      </div>
    );
  }

     if (error) {
     return (
       <div className={`error-state bg-gray-800 rounded-xl flex items-center justify-center ${className}`}>
        <div className="text-center p-8">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 mb-2">Failed to load video</p>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
         <div 
       ref={containerRef}
       className={`video-player relative bg-black rounded-xl overflow-hidden ${className}`}
     >
             {/* Download Button Overlay */}
       <div className="absolute top-4 right-4 z-10">
         <button
           onClick={handleDownload}
           disabled={isDownloading}
           className={`download-btn px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg ${
             isDownloading 
               ? 'bg-gray-500 cursor-not-allowed' 
               : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
           } text-white`}
           title="Download video"
         >
           {isDownloading ? (
             <>
               <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
               Downloading...
             </>
           ) : (
             <>
               <Download className="h-4 w-4 inline mr-2" />
               Download
             </>
           )}
         </button>
       </div>

       {/* Video Element */}
       <video
         ref={videoRef}
         src={videoUrl || undefined}
         className="w-full h-full object-contain"
         onLoadedMetadata={handleLoadedMetadata}
         onTimeUpdate={handleTimeUpdate}
         onPlay={() => setIsPlaying(true)}
         onPause={() => setIsPlaying(false)}
         onEnded={() => setIsPlaying(false)}
         onError={(e) => {
           console.error('❌ [VideoPlayer] Video error:', e);
           setError('Video failed to load. Please check the file or try again.');
         }}
         autoPlay={autoPlay}
         muted={isMuted}
         loop={loop}
         playsInline
       />

             {/* Custom Controls Overlay */}
       {showControls && (
         <div className="controls-overlay absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          {/* Progress Bar */}
          <div className="mb-3">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #8b5cf6 ${(currentTime / (duration || 1)) * 100}%, #374151 0%)`
              }}
            />
            <div className="flex justify-between text-xs text-gray-300 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Play/Pause Button */}
                             <button
                 onClick={togglePlay}
                 className="control-button p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                 title={isPlaying ? 'Pause' : 'Play'}
               >
                {isPlaying ? (
                  <Pause className="h-4 w-4 text-white" />
                ) : (
                  <Play className="h-4 w-4 text-white" />
                )}
              </button>

              {/* Volume Control */}
              <div className="flex items-center gap-2">
                                 <button
                   onClick={toggleMute}
                   className="control-button p-1 text-gray-300 hover:text-white transition-colors"
                   title={isMuted ? 'Unmute' : 'Mute'}
                 >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
                                 <input
                   type="range"
                   min="0"
                   max="1"
                   step="0.1"
                   value={volume}
                   onChange={handleVolumeChange}
                   className="volume-control w-16 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                 />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Download Button */}
                             <button
                 onClick={handleDownload}
                 className="control-button p-2 text-gray-300 hover:text-white transition-colors"
                 title="Download video"
               >
                <Download className="h-4 w-4" />
              </button>

              {/* External Playback Button */}
                             <button
                 onClick={handleExternalPlayback}
                 className="control-button p-2 text-gray-300 hover:text-white transition-colors"
                 title="Open in new tab"
               >
                <ExternalLink className="h-4 w-4" />
              </button>

              {/* Fullscreen Button */}
                             <button
                 onClick={toggleFullscreen}
                 className="control-button p-2 text-gray-300 hover:text-white transition-colors"
                 title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
               >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

             {/* Video Info Overlay */}
       <div className="video-info absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
        <div className="text-white text-sm">
          <div className="font-medium">{videoClip.name}</div>
          {videoClip.duration && (
            <div className="text-gray-300 text-xs">
              Duration: {formatTime(videoClip.duration)}
            </div>
          )}
          {videoClip.resolution && (
            <div className="text-gray-300 text-xs">
              Resolution: {videoClip.resolution}
            </div>
          )}
        </div>
      </div>

           </div>
   );
 };
 
 export default VideoPlayer;
