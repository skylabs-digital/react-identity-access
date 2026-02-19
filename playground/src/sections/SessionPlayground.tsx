import { useState, useEffect } from 'react';
import { useAuth } from '@skylabs-digital/react-identity-access';

export function SessionPlayground() {
  const { sessionManager, isAuthenticated } = useAuth();
  const [tokens, setTokens] = useState<any>(null);
  const [validTokenResult, setValidTokenResult] = useState('');
  const [headersResult, setHeadersResult] = useState('');

  const refreshTokens = () => {
    const t = sessionManager.getTokens();
    setTokens(t);
  };

  useEffect(() => {
    refreshTokens();
  }, [isAuthenticated]);

  const testGetValidAccessToken = async () => {
    setValidTokenResult('Calling getValidAccessToken()...');
    try {
      const token = await sessionManager.getValidAccessToken();
      setValidTokenResult(
        `OK (${token.slice(0, 20)}...${token.slice(-10)}) [len=${token.length}]`
      );
    } catch (e: any) {
      setValidTokenResult(`ERROR [${e.constructor.name}]: ${e.message}`);
    }
  };

  const testGetAuthHeaders = async () => {
    setHeadersResult('Calling getAuthHeaders()...');
    try {
      const h = await sessionManager.getAuthHeaders();
      setHeadersResult(JSON.stringify(h, null, 2));
    } catch (e: any) {
      setHeadersResult(`ERROR [${e.constructor.name}]: ${e.message}`);
    }
  };

  const formatExpiry = (expiresAt?: number) => {
    if (!expiresAt) return 'N/A';
    const remaining = Math.round((expiresAt - Date.now()) / 1000);
    const date = new Date(expiresAt).toLocaleTimeString();
    return `${date} (${remaining}s remaining)`;
  };

  return (
    <div>
      <h2>Session & Tokens</h2>

      <div className="section">
        <h3>Stored Tokens</h3>
        <button onClick={refreshTokens}>Refresh view</button>
        {tokens ? (
          <div>
            <div className="row">
              <span>accessToken:</span>
              <span className="ok">
                {tokens.accessToken?.slice(0, 30)}...
              </span>
            </div>
            <div className="row">
              <span>refreshToken:</span>
              <span className="info">
                {tokens.refreshToken?.slice(0, 30)}...
              </span>
            </div>
            <div className="row">
              <span>expiresAt:</span>
              <span className="warn">{formatExpiry(tokens.expiresAt)}</span>
            </div>
            <div className="row">
              <span>hasValidSession:</span>
              <span className={sessionManager.hasValidSession() ? 'ok' : 'err'}>
                {String(sessionManager.hasValidSession())}
              </span>
            </div>
          </div>
        ) : (
          <pre className="warn">No tokens stored</pre>
        )}
      </div>

      <div className="grid">
        <div className="section">
          <h3>getValidAccessToken()</h3>
          <p style={{ color: '#888', marginBottom: 4 }}>
            Returns valid token or triggers refresh+queue
          </p>
          <button onClick={testGetValidAccessToken}>Call</button>
          {validTokenResult && (
            <pre className={validTokenResult.startsWith('ERROR') ? 'err' : 'ok'}>
              {validTokenResult}
            </pre>
          )}
        </div>

        <div className="section">
          <h3>getAuthHeaders()</h3>
          <p style={{ color: '#888', marginBottom: 4 }}>
            Returns {'{'} Authorization: Bearer ... {'}'}
          </p>
          <button onClick={testGetAuthHeaders}>Call</button>
          {headersResult && (
            <pre className={headersResult.startsWith('ERROR') ? 'err' : 'ok'}>
              {headersResult}
            </pre>
          )}
        </div>
      </div>

      <div className="section">
        <h3>Raw Token Data</h3>
        <pre>{tokens ? JSON.stringify(tokens, null, 2) : 'null'}</pre>
      </div>
    </div>
  );
}
