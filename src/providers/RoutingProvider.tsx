import { createContext, useContext, ReactNode, useMemo } from 'react';
import {
  RoutingConfig,
  ZoneRoots,
  ZonePresets,
  ZonePresetConfig,
  AccessDeniedReason,
  ReturnToStorage,
  DEFAULT_ZONE_ROOTS,
  DEFAULT_ZONE_PRESETS,
} from '../types/zoneRouting';

/**
 * Context value provided by RoutingProvider
 */
export interface RoutingContextValue {
  zoneRoots: Required<ZoneRoots>;
  presets: ZonePresets;
  loadingFallback: ReactNode;
  accessDeniedFallback: ReactNode;
  onAccessDenied?: (reason: AccessDeniedReason) => void;
  returnToParam: string;
  returnToStorage: ReturnToStorage;
}

const RoutingContext = createContext<RoutingContextValue | null>(null);

export interface RoutingProviderProps {
  config?: RoutingConfig;
  children: ReactNode;
}

/**
 * RoutingProvider - Global configuration for zone-based routing
 *
 * Provides default redirect paths, presets, and fallbacks that ZoneRoute
 * components will use. Can be customized per-application.
 *
 * @example
 * ```tsx
 * <RoutingProvider config={{
 *   zoneRoots: {
 *     tenantGuest: '/auth/login',
 *     tenantUser: '/app/dashboard',
 *     tenantAdmin: '/admin',
 *   },
 *   loadingFallback: <Spinner />,
 *   onAccessDenied: (reason) => console.log('Access denied:', reason),
 * }}>
 *   <App />
 * </RoutingProvider>
 * ```
 */
export function RoutingProvider({ config = {}, children }: RoutingProviderProps) {
  const contextValue = useMemo<RoutingContextValue>(() => {
    // Merge user config with defaults
    const zoneRoots: Required<ZoneRoots> = {
      ...DEFAULT_ZONE_ROOTS,
      ...config.zoneRoots,
    };

    const presets: ZonePresets = {
      ...DEFAULT_ZONE_PRESETS,
      ...config.presets,
    };

    return {
      zoneRoots,
      presets,
      loadingFallback: config.loadingFallback ?? null,
      accessDeniedFallback: config.accessDeniedFallback ?? null,
      onAccessDenied: config.onAccessDenied,
      returnToParam: config.returnToParam ?? 'returnTo',
      returnToStorage: config.returnToStorage ?? 'url',
    };
  }, [config]);

  return <RoutingContext.Provider value={contextValue}>{children}</RoutingContext.Provider>;
}

/**
 * Hook to access routing configuration
 * @throws Error if used outside RoutingProvider
 */
export function useRouting(): RoutingContextValue {
  const context = useContext(RoutingContext);
  if (!context) {
    throw new Error('useRouting must be used within a RoutingProvider');
  }
  return context;
}

/**
 * Optional hook that returns RoutingContext if available, defaults otherwise.
 * Useful for ZoneRoute which should work with or without RoutingProvider.
 */
export function useRoutingOptional(): RoutingContextValue {
  const context = useContext(RoutingContext);

  // Return defaults if no provider
  if (!context) {
    return {
      zoneRoots: DEFAULT_ZONE_ROOTS,
      presets: DEFAULT_ZONE_PRESETS,
      loadingFallback: null,
      accessDeniedFallback: null,
      onAccessDenied: undefined,
      returnToParam: 'returnTo',
      returnToStorage: 'url',
    };
  }

  return context;
}

/**
 * Get a specific preset configuration
 */
export function useZonePreset(
  presetName: keyof ZonePresets | string
): ZonePresetConfig | undefined {
  const { presets } = useRoutingOptional();
  return presets[presetName as keyof ZonePresets];
}
