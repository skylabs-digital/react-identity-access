---
id: long-idle-return
type: direct
category: edge
priority: high
crystallized: true
implementation: qa/simulator/scenarios/long-idle-return.test.ts
---

## Context

A user opens the app, walks away for hours (access token expires, refresh token still valid), and returns. The library should silently refresh without logging them out.

Edge cases: did the proactive timer fire while the tab was backgrounded? Did scheduler jank cause a double-fire? What if the refresh token is also expired when they return?

## Reference

`qa/simulator/scenarios/long-idle-return.test.ts`.

## Assertions

- [ ] After idling past access-token expiry but within refresh-token validity, the next API call refreshes cleanly.
- [ ] After idling past refresh-token expiry, the next API call reports `SessionExpiredError` exactly once.
- [ ] No duplicate refreshes for the same RT.

## Result schema

Same as other edge flows.
