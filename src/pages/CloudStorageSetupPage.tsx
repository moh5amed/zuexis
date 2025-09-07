import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCloudStorage } from '../hooks/useCloudStorage';
import { useUserOnboarding } from '../hooks/useUserOnboarding';
import { 
  Cloud, 
  HardDrive, 
  Database, 
  CheckCircle, 
  ArrowRight,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

const CloudStorageSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    connectGoogleDrive, 
    getConnectionStatus,
    validateAndEnsureConnection 
  } = useCloudStorage();
  
  const { refreshStatus, markOnboardingSkipped, markOnboardingCompleted } = useUserOnboarding();
  
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{[key: string]: boolean}>({});
  const [hasAnyConnection, setHasAnyConnection] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Check current connection status
    const checkConnections = async () => {
      try {
        if (typeof getConnectionStatus !== 'function') {
          setIsLoading(false);
          return;
        }

        const status = await getConnectionStatus();
        setConnectionStatus(status);
        const hasConnections = Object.values(status).some(Boolean);
        setHasAnyConnection(hasConnections);
        // If user already has connections, redirect to dashboard
        if (hasConnections) {
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 1000);
        }
        
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
      }
    };

    checkConnections();
  }, [user, navigate, getConnectionStatus]);

  const handleConnect = async (provider: string) => {
    setIsConnecting(provider);
    
    try {
      let success = false;
      
      switch (provider) {
        case 'google-drive':
          success = await connectGoogleDrive();
          break;
        default:
          success = false;
          break;
      }

      if (success) {
        // Update connection status
        setConnectionStatus(prev => ({ ...prev, [provider]: true }));
        setHasAnyConnection(true);
        
        // Mark onboarding as completed
        markOnboardingCompleted();
        
        // Keep loading state for a moment to show success
        setTimeout(async () => {
          setIsConnecting(null);
          alert(`${provider.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} connected successfully!`);
          
          // Refresh the onboarding status to ensure it recognizes the new connection
          await refreshStatus();
          
          // Redirect to dashboard after showing success
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 500);
        }, 1500);
      } else {
        setIsConnecting(null);
      }
    } catch (error) {
      alert(`Failed to connect to ${provider}. Please try again.`);
      setIsConnecting(null);
    }
  };

  const handleContinue = () => {
    if (hasAnyConnection) {
      navigate('/dashboard');
    } else {
      alert('Please connect at least one cloud storage service to continue.');
    }
  };

  const handleSkip = async () => {
    // Mark onboarding as skipped
    markOnboardingSkipped();
    
    // Show confirmation message
    alert('Cloud storage setup skipped. You can connect your Google Drive later from the Settings page.');
    
    // Refresh the onboarding status before redirecting
    await refreshStatus();
    navigate('/dashboard', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Welcome to ViralClip AI! 🎉</h1>
              <p className="text-gray-400 mt-1">Let's get you set up with cloud storage</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Step 2 of 2</span>
              <div className="w-16 h-1 bg-gray-600 rounded-full">
                <div className="w-full h-1 bg-purple-500 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Cloud className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Connect Google Drive</h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Connect your Google Drive to start uploading and processing videos. 
            This will allow you to access your files directly from your cloud storage.
          </p>
        </div>

        {/* Cloud Storage Options */}
        <div className="max-w-md mx-auto mb-8">
          {/* Google Drive */}
          <div className={`bg-gray-800 rounded-xl p-8 border-2 transition-all duration-200 ${
            connectionStatus['google-drive'] 
              ? 'border-green-500 bg-green-900/20' 
              : 'border-gray-700 hover:border-purple-500 hover:bg-gray-750'
          }`}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <HardDrive className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Google Drive</h3>
              <p className="text-gray-400 text-sm">Connect your Google Drive to get started</p>
            </div>
            
            <p className="text-gray-300 text-sm mb-6 text-center">
              Access your Google Drive files directly. Perfect for YouTube creators and content teams.
            </p>
            
            <button
              onClick={() => handleConnect('google-drive')}
              disabled={isConnecting === 'google-drive' || connectionStatus['google-drive']}
              className={`w-full py-4 px-6 rounded-lg font-medium transition-all duration-200 ${
                connectionStatus['google-drive']
                  ? 'bg-green-600 text-white cursor-not-allowed'
                  : isConnecting === 'google-drive'
                  ? 'bg-purple-600 text-white cursor-wait shadow-lg shadow-purple-500/25 animate-pulse'
                  : 'bg-gradient-to-r from-blue-500 to-green-500 text-white hover:from-blue-600 hover:to-green-600'
              }`}
            >
              {isConnecting === 'google-drive' ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span className="font-medium">Connecting...</span>
                </div>
              ) : connectionStatus['google-drive'] ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Connected ✓</span>
                </div>
              ) : (
                'Connect Google Drive'
              )}
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-400 mb-2">Why Connect Google Drive?</h3>
              <ul className="text-gray-300 space-y-1 text-sm">
                <li>• Upload videos directly from your Google Drive</li>
                <li>• No need to download and re-upload files</li>
                <li>• Access your videos from anywhere</li>
                <li>• Seamless integration with your existing workflow</li>
                <li>• Perfect for YouTube creators and content teams</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleSkip}
            className="px-8 py-3 border border-gray-600 text-gray-300 rounded-lg hover:border-gray-500 hover:text-white transition-colors duration-200"
          >
            Skip for Now
          </button>
          
          <button
            onClick={handleContinue}
            disabled={!hasAnyConnection}
            className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
              hasAnyConnection
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            Continue to Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Help Section */}
        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm">
            Need help? Check out our{' '}
            <a 
              href="#" 
              className="text-purple-400 hover:text-purple-300 underline inline-flex items-center gap-1"
            >
              setup guide <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CloudStorageSetupPage;
