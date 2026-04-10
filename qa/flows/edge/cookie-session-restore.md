---
id: cookie-session-restore
type: agentic
category: edge
priority: critical
crystallized: false
breaking_change: v2.31
---

## Context

With `enableCookieSession: true`, `SessionManager.attemptCookieSessionRestore()` should send a `POST /auth/refresh` with `credentials: 'include'` and, if the backend's HttpOnly cookie is still valid, hydrate the session without interactive login.

**This is the secure replacement for the removed `_auth` URL token transfer (v2.31 breaking change).** A flow that silently writes or reads `?_auth=...` anywhere is a regression.

The simulator's mock server doesn't model HTTP cookies directly, so this flow uses `server.overrideNextResponse(...)` to simulate what a cookie-authenticated 200 looks like.

## Helpers

- [qa/helpers/harness.md](../../helpers/harness.md)
- [qa/helpers/public-api.md](../../helpers/public-api.md)
- [qa/helpers/test-data.md](../../helpers/test-data.md) (section "Cookies")

## Steps

1. Start scenario `cookie-session-restore` with default server config.
2. Create a `SessionManager` directly (not via `loginTab`), passing `enableCookieSession: true` and `baseUrl: BASE_URL`, with empty storage.
3. Override the next refresh response to return `{ accessToken: 'cookie-derived', expiresIn: 900 }` with HTTP 200.
4. Call `sessionManager.attemptCookieSessionRestore()` and await the result.
5. Assert the call succeeded and tokens are now present in storage.
6. Repeat with an override that returns 401 — assert the call returns `false` and storage is still empty.
7. Repeat with `enableCookieSession: false` — assert `attemptCookieSessionRestore()` returns `false` without making any network call.

## Assertions

- [ ] Happy path: cookie-based restore writes the access token to storage.
- [ ] 401 response: no tokens written, no session expiry callback.
- [ ] `enableCookieSession: false`: no network call at all.
- [ ] No URL anywhere in the flow contains `_auth=`.

## Crystallization notes

When this flow is crystallized, use this filename: `qa/simulator/scenarios/flow-cookie-session-restore.test.ts`. The existing `qa/simulator/core/mock-fetch.ts` already supports `overrideNextResponse`.

## Result schema

Same as other edge flows.
