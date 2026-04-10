---
id: token-rotation-race
type: direct
category: edge
priority: critical
crystallized: true
implementation: qa/simulator/scenarios/token-rotation-race.test.ts
---

## Context

When the backend rotates refresh tokens and two requests happen in the narrow window between "new RT issued" and "old RT invalidated", a client that still holds the old RT might try to use it and trigger `reuse-detected`.

The library defends against this by re-reading the freshest refresh token from storage inside `performTokenRefreshInner` before posting, so tabs that had a stale RT in memory pick up the new one that a sibling tab just wrote.

## Reference

`qa/simulator/scenarios/token-rotation-race.test.ts`.

## Assertions

- [ ] With rotation enabled and reuse detection ON, a 2-tab race produces 0 reuse-detected responses.
- [ ] Both tabs end with the same latest access token.
- [ ] No tab receives a false logout.

## Result schema

Same as other edge flows.
