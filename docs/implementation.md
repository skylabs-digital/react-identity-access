# Implementation Guide

This guide provides detailed instructions for implementing React Identity Access in your application.

## Table of Contents

- [Installation](#installation)
- [Basic Setup](#basic-setup)
- [Provider Configuration](#provider-configuration)
- [Authentication Flow](#authentication-flow)
- [Permission System](#permission-system)
- [Multi-Tenant Setup](#multi-tenant-setup)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Installation

### Package Manager

```bash
# Using npm
npm install @skylabs-digital/react-identity-access

# Using yarn (recommended)
yarn add @skylabs-digital/react-identity-access
```

### Peer Dependencies

Ensure you have the required peer dependencies:

```json
{
  "react": "^18.0.0 || ^19.0.0",
  "react-dom": "^18.0.0 || ^19.0.0",
  "react-router-dom": ">=6.0.0"
}
```

## Basic Setup

### 1. Provider Hierarchy

The providers must be nested in the correct order:

```tsx
import {
  AppProvider,
  TenantProvider,
  AuthProvider,
  FeatureFlagProvider,
  SubscriptionProvider,
} from '@skylabs-digital/react-identity-access';

function App() {
  return (
    <AppProvider config={appConfig}>
      <TenantProvider config={tenantConfig}>
        <AuthProvider>
          <FeatureFlagProvider>
            <SubscriptionProvider>{/* Your app components */}</SubscriptionProvider>
          </FeatureFlagProvider>
        </AuthProvider>
      </TenantProvider>
    </AppProvider>
  );
}
```

### 2. App Configuration

```tsx
const appConfig = {
  baseUrl: process.env.REACT_APP_BASE_URL || 'http://localhost:3000',
  appId: process.env.REACT_APP_ID || 'your-app-id',
};

const tenantConfig = {
  tenantMode: 'subdomain', // 'subdomain' | 'selector' | 'fixed'
  baseDomain: 'yourapp.com', // For subdomain mode
  selectorParam: 'tenant', // For selector mode
};
```

## Provider Configuration

### AppProvider

The root provider that configures the application context:

```tsx
interface AppConfig {
  baseUrl: string; // Backend API URL
  appId: string; // Unique application identifier
  cache?: {
    enabled?: boolean; // Default: true
    ttl?: number; // Cache TTL in ms (default: 5 minutes)
    storageKey?: string; // Default: 'app_cache_{appId}'
  };
}

<AppProvider config={appConfig}>{/* children */}</AppProvider>;
```

### TenantProvider

Handles multi-tenant detection, tenant info loading, settings, and switching:

```tsx
interface TenantConfig {
  tenantMode?: 'subdomain' | 'selector' | 'fixed'; // Default: 'selector'
  fixedTenantSlug?: string; // Required when tenantMode is 'fixed'
  baseDomain?: string; // Base domain for subdomain mode
  selectorParam?: string; // Default: 'tenant', for selector mode
  cache?: {
    enabled?: boolean;
    ttl?: number;
    storageKey?: string;
  };
  initialTenant?: PublicTenantInfo; // For SSR
}

<TenantProvider config={tenantConfig}>{/* children */}</TenantProvider>;
```

### AuthProvider

Handles authentication, session management, token refresh, and session safety.

```tsx
interface AuthConfig {
  // Standalone mode — only required when AppProvider is not used.
  baseUrl?: string;
  appId?: string;

  // Session expiry callback (preferred over the deprecated onRefreshFailed).
  onSessionExpired?: (error: SessionExpiredError) => void;

  // Refresh timing
  refreshQueueTimeout?: number; // Default: 10_000 ms
  proactiveRefreshMargin?: number; // Default: 60_000 ms before expiry

  // Cross-subdomain cookie session (see Advanced Usage → Cookie Session).
  enableCookieSession?: boolean; // Default: false

  // Multi-tenant UX
  autoSwitchSingleTenant?: boolean;
  onTenantSelectionRequired?: (tenants: UserTenantMembership[]) => void;

  // SSR / cold start
  initialRoles?: Role[];
}

<AuthProvider config={authConfig}>{/* children */}</AuthProvider>;
```

#### Standalone AuthProvider

Since **v2.27**, `AuthProvider` can be used without `AppProvider` and `TenantProvider`. Pass `baseUrl` and `appId` directly via `AuthConfig` — useful for single-tenant apps or pure authentication scenarios:

```tsx
import { AuthProvider } from '@skylabs-digital/react-identity-access';

function App() {
  return (
    <AuthProvider
      config={{
        baseUrl: 'https://api.example.com',
        appId: 'your-app-id',
      }}
    >
      <Routes>{/* ... */}</Routes>
    </AuthProvider>
  );
}
```

In standalone mode, `useTenant()` will be unavailable and `useTenantOptional()` returns `null`. All tenant-specific features (subdomain detection, tenant switching) are disabled; authenticated routes still work normally.

### FeatureFlagProvider

Manages feature flags for the application:

```tsx
<FeatureFlagProvider>{/* children */}</FeatureFlagProvider>
```

### SubscriptionProvider

Handles billing and subscription management:

```tsx
<SubscriptionProvider>{/* children */}</SubscriptionProvider>
```

## Authentication Flow

### Login Process

The `login` action takes a single params object (`LoginParams`). The tenant is resolved automatically from `TenantProvider` context — you don't pass a tenant id explicitly.

```tsx
import { useAuth } from '@skylabs-digital/react-identity-access';

function LoginForm() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // `username` accepts email or phone number
      await login({ username, password });
      // AuthProvider updates currentUser automatically; navigate as needed.
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="text"
        value={username}
        onChange={e => setUsername(e.target.value)}
        placeholder="Email or phone"
        required
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

> **Tip:** Prefer the pre-built `<LoginForm />` component over a custom form unless you need non-standard layout. It handles validation, loading states, and accessibility for you.

### Session Management

`useAuth()` exposes `currentUser`, `isAuthenticated`, and `logout()` directly — there is no need to touch `sessionManager` for typical use cases.

```tsx
function UserProfile() {
  const { currentUser, isAuthenticated, logout, userRole } = useAuth();

  if (!isAuthenticated || !currentUser) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <h2>Welcome, {currentUser.firstName}</h2>
      <p>Email: {currentUser.email}</p>
      {userRole && <p>Role: {userRole.name}</p>}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

> **Note:** The session lifecycle is handled automatically by `AuthProvider`. Tokens refresh proactively, expired sessions trigger `onSessionExpired`, and multiple tabs stay in sync via Web Locks. You don't need to poll or manually refresh.

### Password Management

`requestPasswordReset` and `confirmPasswordReset` take params objects — the tenant is resolved from context automatically.

```tsx
function PasswordReset() {
  const { requestPasswordReset, confirmPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleRequestReset = async () => {
    try {
      await requestPasswordReset({ email });
      alert('Reset email sent!');
    } catch (error) {
      console.error('Reset request failed:', error);
    }
  };

  const handleConfirmReset = async () => {
    try {
      await confirmPasswordReset({ token, newPassword });
      alert('Password reset successful!');
    } catch (error) {
      console.error('Password reset failed:', error);
    }
  };

  return (
    <div>
      {/* Request reset form */}
      <div>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
        />
        <button onClick={handleRequestReset}>Request Reset</button>
      </div>

      {/* Confirm reset form */}
      <div>
        <input
          type="text"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Reset Token"
        />
        <input
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          placeholder="New Password"
        />
        <button onClick={handleConfirmReset}>Reset Password</button>
      </div>
    </div>
  );
}
```

## Permission System

### Permission Format

Permissions follow the `resource:action` format:

```
users:read      # Read user data
users:write     # Create/update users
users:delete    # Delete users
admin:*         # All admin permissions
reports:read    # View reports
billing:manage  # Manage billing
```

### Using Permissions

```tsx
import { useAuth, Protected } from '@skylabs-digital/react-identity-access';

function Dashboard() {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  // Check single permission
  const canViewUsers = hasPermission('users:read');

  // Check any of multiple permissions
  const canAccessReports = hasAnyPermission(['reports:read', 'admin:*']);

  // Check all permissions required
  const canManageSystem = hasAllPermissions(['admin:read', 'admin:write']);

  return (
    <div>
      {canViewUsers && <UserList />}

      <Protected requiredPermissions={['reports:read']}>
        <ReportsSection />
      </Protected>

      <Protected requiredPermissions={['admin:*']} fallback={<div>Admin access required</div>}>
        <AdminPanel />
      </Protected>
    </div>
  );
}
```

### Role-Based Components

`userRole` is a `Role` object (not a string). Check its `name` field or rely on permission-based checks, which are usually more flexible.

```tsx
function RoleBasedNavigation() {
  const { userRole } = useAuth();
  const roleName = userRole?.name;

  return (
    <nav>
      <Link to="/">Home</Link>

      {roleName === 'admin' && <Link to="/admin">Admin Panel</Link>}

      {roleName && ['admin', 'manager'].includes(roleName) && <Link to="/reports">Reports</Link>}

      <Protected requiredPermissions={['users:read']}>
        <Link to="/users">Users</Link>
      </Protected>
    </nav>
  );
}
```

## Multi-Tenant Setup

### Subdomain Mode

```tsx
// tenant1.yourapp.com
// tenant2.yourapp.com

const tenantConfig = {
  tenantMode: 'subdomain',
  baseDomain: 'yourapp.com',
};
```

### Selector Mode

```tsx
// yourapp.com?tenant=tenant1

const tenantConfig = {
  tenantMode: 'selector',
  selectorParam: 'tenant', // URL search parameter name
};
```

### Fixed Mode

```tsx
// Always use the same tenant slug

const tenantConfig = {
  tenantMode: 'fixed',
  fixedTenantSlug: 'my-company',
};
```

## Error Handling

### Global Error Handling

```tsx
function App() {
  const handleAuthError = (error: Error) => {
    console.error('Auth error:', error);
    // Redirect to login, show notification, etc.
  };

  return (
    <AppProvider config={appConfig}>
      <AuthProvider config={{ onRefreshFailed: handleAuthError }}>
        <ErrorBoundary>{/* Your app */}</ErrorBoundary>
      </AuthProvider>
    </AppProvider>
  );
}
```

### Component-Level Error Handling

```tsx
function LoginComponent() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (email: string, password: string, tenantId: string) => {
    try {
      setError(null);
      await login(email, password, tenantId);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      {/* Login form */}
    </div>
  );
}
```

## Best Practices

### 1. Environment Configuration

```env
# .env.development
REACT_APP_BASE_URL=http://localhost:3001
REACT_APP_ID=dev-app-id

# .env.production
REACT_APP_BASE_URL=https://api.yourapp.com
REACT_APP_ID=prod-app-id
```

### 2. Type Safety

```tsx
// Define your permission types
type AppPermission = 'users:read' | 'users:write' | 'admin:*' | 'reports:read';

// Use typed permissions
const hasUserAccess = hasPermission('users:read' as AppPermission);
```

### 3. Loading States

```tsx
function ProtectedRoute() {
  const { sessionManager, isLoading } = useAuth();
  const user = sessionManager.getUser();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <Dashboard />;
}
```

### 4. Memoization

```tsx
function UserList() {
  const { userPermissions } = useAuth();

  const canEditUsers = useMemo(
    () => userPermissions.some(p => p === 'users:write' || p === 'admin:*'),
    [userPermissions]
  );

  return (
    <div>
      {/* User list */}
      {canEditUsers && <EditButton />}
    </div>
  );
}
```

### 5. Testing

```tsx
// Test utilities
import { render } from '@testing-library/react';
import { AppProvider, AuthProvider } from '@skylabs-digital/react-identity-access';

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider config={testConfig}>
    <AuthProvider>{children}</AuthProvider>
  </AppProvider>
);

// Test component
test('renders protected content for authorized user', () => {
  render(
    <TestWrapper>
      <ProtectedComponent />
    </TestWrapper>
  );
  // Assertions
});
```

## Next Steps

- [Advanced Usage](./advanced-usage.md) - Learn about advanced features
- [API Reference](./api-reference.md) - Complete API documentation
- [Examples](./examples.md) - Real-world implementation examples
