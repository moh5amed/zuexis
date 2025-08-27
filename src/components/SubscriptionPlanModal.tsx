import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Crown, Zap, Star, Building2, CheckCircle, CreditCard, AlertCircle } from 'lucide-react';
import { SubscriptionPlan, PLAN_SLUGS, PLAN_PRICES } from '../types/subscription';
import { useAuth } from '../contexts/AuthContext';
import { StripeCheckout } from './StripeCheckout';

interface SubscriptionPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanSelected: (planSlug: string) => void;
}

// Stripe Price IDs from our setup script
const STRIPE_PRICE_IDS = {
  [PLAN_SLUGS.CREATOR_LITE]: {
    monthly: 'price_1S02Fq4IQhLRbjJ8y81tuFEB',
    yearly: 'price_1S02Fq4IQhLRbjJ8y81tuFEB' // TODO: Add yearly price ID
  },
  [PLAN_SLUGS.CREATOR_PRO]: {
    monthly: 'price_1S02GX4IQhLRbjJ8JPsd3x95',
    yearly: 'price_1S02GX4IQhLRbjJ8JPsd3x95' // TODO: Add yearly price ID
  },
  [PLAN_SLUGS.AGENCY_STARTER]: {
    monthly: 'price_1S02HL4IQhLRbjJ8qAy6u8UF',
    yearly: 'price_1S02HL4IQhLRbjJ8qAy6u8UF' // TODO: Add yearly price ID
  }
};

const SubscriptionPlanModal: React.FC<SubscriptionPlanModalProps> = ({
  isOpen,
  onClose,
  onPlanSelected
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  const plans: SubscriptionPlan[] = [
    {
      id: 'free',
      name: 'Free',
      slug: 'free',
      price_monthly: 0,
      price_yearly: 0,
      videos_per_month: 1,

      features: {
        watermark: true,
        processing_priority: 'standard',
        export_quality: '1080p',
        ai_features: ['basic_processing'],
        templates: 5,
        support: 'community'
      },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'creator-lite',
      name: 'Creator Lite',
      slug: 'creator-lite',
      price_monthly: billingCycle === 'monthly' ? 1900 : 19000, // $19.00 or $190.00 in cents
      price_yearly: billingCycle === 'monthly' ? 1900 : 19000,
      videos_per_month: 10,

      features: {
        watermark: false,
        processing_priority: 'high',
        export_quality: '2K',
        ai_features: ['basic_processing', 'advanced_ai', 'analytics'],
        templates: 20,
        support: 'priority_email'
      },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'creator-pro',
      name: 'Pro+',
      slug: 'creator-pro',
      price_monthly: billingCycle === 'monthly' ? 4900 : 49000, // $49.00 or $490.00 in cents
      price_yearly: billingCycle === 'monthly' ? 4900 : 49000,
      videos_per_month: 50,

      features: {
        watermark: false,
        processing_priority: 'highest',
        export_quality: '4K',
        ai_features: ['basic_processing', 'advanced_ai', 'analytics', 'custom_branding', 'api_access'],
        templates: 100,
        support: 'priority_email'
      },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'agency-starter',
      name: 'Enterprise',
      slug: 'agency-starter',
      price_monthly: billingCycle === 'monthly' ? 9900 : 99000, // $99.00 or $990.00 in cents
      price_yearly: billingCycle === 'monthly' ? 9900 : 99000,
      videos_per_month: -1, // Unlimited

      features: {
        watermark: false,
        processing_priority: 'highest',
        export_quality: '4K',
        ai_features: ['basic_processing', 'advanced_ai', 'analytics', 'custom_branding', 'api_access', 'team_collaboration', 'white_label'],
        templates: 'unlimited',
        support: 'dedicated',
        team_seats: 5,
        white_label: true
      },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  // Helper function to get plan description
  const getPlanDescription = (planSlug: string): string => {
    switch (planSlug) {
      case 'free':
        return 'Perfect for getting started';
      case 'creator-lite':
        return 'Great for content creators';
      case 'creator-pro':
        return 'Professional content creation';
      case 'agency-starter':
        return 'For teams and enterprises';
      default:
        return '';
    }
  };

  // Helper function to get plan features list
  const getPlanFeaturesList = (plan: SubscriptionPlan): string[] => {
    const features: string[] = [];
    
    // Add video limits
    if (plan.videos_per_month === -1) {
      features.push('Unlimited videos per month');
    } else {
      features.push(`${plan.videos_per_month} videos per month`);
    }

    
    // Add AI features
    if (plan.features.ai_features.includes('advanced_ai')) {
      features.push('Advanced AI processing');
    } else {
      features.push('Basic AI processing');
    }
    
    // Add export quality
    features.push(`${plan.features.export_quality} export quality`);
    
    // Add support level
    if (plan.features.support === 'dedicated') {
      features.push('24/7 dedicated support');
    } else if (plan.features.support === 'priority_email') {
      features.push('Priority email support');
    } else {
      features.push('Community support');
    }
    
    // Add special features
    if (plan.features.white_label) {
      features.push('White-label options');
    }
    if (plan.features.team_seats) {
      features.push('Team collaboration');
    }
    if (plan.features.ai_features.includes('api_access')) {
      features.push('API access');
    }
    
    return features;
  };

  const handlePlanSelect = async (planSlug: string) => {
    if (!user?.id) {
      setError('User not authenticated. Please log in again.');
      return;
    }
    
    if (planSlug === 'free') {
      // Free plan - redirect to cloud storage setup
      setSuccess('Free plan selected! Redirecting to setup...');
      setTimeout(() => {
        onPlanSelected(planSlug);
        onClose();
        navigate('/cloud-storage-setup');
      }, 1500);
      return;
    }
    
    // Paid plan - show Stripe checkout
    setSelectedPlan(planSlug);
    setShowCheckoutModal(true);
  };

  const getPlanIcon = (planSlug: string) => {
    switch (planSlug) {
      case 'free':
        return <Star className="h-6 w-6 text-yellow-400" />;
      case 'creator-lite':
        return <Zap className="h-6 w-6 text-blue-400" />;
      case 'creator-pro':
        return <Crown className="h-6 w-6 text-purple-400" />;
      case 'agency-starter':
        return <Building2 className="h-6 w-6 text-green-400" />;
      default:
        return <Star className="h-6 w-6 text-gray-400" />;
    }
  };

  const getPlanColor = (planSlug: string) => {
    switch (planSlug) {
      case 'free':
        return 'border-yellow-500/30 bg-yellow-500/5';
      case 'creator-lite':
        return 'border-blue-500/30 bg-blue-500/5';
      case 'creator-pro':
        return 'border-purple-500/30 bg-purple-500/5';
      case 'agency-starter':
        return 'border-green-500/30 bg-green-500/5';
      default:
        return 'border-gray-500/30 bg-gray-500/5';
    }
  };

  const getStripePriceId = (planSlug: string) => {
    if (planSlug === 'free') return null;
    const planPrices = STRIPE_PRICE_IDS[planSlug as keyof typeof STRIPE_PRICE_IDS];
    if (!planPrices) return null;
    return billingCycle === 'monthly' ? planPrices.monthly : planPrices.yearly;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Choose Your Plan</h2>
              <p className="text-gray-400 mt-1">Select the perfect plan to start creating viral content</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors duration-200"
            >
              <X className="h-6 w-6 text-gray-400" />
            </button>
          </div>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center mt-6">
            <div className="bg-gray-800 rounded-lg p-1 flex">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  billingCycle === 'monthly'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  billingCycle === 'yearly'
                    ? 'bg-purple-600 text-white'
                    : 'text-white'
                }`}
              >
                Yearly
                <span className="ml-2 px-2 py-1 bg-green-600 text-xs rounded-full">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <span className="text-red-400">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mx-6 mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span className="text-green-400">{success}</span>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.slug}
                className={`relative rounded-xl border-2 p-6 transition-all duration-200 hover:scale-105 cursor-pointer ${
                  selectedPlan === plan.slug
                    ? 'border-purple-500 bg-purple-500/10'
                    : getPlanColor(plan.slug)
                }`}
                onClick={() => setSelectedPlan(plan.slug)}
              >
                {/* Popular Badge */}
                {plan.slug === 'creator-pro' && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-3">
                    {getPlanIcon(plan.slug)}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-gray-400 text-sm mb-4">{getPlanDescription(plan.slug)}</p>
                  
                  {/* Price */}
                  <div className="mb-2">
                    {plan.price_monthly === 0 ? (
                      <span className="text-3xl font-bold text-white">Free</span>
                    ) : (
                      <div>
                        <span className="text-3xl font-bold text-white">
                          ${billingCycle === 'monthly' ? plan.price_monthly / 100 : plan.price_yearly / 100}
                        </span>
                        <span className="text-gray-400 ml-1">
                          /{billingCycle === 'monthly' ? 'mo' : 'year'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6">
                  {getPlanFeaturesList(plan).map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Select Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlanSelect(plan.slug);
                  }}
                  disabled={isLoading}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                    selectedPlan === plan.slug
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span className="ml-2">Processing...</span>
                    </div>
                  ) : (
                    selectedPlan === plan.slug ? 'Selected' : 'Choose Plan'
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 bg-gray-800/50">
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-3">
              Start creating viral content immediately after selecting your plan.
            </p>
            <div className="flex items-center justify-center gap-2 text-gray-400 text-xs">
              <CreditCard className="h-4 w-4" />
              <span>Secure payment processing</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stripe Checkout Modal */}
      {showCheckoutModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Complete Your Subscription</h3>
                <button
                  onClick={() => setShowCheckoutModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <StripeCheckout
                priceId={getStripePriceId(selectedPlan) || ''}
                planName={plans.find(p => p.slug === selectedPlan)?.name || ''}
                planPrice={`$${billingCycle === 'monthly' ? 
                  (plans.find(p => p.slug === selectedPlan)?.price_monthly || 0) / 100 : 
                  (plans.find(p => p.slug === selectedPlan)?.price_yearly || 0) / 100}`}
                planFeatures={getPlanFeaturesList(plans.find(p => p.slug === selectedPlan) || plans[0])}
                onSuccess={() => {
                  setShowCheckoutModal(false);
                  setSuccess(`Successfully subscribed to ${selectedPlan}! You can now start creating content.`);
                  setTimeout(() => {
                    onPlanSelected(selectedPlan);
                    onClose();
                  }, 1500);
                }}
                onCancel={() => setShowCheckoutModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPlanModal;
