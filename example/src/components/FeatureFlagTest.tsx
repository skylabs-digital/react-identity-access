import { FeatureFlag, useFeatureFlags } from '@skylabs-digital/react-identity-access';

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
        {/* Example 1: Advanced Analytics */}
        <div>
          <h3>Example 1: Advanced Analytics</h3>
          <FeatureFlag name="Advanced Analytics">
            <div
              style={{
                backgroundColor: '#d1ecf1',
                padding: '15px',
                borderRadius: '4px',
                border: '1px solid #bee5eb',
              }}
            >
              📊 Advanced Analytics Dashboard is enabled!
              <br />
              <small>This content shows when "Advanced Analytics" feature flag is ON.</small>
            </div>
          </FeatureFlag>
        </div>

        {/* Example 2: Mobile App Features */}
        <div>
          <h3>Example 2: Mobile App Features</h3>
          <FeatureFlag
            name="Mobile App Features"
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
                📱 <strong>Mobile App Features Coming Soon!</strong>
                <br />
                <small>Mobile features are currently being developed for your tenant.</small>
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
              📱 Mobile App Features are now available!
              <br />
              <small>Enhanced mobile experience with offline capabilities.</small>
            </div>
          </FeatureFlag>
        </div>

        {/* Example 3: AI-Powered Recommendations */}
        <div>
          <h3>Example 3: AI-Powered Recommendations</h3>
          <FeatureFlag
            name="AI-Powered Recommendations"
            fallback={
              <div
                style={{
                  backgroundColor: '#f8d7da',
                  padding: '15px',
                  borderRadius: '4px',
                  border: '1px solid #f5c6cb',
                  textAlign: 'center',
                }}
              >
                🤖 <strong>AI Recommendations Disabled</strong>
                <br />
                <small>This feature has been disabled for your tenant.</small>
              </div>
            }
          >
            <div
              style={{
                backgroundColor: '#e2e3e5',
                padding: '15px',
                borderRadius: '4px',
                border: '1px solid #d6d8db',
              }}
            >
              🤖 AI-Powered Recommendations are active!
              <br />
              <small>Get intelligent vendor and venue suggestions powered by AI.</small>
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
              <li>
                Advanced Analytics: {isEnabled('Advanced Analytics') ? '✅ Enabled' : '❌ Disabled'}
              </li>
              <li>
                Mobile App Features:{' '}
                {isEnabled('Mobile App Features') ? '✅ Enabled' : '❌ Disabled'}
              </li>
              <li>
                AI-Powered Recommendations:{' '}
                {isEnabled('AI-Powered Recommendations') ? '✅ Enabled' : '❌ Disabled'}
              </li>
            </ul>

            {/* Show flag details */}
            {getFlag('Advanced Analytics') && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#6c757d' }}>
                <strong>Advanced Analytics details:</strong>{' '}
                {JSON.stringify(getFlag('Advanced Analytics'), null, 2)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
