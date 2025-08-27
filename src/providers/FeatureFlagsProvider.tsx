import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useConnector } from './ConnectorProvider';
import { useTenant } from './TenantProvider';

export interface FeatureFlagConfig {
  syncInterval?: number; // minutes
  allowOverrides?: boolean;
}

interface FeatureFlag {
  key: string;
  enabled: boolean;
  description?: string;
  adminEditable?: boolean;
}

interface FeatureFlagsState {
  flags: Record<string, boolean>;
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null;
}

interface FeatureFlagsContextValue {
  flags: Record<string, boolean>;
  isLoading: boolean;
  error: string | null;
  isEnabled: (key: string) => boolean;
  toggleFlag: (key: string, enabled: boolean) => Promise<void>;
  refreshFlags: () => Promise<void>;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

interface FeatureFlagsProviderProps {
  config?: FeatureFlagConfig;
  children: ReactNode;
}

const initialState: FeatureFlagsState = {
  flags: {},
  isLoading: true,
  error: null,
  lastSync: null,
};

type FeatureFlagsAction =
  | { type: 'LOADING'; payload: boolean }
  | { type: 'SET_FLAGS'; payload: Record<string, boolean> }
  | { type: 'ERROR'; payload: string }
  | { type: 'TOGGLE_FLAG'; payload: { key: string; enabled: boolean } };

function featureFlagsReducer(
  state: FeatureFlagsState,
  action: FeatureFlagsAction
): FeatureFlagsState {
  switch (action.type) {
    case 'LOADING':
      return { ...state, isLoading: action.payload, error: null };

    case 'SET_FLAGS':
      return {
        ...state,
        flags: action.payload,
        isLoading: false,
        error: null,
        lastSync: new Date(),
      };

    case 'ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };

    case 'TOGGLE_FLAG':
      return {
        ...state,
        flags: {
          ...state.flags,
          [action.payload.key]: action.payload.enabled,
        },
      };

    default:
      return state;
  }
}

export function FeatureFlagsProvider({ config: _config, children }: FeatureFlagsProviderProps) {
  const { connector } = useConnector();
  const { tenantId } = useTenant();
  const [state, dispatch] = useReducer(featureFlagsReducer, initialState);

  useEffect(() => {
    if (tenantId) {
      loadFeatureFlags();
    } else {
      dispatch({ type: 'LOADING', payload: false });
    }
  }, [tenantId]);

  const loadFeatureFlags = async () => {
    try {
      dispatch({ type: 'LOADING', payload: true });

      // Use connector's generic API to get feature flags
      const response = await connector.list<FeatureFlag>('featureFlags');

      if (response.success) {
        const flags = response.data.reduce(
          (acc, flag) => {
            acc[flag.key] = flag.enabled;
            return acc;
          },
          {} as Record<string, boolean>
        );
        dispatch({ type: 'SET_FLAGS', payload: flags });
      } else {
        dispatch({ type: 'ERROR', payload: response.message || 'Failed to load feature flags' });
      }
    } catch {
      dispatch({ type: 'ERROR', payload: 'Failed to load feature flags' });
    }
  };

  const isEnabled = (key: string): boolean => {
    return state.flags[key] ?? false;
  };

  const toggleFlag = async (key: string, enabled: boolean) => {
    try {
      // Use connector's generic API to update feature flag
      const response = await connector.update<FeatureFlag>('featureFlags', key, { enabled });

      if (response.success) {
        dispatch({ type: 'TOGGLE_FLAG', payload: { key, enabled } });
      } else {
        throw new Error(response.message || 'Failed to update feature flag');
      }
    } catch (_error) {
      console.error('Failed to toggle feature flag:', _error);
    }
  };

  const refreshFlags = async () => {
    try {
      await loadFeatureFlags();
    } catch (_error) {
      console.error('Failed to refresh feature flags:', _error);
    }
  };

  const contextValue: FeatureFlagsContextValue = {
    flags: state.flags,
    isLoading: state.isLoading,
    error: state.error,
    isEnabled,
    toggleFlag,
    refreshFlags,
  };

  return (
    <FeatureFlagsContext.Provider value={contextValue}>{children}</FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags(): FeatureFlagsContextValue {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  }
  return context;
}
