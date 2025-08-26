import { useCallback } from 'react';
import { useIdentityContext } from '../providers/IdentityProvider';
import { Tenant } from '../types';

export interface UseTenantReturn {
  currentTenant: Tenant | null;
  availableTenants: Tenant[];
  isLoading: boolean;
  switchTenant: (tenantId: string) => Promise<void>;
  getTenantSetting: <T>(key: string, defaultValue?: T) => T;
  isTenantActive: boolean;
}

export function useTenant(): UseTenantReturn {
  const { tenant, auth, connector } = useIdentityContext();

  const switchTenant = useCallback(
    async (tenantId: string) => {
      if (!auth.user) {
        throw new Error('User must be authenticated to switch tenants');
      }

      // Get user's available tenants
      const userTenants = await connector.getUserTenants(auth.user.id);
      const targetTenant = userTenants.find(t => t.id === tenantId);

      if (!targetTenant) {
        throw new Error('User does not have access to this tenant');
      }

      // For tenant switching, we'll need to redirect to the new tenant URL
      // This is a simplified approach - in production you might want more sophisticated handling
      const currentUrl = new URL(window.location.href);

      if (tenant.resolutionStrategy === 'subdomain') {
        // Change subdomain
        const hostname = window.location.hostname;
        const parts = hostname.split('.');
        if (parts.length > 2) {
          parts[0] = tenantId;
          const newHostname = parts.join('.');
          window.location.href = `${currentUrl.protocol}//${newHostname}${currentUrl.pathname}${currentUrl.search}`;
        }
      } else if (tenant.resolutionStrategy === 'query-param') {
        // Change query parameter
        currentUrl.searchParams.set('tenant', tenantId);
        window.location.href = currentUrl.toString();
      }
    },
    [connector, auth.user, tenant.resolutionStrategy]
  );

  const getTenantSetting = useCallback(
    <T>(key: string, defaultValue?: T): T => {
      if (!tenant.currentTenant?.settings) {
        return defaultValue as T;
      }

      const keys = key.split('.');
      let value: any = tenant.currentTenant.settings;

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return defaultValue as T;
        }
      }

      return value as T;
    },
    [tenant.currentTenant]
  );

  return {
    currentTenant: tenant.currentTenant,
    availableTenants: tenant.availableTenants,
    isLoading: tenant.isLoading,
    switchTenant,
    getTenantSetting,
    isTenantActive: tenant.currentTenant?.isActive ?? false,
  };
}
