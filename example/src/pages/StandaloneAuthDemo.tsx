import { useState } from 'react';
import { AuthProvider, useAuth, LoginForm } from '@skylabs-digital/react-identity-access';

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://idachu-dev.skylabs.digital/api';
const APP_ID = import.meta.env.VITE_APP_ID || '67420000-5b08-420f-a384-5d9dc6532ba2';

/**
 * Inner component that consumes the standalone AuthProvider.
 * Note: no AppProvider and no TenantProvider wrap it.
 */
function StandaloneInner() {
  const { isAuthenticated, currentUser, logout } = useAuth();

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Auth state</h3>
        <dl className="text-sm space-y-1">
          <div className="flex justify-between">
            <dt className="text-gray-600">isAuthenticated</dt>
            <dd className="font-mono">{String(isAuthenticated)}</dd>
          </div>
          {currentUser && (
            <>
              <div className="flex justify-between">
                <dt className="text-gray-600">User id</dt>
                <dd className="font-mono">{currentUser.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Email</dt>
                <dd className="font-mono">{currentUser.email ?? '—'}</dd>
              </div>
            </>
          )}
        </dl>
      </div>

      {isAuthenticated ? (
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Logout
        </button>
      ) : (
        <div className="bg-white border rounded-lg p-4">
          <LoginForm showMagicLinkOption={false} />
        </div>
      )}
    </div>
  );
}

export default function StandaloneAuthDemo() {
  // Track the standalone provider separately so we can mount/unmount it
  // without affecting the main app's AuthProvider stack.
  const [mounted, setMounted] = useState(false);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Standalone AuthProvider</h1>
      <p className="text-gray-600 mb-6">
        Since v2.27, <code className="font-mono">AuthProvider</code> can be used without{' '}
        <code className="font-mono">AppProvider</code> and{' '}
        <code className="font-mono">TenantProvider</code>. Pass{' '}
        <code className="font-mono">baseUrl</code> and <code className="font-mono">appId</code>{' '}
        directly via <code className="font-mono">AuthConfig</code>. Ideal for single-tenant apps
        or auth-only scenarios.
      </p>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-900">
          <strong>Note:</strong> this section mounts its own isolated{' '}
          <code>&lt;AuthProvider&gt;</code>. Logging in here does <em>not</em> affect the rest
          of the example app's session and vice versa, because the outer app uses a different
          <code> SessionManager</code> instance via the nested provider setup.
        </p>
      </div>

      {!mounted ? (
        <button
          onClick={() => setMounted(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Mount standalone AuthProvider
        </button>
      ) : (
        <>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setMounted(false)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Unmount
            </button>
          </div>
          <AuthProvider config={{ baseUrl: BASE_URL, appId: APP_ID }}>
            <StandaloneInner />
          </AuthProvider>
        </>
      )}

      <div className="mt-8 bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Code</h3>
        <pre className="text-xs overflow-x-auto bg-white p-3 rounded border">
{`import { AuthProvider, useAuth, LoginForm } from '@skylabs-digital/react-identity-access';

function App() {
  return (
    <AuthProvider
      config={{
        baseUrl: 'https://api.example.com',
        appId: 'your-app-id',
      }}
    >
      <YourApp />
    </AuthProvider>
  );
}`}
        </pre>
      </div>
    </div>
  );
}
