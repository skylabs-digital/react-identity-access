import React, { ReactNode } from 'react';
import { useFeatureFlags } from '../../providers/FeatureFlagsProvider';

export interface FeatureFlagProps {
  flag: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export const FeatureFlag = ({ flag, children, fallback }: FeatureFlagProps) => {
  const { isEnabled } = useFeatureFlags();

  if (!isEnabled(flag)) {
    return <>{fallback || null}</>;
  }

  return <>{children}</>;
};
