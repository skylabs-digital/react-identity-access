import {
  createContext,
  useContext,
  useMemo,
  ReactNode,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { HttpService } from '../services/HttpService';
import { AppApiService } from '../services/AppApiService';
import type { PublicAppInfo } from '../types/api';

// RFC-003: Cache interface for app info
interface CachedAppInfo {
  data: PublicAppInfo;
  timestamp: number;
  appId: string;
}

export interface AppConfig {
  baseUrl: string;
  appId: string;
  // RFC-003: Cache configuration
  cache?: {
    enabled?: boolean; // Default: true
    ttl?: number; // Time to live in milliseconds, default: 5 minutes
    storageKey?: string; // Default: 'app_cache_{appId}'
  };
}

interface AppContextValue {
  appId: string;
  baseUrl: string;
  // App info with settings schema
  appInfo: PublicAppInfo | null;
  isAppLoading: boolean;
  appError: Error | null;
  retryApp: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

interface AppProviderProps {
  config: AppConfig;
  children: ReactNode;
}

export function AppProvider({ config, children }: AppProviderProps) {
  // RFC-003: Cache configuration with defaults
  const cacheConfig = useMemo(
    () => ({
      enabled: config.cache?.enabled ?? true,
      ttl: config.cache?.ttl ?? 5 * 60 * 1000, // 5 minutes default
      storageKey: config.cache?.storageKey ?? `app_cache_${config.appId}`,
    }),
    [config.cache, config.appId]
  );

  // RFC-003: Try to load from cache on initialization
  const [appInfo, setAppInfo] = useState<PublicAppInfo | null>(() => {
    if (!cacheConfig.enabled) return null;

    try {
      const cached = localStorage.getItem(cacheConfig.storageKey);
      if (!cached) return null;

      const parsed: CachedAppInfo = JSON.parse(cached);
      const now = Date.now();
      const age = now - parsed.timestamp;

      // Check if cache is still valid
      if (age < cacheConfig.ttl && parsed.appId === config.appId) {
        return parsed.data;
      }

      // Cache expired
      localStorage.removeItem(cacheConfig.storageKey);
      return null;
    } catch {
      return null;
    }
  });

  const [isAppLoading, setIsAppLoading] = useState(!appInfo); // Don't load if we have cache
  const [appError, setAppError] = useState<Error | null>(null);

  const contextValue = useMemo(() => {
    // Retry function for app loading
    const retryApp = () => {
      loadApp();
    };

    return {
      appId: config.appId,
      baseUrl: config.baseUrl,
      // App info
      appInfo,
      isAppLoading,
      appError,
      retryApp,
    };
  }, [config, appInfo, isAppLoading, appError]);

  // RFC-003: Load app info with caching
  const loadApp = useCallback(
    async (bypassCache = false) => {
      // Check cache first (unless bypassing)
      if (!bypassCache && cacheConfig.enabled && appInfo) {
        return; // Already have valid cached data
      }

      try {
        setIsAppLoading(true);
        setAppError(null);

        const httpService = new HttpService(config.baseUrl);
        const appApi = new AppApiService(httpService, {} as any); // SessionManager not needed for public endpoint
        const appData = await appApi.getPublicAppInfo(config.appId);
        setAppInfo(appData);

        // RFC-003: Save to cache
        if (cacheConfig.enabled) {
          try {
            const cacheData: CachedAppInfo = {
              data: appData,
              timestamp: Date.now(),
              appId: config.appId,
            };
            localStorage.setItem(cacheConfig.storageKey, JSON.stringify(cacheData));
          } catch (error) {
            console.warn('Failed to cache app info:', error);
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load app information');
        setAppError(error);
        setAppInfo(null);
      } finally {
        setIsAppLoading(false);
      }
    },
    [config.baseUrl, config.appId, cacheConfig, appInfo]
  );

  // RFC-003: Background refresh for stale-while-revalidate
  const backgroundRefresh = useCallback(async () => {
    if (!cacheConfig.enabled || !appInfo) return;

    try {
      const cached = localStorage.getItem(cacheConfig.storageKey);
      if (!cached) return;

      const parsed: CachedAppInfo = JSON.parse(cached);
      const age = Date.now() - parsed.timestamp;

      // If cache is more than 50% expired, refresh in background
      if (age > cacheConfig.ttl * 0.5) {
        const httpService = new HttpService(config.baseUrl);
        const appApi = new AppApiService(httpService, {} as any);
        const appData = await appApi.getPublicAppInfo(config.appId);

        setAppInfo(appData);

        const cacheData: CachedAppInfo = {
          data: appData,
          timestamp: Date.now(),
          appId: config.appId,
        };
        localStorage.setItem(cacheConfig.storageKey, JSON.stringify(cacheData));
      }
    } catch (error) {
      console.warn('Background app refresh failed:', error);
      // Don't update error state - keep showing cached data
    }
  }, [config, cacheConfig, appInfo]);

  // RFC-003: Load app info on mount or do background refresh
  useEffect(() => {
    if (!appInfo) {
      loadApp();
    } else {
      // We have cached data, do background refresh
      backgroundRefresh();
    }
  }, []); // Only run on mount

  // No longer blocks children - loading state is exposed via context
  // Use AppLoader component to block until ready
  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

/**
 * Optional hook that returns AppContext if available, null otherwise.
 */
export function useAppOptional(): AppContextValue | null {
  return useContext(AppContext);
}

// Backward compatibility
export const useApi = useApp;
