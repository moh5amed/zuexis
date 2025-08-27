import { supabase } from '../lib/supabaseClient';

export type SourceType = 'file' | 'url' | 'text' | 'youtube';
export type ProjectStatus = 'processing' | 'completed' | 'failed';

export type CreateProjectInput = {
  title: string;
  description?: string;
  sourceType: SourceType;
  sourceUrl?: string; // for URL inputs
};

export async function uploadSourceFile(file: File) {
  const bucket = 'uploads';
  const key = `${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage.from(bucket).upload(key, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  return { bucket, key, path: data?.path ?? key };
}

export async function createProject(input: CreateProjectInput, userId: string) {
  const payload = {
    title: input.title,
    description: input.description || null,
    source_type: input.sourceType,
    source_url: input.sourceUrl ?? null,
    status: 'processing' as ProjectStatus,
    user_id: userId,
  };

  const { data, error } = await supabase
    .from('projects')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export type ProjectRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  source_type: SourceType;
  source_url: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
};

export async function listProjects(userId: string): Promise<ProjectRow[]> {
  console.log('🔍 [projects] Fetching projects for user:', userId);
  
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ [projects] Error fetching projects:', error);
    throw error;
  }
  
  console.log('📊 [projects] Raw data from Supabase:', data);
  const projects = (data as ProjectRow[]) ?? [];
  console.log('✅ [projects] Processed projects:', projects);
  
  return projects;
}

export async function getProject(projectId: string): Promise<ProjectRow | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();
  if (error) throw error;
  return data as ProjectRow;
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', projectId);
  if (error) throw error;
}

// Video Clips Types and Functions
export type VideoClip = {
  id: string;
  cloud_file_id: string;
  name: string;
  size: number;
  mime_type: string;
  cloud_provider_id: string;
  user_id: string;
  project_id: string | null;
  clip_id: string | null;
  duration: string | null; // interval type from PostgreSQL
  resolution: string | null;
  transcription: string | null;
  analysis: any; // JSONB type
  created_at: string;
  updated_at: string;
};

export async function getProjectClips(projectId: string): Promise<VideoClip[]> {
  const { data, error } = await supabase
    .from('video_clips')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as VideoClip[]) ?? [];
}

export async function createVideoClip(clipData: Omit<VideoClip, 'id' | 'created_at' | 'updated_at'>): Promise<VideoClip> {
  const { data, error } = await supabase
    .from('video_clips')
    .insert([clipData])
    .select()
    .single();
  if (error) throw error;
  return data as VideoClip;
}

export async function updateVideoClip(clipId: string, updates: Partial<VideoClip>): Promise<void> {
  const { error } = await supabase
    .from('video_clips')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', clipId);
  if (error) throw error;
}

// Test function to create a sample project
export async function createTestProject(userId: string): Promise<ProjectRow> {
  console.log('🧪 [projects] Creating test project for user:', userId);
  
  const testProjectData = {
    title: 'Test AI Video Project',
    description: 'This is a test project to verify the integration',
    sourceType: 'youtube' as SourceType,
    sourceUrl: 'https://www.youtube.com/watch?v=test123',
  };
  
  try {
    const project = await createProject(testProjectData, userId);
    console.log('✅ [projects] Test project created successfully:', project);
    return project;
  } catch (error) {
    console.error('❌ [projects] Failed to create test project:', error);
    throw error;
  }
}


