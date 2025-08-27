import React from 'react';
import Sidebar from '../components/Sidebar';
import BillingManager from '../components/BillingManager';

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

          <div className="bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-700">
            <BillingManager showHeader={false} compact={false} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default BillingPage;


