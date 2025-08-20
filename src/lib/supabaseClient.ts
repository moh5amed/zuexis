import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logging to check environment variables
console.log('🔍 Environment Variables Debug:');
console.log('VITE_SUPABASE_URL:', supabaseUrl);
console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...` : 'undefined');
console.log('import.meta.env keys:', Object.keys(import.meta.env));
console.log('import.meta.env.VITE_ keys:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));
console.log('');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase environment variables are missing!');
  console.error('Please create a .env file in your project root with:');
  console.error('VITE_SUPABASE_URL=your_supabase_project_url');
  console.error('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
  console.error('');
  console.error('Get these values from your Supabase project dashboard:');
  console.error('1. Go to https://supabase.com');
  console.error('2. Create a new project or select existing');
  console.error('3. Go to Settings > API');
  console.error('4. Copy Project URL and anon/public key');
  console.error('');
  console.error('Authentication will not work until these are set!');
} else {
  console.log('✅ Supabase environment variables are loaded successfully!');
  console.log('URL length:', supabaseUrl.length);
  console.log('Key length:', supabaseAnonKey.length);
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
  }
);

// Add a helper function to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  const configured = !!(supabaseUrl && supabaseAnonKey);
  console.log('🔧 isSupabaseConfigured check:', configured);
  return configured;
};

// Test the Supabase client
console.log('🔧 Testing Supabase client...');
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('❌ Supabase client test failed:', error);
  } else {
    console.log('✅ Supabase client test successful:', data.session ? 'Session found' : 'No session');
  }
}).catch(err => {
  console.error('❌ Supabase client test error:', err);
});


