import { ReactNode } from 'react';
import { useSubscription } from '../../hooks/useSubscription';

export interface FeatureGateProps {
  feature: string;
  fallback?: ReactNode;
  upgradePrompt?: ReactNode;
  children: ReactNode;
}

export function FeatureGate({ feature, fallback, upgradePrompt, children }: FeatureGateProps) {
  const { hasFeature, subscription } = useSubscription();

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  // Show upgrade prompt if provided and user has a subscription
  if (upgradePrompt && subscription) {
    return <>{upgradePrompt}</>;
  }

  return <>{fallback}</>;
}
