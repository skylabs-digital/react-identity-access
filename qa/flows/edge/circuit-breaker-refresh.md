---
id: circuit-breaker-refresh
type: direct
category: edge
priority: critical
crystallized: true
implementation: qa/simulator/scenarios/circuit-breaker-edge.test.ts
breaking_change: v2.28
---

## Context

Before v2.28, a transient refresh failure would be retried forever in the background. If the auth server was unreachable, tabs would pin CPU retrying indefinitely and flicker the login page.

**Fix (v2.28):** circuit breaker. After `MAX_BACKGROUND_FAILURES` (3) consecutive transient failures, the session is marked expired once, `onSessionExpired` fires once, and retries stop.

## Reference

Implemented as `qa/simulator/scenarios/circuit-breaker-edge.test.ts`.

## Assertions

- [ ] After 3 consecutive transient failures, the session is expired (`onSessionExpired` called exactly once).
- [ ] No 4th background retry is scheduled after the circuit breaker fires.
- [ ] A short outage (< 3 consecutive failures) does NOT trigger the breaker.
- [ ] The breaker resets after a successful refresh.

## Result schema

Same as other edge flows.
