import React, { useState, useEffect } from 'react';
import { stripeService } from '../services/stripeService';
import { useAuth } from '../contexts/AuthContext';

interface StripeCheckoutProps {
  priceId: string;
  planName: string;
  planPrice: string;
  planFeatures: string[];
  onSuccess?: () => void;
  onCancel?: () => void;
  variant?: 'subscription' | 'credits';
  creditsAmount?: number;
  amount?: number;
}

export const StripeCheckout: React.FC<StripeCheckoutProps> = ({
  priceId,
  planName,
  planPrice,
  planFeatures,
  onSuccess,
  onCancel,
  variant = 'subscription',
  creditsAmount,
  amount
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      stripeService.setCurrentUser(user.id);
    }
  }, [user]);

  const handleCheckout = async () => {
    if (!user) {
      setError('Please log in to continue');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let sessionId: string | null = null;

      if (variant === 'credits' && creditsAmount && amount) {
        sessionId = await stripeService.createCreditsCheckoutSession(creditsAmount, amount);
      } else {
        sessionId = await stripeService.createCheckoutSession({
          priceId,
          successUrl: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/payment-cancelled`,
          customerEmail: user.email,
          metadata: {
            planName,
            type: variant
          }
        });
      }

      if (sessionId) {
        const success = await stripeService.redirectToCheckout(sessionId);
        if (success) {
          onSuccess?.();
        } else {
          setError('Failed to redirect to checkout');
        }
      } else {
        setError('Failed to create checkout session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during checkout');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{planName}</h3>
        <div className="text-4xl font-bold text-blue-600 mb-1">{planPrice}</div>
        {variant === 'subscription' && (
          <p className="text-gray-500 text-sm">per month</p>
        )}
        {variant === 'credits' && (
          <p className="text-gray-500 text-sm">one-time purchase</p>
        )}
      </div>

      <div className="mb-6">
        <ul className="space-y-3">
          {planFeatures.map((feature, index) => (
            <li key={index} className="flex items-center">
              <svg
                className="h-5 w-5 text-green-500 mr-3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7"></path>
              </svg>
              <span className="text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={handleCheckout}
          disabled={isLoading}
          className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </div>
          ) : (
            `Subscribe to ${planName}`
          )}
        </button>

        <button
          onClick={handleCancel}
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          Secure payment powered by Stripe. Your payment information is encrypted and secure.
        </p>
      </div>
    </div>
  );
};

export default StripeCheckout;

