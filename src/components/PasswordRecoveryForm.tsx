import React, { useState } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useApp } from '../providers/AppProvider';

export interface PasswordRecoveryFormCopy {
  title?: string;
  subtitle?: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  submitButton?: string;
  backToLoginLink?: string;
  successMessage?: string;
  errorMessage?: string;
  loadingText?: string;
  // Reset form copy
  resetTitle?: string;
  resetSubtitle?: string;
  tokenLabel?: string;
  tokenPlaceholder?: string;
  newPasswordLabel?: string;
  newPasswordPlaceholder?: string;
  confirmPasswordLabel?: string;
  confirmPasswordPlaceholder?: string;
  resetSubmitButton?: string;
  resetLoadingText?: string;
  resetSuccessMessage?: string;
  passwordMismatchError?: string;
}

export interface PasswordRecoveryFormStyles {
  container?: React.CSSProperties;
  title?: React.CSSProperties;
  subtitle?: React.CSSProperties;
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
}

export interface PasswordRecoveryFormProps {
  copy?: PasswordRecoveryFormCopy;
  styles?: PasswordRecoveryFormStyles;
  mode?: 'request' | 'reset';
  token?: string;
  onSuccess?: (data?: any) => void;
  onError?: (error: string) => void;
  onBackToLogin?: () => void;
  onModeChange?: (mode: 'request' | 'reset') => void;
  className?: string;
}

const defaultCopy: Required<PasswordRecoveryFormCopy> = {
  title: 'Reset Password',
  subtitle: 'Enter your email address and we\'ll send you a link to reset your password.',
  emailLabel: 'Email',
  emailPlaceholder: 'Enter your email',
  submitButton: 'Send Reset Link',
  backToLoginLink: 'Back to Sign In',
  successMessage: 'Password reset link sent! Check your email.',
  errorMessage: 'Failed to send reset link',
  loadingText: 'Sending...',
  resetTitle: 'Set New Password',
  resetSubtitle: 'Enter your reset token and new password.',
  tokenLabel: 'Reset Token',
  tokenPlaceholder: 'Enter reset token from email',
  newPasswordLabel: 'New Password',
  newPasswordPlaceholder: 'Enter new password',
  confirmPasswordLabel: 'Confirm Password',
  confirmPasswordPlaceholder: 'Confirm new password',
  resetSubmitButton: 'Reset Password',
  resetLoadingText: 'Resetting...',
  resetSuccessMessage: 'Password reset successfully!',
  passwordMismatchError: 'Passwords do not match',
};

const defaultStyles: Required<PasswordRecoveryFormStyles> = {
  container: {
    maxWidth: '400px',
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
    marginBottom: '0.5rem',
    color: '#333333',
  },
  subtitle: {
    fontSize: '0.875rem',
    textAlign: 'center',
    marginBottom: '1.5rem',
    color: '#6b7280',
    lineHeight: '1.4',
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
  button: {
    padding: '0.75rem 1rem',
    backgroundColor: '#f59e0b',
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
};

export function PasswordRecoveryForm({
  copy = {},
  styles = {},
  mode = 'request',
  token: initialToken = '',
  onSuccess,
  onError,
  onBackToLogin,
  onModeChange,
  className,
}: PasswordRecoveryFormProps) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    email?: boolean;
    token?: boolean;
    newPassword?: boolean;
    confirmPassword?: boolean;
  }>({});

  const { requestPasswordReset, confirmPasswordReset } = useAuth();
  const { tenant } = useApp();

  const mergedCopy = { ...defaultCopy, ...copy };
  const mergedStyles = {
    container: { ...defaultStyles.container, ...styles.container },
    title: { ...defaultStyles.title, ...styles.title },
    subtitle: { ...defaultStyles.subtitle, ...styles.subtitle },
    form: { ...defaultStyles.form, ...styles.form },
    fieldGroup: { ...defaultStyles.fieldGroup, ...styles.fieldGroup },
    label: { ...defaultStyles.label, ...styles.label },
    input: { ...defaultStyles.input, ...styles.input },
    inputError: { ...defaultStyles.inputError, ...styles.inputError },
    button: { ...defaultStyles.button, ...styles.button },
    buttonDisabled: { ...defaultStyles.buttonDisabled, ...styles.buttonDisabled },
    buttonLoading: { ...defaultStyles.buttonLoading, ...styles.buttonLoading },
    errorText: { ...defaultStyles.errorText, ...styles.errorText },
    successText: { ...defaultStyles.successText, ...styles.successText },
    linkContainer: { ...defaultStyles.linkContainer, ...styles.linkContainer },
    link: { ...defaultStyles.link, ...styles.link },
  };

  const validateRequestForm = () => {
    const errors: { email?: boolean } = {};
    if (!email.trim()) errors.email = true;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateResetForm = () => {
    const errors: { token?: boolean; newPassword?: boolean; confirmPassword?: boolean } = {};
    if (!token.trim()) errors.token = true;
    if (!newPassword.trim()) errors.newPassword = true;
    if (!confirmPassword.trim()) errors.confirmPassword = true;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateRequestForm()) return;
    if (!tenant?.id) {
      setError('Tenant not found');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await requestPasswordReset(email, tenant.id);
      setSuccess(mergedCopy.successMessage);
      onSuccess?.();
    } catch (err: any) {
      const errorMessage = err.message || mergedCopy.errorMessage;
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateResetForm()) return;
    
    if (newPassword !== confirmPassword) {
      setError(mergedCopy.passwordMismatchError);
      setFieldErrors({ confirmPassword: true });
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await confirmPasswordReset(token, newPassword);
      setSuccess(mergedCopy.resetSuccessMessage);
      onSuccess?.();
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
  });

  if (mode === 'reset') {
    const isFormValid = token && newPassword && confirmPassword;
    
    return (
      <div className={className} style={mergedStyles.container}>
        <h2 style={mergedStyles.title}>{mergedCopy.resetTitle}</h2>
        <p style={mergedStyles.subtitle}>{mergedCopy.resetSubtitle}</p>
        
        <form onSubmit={handleResetSubmit} style={mergedStyles.form}>
          <div style={mergedStyles.fieldGroup}>
            <label style={mergedStyles.label}>{mergedCopy.tokenLabel}</label>
            <input
              type="text"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                if (fieldErrors.token) {
                  setFieldErrors(prev => ({ ...prev, token: false }));
                }
              }}
              placeholder={mergedCopy.tokenPlaceholder}
              style={getInputStyle('token')}
              disabled={loading}
            />
          </div>

          <div style={mergedStyles.fieldGroup}>
            <label style={mergedStyles.label}>{mergedCopy.newPasswordLabel}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (fieldErrors.newPassword) {
                  setFieldErrors(prev => ({ ...prev, newPassword: false }));
                }
              }}
              placeholder={mergedCopy.newPasswordPlaceholder}
              style={getInputStyle('newPassword')}
              disabled={loading}
            />
          </div>

          <div style={mergedStyles.fieldGroup}>
            <label style={mergedStyles.label}>{mergedCopy.confirmPasswordLabel}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
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

          <button
            type="submit"
            disabled={!isFormValid || loading}
            style={{
              ...getButtonStyle(),
              ...(!isFormValid || loading ? mergedStyles.buttonDisabled : {}),
            }}
          >
            {loading ? mergedCopy.resetLoadingText : mergedCopy.resetSubmitButton}
          </button>

          {error && <div style={mergedStyles.errorText}>{error}</div>}
          {success && <div style={mergedStyles.successText}>{success}</div>}
        </form>

        <div style={mergedStyles.linkContainer}>
          <a onClick={onBackToLogin} style={mergedStyles.link}>
            {mergedCopy.backToLoginLink}
          </a>
          {onModeChange && (
            <>
              <span style={{ margin: '0 0.5rem', color: '#6b7280' }}>•</span>
              <a onClick={() => onModeChange('request')} style={mergedStyles.link}>
                Request New Link
              </a>
            </>
          )}
        </div>
      </div>
    );
  }

  // Request mode
  const isFormValid = email;
  
  return (
    <div className={className} style={mergedStyles.container}>
      <h2 style={mergedStyles.title}>{mergedCopy.title}</h2>
      <p style={mergedStyles.subtitle}>{mergedCopy.subtitle}</p>
      
      <form onSubmit={handleRequestSubmit} style={mergedStyles.form}>
        <div style={mergedStyles.fieldGroup}>
          <label style={mergedStyles.label}>{mergedCopy.emailLabel}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
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

        <button
          type="submit"
          disabled={!isFormValid || loading}
          style={{
            ...getButtonStyle(),
            ...(!isFormValid || loading ? mergedStyles.buttonDisabled : {}),
          }}
        >
          {loading ? mergedCopy.loadingText : mergedCopy.submitButton}
        </button>

        {error && <div style={mergedStyles.errorText}>{error}</div>}
        {success && <div style={mergedStyles.successText}>{success}</div>}
      </form>

      <div style={mergedStyles.linkContainer}>
        <a onClick={onBackToLogin} style={mergedStyles.link}>
          {mergedCopy.backToLoginLink}
        </a>
        {onModeChange && (
          <>
            <span style={{ margin: '0 0.5rem', color: '#6b7280' }}>•</span>
            <a onClick={() => onModeChange('reset')} style={mergedStyles.link}>
              I have a token
            </a>
          </>
        )}
      </div>
    </div>
  );
}
