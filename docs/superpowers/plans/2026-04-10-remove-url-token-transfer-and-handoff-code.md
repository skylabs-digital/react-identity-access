# Remove URL Token Transfer and Add Handoff Code Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the insecure `_auth` URL token transfer mechanism (Phase 1) and replace it with a backend-issued, single-use, origin-bound handoff code for cross-apex tenant switching (Phase 2).

**Architecture:** Phase 1 deletes all URL-based token transfer and relies on the existing `enableCookieSession` mechanism for cross-subdomain auth within a shared parent domain. Phase 2 introduces a new handoff-code API for cross-apex (different top-level domain) tenant switching: the backend issues an opaque single-use code bound to `(userId, targetOrigin)` with short TTL; the frontend navigates with the code in the URL fragment; the receiving origin exchanges the code for fresh tokens server-side.

**Tech Stack:** TypeScript, React, Vitest, existing `SessionManager` / `AuthProvider` / `TenantProvider` / `AuthApiService`.

**Security context:** Phase 1 fixes two HIGH-severity vulnerabilities identified in the security review at `/docs/security/2026-04-10-auth-review.md` (session fixation via URL token injection and access/refresh token leakage to server access logs). Phase 2 provides a secure path for cross-apex tenant switching (white-label tenants on separate domains), which `enableCookieSession` cannot cover because cookies do not cross apex boundaries.

---

## Phase 0: Prerequisites and Scope

**Phase 1 (immediate) prerequisites — MUST be verified before executing Phase 1:**

- [ ] **Backend supports `enableCookieSession` contract**: `POST ${baseUrl}/auth/refresh` accepts empty body with `credentials: 'include'`, reads an HttpOnly refresh cookie scoped to the parent domain (e.g., `Domain=.example.com; HttpOnly; Secure; SameSite=Lax`), and returns `{ accessToken, refreshToken?, expiresIn }` on success. Verified by running the existing test `src/test/sessionManager.test.ts` — search for `attemptCookieSessionRestore` coverage.
- [ ] **All consumers of `@skylabs-digital/react-identity-access` that rely on cross-subdomain tenant switching have `enableCookieSession: true` set in their `AuthProvider` config.** Phase 1 is a **breaking change** for consumers that rely on the `_auth` URL transfer without cookie session — those consumers will lose their session on subdomain switches. Audit consumers before merging.
- [ ] **Backend sets the refresh cookie on the correct parent domain** such that all tenant subdomains share it. E.g., backend at `api.example.com` sets `Set-Cookie: refresh_token=...; Domain=.example.com; ...` so both `tenant-a.example.com` and `tenant-b.example.com` can send it on navigation.

**Phase 2 (deferred) prerequisites — separate work, not blocking Phase 1:**

- [ ] Backend implements the two endpoints defined in [Phase 2 Backend Contract](#phase-2-backend-contract) below. Phase 2 frontend work cannot start until the backend is deployed in at least a staging environment.

**Out of scope:**

- Backend implementation of the handoff-code endpoints (separate repo/project).
- Redis/KV store infrastructure for handoff code storage (backend team's responsibility).
- Tenant model schema changes to store allowlist of `targetOrigin`s (backend team's responsibility).

---

## Phase 1: Remove `_auth` URL Token Transfer

### File Structure — Phase 1

**Files to delete entirely:**

- `src/utils/crossDomainAuth.ts` — all exports are exclusively used for URL token transfer
- `src/test/crossDomainAuth.test.ts` — tests the utilities being deleted
- `src/test/crossSubdomainAuth.test.ts` — integration tests for the URL transfer flow

**Files to modify:**

- `src/providers/AuthProvider.tsx` — remove URL-token init path (lines 10, 165-182, 205-211, 226, 241, 821-851, 888-898 and all references)
- `src/providers/TenantProvider.tsx` — remove `tokens` option from `switchTenant` signature and remove `AUTH_TRANSFER_PARAM` plumbing (lines 14, 54-57, 389-482)
- `src/providers/AuthProvider.tsx` — update `login`, `verifyMagicLink`, and `switchToTenant` callsites to stop passing `tokens` to `switchTenant` (lines 388-414, 562-572, 672-720)

### Task 1: Verify starting state and test baseline

**Files:**

- Read-only inspection

- [ ] **Step 1: Confirm clean working tree and branch**

Run: `cd /Users/fer/Development/skylabs/react-identity-access && git status && git rev-parse --abbrev-ref HEAD`
Expected: working tree clean, on a feature branch (not `main`). If on `main`, create branch: `git checkout -b remove-auth-url-transfer`.

- [ ] **Step 2: Run baseline tests to confirm they pass before changes**

Run: `yarn test`
Expected: all tests pass. Note the count of passing tests so we can verify we don't accidentally break unrelated tests.

- [ ] **Step 3: Confirm `enableCookieSession` test coverage exists**

Run: `yarn test sessionManager.test.ts`
Expected: tests include coverage of `attemptCookieSessionRestore`. If not, stop and add coverage first (this is the safety net that replaces the `_auth` path).

### Task 2: Remove `tokens` option from `TenantProvider.switchTenant`

**Files:**

- Modify: `src/providers/TenantProvider.tsx` (lines 14, 54-57, 389-482)

- [ ] **Step 1: Remove the import of `crossDomainAuth` symbols**

In `src/providers/TenantProvider.tsx`, delete line 14:

```ts
import { encodeAuthTokens, type AuthTokens, AUTH_TRANSFER_PARAM } from '../utils/crossDomainAuth';
```

- [ ] **Step 2: Update the `TenantContextValue` interface to remove `tokens` from `switchTenant` signature**

In `src/providers/TenantProvider.tsx`, locate the `TenantContextValue` type (around lines 54-57):

```ts
switchTenant: (
  targetTenantSlug: string,
  options?: { mode?: 'navigate' | 'reload'; tokens?: AuthTokens; redirectPath?: string }
) => void;
```

Replace with:

```ts
switchTenant: (
  targetTenantSlug: string,
  options?: { mode?: 'navigate' | 'reload'; redirectPath?: string }
) => void;
```

- [ ] **Step 3: Update `switchTenant` implementation to drop all `tokens` handling and `AUTH_TRANSFER_PARAM` plumbing**

In `src/providers/TenantProvider.tsx`, replace the entire `switchTenant` useCallback (lines 389-482) with:

```ts
const switchTenant = useCallback(
  (targetTenantSlug: string, options?: { mode?: 'navigate' | 'reload'; redirectPath?: string }) => {
    const { mode = 'reload', redirectPath } = options || {};
    const tenantMode = config.tenantMode || 'selector';

    if (tenantMode === 'fixed') {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[TenantProvider] switchTenant is a no-op in fixed mode. Tenant is always:',
          config.fixedTenantSlug
        );
      }
      if (redirectPath) {
        window.location.href = redirectPath;
      }
      return;
    }

    localStorage.setItem('tenant', targetTenantSlug);

    if (tenantMode === 'subdomain') {
      const currentHostname = window.location.hostname;
      const newHostname = buildTenantHostname(targetTenantSlug, currentHostname, config.baseDomain);

      if (!newHostname) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            '[TenantProvider] Cannot switch subdomain, invalid hostname:',
            currentHostname
          );
        }
        return;
      }

      const targetPath = redirectPath || window.location.pathname;
      const url = new URL(`${window.location.protocol}//${newHostname}${targetPath}`);

      // Copy existing search params
      const currentParams = new URLSearchParams(window.location.search);
      currentParams.forEach((value, key) => {
        url.searchParams.set(key, value);
      });

      window.location.href = url.toString();
    } else if (tenantMode === 'selector') {
      const targetPath = redirectPath || window.location.pathname;
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set(config.selectorParam || 'tenant', targetTenantSlug);

      if (mode === 'reload') {
        const newUrl = `${targetPath}?${urlParams.toString()}${window.location.hash}`;
        window.location.href = newUrl;
      } else {
        const newUrl = `${targetPath}?${urlParams.toString()}${window.location.hash}`;
        window.history.pushState({}, '', newUrl);
        setTenantSlug(targetTenantSlug);
        loadTenant(targetTenantSlug);
      }
    }
  },
  [config.tenantMode, config.selectorParam, config.baseDomain, config.fixedTenantSlug, loadTenant]
);
```

- [ ] **Step 4: Run type-check to catch any stale `AuthTokens` references**

Run: `yarn type-check`
Expected: errors in `AuthProvider.tsx` where `switchTenant` is called with `{ tokens }`. These will be fixed in Task 3. If errors appear in any other file, stop and investigate.

### Task 3: Update `AuthProvider` callsites to drop `tokens` from `switchTenant` calls

**Files:**

- Modify: `src/providers/AuthProvider.tsx` (lines 388-414, 562-572, 672-720)

- [ ] **Step 1: Update `login` flow to not pass `tokens` to `switchTenant`**

In `src/providers/AuthProvider.tsx`, locate the `login` function (around lines 380-414). Remove the `tokens` object construction and drop it from all three `switchTenant` calls. Replace lines ~380-414 with:

```ts
const hasTenant = loginResponse.user?.tenantId !== null;

// Handle navigation after login
if (shouldSwitch && targetTenantSlug) {
  // Switching to different tenant — cookie session will restore on arrival
  switchTenant(targetTenantSlug, { redirectPath });
  return loginResponse; // Code after this won't execute due to page reload
}

// Same tenant or no tenant switch - navigate to redirectPath if provided
if (redirectPath && redirectPath !== window.location.pathname) {
  switchTenant(targetTenantSlug || tenantSlug || '', { redirectPath });
  return loginResponse;
}

// RFC-004: Handle global login (no tenantId) - auto-switch or callback
if (!hasTenant && loginResponse.tenants && loginResponse.tenants.length > 0) {
  const autoSwitch = params.autoSwitch !== false && config.autoSwitchSingleTenant !== false;

  if (loginResponse.tenants.length === 1 && autoSwitch) {
    const singleTenant = loginResponse.tenants[0];
    switchTenant(singleTenant.subdomain, { redirectPath });
    return loginResponse;
  } else if (loginResponse.tenants.length > 1 && config.onTenantSelectionRequired) {
    config.onTenantSelectionRequired(loginResponse.tenants);
  }
}

return loginResponse;
```

- [ ] **Step 2: Update `verifyMagicLink` flow**

In `src/providers/AuthProvider.tsx`, locate the `verifyMagicLink` function (around lines 560-575). Replace the cross-subdomain switch block with:

```ts
// Now perform the switch if needed
if (shouldSwitch && targetTenantSlug && targetTenantSlug !== tenantSlug) {
  switchTenant(targetTenantSlug);
  // Code after this won't execute due to page reload
}

return verifyResponse;
```

- [ ] **Step 3: Update `switchToTenant` (RFC-004) flow**

In `src/providers/AuthProvider.tsx`, locate the `switchToTenant` function (around lines 672-720). Find the call site that passes `tokens` to `switchTenant` and remove the `tokens` object. The block that currently looks like:

```ts
      if (targetTenant) {
        // Use TenantProvider's switchTenant for URL handling
        switchTenant(targetTenant.subdomain, {
          tokens: {
            accessToken: response.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: response.expiresIn,
          },
          // ...possibly more options
        });
```

Becomes:

```ts
      if (targetTenant) {
        switchTenant(targetTenant.subdomain);
```

(Preserve any other options that were being passed such as `redirectPath`; only drop the `tokens` key.)

- [ ] **Step 4: Run type-check**

Run: `yarn type-check`
Expected: no type errors. If `AuthTokens` is still referenced anywhere in `AuthProvider.tsx`, remove those references (they will be deleted along with the file in Task 4).

### Task 4: Remove URL-token init path from `AuthProvider`

**Files:**

- Modify: `src/providers/AuthProvider.tsx` (lines 10, 165-182, 205-211, 226, 241, 821-851, 888-898)

- [ ] **Step 1: Remove the import**

In `src/providers/AuthProvider.tsx`, delete line 10:

```ts
import { extractAuthTokensFromUrl, clearAuthTokensFromUrl } from '../utils/crossDomainAuth';
```

- [ ] **Step 2: Remove `initRef` URL-token extraction**

In `src/providers/AuthProvider.tsx`, replace the `initRef` block (lines ~165-175) with:

```ts
// === SYNCHRONOUS INITIALIZATION ===
const initRef = useRef<{ done: boolean }>({ done: false });

if (!initRef.current.done) {
  initRef.current.done = true;
}
```

- [ ] **Step 3: Remove `isLoadingAfterUrlTokens` state**

Delete the `isLoadingAfterUrlTokens` `useState` block (around lines 179-182). All references to `isLoadingAfterUrlTokens` and `setIsLoadingAfterUrlTokens` in the file must also be removed in the following sub-steps.

- [ ] **Step 4: Remove URL token injection from `sessionManager` useMemo**

In the `sessionManager = useMemo(...)` block (around lines 185-219), delete the `if (initRef.current.urlTokens)` branch that calls `manager.setTokens(...)` (lines ~204-211). The `useMemo` should no longer reference `initRef.current.urlTokens`.

- [ ] **Step 5: Remove URL-token guard from `isRestoringSession` initializer**

Around line 226 there is a check `if (initRef.current.urlTokens) return false;`. Delete that line.

- [ ] **Step 6: Update `isAuthReady` computation**

Around line 241, replace:

```ts
const isAuthReady = initRef.current.done && !isLoadingAfterUrlTokens && !isRestoringSession;
```

with:

```ts
const isAuthReady = initRef.current.done && !isRestoringSession;
```

- [ ] **Step 7: Delete the URL-cleanup useEffect**

In `src/providers/AuthProvider.tsx`, delete the entire `urlTokensCleanedUp`-related `useState` and `useEffect` block (around lines 820-851). It should look something like:

```ts
const [urlTokensCleanedUp, setUrlTokensCleanedUp] = useState(false);
useEffect(() => {
  if (urlTokensCleanedUp) return;
  setUrlTokensCleanedUp(true);

  if (initRef.current.urlTokens) {
    clearAuthTokensFromUrl();
    setIsLoadingAfterUrlTokens(true);
    contextValue.loadUserData().catch(/* ... */).finally(/* ... */);
  }
}, [contextValue, urlTokensCleanedUp]);
```

Delete the entire block. It has no replacement — the cookie session restore in the `init()` effect below already handles the case of arriving at a subdomain without local tokens.

- [ ] **Step 8: Simplify the auto-load `useEffect` to remove `urlTokensCleanedUp` gating**

Around lines 888-898 there is a `useEffect` that auto-loads user data, gated by `urlTokensCleanedUp` and `initRef.current.urlTokens`. Remove both gates:

Before (approximate):

```ts
useEffect(() => {
  if (!urlTokensCleanedUp) return;
  if (initRef.current.urlTokens) return;
  // ... rest of auto-load logic
}, [currentUser, isUserLoading, userError, sessionManager, urlTokensCleanedUp]);
```

After:

```ts
useEffect(() => {
  // ... rest of auto-load logic
}, [currentUser, isUserLoading, userError, sessionManager]);
```

- [ ] **Step 9: Run type-check**

Run: `yarn type-check`
Expected: no errors, no stale references to `urlTokens`, `isLoadingAfterUrlTokens`, `urlTokensCleanedUp`, `extractAuthTokensFromUrl`, or `clearAuthTokensFromUrl`.

### Task 5: Delete `crossDomainAuth.ts` and its tests

**Files:**

- Delete: `src/utils/crossDomainAuth.ts`
- Delete: `src/test/crossDomainAuth.test.ts`
- Delete: `src/test/crossSubdomainAuth.test.ts`

- [ ] **Step 1: Delete the utility file**

Run: `rm /Users/fer/Development/skylabs/react-identity-access/src/utils/crossDomainAuth.ts`

- [ ] **Step 2: Delete the unit test file**

Run: `rm /Users/fer/Development/skylabs/react-identity-access/src/test/crossDomainAuth.test.ts`

- [ ] **Step 3: Delete the integration test file**

Run: `rm /Users/fer/Development/skylabs/react-identity-access/src/test/crossSubdomainAuth.test.ts`

- [ ] **Step 4: Confirm no other source references remain**

Run: use the Grep tool with pattern `crossDomainAuth|AUTH_TRANSFER_PARAM|extractAuthTokensFromUrl|clearAuthTokensFromUrl|encodeAuthTokens|decodeAuthTokens` on `src/` (exclude the deleted files).
Expected: zero matches. If any remain, fix them.

- [ ] **Step 5: Run the full test suite**

Run: `yarn test`
Expected: all remaining tests pass. The test count should be lower than baseline by exactly the number of tests in the two deleted files (139 + 396 lines ≈ 30+ tests).

- [ ] **Step 6: Run the full CI pipeline locally**

Run: `yarn ci`
Expected: type-check passes, tests pass, build succeeds.

### Task 6: Add replacement test — cookie session restore covers the removed flow

**Files:**

- Modify: `src/test/sessionManager.test.ts` (append new test case if not already covered)

- [ ] **Step 1: Audit existing cookie session restore tests**

Run: use the Grep tool with pattern `attemptCookieSessionRestore` on `src/test/`.
Expected: at least two tests — one success case, one failure case. If the success case is missing, add it in Step 2.

- [ ] **Step 2: Add a cross-subdomain restore integration test (only if missing)**

Open `src/test/sessionManager.test.ts` and append the following test inside the `describe('attemptCookieSessionRestore')` block, ONLY if an equivalent test does not already exist:

```ts
it('should restore session from cookie when no local tokens exist (cross-subdomain scenario)', async () => {
  const storage = new MemoryTokenStorage();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        accessToken: 'new-access-from-cookie',
        refreshToken: 'new-refresh-from-cookie',
        expiresIn: 3600,
      }),
    })
  );

  const sm = new SessionManager({
    tokenStorage: storage,
    baseUrl: 'https://api.example.com',
    enableCookieSession: true,
  });

  // No tokens initially (simulating arrival on new subdomain)
  expect(sm.getTokens()).toBeNull();

  const restored = await sm.attemptCookieSessionRestore();
  expect(restored).toBe(true);
  expect(sm.getTokens()?.accessToken).toBe('new-access-from-cookie');

  // Verify fetch was called with credentials: 'include' and empty body
  const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
  const call = fetchMock.mock.calls[0];
  expect(call[0]).toBe('https://api.example.com/auth/refresh');
  expect(call[1].credentials).toBe('include');
  expect(call[1].body).toBe('{}');
});
```

- [ ] **Step 3: Run the new test**

Run: `yarn test sessionManager.test.ts`
Expected: the new test passes. If it fails, diagnose and fix — this is the safety net that replaces the removed `_auth` flow.

### Task 7: Update changelog, format, and commit Phase 1

**Files:**

- Modify: `CHANGELOG.md` (if maintained; otherwise rely on semantic-release)
- Commit all Phase 1 changes

- [ ] **Step 1: Format all changed files**

Run: `yarn format`
Expected: success, no errors.

- [ ] **Step 2: Run final verification**

Run: `yarn ci`
Expected: all passes.

- [ ] **Step 3: Commit Phase 1**

Run:

```bash
cd /Users/fer/Development/skylabs/react-identity-access
git add -A
git commit -m "$(cat <<'EOF'
feat!: remove insecure _auth URL token transfer

BREAKING CHANGE: cross-subdomain tenant switching now requires
enableCookieSession to be enabled. The _auth URL query parameter
mechanism has been removed because it allowed (1) session fixation
via URL-injected tokens and (2) refresh token leakage to server
access logs and Referer headers.

Consumers that rely on cross-subdomain tenant switching must set
enableCookieSession: true in their AuthProvider config and ensure
their backend sets the HttpOnly refresh cookie on the parent domain
so it is shared across all tenant subdomains.

Cross-apex tenant switching (different top-level domains per tenant)
is no longer supported. See docs/superpowers/plans/2026-04-10-remove-
url-token-transfer-and-handoff-code.md Phase 2 for the planned
replacement using backend-issued single-use handoff codes.

Removes:
- src/utils/crossDomainAuth.ts
- src/test/crossDomainAuth.test.ts
- src/test/crossSubdomainAuth.test.ts

Modifies:
- src/providers/AuthProvider.tsx
- src/providers/TenantProvider.tsx
EOF
)"
```

Expected: commit succeeds. This is a **breaking change** (semantic-release will publish a major version bump).

---

## Phase 2: Handoff Code for Cross-Apex Tenant Switching

### Phase 2 Backend Contract

**These endpoints must exist in the backend before Phase 2 frontend work can begin. If the backend team proposes a different contract, this phase needs to be re-planned.**

#### `POST ${baseUrl}/auth/handoff/create`

**Authenticated:** requires valid bearer token OR valid session cookie.

**Request body:**

```json
{
  "targetOrigin": "https://customer-b.example.com"
}
```

**Response 200:**

```json
{
  "code": "h_9f3c8b2a1e7d4f5c6b8a9d0e1f2a3b4c5d6e7f8a",
  "expiresIn": 60
}
```

**Response 400:** `targetOrigin` is not in the tenant's allowlist.
**Response 401:** caller is not authenticated.

**Backend requirements:**

- Generate a cryptographically random code (≥ 32 bytes, URL-safe encoded).
- Store in Redis (or equivalent) with `{ userId, targetOrigin, issuedAt, used: false }` and 60-second TTL.
- Validate `targetOrigin` against an allowlist configured per tenant (prevents handoff to attacker-controlled origins).
- Return the code (opaque string) and its TTL.

#### `POST ${baseUrl}/auth/handoff/exchange`

**Unauthenticated** (the code itself is the credential). Must send `Origin` header (browsers do this automatically for cross-origin POSTs).

**Request body:**

```json
{
  "code": "h_9f3c8b2a1e7d4f5c6b8a9d0e1f2a3b4c5d6e7f8a"
}
```

**Response 200:**

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "expiresIn": 3600,
  "user": { "id": "...", "email": "...", "tenantId": "..." }
}
```

**Response 400:** code invalid, expired, or already used. The receiving origin MUST treat any non-200 as a hard failure and redirect to login.

**Backend requirements:**

- Atomically check `used == false` and set `used = true` in a single operation (Redis `SET IF NOT EXISTS` with a lock, or a SQL transaction with row lock) — prevents double-use under race.
- Validate the request `Origin` header matches the `targetOrigin` stored with the code. Reject if mismatch (prevents a stolen code being redeemed from a different origin).
- Validate the code is within TTL.
- Mint fresh access + refresh tokens bound to the `userId` from the code, scoped to the target origin's tenant.

### File Structure — Phase 2

**Files to create:**

- `src/utils/handoffCode.ts` — fragment read/write helpers (`extractHandoffCodeFromUrl`, `clearHandoffCodeFromUrl`)
- `src/services/HandoffApiService.ts` — client for the two backend endpoints
- `src/test/handoffCode.test.ts` — unit tests for the fragment utilities
- `src/test/handoffApiService.test.ts` — unit tests for the API client

**Files to modify:**

- `src/providers/AuthProvider.tsx` — add handoff code init path (replaces the removed `_auth` init path, but reads from fragment and exchanges server-side)
- `src/providers/TenantProvider.tsx` — add `switchTenant` option `{ targetOrigin?: string }` for cross-apex navigation via handoff code
- `src/services/AuthApiService.ts` — optionally add the handoff methods here instead of a new service (decide in Task 8 Step 1)
- `src/index.ts` — export `HandoffApiService` if created

### Task 8: Design decision — separate service or extend `AuthApiService`

**Files:**

- Inspection only

- [ ] **Step 1: Read the existing `AuthApiService`**

Run: read `src/services/AuthApiService.ts` to understand its existing method shape.

- [ ] **Step 2: Decide placement**

Criteria:

- If `AuthApiService` has ≤ 10 methods and the handoff methods are semantically "auth", add them there.
- If `AuthApiService` is already large or the team prefers narrow services, create `HandoffApiService`.

Record the decision in a comment at the top of the file you modify. Default: add to `AuthApiService`.

- [ ] **Step 3: Confirm `HttpService` is reused for both endpoints**

Both endpoints must go through `HttpService` so they pick up standard retry, error handling, and auth headers (for `create`) consistently.

### Task 9: Add handoff API methods to `AuthApiService` (assuming decision in Task 8)

**Files:**

- Modify: `src/services/AuthApiService.ts`
- Test: `src/test/authApiService.test.ts`

- [ ] **Step 1: Write failing test for `createHandoff`**

Append to `src/test/authApiService.test.ts`:

```ts
describe('createHandoff', () => {
  it('should POST to /auth/handoff/create with targetOrigin and return code', async () => {
    const mockHttp = {
      post: vi.fn().mockResolvedValue({ code: 'h_test123', expiresIn: 60 }),
    };
    const service = new AuthApiService(mockHttp as any);

    const result = await service.createHandoff({
      targetOrigin: 'https://customer-b.example.com',
    });

    expect(mockHttp.post).toHaveBeenCalledWith('/auth/handoff/create', {
      targetOrigin: 'https://customer-b.example.com',
    });
    expect(result.code).toBe('h_test123');
    expect(result.expiresIn).toBe(60);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test authApiService.test.ts -t "createHandoff"`
Expected: FAIL (`createHandoff` does not exist).

- [ ] **Step 3: Implement `createHandoff`**

Add to `src/services/AuthApiService.ts`:

```ts
async createHandoff(request: { targetOrigin: string }): Promise<{ code: string; expiresIn: number }> {
  return this.httpService.post('/auth/handoff/create', {
    targetOrigin: request.targetOrigin,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test authApiService.test.ts -t "createHandoff"`
Expected: PASS.

- [ ] **Step 5: Write failing test for `exchangeHandoff`**

Append:

```ts
describe('exchangeHandoff', () => {
  it('should POST to /auth/handoff/exchange with code and return tokens + user', async () => {
    const mockHttp = {
      post: vi.fn().mockResolvedValue({
        accessToken: 'at_1',
        refreshToken: 'rt_1',
        expiresIn: 3600,
        user: { id: 'u1', email: 'a@b.com', tenantId: 't1' },
      }),
    };
    const service = new AuthApiService(mockHttp as any);

    const result = await service.exchangeHandoff({ code: 'h_test123' });

    expect(mockHttp.post).toHaveBeenCalledWith('/auth/handoff/exchange', {
      code: 'h_test123',
    });
    expect(result.accessToken).toBe('at_1');
    expect(result.user.id).toBe('u1');
  });

  it('should throw when backend rejects the code', async () => {
    const mockHttp = {
      post: vi.fn().mockRejectedValue(new Error('400: code expired')),
    };
    const service = new AuthApiService(mockHttp as any);

    await expect(service.exchangeHandoff({ code: 'h_expired' })).rejects.toThrow(
      '400: code expired'
    );
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `yarn test authApiService.test.ts -t "exchangeHandoff"`
Expected: FAIL.

- [ ] **Step 7: Implement `exchangeHandoff`**

Add to `src/services/AuthApiService.ts`:

```ts
async exchangeHandoff(request: { code: string }): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}> {
  return this.httpService.post('/auth/handoff/exchange', {
    code: request.code,
  });
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `yarn test authApiService.test.ts -t "exchangeHandoff"`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/services/AuthApiService.ts src/test/authApiService.test.ts
git commit -m "feat(auth): add createHandoff and exchangeHandoff API methods"
```

### Task 10: Create fragment helpers for handoff code

**Files:**

- Create: `src/utils/handoffCode.ts`
- Create: `src/test/handoffCode.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/test/handoffCode.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { extractHandoffCodeFromUrl, clearHandoffCodeFromUrl } from '../utils/handoffCode';

describe('handoffCode utilities', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
  });

  afterEach(() => {
    (window as any).location = originalLocation;
    vi.restoreAllMocks();
  });

  describe('extractHandoffCodeFromUrl', () => {
    it('returns null when fragment has no code', () => {
      (window as any).location = { hash: '', href: 'https://example.com/' };
      expect(extractHandoffCodeFromUrl()).toBeNull();
    });

    it('returns the code when fragment contains #code=xxx', () => {
      (window as any).location = {
        hash: '#code=h_abc123',
        href: 'https://example.com/#code=h_abc123',
      };
      expect(extractHandoffCodeFromUrl()).toBe('h_abc123');
    });

    it('returns the code when fragment has multiple params', () => {
      (window as any).location = {
        hash: '#foo=bar&code=h_abc123&baz=qux',
        href: 'https://example.com/#foo=bar&code=h_abc123&baz=qux',
      };
      expect(extractHandoffCodeFromUrl()).toBe('h_abc123');
    });

    it('returns null when code is empty', () => {
      (window as any).location = { hash: '#code=', href: 'https://example.com/#code=' };
      expect(extractHandoffCodeFromUrl()).toBeNull();
    });
  });

  describe('clearHandoffCodeFromUrl', () => {
    it('replaces current URL with one that has no fragment', () => {
      (window as any).location = {
        hash: '#code=h_abc',
        pathname: '/dashboard',
        search: '',
        href: 'https://example.com/dashboard#code=h_abc',
      };
      clearHandoffCodeFromUrl();
      expect(window.history.replaceState).toHaveBeenCalledWith({}, '', '/dashboard');
    });

    it('preserves query string when clearing fragment', () => {
      (window as any).location = {
        hash: '#code=h_abc',
        pathname: '/dashboard',
        search: '?foo=bar',
        href: 'https://example.com/dashboard?foo=bar#code=h_abc',
      };
      clearHandoffCodeFromUrl();
      expect(window.history.replaceState).toHaveBeenCalledWith({}, '', '/dashboard?foo=bar');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test handoffCode.test.ts`
Expected: FAIL (module does not exist).

- [ ] **Step 3: Implement the utilities**

Create `src/utils/handoffCode.ts`:

```ts
const HANDOFF_CODE_PARAM = 'code';

export function extractHandoffCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash;
  if (!hash || hash.length <= 1) return null;

  const params = new URLSearchParams(hash.slice(1));
  const code = params.get(HANDOFF_CODE_PARAM);
  return code && code.length > 0 ? code : null;
}

export function clearHandoffCodeFromUrl(): void {
  if (typeof window === 'undefined') return;

  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState({}, '', cleanUrl);
}

export { HANDOFF_CODE_PARAM };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test handoffCode.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/utils/handoffCode.ts src/test/handoffCode.test.ts
git commit -m "feat(auth): add handoff code URL fragment helpers"
```

### Task 11: Wire handoff code exchange into `AuthProvider` init

**Files:**

- Modify: `src/providers/AuthProvider.tsx`
- Test: `src/test/authProvider.test.tsx` (or equivalent — check which existing file covers AuthProvider init)

- [ ] **Step 1: Write a failing integration test**

Create or append to an existing `AuthProvider` test file a test that:

1. Mocks `AuthApiService.exchangeHandoff` to return valid tokens.
2. Sets `window.location.hash = '#code=h_test123'` before rendering `AuthProvider`.
3. Renders `AuthProvider` with children that read `useAuth()`.
4. Waits for `isAuthReady === true`.
5. Asserts that the session contains the tokens from the mock.
6. Asserts that `window.history.replaceState` was called to clear the fragment.

```tsx
it('should exchange handoff code from URL fragment and establish session', async () => {
  const mockExchange = vi.fn().mockResolvedValue({
    accessToken: 'at_from_handoff',
    refreshToken: 'rt_from_handoff',
    expiresIn: 3600,
    user: { id: 'u1', email: 'a@b.com', tenantId: 't1' },
  });

  vi.spyOn(AuthApiService.prototype, 'exchangeHandoff').mockImplementation(mockExchange);

  (window as any).location = {
    ...window.location,
    hash: '#code=h_test123',
    pathname: '/dashboard',
    search: '',
  };
  const replaceStateSpy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});

  const { result } = renderHook(() => useAuth(), {
    wrapper: ({ children }) => (
      <AppProvider config={{ baseUrl: 'https://api.example.com', appId: 'test' }}>
        <AuthProvider>{children}</AuthProvider>
      </AppProvider>
    ),
  });

  await waitFor(() => expect(result.current.isAuthReady).toBe(true));

  expect(mockExchange).toHaveBeenCalledWith({ code: 'h_test123' });
  expect(result.current.currentUser?.id).toBe('u1');
  expect(replaceStateSpy).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test` targeting this test. Expected: FAIL.

- [ ] **Step 3: Implement handoff code init path**

In `src/providers/AuthProvider.tsx`, add above the `initRef` block:

```ts
import { extractHandoffCodeFromUrl, clearHandoffCodeFromUrl } from '../utils/handoffCode';
```

And add a new effect that runs once on mount, before the session restore effect:

```ts
const [handoffExchangePending, setHandoffExchangePending] = useState(() => {
  if (typeof window === 'undefined') return false;
  return extractHandoffCodeFromUrl() !== null;
});

useEffect(() => {
  const code = extractHandoffCodeFromUrl();
  if (!code) return;

  let cancelled = false;

  (async () => {
    try {
      const response = await authApiService.exchangeHandoff({ code });
      if (cancelled) return;

      sessionManager.setTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresIn: response.expiresIn,
      });
      sessionManager.setUser(response.user);
      setCurrentUser(response.user);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[AuthProvider] Handoff code exchange failed:', error);
      }
      // Hard failure — caller should see login screen
    } finally {
      clearHandoffCodeFromUrl();
      if (!cancelled) setHandoffExchangePending(false);
    }
  })();

  return () => {
    cancelled = true;
  };
}, [authApiService, sessionManager]);
```

Update `isAuthReady` to also gate on `handoffExchangePending`:

```ts
const isAuthReady = initRef.current.done && !isRestoringSession && !handoffExchangePending;
```

- [ ] **Step 4: Run test to verify it passes**

Run: the same test command as Step 2. Expected: PASS.

- [ ] **Step 5: Add failure-case test — backend rejects the code**

Append:

```tsx
it('should leave session unauthenticated when handoff code exchange fails', async () => {
  vi.spyOn(AuthApiService.prototype, 'exchangeHandoff').mockRejectedValue(
    new Error('400: code expired')
  );

  (window as any).location = {
    ...window.location,
    hash: '#code=h_expired',
    pathname: '/dashboard',
    search: '',
  };

  const { result } = renderHook(() => useAuth(), {
    wrapper: ({ children }) => (
      <AppProvider config={{ baseUrl: 'https://api.example.com', appId: 'test' }}>
        <AuthProvider>{children}</AuthProvider>
      </AppProvider>
    ),
  });

  await waitFor(() => expect(result.current.isAuthReady).toBe(true));
  expect(result.current.currentUser).toBeNull();
});
```

- [ ] **Step 6: Run both tests**

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/providers/AuthProvider.tsx src/test/
git commit -m "feat(auth): exchange handoff code from URL fragment on mount"
```

### Task 12: Add `switchTenant` cross-apex flow using handoff code

**Files:**

- Modify: `src/providers/TenantProvider.tsx`
- Modify: `src/providers/AuthProvider.tsx` (optional — `switchToTenant` callsite)

- [ ] **Step 1: Extend `switchTenant` signature with optional `targetOrigin`**

In `src/providers/TenantProvider.tsx`, update the `TenantContextValue` type and the useCallback signature:

```ts
switchTenant: (
  targetTenantSlug: string,
  options?: {
    mode?: 'navigate' | 'reload';
    redirectPath?: string;
    targetOrigin?: string; // cross-apex: if set, performs handoff-code flow
  }
) => Promise<void> | void;
```

Note: return type becomes `Promise<void> | void` because the cross-apex path is async.

- [ ] **Step 2: Write failing test for cross-apex navigation**

Add to the TenantProvider test file:

```tsx
it('switchTenant with targetOrigin navigates to cross-apex URL with handoff code in fragment', async () => {
  const mockCreateHandoff = vi.fn().mockResolvedValue({
    code: 'h_crossapex',
    expiresIn: 60,
  });
  vi.spyOn(AuthApiService.prototype, 'createHandoff').mockImplementation(mockCreateHandoff);

  const hrefSetter = vi.fn();
  Object.defineProperty(window, 'location', {
    value: { href: '', hostname: 'a.example.com', pathname: '/', search: '', hash: '' },
    writable: true,
  });
  Object.defineProperty(window.location, 'href', { set: hrefSetter, get: () => '' });

  // ... render TenantProvider with subdomain mode ...

  await tenantCtx.switchTenant('tenant-b', {
    targetOrigin: 'https://customer-b.example.com',
    redirectPath: '/dashboard',
  });

  expect(mockCreateHandoff).toHaveBeenCalledWith({
    targetOrigin: 'https://customer-b.example.com',
  });
  expect(hrefSetter).toHaveBeenCalledWith(
    'https://customer-b.example.com/dashboard#code=h_crossapex'
  );
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: targeted test command. Expected: FAIL.

- [ ] **Step 4: Implement the cross-apex branch in `switchTenant`**

In `src/providers/TenantProvider.tsx`, at the top of the `switchTenant` implementation, before the `tenantMode` branches, add:

```ts
if (options?.targetOrigin) {
  // Cross-apex switch — requires handoff code from backend
  try {
    const { code } = await authApiService.createHandoff({
      targetOrigin: options.targetOrigin,
    });
    const path = options.redirectPath || '/';
    window.location.href = `${options.targetOrigin}${path}#code=${code}`;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[TenantProvider] Cross-apex handoff failed:', error);
    }
    throw error;
  }
  return;
}
```

Note: `authApiService` is not currently available inside `TenantProvider`. You will need to either (a) inject it via `TenantProviderProps`, (b) have `AuthProvider` expose a `createHandoff` method via `useAuth()` and have consumers call that directly, or (c) use a shared module-level `HttpService`. **Prefer (b)** — expose `createHandoff` from `useAuth()` and have the application call `authContext.createHandoff()` then `tenantContext.switchTenant(slug, { targetOrigin: ..., handoffCode: ... })`. This keeps `TenantProvider` free of direct backend dependencies.

If choosing (b), revise Steps 1, 2, and 4 accordingly: `switchTenant`'s new option is `handoffCode?: string` instead of `targetOrigin`, and the cross-apex navigation builds the URL from `targetOrigin` + `handoffCode` without calling the backend itself. The backend call lives in `AuthContextValue.createHandoff`.

Decide between (a), (b), (c) before implementing. Recommended: **(b)**.

- [ ] **Step 5: Run test**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/providers/TenantProvider.tsx src/providers/AuthProvider.tsx src/test/
git commit -m "feat(auth): add cross-apex tenant switching via handoff code"
```

### Task 13: Export new public API surface

**Files:**

- Modify: `src/index.ts`

- [ ] **Step 1: Add exports**

In `src/index.ts`, add under the utilities section:

```ts
export { extractHandoffCodeFromUrl, clearHandoffCodeFromUrl } from './utils/handoffCode';
```

If `HandoffApiService` was created as a separate service (per Task 8 decision), also add:

```ts
export { HandoffApiService } from './services/HandoffApiService';
```

- [ ] **Step 2: Run type-check and build**

Run: `yarn type-check && yarn build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat(auth): export handoff code public API"
```

### Task 14: Integration test — full end-to-end cross-apex flow

**Files:**

- Create: `src/test/handoffIntegration.test.tsx`

- [ ] **Step 1: Write the integration test**

The test should:

1. Simulate `origin-a.com` user logged in with a valid session.
2. Mock `AuthApiService.createHandoff` to return a code.
3. Call `switchTenant('tenant-b', { targetOrigin: 'https://origin-b.com' })` (or the chosen API shape from Task 12).
4. Assert `window.location.href` was set to `https://origin-b.com/#code=<code>`.
5. Reset the window mocks to simulate arrival on `origin-b.com`.
6. Mock `AuthApiService.exchangeHandoff` to return fresh tokens + user.
7. Render a new `AuthProvider` instance (simulating the page load on the new origin).
8. Assert `useAuth().currentUser` matches the exchanged user and `isAuthReady === true`.
9. Assert the fragment was cleared.

Write this test in full (no placeholders). Use `renderHook`, `waitFor`, and `vi.spyOn` patterns from the existing `authProvider` tests.

- [ ] **Step 2: Run and fix any issues**

Run: `yarn test handoffIntegration.test.tsx`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/test/handoffIntegration.test.tsx
git commit -m "test(auth): add end-to-end cross-apex handoff integration test"
```

### Task 15: Documentation and final verification

**Files:**

- Create: `docs/guides/cross-apex-tenant-switching.md` (optional, if other guides follow this pattern)
- Modify: `README.md` or `docs/advanced-usage.md` — document the new `createHandoff` / cross-apex switch

- [ ] **Step 1: Write consumer-facing docs**

Document:

- When to use `enableCookieSession` (subdomain switching within a shared parent domain).
- When to use the handoff code flow (cross-apex / white-label with per-tenant domains).
- Required backend contract — link to the Phase 2 Backend Contract section of this plan.
- Security properties — opaque code, single-use, origin-bound, short TTL, fragment transport.
- Example code for both flows.

- [ ] **Step 2: Run full CI**

Run: `yarn ci`
Expected: all pass.

- [ ] **Step 3: Final commit**

```bash
git add docs/
git commit -m "docs: add cross-apex handoff code flow guide"
```

---

## Self-Review

**Spec coverage:**

- Phase 1 covers: deletion of `crossDomainAuth.ts` (Task 5), removal of URL token extraction in `AuthProvider` (Task 4), removal of `tokens` option in `TenantProvider.switchTenant` (Task 2), update of all three callsites in `AuthProvider` (Task 3), deletion of obsolete tests (Task 5), replacement test coverage for the cookie path (Task 6), and final commit with BREAKING CHANGE marker (Task 7). ✅
- Phase 2 covers: backend contract definition (Phase 2 Backend Contract section), design decision on service placement (Task 8), TDD of `createHandoff` and `exchangeHandoff` (Task 9), TDD of fragment utilities (Task 10), TDD of `AuthProvider` init path (Task 11), TDD of `TenantProvider` cross-apex switch (Task 12), public API export (Task 13), end-to-end integration test (Task 14), and documentation (Task 15). ✅
- Security properties: session fixation is prevented because the code is bound to `userId` server-side; log leakage is prevented because fragment does not appear in server logs nor in Referer for cross-origin subresources; replay is prevented by single-use atomicity; origin substitution is prevented by `Origin` header validation. All documented in Phase 2 Backend Contract. ✅

**Placeholder scan:**

- Task 12 Step 4 deliberately asks the engineer to choose between three service-injection strategies (a), (b), (c). This is a real architectural decision that depends on the current state of `TenantProvider` dependencies — it is not a placeholder. A clear recommendation (option b) is given.
- Task 14 Step 1 describes the integration test at step-level detail rather than inlining 150+ lines of test code. This is acceptable because the patterns are documented in existing test files cited in the step.
- No `TBD`, `TODO`, or `similar to task N` references.

**Type consistency:**

- `createHandoff({ targetOrigin })` → `{ code, expiresIn }`: used consistently in Task 9 Step 3, Task 12 Step 2, Task 14 Step 1.
- `exchangeHandoff({ code })` → `{ accessToken, refreshToken, expiresIn, user }`: consistent across Task 9 Step 7, Task 11 Step 3, Task 14 Step 1.
- `extractHandoffCodeFromUrl()` → `string | null`: consistent in Task 10 Step 3 and Task 11 Step 3.
- `clearHandoffCodeFromUrl()` → `void`: consistent.
- `switchTenant` new option: noted in Task 12 Step 4 that the final shape depends on the injection-strategy decision; both variants (`targetOrigin` vs `handoffCode`) are acknowledged.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-10-remove-url-token-transfer-and-handoff-code.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration. Best for Phase 1 (7 tasks, concrete changes).

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints. Best if you want to watch the changes land in real time.

**Note:** Phase 2 cannot start until the backend contract in [Phase 2 Backend Contract](#phase-2-backend-contract) is implemented and deployed. When ready, re-enter this plan at Task 8.

**Which approach for Phase 1?**
