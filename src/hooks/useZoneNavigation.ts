import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { useTenant } from '../providers/TenantProvider';
import { UserType } from '../types/api';
import {
  DEFAULT_ZONE_ROOTS,
  ReturnToStorage,
  ZoneRoots,
  UseZoneNavigationReturn,
} from '../types/zoneRouting';

const DEFAULT_RETURN_TO_PARAM = 'returnTo';
const RETURN_TO_SESSION_KEY = 'zone_return_to';
const RETURN_TO_LOCAL_KEY = 'zone_return_to';

interface UseZoneNavigationOptions {
  zoneRoots?: ZoneRoots;
  returnToParam?: string;
  returnToStorage?: ReturnToStorage;
}

/**
 * Hook for zone-based navigation utilities
 */
export function useZoneNavigation(options: UseZoneNavigationOptions = {}): UseZoneNavigationReturn {
  const {
    zoneRoots = {},
    returnToParam = DEFAULT_RETURN_TO_PARAM,
    returnToStorage = 'url',
  } = options;

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, currentUser } = useAuth();
  const { tenant } = useTenant();

  const mergedZoneRoots = useMemo(() => ({ ...DEFAULT_ZONE_ROOTS, ...zoneRoots }), [zoneRoots]);

  const hasTenant = Boolean(tenant);
  const userType = currentUser?.userType;

  /**
   * Get return URL from storage
   */
  const returnToUrl = useMemo((): string | null => {
    switch (returnToStorage) {
      case 'url':
        return searchParams.get(returnToParam);
      case 'session':
        return sessionStorage.getItem(RETURN_TO_SESSION_KEY);
      case 'local':
        return localStorage.getItem(RETURN_TO_LOCAL_KEY);
      default:
        return null;
    }
  }, [returnToStorage, searchParams, returnToParam]);

  /**
   * Clear return URL from storage
   */
  const clearReturnTo = useCallback(() => {
    switch (returnToStorage) {
      case 'url': {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete(returnToParam);
        setSearchParams(newParams, { replace: true });
        break;
      }
      case 'session':
        sessionStorage.removeItem(RETURN_TO_SESSION_KEY);
        break;
      case 'local':
        localStorage.removeItem(RETURN_TO_LOCAL_KEY);
        break;
    }
  }, [returnToStorage, searchParams, returnToParam, setSearchParams]);

  /**
   * Set return URL in storage
   */
  const setReturnTo = useCallback(
    (url: string) => {
      switch (returnToStorage) {
        case 'url': {
          const newParams = new URLSearchParams(searchParams);
          newParams.set(returnToParam, url);
          setSearchParams(newParams, { replace: true });
          break;
        }
        case 'session':
          sessionStorage.setItem(RETURN_TO_SESSION_KEY, url);
          break;
        case 'local':
          localStorage.setItem(RETURN_TO_LOCAL_KEY, url);
          break;
      }
    },
    [returnToStorage, searchParams, returnToParam, setSearchParams]
  );

  /**
   * Navigate to a specific zone root
   */
  const navigateToZone = useCallback(
    (zone: keyof ZoneRoots) => {
      const path = mergedZoneRoots[zone] || mergedZoneRoots.default;
      navigate(path);
    },
    [navigate, mergedZoneRoots]
  );

  /**
   * Get smart redirect based on current state
   */
  const getSmartRedirect = useCallback((): string => {
    if (!hasTenant) {
      // No tenant context
      if (!isAuthenticated) {
        return mergedZoneRoots.publicGuest;
      }
      if (userType === UserType.TENANT_ADMIN) {
        return mergedZoneRoots.publicAdmin;
      }
      return mergedZoneRoots.publicUser;
    } else {
      // Has tenant context
      if (!isAuthenticated) {
        return mergedZoneRoots.tenantGuest;
      }
      if (userType === UserType.TENANT_ADMIN) {
        return mergedZoneRoots.tenantAdmin;
      }
      return mergedZoneRoots.tenantUser;
    }
  }, [hasTenant, isAuthenticated, userType, mergedZoneRoots]);

  return {
    returnToUrl,
    clearReturnTo,
    setReturnTo,
    navigateToZone,
    getSmartRedirect,
  };
}

/**
 * Build redirect URL with return path
 */
export function buildRedirectUrl(
  redirectTo: string,
  returnPath: string | null,
  returnToParam: string = DEFAULT_RETURN_TO_PARAM,
  returnToStorage: ReturnToStorage = 'url'
): string {
  if (!returnPath || returnToStorage !== 'url') {
    return redirectTo;
  }

  const url = new URL(redirectTo, window.location.origin);
  url.searchParams.set(returnToParam, returnPath);
  return url.pathname + url.search;
}
