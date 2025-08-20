import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Play, 
  Download, 
  Share2, 
  Edit, 
  Copy, 
  Heart,
  MessageCircle,
  Eye,
  BarChart3,
  Hash,
  Type,
  Clock,
  ArrowLeft,
  Settings,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Brain,
  TrendingUp,
  FileVideo,
  FileText
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useToast } from '../components/ToastProvider';
import { supabase } from '../lib/supabaseClient';
import { aiProcessorService, ProcessingOptions } from '../services/aiProcessor';
import { ultraVideoProcessor } from '../services/ultraVideoProcessor';

const ProjectDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [project, setProject] = useState<any | null>(null);
  const [clips, setClips] = useState<any[]>([]);
  const [videoClips, setVideoClips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedClip, setSelectedClip] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [processingOptions, setProcessingOptions] = useState<ProcessingOptions>({
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

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  const loadProject = async () => {
    try {
      setLoading(true);
      if (!id) return;

      // Load project from Supabase
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError || !projectData) {
        console.error('Project not found:', projectError);
        showToast('Project not found', 'error');
        navigate('/projects');
        return;
      }

      setProject(projectData);
      
      // Load clips from Python backend
      try {
        const response = await fetch(`http://localhost:5000/api/frontend/get-latest-clips`);
        if (response.ok) {
          const clipsData = await response.json();
          if (clipsData.success && clipsData.clips) {
            setVideoClips(clipsData.clips);
            setClips(clipsData.clips.map((clip: any) => ({
              id: clip.id,
              startTime: clip.start_time,
              endTime: clip.end_time,
              duration: clip.duration,
              viralScore: clip.viral_score,
              content: clip.segment_text || clip.caption
            })));
          }
        }
      } catch (clipsError) {
        console.log('No clips found yet, project might still be processing');
      }
    } catch (error) {
      console.error('Error loading project:', error);
      showToast('Failed to load project', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessProject = async () => {
    if (!id || !project) return;

    try {
      setProcessing(true);
      showToast('Starting AI processing...', 'info');

      const result = await aiProcessorService.processProject(project, processingOptions);
      
      if (result.success) {
        setClips(result.clips);
        setVideoClips(result.clips); // Use clips as video clips
        setProject((prev: any) => prev ? { ...prev, status: 'completed' } : null);
        showToast(`Successfully generated ${result.clips.length} clips!`, 'success');
        
        // Show optimization info if available
        if (result.optimizationApplied.length > 0) {
          showToast(`Applied optimizations: ${result.optimizationApplied.join(', ')}`, 'success');
        }
      } else {
        showToast(`Processing failed: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error processing project:', error);
      showToast('Failed to process project', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleCopyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${type} copied to clipboard!`, 'success');
  };

  const handleDownloadClip = async (clip: any) => {
    try {
      if (clip.videoData) {
        let blob: Blob;
        
        // Handle both ArrayBuffer and base64 string data
        if (clip.videoData instanceof ArrayBuffer) {
          blob = new Blob([clip.videoData], { type: 'video/mp4' });
        } else if (typeof clip.videoData === 'string' && clip.videoData.startsWith('data:video/mp4;base64,')) {
          // Convert base64 to blob
          const base64Data = clip.videoData.split(',')[1];
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          blob = new Blob([bytes], { type: 'video/mp4' });
        } else {
          throw new Error('Unsupported video data format');
        }
        
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `clip_${clip.startTime}s_to_${clip.endTime}s.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Cleanup
        URL.revokeObjectURL(url);
        
        showToast('Clip downloaded successfully!', 'success');
      } else {
        showToast('No video data available for download', 'error');
      }
    } catch (error) {
      console.error('Download error:', error);
      showToast('Failed to download clip', 'error');
    }
  };

  const handleDownloadAllClips = async () => {
    try {
      let downloadedCount = 0;
      
      for (const clip of clips) {
        if (clip.videoData) {
          let blob: Blob;
          
          // Handle both ArrayBuffer and base64 string data
          if (clip.videoData instanceof ArrayBuffer) {
            blob = new Blob([clip.videoData], { type: 'video/mp4' });
          } else if (typeof clip.videoData === 'string' && clip.videoData.startsWith('data:video/mp4;base64,')) {
            // Convert base64 to blob
            const base64Data = clip.videoData.split(',')[1];
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            blob = new Blob([bytes], { type: 'video/mp4' });
          } else {
            continue; // Skip unsupported format
          }
          
          const url = URL.createObjectURL(blob);
          
          // Create download link
          const a = document.createElement('a');
          a.href = url;
          a.download = `clip_${clip.startTime}s_to_${clip.endTime}s.mp4`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          // Cleanup
          URL.revokeObjectURL(url);
          downloadedCount++;
        }
      }
      
      if (downloadedCount > 0) {
        showToast(`${downloadedCount} clips downloaded successfully!`, 'success');
      } else {
        showToast('No clips available for download', 'error');
      }
    } catch (error) {
      console.error('Download all error:', error);
      showToast('Failed to download clips', 'error');
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getAIClipCount = () => {
    return clips.filter(clip => clip.hashtags && clip.hashtags.length > 0).length;
  };

  const getAverageEngagementScore = () => {
    const aiClips = clips.filter(clip => clip.hashtags && clip.hashtags.length > 0);
    if (aiClips.length === 0) return 0;
    
    // Calculate engagement score based on hashtag count and caption quality
    const totalScore = aiClips.reduce((sum, clip) => {
      let score = 0;
      if (clip.hashtags) score += Math.min(clip.hashtags.length, 5); // Max 5 points for hashtags
      if (clip.caption && clip.caption.length > 50) score += 3; // 3 points for good caption
      if (clip.description && clip.description.length > 20) score += 2; // 2 points for description
      return sum + score;
    }, 0);
    
    return Math.round((totalScore / aiClips.length) * 2); // Scale to 0-20, then divide by 2 for 0-10
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

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Sidebar />
        <main className="md:ml-64 p-6 pt-6">
          <div className="text-center">
            <p className="text-gray-400">Project not found</p>
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
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Projects</span>
            </button>
            
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
                <p className="text-gray-400 mb-4">{project.description}</p>
                
                {/* Status Badge */}
                <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(project.status)}`}>
                  {getStatusIcon(project.status)}
                  <span className="capitalize">{project.status}</span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-3">
                {project.status === 'pending' && (
                  <button
                    onClick={handleProcessProject}
                    disabled={processing}
                    className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 px-6 py-3 rounded-lg font-medium transition-all duration-200"
                  >
                    <Sparkles className="h-5 w-5" />
                    <span>{processing ? 'Processing...' : 'Process with AI'}</span>
                  </button>
                )}
                
                {project.status === 'completed' && videoClips.length > 0 && (
                  <button 
                    onClick={handleDownloadAllClips}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download All Clips</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Project Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <h3 className="font-semibold">Source Type</h3>
              </div>
              <p className="text-2xl font-bold capitalize">{project.sourceType}</p>
              <p className="text-gray-400 text-sm">
                {project.sourceType === 'file' ? 'Local video file' : 
                 project.sourceType === 'url' ? 'YouTube URL' : 'Text content'}
              </p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <h3 className="font-semibold">Target Platforms</h3>
              </div>
              <p className="text-2xl font-bold">{project.targetPlatforms.length}</p>
              <p className="text-gray-400 text-sm">
                {project.targetPlatforms.join(', ')}
              </p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <h3 className="font-semibold">Created</h3>
              </div>
              <p className="text-2xl font-bold">
                {new Date(project.createdAt).toLocaleDateString()}
              </p>
              <p className="text-gray-400 text-sm">
                {new Date(project.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </div>

          {/* AI Enhancement Stats (if completed) */}
          {project.status === 'completed' && clips.length > 0 && (
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-6 rounded-xl border border-purple-500/20 mb-8">
              <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                <Brain className="h-5 w-5 text-purple-400" />
                <span>AI Enhancement Results</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-400 mb-2">
                    {getAIClipCount()}
                  </div>
                  <p className="text-gray-400 text-sm">AI Enhanced Clips</p>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-2">
                    {getAverageEngagementScore().toFixed(1)}
                  </div>
                  <p className="text-gray-400 text-sm">Avg. Engagement Score</p>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400 mb-2">
                    {clips.length}
                  </div>
                  <p className="text-gray-400 text-sm">Total Clips Generated</p>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-400 mb-2">
                    {Math.round((getAIClipCount() / clips.length) * 100)}%
                  </div>
                  <p className="text-gray-400 text-sm">AI Enhancement Rate</p>
                </div>
              </div>
            </div>
          )}

          {/* Processing Options (if pending) */}
          {project.status === 'pending' && (
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <Settings className="h-5 w-5 text-purple-400" />
                <span>AI Processing Options</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    AI Enhancement
                  </label>
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
                  <div className="text-xs text-gray-400 mt-1">Use Gemini AI</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Transcription
                  </label>
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
                  <div className="text-xs text-gray-400 mt-1">Generate Text</div>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-700">
              <nav className="-mb-px flex space-x-8">
                {['overview', 'clips', 'transcription', 'analytics'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                      activeTab === tab
                        ? 'border-purple-500 text-purple-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    {tab === 'overview' && <Eye className="h-4 w-4 inline mr-2" />}
                    {tab === 'clips' && <Play className="h-4 w-4 inline mr-2" />}
                    {tab === 'transcription' && <FileText className="h-4 w-4 inline mr-2" />}
                    {tab === 'analytics' && <BarChart3 className="h-4 w-4 inline mr-2" />}
                    {tab}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* AI Prompt */}
              {project.aiPrompt && (
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                  <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                    <span>AI Instructions</span>
                  </h3>
                  <p className="text-gray-300">{project.aiPrompt}</p>
                </div>
              )}

              {/* Source Details */}
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 className="text-lg font-semibold mb-4">Source Details</h3>
                <div className="space-y-3">
                  {project.sourceType === 'file' && project.sourcePath && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">File ID:</span>
                      <span className="font-mono text-sm">{project.sourcePath}</span>
                    </div>
                  )}
                  
                  {project.sourceType === 'url' && project.sourceUrl && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">URL:</span>
                      <a 
                        href={project.sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 break-all"
                      >
                        {project.sourceUrl}
                      </a>
                    </div>
                  )}
                  
                  {project.sourceType === 'text' && project.sourceText && (
                    <div>
                      <span className="text-gray-400 block mb-2">Text Content:</span>
                      <div className="bg-gray-700 p-4 rounded-lg max-h-40 overflow-y-auto">
                        <p className="text-sm text-gray-300">{project.sourceText}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'clips' && (
            <div>
              {project.status === 'completed' && clips.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {clips.map((clip) => (
                    <div
                      key={clip.id}
                      className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-600 transition-all duration-200"
                    >
                      {/* Video Preview */}
                      <div className="relative bg-gray-900 h-48 flex items-center justify-center">
                        {clip.videoData ? (
                          <video 
                            src={typeof clip.videoData === 'string' && clip.videoData.startsWith('data:video/mp4;base64,') 
                              ? clip.videoData 
                              : URL.createObjectURL(new Blob([clip.videoData as ArrayBuffer], { type: 'video/mp4' }))}
                            className="w-full h-full object-cover"
                            controls
                            preload="metadata"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-gray-400">
                            <FileVideo className="h-12 w-12 mb-2" />
                            <span className="text-sm">Video Preview</span>
                        </div>
                        )}
                      </div>
                      
                      {/* Clip Header */}
                      <div className="p-4 border-b border-gray-700">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm line-clamp-2">{clip.caption || `Clip ${clip.startTime}s - ${clip.endTime}s`}</h4>
                          <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                            {formatDuration(clip.duration)}
                          </span>
                      </div>
                      
                        <div className="flex items-center space-x-4 text-xs text-gray-400">
                          <span className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(clip.startTime)} - {formatTime(clip.endTime)}</span>
                          </span>
                          {clip.hashtags && clip.hashtags.length > 0 && (
                          <span className="flex items-center space-x-1">
                              <Hash className="h-3 w-3" />
                              <span>{clip.hashtags.length} hashtags</span>
                          </span>
                          )}
                        </div>
                      </div>

                      {/* Clip Content */}
                      <div className="p-4 space-y-3">
                        {clip.transcript && (
                          <div className="bg-gray-700 p-3 rounded-lg">
                            <div className="flex items-center space-x-2 text-xs text-green-400 mb-2">
                              <Type className="h-3 w-3" />
                              <span>AI Transcription</span>
                            </div>
                            <p className="text-sm text-gray-300 line-clamp-3">{clip.transcript || 'No transcript available'}</p>
                            <button
                              onClick={() => handleCopyToClipboard(clip.transcript || '', 'Transcription')}
                              className="text-xs text-green-400 hover:text-green-300 flex items-center space-x-1 mt-2"
                            >
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </button>
                          </div>
                        )}
                        
                        {clip.hashtags && clip.hashtags.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-xs text-purple-400">
                              <Sparkles className="h-3 w-3" />
                              <span>AI Generated Hashtags</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {clip.hashtags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full border border-purple-500/30"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Clip Actions */}
                      <div className="px-4 pb-4">
                        <div className="flex items-center justify-between">
                          <button 
                            onClick={() => handleDownloadClip(clip)}
                            className="text-green-400 hover:text-green-300 text-sm font-medium flex items-center space-x-1"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download</span>
                          </button>
                          
                          <div className="flex space-x-2">
                            <button className="p-2 text-gray-400 hover:text-white transition-colors">
                            <Share2 className="h-4 w-4" />
                          </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : project.status === 'completed' ? (
                <div className="text-center py-16">
                  <div className="bg-gray-800 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No video clips generated</h3>
                  <p className="text-gray-400">Something went wrong during video processing</p>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="bg-gray-800 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <FileVideo className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No video clips yet</h3>
                  <p className="text-gray-400">Process your project to generate AI-powered video clips</p>
                </div>
              )}
              </div>
          )}

          {activeTab === 'transcription' && (
            <div className="space-y-6">
              {project.status === 'completed' && clips.length > 0 ? (
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                  <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-purple-400" />
                    <span>Video Transcription</span>
                  </h3>
                  
                  <div className="text-center py-8">
                    <div className="bg-gray-700 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Transcription Available</h3>
                    <p className="text-gray-400">
                      Video has been transcribed with AI-powered analysis
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Check individual clips for detailed transcripts and insights
                    </p>
                  </div>
                  
                  {/* Transcription Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="text-center p-4 bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-green-400 mb-2">
                        {clips.length}
                      </div>
                      <p className="text-gray-400 text-sm">Transcribed Clips</p>
                </div>
                
                    <div className="text-center p-4 bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-blue-400 mb-2">
                        {clips.reduce((total, clip) => total + (clip.duration || 0), 0).toFixed(1)}s
                      </div>
                      <p className="text-gray-400 text-sm">Total Duration</p>
                    </div>
                    
                    <div className="text-center p-4 bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-purple-400 mb-2">
                        {clips.filter(clip => clip.caption && clip.caption.length > 0).length}
                      </div>
                      <p className="text-gray-400 text-sm">AI Captions</p>
                    </div>
                  </div>
                  
                  {/* Full Transcription Display */}
                  <div className="mt-8">
                    <h4 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                      <Type className="h-5 w-5 text-green-400" />
                      <span>Full Video Transcription</span>
                    </h4>
                    <div className="bg-gray-700 p-4 rounded-lg max-h-96 overflow-y-auto">
                      <div className="text-sm text-gray-300 whitespace-pre-wrap">
                        {clips.length > 0 && clips[0].transcript ? 
                          clips[0].transcript : 
                          'Full transcription will be displayed here after processing. Check individual clips for segment transcripts.'
                        }
                      </div>
                    </div>
                    <div className="mt-3 flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        {clips.length > 0 && clips[0].transcript ? 
                          `${clips[0].transcript.length} characters` : 
                          'Transcription not available'
                        }
                      </span>
                      {clips.length > 0 && clips[0].transcript && (
                        <button
                          onClick={() => handleCopyToClipboard(clips[0].transcript || '', 'Full transcription')}
                          className="text-xs text-green-400 hover:text-green-300 flex items-center space-x-1"
                        >
                          <Copy className="h-3 w-3" />
                          <span>Copy Full Transcription</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : project.status === 'completed' ? (
                <div className="text-center py-16">
                  <div className="bg-gray-800 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No transcription available</h3>
                  <p className="text-gray-400">Transcription was not generated during processing</p>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="bg-gray-800 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No transcription yet</h3>
                  <p className="text-gray-400">Process your project with transcription enabled to see AI-generated transcripts</p>
                </div>
              )}
              </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {project.status === 'completed' && clips.length > 0 ? (
                <>
                  {/* AI Enhancement Analytics */}
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                      <Brain className="h-5 w-5 text-purple-400" />
                      <span>AI Enhancement Analytics</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400 mb-2">
                          {getAIClipCount()}
                        </div>
                        <p className="text-gray-400 text-sm">AI Enhanced Clips</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {Math.round((getAIClipCount() / clips.length) * 100)}% of total clips
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400 mb-2">
                          {getAverageEngagementScore().toFixed(1)}/10
                  </div>
                        <p className="text-gray-400 text-sm">Average Engagement Score</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Based on hashtags and caption quality
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400 mb-2">
                          {clips.filter(clip => clip.hashtags && clip.hashtags.length >= 3).length}
                        </div>
                        <p className="text-gray-400 text-sm">High-Quality Clips</p>
                        <p className="text-xs text-gray-500 mt-1">
                          With 3+ hashtags
                        </p>
                      </div>
                      </div>
                    </div>
                    
                  {/* Platform Distribution */}
                  <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Platform Distribution</h3>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {project.targetPlatforms.map((platform) => {
                        const platformClips = clips.filter(clip => clip.platform === platform);
                        return (
                          <div key={platform} className="text-center">
                            <div className="text-2xl font-bold text-blue-400 mb-2">
                              {platformClips.length}
                            </div>
                            <p className="text-gray-400 text-sm capitalize">{platform}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-16">
                  <div className="bg-gray-800 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Analytics Coming Soon</h3>
                  <p className="text-gray-400">Complete a project to see detailed analytics</p>
                  </div>
                )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProjectDetailsPage;