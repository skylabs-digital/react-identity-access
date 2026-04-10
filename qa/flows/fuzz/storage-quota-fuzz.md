---
id: storage-quota-fuzz
type: agentic
category: fuzz
priority: medium
crystallized: false
---

## Context

`localStorage` can be full (quota exceeded), disabled (private browsing in some browsers), or corrupted (JSON.parse fails on the stored record). The library should degrade gracefully in each case.

## Vectors

- `localStorage.setItem` throws `QuotaExceededError` on the next write.
- Storage record is `"not-json"` — JSON.parse fails.
- Storage record is valid JSON but missing required fields (`{}`).
- Storage record has extra unknown fields (should be ignored, not crash).
- `localStorage.getItem` returns `null` (first-run / after clear).
- `localStorage` is entirely replaced with a stub that throws on every operation.

## Execution

Use `vi.spyOn(localStorage, 'setItem').mockImplementation(...)` etc. to inject failures. For each vector, exercise the minimum flow: `setTokens` + `getValidAccessToken`, and observe behavior.

## Assertions

- [ ] QuotaExceededError is either caught (session fails gracefully) or surfaces as a typed error.
- [ ] Corrupt JSON is treated as "no session" (not a crash).
- [ ] Missing/extra fields do not crash; the library either rejects or tolerates them.
- [ ] No stack trace leaks into the user-visible error message.

## Result schema

Same as other fuzz flows.
