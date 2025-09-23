import React, { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';

export interface MagicLinkVerifyCopy {
  title?: string;
  verifyingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  redirectingMessage?: string;
  retryButton?: string;
  backToLoginButton?: string;
}

export interface MagicLinkVerifyStyles {
  container?: React.CSSProperties;
  card?: React.CSSProperties;
  title?: React.CSSProperties;
  message?: React.CSSProperties;
  successMessage?: React.CSSProperties;
  errorMessage?: React.CSSProperties;
  spinner?: React.CSSProperties;
  buttonContainer?: React.CSSProperties;
  retryButton?: React.CSSProperties;
  backButton?: React.CSSProperties;
}

export interface MagicLinkVerifyIcons {
  loading?: React.ReactNode;
  success?: React.ReactNode;
  error?: React.ReactNode;
}

export interface MagicLinkVerifyProps {
  copy?: MagicLinkVerifyCopy;
  styles?: MagicLinkVerifyStyles;
  icons?: MagicLinkVerifyIcons;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  onRetry?: () => void;
  onBackToLogin?: () => void;
  className?: string;
  // Auto-extract from URL params if not provided
  token?: string;
  email?: string;
  appId?: string;
  tenantId?: string;
  // Auto-redirect after success (in milliseconds)
  autoRedirectDelay?: number;
}

const defaultCopy: Required<MagicLinkVerifyCopy> = {
  title: 'Verifying Magic Link',
  verifyingMessage: 'Please wait while we verify your magic link...',
  successMessage: 'Magic link verified successfully! You are now logged in.',
  errorMessage: 'Failed to verify magic link. The link may be expired or invalid.',
  redirectingMessage: 'Redirecting you to the dashboard...',
  retryButton: 'Try Again',
  backToLoginButton: 'Back to Login',
};

const defaultStyles: Required<MagicLinkVerifyStyles> = {
  container: {
    maxWidth: '400px',
    width: '100%',
    margin: '0 auto',
    padding: '2rem',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  },
  card: {
    // Not used in new design, keeping for compatibility
    backgroundColor: 'transparent',
    padding: '0',
    borderRadius: '0',
    boxShadow: 'none',
    maxWidth: '100%',
    width: '100%',
    textAlign: 'center',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '1.5rem',
    color: '#333333',
  },
  message: {
    fontSize: '1rem',
    color: '#6b7280',
    marginBottom: '1.5rem',
    lineHeight: '1.5',
    textAlign: 'center',
  },
  successMessage: {
    fontSize: '1rem',
    color: '#059669',
    marginBottom: '1.5rem',
    lineHeight: '1.5',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: '0.875rem',
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: '1rem',
    lineHeight: '1.5',
  },
  spinner: {
    display: 'inline-block',
    width: '20px',
    height: '20px',
    border: '2px solid #e5e7eb',
    borderTop: '2px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '0.5rem',
  },
  buttonContainer: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: '1rem',
  },
  retryButton: {
    padding: '0.75rem 1rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease-in-out',
  },
  backButton: {
    padding: '0.75rem 1rem',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease-in-out',
  },
};

// Loading spinner icon
const LoadingIcon = () => <div style={defaultStyles.spinner} />;

// Success icon
const SuccessIcon = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#059669"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ margin: '0 auto 1rem auto', display: 'block' }}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22,4 12,14.01 9,11.01" />
  </svg>
);

// Error icon
const ErrorIcon = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#ef4444"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ margin: '0 auto 1rem auto', display: 'block' }}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const defaultIcons: Required<MagicLinkVerifyIcons> = {
  loading: <LoadingIcon />,
  success: <SuccessIcon />,
  error: <ErrorIcon />,
};

type VerificationState = 'verifying' | 'success' | 'error' | 'redirecting';

export function MagicLinkVerify({
  copy = {},
  styles = {},
  icons = {},
  onSuccess,
  onError,
  onRetry,
  onBackToLogin,
  className,
  token: propToken,
  email: propEmail,
  appId: propAppId,
  tenantId: propTenantId,
  autoRedirectDelay = 3000,
}: MagicLinkVerifyProps) {
  const [state, setState] = useState<VerificationState>('verifying');
  const [error, setError] = useState('');

  const { verifyMagicLink } = useAuth();

  const mergedCopy = { ...defaultCopy, ...copy };
  const mergedStyles = { ...defaultStyles, ...styles };
  const mergedIcons = { ...defaultIcons, ...icons };

  // Extract parameters from URL or use props
  const getUrlParams = () => {
    if (typeof window === 'undefined') return {};

    const urlParams = new URLSearchParams(window.location.search);
    return {
      token: propToken || urlParams.get('token') || '',
      email: propEmail || urlParams.get('email') || '',
      appId: propAppId || urlParams.get('appId') || '',
      tenantId: propTenantId || urlParams.get('tenantId') || undefined,
    };
  };

  const handleVerification = async () => {
    setState('verifying');
    setError('');

    try {
      const params = getUrlParams();

      if (!params.token || !params.email || !params.appId) {
        throw new Error('Missing required parameters: token, email, or appId');
      }

      const result = await verifyMagicLink(
        params.token,
        params.email,
        params.appId,
        params.tenantId
      );

      setState('success');
      onSuccess?.(result);

      // Auto-redirect after success
      if (autoRedirectDelay > 0) {
        setTimeout(() => {
          setState('redirecting');
        }, autoRedirectDelay);
      }
    } catch (err: any) {
      const errorMessage = err.message || mergedCopy.errorMessage;
      setError(errorMessage);
      setState('error');
      onError?.(errorMessage);
    }
  };

  const handleRetry = () => {
    onRetry?.();
    handleVerification();
  };

  const handleBackToLogin = () => {
    onBackToLogin?.();
  };

  // Auto-verify on mount
  useEffect(() => {
    handleVerification();
  }, []);

  const renderContent = () => {
    switch (state) {
      case 'verifying':
        return (
          <div style={mergedStyles.message}>
            {mergedIcons.loading}
            {mergedCopy.verifyingMessage}
          </div>
        );

      case 'success':
        return (
          <>
            {mergedIcons.success}
            <div style={mergedStyles.successMessage}>{mergedCopy.successMessage}</div>
          </>
        );

      case 'redirecting':
        return (
          <>
            {mergedIcons.loading}
            <div style={mergedStyles.message}>{mergedCopy.redirectingMessage}</div>
          </>
        );

      case 'error':
        return (
          <>
            {mergedIcons.error}
            <div style={mergedStyles.errorMessage}>{error || mergedCopy.errorMessage}</div>
            <div style={mergedStyles.buttonContainer}>
              <button
                onClick={handleRetry}
                style={mergedStyles.retryButton}
                onMouseOver={e => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                }}
              >
                {mergedCopy.retryButton}
              </button>
              <button
                onClick={handleBackToLogin}
                style={mergedStyles.backButton}
                onMouseOver={e => {
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
              >
                {mergedCopy.backToLoginButton}
              </button>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div style={mergedStyles.container} className={className}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <h1 style={mergedStyles.title}>{mergedCopy.title}</h1>
      {renderContent()}
    </div>
  );
}
