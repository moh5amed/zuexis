import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCloudStorage } from './useCloudStorage';
import { userPreferencesService } from '../services/userPreferencesService';

export const useUserOnboarding = () => {
  const { user } = useAuth();
  const { getConnectionStatus } = useCloudStorage();
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) {
        setIsNewUser(null);
        setIsLoading(false);
        return;
      }

      try {
        // First check if user has skipped cloud storage setup
        const hasSkipped = userPreferencesService.hasSkippedCloudStorageSetup(user.id);
        const hasCompletedOnboarding = userPreferencesService.hasCompletedOnboarding(user.id);
        if (hasSkipped || hasCompletedOnboarding) {
          setIsNewUser(false);
          setIsLoading(false);
          return;
        }
        if (typeof getConnectionStatus !== 'function') {
          setIsNewUser(true);
          setIsLoading(false);
          return;
        }

        const connectionStatus = await getConnectionStatus();
        const hasConnections = Object.values(connectionStatus).some(Boolean);
        // Consider user as "new" if they have no cloud storage connections
        setIsNewUser(!hasConnections);
      } catch (error) {
        // Default to treating as new user if there's an error
        setIsNewUser(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserStatus();
  }, [user, getConnectionStatus]);

  // Add a function to manually refresh the status
  const refreshStatus = async () => {
    if (!user) return;
    
    try {
      // Check preferences first
      const hasSkipped = userPreferencesService.hasSkippedCloudStorageSetup(user.id);
      const hasCompletedOnboarding = userPreferencesService.hasCompletedOnboarding(user.id);
      
      if (hasSkipped || hasCompletedOnboarding) {
        setIsNewUser(false);
        return;
      }
      
      const connectionStatus = await getConnectionStatus();
      const hasConnections = Object.values(connectionStatus).some(Boolean);
      setIsNewUser(!hasConnections);
    } catch (error) {
    }
  };

  // Function to mark onboarding as completed (when user connects cloud storage)
  const markOnboardingCompleted = () => {
    if (!user) return;
    
    userPreferencesService.markCloudStorageSetupCompleted(user.id);
    setIsNewUser(false);
  };

  // Function to mark onboarding as skipped (when user clicks skip)
  const markOnboardingSkipped = () => {
    if (!user) return;
    
    userPreferencesService.markCloudStorageSetupSkipped(user.id);
    setIsNewUser(false);
  };

  const getRedirectPath = () => {
    if (isLoading) return null;
    return isNewUser ? '/cloud-storage-setup' : '/dashboard';
  };

  return {
    isNewUser,
    isLoading,
    getRedirectPath,
    shouldShowOnboarding: isNewUser === true,
    refreshStatus,
    markOnboardingCompleted,
    markOnboardingSkipped
  };
};
