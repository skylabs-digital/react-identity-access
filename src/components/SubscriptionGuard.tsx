import { ReactNode } from 'react';
import { useSubscription } from '../providers/SubscriptionProvider';

export interface SubscriptionGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  allowedPlans?: string[];
  requiredFeature?: string;
}

const DefaultFallback = () => (
  <div style={{
    padding: '2rem',
    textAlign: 'center',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626'
  }}>
    <h3 style={{ margin: '0 0 1rem 0' }}>🔒 Subscription Required</h3>
    <p style={{ margin: 0 }}>
      This feature requires a higher subscription plan. Please upgrade your plan to access this content.
    </p>
  </div>
);

export function SubscriptionGuard({ 
  children, 
  fallback = <DefaultFallback />, 
  allowedPlans,
  requiredFeature 
}: SubscriptionGuardProps) {
  const { subscription, hasAllowedPlan, isFeatureEnabled, loading } = useSubscription();

  // Show loading state
  if (loading) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#6b7280'
      }}>
        Loading subscription...
      </div>
    );
  }

  // No subscription data available
  if (!subscription) {
    return <>{fallback}</>;
  }

  // Check if subscription is active
  if (!subscription.isActive) {
    return <>{fallback}</>;
  }

  // Check allowed plans requirement
  if (allowedPlans && allowedPlans.length > 0 && !hasAllowedPlan(allowedPlans)) {
    return <>{fallback}</>;
  }

  // Check required feature
  if (requiredFeature && !isFeatureEnabled(requiredFeature)) {
    return <>{fallback}</>;
  }

  // All checks passed, render children
  return <>{children}</>;
}
