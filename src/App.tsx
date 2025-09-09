/* eslint-disable @typescript-eslint/no-unused-vars */
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/UploadPage';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import SimpleProjectPage from './pages/SimpleProjectPage';
import SettingsPage from './pages/SettingsPage';
import ProjectsPage from './pages/ProjectsPage';
import AICaptionsPage from './pages/AICaptionsPage';
import BillingPage from './pages/BillingPage';
import PricingPage from './pages/PricingPage';
import NotFoundPage from './pages/NotFoundPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancelled from './pages/PaymentCancelled';
import AuthCallback from './pages/AuthCallback';
import CloudStorageSetupPage from './pages/CloudStorageSetupPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import { ToastProvider } from './components/ToastProvider';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SubscriptionGate from './components/SubscriptionGate';
import ConfigWarning from './components/ConfigWarning';
import { isSupabaseConfigured } from './lib/supabaseClient';

function App() {
  const isConfigured = isSupabaseConfigured();

  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <div className="min-h-screen bg-gray-900 text-white page-enter overflow-x-hidden" style={{ margin: 0, padding: 0 }}>
            {/* Show configuration warning if Supabase is not configured */}
            {!isConfigured && <ConfigWarning />}
            
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/terms" element={<TermsOfServicePage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <SubscriptionGate requireSubscription={false}>
                    <Dashboard />
                  </SubscriptionGate>
                </ProtectedRoute>
              } />
              <Route path="/upload" element={
                <ProtectedRoute>
                  <SubscriptionGate requireSubscription={false}>
                    <UploadPage />
                  </SubscriptionGate>
                </ProtectedRoute>
              } />
              <Route path="/projects" element={
                <ProtectedRoute>
                  <SubscriptionGate requireSubscription={false}>
                    <ProjectsPage />
                  </SubscriptionGate>
                </ProtectedRoute>
              } />
              <Route path="/captions" element={
                <ProtectedRoute>
                  <SubscriptionGate requireSubscription={false}>
                    <AICaptionsPage />
                  </SubscriptionGate>
                </ProtectedRoute>
              } />
              <Route path="/project/:id" element={
                <ProtectedRoute>
                  <SubscriptionGate requireSubscription={false}>
                    <SimpleProjectPage />
                  </SubscriptionGate>
                </ProtectedRoute>
              } />
              <Route path="/projects/:projectId" element={
                <ProtectedRoute>
                  <SubscriptionGate requireSubscription={false}>
                    <ProjectDetailsPage />
                  </SubscriptionGate>
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <SubscriptionGate requireSubscription={false}>
                    <SettingsPage />
                  </SubscriptionGate>
                </ProtectedRoute>
              } />
              <Route path="/billing" element={
                <ProtectedRoute>
                  <SubscriptionGate>
                    <BillingPage />
                  </SubscriptionGate>
                </ProtectedRoute>
              } />
              <Route path="/cloud-storage-setup" element={
                <ProtectedRoute>
                  <SubscriptionGate requireSubscription={false}>
                    <CloudStorageSetupPage />
                  </SubscriptionGate>
                </ProtectedRoute>
              } />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/payment-cancelled" element={<PaymentCancelled />} />
              
              {/* 404 Route */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
