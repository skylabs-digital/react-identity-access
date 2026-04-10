# Migration to v2.31

**v2.31 contains a breaking change that affects apps relying on cross-subdomain tenant switching.** This guide walks through the migration.

---

## TL;DR

If you were using `TenantProvider.switchTenant()` with tenants on different subdomains, the library used to append `?_auth=<refresh-token>` to the destination URL. **That mechanism has been removed** for security reasons (see [docs/security.md](./security.md#v231--removal-of-_auth-url-token-transfer)).

You must either:

1. **Enable the cookie session**: set `enableCookieSession: true` in `AuthConfig` and ensure your backend sets an HttpOnly refresh cookie scoped to the parent domain. **(recommended)**
2. **Move tenants to the same subdomain**: use `tenantMode: 'selector'` or `tenantMode: 'fixed'` so tenants share a single origin. The session stays in `localStorage` and `switchTenant` becomes a client-side state change.

If you were **not** using cross-subdomain tenant switching, **no changes are required** — remove any `_auth` references from your codebase and upgrade.

---

## Who is affected?

You are affected if **all** of the following are true:

- Your app uses `TenantProvider` with `tenantMode: 'subdomain'`.
- Users can switch between tenants that live on different subdomains (e.g. `acme.example.com` → `globex.example.com`).
- You call `tenantContext.switchTenant(slug)` or `tenantContext.switchTenant(slug, { mode: 'navigate' })` to perform the switch.

You are **not** affected if:

- Your app uses a single subdomain.
- Your app uses `tenantMode: 'selector'` or `'fixed'`.
- Your app uses `switchTenant(slug, { mode: 'reload' })` on the same subdomain.

---

## Option 1 — Enable cookie session (recommended)

This is the most secure migration and preserves the cross-subdomain UX.

### 1. Configure your backend

Your auth API must set the refresh token as an **HttpOnly cookie** scoped to the parent domain:

```http
Set-Cookie: refresh_token=<token>;
            HttpOnly;
            Secure;
            SameSite=Lax;
            Domain=.example.com;
            Path=/auth/refresh;
            Max-Age=2592000
```

Key points:

- **`Domain=.example.com`** — the leading dot is critical; this is what lets the cookie flow from `acme.example.com` to `globex.example.com`.
- **`HttpOnly`** — JavaScript cannot read this cookie. The refresh token never touches your app bundle.
- **`Secure`** — only sent over HTTPS.
- **`SameSite=Lax`** — allows top-level navigation between subdomains but blocks third-party POSTs.
- **`Path=/auth/refresh`** — scope to the endpoint that actually needs it.

Your `/auth/refresh` endpoint must:

- Accept the cookie on the incoming request.
- Issue a new refresh token (rotation) as a new `Set-Cookie`.
- Return the new access token in the JSON body as usual.

### 2. Enable it in the library

```tsx
<AuthProvider
  config={{
    enableCookieSession: true,
  }}
>
  {/* ... */}
</AuthProvider>
```

Or if you are using the standalone AuthProvider:

```tsx
<AuthProvider
  config={{
    baseUrl: 'https://api.example.com',
    appId: 'your-app-id',
    enableCookieSession: true,
  }}
>
  {/* ... */}
</AuthProvider>
```

### 3. Verify the CORS configuration

Your auth API must allow credentials from all subdomains that will use it:

```
Access-Control-Allow-Origin: https://acme.example.com   // specific, NOT '*'
Access-Control-Allow-Credentials: true
```

The library automatically sends refresh requests with `credentials: 'include'` when `enableCookieSession` is true. Without `Access-Control-Allow-Credentials: true`, the browser will discard the response.

### 4. Test the cross-subdomain flow

1. Log in on `acme.example.com`.
2. Call `switchTenant('globex')` — the library navigates to `globex.example.com`.
3. On load, `SessionManager` sends `POST /auth/refresh` with `credentials: 'include'`.
4. The backend reads the cookie, issues a fresh access + refresh, and the session is restored.

You should see the user authenticated on the new subdomain without an interactive login.

---

## Option 2 — Consolidate to a single subdomain

If you cannot set cross-subdomain cookies (for example, because tenants are hosted on unrelated domains), switch to `selector` mode and keep the session local to a single origin.

### Before

```tsx
<TenantProvider
  config={{
    tenantMode: 'subdomain',
    baseDomain: 'example.com',
  }}
>
```

### After

```tsx
<TenantProvider
  config={{
    tenantMode: 'selector',
    selectorParam: 'tenant',
  }}
>
```

Now tenants are selected via a query parameter (`?tenant=acme`) or a dropdown (`<TenantSelector />`) on the same origin. `switchTenant()` becomes a pure client-side state change — no navigation, no token transfer.

---

## Removing `_auth` references

Any code that read or wrote the `_auth` query parameter must be deleted. A quick audit:

```bash
grep -r "_auth" src/ example/ playground/
```

Expected results in your codebase:

- If you see matches in **your app code** (not inside `node_modules`), remove them.
- If you see matches in `node_modules/@skylabs-digital/react-identity-access`, make sure you are on **v2.31 or later** — the reference should be gone.

---

## Verifying the upgrade

After upgrading, run through this checklist:

- [ ] `yarn add @skylabs-digital/react-identity-access@^2.31.0` completes without errors.
- [ ] Your app builds and type-checks (`tsc --noEmit`).
- [ ] Login works on the primary subdomain.
- [ ] If you use cross-subdomain switching: the target subdomain restores the session without asking for credentials.
- [ ] Opening DevTools → Network → Refresh requests show `credentials: include` and the HttpOnly cookie flowing.
- [ ] No `?_auth=...` query parameters appear anywhere in the navigation flow.
- [ ] Logging out on one tab logs out all other tabs (multi-tab safety).

---

## Rollback

If you need to roll back:

```bash
yarn add @skylabs-digital/react-identity-access@^2.30.0
```

Then remove `enableCookieSession: true` from your `AuthConfig`. **Note: v2.30 still contains the `_auth` URL transfer vulnerability** — plan to re-upgrade as soon as possible.

---

## Getting help

- Security questions → [docs/security.md](./security.md) or **security@skylabs.digital**.
- Usage questions → [GitHub Issues](https://github.com/skylabs-digital/react-identity-access/issues).
