# Helper: Public API surface

This is the source of truth for the public API that flows and agents may reference. It is hand-written from the **README and docs**, not generated from `src/`. If the README and this file disagree, the README wins and this file needs updating.

**Agents must not read `src/` or `dist/`.** If a behavior is not documented here or in `docs/`, treat it as unspecified and flag it as a finding.

---

## Providers

```ts
import {
  AppProvider,
  TenantProvider,
  AuthProvider,
  FeatureFlagProvider,
  SubscriptionProvider,
  RoutingProvider,
} from '@skylabs-digital/react-identity-access';
```

### AppProvider

```ts
interface AppConfig {
  baseUrl: string;            // API base URL
  appId: string;              // Application identifier
  cache?: {
    enabled?: boolean;        // default: true
    ttl?: number;             // default: 5 min
    storageKey?: string;
  };
}
```

### TenantProvider

```ts
interface TenantConfig {
  tenantMode?: 'subdomain' | 'selector' | 'fixed';   // default: 'selector'
  fixedTenantSlug?: string;                          // required for 'fixed'
  baseDomain?: string;                               // for 'subdomain'
  selectorParam?: string;                            // default: 'tenant'
  cache?: { enabled?: boolean; ttl?: number; storageKey?: string };
  initialTenant?: PublicTenantInfo;                  // SSR
}
```

### AuthProvider

```ts
interface AuthConfig {
  // Standalone mode (v2.27+) — required if no AppProvider is present
  baseUrl?: string;
  appId?: string;

  // Session lifecycle
  onSessionExpired?: (error: SessionExpiredError) => void;
  refreshQueueTimeout?: number;     // default: 10_000 ms
  proactiveRefreshMargin?: number;  // default: 60_000 ms

  // Cross-subdomain cookie session (v2.31+)
  enableCookieSession?: boolean;    // default: false

  // Multi-tenant UX
  autoSwitchSingleTenant?: boolean;
  onTenantSelectionRequired?: (tenants: UserTenantMembership[]) => void;

  // SSR
  initialRoles?: Role[];
}
```

---

## Hooks

```ts
// Auth
const auth = useAuth(); // throws if not inside AuthProvider
const optional = useAuthOptional(); // null if not inside
const state = useAuthState();
const actions = useAuthActions();

// Tenant
const tenant = useTenant();
const optional = useTenantOptional();
const { settings, settingsSchema, isLoading, error, validateSettings } = useSettings();
const info = useTenantInfo();

// App
const app = useApp();
const api = useApi();

// Features & Subscriptions
const flags = useFeatureFlags();
const sub = useSubscription();

// Routing (RFC-005)
const routing = useRouting();
const optional = useRoutingOptional();
```

---

## Components

```ts
import {
  // Guards
  Protected,
  ProtectedRoute,
  TenantRoute,
  LandingRoute,

  // Zone routing (RFC-005)
  ZoneRoute,
  TenantZone,
  PublicZone,
  AuthenticatedZone,
  GuestZone,
  AdminZone,

  // Forms
  LoginForm,
  SignupForm,
  MagicLinkForm,
  MagicLinkVerify,
  PasswordRecoveryForm,
  TenantSelector,
  AppLoader,
  FeatureFlag,
} from '@skylabs-digital/react-identity-access';
```

---

## Services (advanced — used by the harness, not typical apps)

```ts
import {
  SessionManager,
  HttpService,
  AuthApiService,
  UserApiService,
  TenantApiService,
  AppApiService,
  PermissionApiService,
  RoleApiService,
  FeatureFlagApiService,
  SubscriptionApiService,
} from '@skylabs-digital/react-identity-access';
```

### SessionManager (harness-relevant parts)

```ts
sessionManager.setTokens({ accessToken, refreshToken, expiresIn });
sessionManager.getTokens();
sessionManager.getAccessToken();
sessionManager.hasValidSession();
sessionManager.getValidAccessToken(); // may trigger refresh
sessionManager.clearSession();
sessionManager.clearTokens();
sessionManager.attemptCookieSessionRestore();
sessionManager.destroy();
SessionManager.resetAllInstances(); // test-only cleanup
```

---

## Errors

```ts
import { SessionExpiredError, TokenRefreshTimeoutError, TokenRefreshError } from '@skylabs-digital/react-identity-access';
```

- `SessionExpiredError.reason` — `'token_invalid' | 'token_expired' | 'token_revoked' | 'token_reused'`
- Fatal reasons (`token_revoked`, `token_reused`) clear the session immediately; no retry.

---

## Behavioral guarantees (from docs)

These are the promises the library makes. Fuzz flows should try to break them; regression flows should verify them.

1. **Single refresh in flight** — concurrent `getValidAccessToken()` calls share one refresh request.
2. **Multi-tab coordination** — Web Locks serialize refresh across tabs on the same browser.
3. **Session generation counter** — refresh responses arriving after a `clearSession()` are discarded.
4. **Circuit breaker** — after 3 consecutive background refresh failures, the session is marked expired and `onSessionExpired` fires once.
5. **Proactive refresh** — the library refreshes 60 s before `exp` by default (configurable).
6. **Cookie session restore** — with `enableCookieSession: true`, `attemptCookieSessionRestore()` sends the HttpOnly cookie and hydrates if successful.
7. **No `_auth` URL transfer** — as of v2.31 the library does not read or write `?_auth=...` query parameters. Any such code path is a bug.

---

## What is NOT public

Things that appear in `src/` but are not exported:
- Internal singleton registry
- `sessionGeneration` counter
- `consecutiveBackgroundFailures`
- `storageKey` default

Flows must not assert on these directly — they're only observable through side effects of the public methods.
