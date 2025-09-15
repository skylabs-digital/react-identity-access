# Advanced Usage Guide

This guide covers advanced features and patterns for React Identity Access.

## Table of Contents

- [Custom Hooks](#custom-hooks)
- [Advanced Permission Patterns](#advanced-permission-patterns)
- [Session Management](#session-management)
- [Feature Flags](#feature-flags)
- [Subscription Management](#subscription-management)
- [Performance Optimization](#performance-optimization)
- [Server-Side Rendering](#server-side-rendering)
- [Custom Components](#custom-components)
- [API Integration](#api-integration)
- [Error Handling](#error-handling)

## Custom Hooks

### usePermissions Hook

Create a custom hook for complex permission logic:

```tsx
import { useAuth } from '@skylabs-digital/react-identity-access';
import { useMemo } from 'react';

interface PermissionConfig {
  resource: string;
  actions: string[];
  fallbackRole?: string;
}

export function usePermissions(configs: PermissionConfig[]) {
  const { userPermissions, userRole, hasPermission } = useAuth();

  return useMemo(() => {
    return configs.reduce((acc, config) => {
      const { resource, actions, fallbackRole } = config;
      
      acc[resource] = actions.reduce((resourceAcc, action) => {
        const permission = `${resource}:${action}`;
        resourceAcc[action] = hasPermission(permission) || 
          (fallbackRole && userRole === fallbackRole);
        return resourceAcc;
      }, {} as Record<string, boolean>);
      
      return acc;
    }, {} as Record<string, Record<string, boolean>>);
  }, [userPermissions, userRole, configs]);
}

// Usage
function AdminDashboard() {
  const permissions = usePermissions([
    { resource: 'users', actions: ['read', 'write', 'delete'] },
    { resource: 'reports', actions: ['read', 'export'], fallbackRole: 'manager' },
    { resource: 'settings', actions: ['read', 'write'] }
  ]);

  return (
    <div>
      {permissions.users.read && <UserList />}
      {permissions.users.write && <CreateUserButton />}
      {permissions.reports.export && <ExportButton />}
    </div>
  );
}
```

### useAuthGuard Hook

Implement route-level authentication guards:

```tsx
import { useAuth } from '@skylabs-digital/react-identity-access';
import { useNavigate } from 'react-router';
import { useEffect } from 'react';

interface AuthGuardOptions {
  requiredPermissions?: string[];
  requiredRole?: string;
  redirectTo?: string;
  onUnauthorized?: () => void;
}

export function useAuthGuard(options: AuthGuardOptions = {}) {
  const { hasValidSession, hasAllPermissions, userRole } = useAuth();
  const navigate = useNavigate();
  
  const {
    requiredPermissions = [],
    requiredRole,
    redirectTo = '/login',
    onUnauthorized
  } = options;

  useEffect(() => {
    if (!hasValidSession()) {
      navigate(redirectTo);
      return;
    }

    if (requiredPermissions.length > 0 && !hasAllPermissions(requiredPermissions)) {
      onUnauthorized?.();
      navigate('/unauthorized');
      return;
    }

    if (requiredRole && userRole !== requiredRole) {
      onUnauthorized?.();
      navigate('/unauthorized');
      return;
    }
  }, [hasValidSession, hasAllPermissions, userRole, requiredPermissions, requiredRole]);

  return {
    isAuthorized: hasValidSession() && 
      (requiredPermissions.length === 0 || hasAllPermissions(requiredPermissions)) &&
      (!requiredRole || userRole === requiredRole)
  };
}

// Usage
function AdminPage() {
  const { isAuthorized } = useAuthGuard({
    requiredPermissions: ['admin:read', 'admin:write'],
    onUnauthorized: () => console.log('Access denied to admin page')
  });

  if (!isAuthorized) {
    return <div>Loading...</div>;
  }

  return <AdminContent />;
}
```

## Advanced Permission Patterns

### Hierarchical Permissions

Implement permission inheritance:

```tsx
const PERMISSION_HIERARCHY = {
  'admin:*': ['users:*', 'reports:*', 'settings:*'],
  'users:*': ['users:read', 'users:write', 'users:delete'],
  'reports:*': ['reports:read', 'reports:write', 'reports:export'],
  'settings:*': ['settings:read', 'settings:write']
};

function expandPermissions(permissions: string[]): string[] {
  const expanded = new Set(permissions);
  
  permissions.forEach(permission => {
    const children = PERMISSION_HIERARCHY[permission];
    if (children) {
      children.forEach(child => {
        expanded.add(child);
        // Recursively expand child permissions
        expandPermissions([child]).forEach(grandchild => expanded.add(grandchild));
      });
    }
  });
  
  return Array.from(expanded);
}

// Custom hook with hierarchy support
export function useHierarchicalPermissions() {
  const { userPermissions } = useAuth();
  
  const expandedPermissions = useMemo(
    () => expandPermissions(userPermissions.map(p => typeof p === 'string' ? p : p.name)),
    [userPermissions]
  );

  const hasPermission = useCallback((permission: string) => {
    return expandedPermissions.includes(permission);
  }, [expandedPermissions]);

  return { hasPermission, expandedPermissions };
}
```

### Conditional Permission Loading

Load permissions based on context:

```tsx
function useContextualPermissions(context: string) {
  const { sessionManager } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPermissions() {
      try {
        setLoading(true);
        const user = sessionManager.getUser();
        if (!user) return;

        // Load permissions for specific context
        const response = await fetch(`/api/permissions/${context}`, {
          headers: {
            'Authorization': `Bearer ${sessionManager.getAccessToken()}`
          }
        });
        
        const data = await response.json();
        setPermissions(data.permissions);
      } catch (error) {
        console.error('Failed to load contextual permissions:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPermissions();
  }, [context, sessionManager]);

  return { permissions, loading };
}

// Usage
function ProjectDashboard({ projectId }: { projectId: string }) {
  const { permissions, loading } = useContextualPermissions(`project:${projectId}`);
  
  if (loading) return <div>Loading permissions...</div>;

  return (
    <div>
      {permissions.includes('project:read') && <ProjectDetails />}
      {permissions.includes('project:write') && <EditProjectButton />}
    </div>
  );
}
```

## Session Management

### Custom Session Storage

Implement custom session storage:

```tsx
interface SessionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

class SecureSessionStorage implements SessionStorage {
  private encrypt(value: string): string {
    // Implement encryption logic
    return btoa(value); // Simple base64 for example
  }

  private decrypt(value: string): string {
    // Implement decryption logic
    return atob(value); // Simple base64 for example
  }

  getItem(key: string): string | null {
    const encrypted = localStorage.getItem(key);
    return encrypted ? this.decrypt(encrypted) : null;
  }

  setItem(key: string, value: string): void {
    localStorage.setItem(key, this.encrypt(value));
  }

  removeItem(key: string): void {
    localStorage.removeItem(key);
  }
}

// Use custom storage with SessionManager
const customStorage = new SecureSessionStorage();
const sessionManager = new SessionManager(customStorage);
```

### Session Monitoring

Monitor session activity:

```tsx
function useSessionMonitor() {
  const { sessionManager, logout } = useAuth();
  const [lastActivity, setLastActivity] = useState(Date.now());

  useEffect(() => {
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    function updateActivity() {
      setLastActivity(Date.now());
    }

    function checkInactivity() {
      const now = Date.now();
      if (now - lastActivity > INACTIVITY_TIMEOUT) {
        logout();
        alert('Session expired due to inactivity');
      }
    }

    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    // Check inactivity every minute
    const interval = setInterval(checkInactivity, 60000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
      clearInterval(interval);
    };
  }, [lastActivity, logout]);

  return { lastActivity };
}
```

## Feature Flags

### Advanced Feature Flag Usage

```tsx
import { useFeatureFlag } from '@skylabs-digital/react-identity-access';

function useFeatureFlags() {
  const { isEnabled, getValue } = useFeatureFlag();

  return {
    // Boolean flags
    showNewDashboard: isEnabled('new-dashboard'),
    enableBetaFeatures: isEnabled('beta-features'),
    
    // Value flags
    maxUploadSize: getValue('max-upload-size', 10), // Default: 10MB
    theme: getValue('theme', 'light'),
    
    // Complex flags
    experimentGroup: getValue('ab-test-group', 'control'),
  };
}

function Dashboard() {
  const flags = useFeatureFlags();

  if (flags.showNewDashboard) {
    return <NewDashboard />;
  }

  return (
    <div className={`theme-${flags.theme}`}>
      <ClassicDashboard />
      {flags.enableBetaFeatures && <BetaFeaturePanel />}
    </div>
  );
}
```

### Feature Flag with Permissions

Combine feature flags with permissions:

```tsx
function useFeatureWithPermission(flagName: string, permission: string) {
  const { isEnabled } = useFeatureFlag();
  const { hasPermission } = useAuth();

  return isEnabled(flagName) && hasPermission(permission);
}

function AdminFeature() {
  const canUseNewAdminPanel = useFeatureWithPermission('new-admin-panel', 'admin:write');

  if (!canUseNewAdminPanel) {
    return <LegacyAdminPanel />;
  }

  return <NewAdminPanel />;
}
```

## Subscription Management

### Subscription-Based Features

```tsx
import { useSubscription } from '@skylabs-digital/react-identity-access';

function useSubscriptionFeatures() {
  const { subscription, hasFeature, getLimit } = useSubscription();

  return {
    plan: subscription?.plan,
    canExportData: hasFeature('data-export'),
    canUseAdvancedReports: hasFeature('advanced-reports'),
    userLimit: getLimit('max-users', 5),
    storageLimit: getLimit('storage-gb', 1),
  };
}

function FeatureGate({ 
  feature, 
  fallback, 
  children 
}: { 
  feature: string; 
  fallback?: React.ReactNode; 
  children: React.ReactNode; 
}) {
  const { hasFeature } = useSubscription();

  if (!hasFeature(feature)) {
    return fallback || <UpgradePrompt feature={feature} />;
  }

  return <>{children}</>;
}

// Usage
function ReportsPage() {
  const { canUseAdvancedReports } = useSubscriptionFeatures();

  return (
    <div>
      <BasicReports />
      
      <FeatureGate 
        feature="advanced-reports"
        fallback={<div>Upgrade to Pro for advanced reports</div>}
      >
        <AdvancedReports />
      </FeatureGate>
    </div>
  );
}
```

## Performance Optimization

### Memoization Strategies

```tsx
import { useMemo, useCallback } from 'react';

function OptimizedUserList() {
  const { userPermissions, hasPermission } = useAuth();
  const [users, setUsers] = useState([]);

  // Memoize permission checks
  const permissions = useMemo(() => ({
    canEdit: hasPermission('users:write'),
    canDelete: hasPermission('users:delete'),
    canView: hasPermission('users:read'),
  }), [hasPermission]);

  // Memoize filtered users
  const visibleUsers = useMemo(() => {
    if (!permissions.canView) return [];
    return users.filter(user => user.active);
  }, [users, permissions.canView]);

  // Memoize event handlers
  const handleEdit = useCallback((userId: string) => {
    if (!permissions.canEdit) return;
    // Edit logic
  }, [permissions.canEdit]);

  const handleDelete = useCallback((userId: string) => {
    if (!permissions.canDelete) return;
    // Delete logic
  }, [permissions.canDelete]);

  return (
    <div>
      {visibleUsers.map(user => (
        <UserCard
          key={user.id}
          user={user}
          onEdit={permissions.canEdit ? handleEdit : undefined}
          onDelete={permissions.canDelete ? handleDelete : undefined}
        />
      ))}
    </div>
  );
}
```

### Lazy Loading with Permissions

```tsx
import { lazy, Suspense } from 'react';

// Lazy load components based on permissions
const AdminPanel = lazy(() => import('./AdminPanel'));
const UserManagement = lazy(() => import('./UserManagement'));
const Reports = lazy(() => import('./Reports'));

function ConditionalLazyLoad({ 
  permission, 
  component: Component, 
  fallback 
}: {
  permission: string;
  component: React.ComponentType;
  fallback?: React.ReactNode;
}) {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return fallback || null;
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Component />
    </Suspense>
  );
}

function Dashboard() {
  return (
    <div>
      <ConditionalLazyLoad 
        permission="admin:read" 
        component={AdminPanel}
        fallback={<div>Admin access required</div>}
      />
      
      <ConditionalLazyLoad 
        permission="users:read" 
        component={UserManagement}
      />
      
      <ConditionalLazyLoad 
        permission="reports:read" 
        component={Reports}
      />
    </div>
  );
}
```

## Server-Side Rendering

### SSR with Next.js

```tsx
// pages/_app.tsx
import { AppProvider, AuthProvider } from '@skylabs-digital/react-identity-access';
import type { AppProps } from 'next/app';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AppProvider config={{
      baseUrl: process.env.NEXT_PUBLIC_API_URL!,
      appId: process.env.NEXT_PUBLIC_APP_ID!,
      tenantMode: 'subdomain',
      selectorParam: 'tenant',
    }}>
      <AuthProvider config={{ initialRoles: pageProps.initialRoles }}>
        <Component {...pageProps} />
      </AuthProvider>
    </AppProvider>
  );
}

export default MyApp;

// pages/dashboard.tsx
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Verify authentication on server
  const token = context.req.cookies.accessToken;
  
  if (!token) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  try {
    // Fetch user roles/permissions on server
    const response = await fetch(`${process.env.API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const userData = await response.json();
    
    return {
      props: {
        initialRoles: userData.roles,
      },
    };
  } catch (error) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }
};

function Dashboard() {
  return <div>Dashboard content</div>;
}

export default Dashboard;
```

## Custom Components

### Advanced Protected Component

```tsx
interface AdvancedProtectedProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRole?: string;
  requireAll?: boolean;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  onUnauthorized?: () => void;
  debug?: boolean;
}

export function AdvancedProtected({
  children,
  requiredPermissions = [],
  requiredRole,
  requireAll = true,
  fallback,
  loadingComponent,
  onUnauthorized,
  debug = false
}: AdvancedProtectedProps) {
  const { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions, 
    userRole,
    isLoading 
  } = useAuth();

  if (isLoading) {
    return loadingComponent || <div>Loading...</div>;
  }

  let hasAccess = true;

  // Check role requirement
  if (requiredRole && userRole !== requiredRole) {
    hasAccess = false;
    if (debug) console.log(`Access denied: required role ${requiredRole}, user has ${userRole}`);
  }

  // Check permission requirements
  if (requiredPermissions.length > 0) {
    const permissionCheck = requireAll 
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);
    
    if (!permissionCheck) {
      hasAccess = false;
      if (debug) console.log(`Access denied: missing permissions`, requiredPermissions);
    }
  }

  if (!hasAccess) {
    onUnauthorized?.();
    return fallback || null;
  }

  return <>{children}</>;
}
```

### Permission-Based Navigation

```tsx
interface NavItem {
  label: string;
  path: string;
  permission?: string;
  role?: string;
  children?: NavItem[];
}

const navigationItems: NavItem[] = [
  { label: 'Home', path: '/' },
  { label: 'Dashboard', path: '/dashboard', permission: 'dashboard:read' },
  {
    label: 'Users',
    path: '/users',
    permission: 'users:read',
    children: [
      { label: 'User List', path: '/users', permission: 'users:read' },
      { label: 'Create User', path: '/users/create', permission: 'users:write' },
    ]
  },
  { label: 'Admin', path: '/admin', role: 'admin' },
];

function NavigationMenu() {
  const { hasPermission, userRole } = useAuth();

  const filterNavItems = (items: NavItem[]): NavItem[] => {
    return items.filter(item => {
      if (item.permission && !hasPermission(item.permission)) return false;
      if (item.role && userRole !== item.role) return false;
      
      if (item.children) {
        item.children = filterNavItems(item.children);
      }
      
      return true;
    });
  };

  const visibleItems = filterNavItems(navigationItems);

  return (
    <nav>
      {visibleItems.map(item => (
        <NavItem key={item.path} item={item} />
      ))}
    </nav>
  );
}
```

## API Integration

### Authenticated API Client

```tsx
class AuthenticatedApiClient {
  private sessionManager: SessionManager;
  private baseUrl: string;

  constructor(sessionManager: SessionManager, baseUrl: string) {
    this.sessionManager = sessionManager;
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.sessionManager.getAccessToken();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Token might be expired, try to refresh
      try {
        await this.sessionManager.refreshToken();
        // Retry the request with new token
        return this.request(endpoint, options);
      } catch (error) {
        // Refresh failed, redirect to login
        this.sessionManager.clearSession();
        window.location.href = '/login';
        throw error;
      }
    }

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Hook to use authenticated API client
export function useApiClient() {
  const { sessionManager } = useAuth();
  const { baseUrl } = useApp();

  return useMemo(
    () => new AuthenticatedApiClient(sessionManager, baseUrl),
    [sessionManager, baseUrl]
  );
}
```

## Error Handling

### Global Error Boundary

```tsx
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class AuthErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Auth Error Boundary caught an error:', error, errorInfo);
    
    // Log to error reporting service
    if (error.message.includes('401') || error.message.includes('unauthorized')) {
      // Handle authentication errors
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
function App() {
  return (
    <AuthErrorBoundary>
      <AppProvider config={appConfig}>
        <AuthProvider>
          {/* Your app */}
        </AuthProvider>
      </AppProvider>
    </AuthErrorBoundary>
  );
}
```

This advanced usage guide covers sophisticated patterns and optimizations for React Identity Access. For more specific use cases, refer to the [Examples](./examples.md) documentation.
