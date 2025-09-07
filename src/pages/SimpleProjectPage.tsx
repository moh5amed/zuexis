import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Play, 
  Download, 
  Share2, 
  CheckCircle2,
  Loader2,
  FileVideo,
  TrendingUp,
  Clock,
  BarChart3
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useToast } from '../components/ToastProvider';
import { supabase } from '../lib/supabaseClient';

const SimpleProjectPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  // Debug: Log current URL and params




  const [project, setProject] = useState<any | null>(null);
  const [clips, setClips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    if (id) {

      loadProject();
    } else {

    }
  }, [id]);

  const loadProject = async () => {
    try {

      setLoading(true);
      if (!id) {

        return;
      }

      // Load project from Supabase
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError || !projectData) {

        showToast('Project not found', 'error');
        navigate('/projects');
        return;
      }

      setProject(projectData);
      
      // Load clips from Python backend
      try {
        const response = await fetch(`${import.meta.env.VITE_PYTHON_BACKEND_URL || 'https://zuexisbacckend.onrender.com'}/api/frontend/get-latest-clips`);
        if (response.ok) {
          const clipsData = await response.json();
          if (clipsData.success && clipsData.clips) {
            setClips(clipsData.clips);
          }
        }
      } catch (clipsError) {

      }
    } catch (error) {

      showToast('Failed to load project', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadClip = async (clip: any) => {
    try {
      // For now, just show a success message
      // In a real implementation, you'd download the actual video file
      showToast(`Download started for ${clip.filename}`, 'success');
    } catch (error) {

      showToast('Failed to download clip', 'error');
    }
  };

  const handleShareClip = (clip: any) => {
    // Copy clip info to clipboard
    const clipInfo = `Check out this viral clip: ${clip.caption}\n\nHashtags: ${clip.hashtags?.join(' ') || ''}`;
    navigator.clipboard.writeText(clipInfo);
    showToast('Clip info copied to clipboard!', 'success');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Sidebar />
        <main className="md:ml-64 p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="animate-spin h-12 w-12 text-purple-500 mx-auto mb-4" />
              <p className="text-lg">Loading project...</p>
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
        <main className="md:ml-64 p-6">
          <div className="text-center">
            <p className="text-lg text-red-400">Project not found</p>
            <button 
              onClick={() => navigate('/projects')}
              className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"
            >
              Back to Projects
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Sidebar />
      <main className="md:ml-64 p-6">
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => navigate('/projects')}
            className="flex items-center text-gray-400 hover:text-white mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Projects
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{project.title}</h1>
              <p className="text-gray-400">{project.description || 'No description'}</p>
              <div className="flex items-center mt-2 text-sm text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
                <span className="mx-2">•</span>
                <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />
                <span className="text-green-500">Completed</span>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-500">{clips.length}</div>
              <div className="text-sm text-gray-400">Viral Clips</div>
            </div>
          </div>
        </div>

        {/* Clips Grid */}
        {clips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clips.map((clip, index) => (
              <div key={clip.id || index} className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-purple-500 transition-colors">
                {/* Clip Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <FileVideo className="h-5 w-5 text-purple-500 mr-2" />
                    <span className="font-semibold">Clip {clip.clip_number || index + 1}</span>
                  </div>
                  <div className="flex items-center bg-purple-600 px-2 py-1 rounded-full text-xs">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {clip.viral_score || 9}/10
                  </div>
                </div>

                {/* Clip Info */}
                <div className="space-y-3 mb-4">
                  <div>
                    <p className="text-sm text-gray-400">Duration</p>
                    <p className="font-medium">{clip.duration || 30}s</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-400">Caption</p>
                    <p className="text-sm line-clamp-2">{clip.caption || 'No caption'}</p>
                  </div>

                  {clip.hashtags && clip.hashtags.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-400">Hashtags</p>
                      <div className="flex flex-wrap gap-1">
                        {clip.hashtags.slice(0, 5).map((tag: string, tagIndex: number) => (
                          <span key={tagIndex} className="text-xs bg-gray-700 px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadClip(clip)}
                    className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded-lg text-sm transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  
                  <button
                    onClick={() => handleShareClip(clip)}
                    className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg text-sm transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileVideo className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No clips generated yet</h3>
            <p className="text-gray-500">The AI is still processing your video. Check back soon!</p>
          </div>
        )}

        {/* Stats */}
        {clips.length > 0 && (
          <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Processing Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">{clips.length}</div>
                <div className="text-sm text-gray-400">Total Clips</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {clips.filter(c => (c.viral_score || 0) >= 8).length}
                </div>
                <div className="text-sm text-gray-400">High Score (8+)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {Math.round(clips.reduce((sum, c) => sum + (c.duration || 0), 0))}s
                </div>
                <div className="text-sm text-gray-400">Total Duration</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {Math.round(clips.reduce((sum, c) => sum + (c.viral_score || 0), 0) / clips.length)}
                </div>
                <div className="text-sm text-gray-400">Avg Score</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SimpleProjectPage;
