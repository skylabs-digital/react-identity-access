---
id: login-logout
type: agentic
category: smoke
priority: high
crystallized: false
---

## Context

Verify the simplest login → logout lifecycle via the public `useAuth().login()` and `logout()` actions. No tenant switch, no magic link, no multi-tab.

This flow is **agentic** (not yet crystallized into a `.test.ts`). A qa-lib-tester agent running it must first generate a vitest implementation, save it to `qa/simulator/scenarios/flow-login-logout.agentic.test.ts`, run it, and report results.

When the flow passes consistently across several runs with no surprises, the agent should rename the file to `flow-login-logout.test.ts` (drop `.agentic`), update this frontmatter to `crystallized: true`, and add an `implementation:` key.

## Helpers

- [qa/helpers/harness.md](../../helpers/harness.md)
- [qa/helpers/public-api.md](../../helpers/public-api.md)

## Steps

1. **Start scenario** with seed `login-logout`. The default mock server supports the `/auth/refresh` endpoint but not `/auth/login`, so this flow must stub fetch for login OR use the direct `sessionManager.setTokens()` path (simpler).
2. **Direct approach:** start with no tokens in storage, then call `tab.sessionManager.setTokens({ accessToken, refreshToken, expiresIn: 900 })` to simulate a successful login. This isolates the session lifecycle from the login API.
3. **Assert** `tab.sessionManager.hasValidSession() === true`.
4. **Call `clearSession()`** to simulate logout.
5. **Assert** `tab.sessionManager.getTokens() === null` and `hasValidSession() === false`.
6. **Advance 30 seconds.** No background refresh should fire (there is nothing to refresh).
7. **Assert** `refreshRequestCount(s) === 0`.

## Assertions

- [ ] Login (setTokens) produces a valid session.
- [ ] Logout (clearSession) clears all tokens.
- [ ] No background refresh attempts after logout.
- [ ] No `onSessionExpired` callback fired (it's logout, not expiry).

## Result schema

```json
{
  "flow": "login-logout",
  "type": "agentic",
  "category": "smoke",
  "priority": "high",
  "status": "pass | fail | warn | error",
  "findings": [],
  "assertions": { "passed": 0, "failed": 0, "details": [] },
  "duration_ms": 0
}
```
