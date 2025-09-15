import { Protected, useAuth } from '@skylabs-digital/react-identity-access';

export default function ProtectedContent() {
  const { hasValidSession, logout } = useAuth();

  return (
    <div style={{ padding: '20px' }}>
      <h2>Protected Content Test</h2>

      {/* Status Display */}
      <div
        style={{
          backgroundColor: hasValidSession() ? '#d4edda' : '#f8d7da',
          color: hasValidSession() ? '#155724' : '#721c24',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '20px',
        }}
      >
        <strong>Session Status:</strong> {hasValidSession() ? '✅ Logged In' : '❌ Not Logged In'}
      </div>

      {/* Logout Button */}
      {hasValidSession() && (
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={logout}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Logout
          </button>
        </div>
      )}

      {/* Protected Content Examples */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Example 1: Default fallback */}
        <div>
          <h3>Example 1: Default Fallback</h3>
          <Protected>
            <div
              style={{
                backgroundColor: '#d1ecf1',
                padding: '15px',
                borderRadius: '4px',
                border: '1px solid #bee5eb',
              }}
            >
              🎉 This content is only visible to authenticated users!
              <br />
              <small>This uses the default fallback when not logged in.</small>
            </div>
          </Protected>
        </div>

        {/* Example 2: Custom fallback */}
        <div>
          <h3>Example 2: Custom Fallback</h3>
          <Protected
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
                🔒 <strong>Custom Message:</strong> Please log in to see exclusive content!
                <br />
                <a
                  href="/login"
                  style={{ color: '#856404', marginTop: '10px', display: 'inline-block' }}
                >
                  Go to Login →
                </a>
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
              🚀 Premium content for authenticated users only!
              <br />
              <small>This example shows a custom fallback message.</small>
            </div>
          </Protected>
        </div>

        {/* Example 3: Nested protected content */}
        <div>
          <h3>Example 3: Nested Protected Components</h3>
          <Protected>
            <div
              style={{
                backgroundColor: '#e2e3e5',
                padding: '15px',
                borderRadius: '4px',
                border: '1px solid #d6d8db',
              }}
            >
              📊 User Dashboard
              <Protected
                fallback={
                  <div style={{ marginTop: '10px', fontStyle: 'italic', color: '#6c757d' }}>
                    Additional permissions required for admin features
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
                  🛠️ Admin Panel (nested protected content)
                </div>
              </Protected>
            </div>
          </Protected>
        </div>
      </div>
    </div>
  );
}
