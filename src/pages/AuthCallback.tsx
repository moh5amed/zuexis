import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUserOnboarding } from '../hooks/useUserOnboarding';
import { Scissors } from 'lucide-react';

const AuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getRedirectPath, isLoading: onboardingLoading } = useUserOnboarding();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔍 [AuthCallback] Starting auth callback handling...');
        console.log('🔍 [AuthCallback] Current user state:', user);
        
        // Check if we have a user (auth was successful)
        if (user) {
          console.log('✅ [AuthCallback] User authenticated successfully:', user.email);
          setStatus('success');
          // Redirect based on user onboarding status
          setTimeout(() => {
            const redirectPath = getRedirectPath();
            if (redirectPath) {
              navigate(redirectPath, { replace: true });
            } else {
              // Fallback to cloud storage setup if still loading
              navigate('/cloud-storage-setup', { replace: true });
            }
          }, 2000);
        } else {
          console.log('⏳ [AuthCallback] No user yet, waiting for auth state...');
          // Wait a bit for auth state to update
          setTimeout(() => {
            if (!user) {
              console.log('❌ [AuthCallback] Authentication failed after timeout');
              setStatus('error');
              setErrorMessage('Authentication failed. Please try again.');
            }
          }, 3000);
        }
      } catch (error) {
        console.error('❌ [AuthCallback] Auth callback error:', error);
        setStatus('error');
        setErrorMessage('An unexpected error occurred during authentication.');
      }
    };

    handleAuthCallback();
  }, [user, navigate]);

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
