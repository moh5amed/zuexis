export interface BackendTestResult {
  success: boolean;
  backendUrl: string;
  tests: {
    healthCheck: TestResult;
    frontendStatus: TestResult;
    corsTest: TestResult;
    responseTime: TestResult;
  };
  overallStatus: 'connected' | 'partial' | 'failed';
  recommendations: string[];
  timestamp: string;
}

export interface TestResult {
  name: string;
  success: boolean;
  statusCode?: number;
  responseTime?: number;
  error?: string;
  data?: any;
}

export class BackendConnectionTest {
  private baseUrl: string;

  constructor(baseUrl: string = 'https://zuexisbacckend.onrender.com') {
    this.baseUrl = baseUrl;
  }

  /**
   * Run comprehensive backend connection tests
   */
  async runFullTest(): Promise<BackendTestResult> {
    const startTime = Date.now();
    const results: BackendTestResult = {
      success: false,
      backendUrl: this.baseUrl,
      tests: {
        healthCheck: { name: 'Health Check', success: false },
        frontendStatus: { name: 'Frontend Status', success: false },
        corsTest: { name: 'CORS Test', success: false },
        responseTime: { name: 'Response Time', success: false }
      },
      overallStatus: 'failed',
      recommendations: [],
      timestamp: new Date().toISOString()
    };

    try {
      // Test 1: Health Check
      console.log('🔍 Testing backend health check...');
      results.tests.healthCheck = await this.testHealthCheck();

      // Test 2: Frontend Status
      console.log('🔍 Testing frontend status endpoint...');
      results.tests.frontendStatus = await this.testFrontendStatus();

      // Test 3: CORS Test
      console.log('🔍 Testing CORS configuration...');
      results.tests.corsTest = await this.testCors();

      // Test 4: Response Time
      console.log('🔍 Testing response time...');
      results.tests.responseTime = await this.testResponseTime();

      // Calculate overall success
      const successfulTests = Object.values(results.tests).filter(test => test.success).length;
      const totalTests = Object.keys(results.tests).length;
      
      results.success = successfulTests === totalTests;
      
      if (successfulTests === totalTests) {
        results.overallStatus = 'connected';
      } else if (successfulTests > 0) {
        results.overallStatus = 'partial';
      } else {
        results.overallStatus = 'failed';
      }

      // Generate recommendations
      results.recommendations = this.generateRecommendations(results);

      console.log('✅ Backend connection test completed:', results);
      return results;

    } catch (error) {
      console.error('❌ Backend connection test failed:', error);
      results.recommendations.push(`Test execution failed: ${error}`);
      return results;
    }
  }

  /**
   * Test basic health check endpoint
   */
  private async testHealthCheck(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const url = `${this.baseUrl}/api/health`;
      console.log('🔍 Testing Health Check URL:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseTime = Date.now() - startTime;
      const data = await response.json();
      
      console.log('✅ Health Check Response:', {
        status: response.status,
        ok: response.ok,
        data: data,
        responseTime
      });

      return {
        name: 'Health Check',
        success: response.ok,
        statusCode: response.status,
        responseTime,
        data: data
      };

    } catch (error) {
      console.error('Health Check Error:', error);
      return {
        name: 'Health Check',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test frontend status endpoint
   */
  private async testFrontendStatus(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const url = `${this.baseUrl}/api/frontend/status`;
      console.log('🔍 Testing Frontend Status URL:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseTime = Date.now() - startTime;
      const data = await response.json();
      
      console.log('✅ Frontend Status Response:', {
        status: response.status,
        ok: response.ok,
        data: data,
        responseTime
      });

      return {
        name: 'Frontend Status',
        success: response.ok,
        statusCode: response.status,
        responseTime,
        data: data
      };

    } catch (error) {
      console.error('Frontend Status Error:', error);
      return {
        name: 'Frontend Status',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test CORS configuration
   */
  private async testCors(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const url = `${this.baseUrl}/api/frontend/test-cors`;
      console.log('🔍 Testing CORS URL:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin,
        },
      });

      const responseTime = Date.now() - startTime;
      const data = await response.json();

      // Check if CORS headers are present
      const corsHeaders = response.headers.get('access-control-allow-origin');
      const hasCors = corsHeaders && (corsHeaders === '*' || corsHeaders.includes(window.location.origin));
      
      console.log('✅ CORS Test Response:', {
        status: response.status,
        ok: response.ok,
        data: data,
        corsHeaders: corsHeaders,
        responseTime
      });

      return {
        name: 'CORS Test',
        success: response.ok,
        statusCode: response.status,
        responseTime,
        data: { ...data, corsHeaders: corsHeaders }
      };

    } catch (error) {
      console.error('CORS Test Error:', error);
      return {
        name: 'CORS Test',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test response time
   */
  private async testResponseTime(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const url = `${this.baseUrl}/api/health`;
      console.log('🔍 Testing Response Time URL:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseTime = Date.now() - startTime;
      
      // Consider response time good if under 2 seconds
      const isGoodResponseTime = responseTime < 2000;
      
      console.log('✅ Response Time Test Response:', {
        status: response.status,
        ok: response.ok,
        responseTime,
        isGoodResponseTime
      });

      return {
        name: 'Response Time',
        success: response.ok,
        statusCode: response.status,
        responseTime,
        data: { responseTimeMs: responseTime, isGoodResponseTime }
      };

    } catch (error) {
      console.error('Response Time Error:', error);
      return {
        name: 'Response Time',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(results: BackendTestResult): string[] {
    const recommendations: string[] = [];

    if (results.overallStatus === 'connected') {
      recommendations.push('✅ Backend connection is working perfectly!');
      recommendations.push('✅ All endpoints are responding correctly');
      recommendations.push('✅ CORS is properly configured');
      recommendations.push('✅ Response times are within acceptable limits');
    } else if (results.overallStatus === 'partial') {
      recommendations.push('⚠️ Backend connection is partially working');
      
      if (!results.tests.healthCheck.success) {
        recommendations.push('❌ Health check failed - backend may be down');
      }
      
      if (!results.tests.frontendStatus.success) {
        recommendations.push('❌ Frontend status failed - API endpoints may have issues');
      }
      
      if (!results.tests.corsTest.success) {
        recommendations.push('❌ CORS test failed - cross-origin requests may be blocked');
      }
      
      if (!results.tests.responseTime.success) {
        recommendations.push('⚠️ Response time is slow - backend may be overloaded');
      }
    } else {
      recommendations.push('❌ Backend connection completely failed');
      recommendations.push('❌ Check if the backend URL is correct');
      recommendations.push('❌ Verify the backend service is running');
      recommendations.push('❌ Check network connectivity and firewall settings');
    }

    // Add specific recommendations
    if (results.tests.responseTime.success && results.tests.responseTime.responseTime && results.tests.responseTime.responseTime > 1000) {
      recommendations.push('⚠️ Response time is slow (>1s) - consider optimizing backend performance');
    }

    if (results.tests.corsTest.success && results.tests.corsTest.data?.corsHeaders === '*') {
      recommendations.push('⚠️ CORS is set to allow all origins - consider restricting for production');
    }

    return recommendations;
  }

  /**
   * Quick connection test
   */
  async quickTest(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/api/health`;
      console.log('🔍 Quick Test URL:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.status === 'healthy';
      }

      return false;
    } catch (error) {
      console.error('Quick backend test failed:', error);
      return false;
    }
  }

  /**
   * Test specific endpoint
   */
  async testEndpoint(endpoint: string): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseTime = Date.now() - startTime;
      const data = await response.json();

      return {
        name: `Endpoint Test: ${endpoint}`,
        success: response.ok,
        statusCode: response.status,
        responseTime,
        data: data
      };

    } catch (error) {
      return {
        name: `Endpoint Test: ${endpoint}`,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const backendConnectionTest = new BackendConnectionTest();
export default backendConnectionTest;
