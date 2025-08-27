import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  Link, 
  Type, 
  Sparkles,
  Settings,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileVideo,
  Globe,
  FileText,
  BarChart3,
  TrendingUp,
  Palette,
  Shield,
  Crown
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useToast } from '../components/ToastProvider';
import { useCloudStorage } from '../hooks/useCloudStorage';
import CloudStorageStatus from '../components/CloudStorageStatus';
import { usePythonBackend } from '../hooks/usePythonBackend';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { YouTubeService, YouTubeVideoMetadata } from '../services/youtubeService';
import { supabaseProjectsService } from '../services/supabaseProjects';
import { subscriptionService } from '../services/subscriptionService';
import SubscriptionPlanModal from '../components/SubscriptionPlanModal';
import { backendConnectionTest } from '../services/backendConnectionTest';
import LoadingScreen, { LoadingStage } from '../components/LoadingScreen';
import BackendTestPanel from '../components/BackendTestPanel';
import ChunkedUploadService from '../services/chunkedUploadService';

const UploadPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 🚀 CLOUD STORAGE INTEGRATION
  const {
    uploadVideoClip,
          connectedProviders,
      uploadClipTranscription,
      uploadFullVideoTranscription
  } = useCloudStorage();

  // 🐍 INTEGRATE PYTHON BACKEND FOR VIDEO PROCESSING
  const {
    isConnected: pythonBackendConnected,
    isProcessing: pythonBackendProcessing,
    connectionStatus: pythonBackendStatus,
    testConnection: testPythonBackend,
    processVideo,
    getLatestClips: getLatestClipsFromBackend
  } = usePythonBackend();

  // 💳 SUBSCRIPTION SYSTEM INTEGRATION
  const {
    checkProjectAccess,
  
    subscriptionStatus,
    isLoading: subscriptionLoading
  } = useSubscription();
  

  const [uploadMethod, setUploadMethod] = useState<'file' | 'url' | 'text'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>(['tiktok']);
  const [processingOptions, setProcessingOptions] = useState({
    targetDuration: 60,
    minDuration: 15,
    maxDuration: 120,
    overlap: 2,
    quality: 'medium' as 'low' | 'medium' | 'high',
    aiEnhancement: true, // Enable AI enhancement by default
    generateTranscription: true, // Enable transcription by default
    enablePerformancePrediction: true, // Enable performance prediction by default
    enableStyleAnalysis: true, // Enable style analysis by default
    enableContentModeration: true, // Enable content moderation by default
    enableTrendAnalysis: true, // Enable trend analysis by default
    enableAdvancedCaptions: true, // Enable advanced captions by default
    enableViralOptimization: true, // Enable viral optimization by default
    enableAudienceAnalysis: true, // Enable audience analysis by default
    enableCompetitorAnalysis: true, // Enable competitor analysis by default
    enableContentStrategy: true, // Enable content strategy by default
    // Smart aspect ratio handling
    preserveOriginalAspectRatio: false, // Allow platform-specific resizing
    useNormalVideoRatio: false, // Use normal video aspect ratio (no platform-specific changes)
    enableSmartCropping: true, // AI-powered content-aware cropping
    enableLetterboxing: true, // Add letterboxing for aspect ratio changes
    enableQualityPreservation: true, // Maintain video quality during resizing
    // Professional watermark options
    enableWatermark: true, // Enable watermark by default (mandatory for free tier)
    useLogo: true, // Include logo in watermark
    watermarkText: 'Made by Zuexis', // Default watermark text
    watermarkPosition: 'top-left' as 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'bottom-center' | 'top-center' | 'center',
    watermarkSize: 'extra-large' as 'small' | 'medium' | 'large' | 'extra-large',
    watermarkOpacity: 0.4 // Default opacity (40% - more transparent)
  });
  
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [backendError, setBackendError] = useState<string | null>(null);
  
  // Loading screen state
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [loadingStages, setLoadingStages] = useState<LoadingStage[]>([
    { name: 'Backend Connection Test', status: 'pending', progress: 0, message: 'Testing connection to Render backend...' },
    { name: 'Video Upload', status: 'pending', progress: 0, message: 'Preparing video for upload...' },
    { name: 'AI Analysis', status: 'pending', progress: 0, message: 'Analyzing video content with AI...' },
    { name: 'Clip Generation', status: 'pending', progress: 0, message: 'Generating viral clips...' },
    { name: 'Final Processing', status: 'pending', progress: 0, message: 'Finalizing your clips...' }
  ]);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  
  // Helper function to update loading stages
  const updateLoadingStage = (stageIndex: number, status: 'pending' | 'processing' | 'completed' | 'failed', progress: number, message: string) => {
    setLoadingStages(prev => prev.map((stage, index) => 
      index === stageIndex 
        ? { ...stage, status, progress, message }
        : stage
    ));
    
    // Update overall progress
    const totalProgress = loadingStages.reduce((sum, stage, index) => {
      if (index === stageIndex) {
        return sum + progress;
      }
      return sum + (stage.status === 'completed' ? 100 : stage.progress);
    }, 0);
    
    setOverallProgress(totalProgress / loadingStages.length);
  };
  
  // 🎥 YouTube URL handling
  const [youtubeMetadata, setYoutubeMetadata] = useState<YouTubeVideoMetadata | null>(null);
  const [youtubeValidation, setYoutubeValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: false });
  const [isLoadingYoutube, setIsLoadingYoutube] = useState(false);
  
  // Subscription popup state
  const [showSubscriptionPopup, setShowSubscriptionPopup] = useState(false);

  // Automatically test Python backend connection when page loads
  useEffect(() => {
    const autoTestConnection = async () => {
      try {
        console.log('🔄 [UploadPage] Auto-testing Python backend connection...');
        setBackendError(null); // Clear any previous errors
        
        // Show loading screen for backend test
        setShowLoadingScreen(true);
        setCurrentStageIndex(0);
        updateLoadingStage(0, 'processing', 0, 'Testing connection to Render backend...');
        
        // Run comprehensive backend connection test
        const testResult = await backendConnectionTest.runFullTest();
        
        if (testResult.success) {
          updateLoadingStage(0, 'completed', 100, 'Backend connection successful!');
          setBackendError(null);
          showToast('Backend connection successful!', 'success');
          
          // Test Python backend connection
          await testPythonBackend();
        } else {
          updateLoadingStage(0, 'failed', 0, `Backend connection failed: ${testResult.recommendations[0]}`);
          setBackendError(`Backend connection failed: ${testResult.recommendations.join(', ')}`);
          showToast('Backend connection failed', 'error');
        }
        
        // Hide loading screen after test
        setTimeout(() => setShowLoadingScreen(false), 2000);
        
      } catch (error) {
        console.error('❌ [UploadPage] Auto-connection test failed:', error);
        updateLoadingStage(0, 'failed', 0, 'Backend connection test failed');
        setBackendError('Failed to connect to Python backend. Please ensure the backend is running on https://zuexisbacckend.onrender.com');
        showToast('Python backend connection failed', 'error');
        setTimeout(() => setShowLoadingScreen(false), 2000);
      }
    };
    
    // Test connection after a short delay to ensure component is fully mounted
    const timer = setTimeout(autoTestConnection, 500);
    return () => clearTimeout(timer);
  }, [testPythonBackend, showToast]);

  // 🔐 Check authentication status when page loads
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        console.log('🔐 [Auth Check] User:', user);
        console.log('🔐 [Auth Check] Error:', error);
        
        if (error) {
          console.error('❌ [Auth Check] Authentication error:', error);
          showToast('Authentication error. Please sign in again.', 'error');
        } else if (!user) {
          console.warn('⚠️ [Auth Check] No user found');
          showToast('Please sign in to create projects', 'info');
        } else {
          console.log('✅ [Auth Check] User authenticated:', user.id);
        }
      } catch (error) {
        console.error('❌ [Auth Check] Failed to check auth:', error);
      }
    };
    
    checkAuth();
  }, [showToast]);

  // 🔐 Set current user for services when user changes
  useEffect(() => {
    if (user?.id) {
      console.log('🔐 [UploadPage] Setting current user for services:', user.id);
      supabaseProjectsService.setCurrentUser(user.id);
      subscriptionService.setCurrentUser(user.id);
    }
  }, [user]);

  // 🎥 Handle YouTube URL validation and metadata extraction
  const handleYouTubeUrlChange = async (url: string) => {
    setUrl(url);
    
    if (!url.trim()) {
      setYoutubeValidation({ isValid: false });
      setYoutubeMetadata(null);
      return;
    }

    // Validate YouTube URL
    const validation = YouTubeService.validateYouTubeUrl(url);
    setYoutubeValidation(validation);

    if (validation.isValid && validation.videoId) {
      setIsLoadingYoutube(true);
      try {
        // Extract video ID and get metadata
        const videoId = validation.videoId;
        
        // For now, we'll simulate metadata extraction
        // In a real implementation, you'd call YouTube Data API
        const mockMetadata: YouTubeVideoMetadata = {
          id: videoId,
          title: `YouTube Video (${videoId})`,
          description: 'Video description will be loaded from YouTube API',
          duration: 180, // Mock duration in seconds
          thumbnail: YouTubeService.getThumbnailUrl(videoId, 'medium'),
          channelTitle: 'Channel Name',
          viewCount: 1000,
          publishedAt: new Date().toISOString(),
          tags: ['video', 'youtube'],
          categoryId: '22'
        };
        
        setYoutubeMetadata(mockMetadata);
        console.log('✅ [UploadPage] YouTube metadata loaded:', mockMetadata);
      } catch (error) {
        console.error('❌ [UploadPage] Failed to load YouTube metadata:', error);
        setYoutubeValidation({ isValid: false, error: 'Failed to load video information' });
      } finally {
        setIsLoadingYoutube(false);
      }
    } else {
      setYoutubeMetadata(null);
    }
  };

  const platforms = [
    { 
      id: 'tiktok', 
      name: 'TikTok', 
      color: 'bg-pink-500',
      aspectRatio: '9:16',
      dimensions: '1080x1920',
      description: 'Vertical videos for maximum engagement',
      icon: '📱'
    },
    { 
      id: 'instagram', 
      name: 'Instagram', 
      color: 'bg-purple-500',
      aspectRatio: '1:1',
      dimensions: '1080x1080',
      description: 'Square format for feed and reels',
      icon: '📸'
    },
    { 
      id: 'youtube', 
      name: 'YouTube', 
      color: 'bg-red-500',
      aspectRatio: '16:9',
      dimensions: '1920x1080',
      description: 'Landscape format for shorts and videos',
      icon: '▶️'
    },
    { 
      id: 'twitter', 
      name: 'Twitter', 
      color: 'bg-blue-500',
      aspectRatio: '16:9',
      dimensions: '1920x1080',
      description: 'Landscape format for video tweets',
      icon: '🐦'
    },
    { 
      id: 'linkedin', 
      name: 'LinkedIn', 
      color: 'bg-blue-600',
      aspectRatio: '16:9',
      dimensions: '1920x1080',
      description: 'Professional landscape format',
      icon: '💼'
    }
  ];

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('video/')) {
        setFile(droppedFile);
        setUploadMethod('file');
      } else {
        showToast('Please select a video file', 'error');
      }
    }
  }, [showToast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith('video/')) {
      setFile(selectedFile);
    } else {
      showToast('Please select a valid video file', 'error');
    }
  };

  // Smart aspect ratio calculation functions
  const getPlatformAspectRatio = (platformId: string) => {
    const platform = platforms.find(p => p.id === platformId);
    return platform ? platform.aspectRatio : '16:9';
  };

  const getOptimalAspectRatio = () => {
    if (targetPlatforms.length === 0) return '16:9';
    
    // If only one platform, use its aspect ratio
    if (targetPlatforms.length === 1) {
      return getPlatformAspectRatio(targetPlatforms[0]);
    }
    
    // If multiple platforms, find the most common aspect ratio
    const aspectRatios = targetPlatforms.map(getPlatformAspectRatio);
    const counts: { [key: string]: number } = {};
    
    aspectRatios.forEach(ratio => {
      counts[ratio] = (counts[ratio] || 0) + 1;
    });
    
    // Return the most common aspect ratio
    return Object.entries(counts).reduce((a, b) => counts[a[0]] > counts[b[0]] ? a : b)[0];
  };

  const getAspectRatioInfo = () => {
    const optimalRatio = getOptimalAspectRatio();
    const selectedPlatforms = platforms.filter(p => targetPlatforms.includes(p.id));
    
    return {
      optimalRatio,
      selectedPlatforms,
      hasConflictingRatios: selectedPlatforms.some(p => p.aspectRatio !== optimalRatio),
      recommendations: selectedPlatforms.map(p => ({
        platform: p.name,
        ratio: p.aspectRatio,
        needsAdjustment: p.aspectRatio !== optimalRatio,
        adjustment: p.aspectRatio !== optimalRatio ? 
          `${p.aspectRatio} → ${optimalRatio}` : 'Perfect match'
      }))
    };
  };

  const handlePlatformToggle = (platformId: string) => {
    setTargetPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      showToast('Please enter a project title', 'error');
      return false;
    }
    
    if (targetPlatforms.length === 0) {
      showToast('Please select at least one target platform', 'error');
      return false;
    }

    if (uploadMethod === 'file' && !file) {
      showToast('Please select a video file', 'error');
      return false;
    }

    if (uploadMethod === 'url') {
      if (!url.trim()) {
        showToast('Please enter a YouTube URL', 'error');
      return false;
      }
      
      if (!youtubeValidation.isValid) {
        showToast('Please enter a valid YouTube URL', 'error');
        return false;
      }
      
      if (!youtubeMetadata) {
        showToast('Please wait for YouTube video information to load', 'error');
        return false;
      }
    }

    if (uploadMethod === 'text' && !text.trim()) {
      showToast('Please enter some text content', 'error');
      return false;
    }



    return true;
  };

  // Check subscription access before allowing project creation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check subscription limits first
    if (!await checkProjectAccess()) {
      showToast('You have reached your monthly video limit. Please upgrade your plan or wait until next month.', 'error');
      return;
    }

    if (!file && !url && !text) {
      showToast('Please provide a video file, URL, or text content', 'error');
      return;
    }

    if (!title.trim()) {
      showToast('Please enter a project title', 'error');
      return;
    }

    if (!pythonBackendConnected || backendError) {
      showToast('Cannot process video: Python backend not connected. Please fix the connection first.', 'error');
        return;
      }

    setProcessing(true);
    setProgress(0);
    setCurrentStep('Starting video processing...');

    try {
      let projectId: string;

      if (uploadMethod === 'file' && file) {
        // 🎬 Handle File Upload - Send to Python backend for processing
        console.log(`🎬 [UploadPage] Processing uploaded video: ${file.name}`);
        
        // Create project in Supabase first
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .insert([{
            title: title.trim(),
            description: description.trim() || '',
            source_type: 'file',
            user_id: user?.id,
            status: 'processing'
          }])
          .select()
          .single();

        if (projectError) {
          console.error('❌ [UploadPage] Error creating project:', projectError);
          showToast('Failed to create project', 'error');
          return;
        }

        projectId = project.id;
        console.log(`✅ [UploadPage] Project created: ${projectId}`);

        // Perform preflight check before processing
        const preflightOk = await performPreflightCheck();
        if (!preflightOk) {
          setProcessing(false);
          return;
        }
        
        // Send video to Python backend for processing
        console.log('🚀 [UploadPage] Starting video processing with Python backend...');
        
        // Prepare processing options with aspect ratio and watermark information
        const enhancedProcessingOptions = {
          ...processingOptions,
          targetAspectRatio: getOptimalAspectRatio(),
          aspectRatioOptions: {
            preserveOriginal: processingOptions.preserveOriginalAspectRatio,
            useNormalVideoRatio: processingOptions.useNormalVideoRatio,
            enableSmartCropping: processingOptions.enableSmartCropping,
            enableLetterboxing: processingOptions.enableLetterboxing,
            enableQualityPreservation: processingOptions.enableQualityPreservation
          },
          watermarkOptions: {
            enableWatermark: processingOptions.enableWatermark,
            useLogo: processingOptions.useLogo,
            watermarkText: processingOptions.watermarkText,
            watermarkPosition: processingOptions.watermarkPosition,
            watermarkSize: processingOptions.watermarkSize,
            watermarkOpacity: processingOptions.watermarkOpacity
          }
        };

        const processingResult = await processVideo({
            projectName: title.trim(),
            description: description.trim() || '',
          sourceType: 'file',
            videoFile: file,
            targetPlatforms,
          aiPrompt: aiPrompt.trim() || 'Select the most engaging and viral-worthy moments from this video. Focus on content that has high emotional impact, clear storytelling, and strong visual appeal.',
            processingOptions: enhancedProcessingOptions,
            numClips: 3
        });

        if (processingResult) {
            console.log('✅ [UploadPage] Python backend processing completed successfully');
          console.log(`📊 [UploadPage] Generated ${processingResult.clipsGenerated} clips`);
          
          // Track project creation usage
          try {
            await subscriptionService.trackProjectCreation(projectId);
            console.log(`✅ [UploadPage] Project creation usage tracked`);
          } catch (usageError) {
            console.warn(`⚠️ [UploadPage] Failed to track usage:`, usageError);
          }

          // Upload generated clips to cloud storage
          if (connectedProviders.length > 0 && processingResult.clips && processingResult.clips.length > 0) {
            console.log(`☁️ [UploadPage] Step 2: Uploading generated clips to cloud storage...`);
            
            // Show full video transcription if available
            if (processingResult.fullVideoTranscription || processingResult.transcription) {
              console.log(`📝 [UploadPage] Full video transcription available: ${(processingResult.fullVideoTranscription || processingResult.transcription || '').substring(0, 100)}...`);
            }

                const connectedProvider = connectedProviders[0];
            console.log(`☁️ [UploadPage] Uploading ${processingResult.clips.length} clips to ${connectedProvider.name}...`);
                
                let uploadedClips = 0;
            let uploadedTranscriptions = 0;

            for (const clip of processingResult.clips) {
                  try {
                    // Convert base64 video data back to File object for upload
                    if (clip.videoData) {
                      // Convert base64 to blob without using fetch (CSP-safe)
                      const base64Data = clip.videoData.split(',')[1]; // Remove data:video/mp4;base64, prefix
                      const binaryString = atob(base64Data);
                      const bytes = new Uint8Array(binaryString.length);
                      for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                      }
                      
                      const videoBlob = new Blob([bytes], { type: 'video/mp4' });
                      const clipFile = new File([videoBlob], clip.filename, { type: 'video/mp4' });
                      
                      console.log(`📤 [UploadPage] Converting clip ${clip.clip_number} to file:`, {
                        filename: clip.filename,
                        size: `${(clipFile.size / (1024 * 1024)).toFixed(2)} MB`,
                        type: clipFile.type
                      });
                      
                      const uploadResult = await uploadVideoClip(
                        connectedProvider.id,
                        clipFile,
                        projectId,
                        {
                          duration: clip.duration,
                          resolution: '1920x1080', // Default resolution for clips
                          description: `Viral clip: ${clip.caption || clip.segment_text}`
                        }
                      );
                      
                      if (uploadResult.success) {
                        uploadedClips++;
                        console.log(`✅ [UploadPage] Clip ${clip.clip_number} uploaded to cloud storage`);
                    
                    // Clip usage tracking removed - we only track videos now
                    
                    // Upload clip transcription to cloud storage if available
                    if (clip.segment_text || clip.caption) {
                      try {
                        console.log(`📝 [UploadPage] Uploading transcription for clip ${clip.clip_number}...`);
                        const transcriptionText = clip.segment_text || clip.caption || '';
                        
                        const transcriptionResult = await uploadClipTranscription(
                          connectedProvider.id,
                          transcriptionText,
                          projectId,
                          uploadResult.clipId || '',
                          {
                            language: 'en',
                            confidence: 1.0,
                            duration: clip.duration
                          }
                        );
                        
                        if (transcriptionResult.success) {
                          uploadedTranscriptions++;
                          console.log(`✅ [UploadPage] Clip ${clip.clip_number} transcription uploaded successfully`);
                          
                          // Create transcription entry in Supabase database
                          try {
                            console.log(`📝 [UploadPage] Creating transcription DB entry for clip ${clip.clip_number} with clip_id: ${uploadResult.clipId}`);
                            await supabaseProjectsService.createTranscription({
                              clip_id: uploadResult.clipId || '',
                              text: transcriptionText,
                              language: 'en',
                              confidence: 1.0
                            });
                            console.log(`✅ [UploadPage] Transcription database entry created for clip ${clip.clip_number}`);
                          } catch (dbError) {
                            console.warn(`⚠️ [UploadPage] Failed to create transcription database entry for clip ${clip.clip_number}:`, dbError);
                            console.warn(`📝 [UploadPage] Error details:`, dbError);
                          }
                        } else {
                          console.warn(`⚠️ [UploadPage] Failed to upload transcription for clip ${clip.clip_number}:`, transcriptionResult.error);
                        }
                      } catch (transcriptionError) {
                        console.warn(`⚠️ [UploadPage] Error uploading transcription for clip ${clip.clip_number}:`, transcriptionError);
                      }
                    }
                        
                        // Update progress
                    const progressPercent = (uploadedClips / processingResult.clips.length) * 100;
                        setProgress(progressPercent);
                    setCurrentStep(`Uploaded ${uploadedClips}/${processingResult.clips.length} clips to ${connectedProvider.name}...`);
                      }
                    }
                  } catch (clipError) {
                    console.warn(`⚠️ [UploadPage] Failed to upload clip ${clip.clip_number}:`, clipError);
                
                // Check if this is a connection issue that needs re-authentication
                if (clipError instanceof Error) {
                  const errorMessage = clipError.message.toLowerCase();
                  if (errorMessage.includes('not connected') || 
                      errorMessage.includes('reconnect') || 
                      errorMessage.includes('authentication')) {
                    console.log(`🔄 [UploadPage] Connection issue detected, showing user guidance...`);
                    showToast(`Connection issue with ${connectedProvider.name}. Please check the connection status above.`, 'info');
                    // Don't continue with other clips if there's a connection issue
                    break;
                  }
                }
                
                    console.warn(`⚠️ [UploadPage] Clip data type:`, typeof clip.videoData);
                    console.warn(`⚠️ [UploadPage] Clip data preview:`, clip.videoData ? clip.videoData.substring(0, 100) + '...' : 'No video data');
                  }
                }
                
                if (uploadedClips > 0) {
                  showToast(`✅ ${uploadedClips} clips uploaded to ${connectedProvider.name} successfully!`, 'success');
              
              if (uploadedTranscriptions > 0) {
                showToast(`📝 ${uploadedTranscriptions} clip transcriptions also uploaded!`, 'info');
              }
              
              // Upload full video transcription if available
              if (processingResult.fullVideoTranscription || processingResult.transcription) {
                try {
                  console.log(`📝 [UploadPage] Uploading full video transcription...`);
                  const transcriptionText = processingResult.fullVideoTranscription || processingResult.transcription || '';
                  
                  const fullTranscriptionResult = await uploadFullVideoTranscription(
                    connectedProvider.id,
                    transcriptionText,
                    projectId,
                    {
                      language: 'en',
                      confidence: 1.0,
                      duration: 0 // File uploads don't have metadata duration
                    }
                  );
                  
                  if (fullTranscriptionResult.success) {
                    console.log(`✅ [UploadPage] Full video transcription uploaded successfully`);
                    showToast(`Full video transcription also uploaded to ${connectedProvider.name}`, 'info');
                    
                    // Create full video transcription entry in Supabase database
                    try {
                      // For full video transcriptions, we need to create a reference clip
                      // since transcriptions must have a clip_id. We'll create a special clip entry.
                      const fullVideoClipData = {
                        name: `Full Video - ${title}`,
                        size: 0,
                        mime_type: 'text/transcription',
                        cloud_file_id: fullTranscriptionResult.transcriptionId || 'full_video_ref',
                        cloud_provider_id: connectedProvider.id,
                        project_id: projectId,
                        user_id: user?.id || '',
                        duration: 0,
                        resolution: 'N/A'
                      };

                      // Insert the full video reference clip
                      const { data: fullVideoClip, error: clipError } = await supabase
                        .from('video_clips')
                        .insert([fullVideoClipData])
                        .select()
                        .single();

                      if (clipError) {
                        console.warn(`⚠️ [UploadPage] Failed to create full video reference clip:`, clipError);
                      } else {
                        console.log(`✅ [UploadPage] Created full video reference clip: ${fullVideoClip.id}`);
                        
                        // Now create the transcription entry
                        await supabaseProjectsService.createTranscription({
                          clip_id: fullVideoClip.id,
                          text: transcriptionText,
                          language: 'en',
                          confidence: 1.0
                        });
                        console.log(`✅ [UploadPage] Full video transcription database entry created`);
                      }
                    } catch (dbError) {
                      console.warn(`⚠️ [UploadPage] Failed to create full video transcription database entry:`, dbError);
                      console.warn(`📝 [UploadPage] Error details:`, dbError);
                    }
                  } else {
                    console.warn(`⚠️ [UploadPage] Failed to upload full video transcription:`, fullTranscriptionResult.error);
                  }
                } catch (transcriptionError) {
                  console.warn(`⚠️ [UploadPage] Error uploading full video transcription:`, transcriptionError);
                }
              }
            }
          } else {
              console.log('ℹ️ [UploadPage] No cloud storage connected or no clips to upload');
            }
            
          showToast(`Video processed successfully! Generated ${processingResult.clipsGenerated} viral clips.`, 'success');
          
          // Update project status to completed
          try {
            await supabaseProjectsService.updateProjectStatus(projectId, 'completed');
            console.log(`✅ [UploadPage] Project status updated to completed`);
          } catch (statusError) {
            console.warn(`⚠️ [UploadPage] Failed to update project status:`, statusError);
          }
            
            // Navigate to project details
            navigate(`/projects/${projectId}`);
          } else {
          showToast('Failed to process video with Python backend', 'error');
        }
      } else if (uploadMethod === 'url' && youtubeMetadata) {
        // 🎥 Handle YouTube URL - Send to Python backend for processing
        console.log(`🎥 [UploadPage] Processing YouTube video: ${youtubeMetadata.title}`);
        
        // Create project in Supabase first
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .insert([{
            title: title.trim(),
            description: description.trim() || '',
            source_type: 'url',
            user_id: user?.id,
            status: 'processing'
          }])
          .select()
          .single();

        if (projectError) {
          console.error('❌ [UploadPage] Error creating project:', projectError);
          showToast('Failed to create project', 'error');
            return;
          }

        projectId = project.id;
        console.log(`✅ [UploadPage] Project created: ${projectId}`);
        
        // Perform preflight check before processing
        const preflightOk = await performPreflightCheck();
        if (!preflightOk) {
          setProcessing(false);
            return;
          }
          
          // Send YouTube URL to Python backend for processing
          console.log('🚀 [UploadPage] Starting YouTube video processing with Python backend...');
          
          // Prepare processing options with aspect ratio and watermark information
          const enhancedProcessingOptions = {
            ...processingOptions,
            targetAspectRatio: getOptimalAspectRatio(),
            aspectRatioOptions: {
              preserveOriginal: processingOptions.preserveOriginalAspectRatio,
              useNormalVideoRatio: processingOptions.useNormalVideoRatio,
              enableSmartCropping: processingOptions.enableSmartCropping,
              enableLetterboxing: processingOptions.enableLetterboxing,
              enableQualityPreservation: processingOptions.enableQualityPreservation
            },
            watermarkOptions: {
              enableWatermark: processingOptions.enableWatermark,
              useLogo: processingOptions.useLogo,
              watermarkText: processingOptions.watermarkText,
              watermarkPosition: processingOptions.watermarkPosition,
              watermarkSize: processingOptions.watermarkSize,
              watermarkOpacity: processingOptions.watermarkOpacity
            }
          };
          
          const processingResult = await processVideo({
            projectName: title.trim(),
            description: description.trim() || '',
            sourceType: 'url',
            sourceUrl: url.trim(),
            targetPlatforms,
            aiPrompt: aiPrompt.trim() || 'Select the most engaging and viral-worthy moments from this YouTube video. Focus on content that has high emotional impact, clear storytelling, and strong visual appeal.',
            processingOptions: enhancedProcessingOptions,
            numClips: 3
          });
          
          if (processingResult) {
            console.log('✅ [UploadPage] Python backend processing completed successfully');
            console.log(`📊 [UploadPage] Generated ${processingResult.clipsGenerated} clips`);
            
            // Create video clip entry in Supabase for YouTube video
            const { data: clipData, error: clipError } = await supabase
              .from('video_clips')
              .insert([{
                name: youtubeMetadata.title,
                size: 0, // YouTube videos don't have file size
                mime_type: 'video/youtube',
                cloud_file_id: youtubeMetadata.id, // Use YouTube video ID
                cloud_provider_id: 'youtube',
                project_id: projectId,
              user_id: user?.id || '',
              duration: youtubeMetadata.duration || 0,
              resolution: '1920x1080' // Default resolution for YouTube videos
              }])
              .select()
              .single();

            if (clipError) {
            console.error('❌ [UploadPage] Error creating YouTube clip entry:', clipError);
            showToast('Failed to create YouTube clip entry', 'error');
            return;
          }

          console.log(`✅ [UploadPage] YouTube clip entry created: ${clipData.id}`);
          
          // Track project creation usage
          try {
            await subscriptionService.trackProjectCreation(projectId);
            console.log(`✅ [UploadPage] Project creation usage tracked`);
          } catch (usageError) {
            console.warn(`⚠️ [UploadPage] Failed to track usage:`, usageError);
          }

          // Upload generated clips to cloud storage
          if (connectedProviders.length > 0 && processingResult.clips && processingResult.clips.length > 0) {
            console.log(`☁️ [UploadPage] Step 2: Uploading generated clips to cloud storage...`);
            
            const connectedProvider = connectedProviders[0];
            console.log(`☁️ [UploadPage] Uploading ${processingResult.clips.length} clips to ${connectedProvider.name}...`);
            
            let uploadedClips = 0;
            let uploadedTranscriptions = 0;

            for (const clip of processingResult.clips) {
              try {
                // Convert base64 video data back to File object for upload
                if (clip.videoData) {
                  // Convert base64 to blob without using fetch (CSP-safe)
                  const base64Data = clip.videoData.split(',')[1]; // Remove data:video/mp4;base64, prefix
                  const binaryString = atob(base64Data);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  
                  const videoBlob = new Blob([bytes], { type: 'video/mp4' });
                  const clipFile = new File([videoBlob], clip.filename, { type: 'video/mp4' });
                  
                  console.log(`📤 [UploadPage] Converting clip ${clip.clip_number} to file:`, {
                    filename: clip.filename,
                    size: `${(clipFile.size / (1024 * 1024)).toFixed(2)} MB`,
                    type: clipFile.type
                  });
                  
                  const uploadResult = await uploadVideoClip(
                    connectedProvider.id,
                    clipFile,
                    projectId,
                    {
                      duration: clip.duration,
                      resolution: '1920x1080', // Default resolution for clips
                      description: `Viral clip: ${clip.caption || clip.segment_text}`
                    }
                  );
                  
                  if (uploadResult.success) {
                    uploadedClips++;
                    console.log(`✅ [UploadPage] Clip ${clip.clip_number} uploaded to cloud storage`);
                    
                    // Clip usage tracking removed - we only track videos now
                    
                    // Upload clip transcription to cloud storage if available
                    if (clip.segment_text || clip.caption) {
                      try {
                        console.log(`📝 [UploadPage] Uploading transcription for clip ${clip.clip_number}...`);
                        const transcriptionText = clip.segment_text || clip.caption || '';
                        
                        const transcriptionResult = await uploadClipTranscription(
                          connectedProvider.id,
                          transcriptionText,
                          projectId,
                          uploadResult.clipId || '',
                          {
                            language: 'en',
                            confidence: 1.0,
                            duration: clip.duration
                          }
                        );
                        
                        if (transcriptionResult.success) {
                          uploadedTranscriptions++;
                          console.log(`✅ [UploadPage] Clip ${clip.clip_number} transcription uploaded successfully`);
                          
                          // Create transcription entry in Supabase database
                          try {
                            console.log(`📝 [UploadPage] Creating transcription DB entry for clip ${clip.clip_number} with clip_id: ${uploadResult.clipId}`);
                            await supabaseProjectsService.createTranscription({
                              clip_id: uploadResult.clipId || '',
                              text: transcriptionText,
                              language: 'en',
                              confidence: 1.0
                            });
                            console.log(`✅ [UploadPage] Transcription database entry created for clip ${clip.clip_number}`);
                          } catch (dbError) {
                            console.warn(`⚠️ [UploadPage] Failed to create transcription database entry for clip ${clip.clip_number}:`, dbError);
                            console.warn(`📝 [UploadPage] Error details:`, dbError);
                          }
                        } else {
                          console.warn(`⚠️ [UploadPage] Failed to upload transcription for clip ${clip.clip_number}:`, transcriptionResult.error);
                        }
                      } catch (transcriptionError) {
                        console.warn(`⚠️ [UploadPage] Error uploading transcription for clip ${clip.clip_number}:`, transcriptionError);
                      }
                    }
                    
                    // Update progress
                    const progressPercent = (uploadedClips / processingResult.clips.length) * 100;
                    setProgress(progressPercent);
                    setCurrentStep(`Uploaded ${uploadedClips}/${processingResult.clips.length} clips to ${connectedProvider.name}...`);
                  }
                }
              } catch (clipError) {
                console.warn(`⚠️ [UploadPage] Failed to upload clip ${clip.clip_number}:`, clipError);
                
                // Check if this is a connection issue that needs re-authentication
                if (clipError instanceof Error) {
                  const errorMessage = clipError.message.toLowerCase();
                  if (errorMessage.includes('not connected') || 
                      errorMessage.includes('reconnect') || 
                      errorMessage.includes('authentication')) {
                    console.log(`🔄 [UploadPage] Connection issue detected, showing user guidance...`);
                    showToast(`Connection issue with ${connectedProvider.name}. Please check the connection status above.`, 'info');
                    // Don't continue with other clips if there's a connection issue
                    break;
                  }
                }
                
                console.warn(`⚠️ [UploadPage] Clip data type:`, typeof clip.videoData);
                console.warn(`⚠️ [UploadPage] Clip data preview:`, clip.videoData ? clip.videoData.substring(0, 100) + '...' : 'No video data');
              }
            }
            
            if (uploadedClips > 0) {
              showToast(`✅ ${uploadedClips} clips uploaded to ${connectedProvider.name} successfully!`, 'success');
              
              if (uploadedTranscriptions > 0) {
                showToast(`📝 ${uploadedTranscriptions} clip transcriptions also uploaded!`, 'info');
              }
              
              // Upload full video transcription if available
              if (processingResult.fullVideoTranscription || processingResult.transcription) {
                try {
                  console.log(`📝 [UploadPage] Uploading full video transcription...`);
                  const transcriptionText = processingResult.fullVideoTranscription || processingResult.transcription || '';
                  
                  const fullTranscriptionResult = await uploadFullVideoTranscription(
                    connectedProvider.id,
                    transcriptionText,
                    projectId,
                    {
                      language: 'en',
                      confidence: 1.0,
                      duration: youtubeMetadata.duration
                    }
                  );
                  
                  if (fullTranscriptionResult.success) {
                    console.log(`✅ [UploadPage] Full video transcription uploaded successfully`);
                    showToast(`Full video transcription also uploaded to ${connectedProvider.name}`, 'info');
                    
                    // Create full video transcription entry in Supabase database
                    try {
                      // For full video transcriptions, we need to create a reference clip
                      // since transcriptions must have a clip_id. We'll create a special clip entry.
                      const fullVideoClipData = {
                        name: `Full Video - ${title}`,
                        size: 0,
                        mime_type: 'text/transcription',
                        cloud_file_id: fullTranscriptionResult.transcriptionId || 'full_video_ref',
                        cloud_provider_id: connectedProvider.id,
                        project_id: projectId,
                        user_id: user?.id || '',
                        duration: youtubeMetadata.duration || 0,
                        resolution: 'N/A'
                      };

                      // Insert the full video reference clip
                      const { data: fullVideoClip, error: clipError } = await supabase
                        .from('video_clips')
                        .insert([fullVideoClipData])
                        .select()
                        .single();

                      if (clipError) {
                        console.warn(`⚠️ [UploadPage] Failed to create full video reference clip:`, clipError);
                      } else {
                        console.log(`✅ [UploadPage] Created full video reference clip: ${fullVideoClip.id}`);
                        
                        // Now create the transcription entry
                        await supabaseProjectsService.createTranscription({
                          clip_id: fullVideoClip.id,
                          text: transcriptionText,
                          language: 'en',
                          confidence: 1.0
                        });
                        console.log(`✅ [UploadPage] Full video transcription database entry created`);
                      }
                    } catch (dbError) {
                      console.warn(`⚠️ [UploadPage] Failed to create full video transcription database entry:`, dbError);
                      console.warn(`📝 [UploadPage] Error details:`, dbError);
                    }
                  } else {
                    console.warn(`⚠️ [UploadPage] Failed to upload full video transcription:`, fullTranscriptionResult.error);
                  }
                } catch (transcriptionError) {
                  console.warn(`⚠️ [UploadPage] Error uploading full video transcription:`, transcriptionError);
                }
              }
            }
          } else {
            console.log('ℹ️ [UploadPage] No cloud storage connected or no clips to upload');
          }
          
          showToast(`YouTube video processed successfully! Generated ${processingResult.clipsGenerated} viral clips.`, 'success');
          
          // Update project status to completed
          try {
            await supabaseProjectsService.updateProjectStatus(projectId, 'completed');
            console.log(`✅ [UploadPage] Project status updated to completed`);
          } catch (statusError) {
            console.warn(`⚠️ [UploadPage] Failed to update project status:`, statusError);
          }
      
      // Navigate to project details
            navigate(`/projects/${projectId}`);
          } else {
          showToast('Failed to process YouTube video with Python backend', 'error');
        }
      } else if (uploadMethod === 'text' && text) {
        // 📝 Handle Text Input - Send to Python backend for processing
        console.log(`📝 [UploadPage] Processing text input: ${text.substring(0, 100)}...`);
        
        // Create project in Supabase first
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .insert([{
            title: title.trim(),
            description: description.trim() || '',
            source_type: 'text',
            user_id: user?.id,
            status: 'processing'
          }])
          .select()
          .single();

        if (projectError) {
          console.error('❌ [UploadPage] Error creating project:', projectError);
          showToast('Failed to create project', 'error');
          return;
        }

        projectId = project.id;
        console.log(`✅ [UploadPage] Project created: ${projectId}`);
        
        // Perform preflight check before processing
        const preflightOk = await performPreflightCheck();
        if (!preflightOk) {
          setProcessing(false);
          return;
        }
        
        // Send text to Python backend for processing
        console.log('🚀 [UploadPage] Starting text processing with Python backend...');
        
        // Prepare processing options with aspect ratio and watermark information
        const enhancedProcessingOptions = {
          ...processingOptions,
          targetAspectRatio: getOptimalAspectRatio(),
          aspectRatioOptions: {
            preserveOriginal: processingOptions.preserveOriginalAspectRatio,
            useNormalVideoRatio: processingOptions.useNormalVideoRatio,
            enableSmartCropping: processingOptions.enableSmartCropping,
            enableLetterboxing: processingOptions.enableLetterboxing,
            enableQualityPreservation: processingOptions.enableQualityPreservation
          },
          watermarkOptions: {
            enableWatermark: processingOptions.enableWatermark,
            useLogo: processingOptions.useLogo,
            watermarkText: processingOptions.watermarkText,
            watermarkPosition: processingOptions.watermarkPosition,
            watermarkSize: processingOptions.watermarkSize,
            watermarkOpacity: processingOptions.watermarkOpacity
          }
        };

        const processingResult = await processVideo({
          projectName: title.trim(),
          description: description.trim() || '',
          sourceType: 'text',
          sourceText: text.trim(),
          targetPlatforms,
          aiPrompt: aiPrompt.trim() || 'Select the most engaging and viral-worthy moments from this text. Focus on content that has high emotional impact, clear storytelling, and strong visual appeal.',
          processingOptions: enhancedProcessingOptions,
          numClips: 3
        });
        
        if (processingResult) {
          console.log('✅ [UploadPage] Python backend processing completed successfully');
          console.log(`📊 [UploadPage] Generated ${processingResult.clipsGenerated} clips`);
          
          // Track project creation usage
          try {
            await subscriptionService.trackProjectCreation(projectId);
            console.log(`✅ [UploadPage] Project creation usage tracked`);
          } catch (usageError) {
            console.warn(`⚠️ [UploadPage] Failed to track usage:`, usageError);
          }

          // Upload generated clips to cloud storage
          if (connectedProviders.length > 0 && processingResult.clips && processingResult.clips.length > 0) {
            console.log(`☁️ [UploadPage] Step 2: Uploading generated clips to cloud storage...`);
            
            const connectedProvider = connectedProviders[0];
            console.log(`☁️ [UploadPage] Uploading ${processingResult.clips.length} clips to ${connectedProvider.name}...`);
            
            let uploadedClips = 0;
            let uploadedTranscriptions = 0;

            for (const clip of processingResult.clips) {
              try {
                // Convert base64 video data back to File object for upload
                if (clip.videoData) {
                  // Convert base64 to blob without using fetch (CSP-safe)
                  const base64Data = clip.videoData.split(',')[1]; // Remove data:video/mp4;base64, prefix
                  const binaryString = atob(base64Data);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  
                  const videoBlob = new Blob([bytes], { type: 'video/mp4' });
                  const clipFile = new File([videoBlob], clip.filename, { type: 'video/mp4' });
                  
                  console.log(`📤 [UploadPage] Converting clip ${clip.clip_number} to file:`, {
                    filename: clip.filename,
                    size: `${(clipFile.size / (1024 * 1024)).toFixed(2)} MB`,
                    type: clipFile.type
                  });
                  
                  const uploadResult = await uploadVideoClip(
                    connectedProvider.id,
                    clipFile,
                    projectId,
                    {
                      duration: clip.duration,
                      resolution: '1920x1080', // Default resolution for clips
                      description: `Viral clip: ${clip.caption || clip.segment_text}`
                    }
                  );
                  
                  if (uploadResult.success) {
                    uploadedClips++;
                    console.log(`✅ [UploadPage] Clip ${clip.clip_number} uploaded to cloud storage`);
                    
                    // Clip usage tracking removed - we only track videos now
                    
                    // Upload clip transcription to cloud storage if available
                    if (clip.segment_text || clip.caption) {
                      try {
                        console.log(`📝 [UploadPage] Uploading transcription for clip ${clip.clip_number}...`);
                        const transcriptionText = clip.segment_text || clip.caption || '';
                        
                        const transcriptionResult = await uploadClipTranscription(
                          connectedProvider.id,
                          transcriptionText,
                          projectId,
                          uploadResult.clipId || '',
                          {
                            language: 'en',
                            confidence: 1.0,
                            duration: clip.duration
                          }
                        );
                        
                        if (transcriptionResult.success) {
                          uploadedTranscriptions++;
                          console.log(`✅ [UploadPage] Clip ${clip.clip_number} transcription uploaded successfully`);
                          
                          // Create transcription entry in Supabase database
                          try {
                            console.log(`📝 [UploadPage] Creating transcription DB entry for clip ${clip.clip_number} with clip_id: ${uploadResult.clipId}`);
                            await supabaseProjectsService.createTranscription({
                              clip_id: uploadResult.clipId || '',
                              text: transcriptionText,
                              language: 'en',
                              confidence: 1.0
                            });
                            console.log(`✅ [UploadPage] Transcription database entry created for clip ${clip.clip_number}`);
                          } catch (dbError) {
                            console.warn(`⚠️ [UploadPage] Failed to create transcription database entry for clip ${clip.clip_number}:`, dbError);
                            console.warn(`📝 [UploadPage] Error details:`, dbError);
                          }
                        } else {
                          console.warn(`⚠️ [UploadPage] Failed to upload transcription for clip ${clip.clip_number}:`, transcriptionResult.error);
                        }
                      } catch (transcriptionError) {
                        console.warn(`⚠️ [UploadPage] Error uploading transcription for clip ${clip.clip_number}:`, transcriptionError);
                      }
                    }
                    
                    // Update progress
                    const progressPercent = (uploadedClips / processingResult.clips.length) * 100;
                    setProgress(progressPercent);
                    setCurrentStep(`Uploaded ${uploadedClips}/${processingResult.clips.length} clips to ${connectedProvider.name}...`);
                  }
                }
              } catch (clipError) {
                console.warn(`⚠️ [UploadPage] Failed to upload clip ${clip.clip_number}:`, clipError);
                
                // Check if this is a connection issue that needs re-authentication
                if (clipError instanceof Error) {
                  const errorMessage = clipError.message.toLowerCase();
                  if (errorMessage.includes('not connected') || 
                      errorMessage.includes('reconnect') || 
                      errorMessage.includes('authentication')) {
                    console.log(`🔄 [UploadPage] Connection issue detected, showing user guidance...`);
                    showToast(`Connection issue with ${connectedProvider.name}. Please check the connection status above.`, 'info');
                    // Don't continue with other clips if there's a connection issue
                    break;
                  }
                }
                
                console.warn(`⚠️ [UploadPage] Clip data type:`, typeof clip.videoData);
                console.warn(`⚠️ [UploadPage] Clip data preview:`, clip.videoData ? clip.videoData.substring(0, 100) + '...' : 'No video data');
              }
            }
            
            if (uploadedClips > 0) {
              showToast(`✅ ${uploadedClips} clips uploaded to ${connectedProvider.name} successfully!`, 'success');
              
              if (uploadedTranscriptions > 0) {
                showToast(`📝 ${uploadedTranscriptions} clip transcriptions also uploaded!`, 'info');
              }
              
              // Upload full video transcription if available
              if (processingResult.fullVideoTranscription || processingResult.transcription) {
                try {
                  console.log(`📝 [UploadPage] Uploading full video transcription...`);
                  const transcriptionText = processingResult.fullVideoTranscription || processingResult.transcription || '';
                  
                  const fullTranscriptionResult = await uploadFullVideoTranscription(
                    connectedProvider.id,
                    transcriptionText,
                    projectId,
                    {
                      language: 'en',
                      confidence: 1.0,
                      duration: 0 // Text doesn't have duration
                    }
                  );
                  
                  if (fullTranscriptionResult.success) {
                    console.log(`✅ [UploadPage] Full video transcription uploaded successfully`);
                    showToast(`Full video transcription also uploaded to ${connectedProvider.name}`, 'info');
                    
                    // Create full video transcription entry in Supabase database
                    try {
                      // For full video transcriptions, we need to create a reference clip
                      // since transcriptions must have a clip_id. We'll create a special clip entry.
                      const fullVideoClipData = {
                        name: `Full Video - ${title}`,
                        size: 0,
                        mime_type: 'text/transcription',
                        cloud_file_id: fullTranscriptionResult.transcriptionId || 'full_video_ref',
                        cloud_provider_id: connectedProvider.id,
                        project_id: projectId,
                        user_id: user?.id || '',
                        duration: 0,
                        resolution: 'N/A'
                      };

                      // Insert the full video reference clip
                      const { data: fullVideoClip, error: clipError } = await supabase
                        .from('video_clips')
                        .insert([fullVideoClipData])
                        .select()
                        .single();

                      if (clipError) {
                        console.warn(`⚠️ [UploadPage] Failed to create full video reference clip:`, clipError);
                      } else {
                        console.log(`✅ [UploadPage] Created full video reference clip: ${fullVideoClip.id}`);
                        
                        // Now create the transcription entry
                        await supabaseProjectsService.createTranscription({
                          clip_id: fullVideoClip.id,
                          text: transcriptionText,
                          language: 'en',
                          confidence: 1.0
                        });
                        console.log(`✅ [UploadPage] Full video transcription database entry created`);
                      }
                    } catch (dbError) {
                      console.warn(`⚠️ [UploadPage] Failed to create full video transcription database entry:`, dbError);
                      console.warn(`📝 [UploadPage] Error details:`, dbError);
                    }
                  } else {
                    console.warn(`⚠️ [UploadPage] Failed to upload full video transcription:`, fullTranscriptionResult.error);
                  }
                } catch (transcriptionError) {
                  console.warn(`⚠️ [UploadPage] Error uploading full video transcription:`, transcriptionError);
                }
              }
            }
          } else {
            console.log('ℹ️ [UploadPage] No cloud storage connected or no clips to upload');
          }
          
          showToast(`Text processed successfully! Generated ${processingResult.clipsGenerated} viral clips.`, 'success');
          
          // Update project status to completed
          try {
            await supabaseProjectsService.updateProjectStatus(projectId, 'completed');
            console.log(`✅ [UploadPage] Project status updated to completed`);
          } catch (statusError) {
            console.warn(`⚠️ [UploadPage] Failed to update project status:`, statusError);
          }
          
          // Navigate to project details
          navigate(`/projects/${projectId}`);
        } else {
          showToast('Failed to process text with Python backend', 'error');
        }
      }
    } catch (error) {
      console.error('❌ [UploadPage] Form submission error:', error);
      showToast('An unexpected error occurred', 'error');
    } finally {
      setProcessing(false);
      setProgress(0);
      setCurrentStep('');
    }
  };

  const resetForm = () => {
    setFile(null);
    setUrl('');
    setText('');
    setTitle('');
    setDescription('');
    setAiPrompt('');
    setTargetPlatforms(['tiktok']);
    setProcessingOptions({
      targetDuration: 60,
      minDuration: 15,
      maxDuration: 120,
      overlap: 2,
      quality: 'medium',
      aiEnhancement: true,
      generateTranscription: true,
      enablePerformancePrediction: true,
      enableStyleAnalysis: true,
      enableContentModeration: true,
      enableTrendAnalysis: true,
      enableAdvancedCaptions: true,
      enableViralOptimization: true,
      enableAudienceAnalysis: true,
      enableCompetitorAnalysis: true,
      enableContentStrategy: true,
      // Smart aspect ratio handling
      preserveOriginalAspectRatio: false,
      useNormalVideoRatio: false,
      enableSmartCropping: true,
      enableLetterboxing: true,
      enableQualityPreservation: true,
      // Professional watermark options
      enableWatermark: true, // Mandatory for free tier
      useLogo: true,
      watermarkText: 'Made by Zuexis',
      watermarkPosition: 'bottom-right',
      watermarkSize: 'medium',
      watermarkOpacity: 0.6
    });
    
    // Reset YouTube-related state
    setYoutubeMetadata(null);
    setYoutubeValidation({ isValid: false });
    setIsLoadingYoutube(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Pre-flight check for cloud storage before processing
  const performPreflightCheck = async (): Promise<boolean> => {
    try {
      console.log('✈️ [UploadPage] Performing preflight check...');
      
      // Get connected providers from the hook
      if (connectedProviders.length === 0) {
        showToast('No cloud storage providers connected. Please connect one before uploading.', 'error');
        return false;
      }
      
      // For now, just check if we have connected providers
      // The actual preflight check will be implemented when we add the methods to the hook
      console.log(`✅ [UploadPage] Found ${connectedProviders.length} connected providers`);
      
      // TODO: Implement actual preflight check when methods are available
      // This will check each provider's connection and upload capability
      
      return true;
      
    } catch (error) {
      console.error('❌ [UploadPage] Preflight check error:', error);
      showToast('Error checking cloud storage connections', 'error');
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Loading Screen */}
      <LoadingScreen
        isVisible={showLoadingScreen}
        stages={loadingStages}
        currentStageIndex={currentStageIndex}
        overallProgress={overallProgress}
        onClose={() => setShowLoadingScreen(false)}
        title="Processing Your Video"
        subtitle="AI-powered viral clip generation in progress..."
      />
      
      <Sidebar />
      <main className="md:ml-64 p-6 pt-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Create New Project</h1>
            <p className="text-gray-400">Upload content and let AI create engaging clips for your target platforms</p>
            
            {/* Backend Connection Status */}
            <div className="mt-4 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${pythonBackendConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                  <span className="text-sm font-medium">
                    Backend Status: {pythonBackendConnected ? 'Connected' : 'Disconnected'}
                  </span>
                  {pythonBackendStatus && (
                    <span className="text-xs text-gray-400">({pythonBackendStatus})</span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={async () => {
                      try {
                        setShowLoadingScreen(true);
                        setCurrentStageIndex(0);
                        updateLoadingStage(0, 'processing', 0, 'Testing backend connection...');
                        
                        const testResult = await backendConnectionTest.runFullTest();
                        
                        if (testResult.success) {
                          updateLoadingStage(0, 'completed', 100, 'Backend connection successful!');
                          showToast('Backend connection test successful!', 'success');
                        } else {
                          updateLoadingStage(0, 'failed', 0, `Test failed: ${testResult.recommendations[0]}`);
                          showToast('Backend test failed', 'error');
                        }
                        
                        setTimeout(() => setShowLoadingScreen(false), 2000);
                      } catch (error) {
                        updateLoadingStage(0, 'failed', 0, 'Test execution failed');
                        showToast('Backend test failed', 'error');
                        setTimeout(() => setShowLoadingScreen(false), 2000);
                      }
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium transition-colors"
                  >
                    Test Connection
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        setBackendError(null);
                        await testPythonBackend();
                        showToast('Python backend connection successful!', 'success');
                      } catch (error) {
                        setBackendError('Python backend connection failed');
                        showToast('Python backend connection failed', 'error');
                      }
                    }}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs font-medium transition-colors"
                  >
                    Test Python
                  </button>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Backend Connection Error Display */}
            {backendError && (
              <div className="bg-red-900/50 border border-red-500/50 p-6 rounded-xl">
                <div className="flex items-center space-x-3 mb-3">
                  <AlertCircle className="h-6 w-6 text-red-400" />
                  <h2 className="text-xl font-semibold text-red-400">Python Backend Connection Failed</h2>
                </div>
                <p className="text-red-300 mb-4">{backendError}</p>
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setBackendError(null);
                        await testPythonBackend();
                      } catch (error) {
                        setBackendError('Retry failed. Please ensure the backend is running on https://zuexisbacckend.onrender.com');
                      }
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
                  >
                    Retry Connection
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setBackendError(null);
                        setShowLoadingScreen(true);
                        setCurrentStageIndex(0);
                        updateLoadingStage(0, 'processing', 0, 'Running comprehensive backend test...');
                        
                        const testResult = await backendConnectionTest.runFullTest();
                        
                        if (testResult.success) {
                          updateLoadingStage(0, 'completed', 100, 'All tests passed! Backend is working perfectly.');
                          setBackendError(null);
                          showToast('Backend connection test successful!', 'success');
                        } else {
                          updateLoadingStage(0, 'failed', 0, `Test failed: ${testResult.recommendations[0]}`);
                          setBackendError(`Backend test failed: ${testResult.recommendations.join(', ')}`);
                          showToast('Backend test failed', 'error');
                        }
                        
                        setTimeout(() => setShowLoadingScreen(false), 3000);
                      } catch (error) {
                        updateLoadingStage(0, 'failed', 0, 'Test execution failed');
                        setBackendError('Backend test execution failed');
                        showToast('Backend test failed', 'error');
                        setTimeout(() => setShowLoadingScreen(false), 2000);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                  >
                    Run Full Test
                  </button>
                  <span className="text-sm text-red-400">
                    Processing will be disabled until backend connection is established
                  </span>
                </div>
              </div>
            )}

            {/* Cloud Storage Status */}
            <CloudStorageStatus 
              onConnectionUpdate={() => {
                // Refresh the connected providers when connection status changes
                console.log('🔄 [UploadPage] Cloud storage connection updated, refreshing...');
              }} 
            />

            {/* Backend Test Panel */}
            <BackendTestPanel />

            {/* Subscription Status */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Crown className="h-5 w-5 mr-2 text-purple-400" />
                Subscription Status
              </h2>
              
              {subscriptionLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                  <p className="text-gray-400">Checking subscription status...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-400">Current Plan</p>
                      <p className="font-medium text-white">
                        {subscriptionStatus ? subscriptionStatus.plan_name : 'Free Plan'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Videos Remaining</p>
                      <p className="font-bold text-purple-400">
                        {subscriptionStatus ? subscriptionStatus.videos_remaining : 3}
                      </p>
                    </div>
                  </div>
                  
                  {subscriptionStatus && subscriptionStatus.videos_remaining <= 2 && (
                    <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-yellow-400" />
                        <span className="text-yellow-300 text-sm">
                          {subscriptionStatus.videos_remaining === 0 
                            ? 'You have reached your monthly limit. Upgrade your plan or purchase credits to continue.'
                            : `Only ${subscriptionStatus.videos_remaining} video${subscriptionStatus.videos_remaining === 1 ? '' : 's'} remaining this month.`
                          }
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex space-x-3">
                    <Link
                      to="/pricing"
                      className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-center rounded-lg font-medium transition-colors"
                    >
                      View Plans
                    </Link>
                    {subscriptionStatus && subscriptionStatus.videos_remaining === 0 && (
                      <button
                        type="button"
                        onClick={() => {/* TODO: Implement credit purchase */}}
                        className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Buy Credits
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Upload Method Selection */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">Choose Content Source</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setUploadMethod('file')}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    uploadMethod === 'file'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="text-center">
                    <FileVideo className="h-8 w-8 mx-auto mb-2 text-purple-400" />
                    <div className="font-medium">Video File</div>
                    <div className="text-sm text-gray-400">Upload MP4, MOV, AVI</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setUploadMethod('url')}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    uploadMethod === 'url'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="text-center">
                    <Globe className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                  <div className="font-medium">YouTube URL</div>
                    <div className="text-sm text-gray-400">Paste video link</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setUploadMethod('text')}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    uploadMethod === 'text'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="text-center">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-green-400" />
                  <div className="font-medium">Text Content</div>
                    <div className="text-sm text-gray-400">Write or paste text</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Content Input */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">Content Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Project Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter a descriptive title for your project"
                    required
                  />
                </div>

                {/* Usage Display */}
                {subscriptionStatus && (
                  <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-300">Current Usage</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        subscriptionStatus.plan_slug === 'free' 
                          ? 'bg-yellow-400/20 text-yellow-400' 
                          : 'bg-green-400/20 text-green-400'
                      }`}>
                        {subscriptionStatus.plan_name}
                      </span>
                    </div>
                    <div className="text-sm">
                      <div>
                        <span className="text-gray-400">Videos this month:</span>
                        <span className="ml-2 text-white">
                          {subscriptionStatus.videos_used || 0} / {subscriptionStatus.videos_per_month || 3}
                        </span>
                      </div>
                    </div>
                    {subscriptionStatus.plan_slug === 'free' && (
                      <div className="mt-2 text-xs text-yellow-400 bg-yellow-400/10 p-2 rounded">
                        💡 Free tier: {subscriptionStatus.videos_remaining || 0} videos remaining this month
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Describe your content (helps AI generate better clips)"
                  />
                </div>

                {/* File Upload */}
                {uploadMethod === 'file' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Video File *
                    </label>
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        dragActive ? 'border-purple-500 bg-purple-500/10' : 'border-gray-600'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      {file ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-center space-x-2 text-green-400">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="font-medium">{file.name}</span>
                          </div>
                          <div className="text-sm text-gray-400">
                            Size: {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </div>
                          <button
                            type="button"
                            onClick={() => setFile(null)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Remove file
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Upload className="h-12 w-12 mx-auto text-gray-400" />
                          <div>
                            <div className="font-medium">Drop your video here</div>
                            <div className="text-sm text-gray-400">or click to browse</div>
                          </div>
                  <button
                    type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
                  >
                            Select Video
                  </button>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                </div>
              )}

                {/* URL Input */}
                {uploadMethod === 'url' && (
                  <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      YouTube URL *
                    </label>
                      <div className="relative">
                  <input
                    type="url"
                      value={url}
                          onChange={(e) => handleYouTubeUrlChange(e.target.value)}
                          className={`w-full px-4 py-3 bg-gray-700 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                            youtubeValidation.isValid 
                              ? 'border-green-500' 
                              : youtubeValidation.error 
                                ? 'border-red-500' 
                                : 'border-gray-600'
                          }`}
                    placeholder="https://www.youtube.com/watch?v=..."
                      required
                  />
                        {isLoadingYoutube && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                          </div>
                        )}
                      </div>
                      
                      {/* Validation Messages */}
                      {youtubeValidation.error && (
                        <div className="flex items-center space-x-2 text-red-400 text-sm mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <span>{youtubeValidation.error}</span>
                        </div>
                      )}
                      
                      {youtubeValidation.isValid && (
                        <div className="flex items-center space-x-2 text-green-400 text-sm mt-2">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Valid YouTube URL</span>
                        </div>
                      )}
                    </div>

                    {/* YouTube Video Preview */}
                    {youtubeMetadata && (
                      <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                        <div className="flex space-x-4">
                          {/* Thumbnail */}
                          <div className="flex-shrink-0">
                            <img
                              src={youtubeMetadata.thumbnail}
                              alt={youtubeMetadata.title}
                              className="w-32 h-20 object-cover rounded-lg"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/128x80/374151/9CA3AF?text=No+Thumbnail';
                              }}
                            />
                          </div>
                          
                          {/* Video Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-white text-sm line-clamp-2 mb-2">
                              {youtubeMetadata.title}
                            </h3>
                            <div className="space-y-1 text-xs text-gray-400">
                              <div className="flex items-center space-x-2">
                                <span>Channel: {youtubeMetadata.channelTitle}</span>
                                <span>•</span>
                                <span>Duration: {YouTubeService.formatDuration(youtubeMetadata.duration)}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span>Views: {youtubeMetadata.viewCount.toLocaleString()}</span>
                                <span>•</span>
                                <span>Published: {new Date(youtubeMetadata.publishedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              )}

                {/* Text Input */}
                {uploadMethod === 'text' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Text Content *
                    </label>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter your text content here..."
                      required
                    />
                  </div>
                )}
              </div>
            </div>



            {/* AI Enhancement Options */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-purple-400" />
                <span>AI Enhancement Options</span>
              </h2>
              
              <div className="space-y-4">
                {/* AI Enhancement Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                    <div>
                      <div className="font-medium">Enable Gemini AI Enhancement</div>
                      <div className="text-sm text-gray-400">
                        Use Google's Gemini AI for intelligent clip analysis and caption generation
                      </div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={processingOptions.aiEnhancement}
                      onChange={(e) => setProcessingOptions(prev => ({
                        ...prev,
                        aiEnhancement: e.target.checked
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {/* Transcription Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Type className="h-5 w-5 text-green-400" />
                    <div>
                      <div className="font-medium">Generate AI Transcription</div>
                      <div className="text-sm text-gray-400">
                        Create text transcripts from video audio for better content analysis
                      </div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={processingOptions.generateTranscription}
                      onChange={(e) => setProcessingOptions(prev => ({
                        ...prev,
                        generateTranscription: e.target.checked
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>

                {/* Performance Prediction Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="h-5 w-5 text-blue-400" />
                    <div>
                      <div className="font-medium">Enable Performance Prediction</div>
                      <div className="text-sm text-gray-400">
                        AI-powered predictions for views, engagement, and viral potential
                      </div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={processingOptions.enablePerformancePrediction}
                      onChange={(e) => setProcessingOptions(prev => ({
                        ...prev,
                        enablePerformancePrediction: e.target.checked
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Style Analysis Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Palette className="h-5 w-5 text-purple-400" />
                    <div>
                      <div className="font-medium">Enable Style Analysis</div>
                      <div className="text-sm text-gray-400">
                        Analyze visual, audio, and content style for optimization
                      </div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={processingOptions.enableStyleAnalysis}
                      onChange={(e) => setProcessingOptions(prev => ({
                        ...prev,
                        enableStyleAnalysis: e.target.checked
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {/* Content Moderation Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-orange-400" />
                    <div>
                      <div className="font-medium">Enable Content Moderation</div>
                      <div className="text-sm text-gray-400">
                        AI-powered content safety and compliance checking
                      </div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={processingOptions.enableContentModeration}
                      onChange={(e) => setProcessingOptions(prev => ({
                        ...prev,
                        enableContentModeration: e.target.checked
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>

                {/* Trend Analysis Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                    <div>
                      <div className="font-medium">Enable Trend Analysis</div>
                      <div className="text-sm text-gray-400">
                        Real-time trend detection and content opportunity analysis
                      </div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={processingOptions.enableTrendAnalysis}
                      onChange={(e) => setProcessingOptions(prev => ({
                        ...prev,
                        enableTrendAnalysis: e.target.checked
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>

                {/* Number of Clips */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Number of Clips to Generate
                  </label>
                  <input
                    type="number"
                    value={3}
                    onChange={(e) => {
                      // Handle numClips change if needed in the future
                    }}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    min="1"
                    max="20"
                  />
                  <div className="text-sm text-gray-400 mt-1">
                    Choose how many viral clips to generate (1-20)
                  </div>
                </div>

                {/* AI Prompt */}
                <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl p-6">
                  <label className="block text-lg font-bold text-purple-300 mb-3">
                    🎯 AI Instructions (CRITICAL - Overrides All Defaults)
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 bg-gray-800 border-2 border-purple-500/50 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 text-white placeholder-gray-400"
                    placeholder="🚨 BE VERY SPECIFIC! Your instructions will override all default AI behaviors. Tell the AI exactly what type of content you want, what to focus on, and what to ignore."
                  />
                  <div className="text-sm text-gray-300 mt-3 space-y-2">
                    <div className="font-semibold text-purple-300">🎯 <strong>STRICT INSTRUCTION EXAMPLES:</strong></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div className="bg-gray-800 p-2 rounded border border-gray-600">
                        <strong>Content Type:</strong><br/>
                        "ONLY select clips with humor and jokes. Ignore serious or educational content completely."
                      </div>
                      <div className="bg-gray-800 p-2 rounded border border-gray-600">
                        <strong>Style Focus:</strong><br/>
                        "Focus on dramatic moments with high emotional impact. No casual conversations."
                      </div>
                      <div className="bg-gray-800 p-2 rounded border border-gray-600">
                        <strong>Audience Target:</strong><br/>
                        "Select content that appeals to business professionals. Avoid casual or entertainment-focused segments."
                      </div>
                      <div className="bg-gray-800 p-2 rounded border border-gray-600">
                        <strong>Platform Specific:</strong><br/>
                        "Optimize for TikTok: short, punchy, trend-aware content only."
                      </div>
                    </div>
                    <div className="text-yellow-300 font-medium mt-2">
                      ⚠️ <strong>REMEMBER:</strong> Your AI instructions are LAW. The AI will ignore viral content best practices if they conflict with your specific requirements.
                    </div>
                  </div>
                </div>

                {/* Processing Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Target Duration (seconds)
                    </label>
                    <input
                      type="number"
                      value={processingOptions.targetDuration}
                      onChange={(e) => setProcessingOptions(prev => ({
                        ...prev,
                        targetDuration: parseInt(e.target.value) || 60
                      }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="15"
                      max="300"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Min Duration (seconds)
                    </label>
                    <input
                      type="number"
                      value={processingOptions.minDuration}
                      onChange={(e) => setProcessingOptions(prev => ({
                        ...prev,
                        minDuration: parseInt(e.target.value) || 15
                      }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="5"
                      max="60"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Duration (seconds)
                    </label>
                    <input
                      type="number"
                      value={processingOptions.maxDuration}
                      onChange={(e) => setProcessingOptions(prev => ({
                        ...prev,
                        maxDuration: parseInt(e.target.value) || 120
                      }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="30"
                      max="600"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Quality
                    </label>
                    <select
                      value={processingOptions.quality}
                      onChange={(e) => setProcessingOptions(prev => ({
                        ...prev,
                        quality: e.target.value as 'low' | 'medium' | 'high'
                      }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="low">Low (Fast)</option>
                      <option value="medium">Medium (Balanced)</option>
                      <option value="high">High (Slow)</option>
                    </select>
                  </div>

                                      {/* Automatic Aspect Ratio Processing - Always Enabled */}
                    <div className="col-span-2">
                        <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="h-5 w-5 text-blue-400" />
                                <span className="text-sm font-medium text-blue-300">Automatic Aspect Ratio Processing</span>
                            </div>
                            <p className="text-xs text-blue-200">
                                Videos are automatically optimized for your selected platforms with smart scaling and minimal content loss.
                                {targetPlatforms.length > 0 && (
                                    <span className="block mt-1">
                                        Output optimized for: <span className="font-mono text-green-400">{getOptimalAspectRatio()}</span>
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Normal Video Ratio Option */}
                    <div className="col-span-2">
                        <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Settings className="h-5 w-5 text-green-400" />
                                <span className="text-sm font-medium text-green-300">Video Aspect Ratio Options</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="preserveOriginalAspectRatio"
                                        checked={processingOptions.preserveOriginalAspectRatio}
                                        onChange={(e) => setProcessingOptions(prev => ({
                                            ...prev,
                                            preserveOriginalAspectRatio: e.target.checked,
                                            useNormalVideoRatio: e.target.checked ? false : prev.useNormalVideoRatio
                                        }))}
                                        className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500"
                                    />
                                    <label htmlFor="preserveOriginalAspectRatio" className="text-sm text-green-200">
                                        Preserve Original Ratio
                                    </label>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="useNormalVideoRatio"
                                        checked={processingOptions.useNormalVideoRatio}
                                        onChange={(e) => setProcessingOptions(prev => ({
                                            ...prev,
                                            useNormalVideoRatio: e.target.checked,
                                            preserveOriginalAspectRatio: e.target.checked ? false : prev.preserveOriginalAspectRatio
                                        }))}
                                        className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500"
                                    />
                                    <label htmlFor="useNormalVideoRatio" className="text-sm text-green-200">
                                        Use Normal Video Ratio
                                    </label>
                                </div>
                            </div>
                            <p className="text-xs text-green-200 mt-2">
                                Choose to preserve the original aspect ratio or use normal video dimensions (16:9) without platform-specific optimization.
                            </p>
                        </div>
                    </div>

                    {/* Mandatory Watermark for Free Tier */}
                    <div className="col-span-2">
                        <div className="p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Shield className="h-5 w-5 text-purple-400" />
                                <span className="text-sm font-medium text-purple-300">Mandatory Zuexis Watermark</span>
                                <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">Free Tier</span>
                            </div>
                            <p className="text-xs text-purple-200 mb-3">
                                All videos include the Zuexis watermark to protect your content and promote our platform.
                            </p>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="useLogo"
                                        checked={processingOptions.useLogo}
                                        onChange={(e) => setProcessingOptions(prev => ({
                                            ...prev,
                                            useLogo: e.target.checked
                                        }))}
                                        className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                                    />
                                    <label htmlFor="useLogo" className="text-sm text-purple-200">
                                        Include Zuexis Logo
                                    </label>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 bg-purple-600/20 border border-purple-500 rounded flex items-center justify-center">
                                        <CheckCircle2 className="h-3 w-3 text-purple-400" />
                                    </div>
                                    <label className="text-sm text-purple-200">
                                        Watermark Always Enabled
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        {/* No Watermark Toggle - Premium Feature */}
                        <div className="mt-4 space-y-4">
                                {/* No Watermark Toggle */}
                                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-500/30 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id="noWatermark"
                                            checked={!processingOptions.enableWatermark}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    // Show subscription popup for free users
                                                    setShowSubscriptionPopup(true);
                                                } else {
                                                    // Re-enable watermark
                                                    setProcessingOptions(prev => ({
                                                        ...prev,
                                                        enableWatermark: true
                                                    }));
                                                }
                                            }}
                                            className="w-4 h-4 text-amber-600 bg-gray-700 border-gray-600 rounded focus:ring-amber-500"
                                        />
                                        <label htmlFor="noWatermark" className="block text-sm font-medium text-amber-300">
                                            Remove Watermark
                                        </label>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <Crown className="h-4 w-4 text-amber-400" />
                                        <span className="px-2 py-1 bg-amber-500/20 text-amber-300 text-xs rounded-full">
                                            Premium
                                        </span>
                                    </div>
                                </div>
                                
                                <p className="text-xs text-amber-200 mt-2 ml-7">
                                    Subscribe to Creator Lite or Pro+ to remove the Zuexis watermark from your videos.
                                </p>
                                

                                
                                {/* Watermark Size and Opacity */}

                                

                            </div>
                        </div>


                </div>
              </div>
            </div>

            {/* Target Platforms */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">Target Platforms</h2>
              
              {/* Platform Selection Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                {platforms.map((platform) => (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => handlePlatformToggle(platform.id)}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                      targetPlatforms.includes(platform.id)
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-2xl mb-2">{platform.icon}</div>
                    <div className="text-sm font-medium mb-1">{platform.name}</div>
                    <div className="text-xs text-gray-400">{platform.aspectRatio}</div>
                    <div className="text-xs text-gray-500">{platform.dimensions}</div>
                  </button>
                ))}
              </div>

              {/* Smart Aspect Ratio Analysis */}
              {targetPlatforms.length > 0 && (
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                    <h3 className="font-semibold text-purple-300">Smart Aspect Ratio Analysis</h3>
            </div>

                  <div className="space-y-3">
                    {/* Optimal Aspect Ratio */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Optimal Output Ratio:</span>
                      <span className="font-mono font-bold text-green-400 text-lg">
                        {getAspectRatioInfo().optimalRatio}
                      </span>
                    </div>
                    
                    {/* Platform Recommendations */}
                    <div className="space-y-2">
                      {getAspectRatioInfo().recommendations.map((rec, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">{rec.platform}:</span>
                          <span className={`font-mono ${
                            rec.needsAdjustment ? 'text-yellow-400' : 'text-green-400'
                          }`}>
                            {rec.adjustment}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Quality Preservation Info */}
                    <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-blue-400" />
                        <span className="text-sm font-medium text-blue-300">Quality Preservation</span>
                      </div>
                      <p className="text-xs text-blue-200">
                        AI will automatically crop and resize your video to {getAspectRatioInfo().optimalRatio} 
                        while preserving the most important content and maintaining video quality.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>



            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                Reset Form
              </button>
              
              <button
                type="submit"
                disabled={processing || backendError !== null}
                className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                  backendError 
                    ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                }`}
              >
                <Sparkles className="h-5 w-5" />
                <span>
                  {backendError 
                    ? 'Backend Not Connected' 
                    : 'Create Project & Process with AI'
                  }
                </span>
              </button>
            </div>
          </form>
        </div>
        
        {/* Test Chunked Upload */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">🧪 Test Chunked Upload</h3>
          <button
            onClick={async () => {
              try {
                console.log('🧪 [UploadPage] Testing chunked upload...');
                const chunkedService = new ChunkedUploadService('https://zuexisbacckend.onrender.com');
                const success = await chunkedService.testChunkUpload();
                if (success) {
                  showToast('✅ Chunked upload test successful!', 'success');
                } else {
                  showToast('❌ Chunked upload test failed!', 'error');
                }
              } catch (error) {
                console.error('❌ [UploadPage] Chunked upload test error:', error);
                showToast(`❌ Chunked upload test error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Test Chunk Upload
          </button>
        </div>
      </main>
      
      {/* Subscription Modal */}
      <SubscriptionPlanModal
        isOpen={showSubscriptionPopup}
        onClose={() => setShowSubscriptionPopup(false)}
        onPlanSelected={(planSlug) => {
          console.log('Selected plan:', planSlug);
          setShowSubscriptionPopup(false);
          // Handle plan selection - redirect to pricing or show success message
          if (planSlug !== 'free') {
            showToast(`Welcome to ${planSlug}! You can now remove watermarks.`, 'success');
            // Enable watermark removal for paid users
            setProcessingOptions(prev => ({
              ...prev,
              enableWatermark: false
            }));
          }
        }}
      />
    </div>
  );
};

export default UploadPage;