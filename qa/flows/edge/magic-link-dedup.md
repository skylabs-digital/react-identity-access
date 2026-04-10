---
id: magic-link-dedup
type: agentic
category: edge
priority: medium
crystallized: false
breaking_change: v2.26
---

## Context

When the user double-clicks "Send magic link" (common on flaky networks), the library deduplicates identical `sendMagicLink` calls within a short window, so only one email is sent. This flow exercises the dedup at the `AuthApiService` level.

See also: existing unit tests in `src/test/authApiService.test.ts`.

## Steps

1. Start scenario `magic-link-dedup`.
2. Instantiate `AuthApiService` with a mocked `HttpService` that captures calls.
3. Fire two back-to-back calls to `sendMagicLink(...)` with identical parameters.
4. Assert only one underlying HTTP request was made.
5. Fire a third call with different parameters — it should hit the network.

## Assertions

- [ ] Two identical calls within the dedup window ⇒ one HTTP request.
- [ ] Distinct parameters ⇒ separate HTTP requests.
- [ ] After the dedup window elapses, an identical call hits the network again.

## Result schema

Same as other edge flows.
