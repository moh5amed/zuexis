import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Crown, 
  Star, 
  Zap, 
  Building2, 
  CreditCard, 
  AlertCircle,
  CheckCircle,
  ArrowRight,
  BarChart3,
  X
} from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { PLAN_SLUGS } from '../types/subscription';

const SubscriptionStatus: React.FC = () => {
  const { 
    subscriptionStatus, 
    userCredits, 
    currentUsage, 
    isLoading,
    getRemainingLimit,
    getAccurateRemainingVideos,
    isOnPlan 
  } = useSubscription();

  const [accurateVideosRemaining, setAccurateVideosRemaining] = useState<number | null>(null);
  const [isLoadingAccurate, setIsLoadingAccurate] = useState(false);

  // Load accurate remaining videos from database
  useEffect(() => {
    const loadAccurateData = async () => {
      if (!isLoading && getAccurateRemainingVideos) {
        setIsLoadingAccurate(true);
        try {
          const remaining = await getAccurateRemainingVideos();
          setAccurateVideosRemaining(remaining);
        } catch (error) {
          console.error('Error loading accurate remaining videos:', error);
          // Fallback to old method
          setAccurateVideosRemaining(getRemainingLimit('videos'));
        } finally {
          setIsLoadingAccurate(false);
        }
      }
    };

    loadAccurateData();
  }, [isLoading, getAccurateRemainingVideos, getRemainingLimit]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  const currentPlanSlug = subscriptionStatus?.plan_slug || 'free';
  const videosRemaining = accurateVideosRemaining !== null ? accurateVideosRemaining : getRemainingLimit('videos');
  const clipsRemaining = getRemainingLimit('clips');
  const isFreePlan = currentPlanSlug === 'free';

  const getPlanIcon = (planSlug: string) => {
    switch (planSlug) {
      case PLAN_SLUGS.FREE:
        return Star;
      case PLAN_SLUGS.CREATOR_LITE:
        return Zap;
      case PLAN_SLUGS.CREATOR_PRO:
        return Crown;
      case PLAN_SLUGS.AGENCY_STARTER:
        return Building2;
      default:
        return Star;
    }
  };

  const getPlanColor = (planSlug: string) => {
    switch (planSlug) {
      case PLAN_SLUGS.FREE:
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case PLAN_SLUGS.CREATOR_LITE:
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case PLAN_SLUGS.CREATOR_PRO:
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case PLAN_SLUGS.AGENCY_STARTER:
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getPlanName = (planSlug: string) => {
    switch (planSlug) {
      case PLAN_SLUGS.FREE:
        return 'Free Plan';
      case PLAN_SLUGS.CREATOR_LITE:
        return 'Creator Lite';
      case PLAN_SLUGS.CREATOR_PRO:
        return 'Creator Pro';
      case PLAN_SLUGS.AGENCY_STARTER:
        return 'Agency Starter';
      default:
        return 'Free Plan';
    }
  };

  const IconComponent = getPlanIcon(currentPlanSlug);
  const planColor = getPlanColor(currentPlanSlug);

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      {/* Plan Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${planColor}`}>
            <IconComponent className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {getPlanName(currentPlanSlug)}
            </h3>
            <p className="text-sm text-gray-500">
              {subscriptionStatus ? 'Active Subscription' : 'Free Plan'}
            </p>
          </div>
        </div>
        
        {!isFreePlan && (
          <Link
            to="/pricing"
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            Change Plan
            <ArrowRight className="ml-1 w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Videos Remaining */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Videos This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                {videosRemaining}
                <span className="text-sm font-normal text-gray-500 ml-1">
                  remaining
                </span>
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>
          
          {videosRemaining <= 2 && (
            <div className="mt-2 flex items-center text-sm">
              {videosRemaining === 0 ? (
                <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-500 mr-2" />
              )}
              <span className={videosRemaining === 0 ? 'text-red-600' : 'text-yellow-600'}>
                {videosRemaining === 0 
                  ? 'No videos remaining' 
                  : `${videosRemaining} video${videosRemaining === 1 ? '' : 's'} remaining`
                }
              </span>
            </div>
          )}
        </div>


      </div>

      {/* Credits Section */}
      {userCredits && userCredits.credits_remaining > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 mb-6 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CreditCard className="w-6 h-6 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Pay-As-You-Go Credits
                </p>
                <p className="text-lg font-bold text-yellow-900">
                  {userCredits.credits_remaining} credits remaining
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-yellow-700">
                Each credit = 1 extra video
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade CTA */}
      {isFreePlan && (
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 mb-6 border border-purple-200">
          <div className="text-center">
            <h4 className="text-lg font-semibold text-purple-900 mb-2">
              Ready to unlock more features?
            </h4>
            <p className="text-sm text-purple-700 mb-4">
              Upgrade to Creator Lite and get 8 videos/month, no watermark, and advanced AI features.
            </p>
            <Link
              to="/pricing"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              View Plans
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/upload"
          className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          Create New Project
        </Link>
        
        {videosRemaining === 0 && (
          <Link
            to="/pricing"
            className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Buy Credits
          </Link>
        )}
      </div>

      {/* Plan Features Preview */}
      {isFreePlan && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            What's included in your plan:
          </h4>
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <span>Basic AI clip selection</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <span>Standard captions</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <span>1080p export quality</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <X className="w-4 h-4 text-red-500 mr-2" />
              <span>Watermark on exports</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionStatus;
