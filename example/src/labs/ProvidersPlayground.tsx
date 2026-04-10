import {
  useAuth,
  useApp,
  useTenant,
  useFeatureFlags,
  useSubscription,
} from '@skylabs-digital/react-identity-access';

export function ProvidersPlayground() {
  const app = useApp();
  const tenant = useTenant();
  const auth = useAuth();
  let featureFlags: any = null;
  let subscription: any = null;

  try {
    featureFlags = useFeatureFlags();
  } catch {
    // not available
  }
  try {
    subscription = useSubscription();
  } catch {
    // not available
  }

  return (
    <div>
      <h2>Providers State (full dump)</h2>

      <div className="section">
        <h3>AppProvider (useApp)</h3>
        <pre>{JSON.stringify({ baseUrl: app.baseUrl, appId: app.appId, appInfo: app.appInfo }, null, 2)}</pre>
      </div>

      <div className="section">
        <h3>TenantProvider (useTenant)</h3>
        <pre>
          {JSON.stringify(
            {
              tenantSlug: tenant.tenantSlug,
              isTenantLoading: tenant.isTenantLoading,
              tenantError: tenant.tenantError?.message || null,
              tenant: tenant.tenant,
            },
            null,
            2
          )}
        </pre>
      </div>

      <div className="section">
        <h3>AuthProvider (useAuth) - state only</h3>
        <pre>
          {JSON.stringify(
            {
              isAuthenticated: auth.isAuthenticated,
              isAuthInitializing: auth.isAuthInitializing,
              isAuthReady: auth.isAuthReady,
              isUserLoading: auth.isUserLoading,
              userError: auth.userError?.message || null,
              currentUser: auth.currentUser
                ? { id: auth.currentUser.id, name: auth.currentUser.name, email: auth.currentUser.email }
                : null,
              availableRolesCount: auth.availableRoles?.length ?? 0,
              userPermissionsCount: auth.userPermissions?.length ?? 0,
              userTenantsCount: auth.userTenants?.length ?? 0,
              hasTenantContext: auth.hasTenantContext,
            },
            null,
            2
          )}
        </pre>
      </div>

      <div className="section">
        <h3>FeatureFlagProvider (useFeatureFlags)</h3>
        <pre>
          {featureFlags
            ? JSON.stringify(
                {
                  flags: featureFlags.flags,
                  isLoading: featureFlags.isLoading,
                  error: featureFlags.error?.message || null,
                },
                null,
                2
              )
            : 'Not available (provider missing or error)'}
        </pre>
      </div>

      <div className="section">
        <h3>SubscriptionProvider (useSubscription)</h3>
        <pre>
          {subscription
            ? JSON.stringify(
                {
                  subscription: subscription.subscription,
                  isLoading: subscription.isLoading,
                  error: subscription.error?.message || null,
                },
                null,
                2
              )
            : 'Not available (provider missing or error)'}
        </pre>
      </div>
    </div>
  );
}
