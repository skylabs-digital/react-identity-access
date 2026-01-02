import { FC, useEffect, useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { useTenant } from '../providers/TenantProvider';
import { useRoutingOptional } from '../providers/RoutingProvider';
import { UserType } from '../types/api';
import {
  AccessMode,
  AccessDeniedReason,
  AccessDeniedType,
  ZoneRouteProps,
  ZonePresetConfig,
  ZoneRoots,
  ReturnToStorage,
} from '../types/zoneRouting';

interface ZoneState {
  hasTenant: boolean;
  isAuthenticated: boolean;
  userType?: UserType;
  permissions: string[];
  isLoading: boolean;
}

/**
 * Check if user type matches requirement
 */
function matchesUserType(
  currentType: UserType | undefined,
  required: UserType | UserType[] | undefined
): boolean {
  if (!required) return true;
  if (!currentType) return false;

  if (Array.isArray(required)) {
    return required.includes(currentType);
  }
  return currentType === required;
}

/**
 * Check access mode condition
 */
function checkAccessMode(
  mode: AccessMode | undefined,
  condition: boolean
): 'pass' | 'fail' | 'skip' {
  if (!mode || mode === 'optional') return 'skip';
  if (mode === 'required') return condition ? 'pass' : 'fail';
  if (mode === 'forbidden') return condition ? 'fail' : 'pass';
  return 'skip';
}

/**
 * Determine access denied type based on requirements and state
 */
function getAccessDeniedType(
  requirements: {
    tenant?: AccessMode;
    auth?: AccessMode;
    userType?: UserType | UserType[];
    permissions?: string[];
    requireAllPermissions?: boolean;
  },
  state: ZoneState
): AccessDeniedType | null {
  // Check tenant requirement
  const tenantCheck = checkAccessMode(requirements.tenant, state.hasTenant);
  if (tenantCheck === 'fail') {
    return state.hasTenant ? 'has_tenant' : 'no_tenant';
  }

  // Check auth requirement
  const authCheck = checkAccessMode(requirements.auth, state.isAuthenticated);
  if (authCheck === 'fail') {
    return state.isAuthenticated ? 'already_authenticated' : 'not_authenticated';
  }

  // Check user type (only if auth is required or optional with authenticated user)
  if (requirements.userType && state.isAuthenticated) {
    if (!matchesUserType(state.userType, requirements.userType)) {
      return 'wrong_user_type';
    }
  }

  // Check permissions
  if (requirements.permissions && requirements.permissions.length > 0) {
    const checkFn =
      requirements.requireAllPermissions !== false
        ? (perms: string[]) => perms.every(p => state.permissions.includes(p))
        : (perms: string[]) => perms.some(p => state.permissions.includes(p));
    if (!checkFn(requirements.permissions)) {
      return 'missing_permissions';
    }
  }

  return null;
}

/**
 * Get smart redirect based on current state
 */
function getSmartRedirect(state: ZoneState, zoneRoots: Required<ZoneRoots>): string {
  if (!state.hasTenant) {
    if (!state.isAuthenticated) return zoneRoots.publicGuest;
    if (state.userType === UserType.TENANT_ADMIN) return zoneRoots.publicAdmin;
    return zoneRoots.publicUser;
  } else {
    if (!state.isAuthenticated) return zoneRoots.tenantGuest;
    if (state.userType === UserType.TENANT_ADMIN) return zoneRoots.tenantAdmin;
    return zoneRoots.tenantUser;
  }
}

/**
 * Build redirect URL with return path
 */
function buildRedirectUrl(
  redirectTo: string,
  returnPath: string | boolean | undefined,
  currentPath: string,
  returnToParam: string,
  returnToStorage: ReturnToStorage
): string {
  if (!returnPath || returnToStorage !== 'url') {
    return redirectTo;
  }

  const returnUrl = typeof returnPath === 'string' ? returnPath : currentPath;
  const separator = redirectTo.includes('?') ? '&' : '?';
  return `${redirectTo}${separator}${returnToParam}=${encodeURIComponent(returnUrl)}`;
}

/**
 * Store return URL in session/local storage
 */
function storeReturnUrl(
  returnPath: string | boolean | undefined,
  currentPath: string,
  returnToStorage: ReturnToStorage
): void {
  if (!returnPath || returnToStorage === 'url') return;

  const returnUrl = typeof returnPath === 'string' ? returnPath : currentPath;
  const key = 'zone_return_to';

  if (returnToStorage === 'session') {
    sessionStorage.setItem(key, returnUrl);
  } else if (returnToStorage === 'local') {
    localStorage.setItem(key, returnUrl);
  }
}

/**
 * ZoneRoute - Unified route protection component
 *
 * Replaces TenantRoute, LandingRoute, and ProtectedRoute with a single
 * flexible component that supports:
 * - Tenant context requirements (required/forbidden/optional)
 * - Authentication requirements (required/forbidden/optional)
 * - User type filtering
 * - Permission checks
 * - Smart redirects
 * - Return URL handling
 */
export const ZoneRoute: FC<ZoneRouteProps> = ({
  children,
  preset,
  tenant: tenantMode,
  auth: authMode,
  userType,
  requiredPermissions,
  requireAllPermissions = true,
  returnTo,
  onAccessDenied,
  redirectTo,
  loadingFallback,
  accessDeniedFallback,
}) => {
  const location = useLocation();
  const { isAuthenticated, isAuthInitializing, currentUser, userPermissions } = useAuth();
  const { tenant, isTenantLoading } = useTenant();

  // Get global routing config (works with or without RoutingProvider)
  const routingConfig = useRoutingOptional();

  // Resolve preset configuration from global config
  const presetConfig: ZonePresetConfig | undefined = useMemo(() => {
    if (!preset) return undefined;
    return routingConfig.presets[preset as keyof typeof routingConfig.presets];
  }, [preset, routingConfig.presets]);

  // Merge preset with explicit props (explicit props take precedence)
  const requirements = useMemo(
    () => ({
      tenant: tenantMode ?? presetConfig?.tenant,
      auth: authMode ?? presetConfig?.auth,
      userType: userType ?? presetConfig?.userType,
      permissions: requiredPermissions ?? presetConfig?.requiredPermissions,
      requireAllPermissions,
    }),
    [tenantMode, authMode, userType, requiredPermissions, presetConfig, requireAllPermissions]
  );

  // Current state
  const state: ZoneState = useMemo(
    () => ({
      hasTenant: Boolean(tenant),
      isAuthenticated,
      userType: currentUser?.userType,
      permissions: userPermissions,
      isLoading: isAuthInitializing || isTenantLoading,
    }),
    [
      tenant,
      isAuthenticated,
      currentUser?.userType,
      userPermissions,
      isAuthInitializing,
      isTenantLoading,
    ]
  );

  // Check access
  const accessDeniedType = useMemo(() => {
    if (state.isLoading) return null;
    return getAccessDeniedType(requirements, state);
  }, [requirements, state]);

  // Calculate redirect target using global config
  const redirectTarget = useMemo(() => {
    if (!accessDeniedType) return null;
    return redirectTo || getSmartRedirect(state, routingConfig.zoneRoots);
  }, [accessDeniedType, redirectTo, state, routingConfig.zoneRoots]);

  // Build access denied reason
  const accessDeniedReason: AccessDeniedReason | null = useMemo(() => {
    if (!accessDeniedType || !redirectTarget) return null;
    return {
      type: accessDeniedType,
      required: {
        tenant: requirements.tenant,
        auth: requirements.auth,
        userType: requirements.userType,
        permissions: requirements.permissions,
      },
      current: {
        hasTenant: state.hasTenant,
        isAuthenticated: state.isAuthenticated,
        userType: state.userType,
        permissions: state.permissions,
      },
      redirectTo: redirectTarget,
    };
  }, [accessDeniedType, redirectTarget, requirements, state]);

  // Call onAccessDenied callback (local or global)
  useEffect(() => {
    if (accessDeniedReason) {
      // Local callback takes precedence
      if (onAccessDenied) {
        onAccessDenied(accessDeniedReason);
      } else if (routingConfig.onAccessDenied) {
        routingConfig.onAccessDenied(accessDeniedReason);
      }
    }
  }, [accessDeniedReason, onAccessDenied, routingConfig]);

  // Handle return URL storage for non-URL storage modes
  useEffect(() => {
    if (accessDeniedReason && returnTo) {
      storeReturnUrl(returnTo, location.pathname + location.search, routingConfig.returnToStorage);
    }
  }, [
    accessDeniedReason,
    returnTo,
    location.pathname,
    location.search,
    routingConfig.returnToStorage,
  ]);

  // Loading state (local fallback takes precedence over global)
  if (state.isLoading) {
    return <>{loadingFallback ?? routingConfig.loadingFallback ?? null}</>;
  }

  // Access denied - redirect
  if (accessDeniedReason && redirectTarget) {
    // Show access denied fallback briefly before redirect (local or global)
    const fallback = accessDeniedFallback ?? routingConfig.accessDeniedFallback;
    if (fallback) {
      return <>{fallback}</>;
    }

    // Build final redirect URL with return path if needed
    const finalRedirect = buildRedirectUrl(
      redirectTarget,
      returnTo,
      location.pathname + location.search,
      routingConfig.returnToParam,
      routingConfig.returnToStorage
    );

    return <Navigate to={finalRedirect} replace />;
  }

  // Access granted
  return <>{children}</>;
};

// Convenience components

export const TenantZone: FC<Omit<ZoneRouteProps, 'tenant'>> = props => (
  <ZoneRoute tenant="required" {...props} />
);

export const PublicZone: FC<Omit<ZoneRouteProps, 'tenant'>> = props => (
  <ZoneRoute tenant="forbidden" {...props} />
);

export const AuthenticatedZone: FC<Omit<ZoneRouteProps, 'auth'>> = props => (
  <ZoneRoute auth="required" {...props} />
);

export const GuestZone: FC<Omit<ZoneRouteProps, 'auth'>> = props => (
  <ZoneRoute auth="forbidden" {...props} />
);

export const AdminZone: FC<Omit<ZoneRouteProps, 'auth' | 'userType'>> = props => (
  <ZoneRoute auth="required" userType={UserType.TENANT_ADMIN} {...props} />
);

export const UserZone: FC<Omit<ZoneRouteProps, 'auth' | 'userType'>> = props => (
  <ZoneRoute auth="required" userType={UserType.USER} {...props} />
);

export const OpenZone: FC<Omit<ZoneRouteProps, 'tenant' | 'auth'>> = props => (
  <ZoneRoute tenant="optional" auth="optional" {...props} />
);

export const TenantAuthenticatedZone: FC<Omit<ZoneRouteProps, 'tenant' | 'auth'>> = props => (
  <ZoneRoute tenant="required" auth="required" {...props} />
);

export const TenantOpenZone: FC<Omit<ZoneRouteProps, 'tenant' | 'auth'>> = props => (
  <ZoneRoute tenant="required" auth="optional" {...props} />
);

export const TenantGuestZone: FC<Omit<ZoneRouteProps, 'tenant' | 'auth'>> = props => (
  <ZoneRoute tenant="required" auth="forbidden" {...props} />
);

export default ZoneRoute;
