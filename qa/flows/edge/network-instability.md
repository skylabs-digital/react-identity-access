---
id: network-instability
type: direct
category: edge
priority: high
crystallized: true
implementation: qa/simulator/scenarios/network-instability.test.ts
---

## Context

Intermittent network failures during refresh (flaky wifi, cellular handoff, proxy timeouts) should retry with exponential backoff and eventually either succeed or trigger the circuit breaker.

## Reference

`qa/simulator/scenarios/network-instability.test.ts`.

## Assertions

- [ ] A single transient failure followed by success does NOT fire `onSessionExpired`.
- [ ] Two transient failures followed by success does NOT fire `onSessionExpired`.
- [ ] Three consecutive transient failures DO fire `onSessionExpired` (circuit breaker).
- [ ] Retries respect the exponential backoff schedule.

## Result schema

Same as other edge flows.
