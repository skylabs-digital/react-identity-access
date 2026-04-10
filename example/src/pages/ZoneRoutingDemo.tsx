import { useAuth, useTenant } from '@skylabs-digital/react-identity-access';

export default function ZoneRoutingDemo() {
  const { isAuthenticated, currentUser } = useAuth();
  const { tenant } = useTenant();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Zone-based Routing (RFC-005)</h1>
      <p className="text-gray-600 mb-6">
        Declarative route access control. Replace nested conditional rendering and manual
        redirects with presets like <code className="font-mono">PublicZone</code>,{' '}
        <code className="font-mono">AuthenticatedZone</code>,{' '}
        <code className="font-mono">TenantZone</code>, <code className="font-mono">AdminZone</code>.
      </p>

      <section className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Your current state</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between border-b py-1">
            <dt className="text-gray-600">isAuthenticated</dt>
            <dd className="font-mono">{String(isAuthenticated)}</dd>
          </div>
          <div className="flex justify-between border-b py-1">
            <dt className="text-gray-600">hasTenant</dt>
            <dd className="font-mono">{String(tenant !== null)}</dd>
          </div>
          <div className="flex justify-between border-b py-1">
            <dt className="text-gray-600">userType</dt>
            <dd className="font-mono">{currentUser?.userType ?? '—'}</dd>
          </div>
          <div className="flex justify-between border-b py-1">
            <dt className="text-gray-600">tenantSlug</dt>
            <dd className="font-mono">{tenant?.subdomain ?? '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Presets</h2>
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold text-gray-900">
              <code className="font-mono">PublicZone</code>
            </h3>
            <p className="text-gray-600">
              Renders for anyone. Redirects <em>authenticated</em> users away (e.g. from{' '}
              <code>/login</code> if they're already signed in).
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              <code className="font-mono">AuthenticatedZone</code>
            </h3>
            <p className="text-gray-600">
              Requires a valid session. Redirects to <code>/login</code> with a{' '}
              <code>returnTo</code> when the user is anonymous.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              <code className="font-mono">TenantZone</code>
            </h3>
            <p className="text-gray-600">
              Requires both a tenant and an authenticated user. Use for tenant-scoped content.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              <code className="font-mono">AdminZone</code>
            </h3>
            <p className="text-gray-600">
              Requires an authenticated <code className="font-mono">TENANT_ADMIN</code> or{' '}
              <code className="font-mono">SUPERUSER</code>.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Code</h2>
        <pre className="text-xs overflow-x-auto bg-gray-50 p-3 rounded border">
{`import {
  RoutingProvider,
  ZoneRoute,
  PublicZone,
  AuthenticatedZone,
  TenantZone,
  AdminZone,
} from '@skylabs-digital/react-identity-access';

<RoutingProvider
  config={{
    loginPath: '/login',
    unauthorizedPath: '/unauthorized',
    defaultAuthenticatedPath: '/dashboard',
  }}
>
  <Routes>
    {/* Anonymous-only zone */}
    <Route
      path="/login"
      element={
        <PublicZone>
          <LoginPage />
        </PublicZone>
      }
    />

    {/* Requires authentication */}
    <Route
      path="/dashboard"
      element={
        <AuthenticatedZone>
          <Dashboard />
        </AuthenticatedZone>
      }
    />

    {/* Requires tenant + auth */}
    <Route
      path="/team/*"
      element={
        <TenantZone>
          <TeamRoutes />
        </TenantZone>
      }
    />

    {/* Admin-only */}
    <Route
      path="/admin/*"
      element={
        <AdminZone>
          <AdminRoutes />
        </AdminZone>
      }
    />

    {/* Custom: authenticated, specific permissions */}
    <Route
      path="/reports"
      element={
        <ZoneRoute auth="required" permissions={['reports:read']}>
          <ReportsPage />
        </ZoneRoute>
      }
    />
  </Routes>
</RoutingProvider>`}
        </pre>
      </section>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>See also:</strong>{' '}
          <a
            href="https://github.com/skylabs-digital/react-identity-access/blob/main/docs/ZONE_ROUTING.md"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            docs/ZONE_ROUTING.md
          </a>{' '}
          for the full RFC-005 spec and all access-denied customization options.
        </p>
      </div>
    </div>
  );
}
