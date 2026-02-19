import { useState } from 'react';
import { useAuth } from '@skylabs-digital/react-identity-access';

export function AuthPlayground() {
  const auth = useAuth();
  const [email, setEmail] = useState('test@user.com');
  const [password, setPassword] = useState('Test1234');
  const [tenantSlug, setTenantSlug] = useState('');
  const [loginResult, setLoginResult] = useState<string>('');
  const [logoutResult, setLogoutResult] = useState<string>('');

  const handleLogin = async () => {
    setLoginResult('Loading...');
    try {
      const res = await auth.login({ username: email, password, tenantSlug: tenantSlug || undefined });
      setLoginResult(JSON.stringify(res, null, 2));
    } catch (e: any) {
      setLoginResult(`ERROR: ${e.message}`);
    }
  };

  const handleLogout = async () => {
    setLogoutResult('Logging out...');
    try {
      await auth.logout();
      setLogoutResult('Logged out OK');
    } catch (e: any) {
      setLogoutResult(`ERROR: ${e.message}`);
    }
  };

  return (
    <div>
      <h2>Authentication</h2>

      <div className="section">
        <h3>Auth State</h3>
        <div className="row">
          <span>isAuthenticated:</span>
          <span className={auth.isAuthenticated ? 'badge badge-on' : 'badge badge-off'}>
            {String(auth.isAuthenticated)}
          </span>
        </div>
        <div className="row">
          <span>isAuthInitializing:</span>
          <span className="info">{String(auth.isAuthInitializing)}</span>
        </div>
        <div className="row">
          <span>isAuthReady:</span>
          <span className="info">{String(auth.isAuthReady)}</span>
        </div>
      </div>

      <div className="grid">
        <div className="section">
          <h3>Login</h3>
          <div className="row">
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email" />
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="password"
              type="password"
            />
            <input
              value={tenantSlug}
              onChange={e => setTenantSlug(e.target.value)}
              placeholder="tenantSlug (optional)"
              style={{ width: 220 }}
            />
            <button onClick={handleLogin} disabled={auth.isAuthenticated}>
              Login
            </button>
          </div>
          {loginResult && (
            <pre className={loginResult.startsWith('ERROR') ? 'err' : 'ok'}>{loginResult}</pre>
          )}
        </div>

        <div className="section">
          <h3>Logout</h3>
          <button onClick={handleLogout} disabled={!auth.isAuthenticated}>
            Logout
          </button>
          {logoutResult && <pre>{logoutResult}</pre>}
        </div>
      </div>

      <div className="section">
        <h3>Current User (from context)</h3>
        <pre>{auth.currentUser ? JSON.stringify(auth.currentUser, null, 2) : 'null (not logged in)'}</pre>
      </div>
    </div>
  );
}
