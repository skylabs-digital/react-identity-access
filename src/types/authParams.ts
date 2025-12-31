/**
 * Auth method parameter types for object-based API (RFC-002)
 */

export interface LoginParams {
  username: string;
  password: string;
  tenantSlug?: string; // Target tenant slug for auto-switch (RFC-001)
  redirectPath?: string; // Path to redirect after login (used with tenant switch)
  autoSwitch?: boolean;
}

export interface SignupParams {
  email?: string;
  phoneNumber?: string;
  name: string;
  password: string;
  lastName?: string;
  tenantId?: string; // Override context if needed
}

export interface SignupTenantAdminParams {
  email?: string;
  phoneNumber?: string;
  name: string;
  password: string;
  tenantName: string;
  lastName?: string;
}

export interface SendMagicLinkParams {
  email: string;
  frontendUrl: string;
  name?: string;
  lastName?: string;
  tenantId?: string; // Override context if needed
}

export interface VerifyMagicLinkParams {
  token: string;
  email: string;
  tenantSlug?: string; // Target tenant slug for auto-switch (RFC-001)
}

export interface RequestPasswordResetParams {
  email: string;
  tenantId?: string; // Override context if needed
}

export interface ConfirmPasswordResetParams {
  token: string;
  newPassword: string;
}

export interface ChangePasswordParams {
  currentPassword: string;
  newPassword: string;
}
