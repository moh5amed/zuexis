/**
 * Background Backend Test Service
 * Automatically tests backend connection anonymously in the background
 */

interface BackendTestResult {
  isConnected: boolean;
  responseTime: number;
  lastChecked: number;
  error?: string;
}

class BackgroundBackendTestService {
  private testResult: BackendTestResult | null = null;
  private testInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly TEST_INTERVAL = 30000; // Test every 30 seconds
  private readonly BACKEND_URL = import.meta.env.VITE_FOCUSED_BACKEND_URL || 'https://farmguard5.onrender.com';

  constructor() {
    // Don't start automatic testing - only run when explicitly called
  }

  /**
   * Start background testing
   */
  private startBackgroundTesting(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Run initial test immediately
    this.runTest();
    
    // Set up interval for periodic testing
    this.testInterval = setInterval(() => {
      this.runTest();
    }, this.TEST_INTERVAL);
  }

  /**
   * Stop background testing
   */
  public stopBackgroundTesting(): void {
    if (this.testInterval) {
      clearInterval(this.testInterval);
      this.testInterval = null;
    }
    this.isRunning = false;
  }

  /**
   * Run a single backend test
   */
  private async runTest(): Promise<void> {
    try {
      const startTime = Date.now();
      
      const response = await fetch(`${this.BACKEND_URL}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        this.testResult = {
          isConnected: true,
          responseTime,
          lastChecked: Date.now()
        };
      } else {
        this.testResult = {
          isConnected: false,
          responseTime,
          lastChecked: Date.now(),
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      this.testResult = {
        isConnected: false,
        responseTime: 0,
        lastChecked: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get current test result
   */
  public getTestResult(): BackendTestResult | null {
    return this.testResult;
  }

  /**
   * Check if backend is currently connected
   */
  public isBackendConnected(): boolean {
    if (!this.testResult) return false;
    
    // Consider connection stale if last check was more than 2 minutes ago
    const isStale = Date.now() - this.testResult.lastChecked > 120000;
    
    return this.testResult.isConnected && !isStale;
  }

  /**
   * Get connection status for UI display
   */
  public getConnectionStatus(): {
    status: 'connected' | 'disconnected' | 'checking' | 'unknown';
    message: string;
    responseTime?: number;
  } {
    if (!this.testResult) {
      return {
        status: 'unknown',
        message: 'Backend status unknown'
      };
    }

    const isStale = Date.now() - this.testResult.lastChecked > 120000;
    
    if (isStale) {
      return {
        status: 'checking',
        message: 'Checking backend connection...'
      };
    }

    if (this.testResult.isConnected) {
      return {
        status: 'connected',
        message: `Backend connected (${this.testResult.responseTime}ms)`,
        responseTime: this.testResult.responseTime
      };
    } else {
      return {
        status: 'disconnected',
        message: this.testResult.error || 'Backend disconnected'
      };
    }
  }

  /**
   * Force a new test (runs immediately, no periodic testing)
   */
  public async forceTest(): Promise<BackendTestResult | null> {
    await this.runTest();
    return this.testResult;
  }

  /**
   * Start periodic testing (if needed in the future)
   */
  public startPeriodicTesting(): void {
    this.startBackgroundTesting();
  }

  /**
   * Stop periodic testing
   */
  public stopPeriodicTesting(): void {
    this.stopBackgroundTesting();
  }
}

// Create singleton instance
export const backgroundBackendTest = new BackgroundBackendTestService();

// Export the class for testing
export { BackgroundBackendTestService };
export type { BackendTestResult };
