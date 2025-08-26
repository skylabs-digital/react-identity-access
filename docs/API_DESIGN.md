# API Design

## One-Liner Components

### createApp

Creates a complete application with admin and client panels in one line.

```tsx
import { createApp } from 'react-identity-access';

// Minimal setup - everything works out of the box
const App = createApp();

// With basic configuration
const App = createApp({
  tenant: {
    name: 'Mi App',
    logo: '/logo.png',
    primaryColor: '#007bff'
  },
  mockUsers: {
    admin: { email: 'admin@test.com', password: 'admin' },
    client: { email: 'user@test.com', password: 'user' }
  }
});

// With real API
const App = createApp({
  api: {
    baseUrl: 'https://api.miapp.com'
  }
});
```

### AdminApp

Complete admin panel with all management features.

```tsx
import { AdminApp } from 'react-identity-access';

// Complete admin panel in one line
function App() {
  return <AdminApp />;
}

// With preset and customization
function App() {
  return (
    <AdminApp 
      preset="saas-b2b"
      modules={['users', 'roles', 'analytics', 'settings']}
      theme={{ primaryColor: '#dc3545' }}
    />
  );
}
```

### ClientApp

Complete client panel optimized for end users.

```tsx
import { ClientApp } from 'react-identity-access';

// Complete client panel in one line
function App() {
  return <ClientApp />;
}

// With template and customization
function App() {
  return (
    <ClientApp 
      template="dashboard"
      features={['profile', 'notifications', 'billing']}
      theme={{ primaryColor: '#007bff' }}
    />
  );
}
```

### HybridApp

Intelligent app that automatically switches between admin and client based on user context.

```tsx
import { HybridApp } from 'react-identity-access';

// Auto-detecting admin/client app
function App() {
  return <HybridApp />;
}

// With configuration
function App() {
  return (
    <HybridApp 
      preset="startup-mvp"
      adminPath="/admin"
      clientPath="/dashboard"
      autoRedirect={true}
    />
  );
}
```

## Development Tools

### DevTools

Floating development panel with all debugging utilities.

```tsx
import { DevTools } from 'react-identity-access';

function App() {
  return (
    <>
      <MyApp />
      <DevTools /> {/* Only shows in development */}
    </>
  );
}
```

### QuickSwitcher

One-click panel switching for development.

```tsx
import { QuickSwitcher } from 'react-identity-access';

// Floating button to switch between admin/client
<QuickSwitcher position="bottom-right" />
```

### withMockData

HOC that automatically generates mock data for prototyping.

```tsx
import { withMockData } from 'react-identity-access';

const App = withMockData(MyApp, {
  users: 50,      // Generate 50 random users
  tenants: 3,     // 3 test tenants
  roles: 'default' // Standard roles (admin, user, moderator)
});
```

## Providers (Advanced)

### IdentityProvider

Root provider that configures the entire identity system.

```typescript
interface IdentityProviderProps {
  connector: IdentityConnector;
  config?: IdentityConfig;
  tenantResolver?: TenantResolver;
  LoadingComponent?: React.ComponentType;
  LandingComponent?: React.ComponentType;
  children: React.ReactNode;
}

interface IdentityConfig {
  debugMode?: boolean;
  debugLevel?: DebugLevel;
  autoRefreshTokens?: boolean;
  sessionTimeout?: number;
  maxRetries?: number;
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

// Usage
<IdentityProvider 
  connector={connector}
  tenantResolver={{
    strategy: 'subdomain',
    subdomain: { pattern: '{tenant}.myapp.com' }
  }}
  LoadingComponent={MySpinner}
  LandingComponent={MyLanding}
  config={{ debugMode: true, debugLevel: DebugLevel.DEBUG }}
>
  <App />
</IdentityProvider>
```

### TenantProvider

Manages multi-tenant context and tenant switching. (Internal - wrapped by IdentityProvider)

```typescript
interface TenantProviderProps {
  resolver: TenantResolver;
  onTenantNotFound?: () => void;
  children: React.ReactNode;
}

// Internal usage - developers use IdentityProvider instead
```

## Ultra-Simple Hooks

### useQuickAuth

Simplified authentication hook for rapid development.

```tsx
interface UseQuickAuthReturn {
  user: User | null;
  isAdmin: boolean;
  isClient: boolean;
  isGuest: boolean;
  
  // One-click actions
  switchToAdmin: () => void;
  switchToClient: () => void;
  quickLogin: (userType: 'admin' | 'client') => Promise<void>;
  logout: () => Promise<void>;
  
  // Simple checks
  can: (permission: string) => boolean;
  is: (role: string) => boolean;
}

// Usage
const { user, isAdmin, switchToAdmin, can } = useQuickAuth();

if (isAdmin) {
  return <AdminView />;
}

if (can('manage:users')) {
  return <UserManagement />;
}
```

### useAutoPanel

Automatically detects and renders the appropriate panel.

```tsx
function App() {
  const PanelComponent = useAutoPanel();
  return <PanelComponent />;
}

// With options
function App() {
  const PanelComponent = useAutoPanel({
    adminTemplate: 'analytics',
    clientTemplate: 'minimal',
    fallback: <LandingPage />
  });
  return <PanelComponent />;
}
```

### useDevMode

Development utilities in one hook.

```tsx
const { 
  mockAsAdmin, 
  mockAsClient, 
  testRoute, 
  resetMocks,
  quickLogin 
} = useDevMode();

// Quick development actions
<button onClick={() => quickLogin('admin')}>Login as Admin</button>
<button onClick={() => testRoute('/admin/users')}>Test Route</button>
```

## Standard Hooks (Advanced)

### useAuth

Primary authentication hook with comprehensive auth state management.

```typescript
interface UseAuthReturn {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  clearError: () => void;
  
  // Utilities
  hasRole: (roleName: string) => boolean;
  hasPermission: (permission: string, resource?: string) => boolean;
}

// Usage
const { 
  user, 
  isAuthenticated, 
  login, 
  logout, 
  hasRole 
} = useAuth();

// Login
await login({ email: 'user@example.com', password: 'password' });

// Check role
if (hasRole('admin')) {
  // Show admin features
}
```

### useRoles

Role and permission management hook.

```typescript
interface UseRolesReturn {
  // State
  roles: Role[];
  userRoles: Role[];
  permissions: Permission[];
  isLoading: boolean;
  
  // Actions
  assignRole: (userId: string, roleId: string) => Promise<void>;
  removeRole: (userId: string, roleId: string) => Promise<void>;
  createRole: (roleData: CreateRoleData) => Promise<Role>;
  updateRole: (roleId: string, updates: Partial<Role>) => Promise<Role>;
  
  // Utilities
  hasPermission: (permission: string, resource?: string) => boolean;
  hasAnyRole: (roleNames: string[]) => boolean;
  hasAllRoles: (roleNames: string[]) => boolean;
  getEffectivePermissions: () => Permission[];
}

// Usage
const { 
  userRoles, 
  hasPermission, 
  hasAnyRole 
} = useRoles();

// Check specific permission
if (hasPermission('read', 'users')) {
  // Show user list
}

// Check multiple roles
if (hasAnyRole(['admin', 'moderator'])) {
  // Show moderation tools
}
```

### useTenant

Multi-tenancy management hook.

```typescript
interface UseTenantReturn {
  // State
  currentTenant: Tenant | null;
  availableTenants: Tenant[];
  isLoading: boolean;
  showLanding: boolean;
  resolutionStrategy: 'subdomain' | 'query-param';
  
  // Actions
  switchTenant: (tenantId: string) => Promise<void>;
  updateTenantSettings: (settings: Partial<TenantSettings>) => Promise<void>;
  resolveTenantFromUrl: () => string | null;
  
  // Utilities
  getTenantSetting: <T>(key: string) => T | undefined;
  isTenantActive: () => boolean;
  shouldShowLanding: () => boolean;
}

// Usage
const { 
  currentTenant, 
  switchTenant, 
  getTenantSetting 
} = useTenant();

// Switch tenant
await switchTenant('new-tenant-id');

// Get tenant-specific setting
const allowRegistration = getTenantSetting<boolean>('allowSelfRegistration');
```

### useSession

Session and token management hook.

```typescript
interface UseSessionReturn {
  // State
  isValid: boolean;
  expiresAt: Date | null;
  lastActivity: Date | null;
  isRefreshing: boolean;
  
  // Actions
  refreshToken: () => Promise<void>;
  extendSession: () => Promise<void>;
  invalidateSession: () => Promise<void>;
  
  // Utilities
  getTimeUntilExpiry: () => number;
  isExpiringSoon: (thresholdMinutes?: number) => boolean;
}

// Usage
const { 
  isValid, 
  refreshToken, 
  isExpiringSoon 
} = useSession();

// Auto-refresh if expiring soon
useEffect(() => {
  if (isExpiringSoon(5)) { // 5 minutes threshold
    refreshToken();
  }
}, [isExpiringSoon, refreshToken]);
```

### useRouting

Routing utilities and helpers for navigation logic.

```typescript
interface UseRoutingReturn {
  // State
  shouldShowLanding: boolean;
  shouldRedirectToLogin: boolean;
  canAccessRoute: (requiredRoles?: string[], requiredPermissions?: string[]) => boolean;
  
  // Navigation helpers
  getDefaultRoute: () => string;
  getLoginRoute: () => string;
  getPostLoginRoute: () => string;
  
  // Route protection
  protectRoute: (config: RouteProtectionConfig) => RouteProtectionResult;
}

interface RouteProtectionConfig {
  requiredRoles?: string[];
  requiredPermissions?: string[];
  requireAll?: boolean;
  fallbackRoute?: string;
  publicRoute?: boolean;
}

interface RouteProtectionResult {
  canAccess: boolean;
  redirectTo?: string;
  reason?: 'unauthenticated' | 'unauthorized' | 'tenant_required';
}

// Usage
const { 
  shouldShowLanding, 
  canAccessRoute, 
  getDefaultRoute 
} = useRouting();

// Check route access
if (!canAccessRoute(['admin'], ['manage:users'])) {
  return <Navigate to={getDefaultRoute()} />;
}
```

### usePanel

Specialized hook for admin vs client panel development and management.

```typescript
interface UsePanelReturn {
  // Panel detection
  currentPanel: 'admin' | 'client' | 'public' | null;
  isAdminPanel: boolean;
  isClientPanel: boolean;
  isPublicPanel: boolean;
  
  // Panel switching (dev mode)
  switchPanel: (panel: 'admin' | 'client') => void;
  canSwitchToAdmin: boolean;
  canSwitchToClient: boolean;
  
  // Panel-specific utilities
  getAdminRoutes: () => AdminRoute[];
  getClientRoutes: () => ClientRoute[];
  getPanelTheme: () => PanelTheme;
  getPanelConfig: () => PanelConfig;
  
  // Development helpers
  mockAdminAccess: () => void;
  mockClientAccess: () => void;
  resetPanelMocks: () => void;
}

interface AdminRoute {
  path: string;
  name: string;
  requiredRoles: string[];
  requiredPermissions: string[];
  category: 'users' | 'settings' | 'analytics' | 'system';
}

interface ClientRoute {
  path: string;
  name: string;
  requiredRoles?: string[];
  category: 'dashboard' | 'profile' | 'billing' | 'support';
}

interface PanelTheme {
  primaryColor: string;
  secondaryColor: string;
  sidebarColor: string;
  layout: 'sidebar' | 'topbar' | 'hybrid';
}

interface PanelConfig {
  showDebugInfo: boolean;
  enableQuickSwitch: boolean;
  mockDataEnabled: boolean;
  panelTitle: string;
}

// Usage
const { 
  currentPanel, 
  isAdminPanel, 
  switchPanel, 
  mockAdminAccess 
} = usePanel();

// Development: quickly switch to admin mode
if (process.env.NODE_ENV === 'development') {
  mockAdminAccess();
}
```

### usePanelNavigation

Navigation utilities specific to admin and client panels.

```typescript
interface UsePanelNavigationReturn {
  // Navigation state
  adminNavItems: NavItem[];
  clientNavItems: NavItem[];
  currentNavItem: NavItem | null;
  breadcrumbs: Breadcrumb[];
  
  // Navigation actions
  navigateToAdmin: (path: string) => void;
  navigateToClient: (path: string) => void;
  goToAdminDashboard: () => void;
  goToClientDashboard: () => void;
  
  // Panel-specific helpers
  getAdminSidebarItems: () => SidebarItem[];
  getClientSidebarItems: () => SidebarItem[];
  getQuickActions: () => QuickAction[];
}

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  badge?: string | number;
  children?: NavItem[];
  requiredRoles?: string[];
  requiredPermissions?: string[];
}

interface SidebarItem extends NavItem {
  category: string;
  order: number;
  isCollapsible: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  action: () => void;
  icon: string;
  shortcut?: string;
  panel: 'admin' | 'client' | 'both';
}

// Usage
const { 
  adminNavItems, 
  navigateToAdmin, 
  getQuickActions 
} = usePanelNavigation();
```

### useDevTools

Development tools specifically for panel development.

```typescript
interface UseDevToolsReturn {
  // Panel switching
  quickSwitchToAdmin: () => void;
  quickSwitchToClient: () => void;
  togglePanelMode: () => void;
  
  // Role/Permission mocking
  mockRole: (role: string) => void;
  mockPermission: (permission: string) => void;
  clearMocks: () => void;
  activeMocks: {
    roles: string[];
    permissions: string[];
  };
  
  // Panel testing
  testAdminAccess: (path: string) => AccessTestResult;
  testClientAccess: (path: string) => AccessTestResult;
  simulateUserType: (userType: 'admin' | 'client' | 'guest') => void;
  
  // Debug panel
  showDebugPanel: boolean;
  toggleDebugPanel: () => void;
  debugInfo: {
    currentUser: User | null;
    activeRoles: string[];
    activePermissions: string[];
    currentPanel: string;
    routeAccess: Record<string, boolean>;
  };
}

interface AccessTestResult {
  canAccess: boolean;
  missingRoles: string[];
  missingPermissions: string[];
  reason: string;
}

// Usage
const { 
  quickSwitchToAdmin, 
  mockRole, 
  testAdminAccess, 
  debugInfo 
} = useDevTools();

// Development shortcuts
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    // Keyboard shortcuts for panel switching
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey) {
        if (e.key === 'A') quickSwitchToAdmin();
        if (e.key === 'C') quickSwitchToClient();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }
}, [quickSwitchToAdmin, quickSwitchToClient]);
```

### useDebug

Debug system hook for development and troubleshooting.

```typescript
interface UseDebugReturn {
  // State
  isEnabled: boolean;
  level: DebugLevel;
  logs: DebugLog[];
  
  // Actions
  log: (category: string, message: string, data?: any) => void;
  error: (category: string, message: string, error?: Error) => void;
  warn: (category: string, message: string, data?: any) => void;
  info: (category: string, message: string, data?: any) => void;
  debug: (category: string, message: string, data?: any) => void;
  
  // Panel-specific logging
  logAdminAction: (action: string, data?: any) => void;
  logClientAction: (action: string, data?: any) => void;
  logPanelSwitch: (from: string, to: string) => void;
  
  // Utilities
  clearLogs: () => void;
  exportLogs: () => string;
  setLevel: (level: DebugLevel) => void;
  filterByPanel: (panel: 'admin' | 'client') => DebugLog[];
}

// Usage
const { log, error, exportLogs } = useDebug();

// Log debug information
log('auth', 'Login attempt started', { email: credentials.email });

// Log errors
error('connector', 'API request failed', new Error('Network error'));

// Export logs for support
const logData = exportLogs();
```

## Auto-Components

### AutoRouter

Intelligent routing that generates all necessary routes automatically.

```tsx
import { AutoRouter } from 'react-identity-access';

function App() {
  return (
    <AutoRouter>
      {/* Routes generated automatically based on user roles */}
      <CustomRoute path="/custom" component={MyCustomPage} />
    </AutoRouter>
  );
}
```

### SmartRedirect

Intelligent redirects based on user context.

```tsx
import { SmartRedirect } from 'react-identity-access';

// Automatically redirects to the right place
<SmartRedirect />

// Admin → /admin/dashboard
// Client → /dashboard  
// Guest → /login
// Error → /landing
```

### InstantAdmin

Complete admin interface in one component.

```tsx
import { InstantAdmin } from 'react-identity-access';

<InstantAdmin /> // Complete admin panel with all features
```

### InstantClient

Complete client interface in one component.

```tsx
import { InstantClient } from 'react-identity-access';

<InstantClient /> // Complete client panel with dashboard
```

## Standard Components (Advanced)

### ProtectedRoute

Route protection component with role and permission checking.

```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  requireAll?: boolean; // true = AND logic, false = OR logic
  fallback?: React.ReactNode;
  redirectTo?: string;
  onUnauthorized?: () => void;
}

// Usage
<ProtectedRoute 
  requiredRoles={['admin']} 
  redirectTo="/login"
>
  <AdminPanel />
</ProtectedRoute>

<ProtectedRoute 
  requiredPermissions={['read:users', 'write:users']} 
  requireAll={false}
  fallback={<AccessDenied />}
>
  <UserManagement />
</ProtectedRoute>
```

### RoleGuard

Conditional rendering based on roles and permissions.

```typescript
interface RoleGuardProps {
  roles?: string[];
  permissions?: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

// Usage
<RoleGuard roles={['admin', 'moderator']}>
  <AdminButton />
</RoleGuard>

<RoleGuard 
  permissions={['delete:posts']} 
  fallback={<span>No permission</span>}
>
  <DeleteButton />
</RoleGuard>
```

### TenantSwitch

Tenant switching component.

```typescript
interface TenantSwitchProps {
  className?: string;
  showCurrentTenant?: boolean;
  onTenantChange?: (tenant: Tenant) => void;
}

// Usage
<TenantSwitch 
  showCurrentTenant={true}
  onTenantChange={(tenant) => console.log('Switched to:', tenant.name)}
/>
```

### DefaultScreens

Pre-built authentication screen components with customization options.

```typescript
// Login Screen
interface LoginScreenProps {
  onSuccess?: (user: User) => void;
  onError?: (error: string) => void;
  className?: string;
  customization?: ScreenCustomization;
  showRememberMe?: boolean;
  showForgotPassword?: boolean;
  showSignupLink?: boolean;
  customFields?: CustomField[];
}

// Signup Screen
interface SignupScreenProps {
  onSuccess?: (user: User) => void;
  onError?: (error: string) => void;
  className?: string;
  customization?: ScreenCustomization;
  showLoginLink?: boolean;
  customFields?: CustomField[];
}

// Password Recovery Screen
interface PasswordRecoveryProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  customization?: ScreenCustomization;
  showLoginLink?: boolean;
}

// Landing Screen
interface LandingScreenProps {
  onTenantSelect?: (tenantId: string) => void;
  className?: string;
  customization?: ScreenCustomization;
  availableTenants?: Tenant[];
}

interface ScreenCustomization {
  title?: string;
  subtitle?: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundImage?: string;
  customCss?: string;
  texts?: {
    loginButton?: string;
    signupButton?: string;
    forgotPasswordLink?: string;
    // ... more customizable texts
  };
}

interface CustomField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select';
  required?: boolean;
  options?: { value: string; label: string; }[];
}

// Usage - Default screens
<LoginScreen 
  onSuccess={(user) => navigate('/dashboard')}
  customization={{
    title: 'Welcome Back',
    logo: '/logo.png',
    primaryColor: '#007bff',
    texts: {
      loginButton: 'Sign In'
    }
  }}
  showRememberMe={true}
  customFields={[
    { name: 'tenantId', label: 'Organization', type: 'select', options: tenantOptions }
  ]}
/>

<SignupScreen 
  onSuccess={(user) => navigate('/welcome')}
  customization={{
    title: 'Join Us',
    subtitle: 'Create your account'
  }}
/>

<LandingScreen 
  onTenantSelect={(tenantId) => {
    // Handle tenant selection
    window.location.href = `https://${tenantId}.myapp.com`;
  }}
  customization={{
    title: 'Choose Your Organization'
  }}
/>
```

## Presets

### Industry Presets

Pre-configured setups for different industries.

```tsx
import { createApp, presets } from 'react-identity-access';

// SaaS B2B preset
const App = createApp(presets.saasB2B);

// E-commerce preset  
const App = createApp(presets.ecommerce);

// Educational preset
const App = createApp(presets.education);

// Startup MVP preset
const App = createApp(presets.startupMVP);
```

### Template Presets

UI templates for different use cases.

```tsx
import { AdminPanel, ClientPanel } from 'react-identity-access';

// Admin templates
<AdminPanel template="crm" />        // CRM-style admin
<AdminPanel template="analytics" />   // Analytics-focused
<AdminPanel template="ecommerce" />   // E-commerce admin

// Client templates
<ClientPanel template="dashboard" />  // Standard dashboard
<ClientPanel template="profile" />    // Profile-focused
<ClientPanel template="minimal" />    // Minimal UI
```

## Connectors (Advanced)

### createLocalStorageConnector

Development connector using localStorage with backend simulation.

```typescript
interface LocalStorageConnectorConfig {
  simulateDelay?: boolean;
  minDelay?: number;
  maxDelay?: number;
  errorRate?: number; // 0-1, probability of random errors
  debugMode?: boolean;
  storagePrefix?: string;
  seedData?: SeedData;
}

interface SeedData {
  tenants: Tenant[];
  users: User[];
  roles: Role[];
}

// Usage
const connector = createLocalStorageConnector({
  simulateDelay: true,
  minDelay: 100,
  maxDelay: 500,
  errorRate: 0.1, // 10% error rate for testing
  debugMode: true,
  seedData: {
    tenants: [
      { id: 'acme', name: 'Acme Corp', domain: 'acme.example.com' }
    ],
    users: [
      { id: '1', email: 'admin@acme.com', tenantId: 'acme', roles: ['admin'] }
    ],
    roles: [
      { id: 'admin', name: 'Administrator', permissions: ['*'] }
    ]
  }
});
```

### createApiConnector

Production connector for REST API backends.

```typescript
interface ApiConnectorConfig {
  baseUrl: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  interceptors?: {
    request?: (config: RequestConfig) => RequestConfig;
    response?: (response: Response) => Response;
    error?: (error: Error) => Error;
  };
}

// Usage
const connector = createApiConnector({
  baseUrl: 'https://api.example.com',
  timeout: 10000,
  retries: 3,
  headers: {
    'Content-Type': 'application/json'
  },
  interceptors: {
    request: (config) => {
      // Add auth headers
      return config;
    },
    error: (error) => {
      // Handle specific error cases
      return error;
    }
  }
});
```

## Utilities

### Permission Utilities

```typescript
// Check if user has specific permission
hasPermission(permission: string, resource?: string): boolean

// Check if user has any of the specified permissions
hasAnyPermission(permissions: string[]): boolean

// Check if user has all specified permissions
hasAllPermissions(permissions: string[]): boolean

// Get effective permissions for current user
getEffectivePermissions(): Permission[]

// Check if permission allows action on resource
canPerformAction(action: string, resource: string): boolean
```

### Role Utilities

```typescript
// Check if user has specific role
hasRole(roleName: string): boolean

// Check if user has any of the specified roles
hasAnyRole(roleNames: string[]): boolean

// Check if user has all specified roles
hasAllRoles(roleNames: string[]): boolean

// Get role hierarchy
getRoleHierarchy(): RoleHierarchy

// Check if role inherits from another role
roleInheritsFrom(childRole: string, parentRole: string): boolean
```

### Debug Utilities

```typescript
// Create debug logger for specific category
createDebugLogger(category: string): DebugLogger

// Format debug output
formatDebugMessage(level: DebugLevel, category: string, message: string, data?: any): string

// Export debug logs
exportDebugLogs(format: 'json' | 'csv' | 'text'): string

// Clear debug logs
clearDebugLogs(): void
```

## Environment Configuration

Configure everything via environment variables for zero-config setup.

```bash
# .env
REACT_APP_IDENTITY_PRESET=saas-b2b
REACT_APP_IDENTITY_MOCK_DATA=true
REACT_APP_IDENTITY_DEV_TOOLS=true
REACT_APP_IDENTITY_AUTO_LOGIN=admin@test.com
REACT_APP_IDENTITY_THEME_COLOR=#6366f1
REACT_APP_IDENTITY_TENANT_NAME="Mi App"
```

```tsx
// Zero configuration - reads from .env automatically
const App = createApp();
```

## CLI Tools

Command-line tools for rapid scaffolding.

```bash
# Create new project
npx create-identity-app my-app --preset saas-b2b

# Add to existing project
npx add-identity-access --preset startup-mvp

# Generate components
npx identity generate admin-page --name UserAnalytics
npx identity generate client-page --name Dashboard

# Generate mock data
npx identity mock --users 100 --tenants 5
```

## Error Handling (Advanced)

### Error Types

```typescript
class AuthenticationError extends Error {
  code: 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'EMAIL_NOT_VERIFIED';
}

class AuthorizationError extends Error {
  code: 'INSUFFICIENT_PERMISSIONS' | 'ROLE_REQUIRED' | 'TENANT_ACCESS_DENIED';
}

class SessionError extends Error {
  code: 'SESSION_EXPIRED' | 'INVALID_TOKEN' | 'REFRESH_FAILED';
}

class TenantError extends Error {
  code: 'TENANT_NOT_FOUND' | 'TENANT_INACTIVE' | 'TENANT_SWITCH_FAILED';
}
```

### Error Handling Patterns

```typescript
// Global error boundary
<IdentityErrorBoundary onError={(error) => console.error(error)}>
  <App />
</IdentityErrorBoundary>

// Hook-level error handling
const { error, clearError } = useAuth();

useEffect(() => {
  if (error) {
    // Handle error
    toast.error(error);
    clearError();
  }
}, [error, clearError]);
```
