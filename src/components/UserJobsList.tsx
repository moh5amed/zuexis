import React from 'react';
import { PersistentJob } from '../services/persistentProcessingService';
import { CheckCircle, Clock, AlertCircle, PlayCircle, Download, Eye, Trash2 } from 'lucide-react';

interface UserJobsListProps {
  jobs: PersistentJob[];
  onViewJob: (jobId: string) => void;
  onDownloadResults: (jobId: string) => void;
  onDeleteJob: (jobId: string) => void;
  className?: string;
}

const UserJobsList: React.FC<UserJobsListProps> = ({
  jobs,
  onViewJob,
  onDownloadResults,
  onDeleteJob,
  className = ''
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <PlayCircle className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-500';
      case 'processing':
        return 'text-blue-500';
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'processing':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (jobs.length === 0) {
    return (
      <div className={`bg-gray-800 rounded-lg p-8 ${className}`}>
        <div className="text-center text-gray-400">
          <Clock className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Processing Jobs</h3>
          <p className="text-sm">Start processing a video to see your jobs here</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-lg ${className}`}>
      <div className="p-6 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Your Processing Jobs</h3>
        <p className="text-sm text-gray-400">
          {jobs.length} job{jobs.length !== 1 ? 's' : ''} • 
          {jobs.filter(job => job.status === 'completed').length} completed • 
          {jobs.filter(job => job.status === 'processing').length} processing
        </p>
      </div>

      <div className="divide-y divide-gray-700">
        {jobs.map((job) => (
          <div key={job.id} className="p-6 hover:bg-gray-750 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {getStatusIcon(job.status)}
                  <h4 className="text-lg font-medium text-white">{job.project_name}</h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadgeColor(job.status)}`}>
                    {job.status}
                  </span>
                </div>
                
                <div className="text-sm text-gray-400 mb-3">
                  Job ID: {job.id.slice(0, 8)}... • Started: {new Date(job.created_at).toLocaleString()}
                </div>

                {job.status === 'completed' && (
                  <div className="text-sm text-green-400 mb-3">
                    ✓ {job.clips_generated} clip{job.clips_generated !== 1 ? 's' : ''} generated successfully
                  </div>
                )}

                {job.status === 'failed' && job.error_message && (
                  <div className="text-sm text-red-400 mb-3">
                    ✗ Error: {job.error_message}
                  </div>
                )}

                {job.status === 'processing' && (
                  <div className="text-sm text-blue-400 mb-3">
                    🔄 Currently processing...
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>File: {job.file_path.split('/').pop()}</span>
                  {job.clips_generated > 0 && (
                    <span>Clips: {job.clips_generated}</span>
                  )}
                  {job.completed_at && (
                    <span>Completed: {new Date(job.completed_at).toLocaleString()}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => onViewJob(job.id)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  title="View job details"
                >
                  <Eye className="w-4 h-4" />
                </button>

                {job.status === 'completed' && (
                  <button
                    onClick={() => onDownloadResults(job.id)}
                    className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/20 rounded-lg transition-colors"
                    title="Download results"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => onDeleteJob(job.id)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                  title="Delete job"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserJobsList;
