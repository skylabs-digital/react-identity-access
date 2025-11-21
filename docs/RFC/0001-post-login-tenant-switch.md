# RFC 0001: Post-Login Tenant Switch

**Status:** Draft  
**Author:** Cascade  
**Created:** 2024-11-20  
**Updated:** 2024-11-20

## Summary

Implement automatic tenant switching after successful login to redirect users to the correct tenant context. When a user logs in with a `tenantId` that differs from the current tenant context, the application will automatically switch to the login tenant by updating the URL (subdomain or query parameter) and reloading the page.

## Problem Statement

Currently, when a user logs in through the `AuthProvider.login()` method, the authentication is successful and tokens are stored, but the application doesn't automatically switch to the user's tenant context. This creates several issues:

1. **Manual Tenant Selection**: Users must manually select or navigate to their tenant after login
2. **Inconsistent State**: The URL/subdomain may not match the authenticated user's tenant
3. **User Experience**: Extra steps required post-authentication
4. **Multi-Tenant Confusion**: Users logging in from a different tenant's page stay on that tenant

## Current Implementation

### AuthProvider Login Flow
```typescript
const login = async (username: string, password: string, appId?: string, tenantId?: string) => {
  const loginResponse = await authApiService.login({ username, password, appId, tenantId });
  
  sessionManager.setTokens({
    accessToken: loginResponse.accessToken,
    refreshToken: loginResponse.refreshToken,
    expiresIn: loginResponse.expiresIn,
  });
  
  if (loginResponse.user) {
    sessionManager.setUser(loginResponse.user);
    setCurrentUser(loginResponse.user);
    await loadUserData();
  }
  
  return loginResponse;
};
```

### TenantProvider Detection Flow
```typescript
const detectTenantSlug = (): string | null => {
  if (tenantMode === 'subdomain') {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const subdomain = parts[0];
      localStorage.setItem('tenant', subdomain);
      return subdomain;
    }
    return localStorage.getItem('tenant');
  } else if (tenantMode === 'selector') {
    const urlParams = new URLSearchParams(window.location.search);
    const urlTenant = urlParams.get(selectorParam || 'tenant');
    if (urlTenant) {
      localStorage.setItem('tenant', urlTenant);
      return urlTenant;
    }
    return localStorage.getItem('tenant');
  }
  return null;
};
```

## Proposed Solution

### Key Insight

Login already requires `tenantId` as a parameter, so we already have the tenant information available. The solution is straightforward:

1. After successful login, compare the `tenantId` used for login with current `tenantProvider` tenant
2. If they don't match, trigger a tenant switch to the login tenant
3. No backend API changes required - we use the input parameters

### 2. Add Tenant Switch Method to TenantProvider

**Current TenantProvider Context:**
```typescript
interface TenantContextValue {
  tenant: PublicTenantInfo | null;  // Has both id and domain
  tenantSlug: string | null;
  isTenantLoading: boolean;
  tenantError: Error | null;
  retryTenant: () => void;
  settings: TenantSettings | null;
  settingsSchema: JSONSchema | null;
  isSettingsLoading: boolean;
  settingsError: Error | null;
  refreshSettings: () => void;
  validateSettings: (settings: TenantSettings) => { isValid: boolean; errors: string[] };
}
```

**Add new method** to context:

```typescript
export interface TenantContextValue {
  // ... existing properties
  switchTenant: (tenantSlug: string, mode?: 'navigate' | 'reload') => void; // NEW
}
```

**Implementation**:

const switchTenant = useCallback((tenantSlug: string, mode: 'navigate' | 'reload' = 'reload') => {
  const tenantMode = config.tenantMode || 'selector';
  
  // Update localStorage
  localStorage.setItem('tenant', tenantSlug);
  
  if (tenantMode === 'subdomain') {
    // Subdomain mode: redirect to new subdomain
    const currentHostname = window.location.hostname;
    const parts = currentHostname.split('.');
    
    if (parts.length >= 2) {
      // Replace subdomain
      parts[0] = tenantSlug;
      const newHostname = parts.join('.');
      const newUrl = `${window.location.protocol}//${newHostname}${window.location.pathname}`;
      window.location.href = newUrl;
    }
  } else if (tenantMode === 'selector') {
    // Selector mode: update URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set(config.selectorParam || 'tenant', tenantSlug);
    
    if (mode === 'reload') {
      // Full page reload with new tenant
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
      window.location.href = newUrl;
    } else {
      // Navigate without reload (requires router integration)
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
      window.history.pushState({}, '', newUrl);
      // Trigger tenant reload
      loadTenant(tenantSlug);
    }
  }
}, [config.tenantMode, config.selectorParam, loadTenant]);
```

### 3. Update AuthProvider to Auto-Switch Tenant

**AuthProvider handles tenant switching automatically** after successful login:

```typescript
export function AuthProvider({ config = {}, children }: AuthProviderProps) {
  const { appId, baseUrl } = useApp();
  const { tenant, tenantSlug, switchTenant } = useTenant();
  
  // ... existing setup ...
  
  const contextValue = useMemo(() => {
    const login = async (params: LoginParams) => {
      const { username, password, tenantId } = params;
      
      // Resolve tenantId (from params or context)
      const resolvedTenantId = tenantId ?? tenant?.id;
      
      const loginResponse = await authApiService.login({
        username,
        password,
        appId,
        tenantId: resolvedTenantId,
      });

      sessionManager.setTokens({
        accessToken: loginResponse.accessToken,
        refreshToken: loginResponse.refreshToken,
        expiresIn: loginResponse.expiresIn,
      });

      if (loginResponse.user) {
        sessionManager.setUser(loginResponse.user);
        setCurrentUser(loginResponse.user);

        // Load complete user data from API after login
        try {
          await loadUserData();
        } catch (error) {
          console.warn('Failed to load complete user data after login:', error);
        }
      }
      
      // AUTO-SWITCH TENANT if login tenantId differs from current tenant
      if (tenantId && tenant?.id && tenantId !== tenant.id) {
        try {
          // Fetch tenant info to get domain/slug for switching
          const tenantApi = new TenantApiService(authenticatedHttpService, appId);
          const tenantInfo = await tenantApi.getTenantById(tenantId);
          
          // Switch to the login tenant
          if (tenantInfo.domain && tenantInfo.domain !== tenantSlug) {
            // This will trigger a page reload, so return before that
            switchTenant(tenantInfo.domain);
            // Code after this won't execute due to page reload
          }
        } catch (error) {
          console.error('Failed to switch tenant after login:', error);
          // Continue normal flow even if switch fails
        }
      }

      return loginResponse;
    };
    
    // Same logic for verifyMagicLink
    const verifyMagicLink = async (params: VerifyMagicLinkParams) => {
      const { token, email, tenantId } = params;
      
      const resolvedTenantId = tenantId ?? tenant?.id;
      
      const verifyResponse = await authApiService.verifyMagicLink({
        token,
        email,
        appId,
        tenantId: resolvedTenantId,
      });
      
      // Set tokens and user
      sessionManager.setTokens({
        accessToken: verifyResponse.accessToken,
        refreshToken: verifyResponse.refreshToken,
        expiresIn: verifyResponse.expiresIn,
      });
      
      if (verifyResponse.user) {
        sessionManager.setUser(verifyResponse.user);
        setCurrentUser(verifyResponse.user);
        await loadUserData();
      }
      
      // AUTO-SWITCH TENANT for magic link too
      if (tenantId && tenant?.id && tenantId !== tenant.id) {
        try {
          const tenantApi = new TenantApiService(authenticatedHttpService, appId);
          const tenantInfo = await tenantApi.getTenantById(tenantId);
          
          if (tenantInfo.domain && tenantInfo.domain !== tenantSlug) {
            switchTenant(tenantInfo.domain);
          }
        } catch (error) {
          console.error('Failed to switch tenant after magic link:', error);
        }
      }
      
      return verifyResponse;
    };
    
    return {
      login,
      verifyMagicLink,
      // ... other methods
    };
  }, [
    authApiService,
    authenticatedHttpService,
    sessionManager,
    appId,
    tenant,
    tenantSlug,
    switchTenant,
    // ... other dependencies
  ]);
  
  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
```

**Components are now simpler** - no need to handle tenant switching:

```typescript
// In LoginForm.tsx - Much simpler!
import { useAuth } from '../providers/AuthProvider';

function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const { login } = useAuth();
  const [loginTenantId, setLoginTenantId] = useState<string>('');
  
  const handleLogin = async () => {
    // Just call login - AuthProvider handles tenant switching automatically
    const loginResponse = await login({
      username,
      password,
      tenantId: loginTenantId, // Override context tenant if needed
    });
    
    // Note: If tenantId differs from current tenant, AuthProvider will
    // automatically switch and reload the page. This code only executes
    // if we're staying on the same tenant.
    onLoginSuccess?.(loginResponse);
  };
  
  return (
    // ... form JSX
  );
}

// Direct hook usage - Also works automatically!
function CustomLoginComponent() {
  const { login } = useAuth();
  
  const handleCustomLogin = async () => {
    // Tenant switching happens automatically - no extra code needed
    await login({ 
      username: 'user@example.com', 
      password: 'secret',
      tenantId: 'some-tenant-id' // Will auto-switch if different
    });
  };
}
```

**Key Points:**
1. **Automatic Switching**: AuthProvider handles tenant switching internally
2. **Works Everywhere**: Whether using LoginForm or `useAuth()` hook directly
3. **Simpler Components**: No need to manually check tenants or call switchTenant
4. **Clean Separation**: AuthProvider knows about TenantProvider, components don't need to
5. **Decoupled Logic**: Login method handles auth + tenant switch in one place
6. **Magic Link Too**: verifyMagicLink also has automatic tenant switching

### 4. Provider Architecture - Selected Approach

**Selected: AuthProvider Uses TenantProvider Context**

`AuthProvider` directly uses `useTenant()` hook to access tenant switching functionality.

**Architecture:**
```
AppProvider (top level)
  └─> TenantProvider (needs AppProvider)
       └─> AuthProvider (needs both AppProvider and TenantProvider)
            └─> App Components
```

**Advantages:**
- ✅ **Automatic Switching**: Works for all login methods (LoginForm, useAuth hook, magic link)
- ✅ **Simple Components**: Components don't need tenant switching logic
- ✅ **Single Source of Truth**: All auth flows go through same switching logic
- ✅ **No Props Drilling**: Uses React context naturally
- ✅ **DRY Principle**: Logic in one place, not duplicated across components
- ✅ **Consistent Behavior**: Same tenant switching everywhere

**Provider Dependencies:**
```typescript
// AuthProvider.tsx
import { useApp } from './AppProvider';
import { useTenant } from './TenantProvider';

export function AuthProvider({ children }) {
  const { appId, baseUrl } = useApp();
  const { tenant, tenantSlug, switchTenant } = useTenant();
  
  // Auth logic + automatic tenant switching
}
```

**Why This is Better Than Alternatives:**

❌ **Component-Level Switching**: Every component needs to implement the same logic
- Duplication across LoginForm, custom forms, etc.
- Easy to forget in some places
- Inconsistent behavior

❌ **Prop Injection**: Pass switchTenant as prop to AuthProvider
- Awkward API with render props or prop drilling
- Not idiomatic React context usage
- More verbose setup

✅ **Context Consumption**: AuthProvider uses useTenant() directly
- Clean, idiomatic React
- Automatic for all consumers
- Simple setup

## Recommended Approach

**AuthProvider handles automatic tenant switching** with the following implementation:

### Phase 1: Verify API Endpoints
1. Confirm `getTenantById` endpoint exists: `GET /apps/{appId}/tenants/{tenantId}/public`
2. Verify `PublicTenantInfo` response structure (has `domain` or `slug` property)
3. Test endpoint with sample tenant IDs

### Phase 2: Add TenantProvider Methods
1. Add `switchTenant(tenantSlug, mode?)` method to TenantProvider
2. Export via `useTenant()` hook
3. Handle both subdomain and selector modes
4. Update localStorage when switching tenants

### Phase 3: Update AuthProvider
1. Import and use `useTenant()` hook in AuthProvider
2. Add auto-switch logic to `login()` method
3. Add auto-switch logic to `verifyMagicLink()` method
4. Add TenantApiService dependency to fetch tenant info
5. Handle errors gracefully if tenant switch fails

### Phase 4: Update Components (Simplification)
1. Remove tenant switching logic from `LoginForm` (now automatic)
2. Remove tenant switching logic from `MagicLinkVerify` (now automatic)
3. Update documentation to reflect automatic behavior
4. Components just call `login()` or `verifyMagicLink()` - no extra logic needed

## API Changes

### No Backend API Changes Required

The solution uses existing data:
- Login already accepts `tenantId` parameter
- `PublicTenantInfo` already has both `id` and `domain`/`slug`
- No new response fields needed

### Frontend Type Updates

```typescript
// src/providers/TenantProvider.tsx - Updated context
export interface TenantContextValue {
  // ... existing properties (tenant, tenantSlug, etc.)
  switchTenant: (tenantSlug: string, mode?: 'navigate' | 'reload') => void;  // NEW
}
```

**Note:** Use `tenant?.id` directly to access tenant ID, no new accessor needed.

### API Service Considerations

**Current State:**
- ✅ `getTenantById(id)` exists but requires authentication and returns full `Tenant`
- ✅ `getPublicTenantInfo(slug)` exists but requires slug instead of tenantId
- ❌ No public endpoint that accepts `tenantId` and returns `PublicTenantInfo`

**Options:**

**Option 1: Add Public Endpoint (Requires Backend)**
```typescript
// src/services/TenantApiService.ts
async getPublicTenantInfoById(tenantId: string): Promise<PublicTenantInfo> {
  const response = await this.httpService.get<ApiResponse<PublicTenantInfo>>(
    `/apps/${this.appId}/tenants/${tenantId}/public-info`
  );
  return response.data;
}
```
- **Pro**: Clean, efficient, no extra API calls
- **Con**: Requires backend changes

**Option 2: Use Authenticated Endpoint**
```typescript
// Use existing getTenantById which requires auth
const switchTenantById = async (tenantId: string) => {
  if (!sessionManager) throw new Error('No session available');
  
  const tenantApi = new TenantApiService(httpService, appId, sessionManager);
  const tenant = await tenantApi.getTenantById(tenantId);
  switchTenant(tenant.domain); // Assumes domain is the slug
};
```
- **Pro**: No backend changes, works immediately
- **Con**: Requires authentication, returns more data than needed

**Option 3: Client-Side Tenant Mapping**
```typescript
// Maintain a mapping of tenantId -> slug in TenantProvider
const tenantMap = useMemo(() => {
  // Could be populated from initial data, user list, etc.
  return new Map<string, string>();
}, []);

const switchTenantById = async (tenantId: string) => {
  const slug = tenantMap.get(tenantId);
  if (!slug) throw new Error('Tenant not found in local cache');
  switchTenant(slug);
};
```
- **Pro**: No API call needed
- **Con**: Requires pre-populated data, might be stale

**Recommendation**: Use **Option 2** initially (authenticated endpoint), then migrate to **Option 1** when backend support is available.

### TenantProvider Updates

```typescript
// src/providers/TenantProvider.tsx
export interface TenantContextValue {
  // ... existing properties
  switchTenant: (tenantSlug: string, mode?: 'navigate' | 'reload') => void;
}
```

### Component Props Updates

```typescript
// src/components/LoginForm.tsx
export interface LoginFormProps {
  // ... existing props
  autoSwitchTenant?: boolean;  // NEW, default: true
  onTenantSwitch?: (tenantSlug: string) => void;  // NEW
}

// src/components/MagicLinkVerify.tsx
export interface MagicLinkVerifyProps {
  // ... existing props
  autoSwitchTenant?: boolean;  // NEW, default: true
  onTenantSwitch?: (tenantSlug: string) => void;  // NEW
}
```

## Migration Guide

### For Existing Users

**No Breaking Changes** - All changes are additive:

1. **If using pre-built components**: Automatic tenant switching will be enabled by default
2. **If using hooks directly**: No changes required, but can opt-in to tenant switching

**To disable auto-switching**:
```tsx
<LoginForm 
  autoSwitchTenant={false}
  onLoginSuccess={(response) => {
    // Handle login success manually
    // Access response.tenant for tenant info
  }}
/>
```

**To use manual switching**:
```tsx
const { login } = useAuth();
const { switchTenant } = useTenant();

const handleLogin = async () => {
  const response = await login(username, password);
  
  // Custom logic before switching
  if (shouldSwitchTenant(response.tenant)) {
    switchTenant(response.tenant.slug);
  }
};
```

## Implementation Checklist

### TenantProvider Updates
- [ ] Add `switchTenant(slug, mode?)` method to `TenantProvider`
- [ ] Update `TenantContextValue` interface
- [ ] Export `switchTenant` via `useTenant()` hook
- [ ] Handle both subdomain and selector modes in switch logic

### API Service Updates
- [ ] Verify `getTenantById()` exists in `TenantApiService` (already exists)
- [ ] Ensure it returns `Tenant` with `domain` property

### AuthProvider Updates
- [ ] Import `useTenant()` hook in AuthProvider
- [ ] Add auto-switch logic to `login()` method
- [ ] Add auto-switch logic to `verifyMagicLink()` method
- [ ] Import `TenantApiService` for fetching tenant info
- [ ] Add error handling for failed tenant switches
- [ ] Update `useMemo` dependencies to include tenant and switchTenant

### Component Updates (Simplification)
- [ ] Remove tenant switching logic from `LoginForm` (no longer needed)
- [ ] Remove tenant switching logic from `MagicLinkVerify` (no longer needed)
- [ ] Simplify component code - just call auth methods directly

### Testing
- [ ] Add unit tests for `switchTenant()` method in TenantProvider
- [ ] Add unit tests for auto-switch logic in AuthProvider
- [ ] Test login with same tenant (no switch triggered)
- [ ] Test login with different tenant (switch triggered)
- [ ] Test verifyMagicLink with tenant switch
- [ ] Test subdomain mode tenant switching
- [ ] Test selector mode tenant switching
- [ ] Test error handling (invalid tenant ID, failed API call)
- [ ] Test that page reload happens after switch
- [ ] Mock TenantApiService in AuthProvider tests

### Documentation
- [ ] Update README.md with tenant switching examples
- [ ] Update examples.md with cross-tenant login scenarios
- [ ] Update API reference docs
- [ ] Add migration notes (no breaking changes)

## Testing Strategy

### Unit Tests
1. `switchTenant()` method with subdomain mode
2. `switchTenant()` method with selector mode
3. localStorage updates
4. URL construction

### Integration Tests
1. Login → Tenant Switch → Page Reload
2. Magic Link Verify → Tenant Switch → Page Reload
3. Same tenant login (no switch)
4. Different tenant login (switch)
5. Missing tenant slug handling

### Manual Testing
1. Login from wrong tenant (subdomain)
2. Login from wrong tenant (selector)
3. Login from correct tenant
4. Magic link verification flow
5. Multi-tab scenarios
6. Disabled auto-switch behavior

## Security Considerations

1. **Tenant Validation**: Ensure tenant slug from API is validated before switching
2. **Session Isolation**: Confirm tokens are properly scoped to tenant
3. **CSRF Protection**: Maintain CSRF tokens across tenant switches
4. **Storage Keys**: Use tenant-scoped storage keys for tokens
5. **XSS Prevention**: Sanitize tenant slugs before URL construction

## Performance Considerations

1. **Page Reload**: Subdomain switching requires full page reload (unavoidable)
2. **Selector Mode**: Can potentially avoid reload with proper router integration
3. **localStorage**: Minimal overhead for tenant tracking
4. **API Calls**: No additional API calls required (tenant info in login response)

## Open Questions

1. **Should we support "navigate" mode for selector switching?**
   - Pro: Faster UX without page reload
   - Con: Requires router integration, more complex state management
   - **Recommendation**: Start with "reload" mode only, add "navigate" later if needed

2. **Does backend support getTenantById endpoint?**
   - Need to verify: `GET /apps/{appId}/tenants/{tenantId}/public`
   - Alternative: Use existing endpoints and map via client-side lookup
   - **Action Required**: Check with backend team

3. **Should we clear old tenant's localStorage on switch?**
   - Pro: Cleaner state, prevents confusion
   - Con: Might lose important app state
   - **Recommendation**: Only clear auth-related keys, preserve app state

4. **How to handle tenant slug/domain in API?**
   - Does `PublicTenantInfo` have `slug` property or just `domain`?
   - If only `domain`, need to extract slug from domain
   - **Action Required**: Verify API response structure

5. **Multi-app scenarios?**
   - User might have access to multiple apps with different tenants
   - **Recommendation**: Tenant switching is app-scoped, no conflicts

## Future Enhancements

1. **Tenant Selector Component**: Pre-built UI for manual tenant switching
2. **Multi-Tenant Dashboard**: Show all accessible tenants
3. **Tenant Switching Animation**: Smooth transition instead of hard reload
4. **Tenant Prefetching**: Preload tenant data before switch
5. **Tenant History**: Track recently accessed tenants
6. **Router Integration**: Deep integration with React Router for seamless navigation

## References

- [TenantProvider Implementation](/src/providers/TenantProvider.tsx)
- [AuthProvider Implementation](/src/providers/AuthProvider.tsx)
- [Multi-Tenancy Patterns](https://docs.microsoft.com/en-us/azure/architecture/patterns/multi-tenancy)
- [URL Routing Strategies](https://github.com/remix-run/react-router)

## Decision

**Pending Review** - This RFC is open for discussion and feedback.

**Key Decision Points:**
1. ✅ Use Option A (Decoupled Providers)
2. ✅ Start with "reload" mode only  
3. ✅ Make auto-switch opt-out (enabled by default)
4. ✅ No breaking changes
5. ✅ Use existing `tenantId` from login parameters (no backend changes needed)
6. ⏳ Confirm `getTenantById` endpoint availability
7. ⏳ Verify `PublicTenantInfo` structure (slug vs domain)
