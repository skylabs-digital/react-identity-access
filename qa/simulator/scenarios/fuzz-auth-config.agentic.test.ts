/**
 * Flow: fuzz-auth-config (agentic)
 *
 * Spec: qa/flows/fuzz/auth-config-fuzz.md
 *
 * Black-box fuzz of the public AuthConfig surface. We drive SessionManager
 * directly because the flow specifically asks us to exercise the config
 * validation/defaults boundary — AuthProvider is a thin React wrapper around
 * SessionManager, so testing SessionManager is the closest analogue in a
 * node-only harness.
 *
 * For each vector the test records:
 *   - whether construction threw
 *   - whether the first observable use (setTokens + getValidAccessToken) threw
 *   - error class / message (truncated)
 *   - a short state snapshot (hasValidSession, accessToken presence)
 *
 * The aggregated findings are written to qa/reports/.tmp/auth-config-fuzz.json
 * at the end of the suite.
 */
import { describe, it, afterAll, afterEach, vi, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import {
  startScenario,
  teardown,
  BASE_URL,
  type Scenario,
} from '../../harness/index.js';
import { SharedStorage } from '../core/shared-storage.js';
import { SessionManager } from '../../../src/services/SessionManager.js';

// ─────────────────────────────────────────────────────────────────────────────
// Finding collection
// ─────────────────────────────────────────────────────────────────────────────

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

interface Finding {
  severity: Severity;
  vector: string;
  input: string;
  observed: string;
  expected: string;
  errorClass?: string;
  errorMessage?: string;
  stateSnapshot?: Record<string, unknown>;
  scenarioSeed: string;
  notes?: string;
}

const findings: Finding[] = [];
const SEED_PREFIX = 'fuzz-auth-config';

function record(f: Finding) {
  findings.push(f);
}

function describeError(err: unknown): { class: string; message: string } {
  if (err && typeof err === 'object') {
    return {
      class: (err as Error).constructor?.name ?? 'Object',
      message: String((err as Error).message ?? err).slice(0, 400),
    };
  }
  return { class: typeof err, message: String(err).slice(0, 400) };
}

function snapshot(sm: SessionManager | null): Record<string, unknown> {
  if (!sm) return { constructed: false };
  try {
    return {
      constructed: true,
      hasValidSession: sm.hasValidSession(),
      accessToken: sm.getAccessToken() ? '<present>' : null,
    };
  } catch (err) {
    return { constructed: true, snapshotError: describeError(err).message };
  }
}

// Minimal factory — constructs a SessionManager with the minimum required
// fields plus a shared in-memory storage. All other options are passed through
// so we can perturb them per-vector.
function makeSm(
  s: Scenario,
  overrides: Record<string, unknown> = {},
): SessionManager {
  const storage = new SharedStorage();
  const base: Record<string, unknown> = {
    storageKey: 'fuzz_auth_tokens',
    tokenStorage: storage,
    baseUrl: BASE_URL,
    autoRefresh: true,
    proactiveRefreshMargin: 60_000,
    refreshQueueTimeout: 10_000,
    maxRefreshRetries: 3,
    retryBackoffBase: 1_000,
  };
  const cfg = { ...base, ...overrides };
  return new SessionManager(cfg as any);
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite
// ─────────────────────────────────────────────────────────────────────────────

describe('Flow: fuzz-auth-config', () => {
  let s: Scenario;

  afterEach(() => {
    if (s) teardown(s);
    vi.restoreAllMocks();
  });

  afterAll(() => {
    const outDir = resolve(process.cwd(), 'qa/reports/.tmp');
    mkdirSync(outDir, { recursive: true });
    const payload = {
      flow: 'fuzz-auth-config',
      seed: SEED_PREFIX,
      runAt: new Date().toISOString(),
      totalFindings: findings.length,
      bySeverity: findings.reduce<Record<string, number>>((acc, f) => {
        acc[f.severity] = (acc[f.severity] ?? 0) + 1;
        return acc;
      }, {}),
      findings,
    };
    writeFileSync(
      resolve(outDir, 'auth-config-fuzz.json'),
      JSON.stringify(payload, null, 2),
    );
  });

  // ───────────────────────────────────────────────────────────────────────
  // baseUrl vectors
  // ───────────────────────────────────────────────────────────────────────

  it('baseUrl: undefined', async () => {
    s = startScenario(`${SEED_PREFIX}-base-undefined`);
    let sm: SessionManager | null = null;
    let ctorErr: unknown = null;
    try {
      sm = makeSm(s, { baseUrl: undefined });
    } catch (err) {
      ctorErr = err;
    }

    if (ctorErr) {
      const d = describeError(ctorErr);
      record({
        severity: 'low',
        vector: 'baseUrl=undefined',
        input: 'undefined',
        observed: 'construction threw',
        expected: 'throw OR accept with fallback',
        errorClass: d.class,
        errorMessage: d.message,
        scenarioSeed: s.id,
      });
      return;
    }

    // Construction succeeded. Does it fail gracefully at first use?
    let useErr: unknown = null;
    try {
      sm!.setTokens({
        accessToken: s.ctx.server.issueAccessToken(),
        refreshToken: s.ctx.server.issueRefreshToken(),
        expiresIn: 900,
      });
      await sm!.getValidAccessToken();
    } catch (err) {
      useErr = err;
    }

    record({
      severity: useErr ? 'low' : 'medium',
      vector: 'baseUrl=undefined',
      input: 'undefined',
      observed: useErr
        ? 'accepted at construction, threw at first use'
        : 'silently accepted undefined baseUrl, valid token retrieved without network',
      expected:
        'reject at construction OR reject on first API call with a typed error',
      errorClass: useErr ? describeError(useErr).class : undefined,
      errorMessage: useErr ? describeError(useErr).message : undefined,
      stateSnapshot: snapshot(sm),
      scenarioSeed: s.id,
      notes:
        'Standalone mode requires baseUrl per docs; passing undefined should not be silently accepted.',
    });
  });

  it('baseUrl: empty string', async () => {
    s = startScenario(`${SEED_PREFIX}-base-empty`);
    let sm: SessionManager | null = null;
    let ctorErr: unknown = null;
    try {
      sm = makeSm(s, { baseUrl: '' });
    } catch (err) {
      ctorErr = err;
    }

    if (ctorErr) {
      const d = describeError(ctorErr);
      record({
        severity: 'low',
        vector: 'baseUrl=""',
        input: '""',
        observed: 'construction threw (acceptable)',
        expected: 'throw at construction',
        errorClass: d.class,
        errorMessage: d.message,
        scenarioSeed: s.id,
      });
      return;
    }

    record({
      severity: 'medium',
      vector: 'baseUrl=""',
      input: '""',
      observed: 'empty-string baseUrl accepted at construction',
      expected: 'throw at construction',
      stateSnapshot: snapshot(sm),
      scenarioSeed: s.id,
    });
  });

  it('baseUrl: malformed "not-a-url"', async () => {
    s = startScenario(`${SEED_PREFIX}-base-malformed`);
    let sm: SessionManager | null = null;
    let ctorErr: unknown = null;
    try {
      sm = makeSm(s, { baseUrl: 'not-a-url' });
    } catch (err) {
      ctorErr = err;
    }

    if (ctorErr) {
      const d = describeError(ctorErr);
      record({
        severity: 'low',
        vector: 'baseUrl="not-a-url"',
        input: '"not-a-url"',
        observed: 'construction threw',
        expected: 'throw at construction OR at first API call',
        errorClass: d.class,
        errorMessage: d.message,
        scenarioSeed: s.id,
      });
      return;
    }

    record({
      severity: 'medium',
      vector: 'baseUrl="not-a-url"',
      input: '"not-a-url"',
      observed: 'malformed URL accepted without validation',
      expected: 'reject at construction OR typed error on first API call',
      stateSnapshot: snapshot(sm),
      scenarioSeed: s.id,
    });
  });

  it('baseUrl: dangerous scheme javascript:', async () => {
    s = startScenario(`${SEED_PREFIX}-base-js-scheme`);
    let sm: SessionManager | null = null;
    let ctorErr: unknown = null;
    try {
      sm = makeSm(s, { baseUrl: 'javascript:alert(1)' });
    } catch (err) {
      ctorErr = err;
    }

    if (ctorErr) {
      const d = describeError(ctorErr);
      record({
        severity: 'info',
        vector: 'baseUrl="javascript:..."',
        input: '"javascript:alert(1)"',
        observed: 'construction threw (expected)',
        expected: 'throw at construction (dangerous scheme)',
        errorClass: d.class,
        errorMessage: d.message,
        scenarioSeed: s.id,
      });
      return;
    }

    record({
      severity: 'critical',
      vector: 'baseUrl="javascript:..."',
      input: '"javascript:alert(1)"',
      observed:
        'Dangerous javascript: scheme accepted as baseUrl without validation',
      expected: 'reject dangerous schemes at construction',
      stateSnapshot: snapshot(sm),
      scenarioSeed: s.id,
      notes:
        'Any downstream code that interpolates baseUrl into navigation could execute attacker-controlled JS.',
    });
  });

  it('baseUrl: data: scheme', async () => {
    s = startScenario(`${SEED_PREFIX}-base-data-scheme`);
    let sm: SessionManager | null = null;
    let ctorErr: unknown = null;
    try {
      sm = makeSm(s, { baseUrl: 'data:text/html,<script>1</script>' });
    } catch (err) {
      ctorErr = err;
    }

    if (ctorErr) {
      record({
        severity: 'info',
        vector: 'baseUrl="data:..."',
        input: '"data:text/html,..."',
        observed: 'construction threw (expected)',
        expected: 'throw at construction (dangerous scheme)',
        errorClass: describeError(ctorErr).class,
        errorMessage: describeError(ctorErr).message,
        scenarioSeed: s.id,
      });
      return;
    }

    record({
      severity: 'high',
      vector: 'baseUrl="data:..."',
      input: '"data:text/html,..."',
      observed: 'data: scheme accepted as baseUrl',
      expected: 'reject dangerous schemes at construction',
      stateSnapshot: snapshot(sm),
      scenarioSeed: s.id,
    });
  });

  it('baseUrl: trailing slash normalization', async () => {
    s = startScenario(`${SEED_PREFIX}-base-trailing-slash`);
    let ctorErrA: unknown = null;
    let ctorErrB: unknown = null;
    let smA: SessionManager | null = null;
    let smB: SessionManager | null = null;
    try {
      smA = makeSm(s, { baseUrl: 'https://api.example.com' });
    } catch (err) {
      ctorErrA = err;
    }
    try {
      smB = makeSm(s, { baseUrl: 'https://api.example.com/' });
    } catch (err) {
      ctorErrB = err;
    }

    if (ctorErrA || ctorErrB) {
      record({
        severity: 'medium',
        vector: 'baseUrl trailing-slash variants',
        input: 'https://api.example.com vs https://api.example.com/',
        observed: 'construction threw unexpectedly for one of the variants',
        expected: 'both variants accepted, normalized identically',
        errorClass: describeError(ctorErrA ?? ctorErrB).class,
        errorMessage: describeError(ctorErrA ?? ctorErrB).message,
        scenarioSeed: s.id,
      });
      return;
    }

    // Both constructed — record as info (not a bug, just observation).
    record({
      severity: 'info',
      vector: 'baseUrl trailing-slash variants',
      input: 'https://api.example.com vs https://api.example.com/',
      observed: 'both accepted at construction',
      expected: 'both accepted at construction',
      stateSnapshot: {
        a: snapshot(smA),
        b: snapshot(smB),
      },
      scenarioSeed: s.id,
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // refreshQueueTimeout vectors
  // ───────────────────────────────────────────────────────────────────────

  it('refreshQueueTimeout: 0', async () => {
    s = startScenario(`${SEED_PREFIX}-rqt-zero`);
    let sm: SessionManager | null = null;
    let ctorErr: unknown = null;
    try {
      sm = makeSm(s, { refreshQueueTimeout: 0 });
    } catch (err) {
      ctorErr = err;
    }

    if (ctorErr) {
      record({
        severity: 'info',
        vector: 'refreshQueueTimeout=0',
        input: '0',
        observed: 'rejected at construction',
        expected: 'reject OR accept-and-immediately-fail-queued-calls',
        errorClass: describeError(ctorErr).class,
        errorMessage: describeError(ctorErr).message,
        scenarioSeed: s.id,
      });
      return;
    }

    record({
      severity: 'medium',
      vector: 'refreshQueueTimeout=0',
      input: '0',
      observed: 'accepted without validation; behavior undefined',
      expected: 'reject OR clearly document zero-timeout semantics',
      stateSnapshot: snapshot(sm),
      scenarioSeed: s.id,
    });
  });

  it('refreshQueueTimeout: -1 (negative)', async () => {
    s = startScenario(`${SEED_PREFIX}-rqt-neg`);
    let sm: SessionManager | null = null;
    let ctorErr: unknown = null;
    try {
      sm = makeSm(s, { refreshQueueTimeout: -1 });
    } catch (err) {
      ctorErr = err;
    }

    if (ctorErr) {
      record({
        severity: 'info',
        vector: 'refreshQueueTimeout=-1',
        input: '-1',
        observed: 'rejected at construction (expected)',
        expected: 'reject at construction',
        errorClass: describeError(ctorErr).class,
        errorMessage: describeError(ctorErr).message,
        scenarioSeed: s.id,
      });
      return;
    }

    record({
      severity: 'high',
      vector: 'refreshQueueTimeout=-1',
      input: '-1',
      observed: 'negative timeout silently accepted',
      expected: 'reject at construction',
      stateSnapshot: snapshot(sm),
      scenarioSeed: s.id,
      notes:
        'Negative timeout can cause immediate failure of queued refresh calls or setTimeout clamping to 0/1ms — both are hazardous.',
    });
  });

  it('refreshQueueTimeout: Number.MAX_SAFE_INTEGER', async () => {
    s = startScenario(`${SEED_PREFIX}-rqt-max`);
    let sm: SessionManager | null = null;
    let ctorErr: unknown = null;
    try {
      sm = makeSm(s, { refreshQueueTimeout: Number.MAX_SAFE_INTEGER });
    } catch (err) {
      ctorErr = err;
    }

    if (ctorErr) {
      record({
        severity: 'low',
        vector: 'refreshQueueTimeout=MAX_SAFE_INTEGER',
        input: String(Number.MAX_SAFE_INTEGER),
        observed: 'rejected at construction',
        expected: 'accept (huge but valid)',
        errorClass: describeError(ctorErr).class,
        errorMessage: describeError(ctorErr).message,
        scenarioSeed: s.id,
      });
      return;
    }

    record({
      severity: 'info',
      vector: 'refreshQueueTimeout=MAX_SAFE_INTEGER',
      input: String(Number.MAX_SAFE_INTEGER),
      observed: 'accepted',
      expected: 'accept',
      stateSnapshot: snapshot(sm),
      scenarioSeed: s.id,
    });
  });

  it('refreshQueueTimeout: string "10000"', async () => {
    s = startScenario(`${SEED_PREFIX}-rqt-string`);
    let sm: SessionManager | null = null;
    let ctorErr: unknown = null;
    try {
      sm = makeSm(s, { refreshQueueTimeout: '10000' as unknown as number });
    } catch (err) {
      ctorErr = err;
    }

    if (ctorErr) {
      record({
        severity: 'info',
        vector: 'refreshQueueTimeout="10000"',
        input: '"10000"',
        observed: 'rejected (expected)',
        expected: 'reject wrong type',
        errorClass: describeError(ctorErr).class,
        errorMessage: describeError(ctorErr).message,
        scenarioSeed: s.id,
      });
      return;
    }

    record({
      severity: 'medium',
      vector: 'refreshQueueTimeout="10000"',
      input: '"10000"',
      observed: 'string accepted for a numeric option (type erosion)',
      expected: 'reject wrong type at construction',
      stateSnapshot: snapshot(sm),
      scenarioSeed: s.id,
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // proactiveRefreshMargin vectors
  // ───────────────────────────────────────────────────────────────────────

  it('proactiveRefreshMargin: > accessTokenLifetimeMs', async () => {
    s = startScenario(`${SEED_PREFIX}-prm-gt-lifetime`);
    let sm: SessionManager | null = null;
    let ctorErr: unknown = null;
    try {
      // Access token lifetime is 15 min by default; margin = 30 min.
      sm = makeSm(s, { proactiveRefreshMargin: 30 * 60 * 1000 });
    } catch (err) {
      ctorErr = err;
    }

    if (ctorErr) {
      record({
        severity: 'info',
        vector: 'proactiveRefreshMargin > lifetime',
        input: '1800000 (30m vs 15m lifetime)',
        observed: 'rejected at construction',
        expected: 'reject OR accept without immediate refresh loop',
        errorClass: describeError(ctorErr).class,
        errorMessage: describeError(ctorErr).message,
        scenarioSeed: s.id,
      });
      return;
    }

    // Set tokens and observe — does it immediately trigger a refresh loop?
    sm!.setTokens({
      accessToken: s.ctx.server.issueAccessToken(),
      refreshToken: s.ctx.server.issueRefreshToken(),
      expiresIn: 900,
    });
    // Give scheduled timers a tiny push.
    await vi.advanceTimersByTimeAsync(10);
    const before = s.ctx.server.getRefreshRequestCount();
    await vi.advanceTimersByTimeAsync(5_000);
    const after = s.ctx.server.getRefreshRequestCount();

    if (after - before > 5) {
      record({
        severity: 'high',
        vector: 'proactiveRefreshMargin > lifetime',
        input: '1800000',
        observed: `refresh loop triggered: ${after - before} refreshes in 5s after setTokens`,
        expected: 'at most one refresh, no loop',
        stateSnapshot: snapshot(sm),
        scenarioSeed: s.id,
      });
    } else {
      record({
        severity: 'info',
        vector: 'proactiveRefreshMargin > lifetime',
        input: '1800000',
        observed: `refreshes fired after setTokens: ${after - before}`,
        expected: 'no infinite loop',
        stateSnapshot: snapshot(sm),
        scenarioSeed: s.id,
      });
    }
  });

  it('proactiveRefreshMargin: 0', async () => {
    s = startScenario(`${SEED_PREFIX}-prm-zero`);
    let sm: SessionManager | null = null;
    let ctorErr: unknown = null;
    try {
      sm = makeSm(s, { proactiveRefreshMargin: 0 });
    } catch (err) {
      ctorErr = err;
    }

    if (ctorErr) {
      record({
        severity: 'low',
        vector: 'proactiveRefreshMargin=0',
        input: '0',
        observed: 'rejected at construction',
        expected: 'accept — proactive refresh disabled',
        errorClass: describeError(ctorErr).class,
        errorMessage: describeError(ctorErr).message,
        scenarioSeed: s.id,
      });
      return;
    }

    record({
      severity: 'info',
      vector: 'proactiveRefreshMargin=0',
      input: '0',
      observed: 'accepted',
      expected: 'accept — proactive refresh effectively disabled',
      stateSnapshot: snapshot(sm),
      scenarioSeed: s.id,
    });
  });

  it('proactiveRefreshMargin: -1', async () => {
    s = startScenario(`${SEED_PREFIX}-prm-neg`);
    let sm: SessionManager | null = null;
    let ctorErr: unknown = null;
    try {
      sm = makeSm(s, { proactiveRefreshMargin: -1 });
    } catch (err) {
      ctorErr = err;
    }

    if (ctorErr) {
      record({
        severity: 'info',
        vector: 'proactiveRefreshMargin=-1',
        input: '-1',
        observed: 'rejected (expected)',
        expected: 'reject at construction',
        errorClass: describeError(ctorErr).class,
        errorMessage: describeError(ctorErr).message,
        scenarioSeed: s.id,
      });
      return;
    }

    record({
      severity: 'medium',
      vector: 'proactiveRefreshMargin=-1',
      input: '-1',
      observed: 'negative margin silently accepted',
      expected: 'reject at construction',
      stateSnapshot: snapshot(sm),
      scenarioSeed: s.id,
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // enableCookieSession wrong type
  // ───────────────────────────────────────────────────────────────────────

  it('enableCookieSession: "true" (string instead of boolean)', async () => {
    s = startScenario(`${SEED_PREFIX}-cookie-string`);
    let sm: SessionManager | null = null;
    let ctorErr: unknown = null;
    try {
      sm = makeSm(s, { enableCookieSession: 'true' as unknown as boolean });
    } catch (err) {
      ctorErr = err;
    }

    if (ctorErr) {
      record({
        severity: 'info',
        vector: 'enableCookieSession="true"',
        input: '"true"',
        observed: 'rejected at construction (expected)',
        expected: 'reject wrong type',
        errorClass: describeError(ctorErr).class,
        errorMessage: describeError(ctorErr).message,
        scenarioSeed: s.id,
      });
      return;
    }

    record({
      severity: 'medium',
      vector: 'enableCookieSession="true"',
      input: '"true"',
      observed: 'string accepted for a boolean option',
      expected: 'reject wrong type at construction',
      stateSnapshot: snapshot(sm),
      scenarioSeed: s.id,
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // onSessionExpired throwing / reentrant
  // ───────────────────────────────────────────────────────────────────────

  it('onSessionExpired: callback that throws', async () => {
    s = startScenario(`${SEED_PREFIX}-onexp-throws`);
    let sm: SessionManager | null = null;
    let ctorErr: unknown = null;
    let fired = false;

    try {
      sm = makeSm(s, {
        onSessionExpired: () => {
          fired = true;
          throw new Error('boom from onSessionExpired');
        },
      });
    } catch (err) {
      ctorErr = err;
    }

    if (ctorErr) {
      record({
        severity: 'high',
        vector: 'onSessionExpired throws',
        input: 'callback throws synchronously',
        observed: 'construction rejected the callback unexpectedly',
        expected: 'accept; throw should be isolated at fire time',
        errorClass: describeError(ctorErr).class,
        errorMessage: describeError(ctorErr).message,
        scenarioSeed: s.id,
      });
      return;
    }

    // Trigger a fatal reuse-detected refresh to force onSessionExpired.
    sm!.setTokens({
      accessToken: s.ctx.server.issueAccessToken(),
      refreshToken: s.ctx.server.issueRefreshToken(),
      expiresIn: 900,
    });

    // Provoke a fatal refresh path: override next response with invalid_grant.
    s.ctx.server.overrideNextResponse(
      () =>
        new Response(
          JSON.stringify({ error: 'invalid_grant', error_description: 'revoked' }),
          { status: 400, headers: { 'content-type': 'application/json' } },
        ),
    );

    // Expire access token and trigger a refresh attempt.
    await vi.advanceTimersByTimeAsync(16 * 60 * 1000);

    let useErr: unknown = null;
    try {
      await sm!.getValidAccessToken();
    } catch (err) {
      useErr = err;
    }

    // Library MUST NOT propagate the callback's throw uncaught.
    // Our test observes: did fired === true, and did we still get a clean rejection?
    if (useErr && !fired) {
      // The callback was never invoked — possibly fine if the refresh path
      // short-circuited without a fatal classification.
      record({
        severity: 'info',
        vector: 'onSessionExpired throws',
        input: 'callback throws synchronously',
        observed:
          'refresh attempt rejected before onSessionExpired was invoked',
        expected: 'callback invoked for fatal reasons',
        errorClass: describeError(useErr).class,
        errorMessage: describeError(useErr).message,
        stateSnapshot: snapshot(sm),
        scenarioSeed: s.id,
      });
      return;
    }

    if (fired && useErr) {
      record({
        severity: 'info',
        vector: 'onSessionExpired throws',
        input: 'callback throws synchronously',
        observed:
          'callback fired, threw, and the library still returned a clean rejection to the caller',
        expected: 'throw in callback must not crash the refresh loop',
        errorClass: describeError(useErr).class,
        errorMessage: describeError(useErr).message,
        stateSnapshot: snapshot(sm),
        scenarioSeed: s.id,
      });
      return;
    }

    record({
      severity: 'high',
      vector: 'onSessionExpired throws',
      input: 'callback throws synchronously',
      observed: fired
        ? 'callback fired; getValidAccessToken resolved instead of rejecting'
        : 'callback never fired and no error surfaced',
      expected: 'callback fires exactly once; caller sees typed rejection',
      stateSnapshot: snapshot(sm),
      scenarioSeed: s.id,
    });
  });

  it('onSessionExpired: reentrant clearSession() does not deadlock', async () => {
    s = startScenario(`${SEED_PREFIX}-onexp-reentrant`);
    let sm: SessionManager | null = null;
    let ctorErr: unknown = null;
    let fired = 0;

    try {
      sm = makeSm(s, {
        onSessionExpired: () => {
          fired++;
          try {
            sm?.clearSession();
          } catch {
            /* swallow for test */
          }
        },
      });
    } catch (err) {
      ctorErr = err;
    }

    if (ctorErr) {
      record({
        severity: 'high',
        vector: 'onSessionExpired reentrant clearSession',
        input: 'callback calls sm.clearSession() synchronously',
        observed: 'construction rejected the callback unexpectedly',
        expected: 'accept callback',
        errorClass: describeError(ctorErr).class,
        errorMessage: describeError(ctorErr).message,
        scenarioSeed: s.id,
      });
      return;
    }

    sm!.setTokens({
      accessToken: s.ctx.server.issueAccessToken(),
      refreshToken: s.ctx.server.issueRefreshToken(),
      expiresIn: 900,
    });

    s.ctx.server.overrideNextResponse(
      () =>
        new Response(
          JSON.stringify({ error: 'invalid_grant', error_description: 'reused' }),
          { status: 400, headers: { 'content-type': 'application/json' } },
        ),
    );

    await vi.advanceTimersByTimeAsync(16 * 60 * 1000);

    const usePromise = sm!.getValidAccessToken().catch((e) => e);
    // Race against a deadlock guard: advance enough time for any internal
    // timeouts to fire.
    await vi.advanceTimersByTimeAsync(30_000);
    const result = await Promise.race([
      usePromise,
      new Promise((resolve) => setTimeout(() => resolve('__deadlock__'), 1)),
    ]);
    // We've advanced timers — a true deadlock would resolve '__deadlock__'
    // only if the SessionManager promise never settles.

    if (result === '__deadlock__') {
      record({
        severity: 'critical',
        vector: 'onSessionExpired reentrant clearSession',
        input: 'callback calls sm.clearSession() synchronously',
        observed: 'getValidAccessToken never settled — deadlock suspected',
        expected: 'callback may reenter clearSession without deadlock',
        stateSnapshot: snapshot(sm),
        scenarioSeed: s.id,
        notes: `fired=${fired}`,
      });
      return;
    }

    record({
      severity: 'info',
      vector: 'onSessionExpired reentrant clearSession',
      input: 'callback calls sm.clearSession() synchronously',
      observed: `settled without deadlock; fired=${fired}; result=${(result as any)?.constructor?.name ?? typeof result}`,
      expected: 'no deadlock',
      stateSnapshot: snapshot(sm),
      scenarioSeed: s.id,
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Sanity: always pass the suite itself so the afterAll writes the report.
  // ───────────────────────────────────────────────────────────────────────
  it('report sanity', () => {
    expect(findings.length).toBeGreaterThan(0);
  });
});
