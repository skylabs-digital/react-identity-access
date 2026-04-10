/**
 * qa/harness/dsl.ts
 *
 * Higher-level DSL that flows and agents use to drive the library through
 * the existing `qa/simulator` primitives. This is a thin wrapper — it adds
 * ergonomic names, default configs, and helper assertions without
 * re-implementing anything.
 *
 * Usage (from a vitest test file that implements a flow):
 *
 *   import { startScenario, loginTab, expireAccessToken, advanceMs,
 *            expectSingleRefresh, teardown } from '../../harness/dsl';
 *
 *   const s = startScenario('my-flow');
 *   const tab = loginTab(s, 'tab-1');
 *   expireAccessToken(s);
 *   await advanceMs(s, 100);
 *   const result = await tab.sessionManager.getValidAccessToken();
 *   expectSingleRefresh(s);
 *   teardown(s);
 *
 * The DSL is sync where possible and async only where the library is async
 * (timers, API calls).
 */
import { vi } from 'vitest';
import {
  createScenarioContext,
  createLoggedInTab,
  cleanupScenario,
  BASE_URL,
  type ScenarioContext,
} from '../simulator/scenarios/base-scenario.js';
import type { BrowserTab } from '../simulator/actors/browser-tab.js';
import type { MockServerConfig } from '../simulator/types.js';
import { assertSingleRefreshFlight } from '../simulator/asserts/single-refresh-flight.js';
import { assertTokenConsistency } from '../simulator/asserts/token-consistency.js';
import { assertNoFalseLogout } from '../simulator/asserts/no-false-logout.js';

export interface Scenario {
  id: string;
  ctx: ScenarioContext;
  tabs: BrowserTab[];
  startedAt: number;
}

/** Start a new scenario with deterministic seed and mock server. */
export function startScenario(id: string, serverConfig?: Partial<MockServerConfig>): Scenario {
  // Ensure fake timers so we can advance time deterministically.
  vi.useFakeTimers({ shouldAdvanceTime: false });
  const ctx = createScenarioContext(id, serverConfig);
  return { id, ctx, tabs: [], startedAt: Date.now() };
}

/**
 * Create a "logged-in tab": SessionManager with valid tokens, sharing storage
 * with other tabs in the scenario.
 */
export function loginTab(s: Scenario, tabId: string): BrowserTab {
  const tab = createLoggedInTab(s.ctx, tabId);
  s.tabs.push(tab);
  return tab;
}

/** Add a second/third tab that shares storage (simulates a new browser tab). */
export function addTab(s: Scenario, tabId: string): BrowserTab {
  return loginTab(s, tabId);
}

/**
 * Advance simulated time by N milliseconds.
 * All scheduled timers (proactive refresh, backoff) fire in order.
 */
export async function advanceMs(_s: Scenario, ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
}

/** Sugar for common time spans. */
export const advanceMinutes = (s: Scenario, minutes: number) => advanceMs(s, minutes * 60 * 1000);
export const advanceSeconds = (s: Scenario, seconds: number) => advanceMs(s, seconds * 1000);

/** Expire the current access token by advancing to its expiry. */
export async function expireAccessToken(s: Scenario, marginMs = 1000): Promise<void> {
  // Default access token lifetime in the mock server is 15 min.
  await advanceMs(s, 15 * 60 * 1000 + marginMs);
}

/** Force the next refresh to fail (network error). */
export function failNextRefresh(s: Scenario, count = 1): void {
  s.ctx.server.injectFailures(count, 'network');
}

/** Force the next N refreshes to return a server error (5xx). */
export function serverErrorNext(s: Scenario, count = 1): void {
  s.ctx.server.injectFailures(count, '500');
}

/** Count of refresh requests the mock server has received so far. */
export function refreshRequestCount(s: Scenario): number {
  return s.ctx.server.getRefreshRequestCount();
}

/** The current access token as seen by a tab (via its SessionManager). */
export function currentAccessToken(tab: BrowserTab): string | null {
  return tab.sessionManager.getAccessToken();
}

// ─── Assertions ───

export function expectSingleRefresh(s: Scenario): void {
  const result = assertSingleRefreshFlight(s.ctx.server);
  if (!result.passed) {
    throw new Error(`[${s.id}] expectSingleRefresh failed: ${result.message}`);
  }
}

export function expectTokenConsistency(burst: {
  results: Array<{ success: boolean; token?: string }>;
}): void {
  const result = assertTokenConsistency(burst);
  if (!result.passed) {
    throw new Error(`expectTokenConsistency failed: ${result.message}`);
  }
}

export function expectNoFalseLogout(
  s: Scenario,
  opts: { expectSessionLoss?: boolean; reason?: string } = {}
): void {
  const result = assertNoFalseLogout(s.tabs, {
    expectSessionLoss: opts.expectSessionLoss ?? false,
    reason: opts.reason,
  });
  if (!result.passed) {
    throw new Error(`[${s.id}] expectNoFalseLogout failed: ${result.message}`);
  }
}

/** Teardown: destroy tabs, restore timers, reset singletons. */
export function teardown(s: Scenario): void {
  cleanupScenario(s.tabs);
  vi.restoreAllMocks();
  vi.useRealTimers();
}

export { BASE_URL };
