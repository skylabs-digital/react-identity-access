# Helper: Node harness DSL

The harness is a thin wrapper over the deterministic simulator in `qa/simulator/`. It is imported from `qa/harness/index.ts` and used inside vitest test files that implement flows.

```ts
import {
  startScenario,
  loginTab,
  addTab,
  advanceMs,
  advanceMinutes,
  advanceSeconds,
  expireAccessToken,
  failNextRefresh,
  serverErrorNext,
  refreshRequestCount,
  currentAccessToken,
  expectSingleRefresh,
  expectTokenConsistency,
  expectNoFalseLogout,
  teardown,
} from '../../harness';
```

---

## The Scenario object

```ts
const s = startScenario('flow-id', serverConfig?);
// s.id        — the scenario name (used in audit logs and error messages)
// s.ctx       — underlying ScenarioContext with rng, audit, server, storage, apiCaller
// s.tabs      — all BrowserTab instances added so far
// s.startedAt — wall-clock start time
```

Always call `teardown(s)` at the end of the test. It destroys tabs, restores timers, and resets the SessionManager singleton registry.

### Deterministic seed

The first argument is the seed. Same seed + same server config ⇒ same outcome. Flows should always use their own id as the seed so two runs of the same flow are byte-identical.

### Mock server config

Second argument overrides `DEFAULT_SERVER_CONFIG` (see `qa/simulator/types.ts`):

```ts
startScenario('my-flow', {
  rotateRefreshTokens: true,      // default
  reuseDetection: true,           // default — reuse of an old RT → 401 reuse-detected
  accessTokenLifetimeMs: 15 * 60 * 1000,
  responseLatencyMs: [50, 100],   // range for random latency
});
```

---

## Time control

The scenario uses vitest fake timers. Real wall-clock time does not pass inside the test.

```ts
await advanceMs(s, 500);          // 500 ms
await advanceSeconds(s, 10);      // 10 s
await advanceMinutes(s, 20);      // 20 min
await expireAccessToken(s);       // advance past the access token's exp + 1s margin
```

All timers (proactive refresh, background retry, circuit breaker) fire in order during the advance.

---

## Tabs

```ts
const tab = loginTab(s, 'tab-1');    // starts with a valid session
const tab2 = addTab(s, 'tab-2');     // second tab sharing the same storage

await tab.makeApiCall();             // requests a valid token (triggers refresh if needed)
await tab.burstApiCalls(10, 5);      // 10 calls with a 5ms stagger
currentAccessToken(tab);             // what the tab sees now
tab.isSessionExpired();              // has onSessionExpired fired yet?
```

---

## Failure injection

```ts
failNextRefresh(s, 1);  // the next 1 refresh calls throw a network error
serverErrorNext(s, 3);  // the next 3 refresh calls return HTTP 500

// Temporary override of the next response (fine-grained)
s.ctx.server.overrideNextResponse(() =>
  new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 })
);
```

---

## Assertions

Each throws on failure with a descriptive message. Use them at the end of a scenario or between steps.

```ts
expectSingleRefresh(s);          // no duplicate refresh with the same RT
expectTokenConsistency(burst);   // all callers in a burst got the same token
expectNoFalseLogout(s, { expectSessionLoss: false });
```

For assertions the DSL doesn't provide, use the underlying functions from `qa/simulator/asserts/`:

```ts
import { assertSingleRefreshFlight } from '../../simulator/asserts/single-refresh-flight';
```

---

## Example flow implementation

```ts
// qa/simulator/scenarios/my-flow.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  startScenario,
  loginTab,
  advanceMinutes,
  expectSingleRefresh,
  teardown,
  type Scenario,
} from '../../harness';

describe('Flow: my-flow', () => {
  let s: Scenario;

  afterEach(() => {
    if (s) teardown(s);
  });

  it('proactive refresh fires before expiry', async () => {
    s = startScenario('my-flow');
    const tab = loginTab(s, 'tab-1');

    // Wait past the proactive margin (60s before 15m expiry = 14m)
    await advanceMinutes(s, 14);

    // One refresh should have fired proactively
    expect(s.ctx.server.getRefreshRequestCount()).toBeGreaterThanOrEqual(1);
    expectSingleRefresh(s);
  });
});
```

---

## When the DSL is not enough

You may compose simulator primitives directly when a flow needs something the DSL doesn't offer:

```ts
import { createScenarioContext, createLoggedInTab } from '../../simulator/scenarios/base-scenario';
```

But you must still:
- Clean up in `afterEach`
- Reset `SessionManager.resetAllInstances()`
- Restore timers with `vi.useRealTimers()`

And you must document in the flow's `## Context` section why the DSL wasn't sufficient, so we can grow the DSL over time.
