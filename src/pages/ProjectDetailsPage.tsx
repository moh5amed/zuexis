import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { ArrowLeft, Share2, Clock, CheckCircle2, AlertCircle, Cloud, Video, Youtube, FileText, Trash2, FileDown, Copy, Check, Download } from 'lucide-react';
import { supabaseProjectsService, ProjectWithContent, TranscriptionData, AnalysisData, VideoClip } from '../services/supabaseProjects';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../contexts/AuthContext';
import { useCloudStorage } from '../hooks/useCloudStorage';
import VideoPlayer from '../components/VideoPlayer';
import { cloudStorageService } from '../services/cloudStorageService';

import { supabase } from '../lib/supabaseClient';

const ProjectDetailsPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectWithContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingTranscription, setDownloadingTranscription] = useState<string | null>(null);
  const [copiedTranscription, setCopiedTranscription] = useState<string | null>(null);
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { uploadTranscription, uploadAnalysis } = useCloudStorage();

  useEffect(() => {
    if (user?.id && projectId) {
      supabaseProjectsService.setCurrentUser(user.id);
      loadProject();
    }
  }, [user, projectId]);

  const loadProject = async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      setError(null);

      const projectData = await supabaseProjectsService.getProjectWithContent(projectId);
      if (!projectData) {
        setError('Project not found');
        return;
      }

      setProject(projectData);
    } catch (error) {
      console.error('Error loading project:', error);
      setError('Failed to load project');
      showToast('Failed to load project', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    
    const confirmMessage = `Are you sure you want to delete this project "${project.title}"?\n\nThis will permanently delete:\n• ${project.clips?.filter(clip => 
    clip.name && 
    !clip.name.includes('transcription') && 
    !clip.name.includes('.txt') &&
    clip.mime_type && clip.mime_type.startsWith('video/')
  ).length || 0} video clips\n• All transcriptions and analyses\n• All cloud storage files\n• Project data and settings\n\nThis action cannot be undone.`;
    
    if (window.confirm(confirmMessage)) {
      try {
        setLoading(true);
        showToast('Deleting project and all related data...', 'info');
        
        await supabaseProjectsService.deleteProject(project.id);
        showToast('Project and all related data deleted successfully', 'success');
        navigate('/projects');
      } catch (error) {
        console.error('Error deleting project:', error);
        showToast('Failed to delete project. Some data may still exist.', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDownloadTranscription = async (transcription: TranscriptionData, filename: string) => {
    try {
      setDownloadingTranscription(transcription.id);
      
      // Create and download file
      const blob = new Blob([transcription.text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Transcription downloaded successfully', 'success');
    } catch (error) {
      console.error('Error downloading transcription:', error);
      showToast('Failed to download transcription', 'error');
    } finally {
      setDownloadingTranscription(null);
    }
  };

  const handleCopyTranscription = async (transcription: TranscriptionData) => {
    try {
      await navigator.clipboard.writeText(transcription.text);
      setCopiedTranscription(transcription.id);
      showToast('Transcription copied to clipboard', 'success');
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedTranscription(null), 2000);
    } catch (error) {
      console.error('Error copying transcription:', error);
      showToast('Failed to copy transcription', 'error');
    }
  };

  const handleUploadTranscriptionToCloud = async (transcription: TranscriptionData, clipName: string) => {
    try {
      const filename = `transcription_${clipName}_${transcription.id}.txt`;
      
      // Get the first connected cloud provider
      if (!project?.clips || project.clips.length === 0) {
        showToast('No clips found for this project', 'error');
        return;
      }

      const firstClip = project.clips[0];
      const providerId = firstClip.cloud_provider_id;
      
      const result = await uploadTranscription(
        providerId,
        transcription.text,
        filename,
        project.id,
        transcription.clip_id || undefined
      );

      if (result.success) {
        showToast('Transcription uploaded to cloud storage successfully', 'success');
      }
    } catch (error) {
      console.error('Error uploading transcription to cloud:', error);
      showToast('Failed to upload transcription to cloud storage', 'error');
    }
  };

  const handleUploadAnalysisToCloud = async (analysis: AnalysisData, clipName: string) => {
    try {
      const filename = `analysis_${clipName}_${analysis.id}.json`;
      
      // Get the first connected cloud provider
      if (!project?.clips || project.clips.length === 0) {
        showToast('No clips found for this project', 'error');
        return;
      }

      const firstClip = project.clips[0];
      const providerId = firstClip.cloud_provider_id;
      
      await uploadAnalysis(
        providerId,
        analysis.data,
        filename,
        project.id,
        analysis.clip_id
      );

        showToast('Analysis uploaded to cloud storage successfully', 'success');
    } catch (error) {
      console.error('Error uploading analysis to cloud:', error);
      showToast('Failed to upload analysis to cloud storage', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'processing':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'failed':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'processing':
        return <Clock className="h-4 w-4" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getSourceTypeIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'youtube':
        return <Youtube className="h-4 w-4" />;
      case 'text':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (duration: any) => {
    // Handle different duration formats
    if (!duration) return 'Unknown';
    
    let seconds: number;
    
    // If it's already a number (seconds)
    if (typeof duration === 'number') {
      seconds = duration;
    }
    // If it's a string that can be parsed as seconds
    else if (typeof duration === 'string') {
      // Check if it's in format "HH:MM:SS" or "MM:SS"
      if (duration.includes(':')) {
        const parts = duration.split(':').map(Number);
        if (parts.length === 3) {
          // HH:MM:SS format
          seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
          // MM:SS format
          seconds = parts[0] * 60 + parts[1];
        } else {
          return duration; // Return as-is if we can't parse
        }
      } else {
        // Try to parse as seconds
        seconds = parseFloat(duration);
        if (isNaN(seconds)) return 'Unknown';
      }
    }
    // If it's an interval object from PostgreSQL
    else if (typeof duration === 'object' && duration !== null) {
      // Handle PostgreSQL interval format
      if (duration.hours !== undefined || duration.minutes !== undefined || duration.seconds !== undefined) {
        seconds = (duration.hours || 0) * 3600 + (duration.minutes || 0) * 60 + (duration.seconds || 0);
      } else {
        return 'Unknown';
      }
    }
    else {
      return 'Unknown';
    }
    
    // Validate seconds
    if (isNaN(seconds) || seconds < 0) return 'Unknown';
    
    // Format the duration
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle video download
  const handleDownloadVideo = async (clip: VideoClip) => {
    try {
      showToast('Starting download...', 'info');
      
      // Use the cloud storage service for proper download
      const { success, file, error } = await cloudStorageService.downloadVideoClip(clip.id);
      
      if (success && file) {
        // Create download link for the file
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = clip.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL
        URL.revokeObjectURL(url);
        
        showToast('Download completed!', 'success');
        console.log('✅ [ProjectDetailsPage] Download successful:', file.name);
      } else {
        console.error('❌ [ProjectDetailsPage] Download failed:', error);
        showToast('Download failed. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Download error:', error);
      showToast('Failed to download video', 'error');
    }
  };

  // Mark project as completed manually (for testing)
  const handleMarkCompleted = async () => {
    if (!project) return;
    
    try {
      await supabaseProjectsService.updateProjectStatus(project.id, 'completed');
      showToast('Project marked as completed!', 'success');
      loadProject(); // Refresh project data
    } catch (error) {
      console.error('Error updating project status:', error);
      showToast('Failed to update project status', 'error');
    }
  };

  // Helper function to get transcription for a clip
  const getClipTranscription = (clipId: string): TranscriptionData | undefined => {
    return project?.transcriptions?.find(t => t.clip_id === clipId);
  };

  // Helper function to get analysis for a clip
  const getClipAnalysis = (clipId: string): AnalysisData | undefined => {
    return project?.analyses?.find(a => a.clip_id === clipId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Sidebar />
        <main className="md:ml-64 p-6 pt-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading project...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Sidebar />
        <main className="md:ml-64 p-6 pt-6">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Project not found</h3>
            <p className="text-gray-400 mb-6">{error || 'The project you are looking for does not exist.'}</p>
            <Link
              to="/projects"
              className="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Projects
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Sidebar />
      <main className="md:ml-64 p-6 pt-6">
        <div className="max-w-7xl mx-auto">
          {/* Enhanced Header */}
          <div className="mb-10">
            {/* Back Button and Title Row */}
            <div className="flex items-center gap-4 mb-6">
              <Link
                to="/projects"
                className="group p-3 text-gray-400 hover:text-white transition-all duration-200 rounded-xl hover:bg-gray-800/50 hover:scale-105"
              >
                <ArrowLeft className="h-5 w-5 group-hover:translate-x-[-2px] transition-transform duration-200" />
              </Link>
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  {project.title}
                </h1>
                {project.description && (
                  <p className="text-gray-400 text-lg leading-relaxed max-w-3xl">
                    {project.description}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteProject}
                  disabled={loading}
                  className="group p-3 text-red-400 hover:text-red-300 transition-all duration-200 rounded-xl hover:bg-red-500/10 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed border border-red-500/20 hover:border-red-500/40"
                  title="Delete project"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                  ) : (
                    <Trash2 className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Enhanced Project Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Source Type Card */}
              <div className="group bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600/70 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-gray-900/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
                  {getSourceTypeIcon(project.source_type)}
                </div>
                  <span className="text-gray-400 text-sm font-medium">Source Type</span>
                </div>
                <p className="text-white font-bold text-xl capitalize">{project.source_type}</p>
              </div>
              
              {/* Status Card */}
              <div className="group bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600/70 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-gray-900/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
                    <Clock className="h-5 w-5 text-yellow-400" />
                </div>
                  <span className="text-gray-400 text-sm font-medium">Status</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-2 rounded-full text-sm font-semibold border ${getStatusColor(project.status)}`}>
                  {getStatusIcon(project.status)}
                    <span className="ml-2 capitalize">{project.status}</span>
                </span>
                  {project.status === 'processing' && (
                    <button
                      onClick={handleMarkCompleted}
                      className="px-3 py-2 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 hover:scale-105 font-medium"
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
              </div>
              
              {/* Clips Count Card */}
              <div className="group bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600/70 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-gray-900/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-500/20 rounded-xl border border-purple-500/30">
                    <Video className="h-5 w-5 text-purple-400" />
                </div>
                  <span className="text-gray-400 text-sm font-medium">Clips Generated</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-white font-bold text-3xl">
                  {project.clips?.filter(clip => 
                    clip.name && 
                    !clip.name.includes('transcription') && 
                    !clip.name.includes('.txt') &&
                    clip.mime_type && clip.mime_type.startsWith('video/')
                  ).length || 0}
                </p>
                  <span className="text-gray-500 text-sm">viral clips</span>
                </div>
              </div>
              
              {/* Created Date Card */}
              <div className="group bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600/70 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-gray-900/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-500/20 rounded-xl border border-green-500/30">
                    <div className="h-5 w-5 text-green-400">
                      <Clock className="h-5 w-5 text-green-400" />
                </div>
              </div>
                  <span className="text-gray-400 text-sm font-medium">Created</span>
                </div>
                <p className="text-white font-bold text-lg">{formatDate(project.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Source Information */}
          {project.source_url && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Youtube className="h-5 w-5 text-red-400" />
                Source Video
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-gray-400 text-sm mb-1">YouTube URL</p>
                  <a
                    href={project.source_url}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 break-all"
                  >
                    {project.source_url}
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Generated Clips */}
          {project.clips && project.clips.length > 0 ? (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-xl border border-purple-500/30">
                    <Video className="h-6 w-6 text-purple-400" />
                  </div>
                  Generated Viral Clips
                </h3>
                <div className="text-gray-400 text-sm bg-gray-800/50 px-4 py-2 rounded-full border border-gray-700/50">
                  {project.clips.filter(clip => 
                    clip.name && 
                    !clip.name.includes('transcription') && 
                    !clip.name.includes('.txt') &&
                    clip.mime_type && clip.mime_type.startsWith('video/')
                  ).length} video clips generated
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                {project.clips
                  .filter(clip => {
                    // Filter out transcription files and only show actual video files
                    const isVideoFile = clip.name && 
                      !clip.name.includes('transcription') && 
                      !clip.name.includes('.txt') &&
                      clip.mime_type && clip.mime_type.startsWith('video/');
                    return isVideoFile;
                  })
                  .map((clip, index) => {
                  const transcription = getClipTranscription(clip.id);
                  const analysis = getClipAnalysis(clip.id);
                  
                  return (
                    <div key={clip.id} className="group bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700/50 overflow-hidden hover:border-purple-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-900/20">
                      {/* Enhanced Clip Header */}
                      <div className="p-6 border-b border-gray-700/50 bg-gradient-to-r from-gray-900/50 to-gray-800/50">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="text-white font-bold text-lg leading-tight line-clamp-2">{clip.name}</h4>
                              <p className="text-gray-400 text-sm">Viral Clip #{index + 1}</p>
                            </div>
                          </div>
                          <span className="text-xs text-gray-300 bg-gray-700/50 px-3 py-1 rounded-full border border-gray-600/50">
                            {clip.cloud_provider_id}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          {clip.duration && (
                            <span className="flex items-center gap-2 bg-gray-700/30 px-3 py-1 rounded-full">
                              <Clock className="h-3 w-3" />
                              {formatDuration(clip.duration)}
                            </span>
                          )}
                          <span className="flex items-center gap-2 bg-gray-700/30 px-3 py-1 rounded-full">
                            <Cloud className="h-3 w-3" />
                            {formatFileSize(clip.size)}
                          </span>
                        </div>
                      </div>

                      {/* Video Player with Download Button */}
                      <div className="px-4 pb-4">
                        <div className="flex items-center gap-3 mb-3">
                          <h5 className="text-sm font-medium text-gray-300">Video Preview</h5>
                          <button
                            onClick={() => handleDownloadVideo(clip)}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-all duration-200 hover:scale-105"
                            title="Download video"
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </button>
                        </div>
                        <VideoPlayer
                          videoClip={clip}
                          className="w-full h-48 rounded-xl"
                          showControls={true}
                          autoPlay={false}
                          muted={true}
                          loop={false}
                        />
                      </div>

                      {/* Clip Content */}
                      <div className="p-4">
                        {/* Transcription Preview */}
                        {transcription && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-gray-400">Transcription</p>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleCopyTranscription(transcription)}
                                  className="p-1 text-gray-400 hover:text-white transition-colors rounded"
                                  title="Copy to clipboard"
                                >
                                  {copiedTranscription === transcription.id ? (
                                    <Check className="h-3 w-3 text-green-400" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDownloadTranscription(
                                    transcription,
                                    `clip_transcription_${clip.name}.txt`
                                  )}
                                  disabled={downloadingTranscription === transcription.id}
                                  className="p-1 text-gray-400 hover:text-white transition-colors rounded disabled:opacity-50"
                                  title="Download transcription"
                                >
                                  {downloadingTranscription === transcription.id ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                                  ) : (
                                    <FileDown className="h-3 w-3" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleUploadTranscriptionToCloud(transcription, clip.name)}
                                  className="p-1 text-gray-400 hover:text-white transition-colors rounded"
                                  title="Upload to cloud storage"
                                >
                                  <Cloud className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <div className="bg-gray-900 rounded p-2 max-h-24 overflow-y-auto">
                              <p className="text-xs text-gray-300 line-clamp-3">
                                {transcription.text}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                              <span>Lang: {transcription.language}</span>
                              {transcription.confidence && (
                                <span>Conf: {Math.round(transcription.confidence * 100)}%</span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Analysis Preview */}
                        {analysis && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-gray-400">AI Analysis</p>
                              <button
                                onClick={() => handleUploadAnalysisToCloud(analysis, clip.name)}
                                className="p-1 text-gray-400 hover:text-white transition-colors rounded"
                                title="Upload to cloud storage"
                              >
                                <Cloud className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="text-sm text-gray-300">
                              <div className="bg-gray-900 rounded p-2">
                                <p className="text-xs text-gray-400 mb-1">Type: {analysis.analysis_type}</p>
                                <pre className="text-xs text-gray-300 overflow-x-auto">
                                  {JSON.stringify(analysis.data, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Video controls are now handled by the VideoPlayer component above */}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-12 border border-gray-700/50 text-center">
              <div className="w-20 h-20 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Video className="h-10 w-10 text-gray-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-300 mb-3">No clips generated yet</h3>
              <p className="text-gray-400 text-lg mb-6 max-w-md mx-auto leading-relaxed">
                {project.status === 'processing' 
                  ? 'Your video is being processed by our AI. Viral clips will appear here once generation is complete.'
                  : 'No video clips have been generated for this project yet. Start processing to create engaging viral content.'
                }
              </p>
              {project.status === 'processing' && (
                <div className="flex items-center justify-center gap-3 text-yellow-400 bg-yellow-500/10 px-6 py-3 rounded-full border border-yellow-500/20 max-w-sm mx-auto">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                  <span className="font-medium">Processing in progress...</span>
                </div>
              )}
            </div>
          )}

          {/* Full Video Player Section */}
          {(() => {
            // Find full video clip
            const fullVideoClip = project.clips?.find(c => 
              c.name && 
              c.name.startsWith('Full Video -') &&
              c.mime_type && c.mime_type.startsWith('video/')
            );
            
            return fullVideoClip ? (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
                      <Video className="h-6 w-6 text-blue-400" />
                    </div>
                    Full Video
                  </h3>
                  <div className="text-gray-400 text-sm bg-gray-800/50 px-4 py-2 rounded-full border border-gray-700/50">
                    Complete video
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-blue-900/20 to-blue-800/20 rounded-2xl border border-blue-500/30 shadow-lg overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg">
                        <Video className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-white">{fullVideoClip.name}</h4>
                        <p className="text-blue-300 text-sm">Complete video content</p>
                      </div>
                    </div>
                    
                    {/* Full Video Player with Download */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-medium text-blue-300">Full Video</h5>
                        <button
                          onClick={() => handleDownloadVideo(fullVideoClip)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105"
                          title="Download full video"
                        >
                          <Download className="h-4 w-4" />
                          Download Full Video
                        </button>
                      </div>
                      <VideoPlayer
                        videoClip={fullVideoClip}
                        className="w-full h-96 rounded-xl"
                        showControls={true}
                        autoPlay={false}
                        muted={true}
                        loop={false}
                      />
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      {fullVideoClip.duration && (
                        <span className="flex items-center gap-2 bg-blue-500/20 px-3 py-1 rounded-full border border-blue-500/30">
                          <Clock className="h-3 w-3" />
                          {formatDuration(fullVideoClip.duration)}
                        </span>
                      )}
                      <span className="flex items-center gap-2 bg-blue-500/20 px-3 py-1 rounded-full border border-blue-500/30">
                        <Cloud className="h-3 w-3" />
                        {formatFileSize(fullVideoClip.size)}
                      </span>
                      {fullVideoClip.resolution && (
                        <span className="px-3 py-1 bg-blue-500/20 rounded-full text-xs border border-blue-500/30">
                          {fullVideoClip.resolution}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null;
          })()}

          {/* Transcriptions Section - Full Video + Individual Clips */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
                  <FileText className="h-6 w-6 text-blue-400" />
                </div>
                Video Transcriptions
              </h3>
              <div className="text-gray-400 text-sm bg-gray-800/50 px-4 py-2 rounded-full border border-gray-700/50">
                {project.transcriptions?.length || 0} transcriptions
              </div>
            </div>

            {project.transcriptions && project.transcriptions.length > 0 ? (
              <div className="space-y-6">
                {/* Full Video Transcription (if exists) */}
                {(() => {
                  // Find full video transcription by looking for clips with "Full Video -" name
                  const fullVideoClip = project.clips?.find(c => 
                    c.name && 
                    c.name.startsWith('Full Video -') &&
                    c.mime_type && c.mime_type.startsWith('video/')
                  );
                  const fullVideoTranscription = fullVideoClip ? 
                    project.transcriptions.find(t => t.clip_id === fullVideoClip.id) : null;
                  
                  // Remove it from the list to avoid duplication
                  const clipTranscriptions = project.transcriptions.filter(t => 
                    !fullVideoClip || t.clip_id !== fullVideoClip.id
                  );
                  
                  return (
                    <>
                      {/* Full Video Transcription Card - Only show if it exists */}
                      {fullVideoTranscription && (
                        <div className="bg-gradient-to-r from-blue-900/20 to-blue-800/20 rounded-2xl border border-blue-500/30 shadow-lg">
                          <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg">
                                <FileText className="h-6 w-6" />
                              </div>
                              <div>
                                <h4 className="text-xl font-bold text-white">Full Video Transcription</h4>
                                <p className="text-blue-300 text-sm">Complete video content transcription</p>
                              </div>
                            </div>
                            
                            <div className="bg-gray-900/50 rounded-xl p-4 max-h-80 overflow-y-auto border border-gray-600/30 mb-4">
                              <p className="text-gray-200 text-sm leading-relaxed">
                                {fullVideoTranscription.text}
                              </p>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-400">Language:</span>
                                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
                                  {fullVideoTranscription.language || 'en'}
                                </span>
                                {fullVideoTranscription.confidence && (
                                  <>
                                    <span className="text-sm text-gray-400">Confidence:</span>
                                    <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
                                      {Math.round(fullVideoTranscription.confidence * 100)}%
                                    </span>
                                  </>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleCopyTranscription(fullVideoTranscription)}
                                  className="p-2 text-gray-400 hover:text-white transition-all duration-200 rounded-lg hover:bg-gray-700 hover:scale-105"
                                  title="Copy to clipboard"
                                >
                                  {copiedTranscription === fullVideoTranscription.id ? (
                                    <Check className="h-4 w-4 text-green-400" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDownloadTranscription(
                                    fullVideoTranscription,
                                    `full_video_transcription_${project.title}.txt`
                                  )}
                                  disabled={downloadingTranscription === fullVideoTranscription.id}
                                  className="p-2 text-gray-400 hover:text-white transition-all duration-200 rounded-lg hover:bg-gray-700 hover:scale-105 disabled:opacity-50"
                                  title="Download transcription"
                                >
                                  {downloadingTranscription === fullVideoTranscription.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                  ) : (
                                    <FileDown className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Individual Clip Transcriptions */}
                      {clipTranscriptions.length > 0 && (
              <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                            <div className="p-2 bg-purple-500/20 rounded-xl border border-purple-500/30">
                              <FileText className="h-5 w-5 text-purple-400" />
                            </div>
                            Individual Clip Transcriptions
                          </h4>
                          
                          {clipTranscriptions.map((transcription, index) => {
                  const clip = project.clips?.find(c => c.id === transcription.clip_id);
                  return (
                              <div key={transcription.id} className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl border border-gray-700 shadow-lg">
                                <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                                        {index + 1}
                                      </div>
                                      <div>
                                        <h5 className="text-white font-semibold">
                                          Clip: {clip?.name || 'Unknown Clip'}
                                        </h5>
                                        <p className="text-gray-400 text-sm">Individual clip transcription</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm text-gray-400">Language:</span>
                                      <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">
                                        {transcription.language || 'en'}
                                      </span>
                                      {transcription.confidence && (
                                        <>
                                          <span className="text-sm text-gray-400">Confidence:</span>
                                          <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
                                            {Math.round(transcription.confidence * 100)}%
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="bg-gray-900/50 rounded-xl p-4 max-h-48 overflow-y-auto border border-gray-600/30 mb-4">
                                    <p className="text-gray-200 text-sm leading-relaxed">
                                      {transcription.text}
                                    </p>
                                  </div>
                                  
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCopyTranscription(transcription)}
                                      className="p-2 text-gray-400 hover:text-white transition-all duration-200 rounded-lg hover:bg-gray-700 hover:scale-105"
                            title="Copy to clipboard"
                          >
                            {copiedTranscription === transcription.id ? (
                              <Check className="h-4 w-4 text-green-400" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDownloadTranscription(
                              transcription,
                                        `clip_transcription_${clip?.name || 'clip'}.txt`
                            )}
                            disabled={downloadingTranscription === transcription.id}
                                      className="p-2 text-gray-400 hover:text-white transition-all duration-200 rounded-lg hover:bg-gray-700 hover:scale-105 disabled:opacity-50"
                            title="Download transcription"
                          >
                            {downloadingTranscription === transcription.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                            ) : (
                              <FileDown className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="h-10 w-10 text-gray-500" />
                </div>
                <h4 className="text-2xl font-bold text-gray-300 mb-3">No Transcriptions Available</h4>
                <p className="text-gray-400 text-lg max-w-md mx-auto leading-relaxed">
                  Transcriptions will appear here once video processing is complete
                </p>
            </div>
          )}
          </div>



          {/* Analyses Section */}
          {project.analyses && project.analyses.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-6">AI Analysis Results</h3>
              <div className="space-y-4">
                {project.analyses.map((analysis) => {
                  const clip = project.clips?.find(c => c.id === analysis.clip_id);
                  return (
                    <div key={analysis.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-white">
                          Analysis for: {clip?.name || 'Unknown Clip'}
                        </h4>
                        <button
                          onClick={() => handleUploadAnalysisToCloud(analysis, clip?.name || 'clip')}
                          className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
                          title="Upload to cloud storage"
                        >
                          <Cloud className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="mb-4">
                        <span className="text-sm text-gray-400">Analysis Type:</span>
                        <span className="ml-2 text-lg font-semibold text-purple-400 capitalize">
                          {analysis.analysis_type}
                        </span>
                      </div>
                      
                      <div className="bg-gray-900 rounded-lg p-4">
                        <pre className="text-sm text-gray-300 overflow-x-auto">
                          {JSON.stringify(analysis.data, null, 2)}
                        </pre>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
                        <span>Created: {formatDate(analysis.created_at)}</span>
                        <span>Updated: {formatDate(analysis.updated_at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProjectDetailsPage;