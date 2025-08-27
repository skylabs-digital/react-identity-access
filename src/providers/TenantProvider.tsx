import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useConnector } from './ConnectorProvider';

export interface TenantConfig {
  strategy: 'query-param' | 'subdomain' | 'header' | 'static';
  queryParam?: {
    paramName: string;
    storageKey?: string;
  };
  subdomain?: {
    storageKey?: string;
  };
  header?: {
    headerName: string;
  };
  static?: {
    tenantId: string;
  };
}

interface TenantContextValue {
  tenantId: string | null;
  isLoading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextValue | null>(null);

interface TenantProviderProps {
  config: TenantConfig;
  children: ReactNode;
}

export function TenantProvider({ config, children }: TenantProviderProps) {
  const { connector } = useConnector();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const resolveTenant = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let resolvedTenantId: string | null = null;

        switch (config.strategy) {
          case 'query-param': {
            const urlParams = new URLSearchParams(window.location.search);
            const paramTenant = urlParams.get(config.queryParam?.paramName || 'tenant');

            if (paramTenant) {
              resolvedTenantId = paramTenant;
              if (config.queryParam?.storageKey) {
                // Use connector to store tenant preference
                await connector.create('tenant-preferences', {
                  key: config.queryParam.storageKey,
                  value: paramTenant,
                });
              }
            } else if (config.queryParam?.storageKey) {
              // Use connector to get stored tenant preference
              const response = await connector.get<{ value: string }>(
                `tenant-preferences/${config.queryParam.storageKey}`
              );
              if (response.success) {
                resolvedTenantId = response.data.value;
              }
            }
            break;
          }

          case 'subdomain': {
            const hostname = window.location.hostname;
            const parts = hostname.split('.');
            if (parts.length > 2) {
              resolvedTenantId = parts[0];
              if (config.subdomain?.storageKey) {
                // Use connector to store tenant preference
                await connector.create('tenant-preferences', {
                  key: config.subdomain.storageKey,
                  value: resolvedTenantId,
                });
              }
            }
            break;
          }

          case 'header':
            // This would typically be handled server-side, but for demo purposes
            resolvedTenantId = 'demo-tenant';
            break;

          case 'static':
            resolvedTenantId = config.static?.tenantId || null;
            break;
        }

        setTenantId(resolvedTenantId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to resolve tenant');
      } finally {
        setIsLoading(false);
      }
    };

    resolveTenant();
  }, [config]);

  return (
    <TenantContext.Provider value={{ tenantId, isLoading, error }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
