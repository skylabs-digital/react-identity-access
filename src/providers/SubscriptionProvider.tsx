import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useConnector } from './ConnectorProvider';
import { useTenant } from './TenantProvider';

export interface SubscriptionConfig {
  allowUpgrades?: boolean;
  allowDowngrades?: boolean;
  trialDays?: number;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: string[];
}

interface Subscription {
  id: string;
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

interface SubscriptionState {
  subscription: Subscription | null;
  plans: SubscriptionPlan[];
  isLoading: boolean;
  error: string | null;
}

interface SubscriptionContextValue {
  subscription: Subscription | null;
  plans: SubscriptionPlan[];
  isLoading: boolean;
  error: string | null;
  subscribe: (planId: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  changePlan: (planId: string) => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

interface SubscriptionProviderProps {
  config?: SubscriptionConfig;
  children: ReactNode;
}

const initialState: SubscriptionState = {
  subscription: null,
  plans: [],
  isLoading: true,
  error: null,
};

type SubscriptionAction =
  | { type: 'LOADING'; payload: boolean }
  | { type: 'SET_SUBSCRIPTION'; payload: Subscription | null }
  | { type: 'SET_PLANS'; payload: SubscriptionPlan[] }
  | { type: 'ERROR'; payload: string };

function subscriptionReducer(
  state: SubscriptionState,
  action: SubscriptionAction
): SubscriptionState {
  switch (action.type) {
    case 'LOADING':
      return { ...state, isLoading: action.payload, error: null };

    case 'SET_SUBSCRIPTION':
      return {
        ...state,
        subscription: action.payload,
        isLoading: false,
        error: null,
      };

    case 'SET_PLANS':
      return {
        ...state,
        plans: action.payload,
        isLoading: false,
        error: null,
      };

    case 'ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };

    default:
      return state;
  }
}

export function SubscriptionProvider({
  config: _config = {},
  children,
}: SubscriptionProviderProps) {
  const { connector } = useConnector();
  const { tenantId } = useTenant();
  const [state, dispatch] = useReducer(subscriptionReducer, initialState);

  useEffect(() => {
    if (tenantId) {
      loadSubscriptionData();
    } else {
      dispatch({ type: 'LOADING', payload: false });
    }
  }, [tenantId]);

  const loadSubscriptionData = async () => {
    try {
      dispatch({ type: 'LOADING', payload: true });

      // First try to load subscription from localStorage directly
      const subscriptionKey = `subscriptions_${tenantId}`;
      const storageKey = `demo-app_${subscriptionKey}`;
      const storedSubscription = localStorage.getItem(storageKey);

      let subscription = null;
      if (storedSubscription) {
        try {
          subscription = JSON.parse(storedSubscription);
          console.log('Loaded subscription from localStorage:', subscription);
        } catch {
          console.warn('Failed to parse stored subscription, falling back to connector');
        }
      }

      // If no stored subscription, try connector (which will use seed data)
      if (!subscription) {
        const subscriptionResponse = await connector.get<Subscription>(`subscriptions/${tenantId}`);
        subscription = subscriptionResponse.success ? subscriptionResponse.data : null;
      }

      // Load plans using connector CRUD API
      const plansResponse = await connector.list<SubscriptionPlan>('subscription-plans');
      const plans = plansResponse.success ? plansResponse.data : [];

      dispatch({ type: 'SET_SUBSCRIPTION', payload: subscription });
      dispatch({ type: 'SET_PLANS', payload: plans });
    } catch (error: any) {
      dispatch({ type: 'ERROR', payload: error.message || 'Failed to load subscription data' });
    }
  };

  const subscribe = async (planId: string) => {
    try {
      dispatch({ type: 'LOADING', payload: true });

      const plan = state.plans.find(p => p.id === planId);
      if (!plan) throw new Error('Plan not found');

      const newSubscription: Subscription = {
        id: `sub_${Date.now()}`,
        planId,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        cancelAtPeriodEnd: false,
      };

      // Store subscription directly in localStorage as single object
      const subscriptionKey = `subscriptions_${tenantId}`;
      const storageKey = `demo-app_${subscriptionKey}`;
      localStorage.setItem(storageKey, JSON.stringify(newSubscription));

      console.log('Subscription saved directly to localStorage:', newSubscription);

      dispatch({ type: 'SET_SUBSCRIPTION', payload: newSubscription });
    } catch (error: any) {
      dispatch({ type: 'ERROR', payload: error.message || 'Failed to subscribe' });
    }
  };

  const cancelSubscription = async () => {
    if (!state.subscription) return;

    try {
      dispatch({ type: 'LOADING', payload: true });

      const updatedSubscription = {
        ...state.subscription,
        cancelAtPeriodEnd: true,
      };

      // Store updated subscription directly in localStorage
      const subscriptionKey = `subscriptions_${tenantId}`;
      const storageKey = `demo-app_${subscriptionKey}`;
      localStorage.setItem(storageKey, JSON.stringify(updatedSubscription));

      console.log('Subscription updated in localStorage:', updatedSubscription);

      dispatch({ type: 'SET_SUBSCRIPTION', payload: updatedSubscription });
    } catch (error: any) {
      dispatch({ type: 'ERROR', payload: error.message || 'Failed to cancel subscription' });
    }
  };

  const changePlan = async (planId: string) => {
    if (!state.subscription) return;

    try {
      dispatch({ type: 'LOADING', payload: true });

      const updatedSubscription = {
        ...state.subscription,
        planId,
      };

      // Store updated subscription directly in localStorage
      const subscriptionKey = `subscriptions_${tenantId}`;
      const storageKey = `demo-app_${subscriptionKey}`;
      localStorage.setItem(storageKey, JSON.stringify(updatedSubscription));

      console.log('Subscription plan changed in localStorage:', updatedSubscription);

      dispatch({ type: 'SET_SUBSCRIPTION', payload: updatedSubscription });
    } catch (error: any) {
      dispatch({ type: 'ERROR', payload: error.message || 'Failed to change plan' });
    }
  };

  const refreshSubscription = async () => {
    await loadSubscriptionData();
  };

  const contextValue: SubscriptionContextValue = {
    subscription: state.subscription,
    plans: state.plans,
    isLoading: state.isLoading,
    error: state.error,
    subscribe,
    cancelSubscription,
    changePlan,
    refreshSubscription,
  };

  return (
    <SubscriptionContext.Provider value={contextValue}>{children}</SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
