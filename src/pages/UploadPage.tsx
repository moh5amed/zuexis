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
  Shield
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useToast } from '../components/ToastProvider';
// import { useCloudStorage } from '../hooks/useCloudStorage';
import { usePythonBackend } from '../hooks/usePythonBackend';
import { supabase } from '../lib/supabaseClient';
import { YouTubeService, YouTubeVideoMetadata } from '../services/youtubeService';

const UploadPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 🚀 CLOUD STORAGE INTEGRATION (for future use)
  // const {
  //   saveTranscription,
  //   saveAnalysis,
  //   isLoading: cloudStorageLoading,
  //   error: cloudStorageError
  // } = useCloudStorage();

  // 🐍 INTEGRATE PYTHON BACKEND FOR VIDEO PROCESSING
  const {
    isConnected: pythonBackendConnected,
    isProcessing: pythonBackendProcessing,
    connectionStatus: pythonBackendStatus,
    testConnection: testPythonBackend,
    processVideo,
    getLatestClips: getLatestClipsFromBackend
  } = usePythonBackend();
  

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
    enableContentStrategy: true // Enable content strategy by default
  });
  
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [backendError, setBackendError] = useState<string | null>(null);
  
  // 🎥 YouTube URL handling
  const [youtubeMetadata, setYoutubeMetadata] = useState<YouTubeVideoMetadata | null>(null);
  const [youtubeValidation, setYoutubeValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: false });
  const [isLoadingYoutube, setIsLoadingYoutube] = useState(false);

  // Automatically test Python backend connection when page loads
  useEffect(() => {
    const autoTestConnection = async () => {
      try {
        console.log('🔄 [UploadPage] Auto-testing Python backend connection...');
        setBackendError(null); // Clear any previous errors
        await testPythonBackend();
      } catch (error) {
        console.error('❌ [UploadPage] Auto-connection test failed:', error);
        setBackendError('Failed to connect to Python backend. Please ensure the backend is running on localhost:5000');
        showToast('Python backend connection failed', 'error');
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
    { id: 'tiktok', name: 'TikTok', color: 'bg-pink-500' },
    { id: 'instagram', name: 'Instagram', color: 'bg-purple-500' },
    { id: 'youtube', name: 'YouTube', color: 'bg-red-500' },
    { id: 'twitter', name: 'Twitter', color: 'bg-blue-500' },
    { id: 'linkedin', name: 'LinkedIn', color: 'bg-blue-600' }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      console.log('🚀 [UploadPage] Starting project creation and cloud storage upload...');
      console.log(`🎯 [UploadPage] Upload method: ${uploadMethod}`);
      
      setProcessing(true);

      // 🚀 CREATE PROJECT IN SUPABASE FIRST
      console.log('📁 [UploadPage] Creating project in Supabase...');
      
      // Get current user ID first
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('❌ [UploadPage] User not authenticated:', userError);
        showToast('User not authenticated. Please sign in again.', 'error');
        return;
      }

      console.log('👤 [UploadPage] Current user:', user.id);

      // 🔍 DEBUG: Log exactly what we're sending
      const projectData = {
        title: title.trim(),
        description: description.trim() || undefined,
        source_type: uploadMethod === 'url' ? 'youtube' : uploadMethod as 'video' | 'text',
        source_url: uploadMethod === 'url' ? url.trim() : undefined,
        status: 'processing',
        user_id: user.id
      };
      
      console.log('🔍 [UploadPage] DEBUG - Project data being sent:', projectData);
      console.log('🔍 [UploadPage] DEBUG - uploadMethod value:', uploadMethod);
      console.log('🔍 [UploadPage] DEBUG - source_type value:', projectData.source_type);

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single();

      if (projectError) {
        console.error('❌ [UploadPage] Failed to create project:', projectError);
        showToast('Failed to create project', 'error');
        return;
      }

      const projectId = project.id;
      console.log(`✅ [UploadPage] Project created in Supabase with ID: ${projectId}`);

      // 🚀 UPLOAD VIDEO TO GOOGLE DRIVE AND SAVE METADATA TO SUPABASE
      if (uploadMethod === 'file' && file) {
        console.log(`📁 [UploadPage] Uploading video to Google Drive: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
        
        try {
          // Get video metadata
          const video = document.createElement('video');
          video.preload = 'metadata';
          
          const metadata = await new Promise<{ duration?: number; resolution?: string }>((resolve) => {
            video.onloadedmetadata = () => {
              resolve({
                duration: video.duration,
                resolution: `${video.videoWidth}x${video.videoHeight}`
              });
            };
            video.onerror = () => resolve({});
            video.src = URL.createObjectURL(file);
          });

          // Send video to Python backend for processing
          console.log('🚀 [UploadPage] Sending video to Python backend for AI processing...');
          
          // Log all data being sent to backend
          const backendData = {
            projectName: title.trim(),
            description: description.trim() || '',
            sourceType: 'file' as const,
            videoFile: file,
            targetPlatforms,
            aiPrompt: aiPrompt.trim() || 'Generate viral clips with high engagement potential',
            processingOptions,
            numClips: 3
          };
          
          console.log('📊 [UploadPage] COMPLETE BACKEND DATA BEING SENT:');
          console.log('   Project Name:', backendData.projectName);
          console.log('   Description:', backendData.description);
          console.log('   Source Type:', backendData.sourceType);
          console.log('   Video File:', {
            name: backendData.videoFile.name,
            size: `${(backendData.videoFile.size / (1024 * 1024)).toFixed(2)} MB`,
            type: backendData.videoFile.type,
            lastModified: new Date(backendData.videoFile.lastModified).toISOString()
          });
          console.log('   Target Platforms:', backendData.targetPlatforms);
          console.log('   AI Prompt:', backendData.aiPrompt);
          console.log('   Processing Options:', backendData.processingOptions);
          console.log('   Number of Clips:', backendData.numClips);
          console.log('   Full Backend Data Object:', backendData);
          
          console.log('🚀 [UploadPage] CALLING processVideo function with data...');
          const backendResult = await processVideo(backendData);
          
          console.log('📥 [UploadPage] BACKEND RESULT RECEIVED:', backendResult);
          if (backendResult) {
            console.log('✅ [UploadPage] Python backend processing completed successfully');
            console.log(`📊 [UploadPage] Generated ${backendResult.clipsGenerated} clips`);
            showToast(`Video processed successfully! Generated ${backendResult.clipsGenerated} viral clips.`, 'success');
            
            // Navigate to project details
            navigate(`/projects/${projectId}`);
          } else {
            throw new Error('No processing result received from Python backend');
          }
        } catch (uploadError) {
          console.error('❌ [UploadPage] Video upload failed:', uploadError);
          showToast('Failed to upload video', 'error');
          
          // Delete the project if upload failed
          await supabase.from('projects').delete().eq('id', projectId);
          return;
        }
      } else if (uploadMethod === 'url' && youtubeMetadata) {
        // 🎥 Handle YouTube URL - Send to Python backend for processing
        console.log(`🎥 [UploadPage] Processing YouTube video: ${youtubeMetadata.title}`);
        
        try {
          // Check if Python backend is connected
          if (!pythonBackendConnected || backendError) {
            console.error('❌ [UploadPage] Cannot process YouTube video: Python backend not connected');
            showToast('Cannot process YouTube video: Python backend not connected. Please fix the connection first.', 'error');
            return;
          }
          
          // Send YouTube URL to Python backend for processing
          console.log('🚀 [UploadPage] Starting YouTube video processing with Python backend...');
          
          const processingResult = await processVideo({
            projectName: title.trim(),
            description: description.trim() || '',
            sourceType: 'url',
            sourceUrl: url.trim(),
            targetPlatforms,
            aiPrompt: aiPrompt.trim() || 'Generate viral clips from this YouTube video',
            processingOptions,
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
                user_id: user.id, // Use the user ID we already got
                project_id: projectId,
                duration: youtubeMetadata.duration,
                resolution: '1920x1080', // Default YouTube resolution
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }])
              .select()
              .single();

            if (clipError) {
              console.error('❌ [UploadPage] Failed to create video clip for YouTube:', clipError);
              throw new Error('Failed to save YouTube video metadata');
            }

            console.log(`✅ [UploadPage] YouTube video clip created with ID: ${clipData.id}`);
            showToast(`YouTube video processed successfully! Generated ${processingResult.clipsGenerated} clips.`, 'success');
            
            // Navigate to project details
            navigate(`/projects/${projectId}`);
          } else {
            throw new Error('No processing result received from Python backend');
          }
        } catch (youtubeError) {
          console.error('❌ [UploadPage] YouTube video processing failed:', youtubeError);
          showToast('Failed to process YouTube video', 'error');
          
          // Delete the project if processing failed
          await supabase.from('projects').delete().eq('id', projectId);
          return;
        }
      } else if (uploadMethod === 'text') {
        // For text content, just navigate to project details
        console.log('✅ [UploadPage] Project created for text content');
        showToast('Project created successfully!', 'success');
        navigate(`/projects/${projectId}`);
      }

    } catch (error) {
      console.error('❌ [UploadPage] Project creation failed:', error);
      showToast('Failed to create project', 'error');
    } finally {
      setProcessing(false);
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
      enableContentStrategy: true
    });
    
    // Reset YouTube-related state
    setYoutubeMetadata(null);
    setYoutubeValidation({ isValid: false });
    setIsLoadingYoutube(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };



  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Sidebar />
      <main className="md:ml-64 p-6 pt-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Create New Project</h1>
            <p className="text-gray-400">Upload content and let AI create engaging clips for your target platforms</p>
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
                        setBackendError('Retry failed. Please ensure the backend is running on localhost:5000');
                      }
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
                  >
                    Retry Connection
                  </button>
                  <span className="text-sm text-red-400">
                    Processing will be disabled until backend connection is established
                  </span>
                </div>
              </div>
            )}

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
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    AI Instructions (Advanced)
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Give specific, detailed instructions to AI for clip generation. Be very specific about what you want!"
                  />
                  <div className="text-sm text-gray-400 mt-1">
                    <strong>Examples:</strong><br/>
                    • "Focus on moments with high energy, laughter, or surprising revelations"<br/>
                    • "Prioritize clips that show problem-solving or skill demonstrations"<br/>
                    • "Look for emotional peaks, dramatic moments, or unexpected outcomes"<br/>
                    • "Target segments with clear storytelling, strong visuals, or viral potential"
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
                </div>
              </div>
            </div>

            {/* Target Platforms */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">Target Platforms</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
                    <div className={`w-3 h-3 rounded-full ${platform.color} mx-auto mb-2`}></div>
                    <div className="text-sm font-medium">{platform.name}</div>
                  </button>
                ))}
              </div>
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
      </main>
    </div>
  );
};

export default UploadPage;