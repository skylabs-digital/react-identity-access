import { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useTenantOptional } from '../providers/TenantProvider';
import { useAuthForm } from '../hooks/useAuthForm';
import { AuthFormBaseStyles, buildFormStyles } from './authFormShared';

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
  verifyingDescription?: string;
  description?: string;
  showNameToggle?: string;
  hideNameToggle?: string;
  tenantNotFoundError?: string;
  missingTenantOrEmailError?: string;
  dividerBullet?: string;
}

export type MagicLinkFormStyles = AuthFormBaseStyles;

export interface MagicLinkFormProps {
  copy?: MagicLinkFormCopy;
  styles?: MagicLinkFormStyles;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  onLoginClick?: () => void;
  onSignupClick?: () => void;
  showTraditionalLinks?: boolean;
  className?: string;
  verifyToken?: string;
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
  verifyingDescription: 'Please wait while we verify your magic link...',
  description:
    "Enter your email to receive a magic link. If you don't have an account, we'll create one for you.",
  showNameToggle: 'New user? Add your name',
  hideNameToggle: 'Existing user? Hide name fields',
  tenantNotFoundError: 'Tenant not found',
  missingTenantOrEmailError: 'Missing tenant or email',
  dividerBullet: '•',
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
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState('');
  const [showNameFields, setShowNameFields] = useState(false);

  const { sendMagicLink, verifyMagicLink } = useAuth();
  const tenant = useTenantOptional()?.tenant ?? null;

  const mergedCopy = { ...defaultCopy, ...copy };
  const mergedStyles = buildFormStyles('#3b82f6', styles);

  type Field = 'email' | 'name';
  const form = useAuthForm<unknown, Field>({
    defaultErrorMessage: mergedCopy.errorMessage,
    validate: () => {
      const missing: Field[] = [];
      if (!email.trim()) missing.push('email');
      if (showNameFields && !name.trim()) missing.push('name');
      missing.forEach(f => form.setFieldError(f, true));
      if (missing.length > 0) return false;
      if (!tenant?.id) {
        form.setError(mergedCopy.tenantNotFoundError);
        return false;
      }
      return true;
    },
    submit: async () => {
      setSuccess('');
      const finalFrontendUrl =
        frontendUrl || (typeof window !== 'undefined' ? window.location.origin : '');
      const result = await sendMagicLink({
        email,
        tenantId: tenant!.id,
        frontendUrl: finalFrontendUrl,
        name: showNameFields ? name : undefined,
        lastName: showNameFields ? lastName : undefined,
      });
      setSuccess(mergedCopy.successMessage);
      return result;
    },
    onSuccess,
    onError,
  });

  useEffect(() => {
    if (!verifyToken) return;

    const run = async () => {
      if (!tenant || !email) {
        form.setError(mergedCopy.missingTenantOrEmailError);
        return;
      }
      setVerifying(true);
      form.setError('');
      try {
        const result = await verifyMagicLink({ token: verifyToken, email });
        onSuccess?.(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to verify magic link';
        form.setError(message);
        onError?.(message);
      } finally {
        setVerifying(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifyToken]);

  const getInputStyle = (field: Field) => ({
    ...mergedStyles.input,
    ...(form.fieldErrors[field] ? mergedStyles.inputError : {}),
  });

  const isDisabled = !email || form.loading || verifying;
  const buttonStyle = {
    ...mergedStyles.button,
    ...(form.loading || verifying ? mergedStyles.buttonLoading : {}),
    ...(isDisabled ? mergedStyles.buttonDisabled : {}),
  };

  if (verifying) {
    return (
      <div className={className} style={mergedStyles.container}>
        <h2 style={mergedStyles.title}>{mergedCopy.verifyingText}</h2>
        <div style={mergedStyles.verifyingContainer}>
          <div style={mergedStyles.verifyingText}>{mergedCopy.verifyingDescription}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={mergedStyles.container}>
      <h2 style={mergedStyles.title}>{mergedCopy.title}</h2>
      <p style={mergedStyles.description}>{mergedCopy.description}</p>

      <form onSubmit={form.handleSubmit} style={mergedStyles.form}>
        <div style={mergedStyles.fieldGroup}>
          <label style={mergedStyles.label}>{mergedCopy.emailLabel}</label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={e => {
              setEmail(e.target.value);
              form.clearFieldError('email');
            }}
            placeholder={mergedCopy.emailPlaceholder}
            style={getInputStyle('email')}
            disabled={form.loading || verifying}
          />
        </div>

        {!showNameFields && (
          <div style={mergedStyles.toggleContainer}>
            <button
              type="button"
              onClick={() => setShowNameFields(true)}
              style={mergedStyles.toggleLink}
            >
              {mergedCopy.showNameToggle}
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
                  form.clearFieldError('name');
                }}
                placeholder={mergedCopy.namePlaceholder}
                style={getInputStyle('name')}
                disabled={form.loading || verifying}
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
                disabled={form.loading || verifying}
              />
            </div>

            <div style={mergedStyles.toggleContainer}>
              <button
                type="button"
                onClick={() => {
                  setShowNameFields(false);
                  setName('');
                  setLastName('');
                }}
                style={mergedStyles.toggleLink}
              >
                {mergedCopy.hideNameToggle}
              </button>
            </div>
          </>
        )}

        <button type="submit" disabled={isDisabled} style={buttonStyle}>
          {form.loading ? mergedCopy.loadingText : mergedCopy.submitButton}
        </button>

        {form.error && <div style={mergedStyles.errorText}>{form.error}</div>}
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

          <div style={mergedStyles.divider}>{mergedCopy.dividerBullet}</div>

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
