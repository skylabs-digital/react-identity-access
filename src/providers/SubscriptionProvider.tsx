import { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { SubscriptionApiService } from '../services/SubscriptionApiService';
import { HttpService } from '../services/HttpService';
import { useApp } from './AppProvider';
import { useTenantInfo } from './TenantProvider';
import type { TenantSubscriptionFeatures, PlanFeature } from '../types/api';

export interface SubscriptionConfig {
  refreshInterval?: number; // in milliseconds, default 10 minutes
  onError?: (error: Error) => void;
}

export interface SubscriptionContextValue {
  subscription: TenantSubscriptionFeatures | null;
  features: PlanFeature[];
  loading: boolean;
  error: string | null;
  isFeatureEnabled: (featureKey: string) => boolean;
  getFeature: (featureKey: string) => PlanFeature | undefined;
  getFeatureValue: <T = any>(featureKey: string, defaultValue?: T) => T;
  hasAllowedPlan: (allowedPlans: string[]) => boolean;
  refresh: () => Promise<void>;
}

export interface SubscriptionProviderProps {
  config?: SubscriptionConfig;
  children: ReactNode;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export function SubscriptionProvider({ config = {}, children }: SubscriptionProviderProps) {
  const { baseUrl } = useApp();
  const { tenant } = useTenantInfo();
  const [subscription, setSubscription] = useState<TenantSubscriptionFeatures | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create subscription service
  const subscriptionService = useMemo(() => {
    const httpService = new HttpService(baseUrl);
    return new SubscriptionApiService(httpService);
  }, [baseUrl]);

  const fetchSubscription = async () => {
    if (!tenant?.id) {
      setSubscription(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await subscriptionService.getTenantSubscriptionFeatures(tenant.id);
      setSubscription(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subscription';
      setError(errorMessage);
      if (config.onError) {
        config.onError(err instanceof Error ? err : new Error(errorMessage));
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch subscription on mount and when tenant changes
  useEffect(() => {
    fetchSubscription();

    // Set up refresh interval if configured
    if (!config.refreshInterval) return;

    const refreshInterval = config.refreshInterval || 10 * 60 * 1000; // 10 minutes default
    const interval = setInterval(fetchSubscription, refreshInterval);

    return () => clearInterval(interval);
  }, [tenant?.id, config.refreshInterval]);

  const contextValue = useMemo(() => {
    const features = subscription?.features || [];

    const isFeatureEnabled = (featureKey: string): boolean => {
      const feature = features.find(f => f.key === featureKey);
      if (!feature) return false;

      // Handle different feature types
      if (feature.type === 'BOOLEAN' || feature.type === 'boolean') {
        return feature.value === true;
      }

      // For non-boolean features, consider them enabled if they have a truthy value
      return Boolean(feature.value);
    };

    const getFeature = (featureKey: string): PlanFeature | undefined => {
      return features.find(f => f.key === featureKey);
    };

    const getFeatureValue = <T = any,>(featureKey: string, defaultValue?: T): T => {
      const feature = features.find(f => f.key === featureKey);
      return feature ? feature.value : (defaultValue as T);
    };

    const hasAllowedPlan = (allowedPlans: string[]): boolean => {
      if (!subscription || !subscription.isActive) return false;

      // Check if current plan is in the allowed plans array
      return allowedPlans.includes(subscription.planId);
    };

    const refresh = async () => {
      await fetchSubscription();
    };

    return {
      subscription,
      features,
      loading,
      error,
      isFeatureEnabled,
      getFeature,
      getFeatureValue,
      hasAllowedPlan,
      refresh,
    };
  }, [subscription, loading, error]);

  return (
    <SubscriptionContext.Provider value={contextValue}>{children}</SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
