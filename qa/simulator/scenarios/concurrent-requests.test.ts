/**
 * Scenario: Concurrent Requests
 *
 * Multiple React components request tokens simultaneously while the token
 * is expiring. Tests the queue mechanism and ensures all callers receive
 * the same refreshed token.
 *
 * Key stress points:
 * - 10+ concurrent getValidAccessToken() calls
 * - Background proactive refresh firing at the same time
 * - Queue timeout edge cases
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
import { assertSingleRefreshFlight } from '../asserts/single-refresh-flight.js';
import { assertTokenConsistency } from '../asserts/token-consistency.js';

const ONE_MINUTE = 60 * 1000;

describe('Scenario: Concurrent Requests', () => {
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

  it('10 concurrent calls during token expiry window all get same token', async () => {
    ctx = createScenarioContext('concurrent-10', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [50, 100],
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const tab = createLoggedInTab(ctx, 'tab-1');
    tabs.push(tab);

    // Advance to just past token expiry so refresh is triggered
    await vi.advanceTimersByTimeAsync(15 * ONE_MINUTE + 1000);

    // Fire 10 concurrent API calls — all should trigger refresh
    const burstPromise = ctx.apiCaller.burstSingleTab(tab, 10, 1);

    // Let the refresh complete
    await vi.advanceTimersByTimeAsync(200);
    const burst = await burstPromise;

    // All calls should succeed
    expect(burst.successes).toBe(10);
    expect(burst.failures).toBe(0);

    // All should have the same token
    const consistency = assertTokenConsistency(burst);
    expect(consistency.passed).toBe(true);

    // Only 1 refresh request should have been made
    expect(ctx.server.getRefreshRequestCount()).toBe(1);

    const noLogout = assertNoFalseLogout(tabs, { expectSessionLoss: false });
    expect(noLogout.passed).toBe(true);
  });

  it('50 concurrent calls with slow server response', async () => {
    ctx = createScenarioContext('concurrent-50-slow', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [500, 1000], // Slow server
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const tab = createLoggedInTab(ctx, 'tab-1');
    tabs.push(tab);

    // Advance past token expiry
    await vi.advanceTimersByTimeAsync(15 * ONE_MINUTE + 1000);

    // Fire 50 concurrent calls
    const burstPromise = ctx.apiCaller.burstSingleTab(tab, 50, 1);

    // Let the slow refresh complete (up to 1s latency)
    await vi.advanceTimersByTimeAsync(2000);
    const burst = await burstPromise;

    // All calls should succeed
    expect(burst.successes).toBe(50);

    const consistency = assertTokenConsistency(burst);
    expect(consistency.passed).toBe(true);

    // Still only 1 refresh
    expect(ctx.server.getRefreshRequestCount()).toBe(1);
  });

  it('concurrent calls while proactive refresh is already in progress', async () => {
    ctx = createScenarioContext('concurrent-proactive', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [200, 300], // Moderate latency
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const tab = createLoggedInTab(ctx, 'tab-1');
    tabs.push(tab);

    // Advance to proactive refresh point (14 min = 1 min before expiry)
    // This triggers the proactive background refresh
    await vi.advanceTimersByTimeAsync(14 * ONE_MINUTE);

    // While proactive refresh is in flight, fire concurrent API calls
    const burstPromise = ctx.apiCaller.burstSingleTab(tab, 5, 1);

    // Let everything settle
    await vi.advanceTimersByTimeAsync(1000);
    const burst = await burstPromise;

    // All should succeed
    expect(burst.successes).toBe(5);

    // The proactive refresh + queued calls should result in only 1 fetch
    // (proactive refresh starts, concurrent calls queue behind it)
    const singleFlight = assertSingleRefreshFlight(ctx.server);
    expect(singleFlight.passed).toBe(true);

    const noLogout = assertNoFalseLogout(tabs, { expectSessionLoss: false });
    expect(noLogout.passed).toBe(true);
  });

  it('rapid sequential calls during active refresh cycle', async () => {
    ctx = createScenarioContext('concurrent-rapid', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [100, 200],
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const tab = createLoggedInTab(ctx, 'tab-1');
    tabs.push(tab);

    // Advance past expiry
    await vi.advanceTimersByTimeAsync(15 * ONE_MINUTE + 1000);

    // Make 5 rapid sequential calls (each waits for the previous to resolve)
    const results: Array<{ success: boolean; token?: string }> = [];
    for (let i = 0; i < 5; i++) {
      const resultPromise = tab.makeApiCall();
      await vi.advanceTimersByTimeAsync(300);
      results.push(await resultPromise);
    }

    // All should succeed
    for (const r of results) {
      expect(r.success).toBe(true);
    }

    const noLogout = assertNoFalseLogout(tabs, { expectSessionLoss: false });
    expect(noLogout.passed).toBe(true);
  });
});
