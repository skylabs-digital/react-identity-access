import React, { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useTenantInfo } from '../providers/TenantProvider';

export interface MagicLinkFormCopy {
  title?: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  nameLabel?: string;
  namePlaceholder?: string;
  lastNameLabel?: string;
  lastNamePlaceholder?: string;
  submitButton?: string;
  loginLink?: string;
  signupLink?: string;
  loginText?: string;
  signupText?: string;
  successMessage?: string;
  errorMessage?: string;
  loadingText?: string;
  verifyingText?: string;
  description?: string;
}

export interface MagicLinkFormStyles {
  container?: React.CSSProperties;
  title?: React.CSSProperties;
  description?: React.CSSProperties;
  form?: React.CSSProperties;
  fieldGroup?: React.CSSProperties;
  label?: React.CSSProperties;
  input?: React.CSSProperties;
  inputError?: React.CSSProperties;
  button?: React.CSSProperties;
  buttonDisabled?: React.CSSProperties;
  buttonLoading?: React.CSSProperties;
  errorText?: React.CSSProperties;
  successText?: React.CSSProperties;
  linkContainer?: React.CSSProperties;
  link?: React.CSSProperties;
  divider?: React.CSSProperties;
}

export interface MagicLinkFormProps {
  copy?: MagicLinkFormCopy;
  styles?: MagicLinkFormStyles;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  onLoginClick?: () => void;
  onSignupClick?: () => void;
  showTraditionalLinks?: boolean;
  className?: string;
  // Auto-verify magic link if token is provided (e.g., from URL params)
  verifyToken?: string;
  // Frontend URL for magic link callback (if not provided, will use window.location.origin)
  frontendUrl?: string;
}

const defaultCopy: Required<MagicLinkFormCopy> = {
  title: 'Sign In with Magic Link',
  emailLabel: 'Email',
  emailPlaceholder: 'Enter your email',
  nameLabel: 'Name',
  namePlaceholder: 'Enter your name',
  lastNameLabel: 'Last Name',
  lastNamePlaceholder: 'Enter your last name',
  submitButton: 'Send Magic Link',
  loginLink: 'Sign in with password',
  signupLink: 'Sign up with password',
  loginText: 'Already have an account?',
  signupText: 'Prefer traditional signup?',
  successMessage: 'Magic link sent! Check your email and click the link to sign in.',
  errorMessage: 'Failed to send magic link. Please try again.',
  loadingText: 'Sending magic link...',
  verifyingText: 'Verifying magic link...',
  description:
    "Enter your email to receive a magic link. If you don't have an account, we'll create one for you.",
};

const defaultStyles: Required<MagicLinkFormStyles> = {
  container: {
    maxWidth: '400px',
    width: '100%',
    margin: '0 auto',
    padding: '2rem',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '1rem',
    color: '#333333',
  },
  description: {
    fontSize: '0.875rem',
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: '1.5rem',
    lineHeight: '1.5',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '1rem',
    transition: 'border-color 0.15s ease-in-out',
    outline: 'none',
    width: '100%',
  },
  inputError: {
    borderColor: '#ef4444',
    boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)',
  },
  button: {
    padding: '0.75rem 1rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease-in-out',
    marginTop: '0.5rem',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  buttonLoading: {
    backgroundColor: '#6b7280',
  },
  errorText: {
    color: '#ef4444',
    fontSize: '0.875rem',
    textAlign: 'center',
    marginTop: '0.5rem',
  },
  successText: {
    color: '#10b981',
    fontSize: '0.875rem',
    textAlign: 'center',
    marginTop: '0.5rem',
    padding: '0.75rem',
    backgroundColor: '#f0fdf4',
    borderRadius: '6px',
    border: '1px solid #bbf7d0',
  },
  linkContainer: {
    textAlign: 'center',
    marginTop: '1rem',
  },
  link: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  divider: {
    margin: '0.5rem 0',
    color: '#6b7280',
    fontSize: '0.875rem',
  },
};

export function MagicLinkForm({
  copy = {},
  styles = {},
  onSuccess,
  onError,
  onLoginClick,
  onSignupClick,
  showTraditionalLinks = true,
  className,
  verifyToken,
  frontendUrl,
}: MagicLinkFormProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: boolean; name?: boolean }>({});
  const [showNameFields, setShowNameFields] = useState(false);

  const { sendMagicLink, verifyMagicLink } = useAuth();
  const { tenant } = useTenantInfo();

  const mergedCopy = { ...defaultCopy, ...copy };
  const mergedStyles = { ...defaultStyles, ...styles };

  // Auto-verify magic link if token is provided
  useEffect(() => {
    if (verifyToken) {
      handleVerifyMagicLink(verifyToken);
    }
  }, [verifyToken]);

  const handleVerifyMagicLink = async (token: string) => {
    if (!tenant || !email) {
      setError('Missing tenant or email');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const result = await verifyMagicLink({
        token,
        email,
        // tenantId inferred from context automatically
      });
      onSuccess?.(result);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to verify magic link';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setVerifying(false);
    }
  };

  const validateForm = () => {
    const errors: { email?: boolean; name?: boolean } = {};

    if (!email.trim()) errors.email = true;
    if (showNameFields && !name.trim()) errors.name = true;

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!tenant?.id) {
      setError('Tenant not found');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const finalFrontendUrl =
        frontendUrl || (typeof window !== 'undefined' ? window.location.origin : '');
      const result = await sendMagicLink({
        email,
        tenantId: tenant.id,
        frontendUrl: finalFrontendUrl,
        name: showNameFields ? name : undefined,
        lastName: showNameFields ? lastName : undefined,
      });
      setSuccess(mergedCopy.successMessage);
      onSuccess?.(result);
    } catch (err: any) {
      const errorMessage = err.message || mergedCopy.errorMessage;
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getInputStyle = (field: 'email' | 'name') => ({
    ...mergedStyles.input,
    ...(fieldErrors[field] ? mergedStyles.inputError : {}),
  });

  const getButtonStyle = () => ({
    ...mergedStyles.button,
    ...(loading || verifying ? mergedStyles.buttonLoading : {}),
    ...(!email || loading || verifying ? mergedStyles.buttonDisabled : {}),
  });

  if (verifying) {
    return (
      <div className={className} style={mergedStyles.container}>
        <h2 style={mergedStyles.title}>{mergedCopy.verifyingText}</h2>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '1rem', color: '#6b7280' }}>
            Please wait while we verify your magic link...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={mergedStyles.container}>
      <h2 style={mergedStyles.title}>{mergedCopy.title}</h2>
      <p style={mergedStyles.description}>{mergedCopy.description}</p>

      <form onSubmit={handleSubmit} style={mergedStyles.form}>
        <div style={mergedStyles.fieldGroup}>
          <label style={mergedStyles.label}>{mergedCopy.emailLabel}</label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={e => {
              setEmail(e.target.value);
              if (fieldErrors.email) {
                setFieldErrors(prev => ({ ...prev, email: false }));
              }
            }}
            placeholder={mergedCopy.emailPlaceholder}
            style={getInputStyle('email')}
            disabled={loading || verifying}
          />
        </div>

        {/* Toggle to show name fields for new users */}
        {!showNameFields && (
          <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setShowNameFields(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#3b82f6',
                fontSize: '0.875rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              New user? Add your name
            </button>
          </div>
        )}

        {showNameFields && (
          <>
            <div style={mergedStyles.fieldGroup}>
              <label style={mergedStyles.label}>{mergedCopy.nameLabel}</label>
              <input
                id="name"
                name="name"
                type="text"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  if (fieldErrors.name) {
                    setFieldErrors(prev => ({ ...prev, name: false }));
                  }
                }}
                placeholder={mergedCopy.namePlaceholder}
                style={getInputStyle('name')}
                disabled={loading || verifying}
              />
            </div>

            <div style={mergedStyles.fieldGroup}>
              <label style={mergedStyles.label}>{mergedCopy.lastNameLabel}</label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder={mergedCopy.lastNamePlaceholder}
                style={mergedStyles.input}
                disabled={loading || verifying}
              />
            </div>

            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  setShowNameFields(false);
                  setName('');
                  setLastName('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Existing user? Hide name fields
              </button>
            </div>
          </>
        )}

        <button type="submit" disabled={!email || loading || verifying} style={getButtonStyle()}>
          {loading ? mergedCopy.loadingText : mergedCopy.submitButton}
        </button>

        {error && <div style={mergedStyles.errorText}>{error}</div>}
        {success && <div style={mergedStyles.successText}>{success}</div>}
      </form>

      {showTraditionalLinks && (
        <div style={mergedStyles.linkContainer}>
          <div>
            <span style={mergedStyles.divider}>{mergedCopy.loginText} </span>
            <a onClick={onLoginClick} style={mergedStyles.link}>
              {mergedCopy.loginLink}
            </a>
          </div>

          <div style={mergedStyles.divider}>•</div>

          <div>
            <span style={mergedStyles.divider}>{mergedCopy.signupText} </span>
            <a onClick={onSignupClick} style={mergedStyles.link}>
              {mergedCopy.signupLink}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
