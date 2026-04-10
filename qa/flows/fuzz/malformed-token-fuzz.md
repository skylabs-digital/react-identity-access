---
id: malformed-token-fuzz
type: agentic
category: fuzz
priority: high
crystallized: false
---

## Context

Tokens that come from `setTokens()` (possibly user-controlled in Magic Link flows or from a misbehaving backend) must be validated before being stored and consumed. Malformed tokens should be rejected with a typed error, not silently accepted.

## Vectors

- Access token with `exp` in the past.
- Access token with `exp` far in the future (year 9999).
- Access token with `exp` as a string.
- Access token missing `exp`.
- Access token with malformed base64 body (non-base64 characters).
- Access token with the wrong number of segments (2 or 4 instead of 3).
- Refresh token as `""`.
- Refresh token with a deviceId claim containing null bytes or 10,000 chars.
- `expiresIn: -1`, `0`, `Number.POSITIVE_INFINITY`, `NaN`.

## Execution

For each vector, call `sessionManager.setTokens({ accessToken, refreshToken, expiresIn })` then `hasValidSession()` and attempt a `getValidAccessToken()`. Record whether the library:

- Accepted silently (**bad** — should flag as high).
- Rejected at setTokens (**good**).
- Accepted at setTokens but threw at getValidAccessToken (**acceptable**, log as medium if the error message is unhelpful).
- Crashed with an uncaught exception (**critical**).

## Assertions

- [ ] No malformed token is persisted with `hasValidSession() === true`.
- [ ] The library never crashes on any vector.
- [ ] Error messages do not include internal stack traces or dist paths.

## Result schema

Same as other fuzz flows.
