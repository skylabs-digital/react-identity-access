import { PasswordRecoveryForm, FeatureFlag } from '@skylabs-digital/react-identity-access';
import { useNavigate } from 'react-router';

function ForgotPassword() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/login');
  };

  // Custom styling for the forgot password form
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
    title: 'Reset Your Password',
    submitButton: 'Send Reset Link',
    loginText: 'Remember your password?',
    successMessage: 'Password reset link sent! Check your email.',
  };

  return (
    <div style={{ padding: '2rem 1rem', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Feature flag controlled security notice */}
      <FeatureFlag name="show_security_notice" fallback={null}>
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
          <h3 style={{ color: '#92400e', margin: 0 }}>🔒 Security Notice</h3>
          <p style={{ color: '#92400e', margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
            For your security, password reset links expire in 15 minutes.
          </p>
        </div>
      </FeatureFlag>

      <PasswordRecoveryForm copy={customCopy} styles={customStyles} onSuccess={handleSuccess} />

      {/* Feature flag controlled support info */}
      <FeatureFlag name="show_support_info">
        <div
          style={{
            maxWidth: '400px',
            margin: '1rem auto',
            padding: '1rem',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: '#6b7280',
          }}
        >
          💬 Need help? Contact our{' '}
          <a href="#" style={{ color: '#3b82f6', textDecoration: 'none' }}>
            support team
          </a>
          <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#9ca3af' }}>
            Support info controlled by "show_support_info" feature flag
          </div>
        </div>
      </FeatureFlag>
    </div>
  );
}

export default ForgotPassword;
