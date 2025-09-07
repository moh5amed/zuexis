import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';

const ConfigWarning = () => {
  return (
    <div className="fixed top-4 left-4 right-4 z-50 bg-yellow-500/90 backdrop-blur-sm border border-yellow-400 rounded-lg p-4 shadow-lg">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="h-5 w-5 text-yellow-800 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2">
            Supabase Configuration Required
          </h3>
          <p className="text-sm text-yellow-700 mb-3">
            Authentication is not working because Supabase is not configured. Please set up your environment variables.
          </p>
          <div className="space-y-2 text-xs text-yellow-700">
            <p><strong>1.</strong> Create a <code className="bg-yellow-200 px-1 rounded">.env</code> file in your project root</p>
            <p><strong>2.</strong> Add your Supabase credentials:</p>
            <div className="bg-yellow-200 p-2 rounded font-mono text-xs">
              VITE_SUPABASE_URL=your_project_url<br/>
              VITE_SUPABASE_ANON_KEY=your_anon_key
            </div>
            <p><strong>3.</strong> Get these values from your Supabase project dashboard</p>
          </div>
          <div className="mt-3 flex space-x-2">
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
            >
              <span>Go to Supabase</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <button
              onClick={() => window.location.reload()}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
            >
              Reload After Setup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigWarning;
