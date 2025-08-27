# API Reference

## Providers

### ReactIdentityProvider (Recommended)

Unified provider that manages all connectors and features with a single configuration.

```tsx
<ReactIdentityProvider
  config={{
    connector: {
      type: 'localStorage' | 'fetch',
      appId: string,
      apiKey?: string,
      baseUrl?: string,
      endpoints?: {
        identity?: string,
        settings?: string,
        subscription?: string,
        featureFlags?: string,
      },
    },
    tenantResolver?: {
      strategy: 'query-param' | 'subdomain',
      queryParam?: { paramName: string, storageKey: string },
    },
    features?: {
      settings?: boolean,
      subscription?: boolean,
      featureFlags?: boolean,
    },
    components?: {
      LoadingComponent?: React.ComponentType,
      LandingComponent?: React.ComponentType,
      ErrorComponent?: React.ComponentType<{ error: string }>,
    },
  }}
  settingsSchema?: ZodSchema
  settingsDefaults?: any
  settingsVersion?: string
  subscriptionPlans?: Plan[]
  paymentGateway?: PaymentGateway
>
```

### Individual Providers (Legacy)

#### IdentityProvider

Authentication and user management.

```tsx
<IdentityProvider>
```

#### SettingsProvider

Schema-validated settings management.

```tsx
<SettingsProvider 
  schema={ZodSchema}
  defaults={DefaultValues}
  config?: SettingsConfig
>
```

#### SubscriptionProvider

Billing and subscription management.

```tsx
<SubscriptionProvider>
```

#### TenantPaymentProvider

Payment processing for tenants to charge their customers.

```tsx
<TenantPaymentProvider
  paymentGateway={paymentGateway}
  config={paymentConfig}
>
```

## Hooks

### useAuth()

Primary authentication hook providing login/logout functionality and user state.

```tsx
const { 
  auth,
  login, 
  logout, 
  signup
} = useAuth();
```

**Returns:**
- `auth: AuthState` - Authentication state object
- `login: (email: string, password: string) => Promise<void>` - Login function
- `logout: () => Promise<void>` - Logout function
- `signup: (email: string, password: string, name: string) => Promise<void>` - Signup function

**Types:**
```tsx
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface User {
  id: string;
  email: string;
  name?: string;
  tenantId: string;
  roles?: string[];
  permissions?: string[];
  createdAt: Date;
  lastLoginAt?: Date;
}
```

### useFeatureFlags()

Feature flag management and checking.

```tsx
const { 
  flags, 
  isEnabled,
  toggleFlag,
  refreshFlags
} = useFeatureFlags();
```

**Returns:**
- `flags: Record<string, boolean>` - Current feature flags state
- `isEnabled: (key: string) => boolean` - Check if flag is enabled
- `toggleFlag: (key: string, enabled: boolean) => Promise<void>` - Toggle flag
- `refreshFlags: () => Promise<void>` - Refresh flags from backend

### useSettings()

Settings management with schema validation.

```tsx
const { 
  values, 
  updateSetting,
  isDirty,
  save,
  reset
} = useSettings<T>();
```

**Returns:**
- `values: T` - Current settings values
- `updateSetting: (key: keyof T, value: any) => void` - Update setting
- `isDirty: boolean` - Whether settings have unsaved changes
- `save: () => Promise<void>` - Save changes
- `reset: () => void` - Reset to defaults

### useSubscription()

Subscription and billing management.

```tsx
const { 
  subscription,
  plans,
  usage,
  limits,
  subscribe,
  cancelSubscription,
  changePlan,
  getUsage,
  checkLimit
} = useSubscription();
```

**Returns:**
- `subscription: Subscription | null` - Current subscription
- `plans: Plan[]` - Available plans
- `usage: Usage` - Current usage statistics
- `limits: Limits` - Current plan limits
- `subscribe: (planId: string) => Promise<void>` - Subscribe to plan
- `cancelSubscription: () => Promise<void>` - Cancel subscription
- `changePlan: (planId: string) => Promise<void>` - Change plan
- `getUsage: (metric: string) => number` - Get usage for specific metric
- `checkLimit: (metric: string) => boolean` - Check if limit is exceeded

### useTenantPayment()

Payment processing for tenant-to-customer payments.

```tsx
const {
  processPayment,
  paymentHistory,
  paymentMethods,
  addPaymentMethod,
  refundPayment
} = useTenantPayment();
```

**Returns:**
- `processPayment: (amount: number, currency: string, customerId: string) => Promise<PaymentResult>` - Process payment
- `paymentHistory: Payment[]` - Payment history
- `paymentMethods: PaymentMethod[]` - Available payment methods
- `addPaymentMethod: (method: PaymentMethod) => Promise<void>` - Add payment method
- `refundPayment: (paymentId: string, amount?: number) => Promise<void>` - Refund payment

### useTenant()

Tenant information and management.

```tsx
const { 
  tenantId,
  tenant,
  isLoading,
  switchTenant,
  availableTenants
} = useTenant();
```

**Returns:**
- `tenantId: string | null` - Current tenant ID
- `tenant: Tenant | null` - Current tenant object
- `isLoading: boolean` - Loading state
- `switchTenant: (tenantId: string) => Promise<void>` - Switch to different tenant
- `availableTenants: Tenant[]` - Available tenants for user

### useRoles()

Role and permission management.

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

### SubscriptionGuard

Conditional rendering based on subscription plan or status.

```tsx
<SubscriptionGuard 
  requiredPlan="pro"
  requiredStatus="active"
  fallback={<UpgradePrompt />}
>
  <ProFeatures />
</SubscriptionGuard>
```

**Props:**
- `requiredPlan?: string` - Required subscription plan
- `requiredStatus?: string` - Required subscription status
- `fallback?: ReactNode` - Content to show when requirements not met

### FeatureGate

Feature-based access control with upgrade prompts.

```tsx
<FeatureGate 
  feature="advanced-analytics"
  fallback={<UpgradePrompt />}
  showUpgradePrompt={true}
>
  <AdvancedAnalytics />
</FeatureGate>
```

**Props:**
- `feature: string` - Feature identifier
- `fallback?: ReactNode` - Content to show when feature not available
- `showUpgradePrompt?: boolean` - Show upgrade prompt in fallback

### LimitGate

Usage limit enforcement with warnings.

```tsx
<LimitGate 
  limit="api_calls"
  warningThreshold={0.8}
  blockThreshold={1.0}
  fallback={<LimitExceeded />}
>
  <ApiUsageWidget />
</LimitGate>
```

**Props:**
- `limit: string` - Limit identifier
- `warningThreshold?: number` - Threshold to show warning (0-1)
- `blockThreshold?: number` - Threshold to block access (0-1)
- `fallback?: ReactNode` - Content to show when limit exceeded

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

## Payment Gateways

The library supports multiple payment gateways through a pluggable architecture.

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

### Custom Gateway

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
