# Security & Threat Model

This document describes the security posture of `@skylabs-digital/react-identity-access`, the threats it considers, the mitigations it ships, and the vulnerabilities that were fixed in recent releases.

---

## Threat model

The library is a **browser-side** identity client. It assumes:

- The backend exposes a trusted authentication API over HTTPS.
- Access tokens are short-lived JWTs (minutes).
- Refresh tokens are long-lived and rotate on each use.
- The app may be deployed on one or more subdomains of a shared base domain.

Threats the library actively defends against:

| Threat                                    | Mitigation                                                                                                                                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Access token theft via XSS                | Access tokens live in memory only when `enableCookieSession` is true. When false, they live in `localStorage` — the app is responsible for XSS-prevention.                                                   |
| Refresh token theft via XSS               | With `enableCookieSession`, the refresh token is stored in an HttpOnly cookie managed by the backend; JS code cannot read it.                                                                                |
| Refresh token leaking through URL         | **Fixed in v2.31** — the `_auth=<token>` URL mechanism used for cross-subdomain handoff has been removed (see [Fixed vulnerabilities](#fixed-vulnerabilities)).                                              |
| Session fixation after logout             | Session generation counter; refresh attempts issued before a logout are discarded when they complete.                                                                                                        |
| Refresh-chain compromise (reuse)          | Backend-detected token reuse is classified as fatal. `SessionManager` immediately clears the session instead of retrying.                                                                                    |
| Infinite refresh loops after server error | Circuit breaker: three consecutive background refresh failures transition the session to expired.                                                                                                            |
| Multi-tab token rotation race             | Web Locks API serializes refresh attempts across tabs; a single refresh is in flight at any time.                                                                                                            |
| Stale tokens resurrecting a session       | Session generation tracking invalidates in-flight refresh attempts after logout.                                                                                                                             |
| Magic link double-send                    | `AuthProvider` deduplicates `sendMagicLink` calls with identical parameters within a short window.                                                                                                           |
| Permission bypass on the client           | `Protected`, `ProtectedRoute`, `ZoneRoute`, and `hasPermission` helpers check permissions before rendering. **These are UX guards, not security boundaries** — the backend must re-enforce every permission. |

Threats the library does **not** cover (your app's responsibility):

- XSS prevention (sanitize inputs, escape outputs, use a strict CSP).
- Backend-side rate limiting on login / magic link endpoints.
- Backend-side permission enforcement on every API call.
- Server-side session invalidation when a password changes.
- CORS configuration on the API.
- Secure cookie flags (`HttpOnly`, `Secure`, `SameSite`) on the backend's refresh cookie.

---

## Storage model

Where tokens live depends on `enableCookieSession`:

| Config                                 | Access token                                     | Refresh token                     | Can JS read the refresh token? |
| -------------------------------------- | ------------------------------------------------ | --------------------------------- | ------------------------------ |
| `enableCookieSession: false` (default) | `localStorage`                                   | `localStorage`                    | Yes                            |
| `enableCookieSession: true`            | In-memory (and `localStorage` cache for restore) | HttpOnly cookie (backend-managed) | **No**                         |

Recommendation: **enable `enableCookieSession` whenever your backend can set an HttpOnly refresh cookie scoped to the parent domain.** This is strictly more secure than the default.

---

## Session lifecycle safeguards

### Automatic refresh

`SessionManager` refreshes access tokens proactively, 60 seconds before expiry by default (configurable via `AuthConfig.proactiveRefreshMargin`). All outbound API calls go through `HttpService`, which awaits any in-flight refresh before issuing the request.

### Refresh queueing

Concurrent API calls arriving while a refresh is in flight share the single pending refresh. This is what the `expectSingleRefresh` assertion in `qa/simulator/asserts/` validates.

### Circuit breaker

If three consecutive background refreshes fail (network errors, 5xx responses), the session is marked expired. This prevents zombie tabs from hammering the auth server.

### Session generation counter

Every logout bumps an internal generation counter. When a refresh completes, the response is discarded if the generation it was issued under no longer matches — this closes the race where a user logs out while a refresh is still in flight.

### Web Locks across tabs

When multiple tabs are open, `SessionManager` uses `navigator.locks.request()` to ensure only one tab issues the refresh. The other tabs pick up the new token from shared `localStorage`. Falls back gracefully in environments without Web Locks (same-tab behaviour).

### Token reuse / revocation

If the backend responds to a refresh with a `token_reused` or `token_revoked` code, `SessionManager` does **not** retry — it clears the session immediately. This contains the blast radius of a leaked refresh token.

---

## Permission system

Permissions use a `resource:action` format (for example: `users:read`, `products:write`, `admin:*`). The library ships three ways to gate rendering on permissions:

- **`<Protected requiredPermissions={[...]}>`** — conditional render with fallback.
- **`<ProtectedRoute>`** — redirects unauthenticated/unauthorized users.
- **`<ZoneRoute>` / `<AuthenticatedZone>` / `<AdminZone>`** — declarative route access (RFC-005).

All three delegate to `hasPermission`, `hasAnyPermission`, and `hasAllPermissions` from `useAuth`. **These are purely presentational safeguards.** Always re-enforce permissions on the backend — a skilled user can bypass any client-side check.

---

## Fixed vulnerabilities

### v2.31 — Removal of `_auth` URL token transfer

**What it was:** Previously, `TenantProvider.switchTenant({ mode: 'navigate' })` would append `?_auth=<refresh-token>` to the destination URL when switching to a different subdomain. The receiving tab would read the parameter and hydrate the session.

**Why it was removed:**

1. **Referer leakage** — the refresh token would appear in `Referer` headers of any request made from the destination page before the parameter was stripped.
2. **Browser history and logs** — the URL (and the token) were written to history, proxy logs, and analytics pixels.
3. **Shoulder-surfing** — a refresh token on-screen is a session fixation primitive.
4. **Opener disclosure** — if the destination tab opened any external links via `window.open` without `rel="noopener"`, the opener URL (including `_auth`) would be exposed via `document.referrer`.

**Fix:** The `_auth` mechanism was removed entirely. Cross-subdomain sessions are now handled exclusively via `enableCookieSession` + an HttpOnly refresh cookie scoped to the parent domain.

**Migration:** See [docs/migration-v2.31.md](./migration-v2.31.md).

---

### v2.29 — Multi-tab session loss

**What it was:** Two tabs opening simultaneously could both issue refresh requests. The backend rotates refresh tokens, so the second refresh would arrive with a stale token, be classified as reuse, and terminate the session for both tabs.

**Fix:** `SessionManager` now coordinates via `navigator.locks.request()`. A single refresh is in flight across all tabs; the other tabs read the new token from shared storage when it completes.

---

### v2.28 — Infinite background refresh after transient failure

**What it was:** When a refresh call failed with a network error, `SessionManager` would retry on every subsequent API call indefinitely, pinning CPU and generating login-page flicker.

**Fix:** Circuit breaker. Three consecutive failures transition the session to expired, invoking `onSessionExpired` once.

---

### v2.22 — Session resurrection after logout

**What it was:** If a user logged out while a background refresh was in flight, the refresh could complete _after_ the logout and re-hydrate the session silently.

**Fix:** Session generation counter. Each logout bumps the counter; refresh responses are discarded if the counter no longer matches.

---

## Reporting vulnerabilities

Please report security issues privately to **security@skylabs.digital**. Do not open public GitHub issues for undisclosed vulnerabilities.
