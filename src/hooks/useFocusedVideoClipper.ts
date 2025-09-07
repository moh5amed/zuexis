import { useState, useCallback } from 'react';
import { focusedVideoClipperService, FocusedVideoClipperProcessingResult } from '../services/focusedVideoClipperService';
import { ProcessingOptions } from '../services/aiProcessor';

interface UseFocusedVideoClipperReturn {
  isConnected: boolean;
  isProcessing: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastError: string | null;
  progressMessage: string;
  estimatedTimeRemaining: number | null;
  testConnection: () => Promise<boolean>;
  processVideo: (projectData: {
    projectName: string;
    description: string;
    sourceType: 'file' | 'url' | 'text';
    videoFile?: File | string;
    sourceUrl?: string;
    sourceText?: string;
    targetPlatforms: string[];
    aiPrompt: string;
    processingOptions: ProcessingOptions;
    numClips?: number;
  }, onProgress?: (progress: any) => void) => Promise<FocusedVideoClipperProcessingResult | null>;
  downloadClip: (filename: string) => Promise<Blob | null>;
  getTranscription: (filename: string) => Promise<string | null>;
  getAnalysis: (filename: string) => Promise<any | null>;
  getConnectionStatus: () => boolean;
}

export const useFocusedVideoClipper = (): UseFocusedVideoClipperReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);

  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      setConnectionStatus('connecting');
      console.log('🔌 [useFocusedVideoClipper] Testing connection to focused video clipper backend...');
      
      const connected = await focusedVideoClipperService.testConnection();
      
      if (connected) {
        setIsConnected(true);
        setConnectionStatus('connected');
        console.log('✅ [useFocusedVideoClipper] Focused video clipper backend connected successfully');
      } else {
        setIsConnected(false);
        setConnectionStatus('error');
        console.error('❌ [useFocusedVideoClipper] Focused video clipper backend connection failed');
      }
      
      return connected;
    } catch (error) {
      console.error('❌ [useFocusedVideoClipper] Connection test error:', error);
      setIsConnected(false);
      setConnectionStatus('error');
      return false;
    }
  }, []);

  // Function to poll processing status
  const pollProcessingStatus = useCallback(async (processingId: string): Promise<{ success: boolean; message: string; error?: string }> => {
    const maxPollingTime = 30 * 60 * 1000; // 30 minutes max polling
    const pollInterval = 5000; // Poll every 5 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxPollingTime) {
      try {
        const response = await fetch(`${import.meta.env.VITE_FOCUSED_BACKEND_URL || 'https://farmguard5.onrender.com'}/api/processing-status/${processingId}`);
        const status = await response.json();
        
        if (status.status === 'completed') {
          console.log('✅ [useFocusedVideoClipper] Processing completed successfully');
          setProgressMessage('Video processing completed successfully!');
          
          // Transform the result to match the expected interface
          const result = status.result;
          if (result && result.clips) {
            const transformedResult = {
              success: true,
              message: result.message,
              projectName: result.project_name,
              clipsGenerated: result.clips_generated,
              clips: result.clips.map((clip: any, index: number) => ({
                id: clip.id || `clip_${index + 1}`,
                clip_number: clip.clip_number || index + 1,
                filename: clip.filename,
                filepath: clip.filepath,
                videoData: clip.videoData, // Base64 video data
                start_time: clip.start_time || 0,
                end_time: clip.end_time || 30,
                duration: clip.duration || 30,
                viral_score: clip.viral_score || 8,
                content_type: clip.content_type || 'viral',
                caption: clip.caption || `Viral clip ${index + 1}`,
                hashtags: clip.hashtags || ['viral', 'trending', 'amazing'],
                target_audience: clip.target_audience || 'general',
                platforms: clip.platforms || ['tiktok', 'instagram', 'youtube'],
                segment_text: clip.segment_text || `Clip ${index + 1} content`,
                transcription: clip.transcription || '', // Individual clip transcription
                viral_potential: clip.viral_potential || 8,
                engagement: clip.engagement || 7,
                story_value: clip.story_value || 8,
                audio_impact: clip.audio_impact || 7,
                download_url: clip.download_url
              })),
              transcription: result.transcription,
              fullVideoTranscription: result.transcription,
              processing_options: result.processing_options,
              processing_time: result.processing_time
            };
            
            return transformedResult;
          } else {
            return { 
              success: true, 
              message: 'Video processing completed successfully',
              result: result 
            };
          }
        } else if (status.status === 'failed') {
          console.error('❌ [useFocusedVideoClipper] Processing failed:', status.error);
          setProgressMessage(`Processing failed: ${status.error}`);
          return { 
            success: false, 
            error: status.error || 'Processing failed' 
          };
        } else {
          // Update progress
          const progress = status.progress || 0;
          const currentStep = status.current_step || 'processing';
          const elapsedTime = status.elapsed_time || 0;
          
          setProgressMessage(`${currentStep.replace('_', ' ')}... ${progress}% (${Math.round(elapsedTime)}s elapsed)`);
          
          // Wait before next poll
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
      } catch (error) {
        console.error('❌ [useFocusedVideoClipper] Error polling status:', error);
        // Continue polling even if one request fails
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    // Timeout reached
    console.error('⏰ [useFocusedVideoClipper] Processing status polling timeout');
    setProgressMessage('Processing is taking longer than expected. Please check back later.');
    return { 
      success: false, 
      error: 'Processing timeout - please check back later' 
    };
  }, []);

  const processVideo = useCallback(async (projectData: {
    projectName: string;
    description: string;
    sourceType: 'file' | 'url' | 'text';
    videoFile?: File | string;
    sourceUrl?: string;
    sourceText?: string;
    targetPlatforms: string[];
    aiPrompt: string;
    processingOptions: ProcessingOptions;
    numClips?: number;
  }, onProgress?: (progress: any) => void): Promise<FocusedVideoClipperProcessingResult | null> => {
    // Create abort controller for timeout management
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('⏰ [useFocusedVideoClipper] Operation timeout reached, aborting...');
      abortController.abort();
    }, 30 * 60 * 1000); // 30 minute timeout

    try {
      if (!isConnected) {
        console.log('🔌 [useFocusedVideoClipper] Testing connection before processing...');
        const connected = await testConnection();
        if (!connected) {
          throw new Error('Focused video clipper backend not connected');
        }
      }

      setIsProcessing(true);
      setLastError(null);
      setProgressMessage('Starting video processing...');
      setEstimatedTimeRemaining(null);
      console.log('🎬 [useFocusedVideoClipper] Starting video processing with focused backend...');
      console.log('📊 [useFocusedVideoClipper] Project data:', projectData);
      
      // Estimate processing time based on video file size
      if (projectData.videoFile && projectData.videoFile instanceof File) {
        const fileSizeMB = projectData.videoFile.size / (1024 * 1024);
        if (fileSizeMB > 10) {
          // For large files using regular upload, estimate based on file size
          const estimatedMinutes = Math.ceil(fileSizeMB / 5) + 10; // ~5MB per minute + 10 min overhead
          setEstimatedTimeRemaining(estimatedMinutes * 60); // Convert to seconds
          setProgressMessage(`Processing large video (${fileSizeMB.toFixed(1)}MB) with regular upload. Estimated time: ${estimatedMinutes} minutes...`);
        } else {
          setEstimatedTimeRemaining(5 * 60); // 5 minutes for small files
          setProgressMessage(`Processing video (${fileSizeMB.toFixed(1)}MB). Estimated time: 5 minutes...`);
        }
      } else {
        setProgressMessage('Processing video...');
      }

      // If a local file is provided, upload directly to backend
      if (projectData.sourceType === 'file' && projectData.videoFile instanceof File) {
        console.log('🎯 [useFocusedVideoClipper] Direct video upload to backend');
        try {
          const { cloudStorageService } = await import('../services/cloudStorageService');
          
          setProgressMessage('Uploading video to backend...');
          console.log('🚀 [useFocusedVideoClipper] Starting direct video upload to backend');
          
          // Upload directly to backend
          const uploadResult = await cloudStorageService.uploadVideoToBackend(
            projectData.videoFile,
            projectData,
            (progress) => {
              setProgressMessage(`Uploading video... ${progress}%`);
            }
          );
          
          if (uploadResult.success) {
            console.log('✅ [useFocusedVideoClipper] Direct upload complete, processing started');
            setProgressMessage('Video uploaded successfully, processing started...');
            
            // Check if we have a processing ID for status tracking
            if (uploadResult.processing_id) {
              console.log('🔄 [useFocusedVideoClipper] Starting status polling for processing ID:', uploadResult.processing_id);
              
              // Start polling for status updates
              const statusResult = await pollProcessingStatus(uploadResult.processing_id);
              return statusResult;
            } else {
              // Fallback to immediate success (for backward compatibility)
              return { success: true, message: 'Video uploaded and processing started' };
            }
          } else {
            throw new Error(uploadResult.error || 'Direct upload failed');
          }
        } catch (e) {
          console.error('❌ [useFocusedVideoClipper] Direct upload failed:', e);
          throw e;
        }
      } else {
        // For non-file sources, use regular processing
        const result = await focusedVideoClipperService.processVideo(projectData as any, onProgress);

        if (result.success && result.data) {
          console.log('✅ [useFocusedVideoClipper] Video processing completed successfully');
          console.log(`📊 [useFocusedVideoClipper] Generated ${result.data.clips_generated} clips`);
          setProgressMessage('Video processing completed!');
          setEstimatedTimeRemaining(0);
          return result.data;
        } else {
          console.error('❌ [useFocusedVideoClipper] Video processing failed:', result.error);
          setProgressMessage('');
          setEstimatedTimeRemaining(null);
          throw new Error(result.error || 'Video processing failed');
        }
      }
    } catch (error) {
      console.error('❌ [useFocusedVideoClipper] Video processing error:', error);
      setLastError(error instanceof Error ? error.message : 'Unknown error');
      setProgressMessage('');
      setEstimatedTimeRemaining(null);
      throw error;
    } finally {
      clearTimeout(timeoutId);
      setIsProcessing(false);
    }
  }, [isConnected, testConnection]);

  const downloadClip = useCallback(async (filename: string): Promise<Blob | null> => {
    try {
      console.log('📥 [useFocusedVideoClipper] Downloading clip:', filename);
      return await focusedVideoClipperService.downloadClip(filename);
    } catch (error) {
      console.error('❌ [useFocusedVideoClipper] Download error:', error);
      setLastError(error instanceof Error ? error.message : 'Download failed');
      return null;
    }
  }, []);

  const getTranscription = useCallback(async (filename: string): Promise<string | null> => {
    try {
      console.log('📝 [useFocusedVideoClipper] Getting transcription for:', filename);
      return await focusedVideoClipperService.getTranscription(filename);
    } catch (error) {
      console.error('❌ [useFocusedVideoClipper] Transcription error:', error);
      setLastError(error instanceof Error ? error.message : 'Transcription failed');
      return null;
    }
  }, []);

  const getAnalysis = useCallback(async (filename: string): Promise<any | null> => {
    try {
      console.log('📊 [useFocusedVideoClipper] Getting analysis for:', filename);
      return await focusedVideoClipperService.getAnalysis(filename);
    } catch (error) {
      console.error('❌ [useFocusedVideoClipper] Analysis error:', error);
      setLastError(error instanceof Error ? error.message : 'Analysis failed');
      return null;
    }
  }, []);

  const getConnectionStatus = useCallback((): boolean => {
    return focusedVideoClipperService.getConnectionStatus();
  }, []);

  return {
    isConnected,
    isProcessing,
    connectionStatus,
    lastError,
    progressMessage,
    estimatedTimeRemaining,
    testConnection,
    processVideo,
    downloadClip,
    getTranscription,
    getAnalysis,
    getConnectionStatus
  };
};
