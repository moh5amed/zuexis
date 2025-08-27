import React, { useState } from 'react';
import { backendConnectionTest, BackendTestResult } from '../services/backendConnectionTest';
import { LoadingStage } from './LoadingScreen';
import LoadingScreen from './LoadingScreen';
import './BackendTestPanel.css';

const BackendTestPanel: React.FC = () => {
  const [testResult, setTestResult] = useState<BackendTestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [loadingStages, setLoadingStages] = useState<LoadingStage[]>([
    { name: 'Health Check', status: 'pending', progress: 0, message: 'Testing backend health...' },
    { name: 'Frontend Status', status: 'pending', progress: 0, message: 'Testing frontend endpoints...' },
    { name: 'CORS Test', status: 'pending', progress: 0, message: 'Testing CORS configuration...' },
    { name: 'Response Time', status: 'pending', progress: 0, message: 'Measuring response times...' }
  ]);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);

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

  const runFullTest = async () => {
    setIsRunning(true);
    setTestResult(null);
    setShowLoadingScreen(true);
    setCurrentStageIndex(0);
    setOverallProgress(0);

    try {
      // Reset all stages
      setLoadingStages(prev => prev.map(stage => ({ ...stage, status: 'pending', progress: 0 })));

      // Run the test
      const result = await backendConnectionTest.runFullTest();
      setTestResult(result);

      // Update stages based on results
      Object.entries(result.tests).forEach(([key, test], index) => {
        updateLoadingStage(index, test.success ? 'completed' : 'failed', test.success ? 100 : 0, test.message || test.name);
      });

      // Show results for 3 seconds then hide loading screen
      setTimeout(() => {
        setShowLoadingScreen(false);
        setIsRunning(false);
      }, 3000);

    } catch (error) {
      console.error('Test failed:', error);
      setTestResult({
        success: false,
        backendUrl: 'https://zuexisbacckend.onrender.com',
        tests: {
          healthCheck: { name: 'Health Check', success: false, error: 'Test execution failed' },
          frontendStatus: { name: 'Frontend Status', success: false, error: 'Test execution failed' },
          corsTest: { name: 'CORS Test', success: false, error: 'Test execution failed' },
          responseTime: { name: 'Response Time', success: false, error: 'Test execution failed' }
        },
        overallStatus: 'failed',
        recommendations: ['Test execution failed due to an unexpected error'],
        timestamp: new Date().toISOString()
      });

      setTimeout(() => {
        setShowLoadingScreen(false);
        setIsRunning(false);
      }, 2000);
    }
  };

  const runQuickTest = async () => {
    setIsRunning(true);
    setTestResult(null);

    try {
      const isConnected = await backendConnectionTest.quickTest();
      setTestResult({
        success: isConnected,
        backendUrl: 'https://zuexisbacckend.onrender.com',
        tests: {
          healthCheck: { name: 'Health Check', success: isConnected, message: isConnected ? 'Backend is responding' : 'Backend is not responding' },
          frontendStatus: { name: 'Frontend Status', success: false, message: 'Quick test only checks health' },
          corsTest: { name: 'CORS Test', success: false, message: 'Quick test only checks health' },
          responseTime: { name: 'Response Time', success: false, message: 'Quick test only checks health' }
        },
        overallStatus: isConnected ? 'connected' : 'failed',
        recommendations: isConnected ? ['Backend is responding to health checks'] : ['Backend is not responding to health checks'],
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Quick test failed:', error);
      setTestResult({
        success: false,
        backendUrl: 'https://zuexisbacckend.onrender.com',
        tests: {
          healthCheck: { name: 'Health Check', success: false, error: 'Quick test failed' },
          frontendStatus: { name: 'Frontend Status', success: false, error: 'Quick test failed' },
          corsTest: { name: 'CORS Test', success: false, error: 'Quick test failed' },
          responseTime: { name: 'Response Time', success: false, error: 'Quick test failed' }
        },
        overallStatus: 'failed',
        recommendations: ['Quick test failed due to an unexpected error'],
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="backend-test-panel">
      {/* Loading Screen */}
      <LoadingScreen
        isVisible={showLoadingScreen}
        stages={loadingStages}
        currentStageIndex={currentStageIndex}
        overallProgress={overallProgress}
        onClose={() => setShowLoadingScreen(false)}
        title="Backend Connection Test"
        subtitle="Testing connectivity to Render backend..."
      />

      <div className="test-controls">
        <h3 className="test-title">Backend Connection Test</h3>
        <p className="test-description">
          Test the connection to your Render backend and verify all endpoints are working correctly.
        </p>
        
        <div className="test-buttons">
          <button
            onClick={runQuickTest}
            disabled={isRunning}
            className="test-button quick-test"
          >
            {isRunning ? 'Testing...' : 'Quick Test'}
          </button>
          
          <button
            onClick={runFullTest}
            disabled={isRunning}
            className="test-button full-test"
          >
            {isRunning ? 'Running Full Test...' : 'Full Test'}
          </button>
        </div>
      </div>

      {/* Test Results */}
      {testResult && (
        <div className="test-results">
          <div className={`result-header ${testResult.overallStatus}`}>
            <h4 className="result-title">
              Test Results - {testResult.overallStatus.toUpperCase()}
            </h4>
            <span className="result-timestamp">
              {new Date(testResult.timestamp).toLocaleString()}
            </span>
          </div>

          {/* Individual Test Results */}
          <div className="test-details">
            {Object.entries(testResult.tests).map(([key, test]) => (
              <div key={key} className={`test-detail ${test.success ? 'success' : 'failed'}`}>
                <div className="test-detail-header">
                  <span className="test-name">{test.name}</span>
                  <span className={`test-status ${test.success ? 'success' : 'failed'}`}>
                    {test.success ? '✅ Passed' : '❌ Failed'}
                  </span>
                </div>
                
                {test.message && (
                  <p className="test-message">{test.message}</p>
                )}
                
                {test.error && (
                  <p className="test-error">{test.error}</p>
                )}
                
                {test.responseTime && (
                  <p className="test-response-time">
                    Response Time: {test.responseTime}ms
                  </p>
                )}
                
                {test.statusCode && (
                  <p className="test-status-code">
                    Status Code: {test.statusCode}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Recommendations */}
          {testResult.recommendations.length > 0 && (
            <div className="recommendations">
              <h5 className="recommendations-title">Recommendations:</h5>
              <ul className="recommendations-list">
                {testResult.recommendations.map((rec, index) => (
                  <li key={index} className="recommendation-item">{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Backend URL */}
          <div className="backend-url">
            <strong>Backend URL:</strong> {testResult.backendUrl}
          </div>
        </div>
      )}
    </div>
  );
};

export default BackendTestPanel;
