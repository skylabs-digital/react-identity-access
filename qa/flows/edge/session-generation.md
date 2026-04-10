---
id: session-generation
type: agentic
category: edge
priority: critical
crystallized: false
breaking_change: v2.22
---

## Context

Every `clearSession()` bumps an internal session generation counter. Refresh responses that arrive after a logout (because the user logged out mid-refresh) must be discarded — they should not rehydrate the session.

Covered partially by existing unit tests in `src/test/sessionManager.test.ts`. This flow exercises it at the harness level so it runs alongside other QA flows and shows up in the regression suite.

## Steps

1. Start scenario `session-generation`.
2. Use `server.overrideNextResponse(...)` to install a deliberately slow response (e.g. resolve after a manual delay).
3. Trigger a refresh via `getValidAccessToken()` on an expired token (don't await).
4. While the refresh is in-flight, call `clearSession()`.
5. Resolve the slow response.
6. Await the original promise (expect it to reject with `SessionExpiredError`).
7. Assert `getTokens()` is `null` — the late response did NOT rehydrate.

## Assertions

- [ ] Late refresh response does not write tokens back to storage.
- [ ] The caller's promise rejects with `SessionExpiredError` after clearSession.
- [ ] No background retries are scheduled for the cleared session.

## Result schema

Same as other edge flows.
