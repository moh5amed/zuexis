import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { subscriptionService } from '../services/subscriptionService';
import { SubscriptionStatus } from '../types/subscription';
import { Crown, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import SubscriptionPlanModal from './SubscriptionPlanModal';

interface SubscriptionGateProps {
  children: React.ReactNode;
  requireSubscription?: boolean;
}

const SubscriptionGate: React.FC<SubscriptionGateProps> = ({ 
  children, 
  requireSubscription = true 
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCheckedSubscription, setHasCheckedSubscription] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);

  useEffect(() => {
    console.log('🔍 [SubscriptionGate] useEffect triggered, user:', user?.id);
    if (user?.id) {
      checkSubscriptionStatus();
    } else {
      console.log('⚠️ [SubscriptionGate] No user ID, setting loading to false');
      setIsLoading(false);
      setHasCheckedSubscription(true);
    }
  }, [user?.id]);

  const checkSubscriptionStatus = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      console.log('🔍 [SubscriptionGate] Checking subscription for user:', user.id);
      
      // Set the current user in the subscription service
      subscriptionService.setCurrentUser(user.id);
      const status = await subscriptionService.getUserSubscriptionStatus();
      
      console.log('🔍 [SubscriptionGate] Subscription status result:', status);
      setSubscriptionStatus(status);
      setHasCheckedSubscription(true);
    } catch (error) {
      console.error('❌ [SubscriptionGate] Error checking subscription status:', error);
      // If there's an error checking subscription, assume free tier access
      // This prevents blocking new users due to database/function issues
      console.log('✅ [SubscriptionGate] Assuming free tier access due to error');
      setSubscriptionStatus(null);
      setHasCheckedSubscription(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSelected = async (planSlug: string) => {
    console.log(`✅ [SubscriptionGate] Plan selected: ${planSlug}`);
    // Refresh subscription status after plan selection
    await checkSubscriptionStatus();
  };

  // Show loading while checking subscription
  if (isLoading || !hasCheckedSubscription) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Checking subscription status...</p>
        </div>
      </div>
    );
  }

  // If no subscription required, show children
  if (!requireSubscription) {
    console.log('✅ [SubscriptionGate] Subscription not required, bypassing gate');
    return <>{children}</>;
  }

  // If user has no subscription, they get free tier access by default
  if (!subscriptionStatus) {
    console.log('✅ [SubscriptionGate] No subscription found, granting free tier access');
    console.log('✅ [SubscriptionGate] User can access:', children);
    // New users get free tier access automatically
    return <>{children}</>;
  }

  console.log('🔍 [SubscriptionGate] User has subscription:', subscriptionStatus);
  console.log('🔍 [SubscriptionGate] Subscription status:', subscriptionStatus.status);
  console.log('🔍 [SubscriptionGate] Plan name:', subscriptionStatus.plan_name);

  // If subscription is expired or canceled, show upgrade message
  if (subscriptionStatus.status !== 'active') {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="mb-8">
            <AlertCircle className="h-20 w-20 text-red-400 mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-white mb-4">
              Subscription Required
            </h1>
            <p className="text-xl text-gray-400 mb-8">
              Your subscription has expired or been canceled. Please renew to continue.
            </p>
          </div>

          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Current Plan: {subscriptionStatus.plan_name}
            </h2>
            <p className="text-gray-400 mb-6">
              Status: <span className="text-red-400 capitalize">{subscriptionStatus.status}</span>
            </p>
            <p className="text-gray-400">
              Expired: {subscriptionStatus.current_period_end && !isNaN(new Date(subscriptionStatus.current_period_end).getTime()) 
                ? new Date(subscriptionStatus.current_period_end).toLocaleDateString() 
                : 'Invalid Date'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowPlanModal(true)}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105"
            >
              Renew Subscription
            </button>
            <button
              onClick={() => navigate('/billing')}
              className="px-8 py-4 bg-gray-700 hover:bg-gray-700 text-white font-semibold rounded-xl transition-all duration-200"
            >
              Manage Billing
            </button>
          </div>

          {/* Plan Selection Modal */}
          <SubscriptionPlanModal
            isOpen={showPlanModal}
            onClose={() => setShowPlanModal(false)}
            onPlanSelected={handlePlanSelected}
            />
        </div>
      </div>
    );
  }

  // If user has exceeded limits, show upgrade message
  if (subscriptionStatus.videos_remaining <= 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="mb-8">
            <Clock className="h-20 w-20 text-yellow-400 mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-white mb-4">
              Monthly Limit Reached
            </h1>
            <p className="text-xl text-gray-400 mb-8">
              You've used all your video credits for this month. Upgrade your plan or wait until next month.
            </p>
          </div>

          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Current Usage
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div>
                <p className="text-gray-400 mb-2">Videos Used:</p>
                <p className="text-2xl font-bold text-red-400">
                  {subscriptionStatus.videos_used} / {subscriptionStatus.videos_per_month}
                </p>
              </div>
              <div>
                <p className="text-gray-400 mb-2">Plan:</p>
                <p className="text-2xl font-bold text-white">
                  {subscriptionStatus.plan_name}
                </p>
              </div>
            </div>
            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-400 text-sm">
                Next billing cycle: {new Date(subscriptionStatus.current_period_end).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowPlanModal(true)}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105"
            >
              Upgrade Plan
            </button>
            <button
              onClick={() => navigate('/billing')}
              className="px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all duration-200"
            >
              Purchase Credits
            </button>
          </div>

          {/* Plan Selection Modal */}
          <SubscriptionPlanModal
            isOpen={showPlanModal}
            onClose={() => setShowPlanModal(false)}
            onPlanSelected={handlePlanSelected}
          />
        </div>
      </div>
    );
  }

  // User has valid subscription and usage remaining, show children
  return <>{children}</>;
};

export default SubscriptionGate;
