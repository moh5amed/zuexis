import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            <Link 
              to="/" 
              className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Home</span>
            </Link>
          </div>
          <h1 className="text-3xl font-bold mt-4">Privacy Policy</h1>
          <p className="text-gray-400 mt-2">Effective Date: January 1, 2025</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="prose prose-invert max-w-none">
          <div className="bg-gray-800 rounded-lg p-8 space-y-8">
            
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
              <p className="text-gray-300 leading-relaxed">
                Zuexis ("we," "our," "us") respects your privacy. This Privacy Policy explains how we collect, 
                use, and protect your information when you use our service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We collect the following information when you use Zuexis:
              </p>
              <div className="text-gray-300 leading-relaxed space-y-2">
                <p><strong>Account Information:</strong> Email address and any details you provide when registering.</p>
                <p><strong>Payment Information:</strong> Payments are processed by Stripe. We do not store credit card details. Please see <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">Stripe's Privacy Policy</a>.</p>
                <p><strong>Uploaded Content:</strong> Videos, audio, and other media you upload for processing.</p>
                <p><strong>Usage Data:</strong> Information about how you interact with the service (e.g., pages visited, commands used).</p>
                <p><strong>Cookies/Analytics:</strong> Basic tracking for performance, analytics, and to improve the service.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Information</h2>
              <p className="text-gray-300 leading-relaxed mb-2">We use your information to:</p>
              <div className="text-gray-300 leading-relaxed space-y-2 ml-4">
                <p>• Provide and improve the Zuexis service.</p>
                <p>• Process payments and manage subscriptions.</p>
                <p>• Generate transcripts and video clips using AI.</p>
                <p>• Communicate with you (support, service updates).</p>
                <p>• Ensure security and prevent misuse.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">4. Data Ownership & Content Rights</h2>
              <div className="text-gray-300 leading-relaxed space-y-2">
                <p>• You retain ownership of any content you upload.</p>
                <p>• You grant Zuexis a limited license to temporarily process your content for the purpose of providing services.</p>
                <p>• We do not resell, publish, or use your content outside of providing the service.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">5. Sharing of Information</h2>
              <p className="text-gray-300 leading-relaxed mb-2">
                We do not sell or rent your personal information. We may share limited data with:
              </p>
              <div className="text-gray-300 leading-relaxed space-y-2 ml-4">
                <p>• Payment Processor (Stripe) for handling transactions.</p>
                <p>• Service Providers that help us operate the platform (e.g., hosting, analytics).</p>
                <p>• Legal Authorities if required by law.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">6. Data Security</h2>
              <p className="text-gray-300 leading-relaxed">
                We use industry-standard measures to protect your data. However, no method of transmission or storage is 100% secure, 
                and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">7. Data Retention</h2>
              <div className="text-gray-300 leading-relaxed space-y-2">
                <p>• Uploaded content is stored only as long as necessary to provide the service.</p>
                <p>• Account and subscription information is retained as long as your account is active.</p>
                <p>• You may request deletion of your data at any time by contacting us.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">8. Children's Privacy</h2>
              <p className="text-gray-300 leading-relaxed">
                Zuexis is not intended for use by children under 13. We do not knowingly collect data from minors.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">9. Your Rights</h2>
              <p className="text-gray-300 leading-relaxed mb-2">
                Depending on your jurisdiction (e.g., GDPR, CCPA), you may have rights to:
              </p>
              <div className="text-gray-300 leading-relaxed space-y-2 ml-4">
                <p>• Access the data we hold about you.</p>
                <p>• Request correction or deletion of your data.</p>
                <p>• Opt-out of certain tracking or data collection.</p>
              </div>
              <p className="text-gray-300 leading-relaxed mt-4">
                To exercise these rights, contact us at <a href="mailto:zuexisclips@gmail.com" className="text-purple-400 hover:text-purple-300">zuexisclips@gmail.com</a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">10. Changes to This Policy</h2>
              <p className="text-gray-300 leading-relaxed">
                We may update this Privacy Policy from time to time. If we make significant changes, we will notify users 
                via email or a notice on the website.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">11. Contact</h2>
              <p className="text-gray-300 leading-relaxed">
                For any questions regarding this Privacy Policy, please contact:
              </p>
              <div className="text-gray-300 leading-relaxed mt-2">
                <p>Zuexis</p>
                <p>Prospect Park, PA</p>
                <p>Email: <a href="mailto:zuexisclips@gmail.com" className="text-purple-400 hover:text-purple-300">zuexisclips@gmail.com</a></p>
              </div>
            </section>

          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-800 border-t border-gray-700 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="text-gray-400 text-sm">
              © 2025 Zuexis. All rights reserved.
            </div>
            <div className="flex space-x-6">
              <Link to="/privacy" className="text-gray-400 hover:text-purple-400 transition-colors text-sm">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-gray-400 hover:text-purple-400 transition-colors text-sm">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
