import { useState } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useTenantOptional } from '../providers/TenantProvider';
import { useAuthForm } from '../hooks/useAuthForm';
import { AuthFormBaseStyles, buildFormStyles } from './authFormShared';

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
  requestNewLinkLink?: string;
  haveTokenLink?: string;
  tenantNotFoundError?: string;
  dividerBullet?: string;
}

export type PasswordRecoveryFormStyles = AuthFormBaseStyles;

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
  subtitle: "Enter your email address and we'll send you a link to reset your password.",
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
  requestNewLinkLink: 'Request New Link',
  haveTokenLink: 'I have a token',
  tenantNotFoundError: 'Tenant not found',
  dividerBullet: '•',
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
  const [success, setSuccess] = useState('');

  const { requestPasswordReset, confirmPasswordReset } = useAuth();
  const tenant = useTenantOptional()?.tenant ?? null;

  const mergedCopy = { ...defaultCopy, ...copy };
  const mergedStyles = buildFormStyles('#f59e0b', styles);

  type RequestField = 'email';
  const requestForm = useAuthForm<void, RequestField>({
    defaultErrorMessage: mergedCopy.errorMessage,
    validate: () => {
      if (!email.trim()) {
        requestForm.setFieldError('email', true);
        return false;
      }
      if (!tenant?.id) {
        requestForm.setError(mergedCopy.tenantNotFoundError);
        return false;
      }
      return true;
    },
    submit: async () => {
      setSuccess('');
      await requestPasswordReset({ email, tenantId: tenant!.id });
      setSuccess(mergedCopy.successMessage);
    },
    onSuccess: () => onSuccess?.(),
    onError,
  });

  type ResetField = 'token' | 'newPassword' | 'confirmPassword';
  const resetForm = useAuthForm<void, ResetField>({
    defaultErrorMessage: mergedCopy.errorMessage,
    validate: () => {
      const missing: ResetField[] = [];
      if (!token.trim()) missing.push('token');
      if (!newPassword.trim()) missing.push('newPassword');
      if (!confirmPassword.trim()) missing.push('confirmPassword');
      missing.forEach(f => resetForm.setFieldError(f, true));
      if (missing.length > 0) return false;

      if (newPassword !== confirmPassword) {
        resetForm.setError(mergedCopy.passwordMismatchError);
        resetForm.setFieldError('confirmPassword', true);
        return false;
      }
      return true;
    },
    submit: async () => {
      setSuccess('');
      await confirmPasswordReset({ token, newPassword });
      setSuccess(mergedCopy.resetSuccessMessage);
    },
    onSuccess: () => onSuccess?.(),
    onError,
  });

  if (mode === 'reset') {
    const getInputStyle = (field: ResetField) => ({
      ...mergedStyles.input,
      ...(resetForm.fieldErrors[field] ? mergedStyles.inputError : {}),
    });

    const isFormValid = !!token && !!newPassword && !!confirmPassword;
    const isDisabled = !isFormValid || resetForm.loading;
    const buttonStyle = {
      ...mergedStyles.button,
      ...(resetForm.loading ? mergedStyles.buttonLoading : {}),
      ...(isDisabled ? mergedStyles.buttonDisabled : {}),
    };

    return (
      <div className={className} style={mergedStyles.container}>
        <h2 style={mergedStyles.title}>{mergedCopy.resetTitle}</h2>
        <p style={mergedStyles.subtitle}>{mergedCopy.resetSubtitle}</p>

        <form onSubmit={resetForm.handleSubmit} style={mergedStyles.form}>
          <div style={mergedStyles.fieldGroup}>
            <label style={mergedStyles.label}>{mergedCopy.tokenLabel}</label>
            <input
              type="text"
              value={token}
              onChange={e => {
                setToken(e.target.value);
                resetForm.clearFieldError('token');
              }}
              placeholder={mergedCopy.tokenPlaceholder}
              style={getInputStyle('token')}
              disabled={resetForm.loading}
            />
          </div>

          <div style={mergedStyles.fieldGroup}>
            <label style={mergedStyles.label}>{mergedCopy.newPasswordLabel}</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => {
                setNewPassword(e.target.value);
                resetForm.clearFieldError('newPassword');
              }}
              placeholder={mergedCopy.newPasswordPlaceholder}
              style={getInputStyle('newPassword')}
              disabled={resetForm.loading}
            />
          </div>

          <div style={mergedStyles.fieldGroup}>
            <label style={mergedStyles.label}>{mergedCopy.confirmPasswordLabel}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => {
                setConfirmPassword(e.target.value);
                resetForm.clearFieldError('confirmPassword');
                if (resetForm.error === mergedCopy.passwordMismatchError) {
                  resetForm.setError('');
                }
              }}
              placeholder={mergedCopy.confirmPasswordPlaceholder}
              style={getInputStyle('confirmPassword')}
              disabled={resetForm.loading}
            />
          </div>

          <button type="submit" disabled={isDisabled} style={buttonStyle}>
            {resetForm.loading ? mergedCopy.resetLoadingText : mergedCopy.resetSubmitButton}
          </button>

          {resetForm.error && <div style={mergedStyles.errorText}>{resetForm.error}</div>}
          {success && <div style={mergedStyles.successText}>{success}</div>}
        </form>

        <div style={mergedStyles.linkContainer}>
          <a onClick={onBackToLogin} style={mergedStyles.link}>
            {mergedCopy.backToLoginLink}
          </a>
          {onModeChange && (
            <>
              <span style={mergedStyles.modeSwitchDivider}>{mergedCopy.dividerBullet}</span>
              <a onClick={() => onModeChange('request')} style={mergedStyles.link}>
                {mergedCopy.requestNewLinkLink}
              </a>
            </>
          )}
        </div>
      </div>
    );
  }

  // Request mode
  const getInputStyle = (field: RequestField) => ({
    ...mergedStyles.input,
    ...(requestForm.fieldErrors[field] ? mergedStyles.inputError : {}),
  });

  const isDisabled = !email || requestForm.loading;
  const buttonStyle = {
    ...mergedStyles.button,
    ...(requestForm.loading ? mergedStyles.buttonLoading : {}),
    ...(isDisabled ? mergedStyles.buttonDisabled : {}),
  };

  return (
    <div className={className} style={mergedStyles.container}>
      <h2 style={mergedStyles.title}>{mergedCopy.title}</h2>
      <p style={mergedStyles.subtitle}>{mergedCopy.subtitle}</p>

      <form onSubmit={requestForm.handleSubmit} style={mergedStyles.form}>
        <div style={mergedStyles.fieldGroup}>
          <label style={mergedStyles.label}>{mergedCopy.emailLabel}</label>
          <input
            type="email"
            value={email}
            onChange={e => {
              setEmail(e.target.value);
              requestForm.clearFieldError('email');
            }}
            placeholder={mergedCopy.emailPlaceholder}
            style={getInputStyle('email')}
            disabled={requestForm.loading}
          />
        </div>

        <button type="submit" disabled={isDisabled} style={buttonStyle}>
          {requestForm.loading ? mergedCopy.loadingText : mergedCopy.submitButton}
        </button>

        {requestForm.error && <div style={mergedStyles.errorText}>{requestForm.error}</div>}
        {success && <div style={mergedStyles.successText}>{success}</div>}
      </form>

      <div style={mergedStyles.linkContainer}>
        <a onClick={onBackToLogin} style={mergedStyles.link}>
          {mergedCopy.backToLoginLink}
        </a>
        {onModeChange && (
          <>
            <span style={mergedStyles.modeSwitchDivider}>{mergedCopy.dividerBullet}</span>
            <a onClick={() => onModeChange('reset')} style={mergedStyles.link}>
              {mergedCopy.haveTokenLink}
            </a>
          </>
        )}
      </div>
    </div>
  );
}
