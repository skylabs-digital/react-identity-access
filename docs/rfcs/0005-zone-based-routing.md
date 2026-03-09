# RFC-005: Zone-Based Routing System

## Summary

Redesign the multi-tenant routing system to use a zone-based approach with centralized configuration. This eliminates repetitive `fallback` and `redirectTo` props, provides intelligent redirect logic based on user state, and simplifies route protection across the application.

## Motivation

### Current Problems

1. **Repetitive Configuration**: Every route component (`TenantRoute`, `LandingRoute`, `ProtectedRoute`) requires `fallback` and `redirectTo` props, leading to duplication across the app.

2. **Inconsistent Naming**: Current components are confusingly named:
   - `TenantRoute` - requires tenant context
   - `LandingRoute` - requires NO tenant context (inverse of TenantRoute)
   - `ProtectedRoute` - requires authentication

3. **No Smart Redirects**: When a user lands in the wrong zone, the redirect is static. There's no logic to determine the best destination based on the user's current state.

4. **Limited Zone Definitions**: Current system doesn't account for user types (USER vs TENANT_ADMIN) which are critical in multi-tenant apps.

5. **No Centralized Configuration**: Each component is configured independently, making it hard to maintain consistent behavior.

## Proposed Solution

### Zone Taxonomy

Define clear zones based on two axes:
- **Tenant Context**: `public` (no tenant) vs `tenant` (tenant required) vs `any` (both allowed)
- **Auth State**: `guest` (not authenticated) vs `authenticated` (any auth user) vs `user` (USER type) vs `admin` (TENANT_ADMIN type) vs `any` (both allowed)

This creates the following zone matrix:

| Zone Name | Tenant Context | Auth State | Description |
|-----------|---------------|------------|-------------|
| `public.guest` | No tenant | Guest only | Landing pages, marketing |
| `public.any` | No tenant | Any | Public content visible to all |
| `public.authenticated` | No tenant | Authenticated | Tenant selection after login |
| `tenant.guest` | Tenant | Guest only | Login page |
| `tenant.any` | Tenant | Any | Public tenant content |
| `tenant.authenticated` | Tenant | Authenticated | Requires login |
| `tenant.user` | Tenant | USER only | User-specific features |
| `tenant.admin` | Tenant | TENANT_ADMIN | Admin panel |
| `any.any` | Any | Any | Fully open routes |

### Access Modes

Las zonas pueden tener diferentes modos de acceso:

```typescript
type AccessMode = 
  | 'required'    // Must match (redirect if not)
  | 'forbidden'   // Must NOT match (redirect if matches)
  | 'optional';   // Can be either (no redirect, just render)
```

Ejemplo de comportamiento:
- `requireAuth: 'required'` → Solo usuarios autenticados, guests son redirigidos
- `requireAuth: 'forbidden'` → Solo guests, usuarios autenticados son redirigidos
- `requireAuth: 'optional'` → Ambos pueden acceder, sin redirección

### Zone Roots Configuration

Centralized configuration in `AuthConfig` for default redirect paths:

```typescript
interface ZoneRoots {
  // Public zones (no tenant)
  publicGuest?: string;      // Default: '/'
  publicUser?: string;       // Default: '/account'
  publicAdmin?: string;      // Default: '/admin'
  
  // Tenant zones
  tenantGuest?: string;      // Default: '/login'
  tenantUser?: string;       // Default: '/dashboard'
  tenantAdmin?: string;      // Default: '/admin/dashboard'
  
  // Fallback for undefined zones
  default?: string;          // Default: '/'
}

// Predefined zone configurations for common use cases
interface ZonePresets {
  // Public/Landing zones
  landing: { tenant: 'forbidden', auth: 'optional' };
  publicOnly: { tenant: 'forbidden', auth: 'forbidden' };
  
  // Auth zones
  login: { tenant: 'required', auth: 'forbidden' };
  guest: { auth: 'forbidden' };
  authenticated: { auth: 'required' };
  
  // Tenant zones
  tenant: { tenant: 'required' };
  tenantOpen: { tenant: 'required', auth: 'optional' };
  tenantAuth: { tenant: 'required', auth: 'required' };
  
  // User type zones
  user: { tenant: 'required', auth: 'required', userType: 'USER' };
  admin: { tenant: 'required', auth: 'required', userType: 'TENANT_ADMIN' };
  
  // Fully open
  open: { tenant: 'optional', auth: 'optional' };
}

interface RoutingConfig {
  zoneRoots?: ZoneRoots;
  presets?: Partial<ZonePresets>;  // Override or extend default presets
  
  // Global fallbacks
  loadingFallback?: ReactNode;       // Shown while checking access
  accessDeniedFallback?: ReactNode;  // Shown when access denied before redirect
  
  // Global callbacks
  onAccessDenied?: (reason: AccessDeniedReason) => void;  // Global handler for analytics
  
  // Return URL configuration
  returnToParam?: string;            // Query param name for return URL (default: 'returnTo')
  returnToStorage?: 'url' | 'session' | 'local';  // Where to store return URL (default: 'url')
}
```

### New Route Components

Replace the three existing components with a unified `ZoneRoute` component:

```typescript
type AccessMode = 'required' | 'forbidden' | 'optional';

// Reason object passed to callbacks when access is denied
interface AccessDeniedReason {
  type: 'no_tenant' | 'has_tenant' | 'not_authenticated' | 'already_authenticated' | 'wrong_user_type' | 'missing_permissions';
  required?: {
    tenant?: AccessMode;
    auth?: AccessMode;
    userType?: UserType | UserType[];
    permissions?: string[];
  };
  current?: {
    hasTenant: boolean;
    isAuthenticated: boolean;
    userType?: UserType;
    permissions?: string[];
  };
  redirectTo: string;
}

interface ZoneRouteProps {
  children: ReactNode;
  
  // Preset (shorthand for common configurations)
  preset?: keyof ZonePresets;     // Use a predefined zone configuration
  
  // Zone requirements with access modes
  tenant?: AccessMode;            // 'required' = must have tenant, 'forbidden' = no tenant, 'optional' = any
  auth?: AccessMode;              // 'required' = must be authenticated, 'forbidden' = guest only, 'optional' = any
  
  // User type requirements (only applies when auth='required')
  userType?: UserType | UserType[];  // Single type or array of allowed types
  
  // Permission requirements (existing)
  requiredPermissions?: (string | Permission)[];
  requireAllPermissions?: boolean;
  
  // Return URL handling
  returnTo?: boolean | string;    // true = save current path, string = custom return path
  
  // Callbacks
  onAccessDenied?: (reason: AccessDeniedReason) => void;  // Called when access is denied (for analytics/logging)
  
  // Fallback states (override global config)
  redirectTo?: string;            // Override automatic redirect destination
  loadingFallback?: ReactNode;    // Shown while checking access (default: global fallback)
  accessDeniedFallback?: ReactNode;  // Shown when access denied before redirect (default: global fallback)
}
```

**Access Mode Behavior:**

| Mode | Condition Met | Condition NOT Met |
|------|--------------|-------------------|
| `required` | ✅ Render children | ❌ Redirect to appropriate zone |
| `forbidden` | ❌ Redirect to appropriate zone | ✅ Render children |
| `optional` | ✅ Render children | ✅ Render children |

**User Type Matching:**

| `userType` prop | USER accede | TENANT_ADMIN accede |
|-----------------|-------------|---------------------|
| `undefined` | ✅ | ✅ |
| `'USER'` | ✅ | ❌ |
| `'TENANT_ADMIN'` | ❌ | ✅ |
| `['USER', 'TENANT_ADMIN']` | ✅ | ✅ |

### Return URL Flow

The `returnTo` prop enables the classic "login then return" pattern:

```tsx
// 1. User tries to access /admin/settings (protected)
<ZoneRoute preset="admin" returnTo>
  <AdminSettings />
</ZoneRoute>

// 2. User is redirected to /login?returnTo=/admin/settings

// 3. After login, use the returnTo param to redirect back
const { returnToUrl, clearReturnTo } = useZoneNavigation();

const handleLogin = async () => {
  await login(credentials);
  const destination = returnToUrl || '/dashboard';
  clearReturnTo();
  navigate(destination);
};
```

**returnTo Storage Options:**

| Storage | Pros | Cons |
|---------|------|------|
| `'url'` (default) | Shareable, survives refresh | Visible in URL, limited length |
| `'session'` | Hidden, survives refresh | Lost on new tab |
| `'local'` | Hidden, persists across tabs | Needs manual cleanup |

### onAccessDenied Callback

For analytics, logging, or custom handling:

```tsx
// Per-route callback
<ZoneRoute 
  preset="admin"
  onAccessDenied={(reason) => {
    analytics.track('access_denied', {
      type: reason.type,
      path: location.pathname,
      userType: reason.current?.userType,
    });
  }}
>
  <AdminPanel />
</ZoneRoute>

// Global callback in config (for all routes)
<AuthProvider config={{
  routing: {
    onAccessDenied: (reason) => {
      logger.warn('Access denied', reason);
      if (reason.type === 'not_authenticated') {
        showToast('Please log in to continue');
      }
    }
  }
}}>
```

**AccessDeniedReason Types:**

| Type | Description |
|------|-------------|
| `no_tenant` | Route requires tenant, user has none |
| `has_tenant` | Route forbids tenant, user has one |
| `not_authenticated` | Route requires auth, user is guest |
| `already_authenticated` | Route forbids auth (guest-only), user is logged in |
| `wrong_user_type` | User type doesn't match required |
| `missing_permissions` | User lacks required permissions |

### Loading & Access Denied States

```tsx
// Global configuration
<AuthProvider config={{
  routing: {
    loadingFallback: <FullPageSpinner />,
    accessDeniedFallback: <AccessDeniedPage />,
  }
}}>

// Per-route override
<ZoneRoute 
  preset="admin"
  loadingFallback={<AdminSkeleton />}
  accessDeniedFallback={
    <div>
      <h1>Admin Access Required</h1>
      <p>Contact your administrator for access.</p>
    </div>
  }
>
  <AdminPanel />
</ZoneRoute>
```

### Using Presets

Presets simplify common zone configurations:

```tsx
// Instead of this:
<ZoneRoute tenant="required" auth="required" userType="TENANT_ADMIN">
  <AdminPanel />
</ZoneRoute>

// Use this:
<ZoneRoute preset="admin">
  <AdminPanel />
</ZoneRoute>

// Presets can be combined with overrides:
<ZoneRoute preset="admin" returnTo onAccessDenied={handleDenied}>
  <AdminPanel />
</ZoneRoute>

// Custom presets in config:
<AuthProvider config={{
  routing: {
    presets: {
      superAdmin: { tenant: 'required', auth: 'required', userType: 'SUPER_ADMIN' },
      billing: { tenant: 'required', auth: 'required', requiredPermissions: ['billing:read'] },
    }
  }
}}>
```

### Convenience Components

For backward compatibility and ease of use, provide convenience wrappers:

```typescript
// Replaces TenantRoute - requires tenant context
export const TenantZone: FC<ZoneRouteProps> = (props) => (
  <ZoneRoute tenant="required" {...props} />
);

// Replaces LandingRoute - no tenant allowed
export const PublicZone: FC<ZoneRouteProps> = (props) => (
  <ZoneRoute tenant="forbidden" {...props} />
);

// Replaces ProtectedRoute - requires authentication
export const AuthenticatedZone: FC<ZoneRouteProps> = (props) => (
  <ZoneRoute auth="required" {...props} />
);

// Guest-only zone (e.g., login page that redirects if authenticated)
export const GuestZone: FC<ZoneRouteProps> = (props) => (
  <ZoneRoute auth="forbidden" {...props} />
);

// Admin-only zone (TENANT_ADMIN)
export const AdminZone: FC<ZoneRouteProps> = (props) => (
  <ZoneRoute auth="required" userType="TENANT_ADMIN" {...props} />
);

// User-only zone (USER, not TENANT_ADMIN)
export const UserZone: FC<ZoneRouteProps> = (props) => (
  <ZoneRoute auth="required" userType="USER" {...props} />
);

// NEW: Open zone - accessible to both guests and authenticated users
export const OpenZone: FC<ZoneRouteProps> = (props) => (
  <ZoneRoute tenant="optional" auth="optional" {...props} />
);

// Combined: tenant required + auth required
export const TenantAuthenticatedZone: FC<ZoneRouteProps> = (props) => (
  <ZoneRoute tenant="required" auth="required" {...props} />
);

// Combined: tenant required + open to all auth states
export const TenantOpenZone: FC<ZoneRouteProps> = (props) => (
  <ZoneRoute tenant="required" auth="optional" {...props} />
);
```

### Smart Redirect Logic

When a user is in the wrong zone, the system determines the best redirect:

```typescript
function getSmartRedirect(
  currentState: { hasTenant: boolean; isAuth: boolean; userType?: UserType },
  zoneRequirements: { requireTenant?: boolean; requireAuth?: boolean; requiredUserType?: UserType },
  zoneRoots: ZoneRoots
): string {
  const { hasTenant, isAuth, userType } = currentState;
  
  // Determine target zone based on current state
  if (!hasTenant) {
    // User is in public context
    if (!isAuth) return zoneRoots.publicGuest || '/';
    if (userType === 'TENANT_ADMIN') return zoneRoots.publicAdmin || '/admin';
    return zoneRoots.publicUser || '/account';
  } else {
    // User is in tenant context
    if (!isAuth) return zoneRoots.tenantGuest || '/login';
    if (userType === 'TENANT_ADMIN') return zoneRoots.tenantAdmin || '/admin/dashboard';
    return zoneRoots.tenantUser || '/dashboard';
  }
}
```

### Configuration in AuthProvider

```typescript
<AuthProvider
  config={{
    routing: {
      zoneRoots: {
        publicGuest: '/',
        publicUser: '/select-tenant',
        publicAdmin: '/select-tenant',
        tenantGuest: '/login',
        tenantUser: '/dashboard',
        tenantAdmin: '/admin',
      },
      fallback: <LoadingSpinner />,
    },
    // ... other config
  }}
>
```

## Usage Examples

### Before (Current)

```tsx
// App.tsx - lots of repetition
<Route path="/login" element={
  <LandingRoute redirectTo="/dashboard" fallback={<Loading />}>
    <Login />
  </LandingRoute>
} />

<Route path="/dashboard" element={
  <TenantRoute redirectTo="/" fallback={<Loading />}>
    <ProtectedRoute redirectTo="/login" fallback={<Loading />}>
      <Dashboard />
    </ProtectedRoute>
  </TenantRoute>
} />

<Route path="/admin/*" element={
  <TenantRoute redirectTo="/" fallback={<Loading />}>
    <ProtectedRoute 
      redirectTo="/login" 
      requiredUserType="TENANT_ADMIN"
      fallback={<Loading />}
    >
      <AdminPanel />
    </ProtectedRoute>
  </TenantRoute>
} />
```

### After (Proposed)

```tsx
// AuthProvider config - define once
<AuthProvider config={{
  routing: {
    zoneRoots: {
      tenantGuest: '/login',
      tenantUser: '/dashboard',
      tenantAdmin: '/admin',
    },
    fallback: <Loading />,
  }
}}>

// App.tsx - clean and simple
<Route path="/login" element={
  <ZoneRoute tenant="required" auth="forbidden">
    <Login />
  </ZoneRoute>
} />

<Route path="/dashboard" element={
  <TenantAuthenticatedZone>
    <Dashboard />
  </TenantAuthenticatedZone>
} />

<Route path="/admin/*" element={
  <ZoneRoute tenant="required" auth="required" requiredUserType="TENANT_ADMIN">
    <AdminPanel />
  </ZoneRoute>
} />
```

### Mixed Access Examples (NEW)

```tsx
// Public homepage - accessible to everyone, no tenant required
<Route path="/" element={
  <ZoneRoute tenant="forbidden" auth="optional">
    <HomePage />
  </ZoneRoute>
} />

// Pricing page - accessible to guests AND authenticated users
<Route path="/pricing" element={
  <OpenZone>
    <PricingPage />
  </OpenZone>
} />

// Tenant public page - tenant required but no auth needed
<Route path="/about" element={
  <TenantOpenZone>
    <AboutPage />
  </TenantOpenZone>
} />

// Profile - authenticated users, any tenant state
<Route path="/profile" element={
  <ZoneRoute tenant="optional" auth="required">
    <Profile />
  </ZoneRoute>
} />
```

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Add `RoutingConfig` to `AuthConfig` interface
- [ ] Add `ZoneRoots` interface with all zone paths
- [ ] Add `ZonePresets` with default preset configurations
- [ ] Add `AccessDeniedReason` type
- [ ] Expose routing config via AuthContext
- [ ] Implement `getSmartRedirect` utility function

### Phase 2: Return URL System
- [ ] Implement `returnTo` prop logic
- [ ] Add `returnToStorage` configuration (url/session/local)
- [ ] Create `useZoneNavigation` hook with `returnToUrl` and `clearReturnTo`
- [ ] Handle return URL encoding/decoding

### Phase 3: Callbacks & Fallbacks
- [ ] Implement `onAccessDenied` callback (global + per-route)
- [ ] Add `loadingFallback` support (global + per-route)
- [ ] Add `accessDeniedFallback` support (global + per-route)
- [ ] Create default fallback components

### Phase 4: ZoneRoute Component
- [ ] Create `ZoneRoute` base component with all props
- [ ] Implement `AccessMode` logic (required/forbidden/optional)
- [ ] Implement `userType` matching (single and array)
- [ ] Implement `preset` resolution
- [ ] Implement permission checking

### Phase 5: Convenience Components
- [ ] Create `TenantZone`, `PublicZone`, `AuthenticatedZone`
- [ ] Create `GuestZone`, `AdminZone`, `UserZone`
- [ ] Create `OpenZone`, `TenantOpenZone`, `TenantAuthenticatedZone`
- [ ] Add proper TypeScript types and exports

### Phase 6: Migration Support
- [ ] Keep existing components working (deprecated)
- [ ] Add deprecation warnings to old components
- [ ] Update documentation with migration guide

### Phase 7: Testing
- [ ] Unit tests for `getSmartRedirect` logic
- [ ] Unit tests for `AccessMode` combinations
- [ ] Unit tests for `returnTo` flow
- [ ] Unit tests for `onAccessDenied` callback
- [ ] Integration tests for zone components
- [ ] Test all zone/userType combinations
- [ ] Test preset resolution and overrides

## Breaking Changes

None initially - existing components will continue to work but emit deprecation warnings.

## Migration Path

1. Configure `routing` in AuthProvider
2. Replace `TenantRoute` → `TenantZone`
3. Replace `LandingRoute` → `PublicZone`
4. Replace `ProtectedRoute` → `AuthenticatedZone` or specific zone components
5. Remove component-level `fallback` and `redirectTo` where not needed

## Resolved Questions

1. **Zone naming**: Using `public/tenant` for context and `guest/user/admin` for auth state.
   - ✅ Decided: Keep current naming, clear and intuitive.

2. **Non-exclusive zones**: How to handle routes accessible to both guests and authenticated users?
   - ✅ Decided: Use `AccessMode` with `'optional'` value for non-exclusive access.

3. **User type differentiation**: How to differentiate USER vs TENANT_ADMIN?
   - ✅ Decided: `userType` prop accepts single type or array of allowed types.

4. **Loading state handling**: Should zones handle their own loading?
   - ✅ Decided: Support both global fallback and per-route overrides with `loadingFallback` and `accessDeniedFallback`.

5. **Return URL pattern**: How to handle "login then return" flow?
   - ✅ Decided: `returnTo` prop with configurable storage (url/session/local).

## Open Questions

1. **Preset extension**: Should custom presets completely override defaults or merge with them?
   - Recommendation: Complete override for simplicity.

2. **Nested zones**: Should we allow `<TenantZone><AuthenticatedZone>` composition?
   - Recommendation: Allow but log warning suggesting combined component for clarity.

3. **SSR support**: How should zones behave during server-side rendering?
   - Recommendation: Render loading fallback on server, check access on client hydration.

## Alternatives Considered

### A: Higher-Order Component Approach
```tsx
const ProtectedDashboard = withZone({ requireTenant: true, requireAuth: true })(Dashboard);
```
Rejected: Less readable, harder to configure per-route.

### B: Route Config Object
```tsx
const routes = [
  { path: '/dashboard', component: Dashboard, zone: { tenant: true, auth: true } }
];
```
Rejected: Breaks from React Router patterns, requires custom router setup.

### C: Keep Separate Components
Improve existing components without unification.
Rejected: Doesn't solve the repetition problem or smart redirect logic.

## References

- RFC-001: Post-Login Tenant Switch
- RFC-004: Multi-Tenant User Membership
- React Router documentation
