import React, { useState } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useAuthForm } from '../hooks/useAuthForm';
import { AuthFormBaseStyles, buildFormStyles, EyeIcon, EyeOffIcon } from './authFormShared';

export interface LoginFormCopy {
  title?: string;
  usernameLabel?: string;
  usernamePlaceholder?: string;
  passwordLabel?: string;
  passwordPlaceholder?: string;
  submitButton?: string;
  forgotPasswordLink?: string;
  signupLink?: string;
  signupText?: string;
  magicLinkText?: string;
  magicLinkLink?: string;
  errorMessage?: string;
  loadingText?: string;
  tenantNotFoundError?: string;
  dividerBullet?: string;
  showPasswordAriaLabel?: string;
  hidePasswordAriaLabel?: string;
}

export type LoginFormStyles = AuthFormBaseStyles;

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
  onMagicLinkClick?: () => void;
  showForgotPassword?: boolean;
  showSignupLink?: boolean;
  showMagicLinkOption?: boolean;
  className?: string;
}

const defaultIcons: Required<LoginFormIcons> = {
  showPassword: <EyeIcon />,
  hidePassword: <EyeOffIcon />,
};

const defaultCopy: Required<LoginFormCopy> = {
  title: 'Sign In',
  usernameLabel: 'Email or Phone',
  usernamePlaceholder: 'Enter your email or phone number',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Enter your password',
  submitButton: 'Sign In',
  forgotPasswordLink: 'Forgot your password?',
  signupLink: 'Sign up here',
  signupText: "Don't have an account?",
  magicLinkText: 'Prefer passwordless?',
  magicLinkLink: 'Use Magic Link',
  errorMessage: 'Invalid credentials',
  loadingText: 'Signing in...',
  tenantNotFoundError: 'Tenant not found',
  dividerBullet: '•',
  showPasswordAriaLabel: 'Show password',
  hidePasswordAriaLabel: 'Hide password',
};

export function LoginForm({
  copy = {},
  styles = {},
  icons = {},
  onSuccess,
  onError,
  onForgotPassword,
  onSignupClick,
  onMagicLinkClick,
  showForgotPassword = true,
  showSignupLink = true,
  showMagicLinkOption = true,
  className,
}: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();

  const mergedCopy = { ...defaultCopy, ...copy };
  const mergedStyles = buildFormStyles('#3b82f6', styles);
  const mergedIcons = { ...defaultIcons, ...icons };

  type Field = 'username' | 'password';
  const form = useAuthForm<unknown, Field>({
    defaultErrorMessage: mergedCopy.errorMessage,
    validate: () => {
      const missing: Field[] = [];
      if (!username.trim()) missing.push('username');
      if (!password.trim()) missing.push('password');
      missing.forEach(f => form.setFieldError(f, true));
      return missing.length === 0;
    },
    submit: () => login({ username, password }),
    onSuccess,
    onError,
  });

  const getInputStyle = (field: Field) => ({
    ...mergedStyles.input,
    ...(form.fieldErrors[field] ? mergedStyles.inputError : {}),
  });

  const isDisabled = !username || !password || form.loading;
  const buttonStyle = {
    ...mergedStyles.button,
    ...(form.loading ? mergedStyles.buttonLoading : {}),
    ...(isDisabled ? mergedStyles.buttonDisabled : {}),
  };

  return (
    <div className={className} style={mergedStyles.container}>
      <h2 style={mergedStyles.title}>{mergedCopy.title}</h2>

      <form onSubmit={form.handleSubmit} style={mergedStyles.form}>
        <div style={mergedStyles.fieldGroup}>
          <label style={mergedStyles.label}>{mergedCopy.usernameLabel}</label>
          <input
            id="username"
            name="username"
            type="text"
            value={username}
            onChange={e => {
              setUsername(e.target.value);
              form.clearFieldError('username');
            }}
            placeholder={mergedCopy.usernamePlaceholder}
            style={getInputStyle('username')}
            disabled={form.loading}
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
                form.clearFieldError('password');
              }}
              placeholder={mergedCopy.passwordPlaceholder}
              style={{ ...getInputStyle('password'), ...mergedStyles.inputWithIcon }}
              disabled={form.loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={mergedStyles.passwordToggle}
              disabled={form.loading}
              aria-label={
                showPassword ? mergedCopy.hidePasswordAriaLabel : mergedCopy.showPasswordAriaLabel
              }
            >
              {showPassword ? mergedIcons.hidePassword : mergedIcons.showPassword}
            </button>
          </div>
        </div>

        <button type="submit" disabled={isDisabled} style={buttonStyle}>
          {form.loading ? mergedCopy.loadingText : mergedCopy.submitButton}
        </button>

        {form.error && <div style={mergedStyles.errorText}>{form.error}</div>}
      </form>

      {(showForgotPassword || showSignupLink || showMagicLinkOption) && (
        <div style={mergedStyles.linkContainer}>
          {showMagicLinkOption && (
            <div>
              <span style={mergedStyles.divider}>{mergedCopy.magicLinkText} </span>
              <a onClick={onMagicLinkClick} style={mergedStyles.link}>
                {mergedCopy.magicLinkLink}
              </a>
            </div>
          )}

          {showMagicLinkOption && (showForgotPassword || showSignupLink) && (
            <div style={mergedStyles.divider}>{mergedCopy.dividerBullet}</div>
          )}

          {showForgotPassword && (
            <a onClick={onForgotPassword} style={mergedStyles.link}>
              {mergedCopy.forgotPasswordLink}
            </a>
          )}

          {showForgotPassword && showSignupLink && (
            <div style={mergedStyles.divider}>{mergedCopy.dividerBullet}</div>
          )}

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
