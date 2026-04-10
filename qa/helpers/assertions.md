# Helper: Assertions available to flows

The harness exposes three high-level assertions; the simulator exposes the underlying functions if you need custom logic.

---

## `expectSingleRefresh(scenario)`

Verifies that the mock server received **at most one refresh request per unique refresh token**. Catches queue bypasses, duplicate proactive refreshes, and multi-tab races that end up hitting the network twice with the same RT.

Throws with the offending call pair if duplicates are found.

---

## `expectTokenConsistency(burstResult)`

After a burst of concurrent API calls that triggered a refresh, every caller must have received the same access token. Catches cases where some callers got the old token and others got the new one.

```ts
const burst = await s.ctx.apiCaller.burstSingleTab(tab, 10, 1);
expectTokenConsistency(burst);
```

---

## `expectNoFalseLogout(scenario, { expectSessionLoss, reason })`

Most important assertion for regression runs.

- `expectSessionLoss: false` (default) — no tab should have received `onSessionExpired`. Any call of it is a false logout.
- `expectSessionLoss: true` — at least one tab should have received `onSessionExpired`. Useful for flows that deliberately exhaust the circuit breaker or provoke a fatal reuse-detected.

---

## Direct simulator asserts

For flows that need finer-grained checks, import from `qa/simulator/asserts/`:

```ts
import { assertSingleRefreshFlight } from '../../simulator/asserts/single-refresh-flight';
import { assertTokenConsistency } from '../../simulator/asserts/token-consistency';
import { assertNoFalseLogout } from '../../simulator/asserts/no-false-logout';
```

These return `AssertResult = { passed: boolean; name: string; message: string }` instead of throwing. Useful when you want to log and continue instead of failing fast.

---

## Anti-patterns

- **Don't** assert on private state (sessionGeneration, consecutiveBackgroundFailures). Use observable side effects instead.
- **Don't** use wall-clock comparisons (`Date.now() - started > 500ms`). Fake timers make wall-clock meaningless. Use `refreshRequestCount(s)` or callback invocations.
- **Don't** rely on `await new Promise(r => setTimeout(r, 10))` to "let things settle". Use `await vi.advanceTimersByTimeAsync(10)` or `await advanceMs(s, 10)`.
- **Don't** silently swallow assertion failures with try/catch. If a scenario cannot complete, report `status: "error"` in the result JSON with the full error.
