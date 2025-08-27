# API Design - React Identity Access

## Current Implementation Status

This document describes the **current implemented API** as of the latest version. The library follows a **unified provider architecture** with comprehensive subscription and payment management.

## Core Providers

### ReactIdentityProvider (Primary)

Unified provider that manages all features with a single configuration.

```tsx
import { ReactIdentityProvider, z } from 'react-identity-access';

const settingsSchema = z.object({
  siteName: z.string(),
  theme: z.enum(['light', 'dark']),
  maxUsers: z.number(),
});

function App() {
  const config = {
    connector: {
      type: 'localStorage', // or 'fetch'
      appId: 'my-app',
      apiKey: process.env.REACT_APP_API_KEY,
      baseUrl: 'https://api.myapp.com',
    },
    tenantResolver: {
      strategy: 'query-param', // or 'subdomain'
      queryParam: {
        paramName: 'tenant',
        storageKey: 'app-tenant',
      },
    },
    features: {
      settings: true,
      subscription: true,
      featureFlags: true,
    },
  };

  return (
    <ReactIdentityProvider
      config={config}
      settingsSchema={settingsSchema}
      settingsDefaults={{ siteName: 'My App', theme: 'light', maxUsers: 100 }}
      paymentGateway={stripeGateway}
      subscriptionPlans={plans}
    >
      <YourApp />
    </ReactIdentityProvider>
  );
}
```

### SimpleUnifiedProvider (Simplified)

Streamlined provider for rapid prototyping.

```tsx
import { SimpleUnifiedProvider } from 'react-identity-access';

function App() {
  return (
    <SimpleUnifiedProvider
      config={{
        type: 'localStorage',
        appId: 'my-app',
      }}
      settingsSchema={settingsSchema}
      settingsDefaults={defaults}
    >
      <YourApp />
    </SimpleUnifiedProvider>
  );
}
```

## Individual Providers (Legacy Support)

For backward compatibility and granular control:

### IdentityProvider

Core authentication and user management.

```tsx
import { IdentityProvider } from 'react-identity-access';

function App() {
  return (
    <IdentityProvider>
      <YourApp />
    </IdentityProvider>
  );
}
```

### SubscriptionProvider

Billing and subscription management.

```tsx
import { SubscriptionProvider } from 'react-identity-access';

function App() {
  return (
    <SubscriptionProvider>
      <YourApp />
    </SubscriptionProvider>
  );
}
```

### TenantPaymentProvider

Payment processing for tenant-to-customer transactions.

```tsx
import { TenantPaymentProvider, StripePaymentGateway } from 'react-identity-access';

const stripeGateway = new StripePaymentGateway({
  publicKey: process.env.REACT_APP_STRIPE_PUBLIC_KEY,
  secretKey: process.env.STRIPE_SECRET_KEY,
});

function App() {
  return (
    <TenantPaymentProvider paymentGateway={stripeGateway}>
      <YourApp />
    </TenantPaymentProvider>
  );
}
```

## Payment Gateway Integration

### Stripe Gateway

```tsx
import { StripePaymentGateway } from 'react-identity-access';

const stripeGateway = new StripePaymentGateway({
  publicKey: process.env.REACT_APP_STRIPE_PUBLIC_KEY,
  secretKey: process.env.STRIPE_SECRET_KEY,
});
```

### MercadoPago Gateway

```tsx
import { MercadoPagoPaymentGateway } from 'react-identity-access';

const mercadoPagoGateway = new MercadoPagoPaymentGateway({
  publicKey: process.env.REACT_APP_MERCADOPAGO_PUBLIC_KEY,
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});
```

### Custom Payment Gateway

```tsx
import { BasePaymentGateway } from 'react-identity-access';

class CustomPaymentGateway extends BasePaymentGateway {
  async processPayment(amount: number, currency: string, paymentMethod: any) {
    // Your implementation
  }
  
  async refundPayment(paymentId: string, amount?: number) {
    // Your implementation
  }
}
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

## Core Hooks

### useAuth

Primary authentication hook.

```tsx
const { auth, login, logout, signup } = useAuth();

// Login
await login('user@example.com', 'password');

// Check authentication
if (auth.isAuthenticated) {
  console.log('User:', auth.user);
}

// Logout
await logout();
```

### useSubscription

Subscription and billing management.

```tsx
const { 
  subscription, 
  plans, 
  usage, 
  limits, 
  subscribe, 
  cancelSubscription,
  getUsage,
  checkLimit 
} = useSubscription();

// Subscribe to a plan
await subscribe('pro-plan');

// Check usage limits
if (checkLimit('api_calls')) {
  console.log('API limit exceeded');
}
```

### useTenantPayment

Payment processing for tenant-to-customer payments.

```tsx
const {
  processPayment,
  paymentHistory,
  paymentMethods,
  addPaymentMethod,
  refundPayment
} = useTenantPayment();

// Process a payment
const result = await processPayment(100, 'USD', 'customer-123');

// Refund a payment
await refundPayment('payment-456', 50);
```

### useFeatureFlags

Feature flag management.

```tsx
const { flags, isEnabled, toggleFlag } = useFeatureFlags();

// Check if feature is enabled
if (isEnabled('new-dashboard')) {
  return <NewDashboard />;
}

// Toggle feature (admin only)
await toggleFlag('beta-features', true);
```

### useSettings

Settings management with schema validation.

```tsx
const { values, updateSetting, save, isDirty } = useSettings();

// Update a setting
updateSetting('theme', 'dark');

// Save changes
if (isDirty) {
  await save();
}
```

### useRoles

Role and permission management.

```tsx
const { hasRole, hasPermission, hasAnyRole } = useRoles();

// Check role
if (hasRole('admin')) {
  return <AdminPanel />;
}

// Check permission
if (hasPermission('users:write')) {
  return <EditButton />;
}
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

## Declarative Components

### ProtectedRoute

Route-level protection with authentication and authorization.

```tsx
import { ProtectedRoute } from 'react-identity-access';

<ProtectedRoute requireRole="admin" redirectTo="/login">
  <AdminPanel />
</ProtectedRoute>
```

### RoleGuard

Conditional rendering based on roles.

```tsx
import { RoleGuard } from 'react-identity-access';

<RoleGuard role="admin" fallback={<AccessDenied />}>
  <AdminContent />
</RoleGuard>
```

### SubscriptionGuard

Conditional rendering based on subscription plan.

```tsx
import { SubscriptionGuard } from 'react-identity-access';

<SubscriptionGuard requiredPlan="pro" fallback={<UpgradePrompt />}>
  <ProFeatures />
</SubscriptionGuard>
```

### FeatureGate

Feature-based access control with upgrade prompts.

```tsx
import { FeatureGate } from 'react-identity-access';

<FeatureGate feature="advanced-analytics" fallback={<UpgradePrompt />}>
  <AdvancedAnalytics />
</FeatureGate>
```

### LimitGate

Usage limit enforcement with warnings.

```tsx
import { LimitGate } from 'react-identity-access';

<LimitGate 
  limit="api_calls" 
  warningThreshold={0.8} 
  fallback={<LimitExceeded />}
>
  <ApiUsageWidget />
</LimitGate>
```

### FeatureFlag

Conditional rendering based on feature flags.

```tsx
import { FeatureFlag } from 'react-identity-access';

<FeatureFlag flag="new-dashboard" fallback={<OldDashboard />}>
  <NewDashboard />
</FeatureFlag>
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

## Settings Management

### Schema-based Settings

Type-safe settings with Zod validation.

```tsx
import { z } from 'react-identity-access';

const settingsSchema = z.object({
  siteName: z.string(),
  theme: z.enum(['light', 'dark']),
  maxUsers: z.number(),
  features: z.object({
    notifications: z.boolean(),
    analytics: z.boolean(),
  }),
});

const defaults = {
  siteName: 'My App',
  theme: 'light',
  maxUsers: 100,
  features: {
    notifications: true,
    analytics: false,
  },
};
```

### Settings Provider

```tsx
import { SettingsProvider } from 'react-identity-access';

<SettingsProvider 
  schema={settingsSchema} 
  defaults={defaults}
  config={{ version: '1.0.0' }}
>
  <YourApp />
</SettingsProvider>
```

## Connectors

### LocalStorageConnector (Development)

Mock connector for development and testing.

```tsx
import { LocalStorageConnector } from 'react-identity-access';

const connector = new LocalStorageConnector({
  simulateDelay: true,
  errorRate: 0.1,
  storagePrefix: 'myapp_',
  seedData: customSeedData
});
```

### LocalStorageSubscriptionConnector

Mock subscription connector with billing simulation.

```tsx
import { LocalStorageSubscriptionConnector } from 'react-identity-access';

const subscriptionConnector = new LocalStorageSubscriptionConnector({
  mockPlans: [
    { id: 'basic', name: 'Basic', price: 9.99 },
    { id: 'pro', name: 'Pro', price: 29.99 },
  ],
  mockUsage: true,
});
```

### Connector Configuration

Unified connector configuration through ReactIdentityProvider:

```tsx
const config = {
  connector: {
    type: 'localStorage', // or 'fetch'
    appId: 'my-app',
    apiKey: process.env.REACT_APP_API_KEY,
    baseUrl: 'https://api.myapp.com',
    endpoints: {
      identity: '/api/v1/identity',
      settings: '/api/v1/settings',
      subscription: '/api/v1/subscription',
      featureFlags: '/api/v1/feature-flags',
      payments: '/api/v1/payments',
    },
  },
};
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

## Multi-Tenancy

### Tenant Resolution Strategies

#### Subdomain Strategy (Production)

```tsx
const config = {
  tenantResolver: {
    strategy: 'subdomain',
    subdomain: {
      pattern: '{tenant}.myapp.com',
    },
  },
};
```

#### Query Parameter Strategy (Development)

```tsx
const config = {
  tenantResolver: {
    strategy: 'query-param',
    queryParam: {
      paramName: 'tenant',
      storageKey: 'app-tenant',
    },
  },
};
```

### Tenant Management

```tsx
const { tenantId, tenant, switchTenant, availableTenants } = useTenant();

// Switch tenant
await switchTenant('new-tenant-id');

// Get current tenant info
console.log('Current tenant:', tenant?.name);
```

## Environment Configuration

```bash
# .env
REACT_APP_API_KEY=your-api-key
REACT_APP_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
REACT_APP_MERCADOPAGO_PUBLIC_KEY=your-mp-key
MERCADOPAGO_ACCESS_TOKEN=your-mp-token
```

## Error Handling

### Error Types

```typescript
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

### Hook-level Error Handling

```tsx
const { auth, error, clearError } = useAuth();

useEffect(() => {
  if (error) {
    console.error('Auth error:', error);
    clearError();
  }
}, [error, clearError]);
```

## Development Credentials

The library comes with pre-seeded test data:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `superadmin@system.com` | `admin123` |
| Admin | `admin@acme.com` | `admin123` |
| User | `user@acme.com` | `user123` |

## Implementation Status

### ✅ Fully Implemented
- ReactIdentityProvider and SimpleUnifiedProvider
- Authentication and user management
- Settings management with schema validation
- Subscription and billing system
- Payment gateway integration (Stripe, MercadoPago)
- Feature flags with dual control
- Multi-tenancy support
- Declarative components (Guards, Gates)
- Mock data system for development

### ⚠️ Partially Implemented
- Some fetch connectors use localStorage fallback
- TypeScript types need refinement

### 📝 Future Considerations
- Additional payment gateways
- Advanced SSR features
- Developer tools panel
