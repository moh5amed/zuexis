import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { useUserOnboarding } from '../hooks/useUserOnboarding';
import { 
  Video, 
  TrendingUp, 
  BarChart3, 
  Crown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Zap,
  Star,
  Building2,
  CreditCard
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    subscriptionStatus, 
    currentUsage, 
    userCredits, 
    isLoading 
  } = useSubscription();
  const { shouldShowOnboarding, isLoading: onboardingLoading } = useUserOnboarding();

  const [recentProjects, setRecentProjects] = useState([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalClips: 0,
    totalViews: 0
  });

  useEffect(() => {
    // Load dashboard data
    loadDashboardData();
  }, []);

  useEffect(() => {
    // Redirect new users to cloud storage setup
    if (!onboardingLoading && shouldShowOnboarding) {
      console.log('🔄 [Dashboard] Redirecting to cloud storage setup - shouldShowOnboarding:', shouldShowOnboarding);
      // Add a small delay to ensure the onboarding status has time to update
      setTimeout(() => {
        navigate('/cloud-storage-setup', { replace: true });
      }, 100);
    }
  }, [shouldShowOnboarding, onboardingLoading, navigate]);

  const loadDashboardData = async () => {
    // TODO: Load recent projects and stats
    // This would integrate with your existing project service
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
        return 'from-yellow-500 to-yellow-600';
      case 'creator-lite':
        return 'from-blue-500 to-blue-600';
      case 'creator-pro':
        return 'from-purple-500 to-purple-600';
      case 'agency-starter':
        return 'from-green-500 to-green-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getUsagePercentage = (used: number, total: number) => {
    return Math.min((used / total) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (percentage >= 75) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    return 'text-green-400 bg-green-500/10 border-green-500/20';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Sidebar />
        <main className="md:ml-64 p-6 pt-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading dashboard...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Sidebar />
      <main className="md:ml-64 p-6 pt-6">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              Welcome back, {user?.user_metadata?.full_name || user?.email}!
            </h1>
            <p className="text-gray-400 text-lg">
              Ready to create some viral content?
            </p>
          </div>

          {/* Subscription Status Card - Always Show */}
          <div className="mb-8">
            <div className={`bg-gradient-to-r ${subscriptionStatus ? getPlanColor(subscriptionStatus.plan_slug) : 'from-yellow-500 to-yellow-600'} rounded-2xl p-6 border border-gray-700 shadow-lg`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  {subscriptionStatus ? getPlanIcon(subscriptionStatus.plan_slug) : getPlanIcon('free')}
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {subscriptionStatus ? subscriptionStatus.plan_name : 'Free Plan'}
                    </h2>
                    <p className="text-gray-200">
                      Status: <span className="capitalize">{subscriptionStatus ? subscriptionStatus.status : 'Active'}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {subscriptionStatus ? (
                    <>
                      <p className="text-gray-200 text-sm">Next billing cycle</p>
                      <p className="text-white font-semibold">
                        {subscriptionStatus.current_period_end && !isNaN(new Date(subscriptionStatus.current_period_end).getTime())
                          ? new Date(subscriptionStatus.current_period_end).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-200 text-sm">Free tier limit</p>
                      <p className="text-white font-semibold">3 videos/month</p>
                    </>
                  )}
                </div>
              </div>

              {/* Usage Progress Bars */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-200">Videos this month</span>
                    <span className="text-white font-semibold">
                      {subscriptionStatus ? subscriptionStatus.videos_used : (currentUsage?.videos_used || 0)} / {subscriptionStatus ? subscriptionStatus.videos_per_month : 3}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${
                        getUsagePercentage(subscriptionStatus ? subscriptionStatus.videos_used : (currentUsage?.videos_used || 0), subscriptionStatus ? subscriptionStatus.videos_per_month : 3) >= 90 
                          ? 'bg-red-500' 
                          : getUsagePercentage(subscriptionStatus ? subscriptionStatus.videos_used : (currentUsage?.videos_used || 0), subscriptionStatus ? subscriptionStatus.videos_per_month : 3) >= 75 
                          ? 'bg-yellow-500' 
                          : 'bg-green-500'
                      }`}
                      style={{ 
                        width: `${getUsagePercentage(subscriptionStatus ? subscriptionStatus.videos_used : (currentUsage?.videos_used || 0), subscriptionStatus ? subscriptionStatus.videos_per_month : 3)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full border ${getUsageColor(getUsagePercentage(subscriptionStatus ? subscriptionStatus.videos_used : (currentUsage?.videos_used || 0), subscriptionStatus ? subscriptionStatus.videos_per_month : 3))}`}>
                      {subscriptionStatus ? subscriptionStatus.videos_remaining : Math.max(0, 3 - (currentUsage?.videos_used || 0))} remaining
                    </span>
                    {(subscriptionStatus ? subscriptionStatus.videos_remaining : Math.max(0, 3 - (currentUsage?.videos_used || 0))) <= 0 && (
                      <span className="text-red-400 text-sm flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        Limit reached
                      </span>
                    )}
                  </div>
                </div>

                {/* Credits Display */}
                {userCredits && userCredits.credits_remaining > 0 && (
                  <div className="pt-4 border-t border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-200">Available Credits</span>
                      <span className="text-white font-semibold">{userCredits.credits_remaining}</span>
                    </div>
                    <p className="text-gray-400 text-sm">Use credits for extra videos or features</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mt-6">
                {(subscriptionStatus ? subscriptionStatus.videos_remaining : Math.max(0, 3 - (currentUsage?.videos_used || 0))) <= 0 ? (
                  <>
                    <Link
                      to="/pricing"
                      className="px-6 py-3 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-colors duration-200"
                    >
                      Upgrade Plan
                    </Link>
                    <Link
                      to="/billing"
                      className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-xl hover:bg-gray-600 transition-colors duration-200"
                    >
                      Purchase Credits
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/upload"
                      className="px-6 py-3 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-colors duration-200"
                    >
                      Create New Project
                    </Link>
                    <Link
                      to="/pricing"
                      className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-xl hover:bg-gray-600 transition-colors duration-200"
                    >
                      View Plans
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Usage Tracking Section */}
          <div className="mb-8">
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-400" />
                Usage Tracking
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Video Usage */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Video Processing</span>
                    <span className="text-white font-semibold">
                      {subscriptionStatus ? subscriptionStatus.videos_used : (currentUsage?.videos_used || 0)} / {subscriptionStatus ? subscriptionStatus.videos_per_month : 3}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        getUsagePercentage(subscriptionStatus ? subscriptionStatus.videos_used : (currentUsage?.videos_used || 0), subscriptionStatus ? subscriptionStatus.videos_per_month : 3) >= 90 
                          ? 'bg-red-500' 
                          : getUsagePercentage(subscriptionStatus ? subscriptionStatus.videos_used : (currentUsage?.videos_used || 0), subscriptionStatus ? subscriptionStatus.videos_per_month : 3) >= 75 
                          ? 'bg-yellow-500' 
                          : 'bg-green-500'
                      }`}
                      style={{ 
                        width: `${getUsagePercentage(subscriptionStatus ? subscriptionStatus.videos_used : (currentUsage?.videos_used || 0), subscriptionStatus ? subscriptionStatus.videos_per_month : 3)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className={`px-2 py-1 rounded-full border ${getUsageColor(getUsagePercentage(subscriptionStatus ? subscriptionStatus.videos_used : (currentUsage?.videos_used || 0), subscriptionStatus ? subscriptionStatus.videos_per_month : 3))}`}>
                      {subscriptionStatus ? subscriptionStatus.videos_remaining : Math.max(0, 3 - (currentUsage?.videos_used || 0))} remaining
                    </span>
                    <span className="text-gray-400">
                      {subscriptionStatus ? subscriptionStatus.plan_name : 'Free Plan'}
                    </span>
                  </div>
                </div>

                {/* Credits Display */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Available Credits</span>
                    <span className="text-white font-semibold">{userCredits?.credits_remaining || 0}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-yellow-500 transition-all duration-300"
                      style={{ 
                        width: `${Math.min((userCredits?.credits_remaining || 0) / 10 * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">
                      {userCredits?.credits_remaining || 0} credits available
                    </span>
                    {userCredits && userCredits.credits_remaining > 0 && (
                      <Link
                        to="/billing"
                        className="text-purple-400 hover:text-purple-300 text-xs"
                      >
                        Use Credits
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Usage Actions */}
              <div className="mt-6 pt-4 border-t border-gray-700 flex gap-3">
                <Link
                  to="/upload"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  Create Project
                </Link>
                <Link
                  to="/pricing"
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  Upgrade Plan
                </Link>
                <Link
                  to="/billing"
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  Buy Credits
                </Link>
                </div>
              </div>
            </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-500/20 rounded-xl">
                  <Video className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Projects</p>
                  <p className="text-2xl font-bold text-white">{stats.totalProjects}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Clips</p>
                  <p className="text-2xl font-bold text-white">{stats.totalClips}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-green-500/20 rounded-xl">
                  <BarChart3 className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Views</p>
                  <p className="text-2xl font-bold text-white">{stats.totalViews}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
              <Link
                to="/upload"
                  className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors duration-200"
                >
                  <Video className="h-5 w-5 text-purple-400" />
                  <span>Create New Project</span>
              </Link>
              <Link
                to="/projects"
                  className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors duration-200"
                >
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                  <span>View All Projects</span>
              </Link>
              <Link
                to="/captions"
                  className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors duration-200"
                >
                  <TrendingUp className="h-5 w-5 text-green-400" />
                  <span>AI Captions</span>
                </Link>
                  </div>
                </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">Account</h3>
              <div className="space-y-3">
                <Link
                  to="/settings"
                  className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors duration-200"
                >
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  <span>Account Settings</span>
                </Link>
                <Link
                  to="/billing"
                  className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors duration-200"
                >
                  <Crown className="h-5 w-5 text-purple-400" />
                  <span>Billing & Subscription</span>
                </Link>
                <Link
                  to="/pricing"
                  className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors duration-200"
                >
                  <Star className="h-5 w-5 text-yellow-400" />
                  <span>View Plans</span>
              </Link>
              </div>
              </div>
          </div>

            {/* Recent Projects */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Recent Projects</h3>
              <Link
                to="/projects"
                className="text-purple-400 hover:text-purple-300 transition-colors duration-200"
              >
                View All
              </Link>
            </div>

            {recentProjects.length > 0 ? (
              <div className="space-y-4">
                {/* Project items would go here */}
                <p className="text-gray-400 text-center py-8">
                  Recent projects will appear here
                </p>
                </div>
            ) : (
              <div className="text-center py-8">
                <Video className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No projects yet</p>
                <Link
                  to="/upload"
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors duration-200"
                >
                  Create Your First Project
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;