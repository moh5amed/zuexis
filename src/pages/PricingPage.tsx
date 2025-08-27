import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Check, 
  X, 
  Star, 
  Zap, 
  Crown, 
  Building2, 
  CreditCard,
  Sparkles,
  ArrowRight,
  Shield,
  Clock,
  Users,
  Palette,
  BarChart3,
  Lock
} from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { PLAN_SLUGS, PLAN_PRICES } from '../types/subscription';
import { StripeCheckout } from '../components/StripeCheckout';

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

// Credits price IDs
const CREDITS_PRICE_IDS = {
  '100': 'price_1S02I34IQhLRbjJ8YS1oO0kK',
  '500': 'price_1S02JK4IQhLRbjJ8aXQMHffm',
  '1000': 'price_1S02I34IQhLRbjJ8YS1oO0kK' // TODO: Add 1000 credits price ID
};

const PricingPage: React.FC = () => {
  const { subscriptionStatus, availablePlans, userCredits, isLoading } = useSubscription();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [selectedCredits, setSelectedCredits] = useState<{amount: number, price: number} | null>(null);

  const currentPlanSlug = subscriptionStatus?.plan_slug || 'free';

  const plans = [
    {
      slug: PLAN_SLUGS.FREE,
      name: 'Free Plan',
      description: 'Perfect for getting started and testing the platform',
      icon: Star,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      features: [
        '3 videos per month',
        'Standard captions',
        'Standard aspect ratios (9:16, 16:9)',
        'Basic AI clip selection',
        'Community support',
        'Watermark on exports'
      ],
      limitations: [
        'Limited AI features',
        'Basic export quality (1080p)',
        'Standard processing speed'
      ],
      cta: 'Get Started Free',
      popular: false
    },
    {
      slug: PLAN_SLUGS.CREATOR_LITE,
      name: 'Creator Lite',
      description: 'Great for hobbyists and small creators',
      icon: Zap,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      features: [
        '8 videos per month',
        'Customizable captions (fonts/colors)',
        'All platform formats (TikTok, YouTube Shorts, Reels, LinkedIn)',
        'Smart AI clip selection',
        'Viral hashtag optimization',
        'Email support',
        'No watermark'
      ],
      limitations: [
        'Standard processing priority',
        '2K export quality'
      ],
      cta: 'Start Creator Lite',
      popular: false
    },
    {
      slug: PLAN_SLUGS.CREATOR_PRO,
      name: 'Creator Pro',
      description: 'Our most popular plan for serious creators',
      icon: Crown,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      features: [
        '20 videos per month',
        'Custom brand captions + logos',
        'Priority processing (faster renders)',
        'AI-optimized clips (engagement-aware)',
        'Viral-ready hashtags & descriptions',
        'Advanced analytics',
        '4K export quality',
        'Priority email support',
        'No watermark'
      ],
      limitations: [],
      cta: 'Start Creator Pro',
      popular: true
    },
    {
      slug: PLAN_SLUGS.AGENCY_STARTER,
      name: 'Agency Starter',
      description: 'For agencies and teams managing multiple clients',
      icon: Building2,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      features: [
        '50 videos per month',
        'Up to 5 team seats',
        'White-label exports (no Zuexis branding)',
        'Dedicated account support',
        'Bulk processing (multiple videos at once)',
        'Early access to new AI features',
        'Custom AI models',
        'Highest processing priority',
        '4K export quality',
        'No watermark'
      ],
      limitations: [],
      cta: 'Start Agency Starter',
      popular: false
    }
  ];

  const creditsPackages = [
    {
      name: '100 Credits',
      description: 'Perfect for occasional video processing',
      price: 10,
      credits: 100,
      features: [
        '100 video processing credits',
        'Valid for 1 year',
        'No monthly commitment',
        'Use on any tier including Free'
      ]
    },
    {
      name: '500 Credits',
      description: 'Great value for regular creators',
      price: 45,
      credits: 500,
      features: [
        '500 video processing credits',
        'Valid for 1 year',
        'No monthly commitment',
        'Use on any tier including Free'
      ]
    },
    {
      name: '1000 Credits',
      description: 'Best value for heavy users',
      price: 80,
      credits: 1000,
      features: [
        '1000 video processing credits',
        'Valid for 1 year',
        'No monthly commitment',
        'Use on any tier including Free'
      ]
    }
  ];

  const getPrice = (planSlug: string) => {
    const prices = PLAN_PRICES[planSlug as keyof typeof PLAN_PRICES];
    if (!prices) return { monthly: 0, yearly: 0 };
    
    return {
      monthly: billingCycle === 'monthly' ? prices.monthly : prices.yearly / 12,
      yearly: prices.yearly
    };
  };

  const getSavings = (planSlug: string) => {
    const prices = PLAN_PRICES[planSlug as keyof typeof PLAN_PRICES];
    if (!prices || prices.monthly === 0) return 0;
    
    const yearlyTotal = prices.monthly * 12;
    const yearlyPrice = prices.yearly;
    return Math.round(((yearlyTotal - yearlyPrice) / yearlyTotal) * 100);
  };

  const handlePlanSelect = (planSlug: string) => {
    if (planSlug === PLAN_SLUGS.FREE) {
      // Redirect to upload page for free plan
      window.location.href = '/upload';
      return;
    }
    
    setSelectedPlan(planSlug);
    setShowCheckoutModal(true);
  };

  const handleCreditsSelect = (credits: {amount: number, price: number}) => {
    setSelectedCredits(credits);
    setShowCreditsModal(true);
  };

  const getStripePriceId = (planSlug: string) => {
    const planPrices = STRIPE_PRICE_IDS[planSlug as keyof typeof STRIPE_PRICE_IDS];
    if (!planPrices) return null;
    
    return billingCycle === 'monthly' ? planPrices.monthly : planPrices.yearly;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pricing plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Start free and scale up as you grow. All plans include our core AI-powered video editing features.
            </p>
            
            {/* Billing Toggle */}
            <div className="mt-8 flex items-center justify-center space-x-4">
              <span className={`text-sm ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
                Monthly
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  billingCycle === 'yearly' ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
                Yearly
                {billingCycle === 'yearly' && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Save up to 17%
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {plans.map((plan) => {
            const IconComponent = plan.icon;
            const isCurrentPlan = currentPlanSlug === plan.slug;
            const prices = getPrice(plan.slug);
            const savings = getSavings(plan.slug);
            const stripePriceId = getStripePriceId(plan.slug);
            
            return (
              <div
                key={plan.slug}
                className={`relative rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl ${
                  plan.popular 
                    ? 'ring-2 ring-purple-500 scale-105' 
                    : 'hover:scale-105'
                } ${plan.bgColor} ${plan.borderColor} border`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-purple-600 text-white">
                      <Star className="w-4 h-4 mr-2" />
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan && (
                  <div className="absolute -top-4 right-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      Current Plan
                    </span>
                  </div>
                )}

                <div className="p-8">
                  {/* Plan Header */}
                  <div className="text-center mb-8">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${plan.color} mb-4`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <p className="text-gray-600 text-sm">{plan.description}</p>
                  </div>

                  {/* Pricing */}
                  <div className="text-center mb-8">
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold text-gray-900">
                        ${billingCycle === 'monthly' ? prices.monthly : Math.round(prices.yearly / 12)}
                      </span>
                      <span className="text-gray-500 ml-1">/month</span>
                    </div>
                    {billingCycle === 'yearly' && prices.yearly > 0 && (
                      <div className="mt-2">
                        <span className="text-sm text-gray-500">
                          ${prices.yearly} billed annually
                        </span>
                        {savings > 0 && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Save {savings}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-4 mb-8">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                    {plan.limitations.map((limitation, index) => (
                      <div key={index} className="flex items-start">
                        <X className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                        <span className="text-sm text-gray-500">{limitation}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handlePlanSelect(plan.slug)}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                      isCurrentPlan
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : plan.popular
                        ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl'
                        : `bg-gradient-to-r ${plan.color} text-white hover:shadow-lg`
                    }`}
                    disabled={isCurrentPlan}
                  >
                    {isCurrentPlan ? 'Current Plan' : plan.cta}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pay-As-You-Go Credits Section */}
        <div className="mt-16 bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 mb-4">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              🎟️ Pay-As-You-Go Credits
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Need just one more video? Don't upgrade your entire plan. Purchase credits that work on any tier.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {creditsPackages.map((package_, index) => (
              <div key={index} className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <div className="text-3xl font-bold text-blue-600 mb-2">${package_.price}</div>
                <div className="text-lg font-semibold text-gray-900 mb-2">{package_.credits} Credits</div>
                <div className="text-sm text-gray-600 mb-4">
                  = {package_.credits} extra videos OR {Math.floor(package_.credits / 2)} large videos with unlimited clips
                </div>
                <button 
                  onClick={() => handleCreditsSelect({amount: package_.credits, price: package_.price * 100})}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Buy Credits
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              💡 <strong>Pro Tip:</strong> Credits never expire and can be used on any tier, including Free!
            </p>
          </div>
        </div>

        {/* Feature Comparison */}
        <div className="mt-16 bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Feature Comparison
            </h2>
            <p className="text-gray-600">
              See exactly what each plan includes
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Feature</th>
                  <th className="text-center py-4 px-6 font-semibold text-blue-600">Free</th>
                  <th className="text-center py-4 px-6 font-semibold text-purple-600">Creator Lite</th>
                  <th className="text-center py-4 px-6 font-semibold text-orange-600">Creator Pro</th>
                  <th className="text-center py-4 px-6 font-semibold text-emerald-600">Agency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-4 px-6 font-medium text-gray-900">Videos per month</td>
                  <td className="text-center py-4 px-6">3</td>
                  <td className="text-center py-4 px-6">8</td>
                  <td className="text-center py-4 px-6">20</td>
                  <td className="text-center py-4 px-6">50</td>
                </tr>

                <tr>
                  <td className="py-4 px-6 font-medium text-gray-900">Watermark</td>
                  <td className="text-center py-4 px-6">Yes</td>
                  <td className="text-center py-4 px-6">No</td>
                  <td className="text-center py-4 px-6">No</td>
                  <td className="text-center py-4 px-6">No</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-gray-900">Export Quality</td>
                  <td className="text-center py-4 px-6">1080p</td>
                  <td className="text-center py-4 px-6">2K</td>
                  <td className="text-center py-4 px-6">4K</td>
                  <td className="text-center py-4 px-6">4K</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-gray-900">AI Features</td>
                  <td className="text-center py-4 px-6">Basic</td>
                  <td className="text-center py-4 px-6">Standard</td>
                  <td className="text-center py-4 px-6">Advanced</td>
                  <td className="text-center py-4 px-6">Premium</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-gray-900">Processing Priority</td>
                  <td className="text-center py-4 px-6">Standard</td>
                  <td className="text-center py-4 px-6">Standard</td>
                  <td className="text-center py-4 px-6">High</td>
                  <td className="text-center py-4 px-6">Highest</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-gray-900">Support</td>
                  <td className="text-center py-4 px-6">Community</td>
                  <td className="text-center py-4 px-6">Email</td>
                  <td className="text-center py-4 px-6">Priority</td>
                  <td className="text-center py-4 px-6">Dedicated</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I change plans anytime?
              </h3>
              <p className="text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Do credits expire?
              </h3>
              <p className="text-gray-600">
                No! Credits never expire and can be used on any tier, including the Free plan.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What happens if I exceed my limit?
              </h3>
              <p className="text-gray-600">
                You can purchase credits to continue creating, or upgrade your plan for more capacity.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600">
                The Free plan is your trial! Create 3 videos per month to experience the platform.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-8 text-white">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Create Viral Content?
            </h2>
            <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
              Join thousands of creators who are already using AI to turn their videos into viral clips.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/upload"
                className="inline-flex items-center px-8 py-4 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Start Creating Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <button className="inline-flex items-center px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-colors">
                View Demo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Checkout Modal */}
      {showCheckoutModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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
                planPrice={`$${billingCycle === 'monthly' ? getPrice(selectedPlan).monthly : Math.round(getPrice(selectedPlan).yearly / 12)}`}
                planFeatures={plans.find(p => p.slug === selectedPlan)?.features || []}
                onSuccess={() => {
                  setShowCheckoutModal(false);
                  // Optionally redirect to success page or show success message
                }}
                onCancel={() => setShowCheckoutModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Credits Checkout Modal */}
      {showCreditsModal && selectedCredits && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Purchase Credits</h3>
                <button
                  onClick={() => setShowCreditsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <StripeCheckout
                variant="credits"
                creditsAmount={selectedCredits.amount}
                amount={selectedCredits.price}
                planName={`${selectedCredits.amount} Credits`}
                planPrice={`$${selectedCredits.price / 100}`}
                planFeatures={[
                  `${selectedCredits.amount} video processing credits`,
                  'Valid for 1 year',
                  'No monthly commitment',
                  'Use on any tier including Free'
                ]}
                onSuccess={() => {
                  setShowCreditsModal(false);
                  // Optionally redirect to success page or show success message
                }}
                onCancel={() => setShowCreditsModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingPage;
