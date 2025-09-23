import { useState, useEffect } from 'react';
import { MagicLinkForm, FeatureFlag } from '@skylabs-digital/react-identity-access';
import { useNavigate } from 'react-router';

function MagicLink() {
  const navigate = useNavigate();
  const [magicLinkToken, setMagicLinkToken] = useState<string | null>(null);

  // Check for magic link token in URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      setMagicLinkToken(token);
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSuccess = () => {
    navigate('/dashboard');
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleSignupClick = () => {
    navigate('/signup');
  };

  // Custom copy for branding
  const customCopy = {
    title: '✨ Magic Link Access',
    description:
      'Enter your email to receive a secure login link. Works for both login and signup!',
    submitButton: 'Send Magic Link',
    successMessage: '🎉 Check your email! Click the link to access your account instantly.',
    loginText: 'Prefer using a password?',
    loginLink: 'Sign in with password',
    signupText: 'Want to create an account manually?',
    signupLink: 'Sign up with password',
  };

  return (
    <div style={{ padding: '2rem 1rem', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Feature flag controlled magic link intro */}
      <FeatureFlag name="magic_link_intro" fallback={null}>
        <div
          style={{
            textAlign: 'center',
            marginBottom: '2rem',
            padding: '1rem',
            backgroundColor: '#f0f9ff',
            borderRadius: '8px',
            maxWidth: '400px',
            margin: '0 auto 2rem auto',
          }}
        >
          <h3 style={{ color: '#0369a1', margin: 0 }}>🔗 Passwordless Authentication</h3>
          <p style={{ color: '#0369a1', margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
            The future of secure, hassle-free authentication.
          </p>
        </div>
      </FeatureFlag>

      <MagicLinkForm
        copy={customCopy}
        verifyToken={magicLinkToken || undefined}
        frontendUrl="http://localhost:3004"
        onSuccess={handleSuccess}
        onLoginClick={handleLoginClick}
        onSignupClick={handleSignupClick}
      />

      {/* Feature flag controlled magic link benefits */}
      <FeatureFlag name="magic_link_benefits">
        <div
          style={{
            maxWidth: '400px',
            margin: '1rem auto',
            padding: '1rem',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
          }}
        >
          <div style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
            ✨ Why Choose Magic Link?
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              fontSize: '0.75rem',
              color: '#374151',
            }}
          >
            <div>🔒 More secure than passwords</div>
            <div>⚡ Faster access experience</div>
            <div>📱 Works on any device</div>
            <div>🚫 No password to remember or forget</div>
            <div>🎯 Unified login & signup experience</div>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#9ca3af' }}>
            Benefits controlled by "magic_link_benefits" feature flag
          </div>
        </div>
      </FeatureFlag>
    </div>
  );
}

export default MagicLink;
