/**
 * Scenario: Proactive vs Demand Refresh
 *
 * Tests the interaction between the background proactive refresh timer
 * and foreground demand-driven refresh (from getValidAccessToken).
 *
 * Key stress points:
 * - Background timer fires at exactly the proactive margin
 * - User action triggers getValidAccessToken at the same moment
 * - backgroundRefresh() checks `if (this.refreshPromise) return;` — what if it starts first?
 * - Both paths call startRefreshAndResolveQueue — who wins?
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
const ONE_SECOND = 1000;

describe('Scenario: Proactive vs Demand Refresh', () => {
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

  it('proactive refresh starts first, demand call queues behind it', async () => {
    ctx = createScenarioContext('proactive-first', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [200, 300], // Slow enough that proactive is still in-flight
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const tab = createLoggedInTab(ctx, 'tab-1');
    tabs.push(tab);

    // Advance to exactly the proactive refresh point (14 min with 1 min margin)
    // This triggers backgroundRefresh → startRefreshAndResolveQueue
    await vi.advanceTimersByTimeAsync(14 * ONE_MINUTE);

    // Immediately make an API call while proactive refresh is in-flight
    // getValidAccessToken sees refreshPromise is set → enqueues
    const apiPromise = tab.makeApiCall();

    // Let refresh complete
    await vi.advanceTimersByTimeAsync(ONE_SECOND);
    const result = await apiPromise;

    expect(result.success).toBe(true);

    // Only 1 refresh request
    expect(ctx.server.getRefreshRequestCount()).toBe(1);
    expect(ctx.server.hadReuseDetection()).toBe(false);

    const singleFlight = assertSingleRefreshFlight(ctx.server);
    expect(singleFlight.passed).toBe(true);

    const noLogout = assertNoFalseLogout(tabs, { expectSessionLoss: false });
    expect(noLogout.passed).toBe(true);
  });

  it('demand call starts first, proactive refresh is skipped', async () => {
    ctx = createScenarioContext('demand-first', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [200, 300],
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const tab = createLoggedInTab(ctx, 'tab-1');
    tabs.push(tab);

    // Advance to just before proactive refresh point
    await vi.advanceTimersByTimeAsync(14 * ONE_MINUTE - 100);

    // Make API call — token is within refreshThreshold (5 min) so it triggers refresh
    const apiPromise = tab.makeApiCall();

    // Now advance past the proactive refresh point
    // backgroundRefresh() should see refreshPromise is set and return early
    await vi.advanceTimersByTimeAsync(200);

    // Let everything settle
    await vi.advanceTimersByTimeAsync(ONE_SECOND);
    const result = await apiPromise;

    expect(result.success).toBe(true);
    expect(ctx.server.getRefreshRequestCount()).toBe(1);
    expect(ctx.server.hadReuseDetection()).toBe(false);
  });

  it('burst of demand calls exactly at proactive refresh time', async () => {
    ctx = createScenarioContext('burst-at-proactive', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [100, 200],
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const tab = createLoggedInTab(ctx, 'tab-1');
    tabs.push(tab);

    // Advance to proactive refresh point
    await vi.advanceTimersByTimeAsync(14 * ONE_MINUTE);

    // Fire burst of 10 calls while proactive refresh is starting
    const burstPromise = ctx.apiCaller.burstSingleTab(tab, 10, 1);

    // Let everything settle
    await vi.advanceTimersByTimeAsync(ONE_SECOND);
    const burst = await burstPromise;

    expect(burst.successes).toBe(10);
    expect(burst.failures).toBe(0);

    const consistency = assertTokenConsistency(burst);
    expect(consistency.passed).toBe(true);

    // Only 1 refresh total (proactive + demand resolved together)
    expect(ctx.server.getRefreshRequestCount()).toBe(1);
  });

  it('proactive refresh fails, demand call retries independently', async () => {
    ctx = createScenarioContext('proactive-fails-demand-retries', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [50, 100],
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const tab = createLoggedInTab(ctx, 'tab-1');
    tabs.push(tab);

    // Advance to proactive refresh point
    await vi.advanceTimersByTimeAsync(14 * ONE_MINUTE);

    // First refresh attempt fails
    ctx.server.injectFailures(1, '500');
    await vi.advanceTimersByTimeAsync(10 * ONE_SECOND); // Let retries exhaust

    // Now make an API call — should trigger new refresh since token is still expiring
    const resultPromise = tab.makeApiCall();
    await vi.advanceTimersByTimeAsync(ONE_SECOND);
    const result = await resultPromise;

    // Server is healthy now — should succeed
    expect(result.success).toBe(true);

    const noLogout = assertNoFalseLogout(tabs, { expectSessionLoss: false });
    expect(noLogout.passed).toBe(true);
  });

  it('two proactive refresh cycles with demand calls interspersed', async () => {
    ctx = createScenarioContext('proactive-multi', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [10, 50],
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const tab = createLoggedInTab(ctx, 'tab-1');
    tabs.push(tab);

    // Cycle 1: proactive refresh + API call
    await vi.advanceTimersByTimeAsync(14 * ONE_MINUTE);
    await vi.advanceTimersByTimeAsync(100);
    let result = await tab.makeApiCall();
    expect(result.success).toBe(true);

    // Cycle 2: proactive refresh + API call
    await vi.advanceTimersByTimeAsync(14 * ONE_MINUTE);
    await vi.advanceTimersByTimeAsync(100);
    result = await tab.makeApiCall();
    expect(result.success).toBe(true);

    expect(ctx.server.hadReuseDetection()).toBe(false);

    const noLogout = assertNoFalseLogout(tabs, { expectSessionLoss: false });
    expect(noLogout.passed).toBe(true);

    console.log(`[proactive-multi] Total refresh requests: ${ctx.server.getRefreshRequestCount()}`);
  });
});
