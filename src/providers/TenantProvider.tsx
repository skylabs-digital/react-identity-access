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
import { detectTenantSlug as detectTenant, buildTenantHostname } from '../utils/tenantDetection';
import { encodeAuthTokens, type AuthTokens, AUTH_TRANSFER_PARAM } from '../utils/crossDomainAuth';
import type { TenantSettings, JSONSchema, PublicTenantInfo } from '../types/api';

// RFC-003: Cache interface for tenant info
interface CachedTenantInfo {
  data: PublicTenantInfo;
  timestamp: number;
  tenantSlug: string;
}

export interface TenantConfig {
  // Tenant configuration
  tenantMode?: 'subdomain' | 'selector' | 'fixed';
  fixedTenantSlug?: string; // Required when tenantMode is 'fixed' — always uses this slug
  baseDomain?: string; // Base domain for subdomain mode (e.g., 'kommi.click')
  selectorParam?: string; // Default: 'tenant', used when tenantMode is 'selector'
  // RFC-003: Cache configuration
  cache?: {
    enabled?: boolean; // Default: true
    ttl?: number; // Time to live in milliseconds, default: 5 minutes
    storageKey?: string; // Default: 'tenant_cache_{tenantSlug}'
  };
  // SSR support
  initialTenant?: PublicTenantInfo;
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
  switchTenant: (
    tenantSlug: string,
    options?: { mode?: 'navigate' | 'reload'; tokens?: AuthTokens; redirectPath?: string }
  ) => void;
  // Validation
  validateSettings: (settings: TenantSettings) => { isValid: boolean; errors: string[] };
}

const TenantContext = createContext<TenantContextValue | null>(null);

interface TenantProviderProps {
  config: TenantConfig;
  children: ReactNode;
}

export function TenantProvider({ config, children }: TenantProviderProps) {
  const { baseUrl, appInfo, appId } = useApp();

  // Detect tenant slug from URL using extracted utility
  const detectTenantSlug = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;

    return detectTenant(
      {
        tenantMode: config.tenantMode || 'selector',
        baseDomain: config.baseDomain,
        selectorParam: config.selectorParam,
        fixedTenantSlug: config.fixedTenantSlug,
      },
      {
        hostname: window.location.hostname,
        search: window.location.search,
      },
      window.localStorage
    );
  }, [config.tenantMode, config.baseDomain, config.selectorParam, config.fixedTenantSlug]);

  // Detect tenant slug on mount and on URL changes
  const [tenantSlug, setTenantSlug] = useState<string | null>(() => detectTenantSlug());

  // RFC-003: Cache configuration with defaults
  const cacheConfig = useMemo(
    () => ({
      enabled: config.cache?.enabled ?? true,
      ttl: config.cache?.ttl ?? 5 * 60 * 1000, // 5 minutes default
      storageKey: config.cache?.storageKey ?? `tenant_cache_${tenantSlug || 'default'}`,
    }),
    [config.cache, tenantSlug]
  );

  // RFC-003: Try to load from cache on initialization
  const [tenant, setTenant] = useState<PublicTenantInfo | null>(() => {
    if (config.initialTenant) return config.initialTenant;
    if (!cacheConfig.enabled || !tenantSlug) return null;

    try {
      const cached = localStorage.getItem(cacheConfig.storageKey);
      if (!cached) return null;

      const parsed: CachedTenantInfo = JSON.parse(cached);
      const now = Date.now();
      const age = now - parsed.timestamp;

      // Check if cache is still valid
      if (age < cacheConfig.ttl && parsed.tenantSlug === tenantSlug) {
        return parsed.data;
      }

      // Cache expired
      localStorage.removeItem(cacheConfig.storageKey);
      return null;
    } catch {
      return null;
    }
  });

  const [isTenantLoading, setIsTenantLoading] = useState(!tenant && !config.initialTenant);
  const [tenantError, setTenantError] = useState<Error | null>(null);

  // Settings state
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<Error | null>(null);

  // Re-detect tenant slug when URL changes (skip in fixed mode — slug never changes)
  useEffect(() => {
    if (config.tenantMode === 'fixed') return;
    const detected = detectTenantSlug();
    setTenantSlug(detected);
  }, [detectTenantSlug, config.tenantMode]);

  // Get settings schema from app info
  const settingsSchema = appInfo?.settingsSchema || null;

  // RFC-003: Load tenant info with caching
  const loadTenant = useCallback(
    async (slug: string, bypassCache = false) => {
      // Check cache first (unless bypassing)
      if (!bypassCache && cacheConfig.enabled && tenant && tenant.domain === slug) {
        return; // Already have valid cached data
      }

      try {
        setIsTenantLoading(true);
        setTenantError(null);

        const httpService = new HttpService(baseUrl);
        const tenantApi = new TenantApiService(httpService, appId);
        const tenantInfo = await tenantApi.getPublicTenantInfo(slug);
        setTenant(tenantInfo);

        // RFC-003: Save to cache
        if (cacheConfig.enabled) {
          try {
            const cacheData: CachedTenantInfo = {
              data: tenantInfo,
              timestamp: Date.now(),
              tenantSlug: slug,
            };
            localStorage.setItem(cacheConfig.storageKey, JSON.stringify(cacheData));
          } catch (error) {
            console.warn('Failed to cache tenant info:', error);
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load tenant information');
        setTenantError(error);
        setTenant(null);
      } finally {
        setIsTenantLoading(false);
      }
    },
    [baseUrl, appId, cacheConfig, tenant]
  );

  // RFC-003: Background refresh for stale-while-revalidate
  const backgroundRefresh = useCallback(async () => {
    if (!cacheConfig.enabled || !tenant || !tenantSlug) return;

    try {
      const cached = localStorage.getItem(cacheConfig.storageKey);
      if (!cached) return;

      const parsed: CachedTenantInfo = JSON.parse(cached);
      const age = Date.now() - parsed.timestamp;

      // If cache is more than 50% expired, refresh in background
      if (age > cacheConfig.ttl * 0.5) {
        const httpService = new HttpService(baseUrl);
        const tenantApi = new TenantApiService(httpService, appId);
        const tenantInfo = await tenantApi.getPublicTenantInfo(tenantSlug);

        setTenant(tenantInfo);

        const cacheData: CachedTenantInfo = {
          data: tenantInfo,
          timestamp: Date.now(),
          tenantSlug,
        };
        localStorage.setItem(cacheConfig.storageKey, JSON.stringify(cacheData));
      }
    } catch (error) {
      console.warn('Background tenant refresh failed:', error);
      // Don't update error state - keep showing cached data
    }
  }, [baseUrl, appId, cacheConfig, tenant, tenantSlug]);

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

  // RFC-003: Load tenant on mount or do background refresh
  useEffect(() => {
    if (!config.initialTenant && tenantSlug) {
      if (!tenant) {
        // No cached data, fetch from server
        loadTenant(tenantSlug);
      } else {
        // We have cached data, do background refresh
        backgroundRefresh();
      }
    } else if (!config.initialTenant && !tenantSlug) {
      // No tenant slug found - continue without tenant
      setTenant(null);
      setTenantError(null);
      setIsTenantLoading(false);
    }
  }, [config.initialTenant, tenantSlug, tenant, loadTenant, backgroundRefresh]);

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

  // Switch tenant by updating URL and reloading page
  const switchTenant = useCallback(
    (
      targetTenantSlug: string,
      options?: { mode?: 'navigate' | 'reload'; tokens?: AuthTokens; redirectPath?: string }
    ) => {
      const { mode = 'reload', tokens, redirectPath } = options || {};
      const tenantMode = config.tenantMode || 'selector';

      // Fixed mode: switching tenants is not supported
      if (tenantMode === 'fixed') {
        console.warn(
          '[TenantProvider] switchTenant is a no-op in fixed mode. Tenant is always:',
          config.fixedTenantSlug
        );
        // Still navigate to redirectPath if provided
        if (redirectPath) {
          window.location.href = redirectPath;
        }
        return;
      }

      // Update localStorage first
      localStorage.setItem('tenant', targetTenantSlug);

      if (tenantMode === 'subdomain') {
        // Subdomain mode: redirect to new subdomain
        const currentHostname = window.location.hostname;
        const newHostname = buildTenantHostname(
          targetTenantSlug,
          currentHostname,
          config.baseDomain
        );

        if (!newHostname) {
          console.warn(
            '[TenantProvider] Cannot switch subdomain, invalid hostname:',
            currentHostname
          );
          return;
        }

        // Build the new URL
        const targetPath = redirectPath || window.location.pathname;
        const url = new URL(`${window.location.protocol}//${newHostname}${targetPath}`);

        // Copy existing search params (except auth transfer)
        const currentParams = new URLSearchParams(window.location.search);
        currentParams.forEach((value, key) => {
          if (key !== AUTH_TRANSFER_PARAM) {
            url.searchParams.set(key, value);
          }
        });

        // If tokens provided, encode and add to URL for cross-subdomain auth
        if (tokens) {
          url.searchParams.set(AUTH_TRANSFER_PARAM, encodeAuthTokens(tokens));
        }

        window.location.href = url.toString();
      } else if (tenantMode === 'selector') {
        // Selector mode: update URL parameter
        const targetPath = redirectPath || window.location.pathname;
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set(config.selectorParam || 'tenant', targetTenantSlug);

        // Remove existing auth transfer param if present
        urlParams.delete(AUTH_TRANSFER_PARAM);

        // If tokens provided, encode and add to URL (same as subdomain mode)
        if (tokens) {
          urlParams.set(AUTH_TRANSFER_PARAM, encodeAuthTokens(tokens));
        }

        if (mode === 'reload') {
          // Full page reload with new tenant
          const newUrl = `${targetPath}?${urlParams.toString()}${window.location.hash}`;
          window.location.href = newUrl;
        } else {
          // Navigate without reload (requires router integration)
          const newUrl = `${targetPath}?${urlParams.toString()}${window.location.hash}`;
          window.history.pushState({}, '', newUrl);
          // Update state to trigger re-render
          setTenantSlug(targetTenantSlug);
          // Trigger tenant reload
          loadTenant(targetTenantSlug);
        }
      }
    },
    [config.tenantMode, config.selectorParam, config.baseDomain, loadTenant]
  );

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
      switchTenant,
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
    switchTenant,
    validateSettings,
  ]);

  // No longer blocks children - loading state is exposed via context
  // Use AppLoader component to block until ready
  return <TenantContext.Provider value={contextValue}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

// Optional hook that returns null if not inside TenantProvider
export function useTenantOptional(): TenantContextValue | null {
  return useContext(TenantContext);
}

// Backward compatibility
export const useTenantSettings = useTenant;

// Convenience hook for just the settings
export function useSettings() {
  const { settings, settingsSchema, isSettingsLoading, settingsError, validateSettings } =
    useTenant();
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
