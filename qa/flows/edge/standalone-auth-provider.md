---
id: standalone-auth-provider
type: agentic
category: edge
priority: high
crystallized: false
breaking_change: v2.27
---

## Context

Since v2.27, `AuthProvider` can run without `AppProvider` and `TenantProvider`. The `baseUrl` and `appId` are passed via `AuthConfig` directly. This is important for single-tenant or pure-auth apps.

This flow is agentic because it exercises `AuthProvider` (a React component), not just `SessionManager`. The harness does not yet include RTL helpers, so the agent should either:

- Port the existing `src/test/authProvider.test.tsx` assertions into a flow-style test here, or
- Drive `SessionManager` directly in a node-only flow that mimics what `AuthProvider` does internally at mount (the minimum: instantiate with `baseUrl`, check that it doesn't throw, verify `hasValidSession()` is stable).

## Steps (node-only variant)

1. Start scenario `standalone-auth-provider`.
2. Directly instantiate a `SessionManager` with `{ storageKey: 'sim_auth_tokens', tokenStorage: storage, baseUrl: BASE_URL, autoRefresh: true }`.
3. Assert it does not throw and `hasValidSession()` returns `false` on empty storage.
4. Call `setTokens(...)` with a valid payload.
5. Assert `hasValidSession()` is now `true`.
6. Call `clearSession()`.
7. Assert everything is back to the initial state, no background refresh pending.

## Crystallization notes

When crystallized, save to `qa/simulator/scenarios/flow-standalone-auth-provider.test.ts`. Reference the component-level tests in `src/test/authProvider.test.tsx` for the React side of the same behavior.

## Assertions

- [ ] Creating a SessionManager with only `baseUrl` works (no AppProvider context needed).
- [ ] `hasValidSession()` returns `false` on empty storage.
- [ ] After `setTokens`, session is valid.
- [ ] After `clearSession`, session is invalid and no background timers remain.

## Result schema

Same as other edge flows.
