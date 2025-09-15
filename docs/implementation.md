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

# Using yarn
yarn add @skylabs-digital/react-identity-access

# Using pnpm (recommended)
pnpm add @skylabs-digital/react-identity-access
```

### Peer Dependencies

Ensure you have the required peer dependencies:

```json
{
  "react": "^18.0.0 || ^19.0.0",
  "react-dom": "^18.0.0 || ^19.0.0",
  "react-router": "^7.0.0"
}
```

## Basic Setup

### 1. Provider Hierarchy

The providers must be nested in the correct order:

```tsx
import {
  AppProvider,
  AuthProvider,
  FeatureFlagProvider,
  SubscriptionProvider
} from '@skylabs-digital/react-identity-access';

function App() {
  return (
    <AppProvider config={appConfig}>
      <AuthProvider>
        <FeatureFlagProvider>
          <SubscriptionProvider>
            {/* Your app components */}
          </SubscriptionProvider>
        </FeatureFlagProvider>
      </AuthProvider>
    </AppProvider>
  );
}
```

### 2. App Configuration

```tsx
const appConfig = {
  baseUrl: process.env.REACT_APP_BASE_URL || 'http://localhost:3000',
  appId: process.env.REACT_APP_ID || 'your-app-id',
  tenantMode: 'subdomain', // 'subdomain' | 'path' | 'header'
  selectorParam: 'tenant',
  apiTimeout: 30000,
  retryAttempts: 3,
};
```

## Provider Configuration

### AppProvider

The root provider that configures the application context:

```tsx
interface AppConfig {
  baseUrl: string;           // Backend API URL
  appId: string;            // Unique application identifier
  tenantMode: TenantMode;   // How tenants are identified
  selectorParam: string;    // Parameter name for tenant selection
  apiTimeout?: number;      // Request timeout in milliseconds
  retryAttempts?: number;   // Number of retry attempts for failed requests
}

<AppProvider config={appConfig}>
  {/* children */}
</AppProvider>
```

### AuthProvider

Handles authentication and session management:

```tsx
interface AuthConfig {
  onRefreshFailed?: () => void;  // Callback when token refresh fails
  initialRoles?: Role[];         // SSR role injection
}

<AuthProvider config={authConfig}>
  {/* children */}
</AuthProvider>
```

### FeatureFlagProvider

Manages feature flags for the application:

```tsx
<FeatureFlagProvider>
  {/* children */}
</FeatureFlagProvider>
```

### SubscriptionProvider

Handles billing and subscription management:

```tsx
<SubscriptionProvider>
  {/* children */}
</SubscriptionProvider>
```

## Authentication Flow

### Login Process

```tsx
import { useAuth } from '@skylabs-digital/react-identity-access';

function LoginForm() {
  const { login, isLoading } = useAuth();
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
    tenantId: ''
  });

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(credentials.email, credentials.password, credentials.tenantId);
      // Redirect to dashboard or home
    } catch (error) {
      console.error('Login failed:', error);
      // Handle error (show message, etc.)
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={credentials.email}
        onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={credentials.password}
        onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
        placeholder="Password"
        required
      />
      <input
        type="text"
        value={credentials.tenantId}
        onChange={(e) => setCredentials(prev => ({ ...prev, tenantId: e.target.value }))}
        placeholder="Tenant ID"
        required
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

### Session Management

```tsx
function UserProfile() {
  const { sessionManager, logout } = useAuth();
  const user = sessionManager.getUser();

  if (!user) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <h2>Welcome, {user.name}</h2>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Password Management

```tsx
function PasswordReset() {
  const { requestPasswordReset, confirmPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleRequestReset = async () => {
    try {
      await requestPasswordReset(email, 'tenant-id');
      alert('Reset email sent!');
    } catch (error) {
      console.error('Reset request failed:', error);
    }
  };

  const handleConfirmReset = async () => {
    try {
      await confirmPasswordReset(token, newPassword);
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
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <button onClick={handleRequestReset}>Request Reset</button>
      </div>

      {/* Confirm reset form */}
      <div>
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Reset Token"
        />
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
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

      <Protected 
        requiredPermissions={['admin:*']}
        fallback={<div>Admin access required</div>}
      >
        <AdminPanel />
      </Protected>
    </div>
  );
}
```

### Role-Based Components

```tsx
function RoleBasedNavigation() {
  const { userRole } = useAuth();

  return (
    <nav>
      <Link to="/">Home</Link>
      
      {userRole === 'admin' && (
        <Link to="/admin">Admin Panel</Link>
      )}
      
      {['admin', 'manager'].includes(userRole) && (
        <Link to="/reports">Reports</Link>
      )}
      
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

const config = {
  baseUrl: 'https://api.yourapp.com',
  appId: 'your-app-id',
  tenantMode: 'subdomain',
  selectorParam: 'tenant', // Not used in subdomain mode
};
```

### Path Mode

```tsx
// yourapp.com/tenant1
// yourapp.com/tenant2

const config = {
  baseUrl: 'https://api.yourapp.com',
  appId: 'your-app-id',
  tenantMode: 'path',
  selectorParam: 'tenant',
};
```

### Header Mode

```tsx
// Custom header: X-Tenant-ID: tenant1

const config = {
  baseUrl: 'https://api.yourapp.com',
  appId: 'your-app-id',
  tenantMode: 'header',
  selectorParam: 'X-Tenant-ID',
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
        <ErrorBoundary>
          {/* Your app */}
        </ErrorBoundary>
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
type AppPermission = 
  | 'users:read' 
  | 'users:write' 
  | 'admin:*' 
  | 'reports:read';

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
    <AuthProvider>
      {children}
    </AuthProvider>
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
