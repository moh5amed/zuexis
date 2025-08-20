import React from 'react';
import Sidebar from '../components/Sidebar';
import { CreditCard, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const BillingPage = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Sidebar />
      <main className="md:ml-64 p-6 pt-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold">Billing</h1>
            <p className="text-gray-400 text-sm sm:text-base">Manage your plan and payment methods</p>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div className="bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 space-y-2 sm:space-y-0">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">Current Plan</h2>
                  <p className="text-gray-400 text-xs sm:text-sm">Pro — Unlimited videos and clips</p>
                </div>
                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-bold">$29</div>
                  <div className="text-xs sm:text-sm text-gray-400">/month</div>
                </div>
              </div>
              <button className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm font-medium">Manage Subscription</button>
            </div>

            <div className="bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-700">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Payment Method</h2>
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
                <button className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm font-medium">Update</button>
              </div>
              <div className="mt-3 text-xs text-gray-400 flex items-center space-x-2">
                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400" />
                <span>We do not store card details. Payments are processed securely.</span>
              </div>
            </div>

            <div className="bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-700">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Usage This Month</h2>
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
        </div>
      </main>
    </div>
  );
};

export default BillingPage;


