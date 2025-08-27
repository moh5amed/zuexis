// Stripe Service for handling payments, subscriptions, and webhooks
import { supabase } from '../lib/supabaseClient';
import { loadStripe, Stripe } from '@stripe/stripe-js';

export interface StripeCheckoutOptions {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export interface StripeSubscriptionData {
  subscriptionId: string;
  customerId: string;
  status: string;
  currentPeriodEnd: number;
  planId: string;
}

export class StripeService {
  private stripe: Stripe | null = null;
  private currentUserId: string | null = null;

  constructor() {
    this.initializeStripe();
  }

  setCurrentUser(userId: string) {
    this.currentUserId = userId;
  }

  private async initializeStripe() {
    try {
      const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        console.error('❌ Stripe publishable key not found in environment variables');
        return;
      }
      
      this.stripe = await loadStripe(publishableKey);
      console.log('✅ Stripe initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Stripe:', error);
    }
  }

  // Create a checkout session for subscription
  async createCheckoutSession(options: StripeCheckoutOptions): Promise<string | null> {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    try {
      const requestBody = {
        priceId: options.priceId,
        successUrl: options.successUrl,
        cancelUrl: options.cancelUrl,
        customerEmail: options.customerEmail,
        metadata: {
          ...options.metadata,
          userId: this.currentUserId
        }
      };
      
      console.log('🔍 [stripeService] Sending request to Edge Function:', requestBody);
      console.log('🔍 [stripeService] Supabase URL:', supabase.supabaseUrl);
      console.log('🔍 [stripeService] Function name: create-checkout-session');

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: requestBody
      });

      if (error) {
        console.error('❌ [stripeService] Edge Function error:', error);
        throw error;
      }
      
      console.log('✅ [stripeService] Edge Function response:', data);
      return data?.sessionId || null;
    } catch (error) {
      console.error('❌ [stripeService] Error creating checkout session:', error);
      throw error;
    }
  }

  // Create a checkout session for one-time payment (credits)
  async createCreditsCheckoutSession(creditsAmount: number, amount: number): Promise<string | null> {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-credits-checkout-session', {
        body: {
          creditsAmount,
          amount,
          userId: this.currentUserId
        }
      });

      if (error) throw error;
      return data?.sessionId || null;
    } catch (error) {
      console.error('Error creating credits checkout session:', error);
      throw error;
    }
  }

  // Redirect to Stripe checkout
  async redirectToCheckout(sessionId: string): Promise<boolean> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      const { error } = await this.stripe.redirectToCheckout({
        sessionId
      });

      if (error) {
        console.error('Checkout redirect error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error redirecting to checkout:', error);
      return false;
    }
  }

  // Get customer portal URL for subscription management
  async getCustomerPortalUrl(): Promise<string | null> {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-customer-portal-session', {
        body: {
          userId: this.currentUserId
        }
      });

      if (error) throw error;
      return data?.url || null;
    } catch (error) {
      console.error('Error getting customer portal URL:', error);
      throw error;
    }
  }

  // Handle successful payment (called from webhook)
  async handleSuccessfulPayment(paymentIntentId: string, metadata: any): Promise<void> {
    try {
      // Update user credits if it's a credits purchase
      if (metadata.type === 'credits') {
        const { error } = await supabase
          .from('credit_purchases')
          .insert({
            user_id: metadata.userId,
            credits_purchased: metadata.creditsAmount,
            amount_paid: metadata.amount,
            stripe_payment_intent_id: paymentIntentId,
            status: 'completed'
          });

        if (error) throw error;

        // Update user credits
        const { error: updateError } = await supabase
          .rpc('add_user_credits', {
            user_uuid: metadata.userId,
            credits_to_add: metadata.creditsAmount
          });

        if (updateError) throw updateError;
      }

      // Update subscription if it's a subscription payment
      if (metadata.type === 'subscription') {
        // This will be handled by the subscription webhook
        console.log('Subscription payment handled by webhook');
      }
    } catch (error) {
      console.error('Error handling successful payment:', error);
      throw error;
    }
  }

  // Get payment history for user
  async getPaymentHistory(): Promise<any[]> {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    try {
      const { data, error } = await supabase
        .from('credit_purchases')
        .select('*')
        .eq('user_id', this.currentUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw error;
    }
  }

  // Cancel subscription
  async cancelSubscription(): Promise<boolean> {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: {
          userId: this.currentUserId
        }
      });

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  // Reactivate subscription
  async reactivateSubscription(): Promise<boolean> {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    try {
      const { data, error } = await supabase.functions.invoke('reactivate-subscription', {
        body: {
          userId: this.currentUserId
        }
      });

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      throw error;
    }
  }

  // Get subscription details
  async getSubscriptionDetails(): Promise<any> {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('user_id', this.currentUserId)
        .eq('status', 'active')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching subscription details:', error);
      throw error;
    }
  }

  // Check if user has active subscription
  async hasActiveSubscription(): Promise<boolean> {
    try {
      const subscription = await this.getSubscriptionDetails();
      return !!subscription && subscription.status === 'active';
    } catch (error) {
      return false;
    }
  }

  // Get upcoming invoice
  async getUpcomingInvoice(): Promise<any> {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    try {
      const { data, error } = await supabase.functions.invoke('get-upcoming-invoice', {
        body: {
          userId: this.currentUserId
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching upcoming invoice:', error);
      throw error;
    }
  }

  // Update payment method
  async updatePaymentMethod(paymentMethodId: string): Promise<boolean> {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }

    try {
      const { data, error } = await supabase.functions.invoke('update-payment-method', {
        body: {
          userId: this.currentUserId,
          paymentMethodId
        }
      });

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error('Error updating payment method:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const stripeService = new StripeService();

