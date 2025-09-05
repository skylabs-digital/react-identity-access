import { SignupForm, FeatureFlag } from 'react-identity-access';
import { useNavigate } from 'react-router';

function Signup() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/');
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  // Custom styling for the signup form
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
      backgroundColor: '#10b981',
      fontSize: '1rem',
      padding: '0.875rem 1rem',
    },
  };

  // Custom copy for branding
  const customCopy = {
    title: 'Join Our Platform',
    submitButton: 'Create My Account',
    loginText: 'Already part of our community?',
    isAdminLabel: 'Start a new organization',
    isAdminDescription: 'Check this if you want to create and manage your own organization',
  };

  return (
    <div style={{ padding: '2rem 1rem', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Feature flag controlled signup bonus */}
      <FeatureFlag 
        name="signup_bonus_message"
        fallback={null}
      >
        <div style={{
          textAlign: 'center',
          marginBottom: '2rem',
          padding: '1rem',
          backgroundColor: '#d1fae5',
          borderRadius: '8px',
          maxWidth: '400px',
          margin: '0 auto 2rem auto'
        }}>
          <h3 style={{ color: '#065f46', margin: 0 }}>🎁 Special Launch Offer!</h3>
          <p style={{ color: '#065f46', margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
            Sign up now and get 30 days free premium features!
          </p>
        </div>
      </FeatureFlag>

      <SignupForm
        copy={customCopy}
        styles={customStyles}
        onSuccess={handleSuccess}
        onLoginClick={handleLoginClick}
        showLoginLink={true}
        allowTenantCreation={true}
      />

      {/* Feature flag controlled terms reminder */}
      <FeatureFlag name="show_terms_reminder">
        <div style={{
          maxWidth: '400px',
          margin: '1rem auto',
          padding: '1rem',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: '#6b7280'
        }}>
          📋 By signing up, you agree to our{' '}
          <a href="#" style={{ color: '#3b82f6', textDecoration: 'none' }}>Terms of Service</a>
          {' '}and{' '}
          <a href="#" style={{ color: '#3b82f6', textDecoration: 'none' }}>Privacy Policy</a>
          <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#9ca3af' }}>
            Terms reminder controlled by "show_terms_reminder" feature flag
          </div>
        </div>
      </FeatureFlag>
    </div>
  );
}

export default Signup;
