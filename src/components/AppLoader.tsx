import { ReactNode } from 'react';
import { useApp } from '../providers/AppProvider';
import { useTenantOptional } from '../providers/TenantProvider';

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

  // Extract tenant state (if TenantProvider is present)
  const isTenantLoading = tenantContext?.isTenantLoading ?? false;
  const tenantError = tenantContext?.tenantError ?? null;
  const tenantSlug = tenantContext?.tenantSlug ?? null;
  const retryTenant = tenantContext?.retryTenant ?? (() => {});

  // Determine if we're still loading
  // Only wait for tenant if: requireTenant is true AND TenantProvider exists AND there's a tenantSlug
  const shouldWaitForTenant = requireTenant && tenantContext && tenantSlug;
  const isLoading = isAppLoading || (shouldWaitForTenant && isTenantLoading);

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

  // TenantProvider is optional
  const tenantContext = useTenantOptional();

  const isTenantLoading = tenantContext?.isTenantLoading ?? false;
  const tenantError = tenantContext?.tenantError ?? null;
  const tenant = tenantContext?.tenant ?? null;
  const tenantSlug = tenantContext?.tenantSlug ?? null;
  const retryTenant = tenantContext?.retryTenant ?? (() => {});

  const shouldWaitForTenant = requireTenant && tenantContext && tenantSlug;
  const isLoading = isAppLoading || (shouldWaitForTenant && isTenantLoading);
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
  };
}
