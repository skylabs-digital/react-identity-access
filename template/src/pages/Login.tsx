import { LoginForm, FeatureFlag } from 'react-identity-access';
import { useNavigate } from 'react-router';

function Login() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/');
  };

  const handleForgotPassword = () => {
    navigate('/password-recovery');
  };

  const handleSignupClick = () => {
    navigate('/signup');
  };

  // Custom styling for the login form
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
      backgroundColor: '#3b82f6',
      fontSize: '1rem',
      padding: '0.875rem 1rem',
    },
  };

  // Custom copy for branding
  const customCopy = {
    title: 'Welcome Back',
    submitButton: 'Sign In to Dashboard',
    signupText: 'New to our platform?',
  };

  return (
    <div style={{ padding: '2rem 1rem', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Feature flag controlled welcome message */}
      <FeatureFlag name="show_welcome_message" fallback={null}>
        <div
          style={{
            textAlign: 'center',
            marginBottom: '2rem',
            padding: '1rem',
            backgroundColor: '#dbeafe',
            borderRadius: '8px',
            maxWidth: '400px',
            margin: '0 auto 2rem auto',
          }}
        >
          <h3 style={{ color: '#1e40af', margin: 0 }}>🎉 Welcome to our new login experience!</h3>
          <p style={{ color: '#1e40af', margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
            This message is controlled by the "show_welcome_message" feature flag.
          </p>
        </div>
      </FeatureFlag>

      <LoginForm
        copy={customCopy}
        styles={customStyles}
        onSuccess={handleSuccess}
        onForgotPassword={handleForgotPassword}
        onSignupClick={handleSignupClick}
        showForgotPassword={true}
        showSignupLink={true}
      />

      {/* Feature flag controlled additional login options */}
      <FeatureFlag name="social_login_enabled">
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
            Or continue with
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <button
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              🔍 Google
            </button>
            <button
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              📘 Facebook
            </button>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
            Social login controlled by "social_login_enabled" feature flag
          </div>
        </div>
      </FeatureFlag>
    </div>
  );
}

export default Login;
