import React, { useState, useEffect } from 'react';
import { useCloudStorage } from '../hooks/useCloudStorage';

interface CloudStorageStatusProps {
  onConnectionUpdate?: () => void;
}

const CloudStorageStatus: React.FC<CloudStorageStatusProps> = ({ onConnectionUpdate }) => {
  const {
    connectedProviders,
    isLoading,
    error,
    handleReauthentication,
    getConnectionGuidance,
    checkReauthenticationNeeds,
    refreshConnectionStatus
  } = useCloudStorage();

  const [connectionIssues, setConnectionIssues] = useState<Array<{
    providerId: string;
    issue: string;
    guidance: { title: string; message: string; action: string };
  }>>([]);

  // Check for connection issues on mount and when providers change
  useEffect(() => {
    const checkConnectionIssues = async () => {
      const issues: Array<{
        providerId: string;
        issue: string;
        guidance: { title: string; message: string; action: string };
      }> = [];

      for (const provider of connectedProviders) {
        if (provider.isConnected) {
          const reauthCheck = await checkReauthenticationNeeds(provider.id);
          if (reauthCheck.needsReauth) {
            const guidance = getConnectionGuidance(provider.id, reauthCheck.reason || 'connection_failed');
            issues.push({
              providerId: provider.id,
              issue: reauthCheck.reason || 'connection_failed',
              guidance
            });
          }
        }
      }

      setConnectionIssues(issues);
    };

    if (connectedProviders.length > 0) {
      checkConnectionIssues();
    }
  }, [connectedProviders, checkReauthenticationNeeds, getConnectionGuidance]);

  const handleReconnect = async (providerId: string) => {
    try {
      const result = await handleReauthentication(providerId);
      if (result.success) {
        // Refresh connection status
        await refreshConnectionStatus();
        if (onConnectionUpdate) {
          onConnectionUpdate();
        }
      }
    } catch (error) {
    }
  };

  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-blue-800">Checking cloud storage connections...</span>
        </div>
      </div>
    );
  }

  if (connectionIssues.length > 0) {
    return (
      <div className="space-y-3 mb-4">
        {connectionIssues.map((issue, index) => (
          <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800">
                  {issue.guidance.title}
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  {issue.guidance.message}
                </p>
              </div>
              <button
                onClick={() => handleReconnect(issue.providerId)}
                className="ml-4 px-3 py-1 text-sm font-medium text-yellow-800 bg-yellow-100 border border-yellow-300 rounded-md hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                {issue.guidance.action}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (connectedProviders.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <div className="text-center">
          <p className="text-sm text-gray-600">No cloud storage providers connected</p>
          <p className="text-xs text-gray-500 mt-1">Connect your cloud storage to start uploading files</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-green-800">
            Connected to {connectedProviders.length} cloud storage provider{connectedProviders.length !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-green-600 mt-1">
            {connectedProviders.map(p => p.name).join(', ')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CloudStorageStatus;
