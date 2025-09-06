import { FeatureFlag, useFeatureFlags } from 'react-identity-access';

export default function FeatureFlagTest() {
  const { featureFlags, loading, error, isEnabled, getFlag, refresh } = useFeatureFlags();

  return (
    <div style={{ padding: '20px' }}>
      <h2>Feature Flag Test</h2>

      {/* Status Display */}
      <div
        style={{
          backgroundColor: error ? '#f8d7da' : loading ? '#fff3cd' : '#d4edda',
          color: error ? '#721c24' : loading ? '#856404' : '#155724',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '20px',
        }}
      >
        <strong>Status:</strong>{' '}
        {error
          ? `❌ Error: ${error}`
          : loading
            ? '⏳ Loading feature flags...'
            : `✅ Loaded ${featureFlags.length} feature flags`}
      </div>

      {/* Refresh Button */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={refresh}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: loading ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
          }}
        >
          {loading ? 'Refreshing...' : 'Refresh Feature Flags'}
        </button>
      </div>

      {/* Feature Flags List */}
      {featureFlags.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h3>Available Feature Flags</h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            {featureFlags.map(flag => (
              <div
                key={flag.featureFlagId}
                style={{
                  padding: '10px',
                  backgroundColor: flag.value ? '#d4edda' : '#f8d7da',
                  border: `1px solid ${flag.value ? '#c3e6cb' : '#f5c6cb'}`,
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong>{flag.name}</strong>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>
                    Key: {flag.key}
                  </div>
                </div>
                <div
                  style={{
                    padding: '4px 8px',
                    backgroundColor: flag.value ? '#28a745' : '#dc3545',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                >
                  {flag.value ? 'ON' : 'OFF'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature Flag Examples */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Example 1: Default fallback */}
        <div>
          <h3>Example 1: Default Fallback</h3>
          <FeatureFlag name="new-dashboard">
            <div
              style={{
                backgroundColor: '#d1ecf1',
                padding: '15px',
                borderRadius: '4px',
                border: '1px solid #bee5eb',
              }}
            >
              🎉 New Dashboard Feature is enabled!
              <br />
              <small>This content shows when "new-dashboard" feature flag is ON.</small>
            </div>
          </FeatureFlag>
        </div>

        {/* Example 2: Custom fallback */}
        <div>
          <h3>Example 2: Custom Fallback</h3>
          <FeatureFlag
            name="premium-features"
            fallback={
              <div
                style={{
                  backgroundColor: '#fff3cd',
                  padding: '15px',
                  borderRadius: '4px',
                  border: '1px solid #ffeaa7',
                  textAlign: 'center',
                }}
              >
                🔒 <strong>Premium Features Coming Soon!</strong>
                <br />
                <small>This feature is currently in development.</small>
              </div>
            }
          >
            <div
              style={{
                backgroundColor: '#d4edda',
                padding: '15px',
                borderRadius: '4px',
                border: '1px solid #c3e6cb',
              }}
            >
              ⭐ Premium features are now available!
              <br />
              <small>Advanced analytics, custom reports, and more.</small>
            </div>
          </FeatureFlag>
        </div>

        {/* Example 3: Nested feature flags */}
        <div>
          <h3>Example 3: Nested Feature Flags</h3>
          <FeatureFlag name="beta-ui">
            <div
              style={{
                backgroundColor: '#e2e3e5',
                padding: '15px',
                borderRadius: '4px',
                border: '1px solid #d6d8db',
              }}
            >
              🚀 Beta UI is enabled
              <FeatureFlag
                name="experimental-charts"
                fallback={
                  <div style={{ marginTop: '10px', fontStyle: 'italic', color: '#6c757d' }}>
                    Advanced charts are not available yet
                  </div>
                }
              >
                <div
                  style={{
                    backgroundColor: '#fff2cc',
                    padding: '10px',
                    marginTop: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ffeaa7',
                  }}
                >
                  📊 Experimental charts feature (nested)
                </div>
              </FeatureFlag>
            </div>
          </FeatureFlag>
        </div>

        {/* Example 4: Manual flag checking */}
        <div>
          <h3>Example 4: Manual Flag Checking</h3>
          <div
            style={{
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '4px',
              border: '1px solid #dee2e6',
            }}
          >
            <div>
              <strong>Manual checks:</strong>
            </div>
            <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
              <li>new-dashboard: {isEnabled('new-dashboard') ? '✅ Enabled' : '❌ Disabled'}</li>
              <li>
                premium-features: {isEnabled('premium-features') ? '✅ Enabled' : '❌ Disabled'}
              </li>
              <li>beta-ui: {isEnabled('beta-ui') ? '✅ Enabled' : '❌ Disabled'}</li>
              <li>
                experimental-charts:{' '}
                {isEnabled('experimental-charts') ? '✅ Enabled' : '❌ Disabled'}
              </li>
            </ul>

            {/* Show flag details */}
            {getFlag('new-dashboard') && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#6c757d' }}>
                <strong>new-dashboard details:</strong>{' '}
                {JSON.stringify(getFlag('new-dashboard'), null, 2)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
