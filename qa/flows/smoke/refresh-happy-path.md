---
id: refresh-happy-path
type: direct
category: smoke
priority: critical
crystallized: true
implementation: qa/simulator/scenarios/flow-refresh-happy-path.test.ts
---

## Context

Verify the simplest possible lifecycle: a logged-in tab consumes the access token until the proactive margin fires, the library refreshes once, and the tab continues with the new token — no errors, no duplicate calls, no false logout.

This flow is the canary for the refresh pipeline. If it fails, almost every other flow will also fail.

## Helpers

Read before executing:

- [qa/helpers/harness.md](../../helpers/harness.md)
- [qa/helpers/assertions.md](../../helpers/assertions.md)
- [qa/helpers/public-api.md](../../helpers/public-api.md)

## Steps

1. **Start scenario** — deterministic seed `refresh-happy-path`, default server config (15 min access token lifetime, 60 s proactive margin).
2. **Log in tab** — create `tab-1` with valid initial tokens.
3. **Advance 14 minutes** — crosses the proactive margin, triggers one refresh.
4. **Advance 1 more minute** — lets any deferred work settle.
5. **Assert** — `refreshRequestCount(s) === 1`, `expectSingleRefresh(s)`, `expectNoFalseLogout(s)`, tab still has a valid session.

## Assertions

- [ ] Exactly one refresh request was issued.
- [ ] No duplicate refresh for the same RT (`expectSingleRefresh`).
- [ ] The tab did NOT receive `onSessionExpired`.
- [ ] After the refresh, `tab.sessionManager.hasValidSession()` is `true`.
- [ ] The new access token is different from the original.

## Result schema

```json
{
  "flow": "refresh-happy-path",
  "type": "direct",
  "category": "smoke",
  "priority": "critical",
  "status": "pass | fail | error",
  "findings": [],
  "assertions": { "passed": 0, "failed": 0, "details": [] },
  "duration_ms": 0
}
```
