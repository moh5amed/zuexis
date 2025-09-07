/**
 * User Preferences Service
 * Handles user preferences including onboarding skip settings
 */

export interface UserPreferences {
  hasSkippedCloudStorageSetup: boolean;
  lastSkippedAt?: string;
  onboardingCompleted: boolean;
}

class UserPreferencesService {
  private readonly STORAGE_KEY = 'zuexis_user_preferences';

  /**
   * Get user preferences from localStorage
   */
  getPreferences(userId: string): UserPreferences {
    try {
      const key = `${this.STORAGE_KEY}_${userId}`;
      const stored = localStorage.getItem(key);
      
      if (stored) {
        return JSON.parse(stored);
      }
      
      // Return default preferences
      return {
        hasSkippedCloudStorageSetup: false,
        onboardingCompleted: false
      };
    } catch (error) {
      return {
        hasSkippedCloudStorageSetup: false,
        onboardingCompleted: false
      };
    }
  }

  /**
   * Save user preferences to localStorage
   */
  savePreferences(userId: string, preferences: Partial<UserPreferences>): void {
    try {
      const key = `${this.STORAGE_KEY}_${userId}`;
      const current = this.getPreferences(userId);
      const updated = {
        ...current,
        ...preferences,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (error) {
    }
  }

  /**
   * Mark that user has skipped cloud storage setup
   */
  markCloudStorageSetupSkipped(userId: string): void {
    this.savePreferences(userId, {
      hasSkippedCloudStorageSetup: true,
      lastSkippedAt: new Date().toISOString(),
      onboardingCompleted: true
    });
  }

  /**
   * Mark that user has completed cloud storage setup
   */
  markCloudStorageSetupCompleted(userId: string): void {
    this.savePreferences(userId, {
      hasSkippedCloudStorageSetup: false,
      onboardingCompleted: true
    });
  }

  /**
   * Check if user has skipped cloud storage setup
   */
  hasSkippedCloudStorageSetup(userId: string): boolean {
    const preferences = this.getPreferences(userId);
    return preferences.hasSkippedCloudStorageSetup;
  }

  /**
   * Check if user has completed onboarding
   */
  hasCompletedOnboarding(userId: string): boolean {
    const preferences = this.getPreferences(userId);
    return preferences.onboardingCompleted;
  }

  /**
   * Reset user preferences (for testing or account reset)
   */
  resetPreferences(userId: string): void {
    try {
      const key = `${this.STORAGE_KEY}_${userId}`;
      localStorage.removeItem(key);
    } catch (error) {
    }
  }

  /**
   * Get all stored preferences (for debugging)
   */
  getAllStoredPreferences(): { [key: string]: UserPreferences } {
    const allPreferences: { [key: string]: UserPreferences } = {};
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_KEY)) {
          const userId = key.replace(`${this.STORAGE_KEY}_`, '');
          allPreferences[userId] = this.getPreferences(userId);
        }
      }
    } catch (error) {
    }
    
    return allPreferences;
  }
}

// Export singleton instance
export const userPreferencesService = new UserPreferencesService();
