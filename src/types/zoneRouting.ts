import { ReactNode } from 'react';
import { UserType } from './api';

/**
 * Access mode for zone requirements
 * - 'required': Must match condition (redirect if not)
 * - 'forbidden': Must NOT match condition (redirect if matches)
 * - 'optional': Can be either (no redirect)
 */
export type AccessMode = 'required' | 'forbidden' | 'optional';

/**
 * Reason types for access denial
 */
export type AccessDeniedType =
  | 'no_tenant'
  | 'has_tenant'
  | 'not_authenticated'
  | 'already_authenticated'
  | 'wrong_user_type'
  | 'missing_permissions';

/**
 * Detailed reason object passed to callbacks when access is denied
 */
export interface AccessDeniedReason {
  type: AccessDeniedType;
  required?: {
    tenant?: AccessMode;
    auth?: AccessMode;
    userType?: UserType | UserType[];
    permissions?: string[];
  };
  current?: {
    hasTenant: boolean;
    isAuthenticated: boolean;
    userType?: UserType;
    permissions?: string[];
  };
  redirectTo: string;
}

/**
 * Zone root paths for automatic redirects
 */
export interface ZoneRoots {
  publicGuest?: string;
  publicUser?: string;
  publicAdmin?: string;
  tenantGuest?: string;
  tenantUser?: string;
  tenantAdmin?: string;
  default?: string;
}

/**
 * Default zone roots
 */
export const DEFAULT_ZONE_ROOTS: Required<ZoneRoots> = {
  publicGuest: '/',
  publicUser: '/account',
  publicAdmin: '/admin',
  tenantGuest: '/login',
  tenantUser: '/dashboard',
  tenantAdmin: '/admin/dashboard',
  default: '/',
};

/**
 * Preset zone configuration
 */
export interface ZonePresetConfig {
  tenant?: AccessMode;
  auth?: AccessMode;
  userType?: UserType | UserType[];
  requiredPermissions?: string[];
}

/**
 * Built-in zone presets
 */
export interface ZonePresets {
  // Public/Landing zones
  landing: ZonePresetConfig;
  publicOnly: ZonePresetConfig;

  // Auth zones
  login: ZonePresetConfig;
  guest: ZonePresetConfig;
  authenticated: ZonePresetConfig;

  // Tenant zones
  tenant: ZonePresetConfig;
  tenantOpen: ZonePresetConfig;
  tenantAuth: ZonePresetConfig;

  // User type zones
  user: ZonePresetConfig;
  admin: ZonePresetConfig;

  // Fully open
  open: ZonePresetConfig;
}

/**
 * Default preset configurations
 */
export const DEFAULT_ZONE_PRESETS: ZonePresets = {
  // Public/Landing zones
  landing: { tenant: 'forbidden', auth: 'optional' },
  publicOnly: { tenant: 'forbidden', auth: 'forbidden' },

  // Auth zones
  login: { tenant: 'required', auth: 'forbidden' },
  guest: { auth: 'forbidden' },
  authenticated: { auth: 'required' },

  // Tenant zones
  tenant: { tenant: 'required' },
  tenantOpen: { tenant: 'required', auth: 'optional' },
  tenantAuth: { tenant: 'required', auth: 'required' },

  // User type zones
  user: { tenant: 'required', auth: 'required', userType: UserType.USER },
  admin: { tenant: 'required', auth: 'required', userType: UserType.TENANT_ADMIN },

  // Fully open
  open: { tenant: 'optional', auth: 'optional' },
};

/**
 * Return URL storage options
 */
export type ReturnToStorage = 'url' | 'session' | 'local';

/**
 * Routing configuration for AuthProvider
 */
export interface RoutingConfig {
  zoneRoots?: ZoneRoots;
  presets?: Partial<ZonePresets>;
  loadingFallback?: ReactNode;
  accessDeniedFallback?: ReactNode;
  onAccessDenied?: (reason: AccessDeniedReason) => void;
  returnToParam?: string;
  returnToStorage?: ReturnToStorage;
}

/**
 * Props for ZoneRoute component
 */
export interface ZoneRouteProps {
  children: ReactNode;

  // Preset (shorthand for common configurations)
  preset?: keyof ZonePresets | string;

  // Zone requirements with access modes
  tenant?: AccessMode;
  auth?: AccessMode;

  // User type requirements (only applies when auth='required')
  userType?: UserType | UserType[];

  // Permission requirements
  requiredPermissions?: string[];
  requireAllPermissions?: boolean;

  // Return URL handling
  returnTo?: boolean | string;

  // Callbacks
  onAccessDenied?: (reason: AccessDeniedReason) => void;

  // Fallback states (override global config)
  redirectTo?: string;
  loadingFallback?: ReactNode;
  accessDeniedFallback?: ReactNode;
}

/**
 * Zone navigation hook return type
 */
export interface UseZoneNavigationReturn {
  returnToUrl: string | null;
  clearReturnTo: () => void;
  setReturnTo: (url: string) => void;
  navigateToZone: (zone: keyof ZoneRoots) => void;
  getSmartRedirect: () => string;
}
