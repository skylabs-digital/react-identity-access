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

export interface AppConfig {
  baseUrl: string;
  appId: string;
  // Fallbacks
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode | ((error: Error, retry: () => void) => ReactNode);
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
    <div>Loading application...</div>
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
    <h2 style={{ color: '#dc3545', marginBottom: '16px' }}>Application Error</h2>
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

export function AppProvider({ config, children }: AppProviderProps) {
  // App info state
  const [appInfo, setAppInfo] = useState<PublicAppInfo | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
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

  // Load app info
  const loadApp = useCallback(async () => {
    try {
      setIsAppLoading(true);
      setAppError(null);

      const httpService = new HttpService(config.baseUrl);
      const appApi = new AppApiService(httpService, {} as any); // SessionManager not needed for public endpoint
      const appData = await appApi.getPublicAppInfo(config.appId);
      setAppInfo(appData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load app information');
      setAppError(error);
      setAppInfo(null);
    } finally {
      setIsAppLoading(false);
    }
  }, [config.baseUrl, config.appId]);


  // Load app info on mount
  useEffect(() => {
    loadApp();
  }, [loadApp]);


  // Show loading fallback for app info
  if (isAppLoading) {
    return <>{config.loadingFallback || <DefaultLoadingFallback />}</>;
  }

  // Show error fallback for app info
  if (appError) {
    const ErrorComponent =
      typeof config.errorFallback === 'function'
        ? config.errorFallback(appError, () => loadApp())
        : config.errorFallback || (
            <DefaultErrorFallback error={appError} retry={() => loadApp()} />
          );

    return <>{ErrorComponent}</>;
  }

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Backward compatibility
export const useApi = useApp;

