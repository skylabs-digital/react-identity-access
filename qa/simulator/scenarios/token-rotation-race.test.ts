/**
 * Scenario: Token Rotation Race
 *
 * When the server rotates refresh tokens on each use, concurrent refresh
 * attempts can cause "reuse detected" errors. This is the most likely
 * cause of unexpected session loss in production.
 *
 * Key stress points:
 * - Server returns new RT on each refresh
 * - Two refresh attempts with the same old RT → "reuse detected"
 * - Queue mechanism must prevent this within a single tab
 * - Multi-tab scenarios can still trigger reuse
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager } from '../../../src/services/SessionManager.js';
import {
  createScenarioContext,
  createLoggedInTab,
  cleanupScenario,
  BASE_URL,
  type ScenarioContext,
} from './base-scenario.js';
import { BrowserTab } from '../actors/browser-tab.js';
import { assertNoFalseLogout } from '../asserts/no-false-logout.js';
import { assertSingleRefreshFlight } from '../asserts/single-refresh-flight.js';

const ONE_MINUTE = 60 * 1000;

describe('Scenario: Token Rotation Race', () => {
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

  it('single tab: queue prevents duplicate refresh with rotation enabled', async () => {
    ctx = createScenarioContext('rotation-single-tab', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [100, 200],
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const tab = createLoggedInTab(ctx, 'tab-1');
    tabs.push(tab);

    // Expire the access token
    await vi.advanceTimersByTimeAsync(15 * ONE_MINUTE + 1000);

    // Fire 5 concurrent API calls — all need to refresh
    const burstPromise = ctx.apiCaller.burstSingleTab(tab, 5, 1);
    await vi.advanceTimersByTimeAsync(500);
    const burst = await burstPromise;

    // Queue should ensure only 1 refresh request
    expect(ctx.server.getRefreshRequestCount()).toBe(1);
    expect(burst.successes).toBe(5);

    // No reuse detection should have triggered
    expect(ctx.server.hadReuseDetection()).toBe(false);

    const noLogout = assertNoFalseLogout(tabs, { expectSessionLoss: false });
    expect(noLogout.passed).toBe(true);
  });

  it('single tab: proactive refresh + API call do not race', async () => {
    ctx = createScenarioContext('rotation-proactive-race', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [200, 300], // Slow enough to create race window
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const tab = createLoggedInTab(ctx, 'tab-1');
    tabs.push(tab);

    // Advance to proactive refresh point (14 min)
    // This triggers backgroundRefresh which calls startRefreshAndResolveQueue
    await vi.advanceTimersByTimeAsync(14 * ONE_MINUTE);

    // Immediately fire an API call (while proactive refresh is in-flight)
    const apiPromise = tab.makeApiCall();

    // Let everything settle
    await vi.advanceTimersByTimeAsync(1000);
    const result = await apiPromise;

    expect(result.success).toBe(true);
    expect(ctx.server.hadReuseDetection()).toBe(false);

    // backgroundRefresh checks `if (this.refreshPromise) return;`
    // OR getValidAccessToken sees refreshPromise and queues.
    // Either way, only 1 refresh should happen.
    const singleFlight = assertSingleRefreshFlight(ctx.server);
    expect(singleFlight.passed).toBe(true);
  });

  it('two refresh cycles with rotation do not cause reuse', async () => {
    ctx = createScenarioContext('rotation-multi-cycle', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [10, 50],
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const tab = createLoggedInTab(ctx, 'tab-1');
    tabs.push(tab);

    // Cycle 1: proactive refresh at 14 min
    await vi.advanceTimersByTimeAsync(14 * ONE_MINUTE);
    await vi.advanceTimersByTimeAsync(100);
    let result = await tab.makeApiCall();
    expect(result.success).toBe(true);

    // Cycle 2: next proactive refresh
    await vi.advanceTimersByTimeAsync(14 * ONE_MINUTE);
    await vi.advanceTimersByTimeAsync(100);
    result = await tab.makeApiCall();
    expect(result.success).toBe(true);

    expect(ctx.server.hadReuseDetection()).toBe(false);

    const noLogout = assertNoFalseLogout(tabs, { expectSessionLoss: false });
    expect(noLogout.passed).toBe(true);
  });

  it('without rotation: same refresh token works across refresh cycles', async () => {
    ctx = createScenarioContext('no-rotation', {
      rotateRefreshTokens: false,
      reuseDetection: false,
      responseLatencyMs: [10, 50],
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const tab = createLoggedInTab(ctx, 'tab-1');
    tabs.push(tab);

    // First cycle
    await vi.advanceTimersByTimeAsync(14 * ONE_MINUTE);
    await vi.advanceTimersByTimeAsync(100);
    let result = await tab.makeApiCall();
    expect(result.success).toBe(true);

    // Second cycle — same RT should work
    await vi.advanceTimersByTimeAsync(14 * ONE_MINUTE);
    await vi.advanceTimersByTimeAsync(100);
    result = await tab.makeApiCall();
    expect(result.success).toBe(true);

    const noLogout = assertNoFalseLogout(tabs, { expectSessionLoss: false });
    expect(noLogout.passed).toBe(true);
  });
});
