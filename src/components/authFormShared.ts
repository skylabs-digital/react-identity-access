import React from 'react';

export interface AuthFormBaseStyles {
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
  inputWithIcon?: React.CSSProperties;
  successText?: React.CSSProperties;
  hintText?: React.CSSProperties;
  description?: React.CSSProperties;
  verifyingContainer?: React.CSSProperties;
  verifyingText?: React.CSSProperties;
  toggleContainer?: React.CSSProperties;
  toggleLink?: React.CSSProperties;
  subtitle?: React.CSSProperties;
  modeSwitchDivider?: React.CSSProperties;
}

export const baseFormStyles: Required<AuthFormBaseStyles> = {
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
  inputWithIcon: {
    paddingRight: '2.5rem',
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
  hintText: {
    fontSize: '0.875rem',
    color: '#6b7280',
    textAlign: 'center',
    margin: '0.5rem 0',
  },
  description: {
    fontSize: '0.875rem',
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: '1.5rem',
    lineHeight: '1.5',
  },
  verifyingContainer: {
    textAlign: 'center',
    padding: '2rem',
  },
  verifyingText: {
    fontSize: '1rem',
    color: '#6b7280',
  },
  toggleContainer: {
    textAlign: 'center',
    marginTop: '0.5rem',
  },
  toggleLink: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    fontSize: '0.875rem',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  subtitle: {
    fontSize: '0.875rem',
    textAlign: 'center',
    marginBottom: '1.5rem',
    color: '#6b7280',
    lineHeight: '1.4',
  },
  modeSwitchDivider: {
    margin: '0 0.5rem',
    color: '#6b7280',
  },
};

/**
 * Build a merged form styles object that uses `baseFormStyles` as the base,
 * overrides the button background color, then layers user overrides on top.
 */
export function buildFormStyles(
  buttonBackgroundColor: string,
  userStyles?: Partial<AuthFormBaseStyles>
): Required<AuthFormBaseStyles> {
  return {
    ...baseFormStyles,
    ...userStyles,
    button: {
      ...baseFormStyles.button,
      backgroundColor: buttonBackgroundColor,
      ...(userStyles?.button || {}),
    },
  };
}

// --- Shared password toggle icons (SVG) ---

export const EyeIcon = (): React.ReactElement =>
  React.createElement(
    'svg',
    {
      width: '16',
      height: '16',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      style: { flexShrink: 0 },
    },
    React.createElement('path', { d: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' }),
    React.createElement('circle', { cx: '12', cy: '12', r: '3' })
  );

export const EyeOffIcon = (): React.ReactElement =>
  React.createElement(
    'svg',
    {
      width: '16',
      height: '16',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      style: { flexShrink: 0 },
    },
    React.createElement('path', {
      d: 'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24',
    }),
    React.createElement('line', { x1: '1', y1: '1', x2: '23', y2: '23' })
  );
