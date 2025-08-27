// React hook for managing user subscriptions
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscriptionService } from '../services/subscriptionService';
import { supabase } from '../lib/supabaseClient';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  UserCredits,
  UsageTracking,
  PlanSlug,
  FEATURE_NAMES,
} from '../types/subscription';

export interface UseSubscriptionReturn {
  // Subscription data
  subscriptionStatus: SubscriptionStatus | null;
  availablePlans: SubscriptionPlan[];
  userCredits: UserCredits | null;
  currentUsage: UsageTracking | null;
  
  // Loading states
  isLoading: boolean;
  isCheckingAccess: boolean;
  
  // Actions
  checkProjectAccess: () => Promise<boolean>;

  purchaseCredits: (credits: number) => Promise<boolean>;
  useCredits: (credits: number) => Promise<boolean>;
  refreshSubscription: () => Promise<void>;
  
  // Feature access
  hasFeatureAccess: (featureName: string) => Promise<boolean>;
  canUseFeature: (featureName: string) => boolean;
  
  // Plan information
  getCurrentPlan: () => SubscriptionPlan | null;
  isOnPlan: (planSlug: PlanSlug) => boolean;
  getPlanLimit: (limitType: 'videos' | 'clips') => number;
  getRemainingLimit: (limitType: 'videos' | 'clips') => number;
  getAccurateRemainingVideos: () => Promise<number>;
}

export const useSubscription = (): UseSubscriptionReturn => {
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [currentUsage, setCurrentUsage] = useState<UsageTracking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);

  // Initialize subscription service with current user
  useEffect(() => {
    if (user?.id) {
      subscriptionService.setCurrentUser(user.id);
    }
  }, [user?.id]);

  // Load subscription data on mount and user change
  useEffect(() => {
    if (user?.id) {
      loadSubscriptionData();
    } else {
      setSubscriptionStatus(null);
      setUserCredits(null);
      setCurrentUsage(null);
      setIsLoading(false);
    }
  }, [user?.id]);

  // Load all subscription-related data
  const loadSubscriptionData = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const [status, credits, usage, plans] = await Promise.all([
        subscriptionService.getUserSubscriptionStatus(),
        subscriptionService.getUserCredits(),
        subscriptionService.getCurrentPeriodUsage(),
        subscriptionService.getSubscriptionPlans(),
      ]);

      setSubscriptionStatus(status);
      setUserCredits(credits);
      setCurrentUsage(usage);
      setAvailablePlans(plans);
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user can create a new project
  const checkProjectAccess = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    setIsCheckingAccess(true);
    try {
      const canCreate = await subscriptionService.canCreateProject();
      return canCreate;
    } catch (error) {
      console.error('Error checking project access:', error);
      return false;
    } finally {
      setIsCheckingAccess(false);
    }
  }, [user?.id]);



  // Purchase credits
  const purchaseCredits = useCallback(async (credits: number): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const purchase = await subscriptionService.purchaseCredits(credits);
      if (purchase) {
        // Refresh credits data
        const updatedCredits = await subscriptionService.getUserCredits();
        setUserCredits(updatedCredits);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error purchasing credits:', error);
      return false;
    }
  }, [user?.id]);

  // Use credits
  const useCredits = useCallback(async (credits: number): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const success = await subscriptionService.useCredits(credits);
      if (success) {
        // Refresh credits data
        const updatedCredits = await subscriptionService.getUserCredits();
        setUserCredits(updatedCredits);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error using credits:', error);
      return false;
    }
  }, [user?.id]);

  // Refresh subscription data
  const refreshSubscription = useCallback(async () => {
    await loadSubscriptionData();
  }, []);

  // Check if user has access to a specific feature
  const hasFeatureAccess = useCallback(async (featureName: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      return await subscriptionService.hasFeatureAccess(featureName);
    } catch (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
  }, [user?.id]);

  // Check if user can currently use a feature (synchronous check)
  const canUseFeature = useCallback((featureName: string): boolean => {
    if (!subscriptionStatus) {
      // Free plan - check basic features
      return ['basic_clip_selection', 'basic_captions'].includes(featureName);
    }

    const features = subscriptionStatus.features.ai_features;
    return features.includes(featureName) || features.includes('all_features');
  }, [subscriptionStatus]);

  // Get current plan information
  const getCurrentPlan = useCallback((): SubscriptionPlan | null => {
    if (!availablePlans.length) return null;
    
    // If no subscription status, user is on free plan
    if (!subscriptionStatus) {
      return availablePlans.find(plan => plan.slug === 'free') || null;
    }
    
    // If subscription exists, find the plan by ID
    return availablePlans.find(plan => plan.id === subscriptionStatus.plan_id) || null;
  }, [subscriptionStatus, availablePlans]);

  // Check if user is on a specific plan
  const isOnPlan = useCallback((planSlug: PlanSlug): boolean => {
    if (!subscriptionStatus) {
      return planSlug === 'free';
    }
    
    const currentPlan = getCurrentPlan();
    return currentPlan?.slug === planSlug;
  }, [subscriptionStatus, getCurrentPlan]);

  // Get plan limit for videos
  const getPlanLimit = useCallback((limitType: 'videos'): number => {
    if (!subscriptionStatus) {
      // Free plan limits
      return 3;
    }

    return subscriptionStatus.videos_per_month;
  }, [subscriptionStatus]);

  // Get remaining limit for videos
  const getRemainingLimit = useCallback((limitType: 'videos'): number => {
    if (!subscriptionStatus) {
      // Free plan - calculate remaining based on current usage
      const used = currentUsage?.videos_used || 0;
      const limit = 3;
      return Math.max(0, limit - used);
    }

    return subscriptionStatus.videos_remaining;
  }, [subscriptionStatus, currentUsage]);

  // Get accurate remaining videos from database
  const getAccurateRemainingVideos = useCallback(async (): Promise<number> => {
    if (!user?.id) return 0;

    try {
      const { data, error } = await supabase
        .rpc('get_user_remaining_videos', { user_uuid: user.id });

      if (error) {
        console.error('Error getting accurate remaining videos:', error);
        // Fallback to old method
        return getRemainingLimit('videos');
      }

      if (data?.success) {
        return data.videos_remaining || 0;
      } else {
        console.error('Database function returned error:', data?.error);
        // Fallback to old method
        return getRemainingLimit('videos');
      }
    } catch (error) {
      console.error('Error calling get_user_remaining_videos:', error);
      // Fallback to old method
      return getRemainingLimit('videos');
    }
  }, [user?.id, getRemainingLimit]);

  // Track project creation (called from UploadPage)
  const trackProjectCreation = useCallback(async (projectId: string) => {
    if (!user?.id) return;

    try {
      await subscriptionService.trackProjectCreation(projectId);
      // Refresh usage data
      const usage = await subscriptionService.getCurrentPeriodUsage();
      setCurrentUsage(usage);
    } catch (error) {
      console.error('Error tracking project creation:', error);
    }
  }, [user?.id]);



  // Expose tracking functions for external use
  useEffect(() => {
    if (user?.id) {
      // Make tracking functions available globally for other components
      (window as any).trackProjectCreation = trackProjectCreation;
    }
  }, [user?.id, trackProjectCreation]);

  return {
    // Data
    subscriptionStatus,
    availablePlans,
    userCredits,
    currentUsage,
    
    // Loading states
    isLoading,
    isCheckingAccess,
    
    // Actions
    checkProjectAccess,
    purchaseCredits,
    useCredits,
    refreshSubscription,
    
    // Feature access
    hasFeatureAccess,
    canUseFeature,
    
    // Plan information
    getCurrentPlan,
    isOnPlan,
    getPlanLimit,
    getRemainingLimit,
    getAccurateRemainingVideos,
  };
};
