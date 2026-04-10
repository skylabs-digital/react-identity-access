/**
 * Flow: refresh-happy-path
 *
 * Canary for the refresh pipeline. Exercises the simplest possible
 * proactive-refresh lifecycle and asserts no duplicates, no false logout,
 * and a valid session at the end.
 *
 * Spec: qa/flows/smoke/refresh-happy-path.md
 *
 * This file is the "crystallized" form of the flow — a deterministic vitest
 * regression test that uses the harness DSL. Run it via:
 *
 *   yarn sim qa/simulator/scenarios/flow-refresh-happy-path.test.ts
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  startScenario,
  loginTab,
  advanceMinutes,
  refreshRequestCount,
  expectSingleRefresh,
  expectNoFalseLogout,
  teardown,
  type Scenario,
} from '../../harness/index.js';

describe('Flow: refresh-happy-path', () => {
  let s: Scenario;

  afterEach(() => {
    if (s) teardown(s);
    vi.restoreAllMocks();
  });

  it('proactive refresh fires once, session stays valid, no false logout', async () => {
    s = startScenario('refresh-happy-path');
    const tab = loginTab(s, 'tab-1');
    const initialToken = tab.sessionManager.getAccessToken();
    expect(initialToken).toBeTruthy();

    // Cross the proactive margin (60s before 15m expiry = at ~14m).
    await advanceMinutes(s, 14);

    // Let any queued work settle.
    await advanceMinutes(s, 1);

    // Exactly one refresh request should have been issued.
    expect(refreshRequestCount(s)).toBe(1);

    // No duplicate RT-on-the-wire.
    expectSingleRefresh(s);

    // Session must NOT have expired.
    expectNoFalseLogout(s, { expectSessionLoss: false });

    // The tab still has a valid session and a different access token.
    expect(tab.sessionManager.hasValidSession()).toBe(true);
    const newToken = tab.sessionManager.getAccessToken();
    expect(newToken).toBeTruthy();
    expect(newToken).not.toBe(initialToken);
  });
});
