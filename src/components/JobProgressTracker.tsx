import React from 'react';
import { JobStatus, JobStage } from '../services/persistentProcessingService';
import { CheckCircle, Clock, AlertCircle, PlayCircle, Loader2 } from 'lucide-react';

interface JobProgressTrackerProps {
  jobStatus: JobStatus | null;
  className?: string;
}

const JobProgressTracker: React.FC<JobProgressTrackerProps> = ({ jobStatus, className = '' }) => {
  if (!jobStatus) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className="text-center text-gray-400">
          <Clock className="w-8 h-8 mx-auto mb-2" />
          <p>No active job</p>
        </div>
      </div>
    );
  }

  const getStageIcon = (stage: JobStage) => {
    if (stage.status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (stage.status === 'processing') {
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    } else {
      return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStageStatusColor = (stage: JobStage) => {
    if (stage.status === 'completed') {
      return 'text-green-500';
    } else if (stage.status === 'processing') {
      return 'text-blue-500';
    } else {
      return 'text-gray-400';
    }
  };

  const getProgressBarColor = (stage: JobStage) => {
    if (stage.status === 'completed') {
      return 'bg-green-500';
    } else if (stage.status === 'processing') {
      return 'bg-blue-500';
    } else {
      return 'bg-gray-600';
    }
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Processing Progress</h3>
          <p className="text-sm text-gray-400">
            Job ID: {jobStatus.job_id.slice(0, 8)}...
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{jobStatus.progress}%</div>
          <div className="text-sm text-gray-400">Complete</div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Overall Progress</span>
          <span>{jobStatus.progress}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${jobStatus.progress}%` }}
          />
        </div>
      </div>

      {/* Current Stage */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          {jobStatus.status === 'processing' ? (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          ) : jobStatus.status === 'completed' ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : jobStatus.status === 'failed' ? (
            <AlertCircle className="w-5 h-5 text-red-500" />
          ) : (
            <Clock className="w-5 h-5 text-gray-400" />
          )}
          <span className="text-white font-medium">Current Stage</span>
        </div>
        <div className="text-lg text-white">{jobStatus.current_stage}</div>
        {jobStatus.status === 'failed' && jobStatus.error_message && (
          <div className="mt-2 text-red-400 text-sm">
            Error: {jobStatus.error_message}
          </div>
        )}
      </div>

      {/* Stage Details */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-white">Processing Stages</h4>
        {jobStatus.stages.map((stage, index) => (
          <div key={stage.id} className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {getStageIcon(stage)}
                <span className={`font-medium ${getStageStatusColor(stage)}`}>
                  {stage.stage_name}
                </span>
              </div>
              <div className="text-sm text-gray-400">
                {stage.progress}%
              </div>
            </div>
            
            {/* Stage Progress Bar */}
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div
                className={`${getProgressBarColor(stage)} h-2 rounded-full transition-all duration-500 ease-out`}
                style={{ width: `${stage.progress}%` }}
              />
            </div>
            
            {/* Stage Status */}
            <div className="flex justify-between items-center mt-2">
              <span className={`text-xs ${getStageStatusColor(stage)} capitalize`}>
                {stage.status}
              </span>
              {stage.completed_at && (
                <span className="text-xs text-gray-400">
                  Completed: {new Date(stage.completed_at).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Job Info */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Status:</span>
            <span className={`ml-2 capitalize ${
              jobStatus.status === 'completed' ? 'text-green-500' :
              jobStatus.status === 'processing' ? 'text-blue-500' :
              jobStatus.status === 'failed' ? 'text-red-500' :
              'text-gray-400'
            }`}>
              {jobStatus.status}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Clips Generated:</span>
            <span className="ml-2 text-white">{jobStatus.clips_generated}</span>
          </div>
          <div>
            <span className="text-gray-400">Started:</span>
            <span className="ml-2 text-white">
              {new Date(jobStatus.created_at).toLocaleString()}
            </span>
          </div>
          {jobStatus.completed_at && (
            <div>
              <span className="text-gray-400">Completed:</span>
              <span className="ml-2 text-white">
                {new Date(jobStatus.completed_at).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobProgressTracker;
