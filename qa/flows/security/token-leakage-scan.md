---
id: token-leakage-scan
type: agentic
category: security
priority: critical
crystallized: false
---

## Context

Scan the library's public-facing side effects for places where tokens (access or refresh) might leak: URL parameters, `console.log`, `document.cookie` (when `enableCookieSession: false`), postMessage events, etc.

This flow was motivated by the v2.31 removal of `_auth` URL token transfer. The library should never write a token to any URL, never log it, never include it in an event payload. Regression: any future code that does so is a security bug.

## Vectors

1. Complete a full refresh cycle and inspect:
   - `window.location.href` — must not contain the refresh token.
   - `document.cookie` — must be empty (when `enableCookieSession: false`).
   - `console.log`/`console.warn`/`console.error` capture — no token string should appear.
   - Any `postMessage` sent to `window.parent` or other frames — must not contain tokens.
2. Provoke every type of error (network, 401, 500, malformed response) and inspect the error messages for tokens.
3. Provoke `onSessionExpired` and confirm the `error.message` does not include a token.

## Execution

Use `vi.spyOn(console, 'log')` etc. to capture logs during a full scenario. After the scenario, assert that none of the captured strings contain the refresh token or access token.

```ts
const logs: string[] = [];
vi.spyOn(console, 'log').mockImplementation((...args) => logs.push(args.join(' ')));
vi.spyOn(console, 'warn').mockImplementation((...args) => logs.push(args.join(' ')));
vi.spyOn(console, 'error').mockImplementation((...args) => logs.push(args.join(' ')));

// ... run scenario ...

const tokenSubstrings = [refreshToken.slice(0, 20), accessToken.slice(0, 20)];
for (const log of logs) {
  for (const sub of tokenSubstrings) {
    expect(log).not.toContain(sub);
  }
}
```

## Assertions

- [ ] No console output includes any token substring.
- [ ] `window.location.href` never contains a token.
- [ ] `document.cookie` is empty when `enableCookieSession: false`.
- [ ] Error messages do not include token values.

## Result schema

Same as other security flows.
