import { useState, useMemo } from 'react';
import {
  useAuth,
  useApp,
  HttpService,
  AuthApiService,
  RoleApiService,
  UserApiService,
  HealthApiService,
} from '@skylabs-digital/react-identity-access';

const APP_ID = '67420000-5b08-420f-a384-5d9dc6532ba2';

export function ApiServicesPlayground() {
  const { baseUrl, appId } = useApp();
  const { isAuthenticated, sessionManager } = useAuth();
  const [results, setResults] = useState<Record<string, string>>({});

  const setResult = (key: string, value: string) => {
    setResults(prev => ({ ...prev, [key]: value }));
  };

  const publicHttp = useMemo(() => new HttpService(baseUrl), [baseUrl]);
  const authedHttp = useMemo(() => {
    const h = new HttpService(baseUrl);
    h.setSessionManager(sessionManager);
    return h;
  }, [baseUrl, sessionManager]);

  const callHealth = async () => {
    setResult('health', 'Loading...');
    try {
      const svc = new HealthApiService(publicHttp);
      const res = await svc.checkHealth();
      setResult('health', JSON.stringify(res, null, 2));
    } catch (e: any) {
      setResult('health', `ERROR: ${e.message}`);
    }
  };

  const callLoginRaw = async () => {
    setResult('loginRaw', 'Loading...');
    try {
      const svc = new AuthApiService(publicHttp);
      const res = await svc.login({
        username: 'test@user.com',
        password: 'Test1234',
        appId: APP_ID,
        tenantId: 'c732fe19-5eb5-4e2a-9e8a-4bcdc08f0a4a',
      });
      setResult('loginRaw', JSON.stringify(res, null, 2));
    } catch (e: any) {
      setResult('loginRaw', `ERROR: ${e.message}`);
    }
  };

  const callRolesByApp = async () => {
    setResult('roles', 'Loading...');
    try {
      const svc = new RoleApiService(publicHttp);
      const res = await svc.getRolesByApp(appId);
      setResult('roles', JSON.stringify(res, null, 2));
    } catch (e: any) {
      setResult('roles', `ERROR: ${e.message}`);
    }
  };

  const callGetUser = async () => {
    setResult('users', 'Loading...');
    try {
      // Decode JWT to get userId
      const tokens = sessionManager.getTokens();
      if (!tokens?.accessToken) {
        setResult('users', 'ERROR: No access token');
        return;
      }
      const payload = JSON.parse(atob(tokens.accessToken.split('.')[1]));
      const userId = payload.userId || payload.sub || payload.id;
      if (!userId) {
        setResult('users', `No userId in JWT. Payload:\n${JSON.stringify(payload, null, 2)}`);
        return;
      }
      const svc = new UserApiService(authedHttp, sessionManager);
      const res = await svc.getUserById(userId);
      setResult('users', JSON.stringify(res, null, 2));
    } catch (e: any) {
      setResult('users', `ERROR: ${e.message}`);
    }
  };

  const callFetchRaw = async () => {
    setResult('fetchRaw', 'Loading...');
    try {
      const headers = await sessionManager.getAuthHeaders();
      const res = await fetch(`${baseUrl}/roles/app/${appId}`, { headers });
      const data = await res.json();
      setResult('fetchRaw', `Status: ${res.status}\n${JSON.stringify(data, null, 2)}`);
    } catch (e: any) {
      setResult('fetchRaw', `ERROR: ${e.message}`);
    }
  };

  return (
    <div>
      <h2>API Services (direct calls)</h2>

      <div className="section">
        <h3>Public Endpoints (no auth)</h3>
        <div className="row">
          <button onClick={callHealth}>HealthApiService.checkHealth()</button>
          <button onClick={callLoginRaw}>AuthApiService.login() [raw]</button>
        </div>
        {results.health && (
          <div>
            <strong style={{ color: '#888' }}>health:</strong>
            <pre className={results.health.startsWith('ERROR') ? 'err' : 'ok'}>
              {results.health}
            </pre>
          </div>
        )}
        {results.loginRaw && (
          <div>
            <strong style={{ color: '#888' }}>login raw:</strong>
            <pre className={results.loginRaw.startsWith('ERROR') ? 'err' : 'ok'}>
              {results.loginRaw}
            </pre>
          </div>
        )}
      </div>

      <div className="section">
        <h3>Authenticated Endpoints (uses SessionManager)</h3>
        <div className="row">
          <button onClick={callRolesByApp} disabled={!isAuthenticated}>
            RoleApiService.getRolesByApp()
          </button>
          <button onClick={callGetUser} disabled={!isAuthenticated}>
            UserApiService.getUserById()
          </button>
          <button onClick={callFetchRaw} disabled={!isAuthenticated}>
            Raw fetch /roles
          </button>
        </div>
        {results.roles && (
          <div>
            <strong style={{ color: '#888' }}>roles:</strong>
            <pre className={results.roles.startsWith('ERROR') ? 'err' : 'ok'}>
              {results.roles}
            </pre>
          </div>
        )}
        {results.users && (
          <div>
            <strong style={{ color: '#888' }}>user:</strong>
            <pre className={results.users.startsWith('ERROR') ? 'err' : 'ok'}>
              {results.users}
            </pre>
          </div>
        )}
        {results.fetchRaw && (
          <div>
            <strong style={{ color: '#888' }}>raw fetch:</strong>
            <pre className={results.fetchRaw.startsWith('ERROR') ? 'err' : 'ok'}>
              {results.fetchRaw}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
