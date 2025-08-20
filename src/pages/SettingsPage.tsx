import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  CreditCard, 
  Bell, 
  Palette, 
  Globe, 
  Save,
  CheckCircle,
  Cloud
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import CloudStorageManager from '../components/CloudStorageManager';

const SettingsPage = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('account');
  const [formData, setFormData] = useState({
    captionTone: 'professional',
    defaultPlatforms: ['tiktok', 'youtube', 'instagram'],
    language: 'en',
    notifications: {
      email: true,
      processing: true,
      analytics: false
    }
  });

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'cloud-storage', label: 'Cloud Storage', icon: Cloud },
    { id: 'captions', label: 'Caption Style', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'billing', label: 'Billing', icon: CreditCard }
  ];

  const tones = [
    { id: 'professional', label: 'Professional', example: 'Discover key insights from our latest marketing analysis.' },
    { id: 'casual', label: 'Casual', example: 'Check out these awesome marketing tips! 🔥' },
    { id: 'energetic', label: 'Energetic', example: 'MIND-BLOWING marketing secrets that will change EVERYTHING! 🚀✨' },
    { id: 'educational', label: 'Educational', example: 'Today we\'re breaking down the 3 pillars of effective marketing strategy.' }
  ];

  const platforms = [
    { id: 'tiktok', name: 'TikTok', color: 'bg-pink-500' },
    { id: 'youtube', name: 'YouTube Shorts', color: 'bg-red-500' },
    { id: 'instagram', name: 'Instagram Reels', color: 'bg-purple-500' },
    { id: 'twitter', name: 'Twitter/X', color: 'bg-blue-500' },
    { id: 'linkedin', name: 'LinkedIn', color: 'bg-blue-600' }
  ];

  const handlePlatformToggle = (platformId: string) => {
    setFormData(prev => ({
      ...prev,
      defaultPlatforms: prev.defaultPlatforms.includes(platformId)
        ? prev.defaultPlatforms.filter(id => id !== platformId)
        : [...prev.defaultPlatforms, platformId]
    }));
  };

  const handleNotificationToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [type]: !prev.notifications[type as keyof typeof prev.notifications]
      }
    }));
  };

  const handleSave = () => {
    console.log('Saving settings:', formData);
    // Handle save logic
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Sidebar />
      
      <main className="md:ml-64 p-6 pt-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Settings</h1>
            <p className="text-gray-400 text-sm sm:text-base">Manage your preferences and default settings</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <nav className="space-y-2">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-all duration-200 text-sm sm:text-base ${
                      activeTab === tab.id
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <tab.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              <div className="bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-700">
                {/* Account Settings */}
                {activeTab === 'account' && (
                  <div className="space-y-4 sm:gap-6">
                    <h2 className="text-xl sm:text-2xl font-bold flex items-center space-x-2">
                      <User className="h-5 w-5 sm:h-6 sm:w-6" />
                      <span>Account Information</span>
                    </h2>
                    <p className="text-sm text-gray-400 mb-4">Your account information is managed by Supabase and cannot be edited here.</p>

                    {loading ? (
                      <div className="space-y-4">
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
                          <div className="h-10 bg-gray-700 rounded"></div>
                        </div>
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
                          <div className="h-10 bg-gray-700 rounded"></div>
                        </div>
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
                          <div className="h-10 bg-gray-700 rounded"></div>
                        </div>
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
                          <div className="h-10 bg-gray-700 rounded"></div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                          <div>
                            <label className="block text-sm font-medium mb-2">Full Name</label>
                            <div className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-300 text-sm sm:text-base">
                              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'N/A'}
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-2">Email Address</label>
                            <div className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-300 text-sm sm:text-base">
                              {user?.email || 'N/A'}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                          <div>
                            <label className="block text-sm font-medium mb-2">User ID</label>
                            <div className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-300 text-sm sm:text-base font-mono">
                              {user?.id || 'N/A'}
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-2">Account Created</label>
                            <div className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-300 text-sm sm:text-base">
                              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Cloud Storage Settings */}
                {activeTab === 'cloud-storage' && (
                  <CloudStorageManager />
                )}

                {/* Caption Style Settings */}
                {activeTab === 'captions' && (
                  <div className="space-y-4 sm:space-y-6">
                    <h2 className="text-xl sm:text-2xl font-bold flex items-center space-x-2">
                      <Palette className="h-5 w-5 sm:h-6 sm:w-6" />
                      <span>Caption Style</span>
                    </h2>

                    <div>
                      <label className="block text-sm font-medium mb-3 sm:mb-4">Default Caption Tone</label>
                      <div className="space-y-3">
                        {tones.map(tone => (
                          <div
                            key={tone.id}
                            className={`p-3 sm:p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                              formData.captionTone === tone.id
                                ? 'border-purple-500 bg-purple-500/10'
                                : 'border-gray-600 hover:border-gray-500'
                            }`}
                            onClick={() => setFormData({...formData, captionTone: tone.id})}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm sm:text-base">{tone.label}</span>
                              {formData.captionTone === tone.id && (
                                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
                              )}
                            </div>
                            <p className="text-gray-400 text-xs sm:text-sm">{tone.example}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-3 sm:mb-4">Default Platforms</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                        {platforms.map(platform => (
                          <button
                            key={platform.id}
                            onClick={() => handlePlatformToggle(platform.id)}
                            className={`p-3 sm:p-4 rounded-lg border text-center transition-all duration-200 ${
                              formData.defaultPlatforms.includes(platform.id)
                                ? 'border-purple-500 bg-purple-500/10'
                                : 'border-gray-600 hover:border-gray-500'
                            }`}
                          >
                            <div className={`w-6 h-6 sm:w-8 sm:h-8 ${platform.color} rounded-lg mx-auto mb-2`}></div>
                            <div className="text-xs sm:text-sm font-medium">{platform.name}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Default Language</label>
                      <select
                        value={formData.language}
                        onChange={(e) => setFormData({...formData, language: e.target.value})}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-200 text-white text-sm sm:text-base"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="it">Italian</option>
                        <option value="pt">Portuguese</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Notifications Settings */}
                {activeTab === 'notifications' && (
                  <div className="space-y-4 sm:space-y-6">
                    <h2 className="text-xl sm:text-2xl font-bold flex items-center space-x-2">
                      <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
                      <span>Notification Preferences</span>
                    </h2>

                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-700/50 rounded-lg">
                        <div>
                          <h3 className="font-medium text-sm sm:text-base">Email Notifications</h3>
                          <p className="text-xs sm:text-sm text-gray-400">Receive updates via email</p>
                        </div>
                        <button
                          onClick={() => handleNotificationToggle('email')}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            formData.notifications.email ? 'bg-purple-600' : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              formData.notifications.email ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-700/50 rounded-lg">
                        <div>
                          <h3 className="font-medium text-sm sm:text-base">Processing Notifications</h3>
                          <p className="text-xs sm:text-sm text-gray-400">Get notified when videos are processed</p>
                        </div>
                        <button
                          onClick={() => handleNotificationToggle('processing')}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            formData.notifications.processing ? 'bg-purple-600' : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              formData.notifications.processing ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-700/50 rounded-lg">
                        <div>
                          <h3 className="font-medium text-sm sm:text-base">Analytics Reports</h3>
                          <p className="text-xs sm:text-sm text-gray-400">Weekly performance summaries</p>
                        </div>
                        <button
                          onClick={() => handleNotificationToggle('analytics')}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            formData.notifications.analytics ? 'bg-purple-600' : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              formData.notifications.analytics ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Billing Settings */}
                {activeTab === 'billing' && (
                  <div className="space-y-4 sm:space-y-6">
                    <h2 className="text-xl sm:text-2xl font-bold flex items-center space-x-2">
                      <CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />
                      <span>Billing & Subscription</span>
                    </h2>

                    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 space-y-2 sm:space-y-0">
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold">Pro Plan</h3>
                          <p className="text-gray-400 text-sm sm:text-base">Unlimited videos and clips</p>
                        </div>
                        <div className="text-right">
                          <div className="text-xl sm:text-2xl font-bold">$29</div>
                          <div className="text-xs sm:text-sm text-gray-400">/month</div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                        <span className="text-xs sm:text-sm text-gray-400">Next billing date: January 15, 2025</span>
                        <button className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm font-medium">
                          Manage Subscription
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Payment Method</h3>
                      <div className="bg-gray-700/50 p-3 sm:p-4 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                        <div className="flex items-center space-x-3">
                          <div className="bg-gradient-to-r from-blue-500 to-purple-500 w-10 h-6 sm:w-12 sm:h-8 rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">VISA</span>
                          </div>
                          <div>
                            <div className="font-medium text-sm sm:text-base">•••• •••• •••• 4242</div>
                            <div className="text-xs sm:text-sm text-gray-400">Expires 12/26</div>
                          </div>
                        </div>
                        <button className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm font-medium">
                          Update
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Usage This Month</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <div className="bg-gray-700/50 p-3 sm:p-4 rounded-lg text-center">
                          <div className="text-xl sm:text-2xl font-bold">24</div>
                          <div className="text-xs sm:text-sm text-gray-400">Videos Processed</div>
                        </div>
                        <div className="bg-gray-700/50 p-3 sm:p-4 rounded-lg text-center">
                          <div className="text-xl sm:text-2xl font-bold">186</div>
                          <div className="text-xs sm:text-sm text-gray-400">Clips Generated</div>
                        </div>
                        <div className="bg-gray-700/50 p-3 sm:p-4 rounded-lg text-center">
                          <div className="text-xl sm:text-2xl font-bold">∞</div>
                          <div className="text-xs sm:text-sm text-gray-400">Unlimited</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-700 flex justify-end">
                  <button
                    onClick={handleSave}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center space-x-2 text-sm sm:text-base w-full sm:w-auto justify-center"
                  >
                    <Save className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>Save Preferences</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;