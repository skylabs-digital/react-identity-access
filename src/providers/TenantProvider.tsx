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
import { useAuth } from './AuthProvider';
import { HttpService } from '../services/HttpService';
import { TenantApiService } from '../services/TenantApiService';
import type { TenantSettings, UpdateTenantSettingsRequest, JSONSchema } from '../types/api';

interface TenantContextValue {
  // Settings
  settings: TenantSettings | null;
  settingsSchema: JSONSchema | null;
  isSettingsLoading: boolean;
  settingsError: Error | null;
  // Actions
  updateSettings: (settings: TenantSettings) => Promise<void>;
  refreshSettings: () => void;
  // Validation
  validateSettings: (settings: TenantSettings) => { isValid: boolean; errors: string[] };
}

const TenantContext = createContext<TenantContextValue | null>(null);

interface TenantProviderProps {
  children: ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
  const { baseUrl, tenant, appInfo } = useApp();
  const { sessionManager } = useAuth();

  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<Error | null>(null);

  // Get settings schema from app info
  const settingsSchema = appInfo?.settingsSchema || null;

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

  // Update tenant settings
  const updateSettings = useCallback(
    async (newSettings: TenantSettings) => {
      if (!tenant?.id || !sessionManager) {
        throw new Error('Tenant ID and authentication required to update settings');
      }

      try {
        setIsSettingsLoading(true);
        setSettingsError(null);

        const httpService = new HttpService(baseUrl);
        const tenantApi = new TenantApiService(httpService, tenant.appId, sessionManager);

        const request: UpdateTenantSettingsRequest = { settings: newSettings };
        const updatedSettings = await tenantApi.updateTenantSettings(tenant.id, request);
        setSettings(updatedSettings);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update tenant settings');
        setSettingsError(error);
        throw error;
      } finally {
        setIsSettingsLoading(false);
      }
    },
    [baseUrl, tenant, sessionManager]
  );

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

  const contextValue = useMemo(
    () => ({
      // Settings
      settings,
      settingsSchema,
      isSettingsLoading,
      settingsError,
      // Actions
      updateSettings,
      refreshSettings,
      // Validation
      validateSettings,
    }),
    [
      settings,
      settingsSchema,
      isSettingsLoading,
      settingsError,
      updateSettings,
      refreshSettings,
      validateSettings,
    ]
  );

  return <TenantContext.Provider value={contextValue}>{children}</TenantContext.Provider>;
}

export function useTenantSettings(): TenantContextValue {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenantSettings must be used within a TenantProvider');
  }
  return context;
}

// Convenience hook for just the settings
export function useSettings() {
  const {
    settings,
    settingsSchema,
    isSettingsLoading,
    settingsError,
    updateSettings,
    validateSettings,
  } = useTenantSettings();
  return {
    settings,
    settingsSchema,
    isLoading: isSettingsLoading,
    error: settingsError,
    updateSettings,
    validateSettings,
  };
}
