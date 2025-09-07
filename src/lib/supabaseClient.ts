import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logging to check environment variables
if (import.meta.env.DEV) {
  console.log('🔧 [Supabase] Environment check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlPreview: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'missing'
  });
}

if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.DEV) {
    console.warn('⚠️ [Supabase] Missing environment variables:', {
      missingUrl: !supabaseUrl,
      missingKey: !supabaseAnonKey
    });
  }
} else {
  if (import.meta.env.DEV) {
    console.log('✅ [Supabase] Environment variables configured');
  }
}

// Create client with proper error handling
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'X-Client-Info': 'viral-clip-app',
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// Add a helper function to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  const configured = !!(supabaseUrl && supabaseAnonKey);
  
  if (import.meta.env.DEV) {
    console.log('🔍 [Supabase] Configuration status:', configured);
  }
  
  return configured;
};

// Test the Supabase client
if (import.meta.env.DEV) {
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.warn('⚠️ [Supabase] Session check failed:', error.message);
    } else {
      console.log('✅ [Supabase] Session check passed');
    }
  }).catch(err => {
    console.warn('⚠️ [Supabase] Session check error:', err);
  });
}