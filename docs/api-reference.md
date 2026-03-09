# API Reference

Complete API reference for React Identity Access library.

## Table of Contents

- [Providers](#providers)
- [Hooks](#hooks)
- [Components](#components)
- [Services](#services)
- [Types](#types)
- [Utilities](#utilities)

## Providers

### AppProvider

Root provider that configures the application context. Loads public app info from the backend.

```tsx
interface AppConfig {
  baseUrl: string;           // Backend API URL
  appId: string;             // Application identifier
  cache?: {
    enabled?: boolean;       // Default: true
    ttl?: number;            // Cache TTL in ms (default: 5 minutes)
    storageKey?: string;     // Default: 'app_cache_{appId}'
  };
}

interface AppContextValue {
  appId: string;
  baseUrl: string;
  appInfo: PublicAppInfo | null;
  isAppLoading: boolean;
  appError: Error | null;
  retryApp: () => void;
}

<AppProvider config={{ baseUrl: 'https://api.example.com', appId: 'my-app' }}>
  {children}
</AppProvider>
```

### TenantProvider

Handles multi-tenant detection, info loading, settings, and tenant switching.

```tsx
interface TenantConfig {
  tenantMode?: 'subdomain' | 'selector' | 'fixed'; // Default: 'selector'
  fixedTenantSlug?: string;  // Required when tenantMode is 'fixed'
  baseDomain?: string;       // Base domain for subdomain mode (e.g., 'myapp.com')
  selectorParam?: string;    // Default: 'tenant', for 'selector' mode
  cache?: {
    enabled?: boolean;       // Default: true
    ttl?: number;            // Cache TTL in ms (default: 5 minutes)
    storageKey?: string;     // Default: 'tenant_cache_{tenantSlug}'
  };
  initialTenant?: PublicTenantInfo; // SSR pre-loaded tenant
}

interface TenantContextValue {
  tenant: PublicTenantInfo | null;
  tenantSlug: string | null;
  isTenantLoading: boolean;
  tenantError: Error | null;
  retryTenant: () => void;
  settings: TenantSettings | null;
  settingsSchema: JSONSchema | null;
  isSettingsLoading: boolean;
  settingsError: Error | null;
  refreshSettings: () => void;
  switchTenant: (tenantSlug: string, options?: {
    mode?: 'navigate' | 'reload';
    tokens?: AuthTokens;
    redirectPath?: string;
  }) => void;
  validateSettings: (settings: TenantSettings) => { isValid: boolean; errors: string[] };
}

<TenantProvider config={{ tenantMode: 'subdomain', baseDomain: 'myapp.com' }}>
  {children}
</TenantProvider>
```

### AuthProvider

Handles authentication, session management, user data, roles, permissions, and multi-tenant membership.

```tsx
interface AuthConfig {
  onSessionExpired?: (error: SessionExpiredError) => void;
  /** @deprecated Use onSessionExpired instead */
  onRefreshFailed?: () => void;
  initialRoles?: Role[];                   // SSR role injection
  refreshQueueTimeout?: number;            // ms before queued requests timeout (default: 10000)
  proactiveRefreshMargin?: number;         // ms before expiry to proactively refresh (default: 60000)
  autoSwitchSingleTenant?: boolean;        // Auto-switch if user has only one tenant (default: true)
  onTenantSelectionRequired?: (tenants: UserTenantMembership[]) => void;
}

<AuthProvider config={authConfig}>
  {children}
</AuthProvider>
```

### FeatureFlagProvider

Manages feature flags for the application.

```tsx
<FeatureFlagProvider>
  {children}
</FeatureFlagProvider>
```

### SubscriptionProvider

Handles billing and subscription management.

```tsx
<SubscriptionProvider>
  {children}
</SubscriptionProvider>
```

## Hooks

### useAuth

Primary authentication hook providing access to auth state and methods.

```tsx
interface AuthContextValue {
  // Authentication state
  isAuthenticated: boolean;
  sessionManager: SessionManager;
  authenticatedHttpService: HttpService;

  // Authentication methods (RFC-002: Object parameters)
  login: (params: LoginParams) => Promise<LoginResponse>;
  signup: (params: SignupParams) => Promise<User>;
  signupTenantAdmin: (params: SignupTenantAdminParams) => Promise<{ user: User; tenant: any }>;
  sendMagicLink: (params: SendMagicLinkParams) => Promise<MagicLinkResponse>;
  verifyMagicLink: (params: VerifyMagicLinkParams) => Promise<VerifyMagicLinkResponse>;
  changePassword: (params: ChangePasswordParams) => Promise<void>;
  requestPasswordReset: (params: RequestPasswordResetParams) => Promise<void>;
  confirmPasswordReset: (params: ConfirmPasswordResetParams) => Promise<void>;
  refreshToken: () => Promise<void>;
  logout: () => void;

  // Session methods
  setTokens: (tokens: { accessToken: string; refreshToken: string; expiresIn: number }) => void;
  hasValidSession: () => boolean;
  clearSession: () => void;

  // User data
  currentUser: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  loadUserData: (forceRefresh?: boolean) => Promise<void>;
  refreshUser: () => Promise<void>;

  // Initialization state (cross-subdomain auth)
  isAuthInitializing: boolean;
  isAuthReady: boolean;

  // Role and Permission management
  userRole: Role | null;
  userPermissions: string[];
  availableRoles: Role[];
  rolesLoading: boolean;
  hasPermission: (permission: string | Permission) => boolean;
  hasAnyPermission: (permissions: (string | Permission)[]) => boolean;
  hasAllPermissions: (permissions: (string | Permission)[]) => boolean;
  getUserPermissionStrings: () => string[];
  refreshRoles: () => Promise<void>;

  // Multi-tenant user membership (RFC-004)
  userTenants: UserTenantMembership[];
  hasTenantContext: boolean;
  switchToTenant: (tenantId: string, options?: { redirectPath?: string }) => Promise<void>;
  refreshUserTenants: () => Promise<UserTenantMembership[]>;
}

const auth = useAuth();
```

#### Key Methods

**login(params)**
- Authenticates user with email/phone + password
- `params: { username: string; password: string }`
- Returns: `Promise<LoginResponse>`

**signup(params)**
- Creates new user account
- `params: { email?: string; phoneNumber?: string; name: string; lastName?: string; password: string }`
- Returns: `Promise<User>`

**sendMagicLink(params)**
- Sends a magic link email for passwordless auth
- `params: { email: string; frontendUrl: string; name?: string; lastName?: string }`
- Returns: `Promise<MagicLinkResponse>`

**verifyMagicLink(params)**
- Verifies a magic link token
- `params: { token: string; email: string; appId: string; tenantSlug?: string }`
- Returns: `Promise<VerifyMagicLinkResponse>`

**hasPermission(permission)**
- Checks if user has specific permission
- Parameters: `string | Permission`
- Returns: `boolean`

**hasAnyPermission(permissions)**
- Checks if user has any of the specified permissions
- Returns: `boolean`

**hasAllPermissions(permissions)**
- Checks if user has all specified permissions
- Returns: `boolean`

**switchToTenant(tenantId, options?)**
- Switches the user's active tenant and optionally navigates
- Returns: `Promise<void>`

### useApp

Provides access to application configuration and loaded app info.

```tsx
interface AppContextValue {
  appId: string;
  baseUrl: string;
  appInfo: PublicAppInfo | null;
  isAppLoading: boolean;
  appError: Error | null;
  retryApp: () => void;
}

const { appId, baseUrl, appInfo } = useApp();
```

### useTenant / useTenantInfo

Provides access to tenant data, settings, and actions.

```tsx
const {
  tenant,           // PublicTenantInfo | null
  tenantSlug,       // string | null
  isTenantLoading,  // boolean
  settings,         // TenantSettings | null
  switchTenant,     // (slug, options?) => void
} = useTenant();
```

### useFeatureFlag

Manages feature flags and their values.

```tsx
interface FeatureFlagContextValue {
  isEnabled: (flagName: string) => boolean;
  getValue: <T>(flagName: string, defaultValue: T) => T;
  flags: Record<string, any>;
  loading: boolean;
  refreshFlags: () => Promise<void>;
}

const { isEnabled, getValue } = useFeatureFlag();
```

### useSubscription

Handles subscription and billing information.

```tsx
interface SubscriptionContextValue {
  subscription: Subscription | null;
  hasFeature: (feature: string) => boolean;
  getLimit: (limitName: string, defaultValue: number) => number;
  isActive: boolean;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
}

const { hasFeature, getLimit } = useSubscription();
```

## Components

### Protected

Conditionally renders content based on permissions.

```tsx
interface ProtectedProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRole?: string;
  requireAll?: boolean;        // Default: true
  fallback?: React.ReactNode;
  onUnauthorized?: () => void;
}

<Protected
  requiredPermissions={['users:read', 'users:write']}
  requireAll={true}
  fallback={<div>Access denied</div>}
>
  <AdminPanel />
</Protected>
```

### LoginForm

Pre-built login form with email/phone + password authentication, password toggle, and optional Magic Link / Signup / Forgot Password links.

See [README Component Reference](../README.md#loginform) for the full `LoginFormCopy`, `LoginFormStyles`, and `LoginFormIcons` tables.

```tsx
interface LoginFormProps {
  copy?: LoginFormCopy;
  styles?: LoginFormStyles;
  icons?: LoginFormIcons;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  onForgotPassword?: () => void;
  onSignupClick?: () => void;
  onMagicLinkClick?: () => void;
  showForgotPassword?: boolean;   // Default: true
  showSignupLink?: boolean;       // Default: true
  showMagicLinkOption?: boolean;  // Default: false
  className?: string;
}
```

### SignupForm

Pre-built signup form with email/phone, name, password, and optional tenant creation.

See [README Component Reference](../README.md#signupform) for the full `SignupFormCopy` and `SignupFormStyles` tables.

```tsx
interface SignupFormProps {
  copy?: SignupFormCopy;
  styles?: SignupFormStyles;
  signupType?: 'user' | 'tenant';  // Default: 'user'
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  onLoginClick?: () => void;
  onMagicLinkClick?: () => void;
  showLoginLink?: boolean;         // Default: true
  showMagicLinkOption?: boolean;   // Default: false
  className?: string;
}
```

### MagicLinkForm

Passwordless Magic Link send form for both new and existing users.

See [README Component Reference](../README.md#magiclinkform) for the full `MagicLinkFormCopy` and `MagicLinkFormStyles` tables.

```tsx
interface MagicLinkFormProps {
  copy?: MagicLinkFormCopy;
  styles?: MagicLinkFormStyles;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  onLoginClick?: () => void;
  onSignupClick?: () => void;
  showTraditionalLinks?: boolean;  // Default: true
  className?: string;
  verifyToken?: string;            // Auto-verify if provided
  frontendUrl?: string;            // Default: window.location.origin
}
```

### MagicLinkVerify

Automatic Magic Link verification component. Reads token/email/appId/tenantSlug from URL params or accepts them as props.

See [README Component Reference](../README.md#magiclinkverify) for the full `MagicLinkVerifyCopy`, `MagicLinkVerifyStyles`, and `MagicLinkVerifyIcons` tables.

```tsx
interface MagicLinkVerifyProps {
  copy?: MagicLinkVerifyCopy;
  styles?: MagicLinkVerifyStyles;
  icons?: MagicLinkVerifyIcons;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  onRetry?: () => void;
  onBackToLogin?: () => void;
  className?: string;
  token?: string;
  email?: string;
  appId?: string;
  tenantSlug?: string;
  autoRedirectDelay?: number;  // Default: 3000ms
}
```

### PasswordRecoveryForm

Password reset flow with two modes: request (send email) and reset (set new password).

See [README Component Reference](../README.md#passwordrecoveryform) for the full `PasswordRecoveryFormCopy` and `PasswordRecoveryFormStyles` tables.

```tsx
interface PasswordRecoveryFormProps {
  copy?: PasswordRecoveryFormCopy;
  styles?: PasswordRecoveryFormStyles;
  mode?: 'request' | 'reset';     // Default: 'request'
  token?: string;
  onSuccess?: (data?: any) => void;
  onError?: (error: string) => void;
  onBackToLogin?: () => void;
  onModeChange?: (mode: 'request' | 'reset') => void;
  className?: string;
}
```

### TenantSelector

Dropdown component for switching between user's tenant memberships.

See [README Component Reference](../README.md#tenantselector) for the full `TenantSelectorStyles` table.

```tsx
interface TenantSelectorProps {
  tenants?: UserTenantMembership[];
  currentTenantId?: string | null;
  onSelect?: (tenantId: string) => void;
  styles?: TenantSelectorStyles;
  className?: string;
  dropdownClassName?: string;
  itemClassName?: string;
  renderItem?: (tenant: UserTenantMembership, isSelected: boolean) => React.ReactNode;
  placeholder?: string;           // Default: 'Select tenant'
  disabled?: boolean;             // Default: false
  showCurrentTenant?: boolean;    // Default: true
}
```

### FeatureFlag

Conditionally renders content based on feature flags.

```tsx
interface FeatureFlagProps {
  flag: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

<FeatureFlag flag="new-dashboard" fallback={<OldDashboard />}>
  <NewDashboard />
</FeatureFlag>
```

## Services

### SessionManager

Manages user session and token storage.

```tsx
class SessionManager {
  // User Management
  getUser(): User | null;
  setUser(user: User): void;
  clearUser(): void;

  // Token Management
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setTokens(tokens: TokenSet): void;
  clearTokens(): void;
  isTokenExpired(): boolean;

  // Session Management
  hasValidSession(): boolean;
  clearSession(): void;
  refreshToken(): Promise<void>;
}
```

### HttpService

HTTP client with authentication and error handling.

```tsx
class HttpService {
  constructor(baseUrl: string, sessionManager?: SessionManager);

  // HTTP Methods
  get<T>(endpoint: string, options?: RequestOptions): Promise<T>;
  post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T>;
  put<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T>;
  delete<T>(endpoint: string, options?: RequestOptions): Promise<T>;
  patch<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T>;

  // Configuration
  setAuthToken(token: string): void;
  clearAuthToken(): void;
  setTimeout(timeout: number): void;
}
```

### AuthApiService

Authentication-specific API methods.

```tsx
class AuthApiService {
  constructor(httpService: HttpService);

  // Authentication
  login(email: string, password: string, tenantId: string): Promise<LoginResponse>;
  signup(email: string, name: string, password: string, tenantId: string): Promise<SignupResponse>;
  logout(): Promise<void>;
  refreshToken(refreshToken: string): Promise<TokenResponse>;

  // Password Management
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  requestPasswordReset(email: string, tenantId: string): Promise<void>;
  confirmPasswordReset(token: string, newPassword: string): Promise<void>;

  // User Management
  getCurrentUser(): Promise<User>;
  updateProfile(data: Partial<User>): Promise<User>;
}
```

## Types

### Core Types

```tsx
interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
}

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface Subscription {
  id: string;
  plan: string;
  status: 'active' | 'inactive' | 'cancelled';
  features: string[];
  limits: Record<string, number>;
  expiresAt?: string;
}
```

### API Response Types

```tsx
interface LoginResponse {
  user: User;
  tokens: TokenSet;
  roles: Role[];
}

interface SignupResponse {
  user: User;
  tokens: TokenSet;
  message: string;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface ApiError {
  message: string;
  code: string;
  details?: any;
}
```

### Configuration Types

```tsx
type TenantMode = 'subdomain' | 'path' | 'header';

interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

interface AuthError extends Error {
  code: string;
  status?: number;
}
```

## Utilities

### Permission Utilities

```tsx
// Check permission format
function isValidPermission(permission: string): boolean;

// Parse permission string
function parsePermission(permission: string): { resource: string; action: string };

// Format permission
function formatPermission(resource: string, action: string): string;

// Check permission hierarchy
function hasPermissionHierarchy(userPermissions: string[], requiredPermission: string): boolean;
```

### Token Utilities

```tsx
// Decode JWT token
function decodeToken(token: string): any;

// Check if token is expired
function isTokenExpired(token: string): boolean;

// Get token expiration time
function getTokenExpiration(token: string): number;

// Refresh token if needed
function refreshTokenIfNeeded(sessionManager: SessionManager): Promise<void>;
```

### Validation Utilities

```tsx
// Validate email format
function isValidEmail(email: string): boolean;

// Validate password strength
function validatePassword(password: string): { valid: boolean; errors: string[] };

// Validate tenant ID format
function isValidTenantId(tenantId: string): boolean;
```

## Error Codes

### Authentication Errors

- `AUTH_INVALID_CREDENTIALS` - Invalid email/password
- `AUTH_USER_NOT_FOUND` - User does not exist
- `AUTH_ACCOUNT_LOCKED` - Account is locked
- `AUTH_TOKEN_EXPIRED` - Access token expired
- `AUTH_TOKEN_INVALID` - Invalid token format
- `AUTH_REFRESH_FAILED` - Token refresh failed

### Permission Errors

- `PERM_ACCESS_DENIED` - Insufficient permissions
- `PERM_ROLE_REQUIRED` - Specific role required
- `PERM_INVALID_PERMISSION` - Invalid permission format

### Subscription Errors

- `SUB_FEATURE_NOT_AVAILABLE` - Feature not in subscription
- `SUB_LIMIT_EXCEEDED` - Usage limit exceeded
- `SUB_INACTIVE` - Subscription inactive

### Network Errors

- `NET_CONNECTION_ERROR` - Network connection failed
- `NET_TIMEOUT` - Request timeout
- `NET_SERVER_ERROR` - Server error (5xx)
- `NET_CLIENT_ERROR` - Client error (4xx)

## Constants

```tsx
// Default configuration values
export const DEFAULT_CONFIG = {
  API_TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  TOKEN_REFRESH_THRESHOLD: 300000, // 5 minutes
};

// Permission wildcards
export const PERMISSION_WILDCARDS = {
  ALL_ACTIONS: '*',
  ALL_RESOURCES: '*:*',
};

// Storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_DATA: 'userData',
  FEATURE_FLAGS: 'featureFlags',
};
```
