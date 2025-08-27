import { useCallback } from 'react';
import { useSubscription as useSubscriptionContext } from '../providers/SubscriptionProvider';

export interface UseSubscriptionReturn {
  // State
  subscription: any;
  plans: any[];
  paymentMethods: any[];
  invoices: any[];
  payments: any[];
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null;

  // Actions
  subscribe: (planId: string, paymentMethodId?: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  updatePaymentMethod: (paymentMethodId: string) => Promise<void>;
  addPaymentMethod: (paymentMethodData: any) => Promise<any>;
  removePaymentMethod: (paymentMethodId: string) => Promise<void>;
  retryPayment: (invoiceId: string) => Promise<void>;
  downloadInvoice: (invoiceId: string) => Promise<string>;

  // Feature & Limit Helpers
  hasFeature: (feature: string) => boolean;
  hasLimit: (limitKey: string, currentUsage: number) => boolean;
  requiresFeature: (feature: string) => boolean;
  requiresLimit: (limitKey: string, currentUsage: number) => boolean;

  // Status Helpers
  isActive: boolean;
  isTrialing: boolean;
  isPastDue: boolean;
  isCanceled: boolean;
  daysUntilExpiry: number | null;
  canUpgrade: (planId: string) => boolean;
  canDowngrade: (planId: string) => boolean;

  // Plan Helpers
  getCurrentPlan: () => any | null;
  getPlan: (planId: string) => any | null;
  getFeatureList: () => string[];
  getLimits: () => Record<string, number>;
}

export function useSubscription(): UseSubscriptionReturn {
  const context = useSubscriptionContext();

  const {
    subscription,
    plans,
    isLoading,
    error,
    subscribe,
    cancelSubscription,
    changePlan: _changePlan,
    refreshSubscription: _refreshSubscription,
  } = context;

  // Feature checking helpers
  const hasFeature = useCallback(
    (feature: string): boolean => {
      if (!subscription) return false;
      const plan = plans.find(p => p.id === subscription.planId);
      return plan?.features.includes(feature) || false;
    },
    [subscription, plans]
  );

  const hasLimit = useCallback((_limitKey: string, _currentUsage: number): boolean => {
    // For now, return true as limits aren't implemented in the basic provider
    return true;
  }, []);

  const requiresFeature = useCallback(
    (feature: string): boolean => {
      return !hasFeature(feature);
    },
    [hasFeature]
  );

  const requiresLimit = useCallback(
    (limitKey: string, currentUsage: number): boolean => {
      return !hasLimit(limitKey, currentUsage);
    },
    [hasLimit]
  );

  // Status helpers
  const isActive = subscription?.status === 'active';
  const isPastDue = subscription?.status === 'past_due';
  const isCanceled = subscription?.status === 'canceled';
  const isTrialing = subscription?.status === 'trialing';

  // Plan helpers
  const getCurrentPlan = useCallback(() => {
    if (!subscription) return null;
    return plans.find(p => p.id === subscription.planId) || null;
  }, [subscription, plans]);

  const getPlan = useCallback(
    (planId: string) => {
      return plans.find(plan => plan.id === planId) || null;
    },
    [plans]
  );

  const getFeatureList = useCallback(() => {
    const plan = getCurrentPlan();
    return plan?.features || [];
  }, [getCurrentPlan]);

  const getLimits = useCallback(() => {
    // Return empty object as limits aren't implemented yet
    return {};
  }, []);

  // Calculate days until expiry
  const daysUntilExpiry = subscription
    ? Math.ceil(
        ((subscription.currentPeriodEnd instanceof Date
          ? subscription.currentPeriodEnd
          : new Date(subscription.currentPeriodEnd)
        ).getTime() -
          Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const canUpgrade = useCallback(
    (planId: string): boolean => {
      const currentPlan = getCurrentPlan();
      const targetPlan = getPlan(planId);
      return !!(currentPlan && targetPlan && targetPlan.price > currentPlan.price);
    },
    [getCurrentPlan, getPlan]
  );

  const canDowngrade = useCallback(
    (planId: string): boolean => {
      const currentPlan = getCurrentPlan();
      const targetPlan = getPlan(planId);
      return !!(currentPlan && targetPlan && targetPlan.price < currentPlan.price);
    },
    [getCurrentPlan, getPlan]
  );

  return {
    // State
    subscription,
    plans,
    paymentMethods: [], // Not implemented in basic provider
    invoices: [], // Not implemented in basic provider
    payments: [], // Not implemented in basic provider
    isLoading,
    error,
    lastSync: null, // Not implemented in basic provider

    // Actions
    subscribe,
    cancelSubscription,
    updatePaymentMethod: async () => {}, // Not implemented
    addPaymentMethod: async () => ({}), // Not implemented
    removePaymentMethod: async () => {}, // Not implemented
    retryPayment: async () => {}, // Not implemented
    downloadInvoice: async () => '', // Not implemented

    // Feature & Limit Helpers
    hasFeature,
    hasLimit,
    requiresFeature,
    requiresLimit,

    // Status Helpers
    isActive,
    isTrialing,
    isPastDue,
    isCanceled,
    daysUntilExpiry,
    canUpgrade,
    canDowngrade,

    // Plan Helpers
    getCurrentPlan,
    getPlan,
    getFeatureList,
    getLimits,
  };
}
