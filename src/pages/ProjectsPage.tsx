import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Search, Filter, Download, Share2, Play, Clock, CheckCircle2 } from 'lucide-react';
import { localStorageService, LocalProject } from '../services/localStorage';
import { useToast } from '../components/ToastProvider';

const ProjectsPage = () => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'pending' | 'processing' | 'completed' | 'failed'>('all');
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const allProjects = await localStorageService.getAllProjects();
      setProjects(allProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
      showToast('Failed to load projects', 'error');
    } finally {
      setLoading(false);
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

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [projects, query, status]);

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
        return <div className="h-4 w-4 rounded-full bg-red-400"></div>;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (date: Date) => {
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
        await localStorageService.deleteProject(projectId);
        await loadProjects(); // Reload the list
        showToast('Project deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting project:', error);
        showToast('Failed to delete project', 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Sidebar />
        <main className="md:ml-64 p-6 pt-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading projects...</p>
              </div>
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
            <h1 className="text-3xl font-bold mb-2">My Projects</h1>
            <p className="text-gray-400">Manage and track your content creation projects</p>
          </div>

          {/* Search and Filters */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Projects Grid */}
          {filteredProjects.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-gray-800 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <Play className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
              <p className="text-gray-400 mb-6">Start creating your first project to get started</p>
              <Link
                to="/upload"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200"
              >
                Create New Project
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-600 transition-all duration-200"
                >
                  {/* Project Header */}
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
                    <div className="space-y-2 text-sm text-gray-400">
                      <div className="flex items-center space-x-2">
                        <span className="w-4 h-4 rounded bg-purple-500/20 border border-purple-500/30"></span>
                        <span className="capitalize">{project.sourceType}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="w-4 h-4 rounded bg-blue-500/20 border border-blue-500/30"></span>
                        <span>{project.targetPlatforms.length} platform{project.targetPlatforms.length !== 1 ? 's' : ''}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="w-4 h-4 rounded bg-green-500/20 border border-green-500/30"></span>
                        <span>{formatDate(project.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Project Actions */}
                  <div className="px-6 pb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        <Link
                          to={`/project/${project.id}`}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          View Details
                        </Link>
                        
                        {project.status === 'completed' && (
                          <button className="p-2 text-gray-400 hover:text-white transition-colors">
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        <button className="p-2 text-gray-400 hover:text-white transition-colors">
                          <Share2 className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="p-2 text-red-400 hover:text-red-300 transition-colors"
                        >
                          <div className="h-4 w-4 rounded-full border border-current"></div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create New Project Button */}
          {filteredProjects.length > 0 && (
            <div className="mt-8 text-center">
              <Link
                to="/upload"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200"
              >
                Create New Project
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProjectsPage;


