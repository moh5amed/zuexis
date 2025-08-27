import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { 
  Search, 
  Filter, 
  Download, 
  Share2, 
  Play, 
  Clock, 
  CheckCircle2, 
  Cloud, 
  Video, 
  Youtube, 
  FileText, 
  Plus,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Calendar,
  ArrowRight,
  Trash2,
  Eye,
  Sparkles,
  Zap,
  Target,
  Users,
  FolderOpen,
  Activity
} from 'lucide-react';
import { supabaseProjectsService, SupabaseProject, ProjectWithContent } from '../services/supabaseProjects';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../contexts/AuthContext';

const ProjectsPage = () => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'pending' | 'processing' | 'completed' | 'failed'>('all');
  const [projects, setProjects] = useState<SupabaseProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, processing: 0, completed: 0, failed: 0 });
  const { showToast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      supabaseProjectsService.setCurrentUser(user.id);
      loadProjects();
      loadStats();
    }
  }, [user]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const allProjects = await supabaseProjectsService.getAllProjects();
      setProjects(allProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
      showToast('Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const projectStats = await supabaseProjectsService.getProjectStats();
      setStats(projectStats);
    } catch (error) {
      console.error('Error loading project stats:', error);
    }
  };

  const filteredProjects = useMemo(() => {
    let filtered = projects;

    // Filter by search query
    if (query) {
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(query.toLowerCase()) ||
        project.description?.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Filter by status
    if (status !== 'all') {
      filtered = filtered.filter(project => project.status === status);
    }

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [projects, query, status]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'processing':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'failed':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'processing':
        return <Clock className="h-4 w-4" />;
      case 'failed':
        return <div className="h-4 w-4 rounded-full bg-red-400"></div>;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getSourceTypeIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'file':
        return <Video className="h-4 w-4" />;
      case 'youtube':
        return <Youtube className="h-4 w-4" />;
      case 'text':
        return <FileText className="h-4 w-4" />;
      case 'url':
        return <ArrowRight className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getSourceTypeColor = (sourceType: string) => {
    switch (sourceType) {
      case 'file':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'youtube':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'text':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'url':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  const handleDeleteProject = async (projectId: string) => {
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        await supabaseProjectsService.deleteProject(projectId);
        await loadProjects(); // Reload the list
        await loadStats(); // Reload stats
        showToast('Project deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting project:', error);
        showToast('Failed to delete project', 'error');
      }
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadProjects();
      await loadStats();
      showToast('Projects refreshed successfully', 'success');
    } catch (error) {
      showToast('Failed to refresh projects', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-gray-700 border-t-purple-500 rounded-full animate-spin mx-auto mb-6"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-300 rounded-full animate-spin mx-auto" style={{ animationDelay: '0.5s' }}></div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Loading Your Projects</h3>
            <p className="text-gray-400">Preparing your creative workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl ml-auto mr-4 lg:mr-6 p-4 lg:p-6">
          {/* Enhanced Header */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-right">
                <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                  My Projects
                </h1>
                <p className="text-gray-400 text-base max-w-xl leading-relaxed ml-auto">
                  Manage your video processing projects and discover AI-generated viral content
                </p>
              </div>
              <Link
                to="/upload"
                className="group hidden lg:flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-700 to-purple-800 hover:from-purple-800 hover:to-purple-900 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25"
              >
                <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                New Project
              </Link>
            </div>

            {/* Enhanced Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
              {/* Total Projects Card */}
              <div className="group bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-3 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-900/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                    <FolderOpen className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">{stats.total}</div>
                    <div className="text-xs text-gray-400">Total</div>
                  </div>
                </div>
                <h3 className="text-gray-300 font-medium text-xs mb-1">Total Projects</h3>
                <p className="text-gray-500 text-xs">All your creative projects</p>
              </div>

              {/* Processing Card */}
              <div className="group bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-3 border border-gray-700/50 hover:border-yellow-500/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-yellow-900/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                    <Activity className="h-4 w-4 text-yellow-400" />
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-yellow-400">{stats.processing}</div>
                    <div className="text-xs text-gray-400">Active</div>
                  </div>
                </div>
                <h3 className="text-gray-300 font-medium text-xs mb-1">Processing</h3>
                <p className="text-gray-500 text-xs">AI is working on these</p>
              </div>

              {/* Completed Card */}
              <div className="group bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-3 border border-gray-700/50 hover:border-green-500/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-900/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-green-500/20 rounded-lg border border-green-500/30">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-400">{stats.completed}</div>
                    <div className="text-xs text-gray-400">Ready</div>
                  </div>
                </div>
                <h3 className="text-gray-300 font-medium text-xs mb-1">Completed</h3>
                <p className="text-gray-500 text-xs">Ready for use</p>
              </div>

              {/* Failed Card */}
              <div className="group bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-3 border border-gray-700/50 hover:border-red-500/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-900/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-red-500/20 rounded-lg border border-red-500/30">
                    <Zap className="h-4 w-4 text-red-400" />
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-red-400">{stats.failed}</div>
                    <div className="text-xs text-gray-400">Issues</div>
                  </div>
                </div>
                <h3 className="text-gray-300 font-medium text-xs mb-1">Failed</h3>
                <p className="text-gray-500 text-xs">Need attention</p>
              </div>
            </div>

            {/* Mobile Create Button */}
            <div className="lg:hidden mb-6">
              <Link
                to="/upload"
                className="group flex items-center justify-center gap-3 w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25"
              >
                <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                Create New Project
              </Link>
            </div>
          </div>

          {/* Enhanced Controls */}
          <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-lg p-3 border border-gray-700/50 mb-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-end">
              {/* Search Bar */}
              <div className="w-full lg:w-80 relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 group-focus-within:text-purple-400 transition-colors duration-200" />
                <input
                  type="text"
                  placeholder="Search projects by title or description..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-2 bg-gray-800/80 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
                />
              </div>

              {/* Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="px-4 py-2 bg-gray-800/80 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200 font-medium"
                >
                  <option value="all">All Status</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
                
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="group px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180'} transition-all duration-300`} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Results Summary */}
            <div className="mt-4 pt-4 border-t border-gray-700/50">
              <div className="flex items-center justify-end gap-4 text-sm">
                {query && (
                  <span className="text-purple-400">
                    Filtered by: "{query}"
                  </span>
                )}
                <span className="text-gray-400">
                  Showing <span className="text-white font-semibold">{filteredProjects.length}</span> of <span className="text-white font-semibold">{projects.length}</span> projects
                </span>
              </div>
            </div>
          </div>

          {/* Projects Grid */}
          {filteredProjects.length === 0 ? (
            <div className="text-right py-16">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-full flex items-center justify-center ml-auto mb-6">
                <Cloud className="h-12 w-12 text-gray-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-300 mb-3">No projects found</h3>
              <p className="text-gray-400 text-lg max-w-md ml-auto leading-relaxed mb-8">
                {query || status !== 'all' 
                  ? 'Try adjusting your search or filter criteria to find what you\'re looking for'
                  : 'Ready to create your first viral video? Start by uploading a video or YouTube URL'
                }
              </p>
              {!query && status === 'all' && (
                <Link
                  to="/upload"
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-700 to-purple-800 hover:from-purple-800 hover:to-purple-900 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25"
                >
                  <Video className="h-5 w-5 mr-2" />
                  Create Your First Project
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                                  <div key={project.id} className="group bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-700/50 overflow-hidden hover:border-purple-500/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-900/20">
                  {/* Project Header */}
                  <div className="p-3 border-b border-gray-700/50 bg-gradient-to-r from-gray-900/50 to-gray-800/50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-700/50 rounded-lg border border-gray-600/50">
                          {getSourceTypeIcon(project.source_type)}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getSourceTypeColor(project.source_type)}`}>
                          {project.source_type}
                        </span>
                      </div>
                      <span className={`px-3 py-2 rounded-full text-xs font-semibold border flex items-center gap-2 ${getStatusColor(project.status)}`}>
                        {getStatusIcon(project.status)}
                        <span className="capitalize">{project.status}</span>
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 group-hover:text-purple-300 transition-colors duration-200">
                      {project.title}
                    </h3>
                    
                    {project.description && (
                      <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">
                        {project.description}
                      </p>
                    )}
                  </div>

                  {/* Project Details */}
                  <div className="p-3">
                    <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(project.created_at)}</span>
                      </div>
                      {project.source_url && (
                        <span className="flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-400 rounded-full border border-red-500/20">
                          <Youtube className="h-3 w-3" />
                          YouTube
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Link
                        to={`/projects/${project.id}`}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </Link>
                      
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="group px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-red-500/25"
                        title="Delete project"
                      >
                        <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectsPage;


