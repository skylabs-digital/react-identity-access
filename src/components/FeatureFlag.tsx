import { ReactNode } from 'react';
import { useFeatureFlags } from '../providers/FeatureFlagProvider';

interface FeatureFlagProps {
  name: string;
  children: ReactNode;
  fallback?: ReactNode;
}

const DefaultFallback = ({ flagName }: { flagName: string }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '6px',
      textAlign: 'center',
      fontFamily: 'system-ui, sans-serif',
      color: '#6c757d',
    }}
  >
    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🚧</div>
    <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
      Feature Not Available
    </div>
    <div style={{ fontSize: '12px', opacity: 0.7 }}>Feature flag "{flagName}" is disabled</div>
  </div>
);

export function FeatureFlag({ name, children, fallback }: FeatureFlagProps) {
  const { isEnabled, loading } = useFeatureFlags();

  // Show loading state while fetching feature flags
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '10px',
          color: '#6c757d',
          fontSize: '14px',
        }}
      >
        Loading feature flags...
      </div>
    );
  }

  // Show children if feature flag is enabled
  if (isEnabled(name)) {
    return <>{children}</>;
  }

  // Show fallback if provided, otherwise show default fallback
  return <>{fallback || <DefaultFallback flagName={name} />}</>;
}
