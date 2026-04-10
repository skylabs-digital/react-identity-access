---
id: multi-tab-weblocks
type: direct
category: edge
priority: critical
crystallized: true
implementation: qa/simulator/scenarios/multi-tab-contention.test.ts
breaking_change: v2.29
---

## Context

Two (or more) browser tabs sharing `localStorage` used to race on refresh: if both tabs noticed the access token was about to expire at the same moment, both would POST `/auth/refresh` with the same refresh token. The backend rotates refresh tokens, so the second call would arrive with a stale RT, trigger `reuse detected`, and terminate the entire session.

**Fix (v2.29):** `SessionManager` now coordinates via `navigator.locks.request()`. A single refresh runs at any time; the other tabs read the new token from shared storage when the lock releases.

This flow asserts: with two tabs opened simultaneously and both triggering a refresh at the same instant, only ONE refresh request reaches the server and no tab receives a false logout.

## Helpers

- [qa/helpers/harness.md](../../helpers/harness.md)
- [qa/helpers/assertions.md](../../helpers/assertions.md)

## Reference

Implemented as `qa/simulator/scenarios/multi-tab-contention.test.ts` — run it with:

```bash
yarn sim qa/simulator/scenarios/multi-tab-contention.test.ts
```

## Assertions

- [ ] `refreshRequestCount(s)` is exactly 1 across all tabs.
- [ ] No tab received `onSessionExpired`.
- [ ] Both tabs converge on the same new access token.
- [ ] The mock server did NOT classify any call as `reuse-detected`.

## Result schema

Same as other edge flows.
