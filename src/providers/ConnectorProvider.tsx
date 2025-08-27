import { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { ConnectorConfig, TokenInterceptor } from '../connectors/base/BaseConnector';
import { BaseConnector } from '../connectors/base/BaseConnector';
import { LocalStorageConnector } from '../connectors/localStorage/LocalStorageConnector';
import { FetchConnector } from '../connectors/fetch/FetchConnector';

interface ConnectorContextValue {
  connector: BaseConnector;
  config: ConnectorConfig;
  setTokenInterceptor: (interceptor: TokenInterceptor) => void;
}

const ConnectorContext = createContext<ConnectorContextValue | null>(null);

interface ConnectorProviderProps {
  config: ConnectorConfig;
  onTokenInterceptorReady?: (interceptor: TokenInterceptor) => void;
  children: ReactNode;
}

export function ConnectorProvider({
  config,
  onTokenInterceptorReady,
  children,
}: ConnectorProviderProps) {
  const [tokenInterceptor, setTokenInterceptor] = useState<TokenInterceptor | undefined>();

  // Create connector instance once and memoize it - don't recreate on tokenInterceptor change
  const connector = useMemo(() => {
    if (config.type === 'localStorage') {
      return new LocalStorageConnector({
        appId: config.appId,
        seedData: config.seedData,
        storagePrefix: `${config.appId}_`,
        type: 'localStorage',
        tokenInterceptor: undefined, // Will be set later
      });
    } else {
      return new FetchConnector({
        appId: config.appId,
        baseUrl: config.baseUrl!,
        apiKey: config.apiKey,
        seedData: config.seedData,
        type: 'fetch',
        tokenInterceptor: undefined, // Will be set later
      });
    }
  }, [config]);

  // Update connector's tokenInterceptor when it changes
  useEffect(() => {
    if (tokenInterceptor && connector) {
      connector.setTokenInterceptor(tokenInterceptor);
    }
  }, [tokenInterceptor, connector]);

  // Expose setter function for IdentityProvider to register token interceptor
  const contextValue = {
    connector,
    config,
    setTokenInterceptor: (interceptor: TokenInterceptor) => {
      setTokenInterceptor(interceptor);
      onTokenInterceptorReady?.(interceptor);
    },
  };

  return <ConnectorContext.Provider value={contextValue}>{children}</ConnectorContext.Provider>;
}

export function useConnector(): ConnectorContextValue {
  const context = useContext(ConnectorContext);
  if (!context) {
    throw new Error('useConnector must be used within a ConnectorProvider');
  }
  return context;
}
