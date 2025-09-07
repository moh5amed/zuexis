import React from 'react';
import { Link } from 'react-router-dom';
import { XCircle, ArrowLeft, Home, CreditCard } from 'lucide-react';

const PaymentCancelled: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Cancelled Icon */}
        <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <XCircle className="w-16 h-16 text-red-600" />
        </div>

        {/* Cancelled Message */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Payment Cancelled
        </h1>
        
        <p className="text-lg text-gray-600 mb-8">
          No worries! Your payment was cancelled and you haven't been charged. You can try again anytime.
        </p>

        {/* Why Cancel? */}
        <div className="bg-orange-50 rounded-lg p-6 mb-8 text-left">
          <h3 className="text-lg font-semibold text-orange-900 mb-4">
            Common reasons for cancellation:
          </h3>
          <ul className="space-y-2 text-orange-800">
            <li className="flex items-center">
              <div className="w-2 h-2 bg-orange-400 rounded-full mr-3"></div>
              Changed your mind about the plan
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-orange-400 rounded-full mr-3"></div>
              Technical issues during checkout
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-orange-400 rounded-full mr-3"></div>
              Want to explore other options first
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-orange-400 rounded-full mr-3"></div>
              Need to check with your team
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/pricing"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <CreditCard className="w-5 h-5 mr-2" />
            Try Again
          </Link>
          
          <Link
            to="/upload"
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Home className="w-5 h-5 mr-2" />
            Continue with Free Plan
          </Link>
        </div>

        {/* Back Button */}
        <div className="mt-6">
          <Link
            to="/pricing"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Pricing
          </Link>
        </div>

        {/* Additional Info */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-2">
            Have questions about our plans or pricing?
          </p>
          <p className="text-sm text-gray-500">
            Contact our team at{' '}
            <a href="mailto:sales@zuexis.com" className="text-blue-600 hover:text-blue-800">
              sales@zuexis.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelled;

