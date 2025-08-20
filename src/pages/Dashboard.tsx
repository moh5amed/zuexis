import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Play, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  BarChart3,
  Sparkles,
  Eye,
  Download
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { localStorageService, LocalProject, LocalClip } from '../services/localStorage';
import { useToast } from '../components/ToastProvider';

const Dashboard = () => {
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [clips, setClips] = useState<LocalClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    completedProjects: 0,
    totalClips: 0,
    totalDuration: 0
  });

  const { showToast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all projects
      const allProjects = await localStorageService.getAllProjects();
      setProjects(allProjects);
      
      // Load all clips from completed projects
      const allClips: LocalClip[] = [];
      for (const project of allProjects) {
        if (project.status === 'completed') {
          const projectClips = await localStorageService.getClipsByProject(project.id);
          allClips.push(...projectClips);
        }
      }
      setClips(allClips);
      
      // Calculate stats
      const totalDuration = allClips.reduce((total, clip) => total + clip.duration, 0);
      setStats({
        totalProjects: allProjects.length,
        completedProjects: allProjects.filter(p => p.status === 'completed').length,
        totalClips: allClips.length,
        totalDuration
      });
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
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

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Sidebar />
        <main className="md:ml-64 p-6 pt-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading dashboard...</p>
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
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-gray-400">Welcome back! Here's what's happening with your content</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Projects</p>
                  <p className="text-3xl font-bold">{stats.totalProjects}</p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Completed</p>
                  <p className="text-3xl font-bold text-green-400">{stats.completedProjects}</p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Clips</p>
                  <p className="text-3xl font-bold">{stats.totalClips}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Play className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Duration</p>
                  <p className="text-3xl font-bold">{formatDuration(stats.totalDuration)}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to="/upload"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 p-6 rounded-xl border border-transparent transition-all duration-200 transform hover:scale-105"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Plus className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Create New Project</h3>
                    <p className="text-sm text-white/80">Upload video or start from scratch</p>
                  </div>
                </div>
              </Link>

              <Link
                to="/projects"
                className="bg-gray-800 hover:bg-gray-700 p-6 rounded-xl border border-gray-700 transition-all duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">View All Projects</h3>
                    <p className="text-sm text-gray-400">Manage your content projects</p>
                  </div>
                </div>
              </Link>

              <Link
                to="/captions"
                className="bg-gray-800 hover:bg-gray-700 p-6 rounded-xl border border-gray-700 transition-all duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">AI Captions</h3>
                    <p className="text-sm text-gray-400">Generate engaging captions</p>
                  </div>
                </div>
              </Link>
              </div>
          </div>

            {/* Recent Projects */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Recent Projects</h2>
              <Link
                to="/projects"
                className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
              >
                View All →
              </Link>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-16 bg-gray-800 rounded-xl border border-gray-700">
                <div className="bg-gray-700 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <Plus className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
                <p className="text-gray-400 mb-6">Start creating your first AI-powered content</p>
                <Link
                  to="/upload"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.slice(0, 6).map((project) => (
                  <div
                    key={project.id}
                    className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-600 transition-all duration-200"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                            {project.title}
                          </h3>
                          {project.description && (
                            <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                              {project.description}
                            </p>
                          )}
                        </div>
                        
                        {/* Status Badge */}
                        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border text-xs font-medium ${getStatusColor(project.status)}`}>
                          {getStatusIcon(project.status)}
                          <span className="capitalize">{project.status}</span>
                        </div>
                      </div>

                      {/* Project Details */}
                      <div className="space-y-2 text-sm text-gray-400 mb-4">
                        <div className="flex items-center space-x-2">
                          <span className="w-3 h-3 rounded bg-purple-500/20 border border-purple-500/30"></span>
                          <span className="capitalize">{project.sourceType}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/30"></span>
                          <span>{project.targetPlatforms.length} platform{project.targetPlatforms.length !== 1 ? 's' : ''}</span>
                    </div>
                        
                    <div className="flex items-center space-x-2">
                          <span className="w-3 h-3 rounded bg-green-500/20 border border-green-500/30"></span>
                          <span>{formatDate(project.createdAt)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <Link
                          to={`/project/${project.id}`}
                          className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
                        >
                          View Details
                        </Link>
                        
                        {project.status === 'completed' && (
                          <button className="p-2 text-gray-400 hover:text-white transition-colors">
                          <Download className="h-4 w-4" />
                        </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Clips */}
          {clips.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Recent Clips</h2>
                <Link
                  to="/projects"
                  className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
                >
                  View All →
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {clips.slice(0, 4).map((clip) => (
                  <div
                    key={clip.id}
                    className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-gray-600 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                        {clip.platform}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDuration(clip.duration)}
                      </span>
            </div>

                    <h4 className="font-medium text-sm mb-2 line-clamp-2">{clip.title}</h4>
                    
                    {clip.caption && (
                      <p className="text-xs text-gray-400 line-clamp-2 mb-3">{clip.caption}</p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <button className="text-purple-400 hover:text-purple-300 text-xs font-medium">
                        Preview
                      </button>
                      <button className="p-1 text-gray-400 hover:text-white transition-colors">
                        <Download className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance Insights */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              <span>Performance Insights</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">
                  {stats.completedProjects > 0 ? Math.round((stats.completedProjects / stats.totalProjects) * 100) : 0}%
                </div>
                <p className="text-gray-400 text-sm">Success Rate</p>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">
                  {stats.totalProjects > 0 ? Math.round(stats.totalClips / stats.totalProjects) : 0}
                </div>
                <p className="text-gray-400 text-sm">Avg. Clips per Project</p>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">
                  {formatDuration(stats.totalDuration)}
                </div>
                <p className="text-gray-400 text-sm">Total Content Created</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;