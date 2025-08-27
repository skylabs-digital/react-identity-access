import { ReactNode } from 'react';
import { useSubscription } from '../../hooks/useSubscription';

export interface SubscriptionGuardProps {
  feature?: string;
  limit?: {
    key: string;
    currentUsage: number;
  };
  plan?: string | string[];
  status?: 'active' | 'trialing' | 'past_due' | 'canceled';
  fallback?: ReactNode;
  children: ReactNode;
}

export function SubscriptionGuard({
  feature,
  limit,
  plan,
  status,
  fallback = null,
  children,
}: SubscriptionGuardProps) {
  const { hasFeature, hasLimit, subscription, isActive, isTrialing, isPastDue, isCanceled } =
    useSubscription();

  // Check feature access
  if (feature && !hasFeature(feature)) {
    return <>{fallback}</>;
  }

  // Check limit access
  if (limit && !hasLimit(limit.key, limit.currentUsage)) {
    return <>{fallback}</>;
  }

  // Check plan access
  if (plan) {
    const currentPlan = subscription?.planId;
    if (!currentPlan) return <>{fallback}</>;

    const allowedPlans = Array.isArray(plan) ? plan : [plan];
    if (!allowedPlans.includes(currentPlan)) {
      return <>{fallback}</>;
    }
  }

  // Check status access
  if (status) {
    const statusMap = {
      active: isActive,
      trialing: isTrialing,
      past_due: isPastDue,
      canceled: isCanceled,
    };

    if (!statusMap[status]) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}
