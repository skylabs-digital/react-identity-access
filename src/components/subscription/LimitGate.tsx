import { ReactNode } from 'react';
import { useSubscription } from '../../hooks/useSubscription';

export interface LimitGateProps {
  limitKey: string;
  currentUsage: number;
  fallback?: ReactNode;
  upgradePrompt?: ReactNode;
  warningThreshold?: number; // Show warning when approaching limit (e.g., 0.8 = 80%)
  warningComponent?: ReactNode;
  children: ReactNode;
}

export function LimitGate({
  limitKey,
  currentUsage,
  fallback,
  upgradePrompt,
  warningThreshold = 0.8,
  warningComponent,
  children,
}: LimitGateProps) {
  const { hasLimit, getLimits, subscription } = useSubscription();

  const limits = getLimits();
  const limit = limits[limitKey];

  // If no limit is set, allow access
  if (limit === undefined) {
    return <>{children}</>;
  }

  // Check if over limit
  if (!hasLimit(limitKey, currentUsage)) {
    // Show upgrade prompt if provided and user has a subscription
    if (upgradePrompt && subscription) {
      return <>{upgradePrompt}</>;
    }
    return <>{fallback}</>;
  }

  // Check if approaching limit and show warning
  if (warningComponent && limit > 0) {
    const usagePercentage = currentUsage / limit;
    if (usagePercentage >= warningThreshold) {
      return (
        <>
          {warningComponent}
          {children}
        </>
      );
    }
  }

  return <>{children}</>;
}
