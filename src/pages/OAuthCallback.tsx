import React, { useEffect } from 'react';

const OAuthCallback: React.FC = () => {
  useEffect(() => {
    // Parse URL parameters for OAuth response
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    
    if (error) {
      console.error('OAuth Error:', error);
      // Send error to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_OAUTH_ERROR',
          error: error
        }, window.location.origin);
        window.close();
      }
      return;
    }
    
    if (!code) {
      console.error('No authorization code received from Google');
      // Send error to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_OAUTH_ERROR',
          error: 'No authorization code received'
        }, window.location.origin);
        window.close();
      }
      return;
    }
    
    // Send the authorization code to the parent window
    if (window.opener) {
      window.opener.postMessage({
        type: 'GOOGLE_OAUTH_CODE',
        code: code
      }, window.location.origin);
      
      // Close popup after sending message
      setTimeout(() => {
        window.close();
      }, 1000);
    } else {
      console.error('This page should be opened in a popup window');
    }
  }, []);

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      margin: 0,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(255, 255, 255, 0.3)',
          borderTop: '4px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem'
        }}></div>
        <h1 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: 600 }}>
          Connecting to Google Drive...
        </h1>
        <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.5 }}>
          Please wait while we complete your connection.
        </p>
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default OAuthCallback;
