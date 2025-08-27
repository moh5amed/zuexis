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
      console.error('Error fetching subscription plans:', error);
      throw error;
    }
  }

  // Get user's current subscription status
  async getUserSubscriptionStatus(): Promise<SubscriptionStatus | null> {
    if (!this.currentUserId) throw new Error('User not authenticated');

    try {
      console.log('🔍 [SubscriptionService] Checking subscription for user:', this.currentUserId);
      
      // Try to use the database function first
      const { data: functionData, error: functionError } = await supabase
        .rpc('get_user_subscription_status', { user_uuid: this.currentUserId });

      if (!functionError && functionData && Object.keys(functionData).length > 0) {
        console.log('✅ [SubscriptionService] Database function returned data:', functionData);
        
        // Convert the database function response to our interface
        const status: SubscriptionStatus = {
          id: 'temp-id', // Database function doesn't return this
          plan_slug: functionData.plan_slug || 'unknown',
          plan_name: functionData.plan_name || 'Unknown Plan',
          status: functionData.status || 'unknown',
          current_period_start: functionData.current_period_start || new Date().toISOString(),
          current_period_end: functionData.current_period_end || new Date().toISOString(),
          videos_per_month: functionData.videos_per_month || 0,
          videos_used: functionData.videos_used || 0,
          videos_remaining: functionData.videos_remaining || 0,
          features: functionData.features || { ai_features: [] }
        };

        return status;
      }

      // If database function fails, try direct table query as fallback
      console.log('⚠️ [SubscriptionService] Database function failed, trying direct query...');
      
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .select(`
          id,
          status,
          current_period_start,
          current_period_end,
          subscription_plans (
            slug,
            name,
            videos_per_month,
            features
          )
        `)
        .eq('user_id', this.currentUserId)
        .eq('status', 'active')
        .single();

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        console.warn('⚠️ [SubscriptionService] Error fetching subscription:', subscriptionError);
      }

      if (subscriptionData) {
        console.log('✅ [SubscriptionService] Found active subscription via direct query:', subscriptionData);
        
        // Create a SubscriptionStatus object from the data
        const status: SubscriptionStatus = {
          id: subscriptionData.id,
          plan_slug: subscriptionData.subscription_plans?.slug || 'unknown',
          plan_name: subscriptionData.subscription_plans?.name || 'Unknown Plan',
          status: subscriptionData.status,
          current_period_start: subscriptionData.current_period_start,
          current_period_end: subscriptionData.current_period_end,
          videos_per_month: subscriptionData.subscription_plans?.videos_per_month || 0,
          videos_used: 0, // We'll calculate this separately
          videos_remaining: subscriptionData.subscription_plans?.videos_per_month || 0,
          features: subscriptionData.subscription_plans?.features || { ai_features: [] }
        };

        // Calculate videos used for this period
        if (subscriptionData.current_period_start) {
          const periodStart = new Date(subscriptionData.current_period_start);
          const periodEnd = new Date(subscriptionData.current_period_end);
          const now = new Date();
          
          if (now >= periodStart && now <= periodEnd) {
            // Get usage for current period
            const { data: usageData } = await supabase
              .from('usage_tracking')
              .select('videos_used')
              .eq('user_id', this.currentUserId)
              .gte('period_start', periodStart.toISOString().split('T')[0])
              .lte('period_end', periodEnd.toISOString().split('T')[0])
              .single();

            if (usageData) {
              status.videos_used = usageData.videos_used || 0;
              status.videos_remaining = Math.max(0, status.videos_per_month - status.videos_used);
            }
          }
        }

        return status;
      }

      // No active subscription found - user is on free tier
      console.log('✅ [SubscriptionService] No active subscription found, user is on free tier');
      return null;

    } catch (error) {
      console.error('❌ [SubscriptionService] Error fetching user subscription status:', error);
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
      console.error('Error checking project creation permission:', error);
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
        console.error('Error checking current clips:', clipsError);
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
      console.error('Error checking clip creation permission:', error);
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
        console.error('Error fetching current usage:', fetchError);
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
        console.error('Error updating usage tracking:', usageError);
        return;
      }

      console.log(`✅ [SubscriptionService] Project creation tracked: ${newVideosUsed} videos used this month`);

      // Log feature usage
      await this.logFeatureUsage(FEATURE_NAMES.PROJECT_CREATION, {
        project_id: projectId,
        action: 'project_created',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error tracking project creation:', error);
    }
  }

  // Clip tracking removed - we only track videos now

  // Get user's available credits
  async getUserCredits(): Promise<UserCredits | null> {
    if (!this.currentUserId) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', this.currentUserId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user credits:', error);
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
      console.error('Error purchasing credits:', error);
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
      console.error('Error updating user credits:', error);
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
      console.error('Error using credits:', error);
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
      console.error('Error logging feature usage:', error);
    }
  }

  // Get user's usage statistics for current period
  async getCurrentPeriodUsage(): Promise<UsageTracking | null> {
    if (!this.currentUserId) throw new Error('User not authenticated');

    try {
      const currentPeriod = new Date();
      const periodStart = new Date(currentPeriod.getFullYear(), currentPeriod.getMonth(), 1);

      const { data, error } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', this.currentUserId)
        .eq('period_start', periodStart.toISOString().split('T')[0])
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching current period usage:', error);
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
      console.error('Error checking feature access:', error);
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
      console.error('Error getting plan comparison:', error);
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
        console.error('Error fetching subscription plan:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Error fetching subscription plan:', error);
      return null;
    }
  }

  /**
   * Manually assign a plan to a user (for testing/development)
   * In production, this would integrate with Stripe or another payment processor
   */
  async assignPlanToUser(userId: string, planSlug: string): Promise<boolean> {
    try {
      console.log(`🔧 [SubscriptionService] Assigning plan ${planSlug} to user ${userId}`);
      
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
        console.error('❌ [SubscriptionService] Error creating/updating subscription:', subscriptionError);
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
        console.error('❌ [SubscriptionService] Error creating usage tracking:', usageError);
        // Don't throw here as the subscription was created successfully
      }

      console.log(`✅ [SubscriptionService] Successfully assigned plan ${planSlug} to user ${userId}`);
      return true;
      
    } catch (error) {
      console.error('❌ [SubscriptionService] Error assigning plan:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();
