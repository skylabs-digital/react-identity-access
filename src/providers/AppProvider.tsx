import {
  createContext,
  useContext,
  useMemo,
  ReactNode,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { HttpService } from '../services/HttpService';
import { AppApiService } from '../services/AppApiService';
import type { PublicAppInfo } from '../types/api';

interface CachedAppInfo {
  data: PublicAppInfo;
  timestamp: number;
  appId: string;
}

export interface AppConfig {
  baseUrl: string;
  appId: string;
  cache?: {
    enabled?: boolean;
    ttl?: number;
    storageKey?: string;
  };
}

interface AppContextValue {
  appId: string;
  baseUrl: string;
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

const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

export function AppProvider({ config, children }: AppProviderProps) {
  const { appId, baseUrl } = config;
  const cacheEnabled = config.cache?.enabled ?? true;
  const cacheTtl = config.cache?.ttl ?? DEFAULT_CACHE_TTL;
  const cacheStorageKey = config.cache?.storageKey ?? `app_cache_${appId}`;

  const [appInfo, setAppInfo] = useState<PublicAppInfo | null>(() => {
    if (!cacheEnabled) return null;
    try {
      const cached = localStorage.getItem(cacheStorageKey);
      if (!cached) return null;
      const parsed: CachedAppInfo = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < cacheTtl && parsed.appId === appId) {
        return parsed.data;
      }
      localStorage.removeItem(cacheStorageKey);
      return null;
    } catch {
      return null;
    }
  });

  const [isAppLoading, setIsAppLoading] = useState(!appInfo);
  const [appError, setAppError] = useState<Error | null>(null);

  const appInfoRef = useRef(appInfo);
  appInfoRef.current = appInfo;

  const loadApp = useCallback(
    async (bypassCache = false) => {
      if (!bypassCache && cacheEnabled && appInfoRef.current) return;

      try {
        setIsAppLoading(true);
        setAppError(null);

        const appApi = new AppApiService(new HttpService(baseUrl));
        const appData = await appApi.getPublicAppInfo(appId);
        setAppInfo(appData);

        if (cacheEnabled) {
          try {
            const cacheData: CachedAppInfo = {
              data: appData,
              timestamp: Date.now(),
              appId,
            };
            localStorage.setItem(cacheStorageKey, JSON.stringify(cacheData));
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[AppProvider] Failed to cache app info:', error);
            }
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
    [baseUrl, appId, cacheEnabled, cacheStorageKey]
  );

  const backgroundRefresh = useCallback(async () => {
    if (!cacheEnabled || !appInfoRef.current) return;

    try {
      const cached = localStorage.getItem(cacheStorageKey);
      if (!cached) return;

      const parsed: CachedAppInfo = JSON.parse(cached);
      if (Date.now() - parsed.timestamp <= cacheTtl * 0.5) return;

      const appApi = new AppApiService(new HttpService(baseUrl));
      const appData = await appApi.getPublicAppInfo(appId);
      setAppInfo(appData);

      const cacheData: CachedAppInfo = {
        data: appData,
        timestamp: Date.now(),
        appId,
      };
      localStorage.setItem(cacheStorageKey, JSON.stringify(cacheData));
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[AppProvider] Background app refresh failed:', error);
      }
    }
  }, [baseUrl, appId, cacheEnabled, cacheTtl, cacheStorageKey]);

  const contextValue = useMemo<AppContextValue>(
    () => ({
      appId,
      baseUrl,
      appInfo,
      isAppLoading,
      appError,
      retryApp: () => {
        loadApp(true);
      },
    }),
    [appId, baseUrl, appInfo, isAppLoading, appError, loadApp]
  );

  useEffect(() => {
    if (appInfoRef.current) {
      backgroundRefresh();
    } else {
      loadApp();
    }
    // Run once on mount — loadApp/backgroundRefresh read the latest state via ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export function useAppOptional(): AppContextValue | null {
  return useContext(AppContext);
}

export const useApi = useApp;
