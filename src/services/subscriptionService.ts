// Subscription Service for managing user subscriptions, usage tracking, and credits
import { supabase } from '../lib/supabaseClient';
import {
  SubscriptionPlan,
  UserSubscription,
  UsageTracking,
  UserCredits,
  CreditPurchase,
  SubscriptionStatus,
  PlanSlug,
  FEATURE_NAMES,
  CREDIT_VALUES,
  CREDIT_PRICE,
} from '../types/subscription';

export class SubscriptionService {
  private currentUserId: string | null = null;

  setCurrentUser(userId: string) {
    this.currentUserId = userId;
  }

  // Get all available subscription plans
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {

      throw error;
    }
  }

  // Get user's current subscription status
  async getUserSubscriptionStatus(): Promise<SubscriptionStatus | null> {
    if (!this.currentUserId) throw new Error('User not authenticated');

    try {
      // Ensure we have a valid session before making the request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('[SubscriptionService] No active session found for subscription status');
        return null;
      }

      // Try the database function first
      const { data: functionData, error: functionError } = await supabase
        .rpc('get_user_subscription_status', { user_uuid: this.currentUserId });

      if (!functionError && functionData && functionData.length > 0) {
        console.log('[SubscriptionService] Found subscription via function:', functionData[0]);
        
        // The function returns an array, get the first (and should be only) result
        const subscriptionData = functionData[0];
        
        // Convert the database function response to our interface
        const status: SubscriptionStatus = {
          id: 'subscription-' + this.currentUserId, // Generate a unique ID
          plan_id: subscriptionData.plan_id,
          plan_slug: subscriptionData.plan_slug || 'unknown',
          plan_name: subscriptionData.plan_name || 'Unknown Plan',
          status: subscriptionData.status || 'unknown',
          current_period_start: subscriptionData.current_period_start || new Date().toISOString(),
          current_period_end: subscriptionData.current_period_end || new Date().toISOString(),
          videos_per_month: subscriptionData.videos_per_month || 0,
          videos_used: subscriptionData.videos_used || 0,
          videos_remaining: subscriptionData.videos_remaining || 0,
          features: subscriptionData.features || { ai_features: [] }
        };

        return status;
      }

      // If database function fails, try direct query as fallback
      if (functionError) {
        console.warn('[SubscriptionService] Function failed, trying direct query:', functionError);
        
        const { data: directData, error: directError } = await supabase
          .from('user_subscriptions')
          .select(`
            id,
            status,
            current_period_start,
            current_period_end,
            subscription_plans!inner(
              id,
              name,
              slug,
              videos_per_month,
              clips_per_video,
              features
            )
          `)
          .eq('user_id', this.currentUserId)
          .eq('status', 'active')
          .gt('current_period_end', new Date().toISOString())
          .single();

        if (!directError && directData) {
          console.log('[SubscriptionService] Found subscription via direct query:', directData);
          
          // Get usage data
          const { data: usageData } = await supabase
            .from('usage_tracking')
            .select('videos_used, clips_used')
            .eq('user_id', this.currentUserId)
            .eq('period_start', new Date(directData.current_period_start).toISOString().split('T')[0])
            .single();

          const videosUsed = usageData?.videos_used || 0;
          const clipsUsed = usageData?.clips_used || 0;
          
          // subscription_plans is an array from the join, get the first element
          const planData = Array.isArray(directData.subscription_plans) 
            ? directData.subscription_plans[0] 
            : directData.subscription_plans;
            
          const videosPerMonth = planData?.videos_per_month || 0;
          const clipsPerVideo = planData?.clips_per_video || 0;

          const status: SubscriptionStatus = {
            id: directData.id,
            plan_id: planData?.id,
            plan_slug: planData?.slug || 'unknown',
            plan_name: planData?.name || 'Unknown Plan',
            status: directData.status,
            current_period_start: directData.current_period_start,
            current_period_end: directData.current_period_end,
            videos_per_month: videosPerMonth,
            videos_used: videosUsed,
            videos_remaining: Math.max(videosPerMonth - videosUsed, 0),
            features: planData?.features || { ai_features: [] }
          };

          return status;
        }
      }

      console.log('[SubscriptionService] No active subscription found, user is on free tier');
      return null;

    } catch (error) {
      console.error('[SubscriptionService] getUserSubscriptionStatus failed:', error);
      // Return null instead of throwing to allow free tier access
      return null;
    }
  }

  // Check if user can create a new project
  async canCreateProject(): Promise<boolean> {
    if (!this.currentUserId) return false;

    try {
      const { data, error } = await supabase
        .rpc('can_user_create_project', { user_uuid: this.currentUserId });

      if (error) throw error;
      return data || false;
    } catch (error) {

      return false;
    }
  }

  // Check if user can create more clips for a project (free tier validation)
  async canCreateClips(projectId: string): Promise<{ canCreate: boolean; currentClips: number; maxClips: number; message?: string }> {
    if (!this.currentUserId) return { canCreate: false, currentClips: 0, maxClips: 0, message: 'User not authenticated' };

    try {
      // Get user's subscription status
      const subscriptionStatus = await this.getUserSubscriptionStatus();
      
      // If user has a paid plan, they can create unlimited clips
      if (subscriptionStatus && subscriptionStatus.plan_slug !== 'free') {
        return { canCreate: true, currentClips: 0, maxClips: -1, message: 'Paid plan - unlimited clips' };
      }

      // For free tier, check current clips in this project
      const { data: clips, error: clipsError } = await supabase
        .from('video_clips')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', this.currentUserId);

      if (clipsError) {

        return { canCreate: false, currentClips: 0, maxClips: 3, message: 'Error checking clip count' };
      }

      const currentClips = clips?.length || 0;
      const maxClips = 3; // Free tier limit
      const canCreate = currentClips < maxClips;

      return {
        canCreate,
        currentClips,
        maxClips,
        message: canCreate 
          ? `Can create ${maxClips - currentClips} more clips` 
          : `Free tier limit reached: ${currentClips}/${maxClips} clips`
      };

    } catch (error) {

      return { canCreate: false, currentClips: 0, maxClips: 3, message: 'Error checking permissions' };
    }
  }

  // Track project creation usage (simplified - only videos, no clips)
  async trackProjectCreation(projectId: string): Promise<void> {
    if (!this.currentUserId) return;

    try {
      const currentPeriod = new Date();
      const periodStart = new Date(currentPeriod.getFullYear(), currentPeriod.getMonth(), 1);
      const periodEnd = new Date(currentPeriod.getFullYear(), currentPeriod.getMonth() + 1, 0);

      // Get current usage for this period
      const { data: currentUsage, error: fetchError } = await supabase
        .from('usage_tracking')
        .select('videos_used')
        .eq('user_id', this.currentUserId)
        .eq('period_start', periodStart.toISOString().split('T')[0])
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {

        return;
      }

      const currentVideosUsed = currentUsage?.videos_used || 0;
      const newVideosUsed = currentVideosUsed + 1;

      // Upsert usage tracking
      const { error: usageError } = await supabase
        .from('usage_tracking')
        .upsert({
          user_id: this.currentUserId,
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
          videos_used: newVideosUsed,
          clips_used: 0, // We don't track clips anymore
        }, {
          onConflict: 'user_id,period_start'
        });

      if (usageError) {

        return;
      }

      // Log feature usage
      await this.logFeatureUsage(FEATURE_NAMES.PROJECT_CREATION, {
        project_id: projectId,
        action: 'project_created',
        timestamp: new Date().toISOString()
      });

    } catch (error) {

    }
  }

  // Clip tracking removed - we only track videos now

  // Get user's available credits
  async getUserCredits(): Promise<UserCredits | null> {
    if (!this.currentUserId) throw new Error('User not authenticated');

    try {
      // Ensure we have a valid session before making the request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('[SubscriptionService] No active session found');
        return null;
      }

      const { data, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', this.currentUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[SubscriptionService] Error fetching user credits:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('[SubscriptionService] getUserCredits failed:', error);
      return null;
    }
  }

  // Purchase credits
  async purchaseCredits(creditsToPurchase: number): Promise<CreditPurchase | null> {
    if (!this.currentUserId) throw new Error('User not authenticated');

    try {
      const amountInCents = (creditsToPurchase / 2) * CREDIT_PRICE * 100; // $5 for 2 credits

      const { data, error } = await supabase
        .from('credit_purchases')
        .insert({
          user_id: this.currentUserId,
          credits_purchased: creditsToPurchase,
          amount_paid: amountInCents,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Update user credits
      await this.updateUserCredits(creditsToPurchase);

      return data;
    } catch (error) {

      throw error;
    }
  }

  // Update user credits after purchase
  private async updateUserCredits(creditsToAdd: number): Promise<void> {
    if (!this.currentUserId) return;

    try {
      const { data: existingCredits } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', this.currentUserId)
        .single();

      if (existingCredits) {
        // Update existing credits
        const { error } = await supabase
          .from('user_credits')
          .update({
            credits_remaining: existingCredits.credits_remaining + creditsToAdd,
            total_credits_purchased: existingCredits.total_credits_purchased + creditsToAdd,
            last_purchase_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', this.currentUserId);

        if (error) throw error;
      } else {
        // Create new credits record
        const { error } = await supabase
          .from('user_credits')
          .insert({
            user_id: this.currentUserId,
            credits_remaining: creditsToAdd,
            total_credits_purchased: creditsToAdd,
            last_purchase_date: new Date().toISOString()
          });

        if (error) throw error;
      }
    } catch (error) {

      throw error;
    }
  }

  // Use credits for extra videos or features
  async useCredits(creditsToUse: number): Promise<boolean> {
    if (!this.currentUserId) return false;

    try {
      const { data: userCredits } = await supabase
        .from('user_credits')
        .select('credits_remaining')
        .eq('user_id', this.currentUserId)
        .single();

      if (!userCredits || userCredits.credits_remaining < creditsToUse) {
        return false;
      }

      const { error } = await supabase
        .from('user_credits')
        .update({
          credits_remaining: userCredits.credits_remaining - creditsToUse,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', this.currentUserId);

      if (error) throw error;
      return true;
    } catch (error) {

      return false;
    }
  }

  // Log feature usage for analytics
  private async logFeatureUsage(featureName: string, usageData: Record<string, any>): Promise<void> {
    if (!this.currentUserId) return;

    try {
      const { error } = await supabase
        .from('feature_usage_log')
        .insert({
          user_id: this.currentUserId,
          feature_name: featureName,
          usage_data: usageData
        });

      if (error) throw error;
    } catch (error) {

    }
  }

  // Get user's usage statistics for current period
  async getCurrentPeriodUsage(): Promise<UsageTracking | null> {
    if (!this.currentUserId) throw new Error('User not authenticated');

    try {
      // Ensure we have a valid session before making the request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('[SubscriptionService] No active session found for usage tracking');
        return null;
      }

      const currentPeriod = new Date();
      const periodStart = new Date(currentPeriod.getFullYear(), currentPeriod.getMonth(), 1);

      const { data, error } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', this.currentUserId)
        .eq('period_start', periodStart.toISOString().split('T')[0])
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[SubscriptionService] Error fetching usage tracking:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('[SubscriptionService] getCurrentPeriodUsage failed:', error);
      return null;
    }
  }

  // Check if user has access to a specific feature
  async hasFeatureAccess(featureName: string): Promise<boolean> {
    try {
      const subscriptionStatus = await this.getUserSubscriptionStatus();
      
      if (!subscriptionStatus) {
        // Free plan - check basic features
        return ['basic_clip_selection', 'basic_captions'].includes(featureName);
      }

      const features = subscriptionStatus.features.ai_features;
      return features.includes(featureName) || features.includes('all_features');
    } catch (error) {

      return false;
    }
  }

  // Get plan comparison data for pricing page
  async getPlanComparison(): Promise<Record<string, any>[]> {
    try {
      const plans = await this.getSubscriptionPlans();
      
      const comparison = [
        {
          feature: 'Videos per month',
          free: plans.find(p => p.slug === 'free')?.videos_per_month || 0,
          creatorLite: plans.find(p => p.slug === 'creator-lite')?.videos_per_month || 0,
          creatorPro: plans.find(p => p.slug === 'creator-pro')?.videos_per_month || 0,
          agencyStarter: plans.find(p => p.slug === 'agency-starter')?.videos_per_month || 0,
        },

        {
          feature: 'Watermark',
          free: 'Yes',
          creatorLite: 'No',
          creatorPro: 'No',
          agencyStarter: 'No',
        },
        {
          feature: 'Export Quality',
          free: '1080p',
          creatorLite: '2K',
          creatorPro: '4K',
          agencyStarter: '4K',
        },
        {
          feature: 'AI Features',
          free: 'Basic',
          creatorLite: 'Standard',
          creatorPro: 'Advanced',
          agencyStarter: 'Premium',
        },
        {
          feature: 'Support',
          free: 'Community',
          creatorLite: 'Email',
          creatorPro: 'Priority',
          agencyStarter: 'Dedicated',
        },
      ];

      return comparison;
    } catch (error) {

      return [];
    }
  }

  // Get a specific subscription plan by slug
  async getSubscriptionPlan(planSlug: string): Promise<SubscriptionPlan | null> {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('slug', planSlug)
        .eq('is_active', true)
        .single();

      if (error) {

        return null;
      }
      return data;
    } catch (error) {

      return null;
    }
  }

  /**
   * Manually assign a plan to a user (for testing/development)
   * In production, this would integrate with Stripe or another payment processor
   */
  async assignPlanToUser(userId: string, planSlug: string): Promise<boolean> {
    try {

      // Get the plan details
      const plan = await this.getSubscriptionPlan(planSlug);
      if (!plan) {
        throw new Error(`Plan ${planSlug} not found`);
      }

      // Calculate billing dates
      const now = new Date();
      const currentPeriodStart = now.toISOString();
      const currentPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now

      // Check if user already has a subscription
      const { data: existingSubscription, error: checkError } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .single();

      let subscription;
      let subscriptionError;

      if (existingSubscription) {
        // Update existing subscription
        const { data, error } = await supabase
          .from('user_subscriptions')
          .update({
            plan_id: plan.id,
            status: 'active',
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .select()
          .single();
        
        subscription = data;
        subscriptionError = error;
      } else {
        // Create new subscription
        const { data, error } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            plan_id: plan.id,
            status: 'active',
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            cancel_at_period_end: false
          })
          .select()
          .single();
        
        subscription = data;
        subscriptionError = error;
      }

      if (subscriptionError) {

        throw new Error('Failed to create/update subscription');
      }

      // Initialize usage tracking
      const periodStart = new Date(currentPeriodStart).toISOString().split('T')[0]; // Get date part only
      const periodEnd = new Date(currentPeriodEnd).toISOString().split('T')[0]; // Get date part only
      
      const { error: usageError } = await supabase
        .from('usage_tracking')
        .upsert({
          user_id: userId,
          period_start: periodStart,
          period_end: periodEnd,
          videos_used: 0,
          clips_used: 0
        }, {
          onConflict: 'user_id,period_start'
        });

      if (usageError) {

        // Don't throw here as the subscription was created successfully
      }

      return true;
      
    } catch (error) {

      throw error;
    }
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();
