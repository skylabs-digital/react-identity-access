import { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FeatureFlagApiService } from '../services/FeatureFlagApiService';
import { HttpService } from '../services/HttpService';
import { useApp } from './AppProvider';
import type { FeatureFlagItem } from '../types/api';

export interface FeatureFlagConfig {
  refreshInterval?: number; // in milliseconds, default 5 minutes
  onError?: (error: Error) => void;
}

export interface FeatureFlagContextValue {
  featureFlags: FeatureFlagItem[];
  loading: boolean;
  error: string | null;
  isEnabled: (flagName: string) => boolean;
  getFlag: (flagName: string) => FeatureFlagItem | undefined;
  refresh: () => Promise<void>;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

interface FeatureFlagProviderProps {
  config?: FeatureFlagConfig;
  children: ReactNode;
}

export function FeatureFlagProvider({ config = {}, children }: FeatureFlagProviderProps) {
  const { tenant, baseUrl, appId } = useApp();
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const featureFlagService = useMemo(() => {
    const httpService = new HttpService(baseUrl);
    return new FeatureFlagApiService(httpService);
  }, [baseUrl]);

  const fetchFeatureFlags = async () => {
    if (!tenant?.id) {
      setFeatureFlags([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await featureFlagService.getTenantFeatureFlags(tenant.id, appId);
      setFeatureFlags(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch feature flags';
      setError(errorMessage);
      if (config.onError) {
        config.onError(err instanceof Error ? err : new Error(errorMessage));
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and setup refresh interval
  useEffect(() => {
    fetchFeatureFlags();

    const refreshInterval = config.refreshInterval || 5 * 60 * 1000; // 5 minutes default
    const interval = setInterval(fetchFeatureFlags, refreshInterval);

    return () => clearInterval(interval);
  }, [tenant?.id, config.refreshInterval]);

  const contextValue = useMemo(() => {
    const isEnabled = (flagKey: string): boolean => {
      const flag = featureFlags.find(f => f.key === flagKey);
      return flag?.value === true;
    };

    const getFlag = (flagKey: string): FeatureFlagItem | undefined => {
      return featureFlags.find(f => f.key === flagKey);
    };

    const getFlagState = (flagKey: string): 'enabled' | 'disabled' | 'not_found' => {
      const flag = featureFlags.find(f => f.key === flagKey);
      if (!flag) return 'not_found';
      return flag.value ? 'enabled' : 'disabled';
    };

    const refresh = async () => {
      await fetchFeatureFlags();
    };

    return {
      featureFlags,
      loading,
      error,
      isEnabled,
      getFlag,
      getFlagState,
      refresh,
    };
  }, [featureFlags, loading, error]);

  return (
    <FeatureFlagContext.Provider value={contextValue}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags(): FeatureFlagContextValue {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context;
}
