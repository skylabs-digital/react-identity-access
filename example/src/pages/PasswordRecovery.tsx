import { useState } from 'react';
import { PasswordRecoveryForm, FeatureFlag } from '@skylabs-digital/react-identity-access';
import { useNavigate } from 'react-router';

function PasswordRecovery() {
  const [mode, setMode] = useState<'request' | 'reset'>('request');
  const navigate = useNavigate();

  const handleSuccess = () => {
    if (mode === 'reset') {
      // After successful password reset, redirect to login
      setTimeout(() => navigate('/login'), 2000);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  // Custom styling for the password recovery form
  const customStyles = {
    container: {
      marginTop: '2rem',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    },
    title: {
      color: '#1f2937',
      fontSize: '1.75rem',
    },
    button: {
      backgroundColor: '#f59e0b',
      fontSize: '1rem',
      padding: '0.875rem 1rem',
    },
  };

  // Custom copy for branding
  const customCopy = {
    title: mode === 'request' ? 'Forgot Password?' : 'Create New Password',
    subtitle:
      mode === 'request'
        ? "No worries! Enter your email and we'll send you reset instructions."
        : 'Enter your reset token and choose a new secure password.',
    submitButton: mode === 'request' ? 'Send Recovery Email' : 'Update Password',
    backToLoginLink: 'Back to Sign In',
    successMessage: 'Recovery email sent! Please check your inbox.',
    resetSuccessMessage: 'Password updated successfully! Redirecting to login...',
  };

  return (
    <div style={{ padding: '2rem 1rem', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Feature flag controlled security tip */}
      <FeatureFlag name="show_security_tips" fallback={null}>
        <div
          style={{
            textAlign: 'center',
            marginBottom: '2rem',
            padding: '1rem',
            backgroundColor: '#fef3c7',
            borderRadius: '8px',
            maxWidth: '400px',
            margin: '0 auto 2rem auto',
          }}
        >
          <h3 style={{ color: '#92400e', margin: 0 }}>🔒 Security Tip</h3>
          <p style={{ color: '#92400e', margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
            Choose a strong password with at least 8 characters, including numbers and symbols.
          </p>
        </div>
      </FeatureFlag>

      {/* Mode switcher */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: '2rem',
          maxWidth: '400px',
          margin: '0 auto 2rem auto',
        }}
      >
        <button
          onClick={() => setMode('request')}
          style={{
            marginRight: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: mode === 'request' ? '#f59e0b' : '#f3f4f6',
            color: mode === 'request' ? 'white' : '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Request Reset
        </button>
        <button
          onClick={() => setMode('reset')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: mode === 'reset' ? '#f59e0b' : '#f3f4f6',
            color: mode === 'reset' ? 'white' : '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          I Have Token
        </button>
      </div>

      <PasswordRecoveryForm
        mode={mode}
        copy={customCopy}
        styles={customStyles}
        onSuccess={handleSuccess}
        onBackToLogin={handleBackToLogin}
        onModeChange={setMode}
      />

      {/* Feature flag controlled contact support */}
      <FeatureFlag name="show_support_contact">
        <div
          style={{
            maxWidth: '400px',
            margin: '2rem auto',
            padding: '1rem',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            fontSize: '0.875rem',
            color: '#6b7280',
          }}
        >
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>Need Help?</h4>
          <p style={{ margin: '0 0 1rem 0' }}>
            If you're having trouble resetting your password, our support team is here to help.
          </p>
          <button
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            📧 Contact Support
          </button>
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
            Support contact controlled by "show_support_contact" feature flag
          </div>
        </div>
      </FeatureFlag>
    </div>
  );
}

export default PasswordRecovery;
