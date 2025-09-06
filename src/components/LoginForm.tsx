import React, { useState } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useApp } from '../providers/AppProvider';

export interface LoginFormCopy {
  title?: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  passwordLabel?: string;
  passwordPlaceholder?: string;
  submitButton?: string;
  forgotPasswordLink?: string;
  signupLink?: string;
  signupText?: string;
  errorMessage?: string;
  loadingText?: string;
}

export interface LoginFormStyles {
  container?: React.CSSProperties;
  title?: React.CSSProperties;
  form?: React.CSSProperties;
  fieldGroup?: React.CSSProperties;
  label?: React.CSSProperties;
  input?: React.CSSProperties;
  inputError?: React.CSSProperties;
  inputContainer?: React.CSSProperties;
  passwordToggle?: React.CSSProperties;
  button?: React.CSSProperties;
  buttonDisabled?: React.CSSProperties;
  buttonLoading?: React.CSSProperties;
  errorText?: React.CSSProperties;
  linkContainer?: React.CSSProperties;
  link?: React.CSSProperties;
  divider?: React.CSSProperties;
}

export interface LoginFormIcons {
  showPassword?: React.ReactNode;
  hidePassword?: React.ReactNode;
}

export interface LoginFormProps {
  copy?: LoginFormCopy;
  styles?: LoginFormStyles;
  icons?: LoginFormIcons;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  onForgotPassword?: () => void;
  onSignupClick?: () => void;
  showForgotPassword?: boolean;
  showSignupLink?: boolean;
  className?: string;
}

// Default SVG icons for password toggle
const EyeIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const defaultIcons: Required<LoginFormIcons> = {
  showPassword: <EyeIcon />,
  hidePassword: <EyeOffIcon />,
};

const defaultCopy: Required<LoginFormCopy> = {
  title: 'Sign In',
  emailLabel: 'Email',
  emailPlaceholder: 'Enter your email',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Enter your password',
  submitButton: 'Sign In',
  forgotPasswordLink: 'Forgot your password?',
  signupLink: 'Sign up here',
  signupText: "Don't have an account?",
  errorMessage: 'Invalid email or password',
  loadingText: 'Signing in...',
};

const defaultStyles: Required<LoginFormStyles> = {
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
    marginBottom: '1.5rem',
    color: '#333333',
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
  inputContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  passwordToggle: {
    position: 'absolute',
    right: '0.75rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.25rem',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    transition: 'background-color 0.15s ease-in-out',
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

export function LoginForm({
  copy = {},
  styles = {},
  icons = {},
  onSuccess,
  onError,
  onForgotPassword,
  onSignupClick,
  showForgotPassword = true,
  showSignupLink = true,
  className,
}: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: boolean; password?: boolean }>({});

  const { login } = useAuth();
  const { tenant } = useApp();

  const mergedCopy = { ...defaultCopy, ...copy };
  const mergedStyles = { ...defaultStyles, ...styles };
  const mergedIcons = { ...defaultIcons, ...icons };

  const validateForm = () => {
    const errors: { email?: boolean; password?: boolean } = {};

    if (!email.trim()) errors.email = true;
    if (!password.trim()) errors.password = true;

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

    try {
      const result = await login(email, password, tenant.id);
      onSuccess?.(result);
    } catch (err: any) {
      const errorMessage = err.message || mergedCopy.errorMessage;
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getInputStyle = (field: 'email' | 'password') => ({
    ...mergedStyles.input,
    ...(fieldErrors[field] ? mergedStyles.inputError : {}),
  });

  const getButtonStyle = () => ({
    ...mergedStyles.button,
    ...(loading ? mergedStyles.buttonLoading : {}),
    ...(!email || !password || loading ? mergedStyles.buttonDisabled : {}),
  });

  return (
    <div className={className} style={mergedStyles.container}>
      <h2 style={mergedStyles.title}>{mergedCopy.title}</h2>

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
            disabled={loading}
          />
        </div>

        <div style={mergedStyles.fieldGroup}>
          <label style={mergedStyles.label}>{mergedCopy.passwordLabel}</label>
          <div style={mergedStyles.inputContainer}>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors(prev => ({ ...prev, password: false }));
                }
              }}
              placeholder={mergedCopy.passwordPlaceholder}
              style={{
                ...getInputStyle('password'),
                paddingRight: '2.5rem', // Make room for the icon
              }}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={mergedStyles.passwordToggle}
              disabled={loading}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? mergedIcons.hidePassword : mergedIcons.showPassword}
            </button>
          </div>
        </div>

        <button type="submit" disabled={!email || !password || loading} style={getButtonStyle()}>
          {loading ? mergedCopy.loadingText : mergedCopy.submitButton}
        </button>

        {error && <div style={mergedStyles.errorText}>{error}</div>}
      </form>

      {(showForgotPassword || showSignupLink) && (
        <div style={mergedStyles.linkContainer}>
          {showForgotPassword && (
            <a onClick={onForgotPassword} style={mergedStyles.link}>
              {mergedCopy.forgotPasswordLink}
            </a>
          )}

          {showForgotPassword && showSignupLink && <div style={mergedStyles.divider}>•</div>}

          {showSignupLink && (
            <div>
              <span style={mergedStyles.divider}>{mergedCopy.signupText} </span>
              <a onClick={onSignupClick} style={mergedStyles.link}>
                {mergedCopy.signupLink}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
