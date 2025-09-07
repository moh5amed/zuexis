// Supabase Projects Service
// Handles all project-related operations with Supabase database
// Integrated with cloud storage for content management

import { supabase } from '../lib/supabaseClient';

export interface SupabaseProject {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'processing' | 'completed' | 'failed';
  source_type: 'file' | 'url' | 'text' | 'youtube';
  source_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithContent extends SupabaseProject {
  clips?: VideoClip[];
  transcriptions?: TranscriptionData[];
  analyses?: AnalysisData[];
}

export interface VideoClip {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  duration?: number;
  resolution?: string;
  cloud_file_id: string;
  cloud_provider_id: string;
  project_id?: string;
  user_id: string;
  transcription?: string;
  analysis?: any;
  created_at: string;
  updated_at: string;
}

export interface ProjectFolder {
  id: string;
  project_id: string;
  provider: string;
  folder_id: string;
  folder_name: string;
  created_at: string;
  updated_at: string;
}

export interface TranscriptionData {
  id: string;
  clip_id: string; // References video_clips.id
  user_id: string;
  text: string;
  language: string;
  confidence?: number;
  created_at: string;
  updated_at: string;
}

export interface AnalysisData {
  id: string;
  clip_id: string;
  user_id: string;
  analysis_type: 'viral_potential' | 'content_analysis' | 'engagement_prediction';
  data: any; // JSONB data from Supabase
  created_at: string;
  updated_at: string;
}

class SupabaseProjectsService {
  private currentUserId: string | null = null;

  // Set the current user ID (call this after authentication)
  setCurrentUser(userId: string) {
    this.currentUserId = userId;
  }

  // Get current user ID
  getCurrentUser() {
    return this.currentUserId;
  }

  // Get all projects for the current user
  async getAllProjects(): Promise<SupabaseProject[]> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', this.currentUserId)
        .order('created_at', { ascending: false });

      if (error) {

        throw new Error(`Failed to fetch projects: ${error.message}`);
      }

      return projects || [];

    } catch (error) {

      throw error;
    }
  }

  // Get a single project by ID
  async getProject(projectId: string): Promise<SupabaseProject | null> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', this.currentUserId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {

          return null;
        }

        throw new Error(`Failed to fetch project: ${error.message}`);
      }

      return project;

    } catch (error) {

      throw error;
    }
  }

  // Create a new project
  async createProject(projectData: {
    title: string;
    description?: string;
    source_type: 'file' | 'url' | 'text' | 'youtube';
    source_url?: string;
  }): Promise<SupabaseProject> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      const newProject = {
        user_id: this.currentUserId,
        title: projectData.title,
        description: projectData.description || '',
        source_type: projectData.source_type,
        source_url: projectData.source_url || null,
        status: 'processing' as const,
      };

      const { data: project, error } = await supabase
        .from('projects')
        .insert([newProject])
        .select()
        .single();

      if (error) {

        throw new Error(`Failed to create project: ${error.message}`);
      }

      return project;

    } catch (error) {

      throw error;
    }
  }

  // Update project status
  async updateProjectStatus(projectId: string, status: 'processing' | 'completed' | 'failed'): Promise<void> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('projects')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .eq('user_id', this.currentUserId);

      if (error) {

        throw new Error(`Failed to update project status: ${error.message}`);
      }

    } catch (error) {

      throw error;
    }
  }

  // Delete a project and all related data (cascade delete)
  async deleteProject(projectId: string): Promise<void> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      // Step 1: Get all clips for the project to identify what needs to be deleted
      const { data: clips, error: clipsError } = await supabase
        .from('video_clips')
        .select('id, cloud_file_id, cloud_provider_id')
        .eq('project_id', projectId)
        .eq('user_id', this.currentUserId);

      if (clipsError) {

        throw new Error(`Failed to fetch clips for deletion: ${clipsError.message}`);
      }

      // Step 2: Delete transcriptions for all clips
      if (clips && clips.length > 0) {
        const clipIds = clips.map(clip => clip.id);
        
        // Delete transcriptions
        const { error: transError } = await supabase
          .from('transcriptions')
          .delete()
          .in('clip_id', clipIds);

        if (transError) {

        } else {

        }

        // Delete analyses
        const { error: analysisError } = await supabase
          .from('analyses')
          .delete()
          .in('clip_id', clipIds);

        if (analysisError) {

        } else {

        }
      }

      // Step 3: Delete all video clips
      const { error: clipsDeleteError } = await supabase
        .from('video_clips')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', this.currentUserId);

      if (clipsDeleteError) {

        throw new Error(`Failed to delete video clips: ${clipsDeleteError.message}`);
      }

      // Step 4: Delete project shares
      const { error: sharesError } = await supabase
        .from('project_shares')
        .delete()
        .eq('project_id', projectId);

      if (sharesError) {

      } else {

      }

      // Step 5: Finally delete the project
      const { error: projectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', this.currentUserId);

      if (projectError) {

        throw new Error(`Failed to delete project: ${projectError.message}`);
      }

      // Step 6: Delete cloud storage files (if cloud storage service is available)
      if (clips && clips.length > 0) {
        try {
          // Import cloud storage service dynamically to avoid circular dependencies
          const { cloudStorageService } = await import('./cloudStorageService');
          
          for (const clip of clips) {
            if (clip.cloud_file_id && clip.cloud_provider_id) {
              try {
                await cloudStorageService.deleteFile(clip.cloud_provider_id, clip.cloud_file_id);

              } catch (cloudError) {

              }
            }
          }
        } catch (importError) {

        }
      }

    } catch (error) {

      throw error;
    }
  }

  // Get project with all its content (clips, transcriptions, analyses)
  async getProjectWithContent(projectId: string): Promise<ProjectWithContent | null> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      // Get the project
      const project = await this.getProject(projectId);
      if (!project) {
        return null;
      }

      // Get all clips for the project
      const { data: clips, error: clipsError } = await supabase
        .from('video_clips')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', this.currentUserId)
        .order('created_at', { ascending: false });

      if (clipsError) {

        throw new Error(`Failed to fetch clips: ${clipsError.message}`);
      }

      // Get transcriptions and analyses for each clip
      const transcriptions: TranscriptionData[] = [];
      const analyses: AnalysisData[] = [];
      let fullVideoTranscription: TranscriptionData | null = null;

      if (clips && clips.length > 0) {
        for (const clip of clips) {
          // Get transcription for this clip
          const { data: transcription, error: transError } = await supabase
            .from('transcriptions')
            .select('*')
            .eq('clip_id', clip.id)
            .eq('user_id', this.currentUserId)
            .maybeSingle();

          if (!transError && transcription) {
            // Check if this is a full video transcription by looking at the clip name
            if (clip.name && clip.name.startsWith('Full Video -')) {
              fullVideoTranscription = transcription;
            } else {
              transcriptions.push(transcription);
            }
          }

          // Get analysis for this clip
          const { data: analysis, error: analysisError } = await supabase
            .from('analyses')
            .select('*')
            .eq('clip_id', clip.id)
            .eq('user_id', this.currentUserId)
            .maybeSingle();

          if (!analysisError && analysis) {
            analyses.push(analysis);
          }
        }
      }

      // Add full video transcription to the list if it exists
      if (fullVideoTranscription) {
        transcriptions.push(fullVideoTranscription);
      }

      const projectWithContent: ProjectWithContent = {
        ...project,
        clips: clips || [],
        transcriptions,
        analyses
      };

      return projectWithContent;

    } catch (error) {

      throw error;
    }
  }

  // Get project statistics
  async getProjectStats(): Promise<{
    total: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      const { data: projects, error } = await supabase
        .from('projects')
        .select('status')
        .eq('user_id', this.currentUserId);

      if (error) {

        throw new Error(`Failed to fetch project stats: ${error.message}`);
      }

      const stats = {
        total: projects?.length || 0,
        processing: projects?.filter(p => p.status === 'processing').length || 0,
        completed: projects?.filter(p => p.status === 'completed').length || 0,
        failed: projects?.filter(p => p.status === 'failed').length || 0,
      };

      return stats;

    } catch (error) {

      throw error;
    }
  }

  // Create transcription for a clip
  async createTranscription(transcriptionData: {
    clip_id: string;
    text: string;
    language?: string;
    confidence?: number;
  }): Promise<TranscriptionData> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      const newTranscription = {
        clip_id: transcriptionData.clip_id,
        user_id: this.currentUserId,
        text: transcriptionData.text,
        language: transcriptionData.language || 'en',
        confidence: transcriptionData.confidence || null,
      };

      const { data: transcription, error } = await supabase
        .from('transcriptions')
        .insert([newTranscription])
        .select()
        .single();

      if (error) {

        throw new Error(`Failed to create transcription: ${error.message}`);
      }

      return transcription;

    } catch (error) {

      throw error;
    }
  }

  // Create analysis for a clip
  async createAnalysis(analysisData: {
    clip_id: string;
    analysis_type: 'viral_potential' | 'content_analysis' | 'engagement_prediction';
    data: any;
  }): Promise<AnalysisData> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      const newAnalysis = {
        clip_id: analysisData.clip_id,
        user_id: this.currentUserId,
        analysis_type: analysisData.analysis_type,
        data: analysisData.data,
      };

      const { data: analysis, error } = await supabase
        .from('analyses')
        .insert([newAnalysis])
        .select()
        .single();

      if (error) {

        throw new Error(`Failed to create analysis: ${error.message}`);
      }

      return analysis;

    } catch (error) {

      throw error;
    }
  }

  // Get transcription by ID
  async getTranscription(transcriptionId: string): Promise<TranscriptionData | null> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      const { data: transcription, error } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('id', transcriptionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {

          return null;
        }

        throw new Error(`Failed to fetch transcription: ${error.message}`);
      }

      return transcription;

    } catch (error) {

      throw error;
    }
  }

  // Get analysis by ID
  async getAnalysis(analysisId: string): Promise<AnalysisData | null> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      const { data: analysis, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('id', analysisId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {

          return null;
        }

        throw new Error(`Failed to fetch analysis: ${error.message}`);
      }

      return analysis;

    } catch (error) {

      throw error;
    }
  }

  // Update transcription
  async updateTranscription(transcriptionId: string, updates: {
    text?: string;
    language?: string;
    confidence?: number;
  }): Promise<TranscriptionData> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      const { data: transcription, error } = await supabase
        .from('transcriptions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', transcriptionId)
        .select()
        .single();

      if (error) {

        throw new Error(`Failed to update transcription: ${error.message}`);
      }

      return transcription;

    } catch (error) {

      throw error;
    }
  }

  // Update analysis
  async updateAnalysis(analysisId: string, updates: {
    analysis_type?: 'viral_potential' | 'content_analysis' | 'engagement_prediction';
    data?: any;
  }): Promise<AnalysisData> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      const { data: analysis, error } = await supabase
        .from('analyses')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', analysisId)
        .select()
        .single();

      if (error) {

        throw new Error(`Failed to update analysis: ${error.message}`);
      }

      return analysis;

    } catch (error) {

      throw error;
    }
  }

  // Delete transcription
  async deleteTranscription(transcriptionId: string): Promise<void> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('transcriptions')
        .delete()
        .eq('id', transcriptionId);

      if (error) {

        throw new Error(`Failed to delete transcription: ${error.message}`);
      }

    } catch (error) {

      throw error;
    }
  }

  // Delete analysis
  async deleteAnalysis(analysisId: string): Promise<void> {
    try {
      if (!this.currentUserId) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('analyses')
        .delete()
        .eq('id', analysisId);

      if (error) {

        throw new Error(`Failed to delete analysis: ${error.message}`);
      }

    } catch (error) {

      throw error;
    }
  }
}

// Export singleton instance
export const supabaseProjectsService = new SupabaseProjectsService();
