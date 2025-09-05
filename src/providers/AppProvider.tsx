import {
  createContext,
  useContext,
  useMemo,
  ReactNode,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { HttpService } from '../services/HttpService';
import { TenantApiService } from '../services/TenantApiService';
import type { PublicTenantInfo } from '../types/api';

export interface AppConfig {
  baseUrl: string;
  appId: string;
  // Tenant configuration
  tenantMode?: 'subdomain' | 'selector' | 'fixed';
  fixedTenantSlug?: string; // Required when tenantMode is 'fixed'
  selectorParam?: string; // Default: 'tenant', used when tenantMode is 'selector'
  // SSR support
  initialTenant?: PublicTenantInfo;
  // Fallbacks
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode | ((error: Error, retry: () => void) => ReactNode);
}

interface AppContextValue {
  appId: string;
  baseUrl: string;
  // Tenant info
  tenant: PublicTenantInfo | null;
  tenantSlug: string | null;
  isTenantLoading: boolean;
  tenantError: Error | null;
  retryTenant: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

interface AppProviderProps {
  config: AppConfig;
  children: ReactNode;
}

// Default loading component
const DefaultLoadingFallback = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'system-ui, sans-serif',
    }}
  >
    <div>Loading application...</div>
  </div>
);

// Default error component
const DefaultErrorFallback = ({ error, retry }: { error: Error; retry: () => void }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'system-ui, sans-serif',
      textAlign: 'center',
      padding: '20px',
    }}
  >
    <h2 style={{ color: '#dc3545', marginBottom: '16px' }}>Application Error</h2>
    <p style={{ color: '#6c757d', marginBottom: '24px' }}>
      {error.message || 'Unable to load application'}
    </p>
    <button
      onClick={retry}
      style={{
        padding: '8px 16px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
      }}
    >
      Retry
    </button>
  </div>
);

export function AppProvider({ config, children }: AppProviderProps) {
  const [tenant, setTenant] = useState<PublicTenantInfo | null>(config.initialTenant || null);
  const [isTenantLoading, setIsTenantLoading] = useState(!config.initialTenant);
  const [tenantError, setTenantError] = useState<Error | null>(null);

  // Detect tenant slug from URL or config with localStorage fallback
  const detectTenantSlug = useCallback((): string | null => {
    const tenantMode = config.tenantMode || 'fixed';
    const storageKey = `tenant`;

    if (tenantMode === 'fixed') {
      return config.fixedTenantSlug || null;
    }

    if (typeof window === 'undefined') return null;

    if (tenantMode === 'subdomain') {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');

      // Extract subdomain (assuming format: subdomain.domain.com)
      if (parts.length >= 3) {
        const subdomain = parts[0];
        // Save to localStorage for persistence
        localStorage.setItem(storageKey, subdomain);
        return subdomain;
      }
      
      // Fallback to localStorage if no subdomain found
      return localStorage.getItem(storageKey);
    } else {
      // tenantMode === 'selector'
      const urlParams = new URLSearchParams(window.location.search);
      const urlTenant = urlParams.get(config.selectorParam || 'tenant');
      
      if (urlTenant) {
        // Save to localStorage when found in URL
        localStorage.setItem(storageKey, urlTenant);
        return urlTenant;
      }
      
      // Fallback to localStorage if not in URL
      return localStorage.getItem(storageKey);
    }
  }, [config.tenantMode, config.fixedTenantSlug, config.selectorParam]);

  const tenantSlug = useMemo(() => detectTenantSlug(), [detectTenantSlug]);

  const contextValue = useMemo(() => {
    // Retry function for tenant loading
    const retryTenant = () => {
      if (tenantSlug) {
        loadTenant(tenantSlug);
      }
    };

    return {
      appId: config.appId,
      baseUrl: config.baseUrl,
      // Tenant info
      tenant,
      tenantSlug,
      isTenantLoading,
      tenantError,
      retryTenant,
    };
  }, [config, tenant, tenantSlug, isTenantLoading, tenantError]);

  // Load tenant info
  const loadTenant = useCallback(
    async (slug: string) => {
      try {
        setIsTenantLoading(true);
        setTenantError(null);

        const httpService = new HttpService(config.baseUrl);
        const tenantApi = new TenantApiService(httpService, config.appId);
        const tenantInfo = await tenantApi.getPublicTenantInfo(slug);
        setTenant(tenantInfo);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load tenant information');
        setTenantError(error);
        setTenant(null);
      } finally {
        setIsTenantLoading(false);
      }
    },
    [config.baseUrl, config.appId]
  );

  // Load tenant on mount (if not SSR)
  useEffect(() => {
    if (!config.initialTenant && tenantSlug) {
      loadTenant(tenantSlug);
    } else if (!config.initialTenant && !tenantSlug && config.tenantMode !== 'fixed') {
      const mode = config.tenantMode || 'fixed';
      setTenantError(
        new Error(`No tenant ${mode === 'subdomain' ? 'subdomain' : 'parameter'} found`)
      );
      setIsTenantLoading(false);
    } else if (config.tenantMode === 'fixed' && !config.fixedTenantSlug) {
      setTenantError(new Error('Fixed tenant mode requires fixedTenantSlug configuration'));
      setIsTenantLoading(false);
    }
  }, [config.initialTenant, tenantSlug, loadTenant, config.tenantMode, config.fixedTenantSlug]);

  // Show loading fallback
  if (isTenantLoading) {
    return <>{config.loadingFallback || <DefaultLoadingFallback />}</>;
  }

  // Show error fallback
  if (tenantError) {
    const ErrorComponent =
      typeof config.errorFallback === 'function'
        ? config.errorFallback(tenantError, () => loadTenant(tenantSlug || ''))
        : config.errorFallback || (
            <DefaultErrorFallback error={tenantError} retry={() => loadTenant(tenantSlug || '')} />
          );

    return <>{ErrorComponent}</>;
  }

  // Show children only when we have tenant info (or when tenant is not required)
  if (!tenant && config.tenantMode !== 'fixed') {
    return (
      <DefaultErrorFallback
        error={new Error('No tenant information available')}
        retry={() => loadTenant(tenantSlug || '')}
      />
    );
  }

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Backward compatibility
export const useApi = useApp;

// Tenant hook
export function useTenant() {
  const { tenant, tenantSlug, isTenantLoading, tenantError, retryTenant } = useApp();
  return {
    tenant,
    tenantSlug,
    isLoading: isTenantLoading,
    error: tenantError,
    retry: retryTenant,
  };
}
