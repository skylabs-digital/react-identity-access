---
id: clock-skew-fuzz
type: agentic
category: fuzz
priority: medium
crystallized: false
---

## Context

The library reads `Date.now()` in several places: expiry checks, proactive timer scheduling, backoff calculations. A drifting or misconfigured client clock should not crash the library or cause a false logout.

## Vectors

- Clock jumps forward by 2 hours mid-session (NTP correction).
- Clock jumps backward by 10 minutes mid-session.
- Clock is persistently 5 minutes behind the server.
- Clock is persistently 5 minutes ahead of the server.

In the harness, simulate clock skew with `vi.setSystemTime(new Date(Date.now() + delta))` between scenario steps.

## Assertions

- [ ] Forward jump does not immediately trigger a stampede of refreshes.
- [ ] Backward jump does not prevent a future refresh from firing.
- [ ] No uncaught exceptions from any clock vector.
- [ ] Any `SessionExpiredError` fired is attributable to a real expiry, not clock drift.

## Result schema

Same as other fuzz flows.
