/**
 * Scenario: Network Instability
 *
 * Simulates intermittent network failures during refresh attempts.
 * Tests retry logic, circuit breaker, and session recovery.
 *
 * Key stress points:
 * - Network errors during refresh (TypeError: Failed to fetch)
 * - Server 500 errors
 * - Mix of transient and fatal errors
 * - Circuit breaker behavior under intermittent failures
 * - Session recovery when network returns
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

describe('Scenario: Network Instability', () => {
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

  it('recovers from 2 consecutive network failures (below circuit breaker threshold)', async () => {
    ctx = createScenarioContext('network-2-failures', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [10, 50],
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const tab = createLoggedInTab(ctx, 'tab-1');
    tabs.push(tab);

    // Advance to proactive refresh time
    await vi.advanceTimersByTimeAsync(14 * ONE_MINUTE);

    // Inject 2 network failures — then server returns to normal
    ctx.server.injectFailures(2, 'network');

    // Let proactive refresh trigger and fail twice, then background retry kicks in
    // Each retry: 1s, 2s, 4s exponential backoff, then 30s background retry
    await vi.advanceTimersByTimeAsync(10 * ONE_SECOND);

    // After retries exhaust, background retry scheduled in 30s
    await vi.advanceTimersByTimeAsync(30 * ONE_SECOND);

    // Now server is healthy — next attempt should succeed
    await vi.advanceTimersByTimeAsync(5 * ONE_SECOND);

    // Make an API call to verify session is alive
    const result = await tab.makeApiCall();
    await vi.advanceTimersByTimeAsync(ONE_SECOND);

    // Session should survive — 2 failures < circuit breaker threshold of 3
    const noLogout = assertNoFalseLogout(tabs, { expectSessionLoss: false });
    expect(noLogout.passed).toBe(true);
  });

  it('intermittent failures (success between failures) keep session alive', async () => {
    ctx = createScenarioContext('network-intermittent', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [10, 50],
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const tab = createLoggedInTab(ctx, 'tab-1');
    tabs.push(tab);

    // Advance to proactive refresh — first cycle succeeds
    await vi.advanceTimersByTimeAsync(14 * ONE_MINUTE);
    await vi.advanceTimersByTimeAsync(ONE_SECOND);

    // Make API call — should succeed
    let result = await tab.makeApiCall();
    expect(result.success).toBe(true);

    // Next refresh cycle — inject 1 failure, but retries will recover
    ctx.server.injectFailures(1, 'network');
    await vi.advanceTimersByTimeAsync(14 * ONE_MINUTE);
    await vi.advanceTimersByTimeAsync(5 * ONE_SECOND); // Let retry succeed

    result = await tab.makeApiCall();
    expect(result.success).toBe(true);

    // Circuit breaker should NOT have tripped
    const noLogout = assertNoFalseLogout(tabs, { expectSessionLoss: false });
    expect(noLogout.passed).toBe(true);
  });

  it('handles exactly N network failures followed by success', async () => {
    ctx = createScenarioContext('network-n-then-success', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [10, 50],
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const tab = createLoggedInTab(ctx, 'tab-1');
    tabs.push(tab);

    // Advance to refresh point
    await vi.advanceTimersByTimeAsync(14 * ONE_MINUTE);

    // Inject exactly 3 network failures — retry mechanism has 3 retries (4 total attempts)
    // First 3 fail, 4th succeeds
    ctx.server.injectFailures(3, 'network');

    // Make API call — retries should handle it
    const resultPromise = tab.makeApiCall();
    // Retries: 1s + 2s + 4s = 7s of backoff
    await vi.advanceTimersByTimeAsync(10 * ONE_SECOND);
    const result = await resultPromise;

    // 4th attempt should succeed
    expect(result.success).toBe(true);

    const noLogout = assertNoFalseLogout(tabs, { expectSessionLoss: false });
    expect(noLogout.passed).toBe(true);
  });

  it('handles server 500 errors with retry and eventual recovery', async () => {
    ctx = createScenarioContext('network-500', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [10, 50],
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const tab = createLoggedInTab(ctx, 'tab-1');
    tabs.push(tab);

    // Advance to near expiry
    await vi.advanceTimersByTimeAsync(14 * ONE_MINUTE);

    // Inject 2 server errors — retry should handle
    ctx.server.injectFailures(2, '500');

    // Make an API call — it will retry with exponential backoff
    const resultPromise = tab.makeApiCall();
    // Let retries complete: 1s + 2s + 4s = 7s of backoff, plus response time
    await vi.advanceTimersByTimeAsync(15 * ONE_SECOND);
    const result = await resultPromise;

    // Third attempt should succeed
    expect(result.success).toBe(true);

    const noLogout = assertNoFalseLogout(tabs, { expectSessionLoss: false });
    expect(noLogout.passed).toBe(true);
  });
});
