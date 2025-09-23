import { MagicLinkVerify } from '@skylabs-digital/react-identity-access';
import { useNavigate } from 'react-router-dom';

function MagicLinkVerifyPage() {
  const navigate = useNavigate();

  const handleSuccess = (data: any) => {
    console.log('Magic link verification successful:', data);
    // Navigate to dashboard after successful verification
    setTimeout(() => {
      navigate('/dashboard');
    }, 3000); // Wait 3 seconds to show success message
  };

  const handleError = (error: string) => {
    console.error('Magic link verification failed:', error);
  };

  const handleRetry = () => {
    // Reload the page to retry verification
    window.location.reload();
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '1rem',
        backgroundColor: '#f9fafb',
      }}
    >
      <MagicLinkVerify
        onSuccess={handleSuccess}
        onError={handleError}
        onRetry={handleRetry}
        onBackToLogin={handleBackToLogin}
        autoRedirectDelay={3000}
      />
    </div>
  );
}

export default MagicLinkVerifyPage;
