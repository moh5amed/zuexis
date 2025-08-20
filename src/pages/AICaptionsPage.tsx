import React, { useEffect, useState } from 'react';
import { 
  Type, 
  Copy, 
  Download, 
  Share2, 
  Sparkles, 
  Play,
  Clock,
  Hash,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { localStorageService, LocalProject, LocalClip } from '../services/localStorage';
import { useToast } from '../components/ToastProvider';

const AICaptionsPage = () => {
  const [step, setStep] = useState<'select-project' | 'generate-captions'>('select-project');
  const [selectedProject, setSelectedProject] = useState<LocalProject | null>(null);
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [clips, setClips] = useState<LocalClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedClips, setSelectedClips] = useState<string[]>([]);
  const [captions, setCaptions] = useState<Record<string, {
    tiktok: string;
    instagram: string;
    youtube: string;
    twitter: string;
    linkedin: string;
  }>>({});

  const { showToast } = useToast();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const allProjects = await localStorageService.getAllProjects();
      const completedProjects = allProjects.filter(p => p.status === 'completed');
      setProjects(completedProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
      showToast('Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = async (project: LocalProject) => {
    try {
      setSelectedProject(project);
      const projectClips = await localStorageService.getClipsByProject(project.id);
      setClips(projectClips);
      setStep('generate-captions');
    } catch (error) {
      console.error('Error loading project clips:', error);
      showToast('Failed to load project clips', 'error');
    }
  };

  const handleClipToggle = (clipId: string) => {
    setSelectedClips(prev => 
      prev.includes(clipId) 
        ? prev.filter(id => id !== clipId)
        : [...prev, clipId]
    );
  };

  const handleSelectAll = () => {
    if (selectedClips.length === clips.length) {
      setSelectedClips([]);
    } else {
      setSelectedClips(clips.map(clip => clip.id));
    }
  };

  const generateCaptions = async () => {
    if (selectedClips.length === 0) {
      showToast('Please select at least one clip', 'error');
      return;
    }

    try {
      setGenerating(true);
      showToast('Generating AI captions...', 'info');

      const newCaptions: Record<string, any> = {};

      for (const clipId of selectedClips) {
        const clip = clips.find(c => c.id === clipId);
        if (!clip) continue;

        // Generate platform-specific captions using AI logic
        const clipCaptions = {
          tiktok: generateTikTokCaption(clip),
          instagram: generateInstagramCaption(clip),
          youtube: generateYouTubeCaption(clip),
          twitter: generateTwitterCaption(clip),
          linkedin: generateLinkedInCaption(clip)
        };

        newCaptions[clipId] = clipCaptions;
      }

      setCaptions(newCaptions);
      showToast(`Generated captions for ${selectedClips.length} clips!`, 'success');
    } catch (error) {
      console.error('Error generating captions:', error);
      showToast('Failed to generate captions', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const generateTikTokCaption = (clip: LocalClip): string => {
    const baseText = clip.caption || clip.description || 'Amazing content!';
    const hashtags = clip.hashtags?.slice(0, 5).map(tag => `#${tag}`).join(' ') || '#viral #trending #content';
    
    return `🔥 ${baseText}\n\n💫 Don't miss this!\n\n${hashtags}`;
  };

  const generateInstagramCaption = (clip: LocalClip): string => {
    const baseText = clip.caption || clip.description || 'Incredible moment captured!';
    const hashtags = clip.hashtags?.slice(0, 8).map(tag => `#${tag}`).join(' ') || '#instagram #viral #trending';
    
    return `${baseText}\n\n✨ Swipe to see more!\n\n${hashtags}`;
  };

  const generateYouTubeCaption = (clip: LocalClip): string => {
    const baseText = clip.caption || clip.description || 'Fascinating content ahead!';
    const hashtags = clip.hashtags?.slice(0, 3).map(tag => `#${tag}`).join(' ') || '#youtube #content';
    
    return `${baseText}\n\n📺 Subscribe for more!\n\n${hashtags}`;
  };

  const generateTwitterCaption = (clip: LocalClip): string => {
    const baseText = clip.caption || clip.description || 'Mind-blowing content!';
    const hashtags = clip.hashtags?.slice(0, 3).map(tag => `#${tag}`).join(' ') || '#twitter #viral';
    
    return `${baseText}\n\n🚀 RT if you agree!\n\n${hashtags}`;
  };

  const generateLinkedInCaption = (clip: LocalClip): string => {
    const baseText = clip.caption || clip.description || 'Professional insights shared!';
    const hashtags = clip.hashtags?.slice(0, 5).map(tag => `#${tag}`).join(' ') || '#linkedin #professional #business';
    
    return `${baseText}\n\n💼 Connect with me for more insights!\n\n${hashtags}`;
  };

  const handleCopyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${type} copied to clipboard!`, 'success');
  };

  const handleExportAll = () => {
    const exportData = {
      project: selectedProject?.title,
      generatedAt: new Date().toISOString(),
      captions: Object.entries(captions).map(([clipId, clipCaptions]) => {
        const clip = clips.find(c => c.id === clipId);
        return {
          clipTitle: clip?.title,
          captions: clipCaptions
        };
      })
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `captions-${selectedProject?.title || 'project'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Captions exported successfully!', 'success');
  };

  const goBack = () => {
    if (step === 'generate-captions') {
      setStep('select-project');
      setSelectedProject(null);
      setClips([]);
      setSelectedClips([]);
      setCaptions({});
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Sidebar />
        <main className="md:ml-64 p-6 pt-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading projects...</p>
            </div>
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
            {step === 'generate-captions' && (
              <button
                onClick={goBack}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Project Selection</span>
              </button>
            )}
            
            <h1 className="text-3xl font-bold mb-2">AI Captions Generator</h1>
            <p className="text-gray-400">
              {step === 'select-project' 
                ? 'Select a project to generate platform-specific captions for your clips'
                : `Generating captions for: ${selectedProject?.title}`
              }
            </p>
          </div>

          {step === 'select-project' ? (
            /* Project Selection Step */
            <div>
              {projects.length === 0 ? (
                <div className="text-center py-16">
                  <div className="bg-gray-800 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <Type className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No completed projects</h3>
                  <p className="text-gray-400 mb-6">Complete a project first to generate captions</p>
                  <button
                    onClick={() => window.history.back()}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Go Back
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => handleProjectSelect(project)}
                      className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-600 transition-all duration-200 cursor-pointer"
                    >
                      <div className="p-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                            <Type className="h-5 w-5 text-purple-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{project.title}</h3>
                            <p className="text-sm text-gray-400 capitalize">{project.sourceType}</p>
                          </div>
                        </div>
                        
                        {project.description && (
                          <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                            {project.description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between text-sm text-gray-400">
                          <span>{project.targetPlatforms.length} platforms</span>
                          <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Caption Generation Step */
            <div className="space-y-6">
              {/* Project Info */}
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold mb-2">{selectedProject?.title}</h2>
                    <p className="text-gray-400">{clips.length} clips available</p>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={handleSelectAll}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                    >
                      {selectedClips.length === clips.length ? 'Deselect All' : 'Select All'}
                    </button>
                    
                    <button
                      onClick={generateCaptions}
                      disabled={selectedClips.length === 0 || generating}
                      className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 px-6 py-2 rounded-lg font-medium transition-all duration-200"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Generate Captions</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Clips Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clips.map((clip) => (
                  <div
                    key={clip.id}
                    className={`bg-gray-800 rounded-lg border p-4 cursor-pointer transition-all duration-200 ${
                      selectedClips.includes(clip.id)
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                    onClick={() => handleClipToggle(clip.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm line-clamp-2">{clip.title}</h4>
                        <div className="flex items-center space-x-2 mt-2 text-xs text-gray-400">
                          <span className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{Math.floor(clip.duration)}s</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Play className="h-3 w-3" />
                            <span>{clip.platform}</span>
                          </span>
                        </div>
                      </div>
                      
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedClips.includes(clip.id)
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-gray-500'
                      }`}>
                        {selectedClips.includes(clip.id) && (
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Generated Captions */}
              {Object.keys(captions).length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">Generated Captions</h3>
                    <button
                      onClick={handleExportAll}
                      className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>Export All</span>
                    </button>
                  </div>

                  {Object.entries(captions).map(([clipId, clipCaptions]) => {
                    const clip = clips.find(c => c.id === clipId);
                    if (!clip) return null;

                    return (
                      <div key={clipId} className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                        <h4 className="font-semibold text-lg mb-4">{clip.title}</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {Object.entries(clipCaptions).map(([platform, caption]) => (
                            <div key={platform} className="bg-gray-700 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium capitalize">{platform}</span>
                                <button
                                  onClick={() => handleCopyToClipboard(caption, `${platform} caption`)}
                                  className="p-1 text-gray-400 hover:text-white transition-colors"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                              </div>
                              
                              <div className="bg-gray-800 p-3 rounded text-sm text-gray-300 whitespace-pre-wrap">
                                {caption}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AICaptionsPage;


