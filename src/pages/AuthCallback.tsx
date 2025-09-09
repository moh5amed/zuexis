import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUserOnboarding } from '../hooks/useUserOnboarding';
import { Scissors } from 'lucide-react';

const AuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getRedirectPath, isLoading: onboardingLoading } = useUserOnboarding();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 [AuthCallback] Starting OAuth callback handling...');
        setDebugInfo('Starting OAuth callback handling...');
        
        // Check if this is a Google OAuth callback
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        
        console.log('🔍 [AuthCallback] URL params:', { code: code ? 'present' : 'missing', error });
        setDebugInfo(`URL params: code=${code ? 'present' : 'missing'}, error=${error || 'none'}`);
        
        if (code || error) {
          console.log('🔍 [AuthCallback] This is a Google OAuth callback');
          setDebugInfo('Google OAuth callback detected');
          
          // This is a Google OAuth callback
          if (error) {
            console.error('❌ [AuthCallback] Google OAuth Error:', error);
            setDebugInfo(`OAuth Error: ${error}`);
            
            // Send error to parent window if in popup
            if (window.opener) {
              console.log('📤 [AuthCallback] Sending error to parent window');
              window.opener.postMessage({
                type: 'GOOGLE_OAUTH_ERROR',
                error: error
              }, window.location.origin);
              window.close();
            } else {
              setStatus('error');
              setErrorMessage(`OAuth Error: ${error}`);
            }
            return;
          }
          
          if (code) {
            console.log('🔑 [AuthCallback] OAuth code received, processing...');
            setDebugInfo('OAuth code received, processing...');
            
            // Send the authorization code to the parent window
            if (window.opener) {
              console.log('📤 [AuthCallback] Sending code to parent window');
              window.opener.postMessage({
                type: 'GOOGLE_OAUTH_CODE',
                code: code
              }, window.location.origin);
              
              // Close popup after sending message
              setTimeout(() => {
                console.log('🚪 [AuthCallback] Closing popup window');
                window.close();
              }, 1000);
            } else {
              console.log('❌ [AuthCallback] No parent window found');
              setStatus('error');
              setErrorMessage('This page should be opened in a popup window');
            }
            return;
          }
        }
        
        console.log('🔍 [AuthCallback] Regular Supabase auth callback');
        setDebugInfo('Regular Supabase auth callback');
        
        // Regular Supabase auth callback
        if (user) {
          console.log('✅ [AuthCallback] User authenticated, redirecting...');
          setStatus('success');
          setDebugInfo('User authenticated, redirecting...');
          
          // Redirect based on user onboarding status
          setTimeout(() => {
            const redirectPath = getRedirectPath();
            console.log('🔄 [AuthCallback] Redirect path:', redirectPath);
            if (redirectPath) {
              navigate(redirectPath, { replace: true });
            } else {
              // Fallback to cloud storage setup if still loading
              console.log('🔄 [AuthCallback] Fallback to cloud storage setup');
              navigate('/cloud-storage-setup', { replace: true });
            }
          }, 2000);
        } else {
          console.log('⏳ [AuthCallback] Waiting for auth state to update...');
          setDebugInfo('Waiting for auth state to update...');
          
          // Wait a bit for auth state to update
          setTimeout(() => {
            if (!user) {
              console.log('❌ [AuthCallback] Authentication failed');
              setStatus('error');
              setErrorMessage('Authentication failed. Please try again.');
            }
          }, 3000);
        }
      } catch (error) {
        console.error('❌ [AuthCallback] Unexpected error:', error);
        setStatus('error');
        setErrorMessage('An unexpected error occurred during authentication.');
        setDebugInfo(`Error: ${error}`);
      }
    };

    handleAuthCallback();
  }, [user, navigate, getRedirectPath]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-3 rounded-xl">
              <Scissors className="h-8 w-8 text-white" />
            </div>
          </div>
          
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Completing Authentication</h1>
            <p className="text-gray-400">Please wait while we complete your sign-in...</p>
            {debugInfo && (
              <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-300">Debug: {debugInfo}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-xl">
              <Scissors className="h-8 w-8 text-white" />
            </div>
          </div>
          
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Authentication Successful!</h1>
            <p className="text-gray-400">Setting up your account...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="bg-gradient-to-r from-red-500 to-pink-500 p-3 rounded-xl">
            <Scissors className="h-8 w-8 text-white" />
          </div>
        </div>
        
        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Authentication Failed</h1>
          <p className="text-gray-400 mb-4">{errorMessage}</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-2 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
