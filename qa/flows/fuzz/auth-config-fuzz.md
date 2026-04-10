---
id: auth-config-fuzz
type: agentic
category: fuzz
priority: high
crystallized: false
---

## Context

The public `AuthConfig` interface is the boundary between caller code and the library. It accepts untrusted input (dev-written config, but still arbitrary). This flow stress-tests the validation and defaults.

## Vectors

### baseUrl

- `undefined` without AppProvider → should throw a clear error (documented behavior).
- `""` (empty string) → should throw.
- `"not-a-url"` → should throw or accept + fail on first API call with a useful message.
- `"javascript:alert(1)"` → should throw (dangerous scheme).
- `"https://api.example.com"` (no trailing slash) → should work.
- `"https://api.example.com/"` (trailing slash) → should normalize and work.
- `"https://api.example.com/v1"` (path) → should work.

### refreshQueueTimeout

- `0` → should either reject or immediately fail all queued calls.
- `-1` → should reject.
- `Number.MAX_SAFE_INTEGER` → should accept (huge but valid).
- `"10000"` (string) → should reject or coerce.

### proactiveRefreshMargin

- `> accessTokenLifetimeMs` → should not cause immediate refresh loops.
- `0` → proactive refresh is effectively disabled.
- `-1` → should reject.

### onSessionExpired

- Callback that throws → should not crash SessionManager; should log and continue.
- Callback that calls back into SessionManager (reentrant) → should not deadlock.

## Execution

For each vector: create a `SessionManager` with the offending config, exercise it with a normal flow (setTokens + makeApiCall), and record the outcome. Expected outcomes are "rejected at construction", "rejected at first use", or "accepted but handled gracefully".

## Assertions

- [ ] Dangerous `baseUrl` schemes are rejected.
- [ ] Negative timeouts are rejected, not silently coerced.
- [ ] Throwing `onSessionExpired` does not crash the refresh loop.
- [ ] Reentrant calls into `SessionManager` from within `onSessionExpired` do not deadlock.

## Result schema

Same as other fuzz flows.
