# Connectors Guide

Connectors provide the data access layer abstraction, enabling seamless switching between development (localStorage) and production (REST API) environments.

## Overview

The connector system follows a pluggable architecture where all data operations go through a standardized interface:

```typescript
interface BaseConnector {
  get<T>(path: string, requireAuth?: boolean): Promise<ApiResponse<T>>;
  list<T>(path: string, page?: number, limit?: number, requireAuth?: boolean): Promise<ApiResponse<T[]>>;
  create<T>(path: string, data: any, requireAuth?: boolean): Promise<ApiResponse<T>>;
  update<T>(path: string, id: string, updates: Partial<T>): Promise<ApiResponse<T>>;
  delete(path: string, id: string): Promise<ApiResponse<void>>;
}
```

## Built-in Connectors

### LocalStorageConnector

Perfect for rapid prototyping, demos, and development environments.

```tsx
<ConnectorProvider
  config={{
    type: 'localStorage',
    appId: 'my-app',
    storagePrefix: 'myapp_', // Optional, defaults to appId_
    seedData: {
      tenants: [{ id: 'demo', name: 'Demo Tenant' }],
      users: [{ id: '1', email: 'admin@demo.com', tenantId: 'demo' }],
      passwords: [{ userId: '1', hash: 'admin123' }]
    }
  }}
>
```

**Features:**
- Zero configuration required
- Automatic seed data population
- Persistent across browser sessions
- Tenant-isolated storage keys
- Mock authentication with simple password matching

**Storage Pattern:**
```
myapp_tenants -> [Tenant[]]
myapp_users -> [User[]]  
myapp_settings_demo_1.0.0 -> Settings
myapp_featureFlags -> [FeatureFlag[]]
auth_session_demo -> SessionData
```

### FetchConnector

Production-ready REST API integration with automatic fallbacks.

```tsx
<ConnectorProvider
  config={{
    type: 'fetch',
    appId: 'my-app',
    baseUrl: 'https://api.myapp.com',
    apiKey: process.env.REACT_APP_API_KEY,
    timeout: 10000,
    seedData: {
      // Fallback data when API is unavailable
      tenants: [{ id: 'demo', name: 'Demo Tenant' }]
    }
  }}
>
```

**Features:**
- Automatic authentication headers
- Token interceptor integration
- Seed data fallback on network errors
- Configurable timeout and retry logic
- RESTful path mapping

**API Endpoints:**
```
GET    /users           -> list users
GET    /users/123       -> get user by id
POST   /users           -> create user
PATCH  /users/123       -> update user
DELETE /users/123       -> delete user

POST   /auth/login      -> authenticate
POST   /auth/refresh    -> refresh token
POST   /auth/logout     -> logout
```

## Custom Connectors

Create custom connectors for specific backends or data sources:

```typescript
import { BaseConnector, ConnectorConfig, ApiResponse } from 'react-identity-access';

interface GraphQLConnectorConfig extends ConnectorConfig {
  endpoint: string;
  subscriptions?: boolean;
}

class GraphQLConnector extends BaseConnector {
  private endpoint: string;

  constructor(config: GraphQLConnectorConfig) {
    super(config);
    this.endpoint = config.endpoint;
  }

  protected async getItem<T>(path: string): Promise<T | null> {
    const query = this.buildQuery(path);
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    
    const result = await response.json();
    return result.data?.[path] || null;
  }

  protected async getList<T>(path: string): Promise<T[]> {
    // GraphQL list query implementation
  }

  protected async createItem<T>(path: string, data: any): Promise<T> {
    const mutation = this.buildMutation(path, data);
    // Implementation
  }

  protected async updateItem<T>(path: string, id: string, updates: Partial<T>): Promise<T> {
    // GraphQL update mutation
  }

  protected async deleteItem(path: string, id: string): Promise<void> {
    // GraphQL delete mutation
  }

  private buildQuery(path: string): string {
    // Build GraphQL query from path
  }

  private buildMutation(path: string, data: any): string {
    // Build GraphQL mutation
  }
}
```

## Authentication Integration

### Token Interceptor

Connectors automatically handle authentication through the token interceptor:

```typescript
interface TokenInterceptor {
  getAccessToken(): Promise<string | null>;
  refreshToken(): Promise<string | null>;
  onTokenExpired(): Promise<void>;
}
```

The IdentityProvider registers a token interceptor with the connector:

```typescript
// Automatic token injection
const response = await connector.get('protected-resource', true); // requireAuth = true

// Headers automatically include:
// Authorization: Bearer <token>
// X-API-Key: <apiKey>
```

### Authentication Flow

1. **Request with auth**: `connector.get('users', true)`
2. **Token check**: Interceptor validates token expiration
3. **Auto-refresh**: If expired, automatically refresh token
4. **Request retry**: Retry original request with new token
5. **Logout on failure**: If refresh fails, trigger logout

## Path Mapping

Connectors map logical paths to storage keys or API endpoints:

### LocalStorage Mapping
```typescript
'users' -> 'myapp_users'
'settings_demo_1.0.0' -> 'myapp_settings_demo_1.0.0'
'featureFlags' -> 'myapp_featureFlags'
'subscriptions/demo' -> 'myapp_subscriptions'
```

### API Endpoint Mapping
```typescript
'users' -> 'GET /users'
'users/123' -> 'GET /users/123'
'auth/login' -> 'POST /auth/login'
'feature-flags' -> 'GET /feature-flags'
'subscription-plans' -> 'GET /subscription-plans'
```

## Seed Data System

Seed data provides fallback content and enables rapid prototyping:

```typescript
interface SeedData {
  tenants?: Tenant[];
  users?: User[];
  passwords?: Password[]; // LocalStorage only
  roles?: Role[];
  permissions?: Permission[];
  featureFlags?: FeatureFlag[];
  subscriptionPlans?: SubscriptionPlan[];
}
```

### Fallback Strategy

1. **Primary source**: Try main data source (localStorage/API)
2. **Seed fallback**: If empty/error, use seed data
3. **Empty state**: If no seed data, return empty array/null

```typescript
// LocalStorageConnector example
protected async getList<T>(path: string): Promise<T[]> {
  const stored = this.storage.getItem(this.getStorageKey(path));
  
  if (stored) {
    return JSON.parse(stored);
  }
  
  // Fallback to seed data
  const seedKey = this.mapPathToSeedKey(path);
  if (seedKey && this.seedData?.[seedKey]) {
    return this.seedData[seedKey] as T[];
  }
  
  return [];
}
```

## Error Handling

### Standardized Responses

All connectors return standardized `ApiResponse<T>`:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}
```

### Error Categories

```typescript
type ErrorCode = 
  | 'UNAUTHORIZED'     // 401 - Authentication required
  | 'FORBIDDEN'        // 403 - Access denied
  | 'NOT_FOUND'        // 404 - Resource not found
  | 'VALIDATION_ERROR' // 400 - Invalid data
  | 'INTERNAL_ERROR'   // 500 - Server error
  | 'NETWORK_ERROR';   // Network/timeout issues
```

### Error Recovery

```typescript
try {
  const response = await connector.get('users');
  if (!response.success) {
    // Handle business logic errors
    console.error('API Error:', response.error);
    return;
  }
  // Use response.data
} catch (error) {
  // Handle network/system errors
  console.error('System Error:', error);
}
```

## Performance Optimization

### Caching Strategy

```typescript
class CachedConnector extends BaseConnector {
  private cache = new Map<string, { data: any; expires: number }>();
  
  protected async getItem<T>(path: string): Promise<T | null> {
    const cached = this.cache.get(path);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    
    const data = await super.getItem<T>(path);
    this.cache.set(path, {
      data,
      expires: Date.now() + (5 * 60 * 1000) // 5 minutes
    });
    
    return data;
  }
}
```

### Request Batching

```typescript
class BatchedConnector extends BaseConnector {
  private batchQueue: Array<{ path: string; resolve: Function }> = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  
  protected async getItem<T>(path: string): Promise<T | null> {
    return new Promise((resolve) => {
      this.batchQueue.push({ path, resolve });
      
      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => {
          this.processBatch();
        }, 10); // 10ms batch window
      }
    });
  }
  
  private async processBatch() {
    const batch = [...this.batchQueue];
    this.batchQueue.length = 0;
    this.batchTimeout = null;
    
    // Process all requests in single API call
    const paths = batch.map(item => item.path);
    const results = await this.batchRequest(paths);
    
    batch.forEach((item, index) => {
      item.resolve(results[index]);
    });
  }
}
```

## Testing Connectors

### Mock Connector

```typescript
class MockConnector extends BaseConnector {
  private mockData = new Map<string, any>();
  
  setMockData(path: string, data: any) {
    this.mockData.set(path, data);
  }
  
  protected async getItem<T>(path: string): Promise<T | null> {
    return this.mockData.get(path) || null;
  }
  
  protected async createItem<T>(path: string, data: any): Promise<T> {
    const id = Math.random().toString(36);
    const item = { ...data, id };
    
    const existing = this.mockData.get(path) || [];
    this.mockData.set(path, [...existing, item]);
    
    return item;
  }
}
```

### Testing with Jest

```typescript
describe('UserProvider', () => {
  let mockConnector: MockConnector;
  
  beforeEach(() => {
    mockConnector = new MockConnector({
      type: 'mock',
      appId: 'test'
    });
    
    mockConnector.setMockData('users', [
      { id: '1', email: 'test@example.com', name: 'Test User' }
    ]);
  });
  
  it('should load users', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <ConnectorProvider connector={mockConnector}>
          <IdentityProvider>
            {children}
          </IdentityProvider>
        </ConnectorProvider>
      )
    });
    
    await waitFor(() => {
      expect(result.current.users).toHaveLength(1);
    });
  });
});
```

## Migration Between Connectors

### Development to Production

```typescript
// Development
<ConnectorProvider
  config={{
    type: 'localStorage',
    appId: 'my-app',
    seedData: developmentData
  }}
>

// Production
<ConnectorProvider
  config={{
    type: 'fetch',
    appId: 'my-app',
    baseUrl: process.env.REACT_APP_API_URL,
    apiKey: process.env.REACT_APP_API_KEY,
    seedData: developmentData // Fallback only
  }}
>
```

### Data Export/Import

```typescript
// Export from localStorage
const exportData = async () => {
  const connector = new LocalStorageConnector(config);
  
  return {
    users: await connector.list('users'),
    tenants: await connector.list('tenants'),
    settings: await connector.get('settings')
  };
};

// Import to API
const importData = async (data: any) => {
  const connector = new FetchConnector(config);
  
  for (const user of data.users) {
    await connector.create('users', user);
  }
};
```

## Best Practices

### 1. Environment Configuration
```typescript
const getConnectorConfig = (): ConnectorConfig => {
  if (process.env.NODE_ENV === 'development') {
    return {
      type: 'localStorage',
      appId: 'my-app',
      seedData: mockData
    };
  }
  
  return {
    type: 'fetch',
    appId: 'my-app',
    baseUrl: process.env.REACT_APP_API_URL!,
    apiKey: process.env.REACT_APP_API_KEY!
  };
};
```

### 2. Error Boundaries
```typescript
const ConnectorErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={<div>Data connection failed. Please refresh.</div>}
      onError={(error) => {
        console.error('Connector error:', error);
        // Report to error tracking service
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
```

### 3. Graceful Degradation
```typescript
const useGracefulData = <T>(path: string, fallback: T) => {
  const { connector } = useConnector();
  const [data, setData] = useState<T>(fallback);
  
  useEffect(() => {
    connector.get<T>(path)
      .then(response => {
        if (response.success) {
          setData(response.data || fallback);
        }
      })
      .catch(() => {
        // Keep using fallback data
      });
  }, [path, fallback]);
  
  return data;
};
```
