// Security Audit Utility
// This file helps identify potential security issues in development

export interface SecurityAuditResult {
  status: 'secure' | 'warning' | 'critical';
  issues: string[];
  recommendations: string[];
}

export const runSecurityAudit = (): SecurityAuditResult => {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let status: 'secure' | 'warning' | 'critical' = 'secure';

  // Check for required environment variables
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_FOCUSED_BACKEND_URL',
    'VITE_GEMINI_API_KEY',
    'VITE_OPENAI_API_KEY',
    'VITE_STRIPE_PUBLISHABLE_KEY'
  ];

  const missingRequired = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missingRequired.length > 0) {
    status = 'critical';
    issues.push(`Missing required environment variables: ${missingRequired.join(', ')}`);
    recommendations.push('Add all required environment variables to your .env.local file');
  }

  // Check for potential dev environment issues
  if (import.meta.env.DEV) {
    // Check if using default/placeholder values
    const placeholderPatterns = [
      'your_',
      'placeholder',
      'example',
      'test_key',
      'YOUR_'
    ];

    requiredVars.forEach(varName => {
      const value = import.meta.env[varName];
      if (value && placeholderPatterns.some(pattern => value.includes(pattern))) {
        status = status === 'critical' ? 'critical' : 'warning';
        issues.push(`${varName} appears to contain a placeholder value`);
        recommendations.push(`Replace placeholder value for ${varName} with your actual API key`);
      }
    });

    // Check for console.log in production builds
    if (import.meta.env.PROD) {
      recommendations.push('Ensure all console.log statements are removed or gated in production');
    }
  }

  // Check URL configurations
  const backendUrl = import.meta.env.VITE_FOCUSED_BACKEND_URL;
  if (backendUrl && backendUrl.includes('localhost')) {
    if (import.meta.env.PROD) {
      status = 'warning';
      issues.push('Backend URL points to localhost in production');
      recommendations.push('Update VITE_FOCUSED_BACKEND_URL to production URL');
    }
  }

  // Security best practices check
  if (status === 'secure') {
    recommendations.push(
      'Regularly rotate your API keys',
      'Monitor API usage and billing',
      'Use different keys for development and production',
      'Never commit .env.local to version control'
    );
  }

  return {
    status,
    issues,
    recommendations
  };
};

// Auto-run security audit in development
if (import.meta.env.DEV) {
  const audit = runSecurityAudit();
  
  console.group('🔒 Security Audit');
  
  if (audit.status === 'critical') {
    console.error('❌ Critical security issues found:');
    audit.issues.forEach(issue => console.error(`  • ${issue}`));
  } else if (audit.status === 'warning') {
    console.warn('⚠️ Security warnings:');
    audit.issues.forEach(issue => console.warn(`  • ${issue}`));
  } else {
    console.log('✅ No critical security issues detected');
  }
  
  if (audit.recommendations.length > 0) {
    console.log('💡 Recommendations:');
    audit.recommendations.forEach(rec => console.log(`  • ${rec}`));
  }
  
  console.groupEnd();
}
