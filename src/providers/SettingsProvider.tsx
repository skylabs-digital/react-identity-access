import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useConnector } from './ConnectorProvider';
import { useTenant } from './TenantProvider';
import { z } from 'zod';

export interface SettingsConfig {
  version: string;
  autoSave?: boolean;
  syncInterval?: number; // minutes
}

interface SettingsState<T = any> {
  values: T;
  isLoading: boolean;
  error: string | null;
  isDirty: boolean;
  lastSync: Date | null;
}

interface SettingsContextValue<T = any> {
  values: T;
  isLoading: boolean;
  error: string | null;
  isDirty: boolean;
  updateSetting: <K extends keyof T>(key: K, value: T[K]) => void;
  updateSettings: (updates: Partial<T>) => void;
  save: () => Promise<void>;
  reset: () => void;
  refresh: () => Promise<void>;
  // Legacy compatibility
  settings: T;
  publicSettings: T;
  schema: z.ZodSchema<T>;
  isAuthenticated: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

interface SettingsProviderProps<T> {
  schema: z.ZodSchema<T>;
  defaults: T;
  config: SettingsConfig;
  children: ReactNode;
}

type SettingsAction<T> =
  | { type: 'LOADING'; payload: boolean }
  | { type: 'SET_VALUES'; payload: T }
  | { type: 'ERROR'; payload: string }
  | { type: 'UPDATE_SETTING'; payload: { key: keyof T; value: any } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<T> }
  | { type: 'MARK_CLEAN' }
  | { type: 'RESET'; payload: T };

function settingsReducer<T>(state: SettingsState<T>, action: SettingsAction<T>): SettingsState<T> {
  switch (action.type) {
    case 'LOADING':
      return { ...state, isLoading: action.payload, error: null };

    case 'SET_VALUES':
      return {
        ...state,
        values: action.payload,
        isLoading: false,
        error: null,
        isDirty: false,
        lastSync: new Date(),
      };

    case 'ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };

    case 'UPDATE_SETTING':
      return {
        ...state,
        values: {
          ...state.values,
          [action.payload.key]: action.payload.value,
        },
        isDirty: true,
      };

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        values: {
          ...state.values,
          ...action.payload,
        },
        isDirty: true,
      };

    case 'MARK_CLEAN':
      return {
        ...state,
        isDirty: false,
        lastSync: new Date(),
      };

    case 'RESET':
      return {
        ...state,
        values: action.payload,
        isDirty: false,
      };

    default:
      return state;
  }
}

export function SettingsProvider<T>({
  schema,
  defaults,
  config,
  children,
}: SettingsProviderProps<T>) {
  const { connector } = useConnector();
  const { tenantId } = useTenant();

  const initialState: SettingsState<T> = {
    values: defaults,
    isLoading: true,
    error: null,
    isDirty: false,
    lastSync: null,
  };

  const [state, dispatch] = useReducer(settingsReducer<T>, initialState);

  useEffect(() => {
    if (tenantId) {
      loadSettings();
    } else {
      dispatch({ type: 'SET_VALUES', payload: defaults });
    }
  }, [tenantId]);

  const loadSettings = async () => {
    try {
      dispatch({ type: 'LOADING', payload: true });

      const settingsKey = `settings_${tenantId}_${config.version}`;
      const response = await connector.get<T>(settingsKey);

      if (response.success && response.data) {
        try {
          // Validate with schema
          const settings = schema.parse({ ...defaults, ...response.data });
          dispatch({ type: 'SET_VALUES', payload: settings });
        } catch (error) {
          console.warn('Invalid settings data, using defaults:', error);
          dispatch({ type: 'SET_VALUES', payload: defaults });
        }
      } else {
        // No settings found, use defaults
        dispatch({ type: 'SET_VALUES', payload: defaults });
      }
    } catch (error: any) {
      dispatch({ type: 'ERROR', payload: error.message || 'Failed to load settings' });
    }
  };

  const updateSetting = <K extends keyof T>(key: K, value: T[K]) => {
    dispatch({ type: 'UPDATE_SETTING', payload: { key, value } });

    if (config.autoSave) {
      // Debounce auto-save
      setTimeout(() => save(), 1000);
    }
  };

  const updateSettings = (updates: Partial<T>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: updates });

    if (config.autoSave) {
      setTimeout(() => save(), 1000);
    }
  };

  const save = async () => {
    try {
      // Validate before saving
      const validatedSettings = schema.parse(state.values);

      const settingsKey = `settings_${tenantId}_${config.version}`;

      // Try to get existing settings first
      const existingResponse = await connector.get<T>(settingsKey);

      let response;
      if (existingResponse.success && existingResponse.data) {
        // Update existing settings
        response = await connector.update<T>(settingsKey, 'settings', validatedSettings);
      } else {
        // Create new settings
        response = await connector.create<T>(settingsKey, validatedSettings);
      }

      if (response.success) {
        dispatch({ type: 'MARK_CLEAN' });
      } else {
        const errorMessage =
          typeof response.error === 'string' ? response.error : 'Failed to save settings';
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  };

  const reset = () => {
    dispatch({ type: 'RESET', payload: defaults });
  };

  const refresh = async () => {
    await loadSettings();
  };

  const contextValue: SettingsContextValue<T> = {
    values: state.values,
    isLoading: state.isLoading,
    error: state.error,
    isDirty: state.isDirty,
    updateSetting,
    updateSettings,
    save,
    reset,
    refresh,
    // Legacy compatibility
    settings: state.values,
    publicSettings: state.values, // For now, same as settings
    schema,
    isAuthenticated: true, // Simplified for now
  };

  return <SettingsContext.Provider value={contextValue}>{children}</SettingsContext.Provider>;
}

export function useSettings<T = any>(): SettingsContextValue<T> {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context as SettingsContextValue<T>;
}
