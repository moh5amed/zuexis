import React, { useState, useEffect } from 'react';
import './LoadingScreen.css';

export interface LoadingStage {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  startTime?: Date;
  endTime?: Date;
}

export interface LoadingScreenProps {
  isVisible: boolean;
  stages: LoadingStage[];
  currentStageIndex: number;
  overallProgress: number;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isVisible,
  stages,
  currentStageIndex,
  overallProgress,
  onClose,
  title = 'Processing Your Video',
  subtitle = 'AI-powered viral clip generation in progress...'
}) => {
  const [showCloseButton, setShowCloseButton] = useState(false);

  useEffect(() => {
    // Show close button after 30 seconds or when all stages are completed
    const timer = setTimeout(() => {
      setShowCloseButton(true);
    }, 30000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  const currentStage = stages[currentStageIndex];
  const completedStages = stages.filter(stage => stage.status === 'completed').length;
  const failedStages = stages.filter(stage => stage.status === 'failed').length;

  return (
    <div className="loading-screen-overlay">
      <div className="loading-screen-container">
        {/* Header */}
        <div className="loading-header">
          <h2 className="loading-title">{title}</h2>
          <p className="loading-subtitle">{subtitle}</p>
        </div>

        {/* Overall Progress */}
        <div className="overall-progress-section">
          <div className="progress-info">
            <span className="progress-label">Overall Progress</span>
            <span className="progress-percentage">{Math.round(overallProgress)}%</span>
          </div>
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${overallProgress}%` }}
            />
            <div className="progress-bar-glow" />
          </div>
        </div>

        {/* Current Stage */}
        {currentStage && (
          <div className="current-stage-section">
            <div className="stage-header">
              <h3 className="current-stage-name">{currentStage.name}</h3>
              <span className="stage-status status-processing">Processing...</span>
            </div>
            <div className="stage-progress-container">
              <div 
                className="stage-progress-fill" 
                style={{ width: `${currentStage.progress}%` }}
              />
            </div>
            <p className="stage-message">{currentStage.message}</p>
          </div>
        )}

        {/* All Stages */}
        <div className="stages-section">
          <h4 className="stages-title">Processing Stages</h4>
          <div className="stages-list">
            {stages.map((stage, index) => (
              <div 
                key={index} 
                className={`stage-item ${stage.status} ${index === currentStageIndex ? 'current' : ''}`}
              >
                <div className="stage-info">
                  <span className="stage-name">{stage.name}</span>
                  <span className={`stage-status status-${stage.status}`}>
                    {stage.status === 'pending' && '⏳ Pending'}
                    {stage.status === 'processing' && '🔄 Processing'}
                    {stage.status === 'completed' && '✅ Completed'}
                    {stage.status === 'failed' && '❌ Failed'}
                  </span>
                </div>
                <div className="stage-progress">
                  <div className="stage-progress-bar">
                    <div 
                      className="stage-progress-fill" 
                      style={{ width: `${stage.progress}%` }}
                    />
                  </div>
                  <span className="stage-progress-text">{stage.progress}%</span>
                </div>
                {stage.message && (
                  <p className="stage-message">{stage.message}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Statistics */}
        <div className="stats-section">
          <div className="stat-item">
            <span className="stat-label">Completed</span>
            <span className="stat-value completed">{completedStages}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Processing</span>
            <span className="stat-value processing">{stages.filter(s => s.status === 'processing').length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Failed</span>
            <span className="stat-value failed">{failedStages}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total</span>
            <span className="stat-value total">{stages.length}</span>
          </div>
        </div>

        {/* Close Button */}
        {showCloseButton && onClose && (
          <div className="close-section">
            <button 
              className="close-button"
              onClick={onClose}
            >
              Close Loading Screen
            </button>
            <p className="close-note">
              You can close this screen. Processing will continue in the background.
            </p>
          </div>
        )}

        {/* Loading Animation */}
        <div className="loading-animation">
          <div className="spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
