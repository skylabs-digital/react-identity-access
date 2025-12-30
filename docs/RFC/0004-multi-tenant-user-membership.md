# RFC 0004: Multi-Tenant User Membership

**Status:** Draft  
**Author:** Cascade  
**Created:** 2024-12-29  
**Updated:** 2024-12-29

## Summary

Adapt the library to support the new multi-tenant authentication architecture where users can belong to multiple tenants. This RFC addresses changes required to support:

1. **Dual login modes** - with or without tenant context
2. **Tenant switching** via new `/auth/switch-tenant` endpoint
3. **User tenant membership** - listing and managing tenants a user belongs to
4. **Dual token strategy** - global tokens vs tenant-scoped tokens

## Problem Statement

The backend has implemented a new authentication strategy that provides flexibility for both single-tenant and multi-tenant applications:

### Current Implementation
- Login requires `tenantId` or defaults to current tenant context
- User is always associated with a single tenant at login time
- `accessToken` always contains `tenantId` and `role`
- Switching tenants requires re-authentication

### New Implementation (IDACHU Multi-Tenant)

**Two modes of operation:**

#### Mode 1: Login Global (sin tenantId)
- Login returns **global token** (no tenant context) + list of available tenants
- User can operate without tenant (view profile, list tenants)
- Requires `switch-tenant` to get tenant-scoped token
- Ideal for multi-tenant apps where user selects tenant

#### Mode 2: Login Directo (con tenantId)
- Login with `tenantId` returns **tenant-scoped token** directly
- Same behavior as before - one request, full context
- Ideal for single-tenant apps or when tenant is known

**Key improvements:**
- Same `refreshToken` allows switching between any user's tenants without re-auth
- User can belong to multiple tenants with different roles
- `LoginResponse` now includes list of user's tenants

## Impact Analysis

### Breaking Changes

| Component | Current | New | Breaking? |
|-----------|---------|-----|-----------|
| `LoginResponse.user.tenantId` | Always present | `null` if login sin tenantId | ⚠️ Conditional |
| `LoginResponse.user.role` | Always present | `null` if login sin tenantId | ⚠️ Conditional |
| `LoginRequest.tenantId` | Optional | Still optional (dual behavior) | ✅ Compatible |
| `LoginResponse.tenants` | Not present | New: list of user's tenants | ✅ Addition |

> **Importante**: Si la app siempre envía `tenantId` en login (comportamiento actual), NO hay breaking changes. Los campos son nullable solo cuando se usa el nuevo flujo global.

### New Types Required

```typescript
// New: Tenant membership info returned from login
interface UserTenantMembership {
  id: string;           // Tenant ID
  name: string;         // Tenant name
  subdomain: string;    // Tenant subdomain
  role: string | null;  // User's role in this tenant
}

// Updated: Login response now includes tenants list
interface LoginResponse {
  accessToken: string;      // Global OR tenant-scoped (depends on request)
  refreshToken: string;     // Valid for switch-tenant calls
  expiresIn: number;
  user: User;               // User with/without tenant context
  tenants: UserTenantMembership[];  // NEW: Always included - user's available tenants
}

// New: Switch tenant request
interface SwitchTenantRequest {
  refreshToken: string;
  tenantId: string;
}

// New: Switch tenant response  
interface SwitchTenantResponse {
  accessToken: string;      // Tenant-scoped token
  expiresIn: number;
  user: User;               // User WITH tenantId and role
}

// Updated: User type - tenantId/role nullable for global context
interface User {
  id: string;
  email?: string;
  phoneNumber?: string;
  name: string;
  lastName?: string;
  isActive: boolean;
  userType: UserType;
  tenantId: string | null;  // null if global login, present if login with tenantId
  role?: string | null;     // null if global login, present if login with tenantId
  roleId: string | null;
  appId: string;
  createdAt: string;
  updatedAt: string;
}
```

### AuthProvider Changes

#### New State

```typescript
// Current user's available tenants (from login)
const [userTenants, setUserTenants] = useState<UserTenantMembership[]>([]);

// Whether user has tenant context (vs global)
const [hasTenantContext, setHasTenantContext] = useState<boolean>(false);

// Global access token (no tenant context)
const [globalAccessToken, setGlobalAccessToken] = useState<string | null>(null);
```

#### New Methods

```typescript
interface AuthContextValue {
  // ... existing methods ...
  
  // New: List of tenants user belongs to
  userTenants: UserTenantMembership[];
  
  // New: Whether current session has tenant context
  hasTenantContext: boolean;
  
  // New: Switch to a different tenant (no re-auth needed)
  switchToTenant: (tenantId: string, options?: {
    redirectPath?: string;
  }) => Promise<void>;
  
  // New: Get tenants from backend (refresh list)
  refreshUserTenants: () => Promise<UserTenantMembership[]>;
}
```

#### Updated Login Flow

```typescript
const login = async (params: LoginParams): Promise<LoginResponse> => {
  const { username, password, tenantSlug, redirectPath } = params;
  
  // Resolve tenantId if tenantSlug provided (existing behavior)
  let resolvedTenantId: string | undefined;
  if (tenantSlug) {
    const tenantApi = new TenantApiService(httpService, appId);
    const tenantInfo = await tenantApi.getPublicTenantInfo(tenantSlug);
    resolvedTenantId = tenantInfo.id;
  }
  
  const loginResponse = await authApiService.login({
    username,
    password,
    appId,
    tenantId: resolvedTenantId, // Optional - dual behavior
  });
  
  // Store tokens
  sessionManager.setTokens({
    accessToken: loginResponse.accessToken,
    refreshToken: loginResponse.refreshToken,
    expiresIn: loginResponse.expiresIn,
  });
  
  // Store user
  setCurrentUser(loginResponse.user);
  
  // Store available tenants (NEW - always present)
  setUserTenants(loginResponse.tenants);
  
  // Determine if we have tenant context
  const hasTenant = loginResponse.user.tenantId !== null;
  setHasTenantContext(hasTenant);
  
  // If login was global (no tenantId), handle tenant selection
  if (!hasTenant) {
    if (loginResponse.tenants.length === 1) {
      // Auto-switch to only tenant
      await switchToTenant(loginResponse.tenants[0].id, { redirectPath });
    } else if (loginResponse.tenants.length > 1) {
      // User needs to select a tenant - trigger callback
      config.onTenantSelectionRequired?.(loginResponse.tenants);
    }
  } else if (tenantSlug && redirectPath) {
    // Login was direct with tenant, handle redirect if needed
    // (existing switch behavior for cross-subdomain)
  }
  
  return loginResponse;
};
```

> **Compatibilidad**: Si la app pasa `tenantSlug` (comportamiento actual), el login funciona igual que antes. La lista de `tenants` es un bonus que puede ignorarse.

#### New Switch Tenant Method

```typescript
const switchToTenant = async (
  tenantId: string,
  options?: { redirectPath?: string }
): Promise<void> => {
  const { redirectPath } = options || {};
  
  // Get refresh token from session
  const refreshToken = sessionManager.getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  // Call switch-tenant endpoint
  const response = await authApiService.switchTenant({
    refreshToken,
    tenantId,
  });
  
  // Update access token with tenant-scoped one
  sessionManager.setAccessToken(response.accessToken);
  
  // Update user with tenant context
  setCurrentUser(response.user);
  setHasTenantContext(true);
  
  // Find target tenant info
  const targetTenant = userTenants.find(t => t.id === tenantId);
  
  if (targetTenant) {
    // Use TenantProvider's switchTenant for URL handling
    switchTenant(targetTenant.subdomain, {
      tokens: {
        accessToken: response.accessToken,
        refreshToken,
        expiresIn: response.expiresIn,
      },
      redirectPath,
    });
  }
};
```

### AuthApiService Changes

```typescript
export class AuthApiService {
  // ... existing methods ...
  
  // New: Switch tenant endpoint
  async switchTenant(request: SwitchTenantRequest): Promise<SwitchTenantResponse> {
    // Note: No Authorization header needed - uses refreshToken in body
    const response = await this.httpService.post<SwitchTenantResponse>(
      '/auth/switch-tenant',
      request
    );
    return response;
  }
  
  // New: Get user's tenants (for refresh)
  async getUserTenants(): Promise<UserTenantMembership[]> {
    const response = await this.httpService.get<UserTenantMembership[]>(
      '/auth/tenants'
    );
    return response;
  }
}
```

### SessionManager Changes

```typescript
interface TokenStorage {
  // Existing
  accessToken: string;      // Currently active token (global or tenant)
  refreshToken: string;     // From login, used for switch-tenant
  expiresIn: number;
  
  // New
  globalAccessToken?: string;    // Preserved global token
  currentTenantId?: string;      // Currently selected tenant
}
```

### TenantProvider Integration

The existing `switchTenant` method in TenantProvider handles URL changes (subdomain/selector mode). The new `AuthProvider.switchToTenant` should:

1. Call `/auth/switch-tenant` to get tenant-scoped token
2. Call `TenantProvider.switchTenant` for URL navigation with tokens

## Migration Strategy

### Phase 1: Backward Compatibility (Non-Breaking) ✅

**No breaking changes for existing apps** that pass `tenantSlug` to login.

1. Update `User` type to allow `tenantId: string | null`
2. Add `tenants: UserTenantMembership[]` to `LoginResponse` (always present)
3. Add `switchTenant` method to `AuthApiService`
4. Add `userTenants` state to `AuthProvider`
5. Existing login with `tenantSlug` continues to work identically

### Phase 2: New Features

1. Add `switchToTenant` method to `AuthProvider`
2. Add `hasTenantContext` state
3. Add `onTenantSelectionRequired` callback config
4. Add auto-switch for single-tenant users (when no tenantId in login)

### Phase 3: Optional Adoption

Apps can **optionally** adopt the new global login flow:
1. Remove `tenantSlug` from login call
2. Implement tenant selector UI
3. Use `switchToTenant` for tenant selection

> **Note**: `LoginParams.tenantSlug` is NOT deprecated - it remains valid for single-tenant apps or apps that know the tenant at login time.

## Configuration

```typescript
interface AuthProviderConfig {
  // ... existing config ...
  
  // New: Behavior when user has multiple tenants
  multiTenantBehavior?: 'auto-first' | 'require-selection' | 'redirect-selector';
  
  // New: Path to redirect for tenant selection
  tenantSelectorPath?: string;
  
  // New: Callback when user needs to select tenant
  onTenantSelectionRequired?: (tenants: UserTenantMembership[]) => void;
}
```

## UI Components (Future)

Consider adding pre-built components:

```typescript
// Tenant selector dropdown
<TenantSelector 
  onSelect={(tenantId) => switchToTenant(tenantId)}
  currentTenantId={currentUser?.tenantId}
/>

// Tenant switcher in navbar
<TenantSwitcher />
```

## Use Cases

### Case 1: Single-Tenant App (Login Directo) - Existing Behavior
```
1. User logs in with tenantSlug → receives tenant-scoped token directly
2. User has full context immediately
3. tenants[] available as bonus (can show "switch tenant" option)
```
> **No changes required** - works exactly as before.

### Case 2: Multi-Tenant App - Global Login
```
1. User logs in WITHOUT tenantSlug → receives global token + N tenants
2. If 1 tenant: Library auto-calls switchToTenant
3. If N tenants: Library triggers onTenantSelectionRequired callback
4. App shows tenant selector
5. User selects → switchToTenant called
6. User lands on selected tenant with full context
```

### Case 3: Tenant Switch (No Re-Auth)
```
1. User is authenticated in Tenant A
2. User clicks "Switch to Tenant B" (from userTenants list)
3. Library calls switchToTenant(tenantBId)
4. New access token received (using same refreshToken)
5. Page redirects to Tenant B subdomain/URL
```

### Case 4: Cross-Subdomain Login (Existing)
```
1. User logs in on tenant-a.app.com with tenantSlug="tenant-b"
2. Login succeeds with tenant-b context
3. Library redirects to tenant-b.app.com with tokens
4. User lands authenticated on tenant-b
```
> **No changes required** - works exactly as before.

## Testing Requirements

### Backward Compatibility (Critical)
1. Login with `tenantSlug` works exactly as before
2. Cross-subdomain login with tokens works as before
3. Existing apps don't break

### New Features
4. Login without `tenantSlug` returns global token + tenants list
5. `switchToTenant` gets new access token and redirects
6. Auto-switch works when user has single tenant
7. `onTenantSelectionRequired` callback triggers for multi-tenant users
8. Refresh token persists across tenant switches
9. Error handling for unauthorized tenant access (403)

## Decisions (Resolved Questions)

1. **Token Refresh**: ✅ No changes needed. The existing `/auth/refresh` process continues to work normally. Refresh maintains whatever context the current token has.

2. **Global Token Preservation**: ✅ Not needed. After `switch-tenant`, we only use the tenant-scoped token. No need to preserve the global token separately.

3. **Tenant Selection UX**: ✅ **Yes** - Add a built-in `<TenantSelector>` component for easy integration.

4. **Offline Tenant List**: ✅ **Yes** - Cache `userTenants` in localStorage for faster initial render and offline access.

## Implementation Checklist

### Phase 1: Types & API (Non-Breaking)

#### Types (`src/types/api.ts`)
- [ ] Add `UserTenantMembership` interface
- [ ] Update `LoginResponse` with `tenants` array (always present)
- [ ] Add `SwitchTenantRequest` interface
- [ ] Add `SwitchTenantResponse` interface
- [ ] Update `User.tenantId` to `string | null`
- [ ] Add `role?: string | null` to User

#### API Service (`src/services/AuthApiService.ts`)
- [ ] Add `switchTenant(request)` method → `POST /auth/switch-tenant`
- [ ] Add `getUserTenants()` method → `GET /auth/tenants`

### Phase 2: AuthProvider Updates

#### State (`src/providers/AuthProvider.tsx`)
- [ ] Add `userTenants: UserTenantMembership[]` state
- [ ] Add `hasTenantContext: boolean` state

#### Methods
- [ ] Add `switchToTenant(tenantId, options?)` method
- [ ] Add `refreshUserTenants()` method
- [ ] Update login to store `userTenants` from response
- [ ] Update login to set `hasTenantContext` based on user.tenantId

#### Config
- [ ] Add `onTenantSelectionRequired` callback option
- [ ] Add `autoSwitchSingleTenant` boolean option (default: true)

### Phase 3: Context & Components

#### AuthContext
- [ ] Expose `userTenants` in context
- [ ] Expose `hasTenantContext` in context
- [ ] Expose `switchToTenant` in context

#### TenantSelector Component (`src/components/TenantSelector.tsx`)
- [ ] Create `<TenantSelector>` component
- [ ] Props: `onSelect`, `currentTenantId`, `tenants` (optional, uses context)
- [ ] Dropdown/list UI with tenant names
- [ ] Show current tenant as selected
- [ ] Customizable styling (className, renderItem)

#### LocalStorage Cache
- [ ] Cache `userTenants` in localStorage on login
- [ ] Load cached tenants on AuthProvider init (for faster render)
- [ ] Clear cache on logout
- [ ] Key format: `userTenants_{userId}` or similar

### Tests

#### Backward Compatibility
- [ ] Login with tenantSlug returns tenant-scoped token
- [ ] Cross-subdomain auth still works
- [ ] Existing apps continue to function

#### New Features
- [ ] Login without tenantSlug returns global token + tenants
- [ ] switchToTenant gets new token and redirects
- [ ] Auto-switch for single tenant
- [ ] onTenantSelectionRequired callback

### Documentation
- [ ] Update README with multi-tenant section
- [ ] Document new AuthProvider config options
- [ ] Add examples for tenant selector UI

## References

- [MULTI_TENANT_AUTH_CHANGES.md](../MULTI_TENANT_AUTH_CHANGES.md) - Backend API changes
- [RFC 0001](./0001-post-login-tenant-switch.md) - Original tenant switch (superseded by this RFC)
