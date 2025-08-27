# API Reference

Complete API documentation for React Identity Access.

## Providers

### ConnectorProvider

The root provider that manages data access abstraction.

```tsx
<ConnectorProvider
  config={ConnectorConfig}
  onTokenInterceptorReady?: (interceptor: TokenInterceptor) => void
>
```

#### ConnectorConfig

```typescript
interface ConnectorConfig {
  type: 'localStorage' | 'fetch';
  appId: string;
  seedData?: SeedData;
  
  // Fetch connector specific
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  
  // LocalStorage connector specific
  storagePrefix?: string;
}
```

#### SeedData

```typescript
interface SeedData {
  tenants?: Tenant[];
  users?: User[];
  passwords?: Password[];
  roles?: Role[];
  permissions?: Permission[];
  featureFlags?: FeatureFlag[];
  subscriptionPlans?: SubscriptionPlan[];
}
```

### TenantProvider

Manages multi-tenant resolution and context.

```tsx
<TenantProvider config={TenantConfig}>
```

#### TenantConfig

```typescript
interface TenantConfig {
  strategy: 'subdomain' | 'query-param' | 'static';
  static?: {
    tenantId: string;
  };
  fallback?: string;
}
```

### IdentityProvider

Handles authentication and authorization.

```tsx
<IdentityProvider config?: IdentityConfig>
```

#### IdentityConfig

```typescript
interface IdentityConfig {
  autoLogin?: boolean;
  sessionTimeout?: number;
  requireEmailVerification?: boolean;
}
```

### FeatureFlagsProvider

Manages dynamic feature control.

```tsx
<FeatureFlagsProvider config?: FeatureFlagsConfig>
```

### SubscriptionProvider

Handles billing and subscription management.

```tsx
<SubscriptionProvider config?: SubscriptionConfig>
```

### SettingsProvider

Manages application configuration with schema validation.

```tsx
<SettingsProvider<T>
  schema={ZodSchema<T>}
  defaults={T}
  config={SettingsConfig}
>
```

#### SettingsConfig

```typescript
interface SettingsConfig {
  version: string;
  autoSave?: boolean;
}
```

## Hooks

### useAuth

Access authentication state and methods.

```typescript
const {
  auth: AuthState,
  login: (credentials: LoginCredentials) => Promise<AuthResponse>,
  logout: () => Promise<void>,
  signup: (email: string, password: string, name: string) => Promise<void>
} = useAuth();
```

#### AuthState

```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
```

#### LoginCredentials

```typescript
interface LoginCredentials {
  email: string;
  password: string;
}
```

#### User

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  roles: string[];
  permissions?: string[];
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}
```

### useFeatureFlags

Access feature flag state and controls.

```typescript
const {
  flags: Record<string, boolean>,
  isLoading: boolean,
  error: string | null,
  isEnabled: (flag: string) => boolean,
  toggleFlag: (flag: string, enabled: boolean) => Promise<void>,
  refreshFlags: () => Promise<void>
} = useFeatureFlags();
```

### useSettings

Access and manage application settings.

```typescript
const {
  values: T,
  isLoading: boolean,
  error: string | null,
  isDirty: boolean,
  updateSetting: <K extends keyof T>(key: K, value: T[K]) => Promise<void>,
  updateSettings: (updates: Partial<T>) => Promise<void>,
  save: () => Promise<void>,
  reset: () => void,
  refresh: () => Promise<void>
} = useSettings<T>();
```

### useSubscription

Access subscription state and management.

```typescript
const {
  subscription: Subscription | null,
  plans: SubscriptionPlan[],
  isLoading: boolean,
  error: string | null,
  subscribe: (planId: string, options?: SubscribeOptions) => Promise<void>,
  cancelSubscription: () => Promise<void>,
  changePlan: (planId: string) => Promise<void>,
  refreshSubscription: () => Promise<void>
} = useSubscription();
```

#### Subscription

```typescript
interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
  limits: Record<string, number>;
}
```

#### SubscriptionPlan

```typescript
interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  limits: Record<string, number>;
  isPopular?: boolean;
}
```

### useTenant

Access tenant resolution state.

```typescript
const {
  tenantId: string | null,
  isLoading: boolean,
  error: string | null
} = useTenant();
```

## Components

### FeatureFlag

Conditionally render content based on feature flags.

```tsx
<FeatureFlag 
  flag={string}
  fallback?: ReactNode
>
  {children}
</FeatureFlag>
```

**Props:**
- `flag`: Feature flag key to check
- `fallback`: Content to render when flag is disabled
- `children`: Content to render when flag is enabled

### FeatureGate

Advanced feature gating with subscription integration.

```tsx
<FeatureGate
  feature={string}
  requiredPlan?: string
  fallback?: ReactNode
>
  {children}
</FeatureGate>
```

**Props:**
- `feature`: Feature key to check
- `requiredPlan`: Required subscription plan
- `fallback`: Content when access denied
- `children`: Protected content

### SubscriptionGuard

Protect content based on subscription status.

```tsx
<SubscriptionGuard
  requiredPlan?: string
  requiredStatus?: SubscriptionStatus
  fallback?: ReactNode
>
  {children}
</SubscriptionGuard>
```

**Props:**
- `requiredPlan`: Minimum plan required
- `requiredStatus`: Required subscription status
- `fallback`: Content when requirements not met
- `children`: Protected content

### LimitGate

Enforce usage limits with warnings.

```tsx
<LimitGate
  feature={string}
  current={number}
  limit={number}
  warningThreshold?: number
  fallback?: ReactNode
>
  {children}
</LimitGate>
```

**Props:**
- `feature`: Feature being limited
- `current`: Current usage count
- `limit`: Maximum allowed usage
- `warningThreshold`: Warning threshold (0-1)
- `fallback`: Content when limit exceeded
- `children`: Content when within limits

### RoleGuard

Protect content based on user roles.

```tsx
<RoleGuard
  requiredRoles={string[]}
  requireAll?: boolean
  fallback?: ReactNode
>
  {children}
</RoleGuard>
```

**Props:**
- `requiredRoles`: Array of required roles
- `requireAll`: Whether all roles are required (default: false)
- `fallback`: Content when access denied
- `children`: Protected content

### ProtectedRoute

Route-level protection with authentication and authorization.

```tsx
<ProtectedRoute
  requiredRoles?: string[]
  requiredPlan?: string
  redirectTo?: string
>
  {children}
</ProtectedRoute>
```

**Props:**
- `requiredRoles`: Required user roles
- `requiredPlan`: Required subscription plan
- `redirectTo`: Redirect path when access denied
- `children`: Protected route content

## Types

### Core Types

```typescript
interface Tenant {
  id: string;
  name: string;
  domain?: string;
  isActive: boolean;
  createdAt: Date;
  settings?: Record<string, any>;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  tenantId?: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  defaultState: boolean;
  adminEditable: boolean;
  tenantId?: string;
}
```

### Response Types

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

interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };
}
```

### Configuration Types

```typescript
interface ConnectorConfig {
  type: 'localStorage' | 'fetch';
  appId: string;
  seedData?: SeedData;
  tokenInterceptor?: TokenInterceptor;
  
  // Fetch-specific
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  
  // LocalStorage-specific
  storagePrefix?: string;
}

interface TokenInterceptor {
  getAccessToken(): Promise<string | null>;
  refreshToken(): Promise<string | null>;
  onTokenExpired(): Promise<void>;
}
```

## Error Handling

### Error Types

```typescript
type ErrorCode = 
  | 'UNAUTHORIZED'
  | 'FORBIDDEN' 
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR';

type ErrorSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

type ErrorCategory = 'BUSINESS' | 'TECHNICAL' | 'SECURITY';
```

### Error Response

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  code?: ErrorCode;
  severity?: ErrorSeverity;
  category?: ErrorCategory;
  details?: Record<string, any>;
}
```

## Utilities

### Schema Validation

```typescript
import { z } from 'zod';

// Built-in schemas
const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  tenantId: z.string(),
  roles: z.array(z.string()),
  isActive: z.boolean()
});

const tenantSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  domain: z.string().optional(),
  isActive: z.boolean()
});
```

### Dot Notation Utilities

```typescript
// Update nested objects using dot notation
updateSetting('appearance.theme', 'dark');
updateSetting('notifications.email.enabled', true);

// Get nested values
const theme = getSetting('appearance.theme');
```

### Helper Functions

```typescript
// Create standardized responses
function createSuccessResponse<T>(
  data: T, 
  message?: string, 
  metadata?: any
): ApiResponse<T>;

function createErrorResponse(
  error: string, 
  code?: ErrorCode, 
  category?: ErrorCategory
): ApiResponse<never>;

// Validation helpers
function validateEmail(email: string): boolean;
function validatePassword(password: string): boolean;
function validateTenantId(tenantId: string): boolean;
```
