# Component Structure

## File Organization

```
src/
├── index.ts                    # Main exports
├── types/                      # TypeScript type definitions
│   ├── auth.ts
│   ├── roles.ts
│   ├── tenant.ts
│   ├── session.ts
│   ├── connector.ts
│   └── debug.ts
├── providers/                  # React context providers
│   ├── IdentityProvider.tsx
│   ├── TenantProvider.tsx
│   ├── AuthProvider.tsx
│   ├── RoleProvider.tsx
│   └── SessionProvider.tsx
├── hooks/                      # Custom React hooks
│   ├── useAuth.ts
│   ├── useRoles.ts
│   ├── useTenant.ts
│   ├── useSession.ts
│   └── useDebug.ts
├── components/                 # React components
│   ├── guards/
│   │   ├── ProtectedRoute.tsx
│   │   └── RoleGuard.tsx
│   ├── forms/
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   └── ui/
│       ├── TenantSwitch.tsx
│       └── UserProfile.tsx
├── connectors/                 # Backend connectors
│   ├── base/
│   │   └── IdentityConnector.ts
│   ├── localStorage/
│   │   ├── LocalStorageConnector.ts
│   │   └── mockData.ts
│   └── api/
│       ├── ApiConnector.ts
│       └── endpoints.ts
├── utils/                      # Utility functions
│   ├── permissions.ts
│   ├── roles.ts
│   ├── tokens.ts
│   └── debug.ts
└── errors/                     # Custom error classes
    ├── AuthenticationError.ts
    ├── AuthorizationError.ts
    ├── SessionError.ts
    └── TenantError.ts
```

## Provider Implementation Strategy

### 1. IdentityProvider (Root)

**Responsibilities:**
- Initialize connector
- Provide global configuration
- Setup debug system
- Handle global error boundaries

**Key Features:**
- Connector injection
- Configuration management
- Global error handling
- Debug system initialization

### 2. TenantProvider

**Responsibilities:**
- Manage current tenant state
- Handle tenant switching
- Provide tenant-specific configuration

**Key Features:**
- Tenant selection and switching
- Tenant-specific settings
- Multi-tenant data isolation

### 3. AuthProvider

**Responsibilities:**
- User authentication state
- Login/logout operations
- User profile management

**Key Features:**
- Authentication state management
- Credential validation
- User session initialization

### 4. RoleProvider

**Responsibilities:**
- Role and permission management
- Authorization checks
- Role hierarchy handling

**Key Features:**
- Role-based access control
- Permission checking utilities
- Dynamic role updates

### 5. SessionProvider

**Responsibilities:**
- Token management
- Session validation
- Automatic token refresh

**Key Features:**
- Access/refresh token handling
- Automatic token renewal
- Session timeout management

## Hook Implementation Patterns

### State Management Pattern

```typescript
// Common pattern for all hooks
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  
  return context;
}
```

### Action Pattern

```typescript
// Actions return promises and handle errors
const login = useCallback(async (credentials: LoginCredentials) => {
  try {
    dispatch({ type: 'LOGIN_START' });
    const response = await connector.login(credentials);
    dispatch({ type: 'LOGIN_SUCCESS', payload: response });
  } catch (error) {
    dispatch({ type: 'LOGIN_ERROR', payload: error.message });
    throw error;
  }
}, [connector, dispatch]);
```

### Memoization Pattern

```typescript
// Expensive computations are memoized
const hasPermission = useMemo(() => 
  (permission: string, resource?: string) => {
    return userPermissions.some(p => 
      p.name === permission && 
      (!resource || p.resource === resource)
    );
  }, 
  [userPermissions]
);
```

## Component Patterns

### Guard Components

```typescript
// Higher-order component pattern for route protection
export function ProtectedRoute({ 
  children, 
  requiredRoles = [], 
  requiredPermissions = [],
  requireAll = true,
  fallback,
  redirectTo 
}: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();
  const { hasAnyRole, hasAllRoles, hasPermission } = useRoles();
  
  if (!isAuthenticated) {
    return redirectTo ? <Navigate to={redirectTo} /> : null;
  }
  
  const hasRequiredRoles = requireAll 
    ? hasAllRoles(requiredRoles)
    : hasAnyRole(requiredRoles);
    
  const hasRequiredPermissions = requiredPermissions.every(permission =>
    hasPermission(permission)
  );
  
  if (!hasRequiredRoles || !hasRequiredPermissions) {
    return fallback || <AccessDenied />;
  }
  
  return <>{children}</>;
}
```

### Form Components

```typescript
// Controlled form pattern with validation
export function LoginForm({ onSuccess, onError, customFields = [] }: LoginFormProps) {
  const { login, isLoading, error } = useAuth();
  const [formData, setFormData] = useState<LoginFormData>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    try {
      await login(formData);
      onSuccess?.(formData);
    } catch (err) {
      onError?.(err.message);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

## Connector Architecture

### Base Connector Interface

```typescript
export abstract class IdentityConnector {
  protected config: ConnectorConfig;
  protected debug: DebugLogger;
  
  constructor(config: ConnectorConfig) {
    this.config = config;
    this.debug = createDebugLogger('connector');
  }
  
  // Abstract methods that must be implemented
  abstract login(credentials: LoginCredentials): Promise<AuthResponse>;
  abstract logout(): Promise<void>;
  abstract refreshToken(token: string): Promise<TokenPair>;
  
  // Common utility methods
  protected handleError(error: unknown): never {
    this.debug.error('Connector error', error);
    throw this.mapError(error);
  }
  
  protected abstract mapError(error: unknown): Error;
}
```

### LocalStorage Connector

```typescript
export class LocalStorageConnector extends IdentityConnector {
  private storage: Storage;
  private mockData: MockDataStore;
  
  constructor(config: LocalStorageConnectorConfig) {
    super(config);
    this.storage = window.localStorage;
    this.mockData = new MockDataStore();
  }
  
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    this.debug.info('Login attempt', { email: credentials.email });
    
    // Simulate network delay
    if (this.config.simulateDelay) {
      await this.simulateDelay();
    }
    
    // Simulate random errors for testing
    if (this.config.errorRate && Math.random() < this.config.errorRate) {
      throw new AuthenticationError('Simulated network error', 'NETWORK_ERROR');
    }
    
    const user = this.mockData.validateCredentials(credentials);
    if (!user) {
      throw new AuthenticationError('Invalid credentials', 'INVALID_CREDENTIALS');
    }
    
    const tokens = this.generateTokens(user);
    this.storeTokens(tokens);
    
    return { user, tokens };
  }
  
  private async simulateDelay(): Promise<void> {
    const delay = Math.random() * (this.config.maxDelay - this.config.minDelay) + this.config.minDelay;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}
```

### API Connector

```typescript
export class ApiConnector extends IdentityConnector {
  private httpClient: HttpClient;
  
  constructor(config: ApiConnectorConfig) {
    super(config);
    this.httpClient = new HttpClient(config);
  }
  
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    this.debug.info('API login request', { email: credentials.email });
    
    try {
      const response = await this.httpClient.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw this.mapError(error);
    }
  }
  
  protected mapError(error: unknown): Error {
    if (error instanceof HttpError) {
      switch (error.status) {
        case 401:
          return new AuthenticationError('Invalid credentials', 'INVALID_CREDENTIALS');
        case 403:
          return new AuthorizationError('Access denied', 'ACCESS_DENIED');
        case 422:
          return new ValidationError('Invalid input', 'VALIDATION_ERROR');
        default:
          return new ConnectorError('API request failed', 'API_ERROR');
      }
    }
    
    return new ConnectorError('Unknown error', 'UNKNOWN_ERROR');
  }
}
```

## Testing Strategy

### Unit Tests Structure

```
__tests__/
├── providers/
│   ├── AuthProvider.test.tsx
│   ├── RoleProvider.test.tsx
│   └── TenantProvider.test.tsx
├── hooks/
│   ├── useAuth.test.ts
│   ├── useRoles.test.ts
│   └── useTenant.test.ts
├── components/
│   ├── ProtectedRoute.test.tsx
│   └── LoginForm.test.tsx
├── connectors/
│   ├── LocalStorageConnector.test.ts
│   └── ApiConnector.test.ts
└── utils/
    ├── permissions.test.ts
    └── roles.test.ts
```

### Test Utilities

```typescript
// Test wrapper for providers
export function createTestWrapper(
  connector: IdentityConnector,
  config?: Partial<IdentityConfig>
) {
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <IdentityProvider connector={connector} config={config}>
        <TenantProvider>
          <AuthProvider>
            <RoleProvider>
              <SessionProvider>
                {children}
              </SessionProvider>
            </RoleProvider>
          </AuthProvider>
        </TenantProvider>
      </IdentityProvider>
    );
  };
}

// Mock connector for testing
export class MockConnector extends IdentityConnector {
  private mockResponses: Map<string, any> = new Map();
  
  setMockResponse(method: string, response: any) {
    this.mockResponses.set(method, response);
  }
  
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = this.mockResponses.get('login');
    if (response instanceof Error) throw response;
    return response || { user: mockUser, tokens: mockTokens };
  }
}
```

## Performance Considerations

### Bundle Splitting

```typescript
// Lazy load non-critical components
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const UserProfile = lazy(() => import('./components/UserProfile'));

// Code splitting by feature
export const AuthComponents = {
  LoginForm: lazy(() => import('./components/forms/LoginForm')),
  RegisterForm: lazy(() => import('./components/forms/RegisterForm'))
};
```

### Memoization Strategy

```typescript
// Provider-level memoization
const AuthProvider = memo(({ children, ...props }) => {
  const value = useMemo(() => ({
    // Provider value
  }), [/* dependencies */]);
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
});

// Hook-level memoization
export function useAuth() {
  const context = useContext(AuthContext);
  
  return useMemo(() => ({
    ...context,
    hasRole: (role: string) => context.user?.roles.includes(role) ?? false,
    hasPermission: (permission: string) => 
      context.permissions?.includes(permission) ?? false
  }), [context]);
}
```

### Re-render Optimization

```typescript
// Separate contexts for different concerns
const AuthStateContext = createContext<AuthState>();
const AuthActionsContext = createContext<AuthActions>();

// Actions don't change, preventing unnecessary re-renders
export function useAuthActions() {
  return useContext(AuthActionsContext);
}

export function useAuthState() {
  return useContext(AuthStateContext);
}
```
