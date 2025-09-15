import {
  createContext,
  useContext,
  useMemo,
  ReactNode,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useApp } from './AppProvider';
import { HttpService } from '../services/HttpService';
import { TenantApiService } from '../services/TenantApiService';
import type { TenantSettings, JSONSchema, PublicTenantInfo } from '../types/api';

export interface TenantConfig {
  // Tenant configuration
  tenantMode?: 'subdomain' | 'selector' | 'fixed' | 'optional';
  fixedTenantSlug?: string; // Required when tenantMode is 'fixed'
  selectorParam?: string; // Default: 'tenant', used when tenantMode is 'selector'
  // SSR support
  initialTenant?: PublicTenantInfo;
  // Fallbacks
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode | ((error: Error, retry: () => void) => ReactNode);
}

interface TenantContextValue {
  // Tenant info
  tenant: PublicTenantInfo | null;
  tenantSlug: string | null;
  isTenantLoading: boolean;
  tenantError: Error | null;
  retryTenant: () => void;
  // Settings
  settings: TenantSettings | null;
  settingsSchema: JSONSchema | null;
  isSettingsLoading: boolean;
  settingsError: Error | null;
  // Actions
  refreshSettings: () => void;
  // Validation
  validateSettings: (settings: TenantSettings) => { isValid: boolean; errors: string[] };
}

const TenantContext = createContext<TenantContextValue | null>(null);

interface TenantProviderProps {
  config: TenantConfig;
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
    <div>Loading tenant...</div>
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
    <h2 style={{ color: '#dc3545', marginBottom: '16px' }}>Tenant Error</h2>
    <p style={{ color: '#6c757d', marginBottom: '24px' }}>
      {error.message || 'Unable to load tenant'}
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

export function TenantProvider({ config, children }: TenantProviderProps) {
  const { baseUrl, appInfo, appId } = useApp();

  // Tenant state
  const [tenant, setTenant] = useState<PublicTenantInfo | null>(config.initialTenant || null);
  const [isTenantLoading, setIsTenantLoading] = useState(!config.initialTenant);
  const [tenantError, setTenantError] = useState<Error | null>(null);

  // Settings state
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<Error | null>(null);

  // Detect tenant slug from URL or config with localStorage fallback
  const detectTenantSlug = useCallback((): string | null => {
    const tenantMode = config.tenantMode || 'optional';
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
    } else if (tenantMode === 'selector') {
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

    // For 'optional' mode, return null (no tenant required)
    return null;
  }, [config.tenantMode, config.fixedTenantSlug, config.selectorParam]);

  const tenantSlug = useMemo(() => detectTenantSlug(), [detectTenantSlug]);

  // Get settings schema from app info
  const settingsSchema = appInfo?.settingsSchema || null;

  // Load tenant info
  const loadTenant = useCallback(
    async (slug: string) => {
      try {
        setIsTenantLoading(true);
        setTenantError(null);

        const httpService = new HttpService(baseUrl);
        const tenantApi = new TenantApiService(httpService, appId);
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
    [baseUrl, appId]
  );

  // Load tenant settings
  const loadSettings = useCallback(async () => {
    if (!tenant?.id) return;

    try {
      setIsSettingsLoading(true);
      setSettingsError(null);

      const httpService = new HttpService(baseUrl);
      const tenantApi = new TenantApiService(httpService, tenant.appId);
      const tenantSettings = await tenantApi.getTenantSettings(tenant.id);
      setSettings(tenantSettings);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load tenant settings');
      setSettingsError(error);
      setSettings(null);
    } finally {
      setIsSettingsLoading(false);
    }
  }, [baseUrl, tenant]);

  // Refresh settings
  const refreshSettings = useCallback(() => {
    loadSettings();
  }, [loadSettings]);

  // Validate settings against schema
  const validateSettings = useCallback(
    (settingsToValidate: TenantSettings) => {
      if (!settingsSchema) {
        return { isValid: true, errors: [] };
      }

      const errors: string[] = [];

      try {
        // If settingsSchema has properties, validate against them
        if (settingsSchema.properties) {
          Object.entries(settingsSchema.properties).forEach(([key, fieldSchema]) => {
            const value = settingsToValidate[key];

            // Check required fields
            if (settingsSchema.required?.includes(key) && (value === undefined || value === null)) {
              errors.push(`Field '${key}' is required`);
              return;
            }

            // Skip validation if value is not provided and not required
            if (value === undefined || value === null) return;

            // Type validation using JSONSchema
            if (fieldSchema.type) {
              const expectedType = fieldSchema.type;
              const actualType = typeof value;

              if (expectedType === 'string' && actualType !== 'string') {
                errors.push(`Field '${key}' must be a string`);
              } else if (
                (expectedType === 'number' || expectedType === 'integer') &&
                actualType !== 'number'
              ) {
                errors.push(`Field '${key}' must be a number`);
              } else if (expectedType === 'boolean' && actualType !== 'boolean') {
                errors.push(`Field '${key}' must be a boolean`);
              } else if (expectedType === 'array' && !Array.isArray(value)) {
                errors.push(`Field '${key}' must be an array`);
              }
            }

            // String length validation
            if (
              fieldSchema.minLength !== undefined &&
              typeof value === 'string' &&
              value.length < fieldSchema.minLength
            ) {
              errors.push(
                `Field '${key}' must be at least ${fieldSchema.minLength} characters long`
              );
            }
            if (
              fieldSchema.maxLength !== undefined &&
              typeof value === 'string' &&
              value.length > fieldSchema.maxLength
            ) {
              errors.push(
                `Field '${key}' must be no more than ${fieldSchema.maxLength} characters long`
              );
            }

            // Number range validation
            if (
              fieldSchema.minimum !== undefined &&
              typeof value === 'number' &&
              value < fieldSchema.minimum
            ) {
              errors.push(`Field '${key}' must be at least ${fieldSchema.minimum}`);
            }
            if (
              fieldSchema.maximum !== undefined &&
              typeof value === 'number' &&
              value > fieldSchema.maximum
            ) {
              errors.push(`Field '${key}' must be no more than ${fieldSchema.maximum}`);
            }

            // Pattern validation for strings
            if (fieldSchema.pattern && typeof value === 'string') {
              const regex = new RegExp(fieldSchema.pattern);
              if (!regex.test(value)) {
                errors.push(`Field '${key}' does not match the required pattern`);
              }
            }

            // Enum validation
            if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
              errors.push(`Field '${key}' must be one of: ${fieldSchema.enum.join(', ')}`);
            }
          });
        }

        return {
          isValid: errors.length === 0,
          errors,
        };
      } catch {
        return {
          isValid: false,
          errors: ['Invalid settings schema or validation error'],
        };
      }
    },
    [settingsSchema]
  );

  // Load tenant on mount (if not SSR)
  useEffect(() => {
    const tenantMode = config.tenantMode || 'optional';
    
    if (!config.initialTenant && tenantSlug) {
      loadTenant(tenantSlug);
    } else if (!config.initialTenant && !tenantSlug && tenantMode === 'fixed') {
      setTenantError(new Error('Fixed tenant mode requires fixedTenantSlug configuration'));
      setIsTenantLoading(false);
    } else if (!config.initialTenant && !tenantSlug && (tenantMode === 'subdomain' || tenantMode === 'selector')) {
      setTenantError(
        new Error(`No tenant ${tenantMode === 'subdomain' ? 'subdomain' : 'parameter'} found`)
      );
      setIsTenantLoading(false);
    } else if (!config.initialTenant && !tenantSlug && tenantMode === 'optional') {
      // No tenant required, allow access to root
      setTenant(null);
      setTenantError(null);
      setIsTenantLoading(false);
    }
  }, [config.initialTenant, tenantSlug, loadTenant, config.tenantMode, config.fixedTenantSlug]);

  // Load settings when tenant changes
  useEffect(() => {
    if (tenant?.id) {
      loadSettings();
    } else {
      setSettings(null);
      setSettingsError(null);
      setIsSettingsLoading(false);
    }
  }, [tenant?.id, loadSettings]);

  const contextValue = useMemo(() => {
    // Retry function for tenant loading
    const retryTenant = () => {
      if (tenantSlug) {
        loadTenant(tenantSlug);
      }
    };

    return {
      // Tenant info
      tenant,
      tenantSlug,
      isTenantLoading,
      tenantError,
      retryTenant,
      // Settings
      settings,
      settingsSchema,
      isSettingsLoading,
      settingsError,
      // Actions
      refreshSettings,
      // Validation
      validateSettings,
    };
  }, [
    tenant,
    tenantSlug,
    isTenantLoading,
    tenantError,
    settings,
    settingsSchema,
    isSettingsLoading,
    settingsError,
    refreshSettings,
    validateSettings,
  ]);

  // Show loading fallback
  if (isTenantLoading) {
    return <>{config.loadingFallback || <DefaultLoadingFallback />}</>;
  }

  // Show error fallback (only if tenant is required)
  if (tenantError && config.tenantMode !== 'optional') {
    const ErrorComponent =
      typeof config.errorFallback === 'function'
        ? config.errorFallback(tenantError, () => loadTenant(tenantSlug || ''))
        : config.errorFallback || (
            <DefaultErrorFallback error={tenantError} retry={() => loadTenant(tenantSlug || '')} />
          );

    return <>{ErrorComponent}</>;
  }

  return <TenantContext.Provider value={contextValue}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

// Backward compatibility
export const useTenantSettings = useTenant;

// Convenience hook for just the settings
export function useSettings() {
  const {
    settings,
    settingsSchema,
    isSettingsLoading,
    settingsError,
    validateSettings,
  } = useTenant();
  return {
    settings,
    settingsSchema,
    isLoading: isSettingsLoading,
    error: settingsError,
    validateSettings,
  };
}

// Convenience hook for just tenant info
export function useTenantInfo() {
  const { tenant, tenantSlug, isTenantLoading, tenantError, retryTenant } = useTenant();
  return {
    tenant,
    tenantSlug,
    isLoading: isTenantLoading,
    error: tenantError,
    retry: retryTenant,
  };
}
