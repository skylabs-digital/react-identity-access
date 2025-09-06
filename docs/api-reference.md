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

Root provider that configures the application context.

```tsx
interface AppConfig {
  baseUrl: string;           // Backend API URL
  appId: string;            // Application identifier
  tenantMode: 'subdomain' | 'path' | 'header';
  selectorParam: string;    // Tenant selector parameter
  apiTimeout?: number;      // Request timeout (default: 30000ms)
  retryAttempts?: number;   // Retry attempts (default: 3)
}

interface AppProviderProps {
  config: AppConfig;
  children: React.ReactNode;
}

<AppProvider config={appConfig}>
  {children}
</AppProvider>
```

### AuthProvider

Handles authentication and session management.

```tsx
interface AuthConfig {
  onRefreshFailed?: () => void;  // Callback when token refresh fails
  initialRoles?: Role[];         // SSR role injection
}

interface AuthProviderProps {
  config?: AuthConfig;
  children: React.ReactNode;
}

<AuthProvider config={authConfig}>
  {children}
</AuthProvider>
```

### FeatureFlagProvider

Manages feature flags for the application.

```tsx
interface FeatureFlagProviderProps {
  children: React.ReactNode;
}

<FeatureFlagProvider>
  {children}
</FeatureFlagProvider>
```

### SubscriptionProvider

Handles billing and subscription management.

```tsx
interface SubscriptionProviderProps {
  children: React.ReactNode;
}

<SubscriptionProvider>
  {children}
</SubscriptionProvider>
```

## Hooks

### useAuth

Primary authentication hook providing access to auth state and methods.

```tsx
interface AuthContextValue {
  // Session Management
  sessionManager: SessionManager;
  hasValidSession: () => boolean;
  setTokens: (tokens: TokenSet) => void;
  clearSession: () => void;

  // Authentication Methods
  login: (email: string, password: string, tenantId: string) => Promise<any>;
  signup: (email: string, name: string, password: string, tenantId: string) => Promise<any>;
  signupTenantAdmin: (email: string, name: string, password: string, tenantName: string) => Promise<any>;
  logout: () => void;
  
  // Password Management
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  requestPasswordReset: (email: string, tenantId: string) => Promise<void>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<void>;
  refreshToken: () => Promise<void>;

  // Role and Permission Management
  userRole: Role | null;
  userPermissions: Permission[];
  availableRoles: Role[];
  rolesLoading: boolean;
  hasPermission: (permission: string | Permission) => boolean;
  hasAnyPermission: (permissions: (string | Permission)[]) => boolean;
  hasAllPermissions: (permissions: (string | Permission)[]) => boolean;
  getUserPermissionStrings: () => string[];
  refreshRoles: () => Promise<void>;

  // HTTP Service
  authenticatedHttpService: HttpService;
}

const auth = useAuth();
```

#### Methods

**login(email, password, tenantId)**
- Authenticates user with email/password
- Returns: `Promise<LoginResponse>`
- Throws: `AuthError` on failure

**signup(email, name, password, tenantId)**
- Creates new user account
- Returns: `Promise<SignupResponse>`
- Throws: `AuthError` on failure

**logout()**
- Clears session and redirects to login
- Returns: `void`

**hasPermission(permission)**
- Checks if user has specific permission
- Parameters: `string | Permission`
- Returns: `boolean`

**hasAnyPermission(permissions)**
- Checks if user has any of the specified permissions
- Parameters: `(string | Permission)[]`
- Returns: `boolean`

**hasAllPermissions(permissions)**
- Checks if user has all specified permissions
- Parameters: `(string | Permission)[]`
- Returns: `boolean`

### useApp

Provides access to application configuration and context.

```tsx
interface AppContextValue {
  appId: string;
  tenantSlug: string;
  baseUrl: string;
  config: AppConfig;
}

const app = useApp();
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

const featureFlags = useFeatureFlag();
```

#### Methods

**isEnabled(flagName)**
- Checks if feature flag is enabled
- Parameters: `string`
- Returns: `boolean`

**getValue(flagName, defaultValue)**
- Gets feature flag value with fallback
- Parameters: `string, T`
- Returns: `T`

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

const subscription = useSubscription();
```

#### Methods

**hasFeature(feature)**
- Checks if subscription includes feature
- Parameters: `string`
- Returns: `boolean`

**getLimit(limitName, defaultValue)**
- Gets subscription limit value
- Parameters: `string, number`
- Returns: `number`

## Components

### Protected

Conditionally renders content based on permissions.

```tsx
interface ProtectedProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRole?: string;
  requireAll?: boolean;
  fallback?: React.ReactNode;
  onUnauthorized?: () => void;
}

<Protected
  requiredPermissions={['users:read', 'users:write']}
  requireAll={true}
  fallback={<div>Access denied</div>}
  onUnauthorized={() => console.log('Unauthorized access attempt')}
>
  <AdminPanel />
</Protected>
```

#### Props

- **requiredPermissions**: Array of required permissions
- **requiredRole**: Required user role
- **requireAll**: Whether all permissions are required (default: true)
- **fallback**: Component to render when access is denied
- **onUnauthorized**: Callback when access is denied

### LoginForm

Pre-built login form component.

```tsx
interface LoginFormProps {
  onSuccess?: (user: User) => void;
  onError?: (error: Error) => void;
  className?: string;
  showSignupLink?: boolean;
  showForgotPassword?: boolean;
}

<LoginForm
  onSuccess={(user) => navigate('/dashboard')}
  onError={(error) => setError(error.message)}
  showSignupLink={true}
  showForgotPassword={true}
/>
```

### PasswordRecoveryForm

Pre-built password recovery form.

```tsx
interface PasswordRecoveryFormProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

<PasswordRecoveryForm
  onSuccess={() => setMessage('Reset email sent')}
  onError={(error) => setError(error.message)}
/>
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
