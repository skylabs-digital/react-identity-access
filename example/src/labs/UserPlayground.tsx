import { useState } from 'react';
import { useAuth } from '@skylabs-digital/react-identity-access';

export function UserPlayground() {
  const auth = useAuth();
  const [refreshResult, setRefreshResult] = useState('');
  const [permCheck, setPermCheck] = useState('');
  const [permInput, setPermInput] = useState('products.read');

  const handleRefreshUser = async () => {
    setRefreshResult('Loading...');
    try {
      await auth.refreshUser();
      setRefreshResult('OK - user refreshed');
    } catch (e: any) {
      setRefreshResult(`ERROR: ${e.message}`);
    }
  };

  const checkPermission = () => {
    if (!permInput) return;
    const has = auth.hasPermission(permInput);
    setPermCheck(`hasPermission("${permInput}") = ${has}`);
  };

  return (
    <div>
      <h2>User & Roles</h2>

      <div className="grid">
        <div className="section">
          <h3>currentUser</h3>
          <div className="row">
            <span>isUserLoading:</span>
            <span className="info">{String(auth.isUserLoading)}</span>
          </div>
          <div className="row">
            <span>userError:</span>
            <span className={auth.userError ? 'err' : 'ok'}>
              {auth.userError?.message || 'null'}
            </span>
          </div>
          <button onClick={handleRefreshUser} disabled={!auth.isAuthenticated}>
            refreshUser()
          </button>
          {refreshResult && <pre>{refreshResult}</pre>}
          <pre>
            {auth.currentUser ? JSON.stringify(auth.currentUser, null, 2) : 'null'}
          </pre>
        </div>

        <div className="section">
          <h3>Roles</h3>
          <div className="row">
            <span>availableRoles:</span>
            <span className="info">{auth.availableRoles?.length ?? 0} roles</span>
          </div>
          <pre>{JSON.stringify(auth.availableRoles, null, 2)}</pre>

          <h3>Permissions</h3>
          <div className="row">
            <span>userPermissions:</span>
            <span className="info">{auth.userPermissions?.length ?? 0} perms</span>
          </div>
          <pre>
            {auth.userPermissions?.length
              ? JSON.stringify(auth.userPermissions, null, 2)
              : '[] (no permissions)'}
          </pre>

          <h3>Check Permission</h3>
          <div className="row">
            <input
              value={permInput}
              onChange={e => setPermInput(e.target.value)}
              placeholder="e.g. products.read"
            />
            <button onClick={checkPermission}>hasPermission()</button>
          </div>
          {permCheck && (
            <pre className={permCheck.includes('true') ? 'ok' : 'warn'}>{permCheck}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
