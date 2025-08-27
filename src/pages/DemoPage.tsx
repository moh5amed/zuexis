import React, { useState } from 'react';
import LoadingScreen, { LoadingStage } from '../components/LoadingScreen';
import BackendTestPanel from '../components/BackendTestPanel';
import { backendConnectionTest } from '../services/backendConnectionTest';
import './DemoPage.css';

const DemoPage: React.FC = () => {
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [loadingStages, setLoadingStages] = useState<LoadingStage[]>([
    { name: 'Initializing System', status: 'pending', progress: 0, message: 'Starting up...' },
    { name: 'Loading Components', status: 'pending', progress: 0, message: 'Preparing UI...' },
    { name: 'Connecting Services', status: 'pending', progress: 0, message: 'Establishing connections...' },
    { name: 'Loading Data', status: 'pending', progress: 0, message: 'Fetching information...' },
    { name: 'Finalizing Setup', status: 'pending', progress: 0, message: 'Completing initialization...' }
  ]);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [demoType, setDemoType] = useState<'loading' | 'backend-test' | 'video-processing'>('loading');

  const updateLoadingStage = (stageIndex: number, status: 'pending' | 'processing' | 'completed' | 'failed', progress: number, message: string) => {
    setLoadingStages(prev => prev.map((stage, index) => 
      index === stageIndex 
        ? { ...stage, status, progress, message }
        : stage
    ));
    
    // Update overall progress
    const totalProgress = loadingStages.reduce((sum, stage, index) => {
      if (index === stageIndex) {
        return sum + progress;
      }
      return sum + (stage.status === 'completed' ? 100 : stage.progress);
    }, 0);
    
    setOverallProgress(totalProgress / loadingStages.length);
  };

  const runLoadingDemo = () => {
    setDemoType('loading');
    setShowLoadingScreen(true);
    setCurrentStageIndex(0);
    setOverallProgress(0);
    
    // Reset all stages
    setLoadingStages(prev => prev.map(stage => ({ ...stage, status: 'pending', progress: 0 })));

    // Simulate loading stages
    const stages = [
      { name: 'Initializing System', message: 'Starting up system components...' },
      { name: 'Loading Components', message: 'Preparing user interface...' },
      { name: 'Connecting Services', message: 'Establishing service connections...' },
      { name: 'Loading Data', message: 'Fetching user data and preferences...' },
      { name: 'Finalizing Setup', message: 'Completing system initialization...' }
    ];

    stages.forEach((stage, index) => {
      setTimeout(() => {
        setCurrentStageIndex(index);
        updateLoadingStage(index, 'processing', 0, stage.message);
        
        // Simulate progress
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += Math.random() * 15 + 5; // Random progress increment
          if (progress >= 100) {
            progress = 100;
            clearInterval(progressInterval);
            updateLoadingStage(index, 'completed', 100, `${stage.name} completed successfully!`);
          } else {
            updateLoadingStage(index, 'processing', progress, stage.message);
          }
        }, 200);
        
      }, index * 2000); // Start each stage 2 seconds apart
    });

    // Hide loading screen after all stages complete
    setTimeout(() => {
      setShowLoadingScreen(false);
    }, 12000);
  };

  const runVideoProcessingDemo = () => {
    setDemoType('video-processing');
    setShowLoadingScreen(true);
    setCurrentStageIndex(0);
    setOverallProgress(0);
    
    // Reset all stages
    setLoadingStages(prev => prev.map(stage => ({ ...stage, status: 'pending', progress: 0 })));

    // Video processing stages
    const stages = [
      { name: 'Uploading Video', message: 'Uploading video file to server...' },
      { name: 'Analyzing Content', message: 'AI analyzing video content and structure...' },
      { name: 'Generating Clips', message: 'Creating viral clips with AI...' },
      { name: 'Applying Watermarks', message: 'Adding professional watermarks...' },
      { name: 'Final Processing', message: 'Finalizing and optimizing clips...' }
    ];

    stages.forEach((stage, index) => {
      setTimeout(() => {
        setCurrentStageIndex(index);
        updateLoadingStage(index, 'processing', 0, stage.message);
        
        // Simulate video processing progress
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += Math.random() * 20 + 10; // Faster progress for video processing
          if (progress >= 100) {
            progress = 100;
            clearInterval(progressInterval);
            updateLoadingStage(index, 'completed', 100, `${stage.name} completed successfully!`);
          } else {
            updateLoadingStage(index, 'processing', progress, stage.message);
          }
        }, 150);
        
      }, index * 1500); // Start each stage 1.5 seconds apart
    });

    // Hide loading screen after all stages complete
    setTimeout(() => {
      setShowLoadingScreen(false);
    }, 9000);
  };

  const runBackendTestDemo = async () => {
    setDemoType('backend-test');
    setShowLoadingScreen(true);
    setCurrentStageIndex(0);
    setOverallProgress(0);
    
    // Reset all stages
    setLoadingStages(prev => prev.map(stage => ({ ...stage, status: 'pending', progress: 0 })));

    try {
      // Run actual backend test
      const testResult = await backendConnectionTest.runFullTest();
      
      // Update stages based on results
      Object.entries(testResult.tests).forEach(([key, test], index) => {
        updateLoadingStage(index, test.success ? 'completed' : 'failed', test.success ? 100 : 0, test.message || test.name);
      });

      // Show results for 3 seconds then hide loading screen
      setTimeout(() => {
        setShowLoadingScreen(false);
      }, 3000);

    } catch (error) {
      console.error('Backend test demo failed:', error);
      updateLoadingStage(0, 'failed', 0, 'Backend test failed');
      setTimeout(() => {
        setShowLoadingScreen(false);
      }, 2000);
    }
  };

  return (
    <div className="demo-page">
      {/* Loading Screen */}
      <LoadingScreen
        isVisible={showLoadingScreen}
        stages={loadingStages}
        currentStageIndex={currentStageIndex}
        overallProgress={overallProgress}
        onClose={() => setShowLoadingScreen(false)}
        title={
          demoType === 'loading' ? 'System Initialization' :
          demoType === 'video-processing' ? 'Video Processing' :
          'Backend Connection Test'
        }
        subtitle={
          demoType === 'loading' ? 'Initializing system components and services...' :
          demoType === 'video-processing' ? 'AI-powered video processing in progress...' :
          'Testing backend connectivity and endpoints...'
        }
      />

      <div className="demo-container">
        <div className="demo-header">
          <h1 className="demo-title">🎯 Loading Screen & Backend Test Demo</h1>
          <p className="demo-subtitle">
            Experience the comprehensive loading screen with progress tracking and backend connectivity testing
          </p>
        </div>

        <div className="demo-sections">
          {/* Loading Screen Demos */}
          <div className="demo-section">
            <h2 className="section-title">🚀 Loading Screen Demos</h2>
            <p className="section-description">
              Interactive demonstrations of the loading screen with different scenarios
            </p>
            
            <div className="demo-buttons">
              <button
                onClick={runLoadingDemo}
                className="demo-button loading-demo"
                disabled={showLoadingScreen}
              >
                🖥️ System Initialization Demo
              </button>
              
              <button
                onClick={runVideoProcessingDemo}
                className="demo-button video-demo"
                disabled={showLoadingScreen}
              >
                🎥 Video Processing Demo
              </button>
            </div>
          </div>

          {/* Backend Testing */}
          <div className="demo-section">
            <h2 className="section-title">🔍 Backend Connection Testing</h2>
            <p className="section-description">
              Test your Render backend connectivity with comprehensive endpoint testing
            </p>
            
            <div className="demo-buttons">
              <button
                onClick={runBackendTestDemo}
                className="demo-button backend-demo"
                disabled={showLoadingScreen}
              >
                🧪 Run Backend Test Demo
              </button>
            </div>
          </div>

          {/* Features Overview */}
          <div className="demo-section">
            <h2 className="section-title">✨ Features Overview</h2>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">🎯</div>
                <h3>Progress Tracking</h3>
                <p>Real-time progress bars with smooth animations and stage-by-stage updates</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">🔄</div>
                <h3>Stage Management</h3>
                <p>Visual representation of all processing stages with status indicators</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">📊</div>
                <h3>Statistics</h3>
                <p>Live statistics showing completed, processing, and failed stages</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">🔍</div>
                <h3>Backend Testing</h3>
                <p>Comprehensive testing of backend endpoints, CORS, and response times</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">💡</div>
                <h3>Smart Recommendations</h3>
                <p>AI-powered recommendations based on test results and performance</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">📱</div>
                <h3>Responsive Design</h3>
                <p>Mobile-friendly interface with adaptive layouts and touch support</p>
              </div>
            </div>
          </div>

          {/* Backend Test Panel */}
          <div className="demo-section">
            <h2 className="section-title">🔧 Backend Test Panel</h2>
            <p className="section-description">
              Full-featured backend testing interface with detailed results and diagnostics
            </p>
            <BackendTestPanel />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoPage;
