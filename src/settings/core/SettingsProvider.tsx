import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { SettingsProviderProps, SettingsContextValue, AuthContext } from './types';
import { SchemaAnalyzer } from '../zod/schema-analyzer';
import { setNestedValue } from '../utils/dot-notation';

const SettingsContext = createContext<SettingsContextValue | null>(null);

// Hook to detect auth provider from parent contexts
const useAuthProvider = (): AuthContext | null => {
  // Fallback to window-based detection for now
  // TODO: Integrate with IdentityProvider when available
  const contexts = ['AuthProvider', 'UserProvider', 'SessionProvider', 'IdentityProvider'];

  for (const contextName of contexts) {
    try {
      const context = (window as any)[contextName];
      if (context?.isAuthenticated !== undefined) {
        return context;
      }
    } catch {
      // Ignore errors, continue checking
    }
  }

  return null;
};

export const SettingsProvider: React.FC<SettingsProviderProps> = ({
  appId,
  tenantId = 'default',
  schema,
  version,
  defaults,
  connector,
  isAuthenticated: manualAuth,
  children,
}) => {
  const [settings, setSettings] = useState<any>(defaults);
  const [publicSettings, setPublicSettings] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine authentication state
  const authProvider = useAuthProvider();
  const isAuthenticated = manualAuth ?? authProvider?.isAuthenticated ?? false;

  // Load settings on mount and when key dependencies change
  useEffect(() => {
    loadSettings();
  }, [appId, tenantId, version, isAuthenticated]);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Always load public settings
      const publicData = await connector.getPublicSettings(appId, tenantId);
      const publicSettingsData =
        publicData || SchemaAnalyzer.extractPublicSettings(defaults, schema);
      setPublicSettings(publicSettingsData);

      if (isAuthenticated) {
        // Load private settings if authenticated
        const privateData = await connector.getPrivateSettings(appId, tenantId);
        const fullSettings = privateData || defaults;

        // Validate against schema
        const result = schema.safeParse(fullSettings);
        if (result.success) {
          setSettings(result.data);
        } else {
          console.warn('Settings validation failed:', result.error);
          setSettings(defaults);
        }
      } else {
        // Use only public settings + defaults for private fields
        const { publicFields } = SchemaAnalyzer.analyzeSchema(schema);
        const settingsWithDefaults = { ...defaults };

        publicFields.forEach(field => {
          if (field in publicSettingsData) {
            settingsWithDefaults[field] = publicSettingsData[field];
          }
        });

        setSettings(settingsWithDefaults);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
      setSettings(defaults);
      setPublicSettings(SchemaAnalyzer.extractPublicSettings(defaults, schema));
    } finally {
      setIsLoading(false);
    }
  }, [appId, tenantId, version, isAuthenticated, connector, schema, defaults]);

  const updateSetting = useCallback(
    async (key: string, value: any) => {
      if (!isAuthenticated) {
        throw new Error('Authentication required to update settings');
      }

      try {
        setIsLoading(true);

        // Update local state optimistically
        const newSettings = { ...settings };
        setNestedValue(newSettings, key, value);

        // Validate the updated settings
        const result = schema.safeParse(newSettings);
        if (!result.success) {
          throw new Error(`Validation failed: ${result.error.message}`);
        }

        setSettings(result.data);

        // Update public settings if the field is public
        if (SchemaAnalyzer.validatePublicAccess(key, schema)) {
          const newPublicSettings = SchemaAnalyzer.extractPublicSettings(result.data, schema);
          setPublicSettings(newPublicSettings);
        }

        // Persist to storage
        await connector.updateSettings(appId, tenantId, result.data);
      } catch (err) {
        // Revert optimistic update on error
        await loadSettings();
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [appId, tenantId, settings, schema, isAuthenticated, connector, loadSettings]
  );

  const contextValue: SettingsContextValue = {
    settings,
    publicSettings,
    updateSetting,
    isLoading,
    isAuthenticated,
    error,
    schema,
    version,
  };

  return <SettingsContext.Provider value={contextValue}>{children}</SettingsContext.Provider>;
};

export const useSettings = (): SettingsContextValue => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
