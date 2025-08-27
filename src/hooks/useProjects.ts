import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  ProjectRow, 
  VideoClip, 
  listProjects, 
  getProject, 
  getProjectClips, 
  createProject, 
  updateProjectStatus,
  createVideoClip,
  updateVideoClip,
  createTestProject
} from '../services/projects';

export function useProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectRow | null>(null);
  const [projectClips, setProjectClips] = useState<VideoClip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all projects for the current user
  const loadProjects = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      setError(null);
      console.log('🔍 [useProjects] Loading projects for user:', user.id);
      const userProjects = await listProjects(user.id);
      console.log('📊 [useProjects] Loaded projects:', userProjects);
      setProjects(userProjects);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Load a specific project with its clips
  const loadProject = useCallback(async (projectId: string) => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Get project details
      const project = await getProject(projectId);
      if (!project) {
        throw new Error('Project not found');
      }
      
      // Verify user owns this project
      if (project.user_id !== user.id) {
        throw new Error('Access denied');
      }
      
      setCurrentProject(project);
      
      // Get project clips
      const clips = await getProjectClips(projectId);
      setProjectClips(clips);
      
    } catch (err) {
      console.error('Failed to load project:', err);
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Create a new project
  const createNewProject = useCallback(async (projectData: Parameters<typeof createProject>[0]) => {
    if (!user?.id) throw new Error('User not authenticated');
    
    try {
      setIsLoading(true);
      setError(null);
      
      const newProject = await createProject(projectData, user.id);
      
      // Add to projects list
      setProjects(prev => [newProject, ...prev]);
      
      return newProject;
    } catch (err) {
      console.error('Failed to create project:', err);
      setError(err instanceof Error ? err.message : 'Failed to create project');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Create a test project for debugging
  const createTestProjectForUser = useCallback(async () => {
    if (!user?.id) throw new Error('User not authenticated');
    
    try {
      setIsLoading(true);
      setError(null);
      
      const testProject = await createTestProject(user.id);
      
      // Add to projects list
      setProjects(prev => [testProject, ...prev]);
      
      return testProject;
    } catch (err) {
      console.error('Failed to create test project:', err);
      setError(err instanceof Error ? err.message : 'Failed to create test project');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Update project status
  const updateProject = useCallback(async (projectId: string, status: Parameters<typeof updateProjectStatus>[1]) => {
    try {
      await updateProjectStatus(projectId, status);
      
      // Update local state
      setProjects(prev => prev.map(p => 
        p.id === projectId ? { ...p, status, updated_at: new Date().toISOString() } : p
      ));
      
      if (currentProject?.id === projectId) {
        setCurrentProject(prev => prev ? { ...prev, status, updated_at: new Date().toISOString() } : null);
      }
    } catch (err) {
      console.error('Failed to update project status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update project');
      throw err;
    }
  }, [currentProject?.id]);

  // Create a new video clip
  const addVideoClip = useCallback(async (clipData: Omit<VideoClip, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newClip = await createVideoClip(clipData);
      
      // Add to project clips if it's for the current project
      if (clipData.project_id === currentProject?.id) {
        setProjectClips(prev => [newClip, ...prev]);
      }
      
      return newClip;
    } catch (err) {
      console.error('Failed to create video clip:', err);
      setError(err instanceof Error ? err.message : 'Failed to create video clip');
      throw err;
    }
  }, [currentProject?.id]);

  // Update a video clip
  const updateClip = useCallback(async (clipId: string, updates: Partial<VideoClip>) => {
    try {
      await updateVideoClip(clipId, updates);
      
      // Update local state
      setProjectClips(prev => prev.map(clip => 
        clip.id === clipId ? { ...clip, ...updates, updated_at: new Date().toISOString() } : clip
      ));
    } catch (err) {
      console.error('Failed to update video clip:', err);
      setError(err instanceof Error ? err.message : 'Failed to update video clip');
      throw err;
    }
  }, []);

  // Refresh current project data
  const refreshProject = useCallback(async () => {
    if (currentProject?.id) {
      await loadProject(currentProject.id);
    }
  }, [currentProject?.id, loadProject]);

  // Clear current project
  const clearCurrentProject = useCallback(() => {
    setCurrentProject(null);
    setProjectClips([]);
  }, []);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return {
    // State
    projects,
    currentProject,
    projectClips,
    isLoading,
    error,
    
    // Actions
    loadProjects,
    loadProject,
    createNewProject,
    createTestProjectForUser,
    updateProject,
    addVideoClip,
    updateClip,
    refreshProject,
    clearCurrentProject,
    
    // Utilities
    hasProjects: projects.length > 0,
    hasClips: projectClips.length > 0,
    clearError: () => setError(null)
  };
}
