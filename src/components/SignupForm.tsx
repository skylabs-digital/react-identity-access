import React, { useState } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useApp } from '../providers/AppProvider';

export interface SignupFormCopy {
  title?: string;
  nameLabel?: string;
  namePlaceholder?: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  passwordLabel?: string;
  passwordPlaceholder?: string;
  confirmPasswordLabel?: string;
  confirmPasswordPlaceholder?: string;
  tenantNameLabel?: string;
  tenantNamePlaceholder?: string;
  submitButton?: string;
  loginLink?: string;
  loginText?: string;
  errorMessage?: string;
  loadingText?: string;
  passwordMismatchError?: string;
  isAdminLabel?: string;
  isAdminDescription?: string;
}

export interface SignupFormStyles {
  container?: React.CSSProperties;
  title?: React.CSSProperties;
  form?: React.CSSProperties;
  fieldGroup?: React.CSSProperties;
  label?: React.CSSProperties;
  input?: React.CSSProperties;
  inputError?: React.CSSProperties;
  checkbox?: React.CSSProperties;
  checkboxContainer?: React.CSSProperties;
  checkboxLabel?: React.CSSProperties;
  button?: React.CSSProperties;
  buttonDisabled?: React.CSSProperties;
  buttonLoading?: React.CSSProperties;
  errorText?: React.CSSProperties;
  linkContainer?: React.CSSProperties;
  link?: React.CSSProperties;
  divider?: React.CSSProperties;
}

export type SignupType = 'user' | 'tenant';

export interface SignupFormProps {
  copy?: SignupFormCopy;
  styles?: SignupFormStyles;
  signupType?: SignupType;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  onLoginClick?: () => void;
  showLoginLink?: boolean;
  className?: string;
}

const defaultCopy: Required<SignupFormCopy> = {
  title: 'Create Account',
  nameLabel: 'Full Name',
  namePlaceholder: 'Enter your full name',
  emailLabel: 'Email',
  emailPlaceholder: 'Enter your email',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Enter your password',
  confirmPasswordLabel: 'Confirm Password',
  confirmPasswordPlaceholder: 'Confirm your password',
  tenantNameLabel: 'Organization Name',
  tenantNamePlaceholder: 'Enter your organization name',
  submitButton: 'Create Account',
  loginLink: 'Sign in here',
  loginText: 'Already have an account?',
  errorMessage: 'Failed to create account',
  loadingText: 'Creating account...',
  passwordMismatchError: 'Passwords do not match',
  isAdminLabel: 'Create new organization',
  isAdminDescription: 'Check this if you want to create a new organization',
};

const defaultStyles: Required<SignupFormStyles> = {
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
  },
  inputError: {
    borderColor: '#ef4444',
    boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)',
  },
  checkbox: {
    marginRight: '0.5rem',
  },
  checkboxContainer: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
    padding: '0.5rem 0',
  },
  checkboxLabel: {
    fontSize: '0.875rem',
    color: '#374151',
    lineHeight: '1.4',
  },
  button: {
    padding: '0.75rem 1rem',
    backgroundColor: '#10b981',
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

export function SignupForm({
  copy = {},
  styles = {},
  signupType = 'user',
  onSuccess,
  onError,
  onLoginClick,
  showLoginLink = true,
  className,
}: SignupFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    name?: boolean;
    email?: boolean;
    password?: boolean;
    confirmPassword?: boolean;
    tenantName?: boolean;
  }>({});

  const { signup, signupTenantAdmin } = useAuth();
  const { tenant } = useApp();

  const mergedCopy = { ...defaultCopy, ...copy };
  const mergedStyles = { ...defaultStyles, ...styles };

  const validateForm = () => {
    const errors: {
      name?: boolean;
      email?: boolean;
      password?: boolean;
      confirmPassword?: boolean;
      tenantName?: boolean;
    } = {};

    if (!name.trim()) errors.name = true;
    if (!email.trim()) errors.email = true;
    if (!password.trim()) errors.password = true;
    if (!confirmPassword.trim()) errors.confirmPassword = true;
    if (signupType === 'tenant' && !tenantName.trim()) errors.tenantName = true;

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (password !== confirmPassword) {
      setError(mergedCopy.passwordMismatchError);
      setFieldErrors({ confirmPassword: true });
      return;
    }

    if (signupType === 'user' && !tenant?.id) {
      setError('Tenant not found');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let result;
      if (signupType === 'tenant') {
        result = await signupTenantAdmin(email, name, password, tenantName);
      } else {
        result = await signup(email, name, password, tenant!.id);
      }
      onSuccess?.(result);
    } catch (err: any) {
      const errorMessage = err.message || mergedCopy.errorMessage;
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getInputStyle = (field: keyof typeof fieldErrors) => ({
    ...mergedStyles.input,
    ...(fieldErrors[field] ? mergedStyles.inputError : {}),
  });

  const getButtonStyle = () => ({
    ...mergedStyles.button,
    ...(loading ? mergedStyles.buttonLoading : {}),
    ...(!name ||
    !email ||
    !password ||
    !confirmPassword ||
    loading ||
    (signupType === 'tenant' && !tenantName)
      ? mergedStyles.buttonDisabled
      : {}),
  });

  const isFormValid =
    name && email && password && confirmPassword && (signupType === 'user' || tenantName);

  return (
    <div className={className} style={mergedStyles.container}>
      <h2 style={mergedStyles.title}>{mergedCopy.title}</h2>

      <form onSubmit={handleSubmit} style={mergedStyles.form}>
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
            disabled={loading}
          />
        </div>

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
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={e => {
              setPassword(e.target.value);
              if (fieldErrors.password) {
                setFieldErrors(prev => ({ ...prev, password: false }));
              }
            }}
            placeholder={mergedCopy.passwordPlaceholder}
            style={getInputStyle('password')}
            disabled={loading}
          />
        </div>

        <div style={mergedStyles.fieldGroup}>
          <label style={mergedStyles.label}>{mergedCopy.confirmPasswordLabel}</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={e => {
              setConfirmPassword(e.target.value);
              if (fieldErrors.confirmPassword) {
                setFieldErrors(prev => ({ ...prev, confirmPassword: false }));
              }
              if (error === mergedCopy.passwordMismatchError) {
                setError('');
              }
            }}
            placeholder={mergedCopy.confirmPasswordPlaceholder}
            style={getInputStyle('confirmPassword')}
            disabled={loading}
          />
        </div>

        {signupType === 'tenant' && (
          <div style={mergedStyles.fieldGroup}>
            <label style={mergedStyles.label}>{mergedCopy.tenantNameLabel}</label>
            <input
              id="tenantName"
              name="tenantName"
              type="text"
              value={tenantName}
              onChange={e => {
                setTenantName(e.target.value);
                if (fieldErrors.tenantName) {
                  setFieldErrors(prev => ({ ...prev, tenantName: false }));
                }
              }}
              placeholder={mergedCopy.tenantNamePlaceholder}
              style={getInputStyle('tenantName')}
              disabled={loading}
            />
          </div>
        )}

        <button type="submit" disabled={!isFormValid || loading} style={getButtonStyle()}>
          {loading ? mergedCopy.loadingText : mergedCopy.submitButton}
        </button>

        {error && <div style={mergedStyles.errorText}>{error}</div>}
      </form>

      {showLoginLink && (
        <div style={mergedStyles.linkContainer}>
          <span style={mergedStyles.divider}>{mergedCopy.loginText} </span>
          <a onClick={onLoginClick} style={mergedStyles.link}>
            {mergedCopy.loginLink}
          </a>
        </div>
      )}
    </div>
  );
}
