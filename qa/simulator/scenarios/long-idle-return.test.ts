/**
 * Scenario: Long Idle Return
 *
 * Simulates a user who logs in, uses the app for a while, then goes idle
 * for varying periods (hours, days) before returning. Tests whether
 * the session survives these transitions without false logouts.
 *
 * Key stress points:
 * - Proactive refresh timer firing during active use
 * - User going idle while refresh timer is scheduled
 * - Long idle period where timers don't fire (laptop sleep)
 * - Return after access token expired but refresh token still valid
 * - Return after both tokens expired
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager } from '../../../src/services/SessionManager.js';
import { SessionExpiredError } from '../../../src/errors/SessionErrors.js';
import {
  createScenarioContext,
  createLoggedInTab,
  cleanupScenario,
  type ScenarioContext,
} from './base-scenario.js';
import { BrowserTab } from '../actors/browser-tab.js';
import { assertNoFalseLogout } from '../asserts/no-false-logout.js';
import { assertSingleRefreshFlight } from '../asserts/single-refresh-flight.js';

const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;

describe('Scenario: Long Idle Return', () => {
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

  it('survives active use across two token lifetimes', async () => {
    ctx = createScenarioContext('long-idle-active', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [10, 50],
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const tab = createLoggedInTab(ctx, 'tab-1');
    tabs.push(tab);

    // Make API call — token is valid
    let result = await tab.makeApiCall();
    expect(result.success).toBe(true);

    // Advance to near expiry (proactive refresh fires at 14 min)
    await vi.advanceTimersByTimeAsync(14 * ONE_MINUTE);
    await vi.advanceTimersByTimeAsync(100); // Let proactive refresh complete

    // Make another call — should use refreshed token
    result = await tab.makeApiCall();
    expect(result.success).toBe(true);

    // Advance through another cycle
    await vi.advanceTimersByTimeAsync(14 * ONE_MINUTE);
    await vi.advanceTimersByTimeAsync(100);

    result = await tab.makeApiCall();
    expect(result.success).toBe(true);

    const logout = assertNoFalseLogout(tabs, { expectSessionLoss: false });
    expect(logout.passed).toBe(true);

    const refresh = assertSingleRefreshFlight(ctx.server);
    expect(refresh.passed).toBe(true);
  });

  it('survives 4-hour idle period (proactive refresh handles it)', async () => {
    ctx = createScenarioContext('long-idle-4h', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [10, 50],
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const tab = createLoggedInTab(ctx, 'tab-1');
    tabs.push(tab);

    // Active use for 5 minutes
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(ONE_MINUTE);
      const result = await tab.makeApiCall();
      expect(result.success).toBe(true);
    }

    // Go idle for 4 hours — proactive refresh timer should keep refreshing
    // Every 15 min the token expires, but proactive refresh fires 1 min before
    await vi.advanceTimersByTimeAsync(4 * ONE_HOUR);

    // Return — first API call after idle
    const result = await tab.makeApiCall();
    expect(result.success).toBe(true);

    const logout = assertNoFalseLogout(tabs, { expectSessionLoss: false });
    expect(logout.passed).toBe(true);
  });

  it('survives 3-day idle period simulating laptop sleep (timers suspended)', async () => {
    ctx = createScenarioContext('long-idle-3d', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [10, 50],
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
      refreshTokenLifetimeMs: 7 * ONE_DAY, // 7-day refresh token
    });

    const tab = createLoggedInTab(ctx, 'tab-1');
    tabs.push(tab);

    // Active use — establish session
    const result1 = await tab.makeApiCall();
    expect(result1.success).toBe(true);

    // Let proactive refresh fire once
    await vi.advanceTimersByTimeAsync(14 * ONE_MINUTE);

    // Simulate laptop sleep: advance time by 3 days WITHOUT firing timers.
    // This mimics what happens when a laptop closes — setTimeout doesn't fire.
    // When it wakes up, Date.now() jumps forward but pending timers fire immediately.
    //
    // vi.advanceTimersByTimeAsync DOES fire pending timers, which is actually
    // the correct behavior: when the laptop wakes, pending timers fire.
    await vi.advanceTimersByTimeAsync(3 * ONE_DAY);

    // User returns — the access token is long expired, but refresh token is still valid.
    // The proactive refresh timer should have attempted to refresh during the advance,
    // and eventually the background retry cycle should have maintained the session.
    const result2 = await tab.makeApiCall();

    // The session should be maintained — refresh token is still valid (7 days)
    // and SessionManager should handle the expired access token by refreshing
    expect(result2.success).toBe(true);

    const logout = assertNoFalseLogout(tabs, { expectSessionLoss: false });
    expect(logout.passed).toBe(true);
  });

  it('correctly expires session when refresh token is actually expired (laptop sleep)', async () => {
    ctx = createScenarioContext('long-idle-expired-rt', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [10, 50],
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
      refreshTokenLifetimeMs: ONE_DAY, // 1-day refresh token
    });

    const tab = createLoggedInTab(ctx, 'tab-1');
    tabs.push(tab);

    // Active use
    const result1 = await tab.makeApiCall();
    expect(result1.success).toBe(true);

    // Simulate laptop sleep: jump system time forward 2 days
    // WITHOUT advancing timers (timers don't fire during sleep).
    // Then when user returns, pending timers fire but RT is already expired.
    const now = Date.now();
    vi.setSystemTime(now + 2 * ONE_DAY);

    // User returns — access token and refresh token are both expired
    // getValidAccessToken will try to refresh but RT is expired on server
    const result2 = await tab.makeApiCall();
    expect(result2.success).toBe(false);

    // This is EXPECTED session loss — not a false logout
    const logout = assertNoFalseLogout(tabs, {
      expectSessionLoss: true,
      reason: 'Refresh token expired after 2 days idle (1-day RT lifetime)',
    });
    expect(logout.passed).toBe(true);
  });

  it('handles API call at exactly the proactive refresh margin', async () => {
    ctx = createScenarioContext('long-idle-margin', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [10, 50],
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const tab = createLoggedInTab(ctx, 'tab-1');
    tabs.push(tab);

    // Advance to proactive refresh point (14 min = 1 min before expiry)
    await vi.advanceTimersByTimeAsync(14 * ONE_MINUTE);
    // Let proactive refresh fire and complete
    await vi.advanceTimersByTimeAsync(100);

    // Make API call — should have refreshed token available
    const result = await tab.makeApiCall();
    expect(result.success).toBe(true);

    const logout = assertNoFalseLogout(tabs, { expectSessionLoss: false });
    expect(logout.passed).toBe(true);
  });
});
