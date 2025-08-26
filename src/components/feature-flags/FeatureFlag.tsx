import { ReactNode } from 'react';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';

export interface FeatureFlagProps {
  flag: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export const FeatureFlag: React.FC<FeatureFlagProps> = ({ flag, children, fallback }) => {
  const { isEnabled } = useFeatureFlags();

  if (!isEnabled(flag)) {
    return fallback || null;
  }

  return <>{children}</>;
};
