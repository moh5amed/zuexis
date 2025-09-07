// Security Configuration - All sensitive values should be in environment variables
// This file centralizes all environment variable access for better security

export const securityConfig = {
  // Backend URLs
  focusedBackendUrl: import.meta.env.VITE_FOCUSED_BACKEND_URL || '',
  pythonBackendUrl: import.meta.env.VITE_PYTHON_BACKEND_URL || '',
  
  // Supabase Configuration
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  
  // AI Service Keys
  ai: {
    geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
    openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  },
  
  // Payment Processing
  stripe: {
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
  },
  
  // Cloud Storage Providers
  cloudStorage: {
    googleDrive: {
      clientId: import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID || '',
      clientSecret: import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_SECRET || '',
      apiKey: import.meta.env.VITE_GOOGLE_DRIVE_API_KEY || '',
    },
    oneDrive: {
      clientId: import.meta.env.VITE_ONEDRIVE_CLIENT_ID || '',
      clientSecret: import.meta.env.VITE_ONEDRIVE_CLIENT_SECRET || '',
      redirectUri: import.meta.env.VITE_ONEDRIVE_REDIRECT_URI || '',
    },
    dropbox: {
      appKey: import.meta.env.VITE_DROPBOX_APP_KEY || '',
      redirectUri: import.meta.env.VITE_DROPBOX_REDIRECT_URI || '',
    },
  },
};

// Security validation functions
export const validateConfig = () => {
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_FOCUSED_BACKEND_URL',
  ];
  
  const missing = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missing.length > 0) {
    console.warn('⚠️ Missing required environment variables:', missing);
    return false;
  }
  
  return true;
};

// Helper to check if a service is configured
export const isServiceConfigured = (service: keyof typeof securityConfig): boolean => {
  const config = securityConfig[service];
  
  if (typeof config === 'string') {
    return config !== '';
  }
  
  if (typeof config === 'object' && config !== null) {
    return Object.values(config).some(value => 
      typeof value === 'string' ? value !== '' : 
      typeof value === 'object' ? Object.values(value).some(v => v !== '') : 
      false
    );
  }
  
  return false;
};

// Development mode checks
if (import.meta.env.DEV) {
  console.log('🔒 Security Config Status:');
  console.log('- Supabase:', isServiceConfigured('supabase') ? '✅' : '❌');
  console.log('- AI Services:', isServiceConfigured('ai') ? '✅' : '❌');
  console.log('- Stripe:', isServiceConfigured('stripe') ? '✅' : '❌');
  console.log('- Cloud Storage:', isServiceConfigured('cloudStorage') ? '✅' : '❌');
  
  if (!validateConfig()) {
    console.error('❌ Critical environment variables are missing!');
  }
}
