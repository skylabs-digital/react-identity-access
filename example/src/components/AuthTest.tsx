import { useAuth } from '@skylabs-digital/react-identity-access';
import { useState } from 'react';

export default function AuthTest() {
  const { login, logout, sessionManager, hasValidSession } = useAuth();
  // const { appId } = useApp(); // Not used in current demo
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [tenantId, setTenantId] = useState('tenant-1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginResponse, setLoginResponse] = useState<any>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      // RFC-002: Use object parameters
      const response = await login({
        username: email,
        password: password,
        tenantSlug: tenantId || undefined, // Using tenantSlug instead of tenantId
      });
      setLoginResponse(response);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setLoginResponse(null);
    setError(null);
  };

  const handleClearSession = () => {
    sessionManager.clearSession();
    setLoginResponse(null);
    setError(null);
  };

  const isAuthenticated = hasValidSession();

  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
      }}
    >
      <h2>Authentication Test</h2>

      <div style={{ marginBottom: '15px' }}>
        <h3>Session Status</h3>
        <p>
          <strong>Has Valid Session:</strong> {isAuthenticated ? '✅ Yes' : '❌ No'}
        </p>
        <p>
          <strong>Current Tenant:</strong> {'demo-tenant'}
        </p>
        <p>
          <strong>Storage Key:</strong> {'auth_tokens_demo-tenant'}
        </p>
      </div>

      {loading && <p>Loading...</p>}
      {error && (
        <div
          style={{
            color: 'red',
            backgroundColor: '#f8d7da',
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '15px',
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {!isAuthenticated ? (
        <div>
          <h3>Login</h3>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
            <input
              type="text"
              placeholder="Tenant ID"
              value={tenantId}
              onChange={e => setTenantId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <h3>Authenticated ✅</h3>
          {loginResponse && (
            <div
              style={{
                backgroundColor: 'white',
                padding: '15px',
                borderRadius: '4px',
                marginBottom: '15px',
                border: '1px solid #ddd',
              }}
            >
              <h4>Login Response:</h4>
              <pre
                style={{
                  backgroundColor: '#f8f9fa',
                  padding: '10px',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '12px',
                }}
              >
                {JSON.stringify(loginResponse, null, 2)}
              </pre>
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleLogout}
              style={{
                padding: '10px 20px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
              }}
            >
              Logout
            </button>
            <button
              onClick={handleClearSession}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
              }}
            >
              Clear Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
