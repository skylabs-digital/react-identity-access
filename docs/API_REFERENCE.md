# API Reference

## Hooks

### useAuth()

Primary authentication hook providing login/logout functionality and user state.

```tsx
const { 
  user, 
  isAuthenticated, 
  isLoading, 
  login, 
  logout, 
  refreshToken 
} = useAuth();
```

**Returns:**
- `user: User | null` - Current authenticated user
- `isAuthenticated: boolean` - Authentication status
- `isLoading: boolean` - Loading state for auth operations
- `login: (credentials: LoginCredentials) => Promise<void>` - Login function
- `logout: () => Promise<void>` - Logout function
- `refreshToken: () => Promise<void>` - Refresh authentication token

**Types:**
```tsx
interface User {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}

interface LoginCredentials {
  email: string;
  password: string;
  tenantId?: string;
}
```

### useRoles()

Role and permission checking with one-liner access control.

```tsx
const { 
  roles, 
  permissions, 
  hasRole, 
  hasPermission, 
  hasAnyRole, 
  hasAllRoles,
  canAccess 
} = useRoles();
```

**Returns:**
- `roles: string[]` - Current user's roles
- `permissions: string[]` - Current user's permissions
- `hasRole: (role: string) => boolean` - Check single role
- `hasPermission: (permission: string) => boolean` - Check single permission
- `hasAnyRole: (roles: string[]) => boolean` - Check if user has any of the roles
- `hasAllRoles: (roles: string[]) => boolean` - Check if user has all roles
- `canAccess: (resource: string, action: string) => boolean` - Check resource:action permission

**Examples:**
```tsx
// Simple role check
if (hasRole('admin')) {
  // Show admin content
}

// Permission check
if (hasPermission('users:write')) {
  // Show edit button
}

// Multiple role check
if (hasAnyRole(['admin', 'moderator'])) {
  // Show moderation tools
}

// Resource-action check
if (canAccess('users', 'delete')) {
  // Show delete button
}
```

### useFeatureFlags()

Feature flag management with server and tenant admin dual control.

```tsx
const { 
  flags, 
  isEnabled, 
  getFlag, 
  toggleFlag, 
  refreshFlags 
} = useFeatureFlags();
```

**Returns:**
- `flags: FeatureFlag[]` - All available feature flags
- `isEnabled: (key: string) => boolean` - Check if flag is enabled
- `getFlag: (key: string) => FeatureFlag | undefined` - Get flag details
- `toggleFlag: (key: string, enabled: boolean) => Promise<void>` - Toggle flag (admin only)
- `refreshFlags: () => Promise<void>` - Refresh flags from server

**Types:**
```tsx
interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  category: 'ui' | 'feature' | 'experiment' | 'rollout';
  serverEnabled: boolean;
  adminEditable: boolean;
  defaultState: boolean;
  tenantId?: string;
  rolloutPercentage?: number;
  tenantOverride?: boolean;
}
```

### useTenant()

Multi-tenant operations and tenant switching.

```tsx
const { 
  currentTenant, 
  availableTenants, 
  isLoading, 
  switchTenant, 
  refreshTenants 
} = useTenant();
```

**Returns:**
- `currentTenant: Tenant | null` - Current active tenant
- `availableTenants: Tenant[]` - Available tenants for user
- `isLoading: boolean` - Loading state for tenant operations
- `switchTenant: (tenantId: string) => Promise<void>` - Switch to different tenant
- `refreshTenants: () => Promise<void>` - Refresh tenant list

### useSession()

Session management and validation.

```tsx
const { 
  session, 
  isValid, 
  expiresAt, 
  refreshSession, 
  clearSession 
} = useSession();
```

## Components

### ProtectedRoute

Route-level protection with authentication and authorization.

```tsx
<ProtectedRoute
  requireAuth={true}
  requireRole="admin"
  requirePermission="users:read"
  requireAnyRole={["admin", "moderator"]}
  requireAllRoles={["user", "verified"]}
  fallback={<AccessDenied />}
  loadingComponent={<Spinner />}
  redirectTo="/login"
>
  <AdminPanel />
</ProtectedRoute>
```

**Props:**
- `requireAuth?: boolean` - Require authentication (default: true)
- `requireRole?: string` - Require specific role
- `requirePermission?: string` - Require specific permission
- `requireAnyRole?: string[]` - Require any of the specified roles
- `requireAllRoles?: string[]` - Require all specified roles
- `fallback?: ReactNode` - Component to show when access denied
- `loadingComponent?: ReactNode` - Component to show while loading
- `redirectTo?: string` - URL to redirect to when access denied

### RoleGuard

Declarative role-based content protection.

```tsx
<RoleGuard 
  role="admin"
  roles={["admin", "moderator"]}
  requireAll={false}
  fallback={<div>Access Denied</div>}
>
  <AdminContent />
</RoleGuard>
```

**Props:**
- `role?: string` - Single role requirement
- `roles?: string[]` - Multiple role options
- `requireAll?: boolean` - Require all roles vs any role (default: false)
- `fallback?: ReactNode` - Content to show when access denied

### PermissionGuard

Permission-based content protection.

```tsx
<PermissionGuard 
  permission="users:write"
  permissions={["users:read", "users:write"]}
  requireAll={true}
  fallback={<div>Insufficient permissions</div>}
>
  <EditUserForm />
</PermissionGuard>
```

### FeatureFlag

Conditional rendering based on feature flags.

```tsx
<FeatureFlag 
  flag="new-dashboard"
  fallback={<OldDashboard />}
>
  <NewDashboard />
</FeatureFlag>
```

**Props:**
- `flag: string` - Feature flag key
- `fallback?: ReactNode` - Content to show when flag is disabled

### FeatureToggle

Admin interface for managing feature flags.

```tsx
<FeatureToggle 
  flag="beta-features"
  adminOnly={true}
  showDescription={true}
  onToggle={(key, enabled) => console.log(`${key}: ${enabled}`)}
/>
```

## Connectors

### LocalStorageConnector

Mock connector for development and testing.

```tsx
const connector = new LocalStorageConnector({
  simulateDelay: true,
  errorRate: 0.1,
  storagePrefix: 'myapp_',
  seedData: customSeedData
});
```

**Options:**
- `simulateDelay?: boolean` - Simulate network delays (default: false)
- `errorRate?: number` - Simulate random errors (0-1, default: 0)
- `storagePrefix?: string` - localStorage key prefix
- `seedData?: SeedData` - Custom mock data

### Custom Connector

Implement the abstract `IdentityConnector` class:

```tsx
class CustomConnector extends IdentityConnector {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Your implementation
  }
  
  async logout(): Promise<void> {
    // Your implementation
  }
  
  async getCurrentUser(): Promise<User | null> {
    // Your implementation
  }
  
  // ... implement other required methods
}
```

## Provider Configuration

### IdentityProvider

Root provider that manages authentication context.

```tsx
<IdentityProvider
  connector={connector}
  config={{
    tenantStrategy: 'subdomain',
    fallbackUrl: '/select-tenant'
  }}
  initialState={{
    tenant: ssrTenantData,
    user: ssrUserData,
    featureFlags: ssrFeatureFlags
  }}
>
  <App />
</IdentityProvider>
```

**Props:**
- `connector: IdentityConnector` - Backend connector implementation
- `config?: IdentityConfig` - Library configuration
- `tenantResolver?: TenantResolver` - Tenant resolution strategy
- `initialState?: InitialState` - SSR-injected initial state
- `LoadingComponent?: React.ComponentType` - Custom loading component
- `LandingComponent?: React.ComponentType` - Custom tenant selection component

**Types:**
```tsx
interface InitialState {
  tenant?: Tenant;
  user?: User;
  featureFlags?: Record<string, FeatureFlag>;
  roles?: Role[];
  permissions?: Permission[];
}

interface IdentityConfig {
  tenantStrategy?: 'subdomain' | 'query-param';
  fallbackUrl?: string;
  sessionTimeout?: number;
  autoRefresh?: boolean;
  debugMode?: boolean;
}
```

## Error Handling

The library provides specific error types for different scenarios:

```tsx
import { AuthenticationError, TenantError, PermissionError } from 'react-identity-access';

try {
  await login(credentials);
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Handle authentication failure
  } else if (error instanceof TenantError) {
    // Handle tenant-related errors
  } else if (error instanceof PermissionError) {
    // Handle permission errors
  }
}
```
