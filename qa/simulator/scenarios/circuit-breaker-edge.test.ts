/**
 * Scenario: Circuit Breaker Edge Cases
 *
 * The circuit breaker trips after 3 consecutive background refresh failures.
 * This tests edge cases: failures just below threshold, alternating success/failure,
 * and whether the counter resets properly.
 *
 * Key stress points:
 * - Exactly 2 consecutive failures (below threshold) → should survive
 * - Exactly 3 consecutive failures → should trip
 * - Alternating success/failure → counter resets, should survive
 * - Brief server outage < 2 minutes → may trigger false logout
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager } from '../../../src/services/SessionManager.js';
import {
  createScenarioContext,
  createLoggedInTab,
  cleanupScenario,
  type ScenarioContext,
} from './base-scenario.js';
import { BrowserTab } from '../actors/browser-tab.js';
import { assertNoFalseLogout } from '../asserts/no-false-logout.js';

const ONE_MINUTE = 60 * 1000;
const ONE_SECOND = 1000;

describe('Scenario: Circuit Breaker Edge Cases', () => {
  let ctx: ScenarioContext;
  let tabs: BrowserTab[];

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    tabs = [];
  });

  afterEach(() => {
    cleanupScenario(tabs);
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('2 consecutive background failures then recovery — session survives', async () => {
    ctx = createScenarioContext('cb-2-failures', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [10, 50],
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const tab = createLoggedInTab(ctx, 'tab-1');
    tabs.push(tab);

    // Advance to proactive refresh point
    await vi.advanceTimersByTimeAsync(14 * ONE_MINUTE);

    // Inject 2 failures — below the threshold of 3
    // First failure: proactive refresh attempt
    ctx.server.injectFailures(1, '500');
    await vi.advanceTimersByTimeAsync(10 * ONE_SECOND); // Let retries exhaust

    // Background retry after 30s — inject 1 more failure
    ctx.server.injectFailures(1, '500');
    await vi.advanceTimersByTimeAsync(30 * ONE_SECOND); // Trigger background retry
    await vi.advanceTimersByTimeAsync(10 * ONE_SECOND); // Let retries exhaust

    // Next background retry — server is healthy now
    await vi.advanceTimersByTimeAsync(30 * ONE_SECOND);
    await vi.advanceTimersByTimeAsync(ONE_SECOND);

    // Make API call to verify
    const result = await tab.makeApiCall();
    await vi.advanceTimersByTimeAsync(ONE_SECOND);

    const noLogout = assertNoFalseLogout(tabs, { expectSessionLoss: false });
    expect(noLogout.passed).toBe(true);
  });

  it('3 consecutive background failures — circuit breaker trips', async () => {
    // Use the existing unit test pattern: direct SessionManager with 0 retries
    const storage = {
      _data: null as any,
      get() { return this._data ? { ...this._data } : null; },
      set(d: any) { this._data = d ? { ...d } : null; },
      clear() { this._data = null; },
    };

    const sessionExpired = vi.fn();

    // Keep failing with 500
    let callCount = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('no json')),
      });
    }));

    const { SessionManager } = await import('../../../src/services/SessionManager.js');

    storage.set({
      accessToken: 'old',
      refreshToken: 'old-r',
      expiresAt: Date.now() - 10000, // Expired → triggers immediate background refresh
    });

    const sm = new SessionManager({
      storageKey: 'cb_3_test',
      tokenStorage: storage,
      autoRefresh: true,
      refreshThreshold: 300000,
      baseUrl: 'http://sim-api',
      onSessionExpired: sessionExpired,
      maxRefreshRetries: 0, // No per-attempt retries
    });

    // Cycle 1: immediate background refresh (expired token)
    await vi.advanceTimersByTimeAsync(100);
    expect(callCount).toBe(1);

    // Cycle 2: background retry after 30s
    await vi.advanceTimersByTimeAsync(30 * ONE_SECOND);
    expect(callCount).toBe(2);

    // Cycle 3: background retry → hits MAX_BACKGROUND_FAILURES=3
    await vi.advanceTimersByTimeAsync(30 * ONE_SECOND);
    expect(callCount).toBe(3);

    // Circuit breaker should have tripped
    expect(sessionExpired).toHaveBeenCalledTimes(1);

    sm.destroy();
    SessionManager.resetAllInstances();
  });

  it('alternating success/failure — counter resets, session survives', async () => {
    ctx = createScenarioContext('cb-alternating', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [10, 50],
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const tab = createLoggedInTab(ctx, 'tab-1');
    tabs.push(tab);

    // Advance to proactive refresh point — triggers first refresh
    await vi.advanceTimersByTimeAsync(14 * ONE_MINUTE);

    // Cycle 1: fail
    ctx.server.injectFailures(1, '500');
    await vi.advanceTimersByTimeAsync(10 * ONE_SECOND); // Retries exhaust

    // Background retry in 30s — this one succeeds (no injection)
    await vi.advanceTimersByTimeAsync(30 * ONE_SECOND);
    await vi.advanceTimersByTimeAsync(ONE_SECOND);

    // Counter should have reset. Next cycle: fail again
    // Advance to next expiry
    await vi.advanceTimersByTimeAsync(14 * ONE_MINUTE);
    ctx.server.injectFailures(1, '500');
    await vi.advanceTimersByTimeAsync(10 * ONE_SECOND);

    // Background retry succeeds
    await vi.advanceTimersByTimeAsync(30 * ONE_SECOND);
    await vi.advanceTimersByTimeAsync(ONE_SECOND);

    // Make API call — should work
    const result = await tab.makeApiCall();
    await vi.advanceTimersByTimeAsync(ONE_SECOND);

    // Session should survive — counter never reached 3 consecutive
    const noLogout = assertNoFalseLogout(tabs, { expectSessionLoss: false });
    expect(noLogout.passed).toBe(true);
  });

  it('brief server outage (90s) — documents circuit breaker behavior', async () => {
    ctx = createScenarioContext('cb-brief-outage', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [10, 50],
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const tab = createLoggedInTab(ctx, 'tab-1');
    tabs.push(tab);

    // Advance to proactive refresh point
    await vi.advanceTimersByTimeAsync(14 * ONE_MINUTE);

    // Server goes down for 90 seconds
    ctx.server.injectFailures(100, '500');

    // Let 90 seconds pass with failures
    // Cycle 1: proactive refresh (0s) + retries (~7s)
    await vi.advanceTimersByTimeAsync(10 * ONE_SECOND);
    // Cycle 2: background retry at 30s + retries
    await vi.advanceTimersByTimeAsync(30 * ONE_SECOND);
    await vi.advanceTimersByTimeAsync(10 * ONE_SECOND);
    // Cycle 3: background retry at 60s + retries → circuit breaker
    await vi.advanceTimersByTimeAsync(30 * ONE_SECOND);
    await vi.advanceTimersByTimeAsync(10 * ONE_SECOND);

    // After 90s the server comes back... but is it too late?
    // Circuit breaker fires at 3 consecutive failures

    if (tab.isSessionExpired()) {
      console.warn(
        '\n  ⚠ CIRCUIT BREAKER FALSE POSITIVE: 90s server outage caused session loss.\n' +
        '  With current settings:\n' +
        '    - maxRefreshRetries=3 (per attempt: ~7s with backoff)\n' +
        '    - background retry interval: 30s\n' +
        '    - circuit breaker threshold: 3 consecutive failures\n' +
        '  Total time to circuit break: ~90s\n' +
        '  This means any server outage > 90s kills all sessions.\n' +
        '  Consider:\n' +
        '    - Increasing MAX_BACKGROUND_FAILURES to 5\n' +
        '    - Increasing background retry interval to 60s\n' +
        '    - Adding exponential backoff to background retries\n'
      );
    } else {
      console.log('[cb-brief-outage] Session survived 90s outage');
    }
  });
});
