import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  CreditCard, 
  CheckCircle, 
  AlertTriangle, 
  Star,
  Calendar,
  Receipt,
  Download,
  RefreshCw,
  Crown,
  Zap,
  Building2,
  Plus,
  X,
  Loader2,
  ExternalLink,
  Settings,
  Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { subscriptionService } from '../services/subscriptionService';
import { stripeService } from '../services/stripeService';
import SubscriptionPlanModal from './SubscriptionPlanModal';
import { Link } from 'react-router-dom';

interface BillingManagerProps {
  showHeader?: boolean;
  compact?: boolean;
}

const BillingManager: React.FC<BillingManagerProps> = ({ 
  showHeader = true, 
  compact = false 
}) => {
  const { user } = useAuth();
  const { 
    subscriptionStatus, 
    availablePlans, 
    userCredits, 
    currentUsage,
    isLoading,
    refreshSubscription,
    getCurrentPlan,
    isOnPlan
  } = useSubscription();

  // Handle missing subscription data gracefully
  const hasSubscriptionData = subscriptionStatus && Object.keys(subscriptionStatus).length > 0;
  const hasCreditsData = userCredits && userCredits.credits_remaining !== undefined;

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [isLoadingCustomerPortal, setIsLoadingCustomerPortal] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [isLoadingPaymentHistory, setIsLoadingPaymentHistory] = useState(false);

  // Mock payment method data - in production this would come from Stripe
  const [paymentMethods, setPaymentMethods] = useState([
    {
      id: 'pm_1',
      type: 'card',
      brand: 'visa',
      last4: '4242',
      expiryMonth: 12,
      expiryYear: 2026,
      isDefault: true
    }
  ]);

  // Mock billing history - in production this would come from your payment processor
  const [billingHistory] = useState([
    {
      id: 'inv_1',
      date: '2024-12-15',
      amount: 49.00,
      status: 'paid',
      description: 'Creator Pro - Monthly',
      downloadUrl: '#'
    },
    {
      id: 'inv_2',
      date: '2024-11-15',
      amount: 49.00,
      status: 'paid',
      description: 'Creator Pro - Monthly',
      downloadUrl: '#'
    },
    {
      id: 'inv_3',
      date: '2024-10-15',
      amount: 49.00,
      status: 'paid',
      description: 'Creator Pro - Monthly',
      downloadUrl: '#'
    }
  ]);

  const currentPlan = getCurrentPlan();

  // Debug logging for billing page
  useEffect(() => {
    console.log('[BillingManager] Subscription status:', subscriptionStatus);
    console.log('[BillingManager] Current plan:', currentPlan);
    console.log('[BillingManager] Has subscription data:', hasSubscriptionData);
    console.log('[BillingManager] Is loading:', isLoading);
  }, [subscriptionStatus, currentPlan, hasSubscriptionData, isLoading]);

  useEffect(() => {
    if (user) {
      stripeService.setCurrentUser(user.id);
      loadPaymentHistory();
      // Force refresh subscription data when billing page loads
      refreshSubscription();
    }
  }, [user, refreshSubscription]);

  const loadPaymentHistory = async () => {
    if (!user) return;
    
    setIsLoadingPaymentHistory(true);
    try {
      const history = await stripeService.getPaymentHistory();
      setPaymentHistory(history);
    } catch (error) {

    } finally {
      setIsLoadingPaymentHistory(false);
    }
  };

  const handlePlanChange = () => {
    setShowPlanModal(true);
  };

  const handlePlanSelected = async (planSlug: string) => {

    await refreshSubscription();
    setShowPlanModal(false);
  };

  const handleAddPaymentMethod = () => {
    setShowPaymentModal(true);
    // In production, this would open Stripe Elements or similar
  };

  const handleUpdatePaymentMethod = (methodId: string) => {

    // In production, this would update the payment method via Stripe
  };

  const handleDeletePaymentMethod = (methodId: string) => {
    setPaymentMethods(prev => prev.filter(method => method.id !== methodId));
  };

  const handleDownloadInvoice = (invoiceId: string) => {

    // In production, this would download the actual invoice
  };

  const handleManageSubscription = async () => {
    if (!user) return;
    
    setIsLoadingCustomerPortal(true);
    try {
      const portalUrl = await stripeService.getCustomerPortalUrl();
      if (portalUrl) {
        window.open(portalUrl, '_blank');
      } else {

      }
    } catch (error) {

    } finally {
      setIsLoadingCustomerPortal(false);
    }
  };

  const handleRefreshBilling = async () => {
    setIsUpdatingPlan(true);
    try {
      console.log('[BillingManager] Refreshing subscription data...');
      await refreshSubscription();
      console.log('[BillingManager] Subscription refresh completed');
    } catch (error) {
      console.error('[BillingManager] Error refreshing subscription:', error);
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const formatPrice = (price: number) => {
    return `$${(price / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPlanIcon = (planSlug?: string) => {
    switch (planSlug) {
      case 'free':
        return <Star className="h-5 w-5 text-yellow-400" />;
      case 'creator-lite':
        return <Zap className="h-5 w-5 text-blue-400" />;
      case 'creator-pro':
        return <Crown className="h-5 w-5 text-purple-400" />;
      case 'agency-starter':
        return <Building2 className="h-5 w-5 text-green-400" />;
      default:
        return <Star className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400';
      case 'canceled':
        return 'text-red-400';
      case 'past_due':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {showHeader && (
          <h2 className="text-xl sm:text-2xl font-bold flex items-center space-x-2">
            <CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />
            <span>Billing & Subscription</span>
          </h2>
        )}
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-400" />
          <p className="text-gray-400">Loading billing information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold flex items-center space-x-2">
            <CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />
            <span>Billing & Subscription</span>
          </h2>
          <button
            onClick={handleRefreshBilling}
            disabled={isUpdatingPlan}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Refresh billing info"
          >
            <RefreshCw className={`h-5 w-5 ${isUpdatingPlan ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {/* Current Subscription */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/20 border border-purple-500/20 rounded-lg p-4 sm:p-6">
        {/* Success Message for New Subscriptions */}
        {hasSubscriptionData && subscriptionStatus?.status === 'active' && (
          <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span className="text-green-300 text-sm font-medium">
                ✅ Subscription Active! You're now on the {currentPlan?.name || 'Premium'} plan.
              </span>
            </div>
          </div>
        )}

        {/* Manual Refresh Prompt */}
        {!hasSubscriptionData && (
          <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-5 w-5 text-blue-400" />
                <span className="text-blue-300 text-sm">
                  💡 If you just made a payment, click the refresh button above to update your subscription status.
                </span>
              </div>
              <button
                onClick={handleRefreshBilling}
                disabled={isUpdatingPlan}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
              >
                {isUpdatingPlan ? 'Refreshing...' : 'Refresh Now'}
              </button>
            </div>
          </div>
        )}

        {/* Debug Info - Remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-3 bg-gray-500/20 border border-gray-500/30 rounded-lg">
            <div className="text-gray-300 text-sm">
              <strong>Debug Info:</strong><br/>
              Has Subscription Data: {hasSubscriptionData ? 'Yes' : 'No'}<br/>
              Current Plan: {currentPlan?.name || 'None'}<br/>
              Plan Slug: {subscriptionStatus?.plan_slug || 'None'}<br/>
              Status: {subscriptionStatus?.status || 'None'}<br/>
              Is Loading: {isLoading ? 'Yes' : 'No'}
            </div>
          </div>
        )}
        
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              {getPlanIcon(currentPlan?.slug)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">
                {currentPlan?.name || 'Free Plan'}
              </h3>
                             <p className="text-gray-400 text-sm mb-2">
                 {currentPlan?.name === 'Free Plan' ? 'Basic features for getting started' :
                  currentPlan?.name === 'Creator Lite' ? 'Great for hobbyists and small creators' :
                  currentPlan?.name === 'Creator Pro' ? 'Our most popular plan for serious creators' :
                  currentPlan?.name === 'Agency Starter' ? 'For agencies and teams managing multiple clients' :
                  'Premium features and unlimited access'}
               </p>
              {hasSubscriptionData && subscriptionStatus?.status && (
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(subscriptionStatus.status)} bg-opacity-20`}>
                    {subscriptionStatus.status === 'active' ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </>
                    ) : subscriptionStatus.status === 'canceled' ? (
                      <>
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Canceled
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {subscriptionStatus.status}
                      </>
                    )}
                  </span>
                  {subscriptionStatus?.current_period_end && subscriptionStatus.current_period_end !== 'Invalid Date' && (
                    <span className="text-gray-400 text-xs">
                      Renews {formatDate(subscriptionStatus.current_period_end)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex space-x-2">
            {hasSubscriptionData && subscriptionStatus?.status === 'active' && (
              <button
                onClick={handleManageSubscription}
                disabled={isLoadingCustomerPortal}
                className="inline-flex items-center px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isLoadingCustomerPortal ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Settings className="w-4 h-4 mr-2" />
                )}
                Manage
              </button>
            )}
            <button
              onClick={handlePlanChange}
              className="inline-flex items-center px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Change Plan
            </button>
          </div>
        </div>

        {/* Usage Information */}
        {hasSubscriptionData && (
          <div className="mt-4 pt-4 border-t border-purple-500/20">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {subscriptionStatus?.videos_remaining || 0}
                </div>
                <div className="text-gray-400 text-sm">Videos Remaining</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {subscriptionStatus?.videos_used || 0}
                </div>
                <div className="text-gray-400 text-sm">Videos Used</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {subscriptionStatus?.videos_per_month || 0}
                </div>
                <div className="text-gray-400 text-sm">Monthly Limit</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Credits Section */}
      {hasCreditsData && (
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <CreditCard className="h-8 w-8 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  Available Credits
                </h3>
                <p className="text-gray-400 text-sm">
                  Use credits for extra videos or upgrade your plan
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-yellow-400">
                {userCredits?.credits_remaining || 0}
              </div>
              <div className="text-gray-400 text-sm">Credits</div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-yellow-500/20">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Total purchased: {userCredits?.total_credits_purchased || 0} credits
              </div>
              <Link
                to="/pricing"
                className="inline-flex items-center px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Buy More Credits
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Payment Methods */}
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Payment Methods</h3>
          <button
            onClick={handleAddPaymentMethod}
            className="inline-flex items-center px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Method
          </button>
        </div>
        
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <div key={method.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <CreditCard className="w-5 h-5 text-purple-400" />
                <div>
                  <div className="text-white font-medium">
                    {method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} •••• {method.last4}
                  </div>
                  <div className="text-gray-400 text-sm">
                    Expires {method.expiryMonth}/{method.expiryYear}
                  </div>
                </div>
                {method.isDefault && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Default
                  </span>
                )}
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => handleUpdatePaymentMethod(method.id)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title="Edit payment method"
                >
                  <Settings className="w-4 h-4" />
                </button>
                {!method.isDefault && (
                  <button
                    onClick={() => handleDeletePaymentMethod(method.id)}
                    className="p-2 text-red-400 hover:text-red-300 transition-colors"
                    title="Remove payment method"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Payment History</h3>
          <button
            onClick={loadPaymentHistory}
            disabled={isLoadingPaymentHistory}
            className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh payment history"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingPaymentHistory ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {isLoadingPaymentHistory ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-purple-400" />
            <p className="text-gray-400 text-sm">Loading payment history...</p>
          </div>
        ) : paymentHistory.length > 0 ? (
          <div className="space-y-3">
            {paymentHistory.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Receipt className="w-5 h-5 text-purple-400" />
                  <div>
                    <div className="text-white font-medium">
                      {payment.description || 'Payment'}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {formatDate(payment.created_at)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-white font-medium">
                      {formatPrice(payment.amount_paid)}
                    </div>
                    <div className={`text-sm ${
                      payment.status === 'completed' ? 'text-green-400' : 
                      payment.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDownloadInvoice(payment.id)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title="Download receipt"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No payment history yet</p>
            <p className="text-gray-500 text-sm">Your payment history will appear here</p>
          </div>
        )}
      </div>

      {/* Security & Privacy */}
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="w-6 h-6 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Security & Privacy</h3>
        </div>
        
        <div className="space-y-3 text-sm text-gray-400">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span>All payments are processed securely through Stripe</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span>Your payment information is encrypted and never stored on our servers</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span>PCI DSS compliant payment processing</span>
          </div>
        </div>

        {/* Legal Links */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4 text-sm">
            <Link
              to="/terms"
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              to="/privacy"
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>

      {/* Subscription Plan Modal */}
      <SubscriptionPlanModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        onPlanSelected={handlePlanSelected}
      />

      {/* Payment Method Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl max-w-md w-full p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Payment Method</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-400 mb-4">Payment method integration would go here</p>
              <p className="text-sm text-gray-500">
                In production, this would use Stripe Elements or similar payment processing
              </p>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingManager;

