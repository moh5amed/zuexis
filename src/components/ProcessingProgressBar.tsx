import React, { useState, useEffect } from 'react';
import { ProcessingProgress, ProcessingStage } from '../services/aiProcessor';
import { 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap, 
  Database, 
  Brain, 
  Video, 
  FileText,
  Settings,
  TrendingUp,
  Users,
  Target,
  Sparkles
} from 'lucide-react';

interface ProcessingProgressBarProps {
  progress: ProcessingProgress;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
}

const ProcessingProgressBar: React.FC<ProcessingProgressBarProps> = ({
  progress,
  onPause,
  onResume,
  onCancel
}) => {
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState(false);

  const toggleStageExpansion = (stageId: string) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stageId)) {
      newExpanded.delete(stageId);
    } else {
      newExpanded.add(stageId);
    }
    setExpandedStages(newExpanded);
  };

  const getStageIcon = (stageId: string) => {
    const icons: Record<string, React.ReactNode> = {
      initialization: <Settings className="w-4 h-4" />,
      file_analysis: <FileText className="w-4 h-4" />,
      ai_transcription: <Brain className="w-4 h-4" />,
      ai_content_analysis: <TrendingUp className="w-4 h-4" />,
      video_processing: <Video className="w-4 h-4" />,
      caption_generation: <FileText className="w-4 h-4" />,
      database_integration: <Database className="w-4 h-4" />,
      finalization: <Sparkles className="w-4 h-4" />
    };
    return icons[stageId] || <Play className="w-4 h-4" />;
  };

  const getStageColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'skipped': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'skipped': return <XCircle className="w-4 h-4 text-gray-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatProgress = (progress: number) => {
    return `${Math.round(progress)}%`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Zap className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Video Processing Progress</h2>
            <p className="text-sm text-gray-600">AI-powered content creation in progress</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {progress.status === 'processing' && (
            <>
              <button
                onClick={onPause}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                <Pause className="w-4 h-4 mr-1 inline" />
                Pause
              </button>
              <button
                onClick={onCancel}
                className="px-3 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
              >
                Cancel
              </button>
            </>
          )}
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm font-medium text-gray-900">{formatProgress(progress.overallProgress)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress.overallProgress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>Elapsed: {formatTime(progress.elapsedTime)}</span>
          <span>Remaining: {formatTime(progress.estimatedTimeRemaining)}</span>
        </div>
      </div>

      {/* Current Stage */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Play className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-blue-900">Current Stage: {progress.currentStage}</h3>
            <p className="text-sm text-blue-700">Progress: {formatProgress(progress.currentStageProgress)}</p>
          </div>
        </div>
      </div>

      {/* Processing Stages */}
      <div className="space-y-3">
        {progress.stages.map((stage) => (
          <div key={stage.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Stage Header */}
            <div 
              className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                stage.status === 'completed' ? 'bg-green-50' : 
                stage.status === 'in_progress' ? 'bg-blue-50' : 
                stage.status === 'failed' ? 'bg-red-50' : 'bg-gray-50'
              }`}
              onClick={() => toggleStageExpansion(stage.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${getStageColor(stage.status)}`}>
                    {getStageIcon(stage.id)}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{stage.name}</h4>
                    <p className="text-sm text-gray-600">{stage.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatProgress(stage.progress)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {stage.duration ? formatTime(stage.duration) : 'Pending'}
                    </div>
                  </div>
                  {getStatusIcon(stage.status)}
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg 
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        expandedStages.has(stage.id) ? 'rotate-180' : ''
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Stage Progress Bar */}
            <div className="px-4 pb-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ease-out ${
                    stage.status === 'completed' ? 'bg-green-500' : 
                    stage.status === 'in_progress' ? 'bg-blue-500' : 
                    stage.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                  }`}
                  style={{ width: `${stage.progress}%` }}
                />
              </div>
            </div>

            {/* Sub-stages */}
            {expandedStages.has(stage.id) && stage.subStages && (
              <div className="border-t border-gray-200 bg-gray-50 p-4">
                <div className="space-y-2">
                  {stage.subStages.map((subStage) => (
                    <div key={subStage.id} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(subStage.status)}
                        <span className="text-sm font-medium text-gray-700">{subStage.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">{subStage.description}</span>
                        <span className="text-xs font-medium text-gray-900">
                          {formatProgress(subStage.progress)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Performance Metrics */}
      {showDetails && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-medium text-gray-900 mb-3">Performance Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {progress.performanceMetrics.cacheHits + progress.performanceMetrics.cacheMisses > 0 
                  ? Math.round((progress.performanceMetrics.cacheHits / (progress.performanceMetrics.cacheHits + progress.performanceMetrics.cacheMisses)) * 100)
                  : 0}%
              </div>
              <div className="text-xs text-gray-600">Cache Hit Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {progress.performanceMetrics.parallelTasks}
              </div>
              <div className="text-xs text-gray-600">Parallel Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(progress.performanceMetrics.memoryUsage * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600">Memory Usage</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {progress.performanceMetrics.networkLatency}ms
              </div>
              <div className="text-xs text-gray-600">Network Latency</div>
            </div>
          </div>
        </div>
      )}

      {/* Debug Information */}
      {showDetails && (
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h3 className="font-medium text-yellow-900 mb-3">Debug Information</h3>
          <div className="space-y-2 text-sm">
            <div><strong>Current Operation:</strong> {progress.debugInfo.currentOperation}</div>
            <div><strong>Active Threads:</strong> {progress.debugInfo.activeThreads}</div>
            <div><strong>Queue Length:</strong> {progress.debugInfo.queueLength}</div>
            <div><strong>Resource Status:</strong> {progress.debugInfo.resourceStatus}</div>
            <div><strong>Optimization Flags:</strong> {progress.debugInfo.optimizationFlags.join(', ')}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessingProgressBar;
