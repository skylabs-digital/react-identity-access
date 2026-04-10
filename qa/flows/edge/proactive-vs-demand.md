---
id: proactive-vs-demand
type: direct
category: edge
priority: high
crystallized: true
implementation: qa/simulator/scenarios/proactive-vs-demand.test.ts
---

## Context

Two refresh triggers coexist: the scheduled proactive timer (fires 60s before expiry) and on-demand requests (`getValidAccessToken()` on an already-expired token). If both happen in the same tick, they must share the same in-flight promise — otherwise the backend sees duplicate refresh calls.

## Reference

`qa/simulator/scenarios/proactive-vs-demand.test.ts`.

## Assertions

- [ ] Proactive + on-demand at the same moment ⇒ one refresh request.
- [ ] On-demand during an in-flight proactive refresh ⇒ on-demand waits, no duplicate.
- [ ] After multiple cycles (2+), the total refresh count matches the number of cycles (no "bonus" refreshes).

## Result schema

Same as other edge flows.
