import { useState } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useTenantOptional } from '../providers/TenantProvider';
import { useAuthForm } from '../hooks/useAuthForm';
import { AuthFormBaseStyles, buildFormStyles } from './authFormShared';

export interface SignupFormCopy {
  title?: string;
  nameLabel?: string;
  namePlaceholder?: string;
  lastNameLabel?: string;
  lastNamePlaceholder?: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  phoneNumberLabel?: string;
  phoneNumberPlaceholder?: string;
  passwordLabel?: string;
  passwordPlaceholder?: string;
  confirmPasswordLabel?: string;
  confirmPasswordPlaceholder?: string;
  tenantNameLabel?: string;
  tenantNamePlaceholder?: string;
  submitButton?: string;
  loginLink?: string;
  loginText?: string;
  magicLinkText?: string;
  magicLinkLink?: string;
  errorMessage?: string;
  loadingText?: string;
  passwordMismatchError?: string;
  isAdminLabel?: string;
  isAdminDescription?: string;
  contactMethodHint?: string;
  tenantNotFoundError?: string;
  dividerBullet?: string;
}

export type SignupFormStyles = AuthFormBaseStyles;

export type SignupType = 'user' | 'tenant';

export interface SignupFormProps {
  copy?: SignupFormCopy;
  styles?: SignupFormStyles;
  signupType?: SignupType;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  onLoginClick?: () => void;
  onMagicLinkClick?: () => void;
  showLoginLink?: boolean;
  showMagicLinkOption?: boolean;
  className?: string;
}

const defaultCopy: Required<SignupFormCopy> = {
  title: 'Create Account',
  nameLabel: 'First Name',
  namePlaceholder: 'Enter your first name',
  lastNameLabel: 'Last Name',
  lastNamePlaceholder: 'Enter your last name',
  emailLabel: 'Email',
  emailPlaceholder: 'Enter your email',
  phoneNumberLabel: 'Phone Number',
  phoneNumberPlaceholder: 'Enter your phone number',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Enter your password',
  confirmPasswordLabel: 'Confirm Password',
  confirmPasswordPlaceholder: 'Confirm your password',
  tenantNameLabel: 'Organization Name',
  tenantNamePlaceholder: 'Enter your organization name',
  submitButton: 'Create Account',
  loginLink: 'Sign in here',
  loginText: 'Already have an account?',
  magicLinkText: 'Prefer passwordless?',
  magicLinkLink: 'Use Magic Link',
  errorMessage: 'Failed to create account',
  loadingText: 'Creating account...',
  passwordMismatchError: 'Passwords do not match',
  isAdminLabel: 'Create new organization',
  isAdminDescription: 'Check this if you want to create a new organization',
  contactMethodHint: 'At least one contact method (email or phone) is required',
  tenantNotFoundError: 'Tenant not found',
  dividerBullet: '•',
};

type SignupField =
  | 'name'
  | 'email'
  | 'phoneNumber'
  | 'password'
  | 'confirmPassword'
  | 'tenantName';

export function SignupForm({
  copy = {},
  styles = {},
  signupType = 'user',
  onSuccess,
  onError,
  onLoginClick,
  onMagicLinkClick,
  showLoginLink = true,
  showMagicLinkOption = true,
  className,
}: SignupFormProps) {
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tenantName, setTenantName] = useState('');

  const { signup, signupTenantAdmin } = useAuth();
  const tenant = useTenantOptional()?.tenant ?? null;

  const mergedCopy = { ...defaultCopy, ...copy };
  const mergedStyles = buildFormStyles('#10b981', styles);

  const isFormValid =
    !!name &&
    (!!email || !!phoneNumber) &&
    !!password &&
    !!confirmPassword &&
    (signupType === 'user' || !!tenantName);

  const form = useAuthForm<unknown, SignupField>({
    defaultErrorMessage: mergedCopy.errorMessage,
    validate: () => {
      const missing: SignupField[] = [];
      if (!name.trim()) missing.push('name');
      if (!email.trim() && !phoneNumber.trim()) {
        missing.push('email');
        missing.push('phoneNumber');
      }
      if (!password.trim()) missing.push('password');
      if (!confirmPassword.trim()) missing.push('confirmPassword');
      if (signupType === 'tenant' && !tenantName.trim()) missing.push('tenantName');

      missing.forEach(f => form.setFieldError(f, true));
      if (missing.length > 0) return false;

      if (password !== confirmPassword) {
        form.setError(mergedCopy.passwordMismatchError);
        form.setFieldError('confirmPassword', true);
        return false;
      }

      if (signupType === 'user' && !tenant?.id) {
        form.setError(mergedCopy.tenantNotFoundError);
        return false;
      }

      return true;
    },
    submit: async () => {
      if (signupType === 'tenant') {
        return signupTenantAdmin({
          email: email || undefined,
          phoneNumber: phoneNumber || undefined,
          name,
          password,
          tenantName,
          lastName: lastName || undefined,
        });
      }
      return signup({
        email: email || undefined,
        phoneNumber: phoneNumber || undefined,
        name,
        password,
        tenantId: tenant!.id,
        lastName: lastName || undefined,
      });
    },
    onSuccess,
    onError,
  });

  const getInputStyle = (field: SignupField) => ({
    ...mergedStyles.input,
    ...(form.fieldErrors[field] ? mergedStyles.inputError : {}),
  });

  const isDisabled = !isFormValid || form.loading;
  const buttonStyle = {
    ...mergedStyles.button,
    ...(form.loading ? mergedStyles.buttonLoading : {}),
    ...(isDisabled ? mergedStyles.buttonDisabled : {}),
  };

  const onEmailOrPhoneChange = () => {
    form.clearFieldError('email');
    form.clearFieldError('phoneNumber');
  };

  return (
    <div className={className} style={mergedStyles.container}>
      <h2 style={mergedStyles.title}>{mergedCopy.title}</h2>

      <form onSubmit={form.handleSubmit} style={mergedStyles.form}>
        <div style={mergedStyles.fieldGroup}>
          <label style={mergedStyles.label}>{mergedCopy.nameLabel}</label>
          <input
            id="name"
            name="name"
            type="text"
            value={name}
            onChange={e => {
              setName(e.target.value);
              form.clearFieldError('name');
            }}
            placeholder={mergedCopy.namePlaceholder}
            style={getInputStyle('name')}
            disabled={form.loading}
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
            disabled={form.loading}
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
              onEmailOrPhoneChange();
            }}
            placeholder={mergedCopy.emailPlaceholder}
            style={getInputStyle('email')}
            disabled={form.loading}
          />
        </div>

        <div style={mergedStyles.fieldGroup}>
          <label style={mergedStyles.label}>{mergedCopy.phoneNumberLabel}</label>
          <input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            value={phoneNumber}
            onChange={e => {
              setPhoneNumber(e.target.value);
              onEmailOrPhoneChange();
            }}
            placeholder={mergedCopy.phoneNumberPlaceholder}
            style={getInputStyle('phoneNumber')}
            disabled={form.loading}
          />
        </div>

        <div style={mergedStyles.hintText}>{mergedCopy.contactMethodHint}</div>

        <div style={mergedStyles.fieldGroup}>
          <label style={mergedStyles.label}>{mergedCopy.passwordLabel}</label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={e => {
              setPassword(e.target.value);
              form.clearFieldError('password');
            }}
            placeholder={mergedCopy.passwordPlaceholder}
            style={getInputStyle('password')}
            disabled={form.loading}
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
              form.clearFieldError('confirmPassword');
              if (form.error === mergedCopy.passwordMismatchError) {
                form.setError('');
              }
            }}
            placeholder={mergedCopy.confirmPasswordPlaceholder}
            style={getInputStyle('confirmPassword')}
            disabled={form.loading}
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
                form.clearFieldError('tenantName');
              }}
              placeholder={mergedCopy.tenantNamePlaceholder}
              style={getInputStyle('tenantName')}
              disabled={form.loading}
            />
          </div>
        )}

        <button type="submit" disabled={isDisabled} style={buttonStyle}>
          {form.loading ? mergedCopy.loadingText : mergedCopy.submitButton}
        </button>

        {form.error && <div style={mergedStyles.errorText}>{form.error}</div>}
      </form>

      {(showLoginLink || showMagicLinkOption) && (
        <div style={mergedStyles.linkContainer}>
          {showMagicLinkOption && (
            <div>
              <span style={mergedStyles.divider}>{mergedCopy.magicLinkText} </span>
              <a onClick={onMagicLinkClick} style={mergedStyles.link}>
                {mergedCopy.magicLinkLink}
              </a>
            </div>
          )}

          {showMagicLinkOption && showLoginLink && (
            <div style={mergedStyles.divider}>{mergedCopy.dividerBullet}</div>
          )}

          {showLoginLink && (
            <div>
              <span style={mergedStyles.divider}>{mergedCopy.loginText} </span>
              <a onClick={onLoginClick} style={mergedStyles.link}>
                {mergedCopy.loginLink}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
