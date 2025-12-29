import { ReactNode } from 'react';
import { useApp } from '../providers/AppProvider';
import { useTenantOptional } from '../providers/TenantProvider';
import { useAuthOptional } from '../providers/AuthProvider';
import { useFeatureFlagsOptional } from '../providers/FeatureFlagProvider';
import { useSubscriptionOptional } from '../providers/SubscriptionProvider';

export interface AppLoaderProps {
  children: ReactNode;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode | ((error: Error, retry: () => void) => ReactNode);
  // Optional: require tenant to be loaded (default: true)
  requireTenant?: boolean;
}

// Default loading component
const DefaultLoadingFallback = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'system-ui, sans-serif',
    }}
  >
    <div>Loading...</div>
  </div>
);

// Default error component
const DefaultErrorFallback = ({ error, retry }: { error: Error; retry: () => void }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'system-ui, sans-serif',
      textAlign: 'center',
      padding: '20px',
    }}
  >
    <h2 style={{ color: '#dc3545', marginBottom: '16px' }}>Error</h2>
    <p style={{ color: '#6c757d', marginBottom: '24px' }}>
      {error.message || 'Unable to load application'}
    </p>
    <button
      onClick={retry}
      style={{
        padding: '8px 16px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
      }}
    >
      Retry
    </button>
  </div>
);

/**
 * AppLoader - Blocks rendering until App (and optionally Tenant) data are loaded
 *
 * Must be used inside AppProvider. TenantProvider is optional.
 *
 * @example
 * ```tsx
 * // With TenantProvider (parallel loading)
 * <AppProvider config={appConfig}>
 *   <TenantProvider config={tenantConfig}>
 *     <AppLoader loadingFallback={<Spinner />}>
 *       <App />
 *     </AppLoader>
 *   </TenantProvider>
 * </AppProvider>
 *
 * // Without TenantProvider (app only)
 * <AppProvider config={appConfig}>
 *   <AppLoader loadingFallback={<Spinner />}>
 *     <App />
 *   </AppLoader>
 * </AppProvider>
 * ```
 */
export function AppLoader({
  children,
  loadingFallback,
  errorFallback,
  requireTenant = true,
}: AppLoaderProps) {
  // AppProvider is required - useApp will throw if not present
  const { isAppLoading, appError, retryApp } = useApp();

  // TenantProvider is optional
  const tenantContext = useTenantOptional();

  // Optional providers
  const authContext = useAuthOptional();
  const featureFlagsContext = useFeatureFlagsOptional();
  const subscriptionContext = useSubscriptionOptional();

  // Extract tenant state (if TenantProvider is present)
  const isTenantLoading = tenantContext?.isTenantLoading ?? false;
  const tenantError = tenantContext?.tenantError ?? null;
  const tenantSlug = tenantContext?.tenantSlug ?? null;
  const retryTenant = tenantContext?.retryTenant ?? (() => {});

  // Extract ready states from optional providers (default to ready if not present)
  const isAuthReady = authContext?.isAuthReady ?? true;
  const isFeatureFlagsReady = featureFlagsContext?.isReady ?? true;
  const isSubscriptionReady = subscriptionContext?.isReady ?? true;

  // Determine if we're still loading
  // Only wait for tenant if: requireTenant is true AND TenantProvider exists AND there's a tenantSlug
  const shouldWaitForTenant = requireTenant && tenantContext && tenantSlug;
  // Wait for optional providers if they exist and are not ready
  const shouldWaitForAuth = authContext && !isAuthReady;
  const shouldWaitForFeatureFlags = featureFlagsContext && !isFeatureFlagsReady;
  const shouldWaitForSubscription = subscriptionContext && !isSubscriptionReady;

  const isLoading =
    isAppLoading ||
    (shouldWaitForTenant && isTenantLoading) ||
    shouldWaitForAuth ||
    shouldWaitForFeatureFlags ||
    shouldWaitForSubscription;

  // Combine errors - app error takes priority
  const error = appError || (shouldWaitForTenant ? tenantError : null);

  // Combined retry function
  const retry = () => {
    if (appError) {
      retryApp();
    }
    if (tenantError && tenantContext) {
      retryTenant();
    }
  };

  // Show loading state
  if (isLoading) {
    return <>{loadingFallback || <DefaultLoadingFallback />}</>;
  }

  // Show error state
  if (error) {
    const ErrorComponent =
      typeof errorFallback === 'function'
        ? errorFallback(error, retry)
        : errorFallback || <DefaultErrorFallback error={error} retry={retry} />;

    return <>{ErrorComponent}</>;
  }

  // Both app and tenant are ready
  return <>{children}</>;
}

/**
 * Hook to get the combined loading state of App and Tenant
 * Useful for showing loading indicators without blocking rendering
 *
 * Must be used inside AppProvider. TenantProvider is optional.
 */
export function useAppLoaderState(requireTenant = true) {
  // AppProvider is required - useApp will throw if not present
  const { isAppLoading, appError, retryApp, appInfo } = useApp();

  // Optional providers
  const tenantContext = useTenantOptional();
  const authContext = useAuthOptional();
  const featureFlagsContext = useFeatureFlagsOptional();
  const subscriptionContext = useSubscriptionOptional();

  const isTenantLoading = tenantContext?.isTenantLoading ?? false;
  const tenantError = tenantContext?.tenantError ?? null;
  const tenant = tenantContext?.tenant ?? null;
  const tenantSlug = tenantContext?.tenantSlug ?? null;
  const retryTenant = tenantContext?.retryTenant ?? (() => {});

  const isAuthReady = authContext?.isAuthReady ?? true;
  const isFeatureFlagsReady = featureFlagsContext?.isReady ?? true;
  const isSubscriptionReady = subscriptionContext?.isReady ?? true;

  const shouldWaitForTenant = requireTenant && tenantContext && tenantSlug;
  const shouldWaitForAuth = authContext && !isAuthReady;
  const shouldWaitForFeatureFlags = featureFlagsContext && !isFeatureFlagsReady;
  const shouldWaitForSubscription = subscriptionContext && !isSubscriptionReady;

  const isLoading =
    isAppLoading ||
    (shouldWaitForTenant && isTenantLoading) ||
    shouldWaitForAuth ||
    shouldWaitForFeatureFlags ||
    shouldWaitForSubscription;

  const error = appError || (shouldWaitForTenant ? tenantError : null);
  const isReady =
    !isLoading && !error && appInfo !== null && (!shouldWaitForTenant || tenant !== null);

  const retry = () => {
    if (appError) retryApp();
    if (tenantError && tenantContext) retryTenant();
  };

  return {
    isLoading,
    error,
    isReady,
    retry,
    // Individual states
    app: { isLoading: isAppLoading, error: appError, data: appInfo },
    tenant: tenantContext ? { isLoading: isTenantLoading, error: tenantError, data: tenant } : null,
    auth: authContext ? { isReady: isAuthReady } : null,
    featureFlags: featureFlagsContext ? { isReady: isFeatureFlagsReady } : null,
    subscription: subscriptionContext ? { isReady: isSubscriptionReady } : null,
  };
}
