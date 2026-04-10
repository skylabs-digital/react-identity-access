# Helper: Test data (deterministic seeds)

Unlike agentic QA against a running backend, this harness has **no persistent test data**. Every scenario starts fresh with an in-memory mock server and shared storage.

## Defaults

When you call `loginTab(scenario, 'tab-1')`, the mock server issues tokens with these defaults (see `qa/simulator/core/mock-fetch.ts`):

```js
{
  userId: 'sim-user-1',
  email: 'sim@test.com',
  phoneNumber: null,
  userType: 'user',
  role: 'admin',
  tenantId: 'sim-tenant',
  appId: 'sim-app',
  // exp computed from accessTokenLifetimeMs (default 15 min)
}
```

Access token lifetime defaults to **15 minutes**. Refresh token lifetime defaults to **24 hours**. Both can be overridden per scenario:

```ts
startScenario('long-session', {
  accessTokenLifetimeMs: 60 * 60 * 1000,      // 1 hour
  refreshTokenLifetimeMs: 30 * 24 * 3600_000, // 30 days
});
```

## Seeds

The first argument to `startScenario` is the **seed** for the deterministic RNG. Same seed ⇒ same randomized latencies, same response ordering, same retry timing. Flows should always pass their flow id as the seed so two runs produce identical audit logs.

## Storage

All tabs in a scenario share one in-memory `SharedStorage` instance that mimics `localStorage`. Multiple scenarios use separate storage — nothing leaks between them.

When a flow wants to simulate a pre-existing stored session (cold restore), seed the storage before creating the first tab:

```ts
const s = startScenario('cold-restore');
s.ctx.storage.set({
  accessToken: 'seeded-token',
  refreshToken: 'seeded-rt',
  expiresAt: Date.now() + 15 * 60 * 1000,
});
const tab = loginTab(s, 'tab-1'); // won't overwrite because storage is non-empty
```

## Cookies

There are no real cookies in the harness. `enableCookieSession` scenarios must override the refresh response to simulate a cookie-based 200:

```ts
s.ctx.server.overrideNextResponse(() =>
  new Response(
    JSON.stringify({ accessToken: 'cookie-token', expiresIn: 900 }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
);
```

## Users, roles, permissions

The mock server does not simulate user/role/permission endpoints — only `/auth/refresh`. Flows that need permission logic should either:

- Stay in the session layer (most flows).
- Or spin up a dedicated `HttpService` with its own mocked fetch for the endpoint under test (pattern: see `src/test/authApiService.test.ts`).
