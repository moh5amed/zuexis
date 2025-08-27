import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCloudStorage } from './useCloudStorage';

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
        console.log('🔍 [useUserOnboarding] Starting connection status check...');
        console.log('🔍 [useUserOnboarding] getConnectionStatus function:', typeof getConnectionStatus);
        
        if (typeof getConnectionStatus !== 'function') {
          console.error('❌ [useUserOnboarding] getConnectionStatus is not a function:', getConnectionStatus);
          setIsNewUser(true);
          setIsLoading(false);
          return;
        }

        const connectionStatus = await getConnectionStatus();
        const hasConnections = Object.values(connectionStatus).some(Boolean);
        
        console.log('🔍 [useUserOnboarding] Connection status:', connectionStatus);
        console.log('🔍 [useUserOnboarding] Has connections:', hasConnections);
        
        // Consider user as "new" if they have no cloud storage connections
        setIsNewUser(!hasConnections);
      } catch (error) {
        console.error('❌ [useUserOnboarding] Error checking user onboarding status:', error);
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
      const connectionStatus = await getConnectionStatus();
      const hasConnections = Object.values(connectionStatus).some(Boolean);
      setIsNewUser(!hasConnections);
      console.log('🔄 [useUserOnboarding] Status refreshed - hasConnections:', hasConnections);
    } catch (error) {
      console.error('Error refreshing user onboarding status:', error);
    }
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
    refreshStatus
  };
};
