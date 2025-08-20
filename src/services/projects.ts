import { supabase } from '../lib/supabaseClient';

export type SourceType = 'file' | 'url' | 'text';

export type CreateProjectInput = {
  title: string;
  sourceType: SourceType;
  sourcePath?: string; // for file uploads (storage key)
  sourceUrl?: string; // for URL inputs
  sourceText?: string; // for text inputs
  platforms: string[];
  aiPrompt?: string;
  language?: string;
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

export async function createProject(input: CreateProjectInput) {
  const payload = {
    title: input.title,
    source_type: input.sourceType,
    source_path: input.sourcePath ?? null,
    source_url: input.sourceUrl ?? null,
    source_text: input.sourceText ?? null,
    platforms: input.platforms,
    ai_prompt: input.aiPrompt ?? null,
    language: input.language ?? 'en',
    status: 'uploaded',
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
  title: string;
  source_type: SourceType;
  source_path: string | null;
  source_url: string | null;
  source_text: string | null;
  platforms: string[];
  ai_prompt: string | null;
  language: string;
  status: string;
  created_at: string;
};

export async function listProjects(): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as ProjectRow[]) ?? [];
}


