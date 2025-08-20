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
import { CloudStorageProvider, CloudStorageFile } from '../services/cloudStorageService';

interface CloudStorageManagerProps {
  className?: string;
}

const CloudStorageManager: React.FC<CloudStorageManagerProps> = ({ className = '' }) => {
  const {
    providers,
    connectedProviders,
    loading,
    error,
    connectProvider,
    disconnectProvider,
    uploadFile,
    downloadFile,
    getFiles,
    deleteFile,
    getStorageUsage,
    clearError,
    refreshProviders
  } = useCloudStorage();

  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [files, setFiles] = useState<CloudStorageFile[]>([]);
  const [showFileManager, setShowFileManager] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [storageUsage, setStorageUsage] = useState<any>(null);

  // Handle provider connection
  const handleConnect = async (providerId: string) => {
    const result = await connectProvider(providerId);
    if (result.success) {
      // Load storage usage
      const usageResult = await getStorageUsage(providerId);
      if (usageResult.success) {
        setStorageUsage(usageResult.usage);
      }
    }
  };

  // Handle provider disconnection
  const handleDisconnect = async (providerId: string) => {
    await disconnectProvider(providerId);
    setStorageUsage(null);
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
    
    // Get files from Supabase metadata
    const result = await getFiles();
    if (result.success && result.files) {
      // Filter files by the selected provider
      const providerFiles = result.files.filter(file => file.cloudProviderId === providerId);
      setFiles(providerFiles);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProvider) return;
    
    setUploadingFile(file);
    
    try {
      // Upload file to cloud storage (metadata will be stored in Supabase)
      const result = await uploadFile(selectedProvider, file);
      if (result.success) {
        // Refresh files list
        const filesResult = await getFiles();
        if (filesResult.success && filesResult.files) {
          // Filter files by the selected provider
          const providerFiles = filesResult.files.filter(f => f.cloudProviderId === selectedProvider);
          setFiles(providerFiles);
        }
      }
    } finally {
      setUploadingFile(null);
      // Clear input
      event.target.value = '';
    }
  };

  // Handle file download
  const handleFileDownload = async (file: CloudStorageFile) => {
    if (!selectedProvider || !file.cloudProviderId) return;
    
    const result = await downloadFile(file.cloudProviderId, file.id);
    if (result.success && result.file) {
      // Create download link
      const url = URL.createObjectURL(result.file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Handle file deletion
  const handleFileDelete = async (file: CloudStorageFile) => {
    if (!selectedProvider || !file.cloudProviderId) return;
    
    if (window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
      const result = await deleteFile(file.cloudProviderId, file.id);
      if (result.success) {
        // Refresh files list
        const filesResult = await getFiles();
        if (filesResult.success && filesResult.files) {
          // Filter files by the selected provider
          const providerFiles = filesResult.files.filter(f => f.cloudProviderId === selectedProvider);
          setFiles(providerFiles);
        }
      }
    }
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
          onClick={refreshProviders}
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
            {provider.isConnected && provider.accountInfo && (
              <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Account:</span>
                    <span className="font-medium">{provider.accountInfo.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Storage:</span>
                    <span className="font-medium">
                      {provider.accountInfo.storageUsed} / {provider.accountInfo.storageTotal}
                    </span>
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
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                >
                  {loading ? (
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

      {/* File Manager */}
      {showFileManager && selectedProvider && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Folder className="h-5 w-5" />
              <span>File Manager - {providers.find(p => p.id === selectedProvider)?.name}</span>
            </h3>
            <button
              onClick={() => setShowFileManager(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ×
            </button>
          </div>

          {/* Actions Bar */}
          <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-700/50 rounded-lg">
            {/* Upload File */}
            <div className="flex items-center space-x-2">
              <input
                type="file"
                id="file-upload"
                onChange={handleFileUpload}
                className="hidden"
                accept="video/*,image/*"
              />
              <label
                htmlFor="file-upload"
                className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center space-x-2"
              >
                {uploadingFile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span>
                  {uploadingFile ? 'Uploading...' : 'Upload File'}
                </span>
              </label>
            </div>
          </div>

          {/* Files List */}
          <div className="space-y-2">
            {files.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Folder className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No files found</p>
                <p className="text-sm">Upload a file to get started</p>
              </div>
            ) : (
              files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">
                      {file.mimeType.startsWith('video/') ? '🎬' : 
                       file.mimeType.startsWith('image/') ? '🖼️' : '📄'}
                    </div>
                    <div>
                      <div className="font-medium">{file.name}</div>
                      <div className="text-sm text-gray-400">
                        {formatFileSize(file.size)} • {formatDate(file.createdTime)}
                      </div>
                      {file.projectId && (
                        <div className="text-xs text-blue-400">
                          Project: {file.projectId}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleFileDownload(file)}
                      className="p-2 text-green-400 hover:text-green-300 transition-colors"
                      title="Download file"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleFileDelete(file)}
                      className="p-2 text-red-400 hover:text-red-300 transition-colors"
                      title="Delete file"
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

      {/* Storage Usage */}
      {storageUsage && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Storage Usage</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-700/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-400">
                {storageUsage.total || 'N/A'}
              </div>
              <div className="text-sm text-gray-400">Total Storage</div>
            </div>
            <div className="text-center p-4 bg-gray-700/50 rounded-lg">
              <div className="text-2xl font-bold text-green-400">
                {storageUsage.used || 'N/A'}
              </div>
              <div className="text-sm text-gray-400">Used Storage</div>
            </div>
            <div className="text-center p-4 bg-gray-700/50 rounded-lg">
              <div className="text-2xl font-bold text-purple-400">
                {storageUsage.remaining || 'N/A'}
              </div>
              <div className="text-sm text-gray-400">Available</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CloudStorageManager;
