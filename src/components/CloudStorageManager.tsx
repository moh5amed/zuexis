import React, { useState } from 'react';
import { 
  Cloud, 
  Link, 
  Unlink, 
  Upload, 
  Download, 
  Folder, 
  Trash2, 
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  Settings
} from 'lucide-react';
import { useCloudStorage } from '../hooks/useCloudStorage';
import { CloudStorageFile } from '../services/cloudStorageService';

interface CloudStorageManagerProps {
  className?: string;
}

const CloudStorageManager: React.FC<CloudStorageManagerProps> = ({ className = '' }) => {
  const {
    connectedProviders,
    isLoading,
    error,
    uploadFile,
    clearError,
    refreshConnectionStatus,
    isProviderConnected,
    connectGoogleDrive,
    connectOneDrive,
    connectDropbox,
    disconnectProvider
  } = useCloudStorage();

  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [files, setFiles] = useState<CloudStorageFile[]>([]);
  const [showFileManager, setShowFileManager] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);

  // Define available providers
  const providers = [
    {
      id: 'google-drive',
      name: 'Google Drive',
      icon: '📁',
      color: '#4285F4',
      isConnected: connectedProviders.some(p => p.id === 'google-drive'),
      accountInfo: null
    },
    {
      id: 'one-drive',
      name: 'OneDrive',
      icon: '☁️',
      color: '#0078D4',
      isConnected: connectedProviders.some(p => p.id === 'one-drive'),
      accountInfo: null
    },
    {
      id: 'dropbox',
      name: 'Dropbox',
      icon: '📦',
      color: '#0061FF',
      isConnected: connectedProviders.some(p => p.id === 'dropbox'),
      accountInfo: null
    }
  ];

  // Handle provider connection
  const handleConnect = async (providerId: string) => {
    let result;
    switch (providerId) {
      case 'google-drive':
        result = await connectGoogleDrive();
        break;
      case 'one-drive':
        result = await connectOneDrive();
        break;
      case 'dropbox':
        result = await connectDropbox();
        break;
      default:
        console.error('Unknown provider:', providerId);
        return;
    }
    
    if (result && result.success) {
      // Refresh connection status
      await refreshConnectionStatus();
    }
  };

  // Handle provider disconnection
  const handleDisconnect = async (providerId: string) => {
    await disconnectProvider(providerId);
    if (selectedProvider === providerId) {
      setSelectedProvider(null);
      setFiles([]);
      setShowFileManager(false);
    }
  };

  // Load files for a provider
  const handleLoadFiles = async (providerId: string) => {
    setSelectedProvider(providerId);
    setShowFileManager(true);
    
    // For now, just show empty file manager
    // TODO: Implement file loading from cloud storage
    setFiles([]);
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProvider) return;
    
    setUploadingFile(file);
    
    try {
      // Upload file to cloud storage
      const result = await uploadFile(selectedProvider, file);
      if (result && result.success) {
        // Refresh files list
        await handleLoadFiles(selectedProvider);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploadingFile(null);
      // Clear input
      event.target.value = '';
    }
  };

  // Handle file download
  const handleFileDownload = async (file: CloudStorageFile) => {
    // TODO: Implement file download
    console.log('Download not implemented yet for:', file.name);
  };

  // Handle file deletion
  const handleFileDelete = async (file: CloudStorageFile) => {
    // TODO: Implement file deletion
    console.log('Delete not implemented yet for:', file.name);
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center space-x-2">
            <Cloud className="h-6 w-6" />
            <span>Cloud Storage</span>
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Connect your cloud storage providers to store and manage videos
          </p>
        </div>
        <button
          onClick={refreshConnectionStatus}
          className="p-2 text-gray-400 hover:text-white transition-colors"
          title="Refresh providers"
        >
          <Loader2 className="h-5 w-5" />
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-500/50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <span className="text-red-300">{error}</span>
          </div>
          <button
            onClick={clearError}
            className="mt-2 text-red-400 hover:text-red-300 text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Available Providers */}
      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-400" />
          <p className="text-gray-400">Loading cloud storage providers...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                provider.isConnected
                  ? 'border-green-500/50 bg-green-500/10'
                  : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div 
                    className="text-2xl"
                    style={{ color: provider.color }}
                  >
                    {provider.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold">{provider.name}</h3>
                    <div className="flex items-center space-x-2">
                      {provider.isConnected ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-400" />
                          <span className="text-sm text-green-400">Connected</span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">Not connected</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Info */}
              {provider.isConnected && (
                <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className="font-medium text-green-400">Connected</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Provider:</span>
                      <span className="font-medium">{provider.name}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                {provider.isConnected ? (
                  <>
                    <button
                      onClick={() => handleLoadFiles(provider.id)}
                      className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Folder className="h-4 w-4" />
                      <span>Manage Files</span>
                    </button>
                    <button
                      onClick={() => handleDisconnect(provider.id)}
                      className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Unlink className="h-4 w-4" />
                      <span>Disconnect</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleConnect(provider.id)}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link className="h-4 w-4" />
                    )}
                    <span>Connect</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File Manager */}
      {showFileManager && selectedProvider && (
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">File Manager - {selectedProvider}</h3>
            <button
              onClick={() => setShowFileManager(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Upload Section */}
          <div className="mb-6 p-4 border border-gray-600 rounded-lg">
            <h4 className="font-medium mb-3">Upload Files</h4>
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={uploadingFile !== null}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
            {uploadingFile && (
              <div className="mt-2 flex items-center space-x-2 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Uploading {uploadingFile.name}...</span>
              </div>
            )}
          </div>

          {/* Files List */}
          <div className="space-y-2">
            <h4 className="font-medium">Files</h4>
            {files.length === 0 ? (
              <p className="text-gray-400 text-sm">No files uploaded yet.</p>
            ) : (
              files.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-lg">📄</div>
                    <div>
                      <div className="font-medium">{file.name}</div>
                      <div className="text-sm text-gray-400">
                        {formatFileSize(file.size)} • {formatDate(file.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleFileDownload(file)}
                      className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleFileDelete(file)}
                      className="p-2 text-red-400 hover:text-red-300 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CloudStorageManager;
