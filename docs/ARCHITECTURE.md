# Architecture Design

## Core Principles

1. **Separation of Concerns** - Each provider handles a specific domain
2. **Pluggable Architecture** - Connectors can be swapped without code changes
3. **Type Safety** - Full TypeScript support with strict typing
4. **Developer Experience** - Simple APIs with powerful debugging capabilities
5. **Performance** - Minimal re-renders and efficient state management

## System Architecture

### Provider Stack

```
┌─────────────────────────────────────┐
│           IdentityProvider          │ ← Root configuration & connector
├─────────────────────────────────────┤
│           TenantProvider            │ ← Multi-tenancy context
├─────────────────────────────────────┤
│            AuthProvider             │ ← Authentication state
├─────────────────────────────────────┤
│            RoleProvider             │ ← Role & permission management
├─────────────────────────────────────┤
│          SessionProvider            │ ← Token & session handling
└─────────────────────────────────────┘
```

### Data Flow

```
User Action → Hook → Provider → Connector → Backend/Storage
                ↓
            State Update → Context → Component Re-render
```

## Core Types

### User & Authentication

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  roles: Role[];
  metadata?: Record<string, any>;
  createdAt: Date;
  lastLoginAt?: Date;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface LoginCredentials {
  email: string;
  password: string;
  tenantId?: string;
}
```

### Roles & Permissions

```typescript
interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  permissions: Permission[];
  isSystemRole: boolean;
  tenantId?: string;
}

interface RoleState {
  roles: Role[];
  currentUserRoles: Role[];
  permissions: Permission[];
  isLoading: boolean;
}
```

### Multi-tenancy

```typescript
interface Tenant {
  id: string;
  name: string;
  domain?: string; // For subdomain strategy
  settings: TenantSettings;
  isActive: boolean;
  createdAt: Date;
}

interface TenantResolver {
  strategy: 'subdomain' | 'query-param';
  subdomain?: {
    pattern: string; // e.g., "{tenant}.example.com"
  };
  queryParam?: {
    paramName: string; // e.g., "tenant"
    storageKey: string; // sessionStorage key
  };
}

interface TenantSettings {
  allowSelfRegistration: boolean;
  requireEmailVerification: boolean;
  sessionTimeout: number;
  maxConcurrentSessions: number;
  customBranding?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
}

interface TenantState {
  currentTenant: Tenant | null;
  availableTenants: Tenant[];
  isLoading: boolean;
  resolutionStrategy: 'subdomain' | 'query-param';
  showLanding: boolean;
}
```

### Session Management

```typescript
interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenType: 'Bearer';
}

interface SessionState {
  tokens: TokenPair | null;
  isValid: boolean;
  expiresAt: Date | null;
  lastActivity: Date | null;
  isRefreshing: boolean;
}
```

## Connector Architecture

### Base Connector Interface

```typescript
interface IdentityConnector {
  // Authentication
  login(credentials: LoginCredentials): Promise<AuthResponse>;
  logout(): Promise<void>;
  refreshToken(refreshToken: string): Promise<TokenPair>;
  
  // User Management
  getCurrentUser(): Promise<User>;
  updateUser(updates: Partial<User>): Promise<User>;
  
  // Roles & Permissions
  getUserRoles(userId: string): Promise<Role[]>;
  getPermissions(roleIds: string[]): Promise<Permission[]>;
  
  // Multi-tenancy
  getTenant(tenantId: string): Promise<Tenant>;
  getUserTenants(userId: string): Promise<Tenant[]>;
  
  // Session
  validateSession(token: string): Promise<boolean>;
  extendSession(): Promise<void>;
}
```

### LocalStorage Connector

Simulates backend behavior with:
- Configurable delays (100-500ms)
- Error simulation (network failures, invalid credentials)
- Data persistence across browser sessions
- Debug logging

### API Connector

Production-ready connector with:
- HTTP client configuration
- Automatic retry logic
- Request/response interceptors
- Error handling and mapping

## State Management Strategy

### Context Optimization

Each provider manages its own slice of state and only re-renders when its specific data changes:

```typescript
// Separate contexts prevent unnecessary re-renders
const AuthContext = createContext<AuthState>();
const RoleContext = createContext<RoleState>();
const TenantContext = createContext<TenantState>();
const SessionContext = createContext<SessionState>();
```

### Action-Based Updates

All state changes go through action dispatchers:

```typescript
interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  clearError: () => void;
}
```

## Security Considerations

### Token Storage

- Access tokens: Memory only (React state)
- Refresh tokens: Secure storage (httpOnly cookies in production, localStorage in development)
- Automatic token rotation
- Secure token transmission

### Permission Checking

```typescript
// Client-side permission checking (UI only)
const hasPermission = (permission: string, resource?: string) => {
  return userPermissions.some(p => 
    p.name === permission && 
    (!resource || p.resource === resource)
  );
};

// Server-side validation is always required
```

### CSRF Protection

- CSRF tokens for state-changing operations
- SameSite cookie attributes
- Origin validation

## Debug System

### Debug Levels

```typescript
enum DebugLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}
```

### Debug Categories

- `auth` - Authentication flows
- `roles` - Role and permission operations
- `session` - Session management
- `tenant` - Multi-tenancy operations
- `connector` - Backend communication
- `performance` - Performance metrics

### Usage

```typescript
import { debug } from 'react-identity-access';

debug.auth('User login attempt', { email: user.email });
debug.session('Token refresh initiated', { expiresAt });
debug.performance('Hook render time', { duration: 15 });
```

## Performance Optimizations

### Memoization Strategy

- Hook results are memoized when possible
- Permission calculations are cached
- Role hierarchies are pre-computed

### Bundle Size

- Tree-shakeable exports
- Optional features can be excluded
- Minimal dependencies

### Runtime Performance

- Lazy loading of non-critical features
- Efficient re-render prevention
- Background token refresh
