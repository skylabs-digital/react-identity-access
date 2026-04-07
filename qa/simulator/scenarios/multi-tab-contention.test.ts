/**
 * Scenario: Multi-Tab Contention
 *
 * Multiple browser tabs share localStorage. When one tab refreshes the token
 * and the server rotates refresh tokens, other tabs may still hold the old
 * refresh token in memory. If they try to refresh with it, the server
 * detects "reuse" and revokes all sessions.
 *
 * The fix uses two layers:
 * 1. Re-read refresh token from storage before each fetch (catches sequential races)
 * 2. Web Locks API to serialize refresh across tabs (catches simultaneous races)
 *
 * Key stress points:
 * - Two tabs reading same RT from storage simultaneously
 * - Tab A refreshes → gets RT2, writes to storage
 * - Tab B already read RT1 → sends RT1 → server says "reuse detected"
 * - The singleton pattern prevents this within same JS context, but
 *   real browser tabs have separate JS contexts
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager } from '../../../src/services/SessionManager.js';
import {
  createScenarioContext,
  cleanupScenario,
  BASE_URL,
  type ScenarioContext,
} from './base-scenario.js';
import { BrowserTab } from '../actors/browser-tab.js';
import { SharedStorage } from '../core/shared-storage.js';
import { assertNoFalseLogout } from '../asserts/no-false-logout.js';

const ONE_MINUTE = 60 * 1000;
const ONE_SECOND = 1000;

/**
 * Minimal Web Locks API mock that serializes lock requests per name.
 * Simulates the browser's navigator.locks.request() behavior.
 */
function createWebLocksMock() {
  const queues = new Map<string, Array<() => void>>();

  return {
    request: async (name: string, callback: () => Promise<any>) => {
      // Get or create the queue for this lock name
      if (!queues.has(name)) {
        queues.set(name, []);
      }
      const queue = queues.get(name)!;

      // If someone else holds the lock, wait in the queue
      if (queue.length > 0) {
        await new Promise<void>(resolve => {
          queue.push(resolve);
        });
      } else {
        // Mark lock as held (put a placeholder in the queue)
        queue.push(() => {});
      }

      try {
        return await callback();
      } finally {
        // Release: remove ourselves, wake next waiter
        queue.shift();
        if (queue.length > 0) {
          const next = queue[0];
          // Replace the waiter's resolve with a placeholder
          queue[0] = () => {};
          next();
        }
      }
    },
  };
}

describe('Scenario: Multi-Tab Contention', () => {
  let ctx: ScenarioContext;
  let tabs: BrowserTab[];

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    tabs = [];
  });

  afterEach(() => {
    cleanupScenario(tabs);
    // Clean up navigator.locks mock
    if (typeof navigator !== 'undefined') {
      vi.stubGlobal('navigator', { ...navigator, locks: undefined });
    }
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  /**
   * IMPORTANT: In this test, each BrowserTab creates its OWN SessionManager
   * instance (not using getInstance singleton) to simulate separate JS contexts.
   * They share the same SharedStorage to simulate localStorage.
   */

  it('two tabs: both active, sequential refresh — no contention', async () => {
    ctx = createScenarioContext('multi-tab-sequential', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [10, 50],
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    // Create initial tokens
    const accessToken = ctx.server.issueAccessToken();
    const refreshToken = ctx.server.issueRefreshToken();
    ctx.storage.set({
      accessToken,
      refreshToken,
      expiresAt: Date.now() + 15 * ONE_MINUTE,
    });

    const sessionExpiries: string[] = [];
    const onExpired = (tabId: string) => sessionExpiries.push(tabId);

    const tab1 = new BrowserTab({
      id: 'tab-1', storage: ctx.storage, baseUrl: BASE_URL,
      audit: ctx.audit, onSessionExpired: onExpired,
    });
    const tab2 = new BrowserTab({
      id: 'tab-2', storage: ctx.storage, baseUrl: BASE_URL,
      audit: ctx.audit, onSessionExpired: onExpired,
    });
    tabs.push(tab1, tab2);

    // Both tabs make API calls (tokens are still valid)
    let r1 = await tab1.makeApiCall();
    let r2 = await tab2.makeApiCall();
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);

    // Advance to near expiry — proactive refresh triggers on tab1
    await vi.advanceTimersByTimeAsync(14 * ONE_MINUTE);
    // Let tab1's refresh complete
    await vi.advanceTimersByTimeAsync(ONE_SECOND);

    // Tab2's proactive refresh also triggers (separate timer)
    // But by now, tab1 already wrote new RT to storage
    // Tab2 reads NEW RT from storage → no reuse
    await vi.advanceTimersByTimeAsync(ONE_SECOND);

    // Both should still work
    r1 = await tab1.makeApiCall();
    r2 = await tab2.makeApiCall();

    // Note: Tab2 may or may not succeed depending on whether its
    // SessionManager instance has the old RT in memory.
    // The key question is: does SessionManager re-read RT from storage
    // before each refresh, or does it use a cached value?

    // Document the actual behavior
    if (r2.success) {
      console.log('[multi-tab-sequential] Tab2 succeeded — reads fresh RT from storage');
    } else {
      console.log('[multi-tab-sequential] Tab2 FAILED — used stale RT from memory');
    }

    // Check if reuse was detected
    if (ctx.server.hadReuseDetection()) {
      console.warn('[multi-tab-sequential] REUSE DETECTED — this is a potential production issue');
    }
  });

  it('two tabs: simultaneous refresh with rotation — potential reuse', async () => {
    ctx = createScenarioContext('multi-tab-simultaneous', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [200, 300], // Slow enough that both tabs start before either finishes
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const accessToken = ctx.server.issueAccessToken();
    const refreshToken = ctx.server.issueRefreshToken();
    ctx.storage.set({
      accessToken,
      refreshToken,
      expiresAt: Date.now() + 15 * ONE_MINUTE,
    });

    const sessionExpiries: Array<{ tabId: string; reason: string }> = [];
    const onExpired = (tabId: string, error: any) => {
      sessionExpiries.push({ tabId, reason: error?.reason || 'unknown' });
    };

    const tab1 = new BrowserTab({
      id: 'tab-1', storage: ctx.storage, baseUrl: BASE_URL,
      audit: ctx.audit, onSessionExpired: onExpired,
    });
    const tab2 = new BrowserTab({
      id: 'tab-2', storage: ctx.storage, baseUrl: BASE_URL,
      audit: ctx.audit, onSessionExpired: onExpired,
    });
    tabs.push(tab1, tab2);

    // Advance past token expiry
    await vi.advanceTimersByTimeAsync(15 * ONE_MINUTE + 1000);

    // Both tabs try to make API calls simultaneously
    // Both will read the same expired access token and same refresh token
    // Both will attempt to refresh
    const p1 = tab1.makeApiCall();
    const p2 = tab2.makeApiCall();

    // Let both refreshes complete
    await vi.advanceTimersByTimeAsync(2 * ONE_SECOND);
    const [r1, r2] = await Promise.all([p1, p2]);

    // Document the behavior — this is the critical test
    const reuseDetected = ctx.server.hadReuseDetection();
    const log = ctx.server.getFetchCallLog();

    console.log(`[multi-tab-simultaneous] Results:`);
    console.log(`  Tab1: ${r1.success ? 'OK' : 'FAIL'}`);
    console.log(`  Tab2: ${r2.success ? 'OK' : 'FAIL'}`);
    console.log(`  Reuse detected: ${reuseDetected}`);
    console.log(`  Total refresh requests: ${log.length}`);
    console.log(`  Session expiries: ${JSON.stringify(sessionExpiries)}`);
    console.log(`  Fetch log: ${JSON.stringify(log.map(l => l.result))}`);

    if (reuseDetected) {
      console.warn(
        '\n  ⚠ CONFIRMED: Multi-tab contention causes reuse detection with token rotation.\n' +
        '  This is a real production vulnerability. Possible fixes:\n' +
        '  1. Use BroadcastChannel to coordinate refresh across tabs\n' +
        '  2. Use a lock (Web Locks API) before refreshing\n' +
        '  3. Server: grace period for recently-rotated tokens\n' +
        '  4. Re-read refresh token from storage before each refresh attempt\n'
      );
    }
  });

  it('three tabs WITHOUT Web Locks: reuse detected (documents the vulnerability)', async () => {
    // No Web Locks — demonstrates the problem that Web Locks fixes
    ctx = createScenarioContext('multi-tab-3-no-locks', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [10, 50],
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const accessToken = ctx.server.issueAccessToken();
    const refreshToken = ctx.server.issueRefreshToken();
    ctx.storage.set({
      accessToken,
      refreshToken,
      expiresAt: Date.now() + 15 * ONE_MINUTE,
    });

    const sessionExpiries: string[] = [];
    const onExpired = (tabId: string) => sessionExpiries.push(tabId);

    const tab1 = new BrowserTab({
      id: 'tab-1', storage: ctx.storage, baseUrl: BASE_URL,
      audit: ctx.audit, onSessionExpired: onExpired,
    });
    const tab2 = new BrowserTab({
      id: 'tab-2', storage: ctx.storage, baseUrl: BASE_URL,
      audit: ctx.audit, onSessionExpired: onExpired,
    });
    const tab3 = new BrowserTab({
      id: 'tab-3', storage: ctx.storage, baseUrl: BASE_URL,
      audit: ctx.audit, onSessionExpired: onExpired,
    });
    tabs.push(tab1, tab2, tab3);

    // Jump to past expiry — all 3 tabs will need to refresh
    vi.setSystemTime(Date.now() + 16 * ONE_MINUTE);

    // All 3 tabs make API calls simultaneously — without locks, reuse is expected
    const [r1, r2, r3] = await Promise.all([
      tab1.makeApiCall(),
      tab2.makeApiCall(),
      tab3.makeApiCall(),
    ]);

    console.log(`[multi-tab-3-no-locks] Results: tab1=${r1.success}, tab2=${r2.success}, tab3=${r3.success}`);
    console.log(`[multi-tab-3-no-locks] Reuse detected: ${ctx.server.hadReuseDetection()}`);

    // Without Web Locks, reuse IS expected for truly simultaneous calls
    expect(ctx.server.hadReuseDetection()).toBe(true);
  });

  it('three tabs WITH Web Locks: all survive — no reuse', async () => {
    // Install Web Locks mock — simulates browser's navigator.locks.request()
    const locksMock = createWebLocksMock();
    vi.stubGlobal('navigator', { locks: locksMock });

    ctx = createScenarioContext('multi-tab-3-with-locks', {
      rotateRefreshTokens: true,
      reuseDetection: true,
      responseLatencyMs: [10, 50],
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const accessToken = ctx.server.issueAccessToken();
    const refreshToken = ctx.server.issueRefreshToken();
    ctx.storage.set({
      accessToken,
      refreshToken,
      expiresAt: Date.now() + 15 * ONE_MINUTE,
    });

    const sessionExpiries: string[] = [];
    const onExpired = (tabId: string) => sessionExpiries.push(tabId);

    const tab1 = new BrowserTab({
      id: 'tab-1', storage: ctx.storage, baseUrl: BASE_URL,
      audit: ctx.audit, onSessionExpired: onExpired,
    });
    const tab2 = new BrowserTab({
      id: 'tab-2', storage: ctx.storage, baseUrl: BASE_URL,
      audit: ctx.audit, onSessionExpired: onExpired,
    });
    const tab3 = new BrowserTab({
      id: 'tab-3', storage: ctx.storage, baseUrl: BASE_URL,
      audit: ctx.audit, onSessionExpired: onExpired,
    });
    tabs.push(tab1, tab2, tab3);

    // Jump to past expiry — all 3 tabs will need to refresh
    vi.setSystemTime(Date.now() + 16 * ONE_MINUTE);

    // All 3 tabs make API calls simultaneously
    // With Web Locks: Tab1 acquires lock → refreshes → Tab2 acquires lock → reads fresh token → skips → Tab3 same
    const [r1, r2, r3] = await Promise.all([
      tab1.makeApiCall(),
      tab2.makeApiCall(),
      tab3.makeApiCall(),
    ]);

    console.log(`[multi-tab-3-with-locks] Results: tab1=${r1.success}, tab2=${r2.success}, tab3=${r3.success}`);
    console.log(`[multi-tab-3-with-locks] Reuse detected: ${ctx.server.hadReuseDetection()}`);
    console.log(`[multi-tab-3-with-locks] Fetch calls: ${ctx.server.getRefreshRequestCount()}`);
    console.log(`[multi-tab-3-with-locks] Session expiries: ${JSON.stringify(sessionExpiries)}`);

    // With Web Locks: NO reuse, all tabs survive
    expect(ctx.server.hadReuseDetection()).toBe(false);
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(r3.success).toBe(true);
    expect(sessionExpiries).toHaveLength(0);

    // Only 1 actual fetch — the other 2 tabs found fresh tokens after acquiring the lock
    expect(ctx.server.getRefreshRequestCount()).toBe(1);

    const noLogout = assertNoFalseLogout(tabs, { expectSessionLoss: false });
    expect(noLogout.passed).toBe(true);
  });

  it('two tabs without rotation: both survive', async () => {
    ctx = createScenarioContext('multi-tab-no-rotation', {
      rotateRefreshTokens: false, // No rotation — same RT always works
      reuseDetection: false,
      responseLatencyMs: [10, 50],
      accessTokenLifetimeMs: 15 * ONE_MINUTE,
    });

    const accessToken = ctx.server.issueAccessToken();
    const refreshToken = ctx.server.issueRefreshToken();
    ctx.storage.set({
      accessToken,
      refreshToken,
      expiresAt: Date.now() + 15 * ONE_MINUTE,
    });

    const tab1 = new BrowserTab({
      id: 'tab-1', storage: ctx.storage, baseUrl: BASE_URL,
      audit: ctx.audit,
    });
    const tab2 = new BrowserTab({
      id: 'tab-2', storage: ctx.storage, baseUrl: BASE_URL,
      audit: ctx.audit,
    });
    tabs.push(tab1, tab2);

    // Both tabs make calls, then advance past expiry and make calls again
    await tab1.makeApiCall();
    await tab2.makeApiCall();
    await vi.advanceTimersByTimeAsync(100);

    // Advance past expiry — triggers refresh
    await vi.advanceTimersByTimeAsync(15 * ONE_MINUTE + ONE_SECOND);

    // Both tabs make calls — both need to refresh
    const r1 = await tab1.makeApiCall();
    await vi.advanceTimersByTimeAsync(ONE_SECOND);
    const r2 = await tab2.makeApiCall();
    await vi.advanceTimersByTimeAsync(ONE_SECOND);

    // Without rotation, both tabs should succeed (same RT works multiple times)
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);

    const noLogout = assertNoFalseLogout(tabs, { expectSessionLoss: false });
    expect(noLogout.passed).toBe(true);
    expect(ctx.server.hadReuseDetection()).toBe(false);
  });
});
