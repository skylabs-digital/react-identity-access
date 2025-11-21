# RFC 0003: Authentication State and Provider Caching

**Status:** Draft  
**Author:** Cascade  
**Created:** 2024-11-20  
**Updated:** 2024-11-20

## Summary

Improve user experience and performance by:
1. Adding `isAuthenticated` variable to `AuthContext` for simple authentication state checks
2. Implementing optimistic caching for `AppProvider` and `TenantProvider` to prevent redundant API calls on page refresh

## Problem Statement

### Problem 1: No Simple Authentication State Indicator

Currently, developers must manually check authentication state:

```typescript
const { hasValidSession, currentUser } = useAuth();

// Multiple ways to check, confusing!
const isLoggedIn = hasValidSession();
const isLoggedIn2 = !!currentUser;
const isLoggedIn3 = sessionManager.hasValidSession();
```

**Issues:**
- No single source of truth for authentication state
- `hasValidSession()` is a function call (not idiomatic React)
- Not compatible with React's ref/memo patterns
- Unclear which method to use
- Hard to use in conditional rendering

### Problem 2: Redundant API Calls on Every Page Refresh

Currently, on every page refresh:
- `AppProvider` fetches app info from `/apps/:appId/public-info`
- `TenantProvider` fetches tenant info from `/tenants/:tenantSlug/public-info`

**Issues:**
- Slow initial page loads (2 API calls every time)
- Unnecessary server load for data that rarely changes
- Poor UX with loading screens on every refresh
- No optimistic rendering

**Example:**
```typescript
// User refreshes page
// → Shows loading screen
// → Fetches app info (GET /apps/demo-app/public-info)
// → Fetches tenant info (GET /tenants/acme/public-info)
// → Finally renders app

// User refreshes again 5 seconds later
// → Same process repeats! ❌
```

## Current Implementation

### AuthProvider - No isAuthenticated

```typescript
export interface AuthContextValue {
  // No simple boolean for authentication state
  sessionManager: SessionManager;
  currentUser: User | null;
  hasValidSession: () => boolean; // Function, not reactive
  // ...
}
```

### AppProvider - No Caching

```typescript
export function AppProvider({ config, children }: AppProviderProps) {
  const [appInfo, setAppInfo] = useState<PublicAppInfo | null>(null);
  
  useEffect(() => {
    // Fetches on every mount - no cache!
    loadApp();
  }, [loadApp]);
  
  // ...
}
```

### TenantProvider - No Caching

```typescript
export function TenantProvider({ config, children }: TenantProviderProps) {
  const [tenant, setTenant] = useState<PublicTenantInfo | null>(config.initialTenant || null);
  
  useEffect(() => {
    // Fetches on every mount - no cache!
    if (!config.initialTenant && tenantSlug) {
      loadTenant(tenantSlug);
    }
  }, [config.initialTenant, tenantSlug, loadTenant]);
  
  // ...
}
```

## Proposed Solution

### Part 1: Add isAuthenticated to AuthContext

Add a reactive boolean that tracks authentication state:

```typescript
export interface AuthContextValue {
  // NEW: Simple boolean for authentication state
  isAuthenticated: boolean;
  
  // Existing
  sessionManager: SessionManager;
  currentUser: User | null;
  hasValidSession: () => boolean; // Keep for backward compatibility
  // ...
}
```

**Implementation:**

```typescript
export function AuthProvider({ config = {}, children }: AuthProviderProps) {
  // ... existing code ...
  
  // Compute isAuthenticated from session state
  const isAuthenticated = useMemo(() => {
    return sessionManager.hasValidSession() && currentUser !== null;
  }, [sessionManager, currentUser]);
  
  const contextValue = useMemo(() => {
    // ... existing methods ...
    
    return {
      isAuthenticated, // NEW
      sessionManager,
      currentUser,
      hasValidSession, // Keep for backward compatibility
      // ... rest
    };
  }, [isAuthenticated, sessionManager, currentUser, /* ... */]);
  
  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
```

**Usage:**

```typescript
// Clean, idiomatic React
const { isAuthenticated } = useAuth();

if (isAuthenticated) {
  return <Dashboard />;
}

return <Login />;
```

### Part 2: Add Optimistic Caching to AppProvider

Implement localStorage caching with configurable TTL (Time To Live):

```typescript
export interface AppConfig {
  baseUrl: string;
  appId: string;
  // NEW: Cache configuration
  cache?: {
    enabled?: boolean; // Default: true
    ttl?: number; // Time to live in milliseconds, default: 5 minutes
    storageKey?: string; // Default: 'app_cache_{appId}'
  };
  // Fallbacks
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode | ((error: Error, retry: () => void) => ReactNode);
}
```

**Implementation:**

```typescript
interface CachedAppInfo {
  data: PublicAppInfo;
  timestamp: number;
  appId: string;
}

export function AppProvider({ config, children }: AppProviderProps) {
  const cacheConfig = {
    enabled: config.cache?.enabled ?? true,
    ttl: config.cache?.ttl ?? 5 * 60 * 1000, // 5 minutes default
    storageKey: config.cache?.storageKey ?? `app_cache_${config.appId}`,
  };
  
  const [appInfo, setAppInfo] = useState<PublicAppInfo | null>(() => {
    // Try to load from cache on initialization
    if (!cacheConfig.enabled) return null;
    
    try {
      const cached = localStorage.getItem(cacheConfig.storageKey);
      if (!cached) return null;
      
      const parsed: CachedAppInfo = JSON.parse(cached);
      const now = Date.now();
      const age = now - parsed.timestamp;
      
      // Check if cache is still valid
      if (age < cacheConfig.ttl && parsed.appId === config.appId) {
        return parsed.data;
      }
      
      // Cache expired
      localStorage.removeItem(cacheConfig.storageKey);
      return null;
    } catch {
      return null;
    }
  });
  
  const [isAppLoading, setIsAppLoading] = useState(!appInfo); // Don't load if we have cache
  const [appError, setAppError] = useState<Error | null>(null);
  
  const loadApp = useCallback(async (bypassCache = false) => {
    // Check cache first (unless bypassing)
    if (!bypassCache && cacheConfig.enabled && appInfo) {
      return; // Already have valid cached data
    }
    
    try {
      setIsAppLoading(true);
      setAppError(null);
      
      const httpService = new HttpService(config.baseUrl);
      const appApi = new AppApiService(httpService, {} as any);
      const appData = await appApi.getPublicAppInfo(config.appId);
      setAppInfo(appData);
      
      // Save to cache
      if (cacheConfig.enabled) {
        try {
          const cacheData: CachedAppInfo = {
            data: appData,
            timestamp: Date.now(),
            appId: config.appId,
          };
          localStorage.setItem(cacheConfig.storageKey, JSON.stringify(cacheData));
        } catch (error) {
          console.warn('Failed to cache app info:', error);
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load app information');
      setAppError(error);
      setAppInfo(null);
    } finally {
      setIsAppLoading(false);
    }
  }, [config.baseUrl, config.appId, cacheConfig, appInfo]);
  
  // Background refresh: Load fresh data without blocking UI
  const backgroundRefresh = useCallback(async () => {
    if (!cacheConfig.enabled || !appInfo) return;
    
    try {
      const cached = localStorage.getItem(cacheConfig.storageKey);
      if (!cached) return;
      
      const parsed: CachedAppInfo = JSON.parse(cached);
      const age = Date.now() - parsed.timestamp;
      
      // If cache is more than 50% expired, refresh in background
      if (age > cacheConfig.ttl * 0.5) {
        const httpService = new HttpService(config.baseUrl);
        const appApi = new AppApiService(httpService, {} as any);
        const appData = await appApi.getPublicAppInfo(config.appId);
        
        setAppInfo(appData);
        
        const cacheData: CachedAppInfo = {
          data: appData,
          timestamp: Date.now(),
          appId: config.appId,
        };
        localStorage.setItem(cacheConfig.storageKey, JSON.stringify(cacheData));
      }
    } catch (error) {
      console.warn('Background refresh failed:', error);
      // Don't update error state - keep showing cached data
    }
  }, [config, cacheConfig, appInfo]);
  
  useEffect(() => {
    if (!appInfo) {
      loadApp();
    } else {
      // We have cached data, do background refresh
      backgroundRefresh();
    }
  }, []);
  
  // ... rest of implementation
}
```

### Part 3: Add Optimistic Caching to TenantProvider

Similar implementation for tenant data:

```typescript
export interface TenantConfig {
  tenantMode?: 'subdomain' | 'selector';
  selectorParam?: string;
  // NEW: Cache configuration
  cache?: {
    enabled?: boolean; // Default: true
    ttl?: number; // Default: 5 minutes
    storageKey?: string; // Default: 'tenant_cache_{tenantSlug}'
  };
  initialTenant?: PublicTenantInfo;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode | ((error: Error, retry: () => void) => ReactNode);
}
```

**Implementation:**

```typescript
interface CachedTenantInfo {
  data: PublicTenantInfo;
  timestamp: number;
  tenantSlug: string;
}

export function TenantProvider({ config, children }: TenantProviderProps) {
  const { baseUrl, appId } = useApp();
  const tenantSlug = useMemo(() => detectTenantSlug(), [detectTenantSlug]);
  
  const cacheConfig = {
    enabled: config.cache?.enabled ?? true,
    ttl: config.cache?.ttl ?? 5 * 60 * 1000,
    storageKey: config.cache?.storageKey ?? `tenant_cache_${tenantSlug}`,
  };
  
  const [tenant, setTenant] = useState<PublicTenantInfo | null>(() => {
    // Try to load from cache first
    if (config.initialTenant) return config.initialTenant;
    if (!cacheConfig.enabled || !tenantSlug) return null;
    
    try {
      const cached = localStorage.getItem(cacheConfig.storageKey);
      if (!cached) return null;
      
      const parsed: CachedTenantInfo = JSON.parse(cached);
      const now = Date.now();
      const age = now - parsed.timestamp;
      
      if (age < cacheConfig.ttl && parsed.tenantSlug === tenantSlug) {
        return parsed.data;
      }
      
      localStorage.removeItem(cacheConfig.storageKey);
      return null;
    } catch {
      return null;
    }
  });
  
  const [isTenantLoading, setIsTenantLoading] = useState(!tenant && !config.initialTenant);
  
  const loadTenant = useCallback(async (slug: string, bypassCache = false) => {
    // Similar caching logic as AppProvider
    if (!bypassCache && cacheConfig.enabled && tenant && tenant.domain === slug) {
      return;
    }
    
    try {
      setIsTenantLoading(true);
      setTenantError(null);
      
      const httpService = new HttpService(baseUrl);
      const tenantApi = new TenantApiService(httpService, appId);
      const tenantInfo = await tenantApi.getPublicTenantInfo(slug);
      setTenant(tenantInfo);
      
      // Save to cache
      if (cacheConfig.enabled) {
        try {
          const cacheData: CachedTenantInfo = {
            data: tenantInfo,
            timestamp: Date.now(),
            tenantSlug: slug,
          };
          localStorage.setItem(cacheConfig.storageKey, JSON.stringify(cacheData));
        } catch (error) {
          console.warn('Failed to cache tenant info:', error);
        }
      }
    } catch (err) {
      // ... error handling
    } finally {
      setIsTenantLoading(false);
    }
  }, [baseUrl, appId, cacheConfig, tenant]);
  
  // Background refresh similar to AppProvider
  const backgroundRefresh = useCallback(async () => {
    if (!cacheConfig.enabled || !tenant || !tenantSlug) return;
    
    try {
      const cached = localStorage.getItem(cacheConfig.storageKey);
      if (!cached) return;
      
      const parsed: CachedTenantInfo = JSON.parse(cached);
      const age = Date.now() - parsed.timestamp;
      
      if (age > cacheConfig.ttl * 0.5) {
        const httpService = new HttpService(baseUrl);
        const tenantApi = new TenantApiService(httpService, appId);
        const tenantInfo = await tenantApi.getPublicTenantInfo(tenantSlug);
        
        setTenant(tenantInfo);
        
        const cacheData: CachedTenantInfo = {
          data: tenantInfo,
          timestamp: Date.now(),
          tenantSlug,
        };
        localStorage.setItem(cacheConfig.storageKey, JSON.stringify(cacheData));
      }
    } catch (error) {
      console.warn('Background tenant refresh failed:', error);
    }
  }, [baseUrl, appId, cacheConfig, tenant, tenantSlug]);
  
  useEffect(() => {
    if (!tenant && tenantSlug) {
      loadTenant(tenantSlug);
    } else if (tenant) {
      backgroundRefresh();
    }
  }, []);
  
  // ... rest of implementation
}
```

## Benefits

### Part 1: isAuthenticated

1. **Idiomatic React**: Boolean variable instead of function call
2. **Better DX**: Clear, single source of truth
3. **Memo-Compatible**: Works with `useMemo`, `useCallback`, deps arrays
4. **Simpler Code**: `isAuthenticated` vs `hasValidSession() && !!currentUser`
5. **Better Performance**: Computed once with `useMemo`

### Part 2 & 3: Provider Caching

1. **Faster Page Loads**: Instant render with cached data (0ms vs 200-500ms)
2. **Optimistic UX**: No loading screens on refresh if cache is valid
3. **Reduced Server Load**: Fewer API calls for rarely-changing data
4. **Background Refresh**: Stale-while-revalidate pattern
5. **Configurable**: Can disable or adjust TTL per app needs
6. **Smart Invalidation**: Auto-expires after TTL

## Use Cases

### Use Case 1: Simple Authentication Check

```typescript
// Before
const { hasValidSession, currentUser } = useAuth();
const isLoggedIn = hasValidSession() && !!currentUser;

if (isLoggedIn) {
  return <Dashboard />;
}

// After
const { isAuthenticated } = useAuth();

if (isAuthenticated) {
  return <Dashboard />;
}
```

### Use Case 2: Conditional Rendering

```typescript
// Before
const { hasValidSession } = useAuth();

return (
  <header>
    {hasValidSession() ? <UserMenu /> : <LoginButton />}
  </header>
);

// After
const { isAuthenticated } = useAuth();

return (
  <header>
    {isAuthenticated ? <UserMenu /> : <LoginButton />}
  </header>
);
```

### Use Case 3: Protected Routes

```typescript
// Before
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { hasValidSession, currentUser } = useAuth();
  const isAuth = hasValidSession() && !!currentUser;
  
  if (!isAuth) return <Navigate to="/login" />;
  return <>{children}</>;
}

// After
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  return <>{children}</>;
}
```

### Use Case 4: Fast Page Refresh with Cache

```typescript
// User refreshes page at t=0
// → Cache: { appInfo, timestamp: t=0 }
// → Renders immediately with cached data (0ms load)
// → Background refresh starts
// → Updates cache if data changed

// User refreshes again at t=2min
// → Cache still valid (< 5min TTL)
// → Instant render (0ms load)
// → Background refresh (cache age > 50% TTL)

// User refreshes at t=6min
// → Cache expired (> 5min TTL)
// → Shows loading
// → Fetches fresh data
// → Updates cache with new timestamp
```

### Use Case 5: Configure Cache per App

```typescript
// Fast-changing data: shorter TTL
<AppProvider
  config={{
    appId: 'dashboard',
    baseUrl: 'https://api.example.com',
    cache: {
      enabled: true,
      ttl: 60 * 1000, // 1 minute
    },
  }}
>
  {children}
</AppProvider>

// Static data: longer TTL
<AppProvider
  config={{
    appId: 'marketing',
    baseUrl: 'https://api.example.com',
    cache: {
      enabled: true,
      ttl: 60 * 60 * 1000, // 1 hour
    },
  }}
>
  {children}
</AppProvider>

// Disable cache for development
<AppProvider
  config={{
    appId: 'dev-app',
    baseUrl: 'http://localhost:3000',
    cache: {
      enabled: false,
    },
  }}
>
  {children}
</AppProvider>
```

## Migration Guide

### Breaking Changes

**None** - This is a backward-compatible addition.

### Migration Steps

**Step 1: Update to isAuthenticated (Optional)**

```typescript
// Old way (still works)
const { hasValidSession, currentUser } = useAuth();
const isLoggedIn = hasValidSession() && !!currentUser;

// New way (recommended)
const { isAuthenticated } = useAuth();
```

**Step 2: Configure Caching (Optional)**

Caching is **enabled by default** with 5-minute TTL. To customize:

```typescript
<AppProvider
  config={{
    appId: 'my-app',
    baseUrl: 'https://api.example.com',
    cache: {
      enabled: true,
      ttl: 10 * 60 * 1000, // 10 minutes
    },
  }}
>
  <TenantProvider
    config={{
      tenantMode: 'subdomain',
      cache: {
        enabled: true,
        ttl: 10 * 60 * 1000, // 10 minutes
      },
    }}
  >
    {children}
  </TenantProvider>
</AppProvider>
```

**Step 3: Clear Old Cache (If Upgrading)**

If upgrading from a version without caching, clear localStorage once:

```typescript
// Run once after upgrade
localStorage.removeItem('app_cache_' + appId);
localStorage.removeItem('tenant_cache_' + tenantSlug);
```

## Implementation Plan

### Phase 1: Add isAuthenticated
- [ ] Update `AuthContextValue` interface
- [ ] Compute `isAuthenticated` with `useMemo`
- [ ] Add to context value
- [ ] Update TypeScript types
- [ ] Add tests

### Phase 2: Add Caching to AppProvider
- [ ] Add cache config to `AppConfig`
- [ ] Implement cache read on initialization
- [ ] Implement cache write after API fetch
- [ ] Implement cache expiration logic
- [ ] Implement background refresh
- [ ] Add tests

### Phase 3: Add Caching to TenantProvider
- [ ] Add cache config to `TenantConfig`
- [ ] Implement cache read on initialization
- [ ] Implement cache write after API fetch
- [ ] Implement cache expiration logic
- [ ] Implement background refresh
- [ ] Add tests

### Phase 4: Documentation
- [ ] Update README.md
- [ ] Update API reference
- [ ] Add caching guide
- [ ] Add performance tips
- [ ] Update examples

### Phase 5: Testing
- [ ] Unit tests for isAuthenticated
- [ ] Unit tests for cache logic
- [ ] Integration tests for providers
- [ ] Test cache expiration
- [ ] Test background refresh
- [ ] Test cache invalidation

## Considerations

### Cache Invalidation

**Question:** When should we invalidate the cache?

**Solution:** 
- Auto-expire after TTL (default 5 minutes)
- Clear on app/tenant ID change
- Provide manual refresh methods
- Background refresh when cache age > 50% TTL

### Storage Quota

**Question:** What if localStorage is full?

**Solution:**
- Catch storage errors gracefully
- Fall back to no caching
- Log warning to console
- App continues to work normally

### SSR/SSG Support

**Question:** How does caching work with SSR?

**Solution:**
- `initialTenant` and `initialRoles` bypass cache
- Cache only activates in browser
- SSR provides fresh data on first render
- Cache improves subsequent client-side navigation

### Multi-Tab Sync

**Question:** What if user opens multiple tabs?

**Solution:**
- Each tab reads from shared localStorage cache
- Background refresh updates cache for all tabs
- Consider adding `storage` event listener for real-time sync (future enhancement)

### Security

**Question:** Is it safe to cache tenant/app info?

**Solution:**
- Only caching **public** info (no sensitive data)
- Same data available via public API endpoints
- No authentication tokens cached here
- Auth tokens already handled by SessionManager

## Versioning

This change will be released as a **minor version bump** (v2.X.0) - no breaking changes.

**Semantic Versioning:**
- Current: `2.0.x` (after RFC-002)
- After RFC-003: `2.1.0`

## Alternatives Considered

### Alternative 1: Keep Current Implementation
**Pros:** No changes needed  
**Cons:** Poor UX, slow page loads, redundant API calls  
**Decision:** ❌ Rejected - improvements are needed

### Alternative 2: Use React Query / SWR
**Pros:** Battle-tested caching libraries  
**Cons:** Additional dependency, over-engineered for our use case  
**Decision:** ❌ Rejected - simple localStorage cache is sufficient

### Alternative 3: Cache Everything Forever
**Pros:** Maximum performance  
**Cons:** Stale data, no way to get updates  
**Decision:** ❌ Rejected - need balance between performance and freshness

### Alternative 4: Stale-While-Revalidate with TTL (SELECTED)
**Pros:** Instant loads + fresh data, configurable, no extra dependencies  
**Cons:** Slightly more complex implementation  
**Decision:** ✅ **SELECTED** - Best balance of UX and performance

### Alternative 5: Use isLoggedIn instead of isAuthenticated
**Pros:** Shorter name  
**Cons:** Less precise terminology in auth context  
**Decision:** ❌ Rejected - `isAuthenticated` is more accurate

## Open Questions

1. **Should we add cache versioning?**
   - Current proposal: Cache is per appId/tenantSlug
   - Alternative: Add version number to invalidate on app updates
   - **Decision:** Start simple, add if needed

2. **Should we sync cache across tabs in real-time?**
   - Current proposal: Each tab refreshes independently
   - Alternative: Use `storage` event for cross-tab sync
   - **Decision:** Future enhancement (v2.2.0)

3. **Should we expose cache controls to developers?**
   - Current proposal: Auto-managed cache
   - Alternative: `clearCache()`, `refreshCache()` methods
   - **Decision:** Add refresh methods, hold on clearCache for now

## Related RFCs

- **RFC-001**: Post-Login Tenant Switch
- **RFC-002**: Modernize Auth Method API
- **RFC-003** (this): Authentication State and Caching

These RFCs work together to create a fast, intuitive authentication experience.

## References

- [HTTP Caching - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
- [Stale-While-Revalidate Pattern](https://web.dev/stale-while-revalidate/)
- [localStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [React Context Best Practices](https://react.dev/learn/passing-data-deeply-with-context)

## Decision

**Pending Review** - This RFC is open for discussion and feedback.

**Key Decision Points:**
1. ✅ Add `isAuthenticated` boolean to `AuthContext`
2. ✅ Implement localStorage caching for `AppProvider`
3. ✅ Implement localStorage caching for `TenantProvider`
4. ✅ Use stale-while-revalidate pattern with configurable TTL
5. ✅ Default TTL: 5 minutes
6. ✅ Background refresh when cache age > 50% TTL
7. ⏳ Consider cross-tab sync as future enhancement
8. ⏳ Consider cache versioning if needed
