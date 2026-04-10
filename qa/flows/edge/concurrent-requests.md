---
id: concurrent-requests
type: direct
category: edge
priority: critical
crystallized: true
implementation: qa/simulator/scenarios/concurrent-requests.test.ts
---

## Context

10+ React components request a token simultaneously while the token is about to expire. The queue mechanism should ensure a single refresh fires and every caller receives the same new token.

## Reference

`qa/simulator/scenarios/concurrent-requests.test.ts`.

## Assertions

- [ ] 10 concurrent calls during expiry window ⇒ 1 refresh request.
- [ ] All 10 callers receive the same access token.
- [ ] 50 concurrent calls over slow network still produce 1 refresh.
- [ ] No caller sees an error.

## Result schema

Same as other edge flows.
