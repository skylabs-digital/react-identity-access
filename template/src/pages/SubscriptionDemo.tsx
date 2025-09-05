import { SubscriptionGuard, useSubscription } from 'react-identity-access';

function SubscriptionDemo() {
  const { subscription, features, isFeatureEnabled, getFeatureValue, hasAllowedPlan, loading, error } = useSubscription();

  if (loading) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          Loading subscription data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{
          padding: '1rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '6px',
          color: '#dc2626'
        }}>
          Error loading subscription: {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        padding: '2rem'
      }}>
        <h1 style={{ color: '#1f2937', marginBottom: '2rem' }}>💳 Subscription Demo</h1>

        {/* Current Subscription Info */}
        <div style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <h2 style={{ margin: '0 0 1rem 0', color: '#374151' }}>Current Subscription</h2>
          {subscription ? (
            <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div><strong>Plan:</strong> {subscription.planName} ({subscription.planId})</div>
              <div><strong>Status:</strong> 
                <span style={{ 
                  color: subscription.isActive ? '#10b981' : '#dc2626',
                  fontWeight: 'bold',
                  marginLeft: '0.5rem'
                }}>
                  {subscription.subscriptionStatus}
                </span>
              </div>
              <div><strong>Tenant:</strong> {subscription.tenantId}</div>
              <div><strong>Features:</strong> {features.length} available</div>
            </div>
          ) : (
            <p style={{ color: '#6b7280', margin: 0 }}>No subscription data available</p>
          )}
        </div>

        {/* Plan Features */}
        <div style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          backgroundColor: '#f0f9ff',
          borderRadius: '6px',
          border: '1px solid #0ea5e9'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#0c4a6e' }}>Available Features</h3>
          {features.length > 0 ? (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {features.map((feature) => (
                <div key={feature.key} style={{
                  padding: '0.75rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '4px',
                  border: '1px solid #bae6fd'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{feature.name}</strong> ({feature.key})
                      {feature.description && (
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                          {feature.description}
                        </div>
                      )}
                    </div>
                    <div style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      backgroundColor: feature.type === 'BOOLEAN' || feature.type === 'boolean' 
                        ? (feature.value ? '#dcfce7' : '#fef2f2')
                        : '#f3f4f6',
                      color: feature.type === 'BOOLEAN' || feature.type === 'boolean'
                        ? (feature.value ? '#166534' : '#dc2626')
                        : '#374151'
                    }}>
                      {feature.type}: {String(feature.value)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#6b7280', margin: 0 }}>No features available</p>
          )}
        </div>

        {/* Subscription Guards Demo */}
        <h2 style={{ color: '#1f2937', marginBottom: '1rem' }}>🔒 Subscription Guards Demo</h2>
        
        <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          
          {/* Basic Plan Guard */}
          <SubscriptionGuard allowedPlans={['basic']}>
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#f0fdf4',
              borderRadius: '6px',
              border: '1px solid #22c55e'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#166534' }}>✅ Basic Plan Feature</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#166534' }}>
                This content is only visible to users with the "basic" plan.
              </p>
            </div>
          </SubscriptionGuard>

          {/* Premium/Enterprise Plans Guard */}
          <SubscriptionGuard allowedPlans={['premium', 'enterprise']}>
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#fef3c7',
              borderRadius: '6px',
              border: '1px solid #f59e0b'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#92400e' }}>⭐ Premium/Enterprise Feature</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e' }}>
                This content is visible to users with "premium" OR "enterprise" plans.
              </p>
            </div>
          </SubscriptionGuard>

          {/* Feature-based Guard */}
          <SubscriptionGuard requiredFeature="advanced_analytics">
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#ede9fe',
              borderRadius: '6px',
              border: '1px solid #8b5cf6'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#5b21b6' }}>📊 Advanced Analytics</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#5b21b6' }}>
                This content requires the "advanced_analytics" feature to be enabled.
              </p>
            </div>
          </SubscriptionGuard>

          {/* Multiple Plans Guard */}
          <SubscriptionGuard allowedPlans={['starter', 'business', 'enterprise']}>
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#fdf2f8',
              borderRadius: '6px',
              border: '1px solid #ec4899'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#be185d' }}>🚀 Multi-Plan Feature</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#be185d' }}>
                Available to starter, business, or enterprise plans.
              </p>
            </div>
          </SubscriptionGuard>

        </div>

        {/* Programmatic Usage Examples */}
        <div style={{
          marginTop: '2rem',
          padding: '1.5rem',
          backgroundColor: '#f8fafc',
          borderRadius: '6px',
          border: '1px solid #cbd5e1'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#334155' }}>🔧 Programmatic Usage</h3>
          <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.875rem', fontFamily: 'monospace' }}>
            <div>
              <strong>hasAllowedPlan(['premium', 'enterprise']):</strong> {' '}
              <span style={{ color: hasAllowedPlan(['premium', 'enterprise']) ? '#10b981' : '#dc2626' }}>
                {String(hasAllowedPlan(['premium', 'enterprise']))}
              </span>
            </div>
            <div>
              <strong>isFeatureEnabled('advanced_analytics'):</strong> {' '}
              <span style={{ color: isFeatureEnabled('advanced_analytics') ? '#10b981' : '#dc2626' }}>
                {String(isFeatureEnabled('advanced_analytics'))}
              </span>
            </div>
            <div>
              <strong>getFeatureValue('max_users', 10):</strong> {' '}
              <span style={{ color: '#3b82f6' }}>
                {String(getFeatureValue('max_users', 10))}
              </span>
            </div>
            <div>
              <strong>getFeatureValue('api_calls_limit', 1000):</strong> {' '}
              <span style={{ color: '#3b82f6' }}>
                {String(getFeatureValue('api_calls_limit', 1000))}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default SubscriptionDemo;
