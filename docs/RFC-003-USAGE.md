# RFC-003: Authentication State and Provider Caching - Usage Guide

This guide shows you how to use the new features added in RFC-003: `isAuthenticated` property and provider caching.

## 1. Using isAuthenticated

### Before (Old Way)

```typescript
import { useAuth } from '@skylabs-digital/react-identity-access';

function MyComponent() {
  const { hasValidSession, currentUser } = useAuth();
  
  // Had to manually check both conditions
  const isLoggedIn = hasValidSession() && !!currentUser;
  
  if (isLoggedIn) {
    return <Dashboard />;
  }
  
  return <Login />;
}
```

### After (New Way)

```typescript
import { useAuth } from '@skylabs-digital/react-identity-access';

function MyComponent() {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Dashboard />;
  }
  
  return <Login />;
}
```

### Benefits

- **Simpler**: Just one boolean instead of checking two conditions
- **Reactive**: Updates automatically when auth state changes
- **Idiomatic**: Works perfectly with React hooks and memo patterns
- **Backward Compatible**: `hasValidSession()` still works as before

### Common Use Cases

**Protected Routes:**
```typescript
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
}
```

**Conditional Rendering:**
```typescript
function Header() {
  const { isAuthenticated, currentUser } = useAuth();
  
  return (
    <header>
      <Logo />
      {isAuthenticated ? (
        <UserMenu user={currentUser} />
      ) : (
        <LoginButton />
      )}
    </header>
  );
}
```

**With useMemo:**
```typescript
function Dashboard() {
  const { isAuthenticated, currentUser } = useAuth();
  
  const greeting = useMemo(() => {
    if (!isAuthenticated) return 'Welcome, Guest!';
    return `Welcome back, ${currentUser?.name}!`;
  }, [isAuthenticated, currentUser]);
  
  return <h1>{greeting}</h1>;
}
```

## 2. Provider Caching

Provider caching is **enabled by default** with sensible defaults. You don't need to configure anything to benefit from faster page loads!

### Default Behavior

- **Cache TTL**: 5 minutes
- **Background Refresh**: Automatically refreshes when cache is older than 2.5 minutes
- **Storage**: localStorage
- **Automatic**: Works out of the box

### How It Works

**First Page Load:**
```
User visits → Fetch app info → Fetch tenant info → Cache both → Render (200-500ms)
```

**Subsequent Loads (within 5 min):**
```
User refreshes → Load from cache → Render instantly (0ms) → Background refresh if needed
```

**After Cache Expires (> 5 min):**
```
User visits → Fetch fresh data → Update cache → Render
```

### Custom Configuration

#### Disable Caching

```typescript
<AppProvider
  config={{
    appId: 'my-app',
    baseUrl: 'https://api.example.com',
    cache: {
      enabled: false, // Disable cache
    },
  }}
>
  {children}
</AppProvider>
```

#### Custom TTL

```typescript
// Cache for 10 minutes
<AppProvider
  config={{
    appId: 'my-app',
    baseUrl: 'https://api.example.com',
    cache: {
      ttl: 10 * 60 * 1000, // 10 minutes in milliseconds
    },
  }}
>
  {children}
</AppProvider>

// Cache for 1 hour
<TenantProvider
  config={{
    tenantMode: 'subdomain',
    cache: {
      ttl: 60 * 60 * 1000, // 1 hour
    },
  }}
>
  {children}
</TenantProvider>
```

#### Custom Storage Key

```typescript
<AppProvider
  config={{
    appId: 'my-app',
    baseUrl: 'https://api.example.com',
    cache: {
      storageKey: 'my_custom_app_cache', // Custom key
    },
  }}
>
  {children}
</AppProvider>
```

### When to Use Different TTL Values

| Scenario | Recommended TTL | Reason |
|----------|----------------|---------|
| Production app with stable config | 30-60 minutes | App/tenant info rarely changes |
| Development environment | 1-2 minutes | Frequent config changes |
| E-commerce with dynamic pricing | Disable cache | Requires real-time data |
| Marketing/landing pages | 1-24 hours | Static content |

### Example Configurations

**Production - High Performance:**
```typescript
<AppProvider
  config={{
    appId: 'prod-app',
    baseUrl: 'https://api.example.com',
    cache: {
      enabled: true,
      ttl: 30 * 60 * 1000, // 30 minutes
    },
  }}
>
  <TenantProvider
    config={{
      tenantMode: 'subdomain',
      cache: {
        enabled: true,
        ttl: 30 * 60 * 1000, // 30 minutes
      },
    }}
  >
    {children}
  </TenantProvider>
</AppProvider>
```

**Development - Fast Iteration:**
```typescript
<AppProvider
  config={{
    appId: 'dev-app',
    baseUrl: 'http://localhost:3000',
    cache: {
      enabled: true,
      ttl: 1 * 60 * 1000, // 1 minute
    },
  }}
>
  <TenantProvider
    config={{
      tenantMode: 'selector',
      cache: {
        enabled: true,
        ttl: 1 * 60 * 1000, // 1 minute
      },
    }}
  >
    {children}
  </TenantProvider>
</AppProvider>
```

**Real-time Data - No Cache:**
```typescript
<AppProvider
  config={{
    appId: 'realtime-app',
    baseUrl: 'https://api.example.com',
    cache: {
      enabled: false, // Disable for real-time requirements
    },
  }}
>
  {children}
</AppProvider>
```

## 3. Cache Behavior Details

### Cache Storage

Caches are stored in `localStorage` with these keys:
- **App cache**: `app_cache_{appId}`
- **Tenant cache**: `tenant_cache_{tenantSlug}`

### Cache Invalidation

Caches are automatically invalidated when:
- TTL expires (default: 5 minutes)
- App ID changes
- Tenant slug changes
- localStorage is manually cleared

### Background Refresh

When cache is more than 50% expired:
- Page renders immediately with cached data (0ms)
- Fresh data fetched in background
- Cache updated silently
- No loading indicators shown

### Error Handling

If caching fails (quota exceeded, permissions, etc.):
- Error is logged to console
- App continues without cache
- Normal API fetching works as usual

## 4. Performance Impact

### Before RFC-003

```
Every page refresh:
- Fetch app info: ~150ms
- Fetch tenant info: ~150ms
- Total: ~300ms + render time
```

### After RFC-003

```
First load:
- Fetch + cache: ~300ms + render time

Subsequent loads (cached):
- Load from cache: ~0ms
- Render immediately: instant!
- Background refresh: silent

Performance improvement: 100% faster on subsequent loads!
```

## 5. Migration Guide

### No Breaking Changes!

RFC-003 is **100% backward compatible**. You don't need to change any existing code.

### Optional Upgrades

If you want to use the new features:

1. **Start using `isAuthenticated`** (recommended):
```typescript
// Before
const { hasValidSession, currentUser } = useAuth();
if (hasValidSession() && currentUser) { /* ... */ }

// After
const { isAuthenticated } = useAuth();
if (isAuthenticated) { /* ... */ }
```

2. **Configure caching** (optional - works great with defaults):
```typescript
// Only if you need custom TTL or want to disable
<AppProvider config={{ /* ... */, cache: { ttl: 10 * 60 * 1000 } }}>
```

## 6. Troubleshooting

### Cache Not Working?

Check these:
1. localStorage is enabled in browser
2. Cache is not disabled in config
3. Check browser console for warnings

### Too Much Stale Data?

Reduce TTL:
```typescript
cache: { ttl: 2 * 60 * 1000 } // 2 minutes instead of 5
```

### Need Real-time Data?

Disable cache:
```typescript
cache: { enabled: false }
```

### Clear Cache Manually

```typescript
// Clear app cache
localStorage.removeItem(`app_cache_${appId}`);

// Clear tenant cache
localStorage.removeItem(`tenant_cache_${tenantSlug}`);

// Clear all caches
localStorage.clear();
```

## 7. Best Practices

✅ **Do:**
- Use default caching settings (they work great!)
- Use `isAuthenticated` for simpler code
- Increase TTL in production for better performance
- Decrease TTL in development for faster iteration

❌ **Don't:**
- Set TTL too high (> 1 hour) unless data is truly static
- Disable cache without good reason
- Store sensitive data in cache (only public info is cached)
- Mix isAuthenticated with hasValidSession in same component

## Summary

RFC-003 gives you:
- ✅ Simpler auth checks with `isAuthenticated`
- ✅ Faster page loads with automatic caching
- ✅ Better UX with instant renders
- ✅ Zero configuration required
- ✅ 100% backward compatible

Start using it today - no migration needed!
