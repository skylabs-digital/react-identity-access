/**
 * Flow: login-logout (agentic)
 *
 * Simplest login → logout lifecycle via direct sessionManager.setTokens()
 * and clearSession(). No tenant switch, no magic link, no multi-tab.
 *
 * Spec: qa/flows/smoke/login-logout.md
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  startScenario,
  loginTab,
  advanceSeconds,
  refreshRequestCount,
  expectNoFalseLogout,
  teardown,
  type Scenario,
} from '../../harness/index.js';

describe('Flow: login-logout (agentic)', () => {
  let s: Scenario;

  afterEach(() => {
    if (s) teardown(s);
    vi.restoreAllMocks();
  });

  it('setTokens produces a valid session, clearSession removes it, and no background refresh fires after logout', async () => {
    s = startScenario('login-logout');

    // Step 1-2: Create a tab and start with no tokens in storage.
    // loginTab auto-populates tokens when storage is empty, so we immediately
    // clear them to simulate a pre-login state.
    const tab = loginTab(s, 'tab-1');
    tab.sessionManager.clearSession();

    // Sanity: pre-login state is empty.
    expect(tab.sessionManager.getTokens()).toBeNull();
    expect(tab.sessionManager.hasValidSession()).toBe(false);

    // Step 2: Simulate a successful login by setting tokens directly.
    const accessToken = s.ctx.server.issueAccessToken();
    const refreshToken = s.ctx.server.issueRefreshToken();
    tab.sessionManager.setTokens({
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes
    });

    // Refresh counter baseline — any refreshes after this point came
    // from background work we're watching for.
    const refreshBaseline = refreshRequestCount(s);

    // Step 3: Assert valid session.
    expect(tab.sessionManager.hasValidSession()).toBe(true);
    const tokens = tab.sessionManager.getTokens();
    expect(tokens).not.toBeNull();
    expect(tokens?.accessToken).toBe(accessToken);
    expect(tokens?.refreshToken).toBe(refreshToken);

    // Step 4: Simulate logout.
    tab.sessionManager.clearSession();

    // Step 5: Assert tokens cleared + no valid session.
    expect(tab.sessionManager.getTokens()).toBeNull();
    expect(tab.sessionManager.hasValidSession()).toBe(false);

    // Step 6: Advance 30 seconds. No background refresh should fire
    // (proactive refresh margin is 60s before a 15m expiry = ~14m from now,
    // but after clearSession there should be nothing to refresh at all).
    await advanceSeconds(s, 30);

    // Step 7: No refresh attempts since logout.
    expect(refreshRequestCount(s)).toBe(refreshBaseline);

    // Also advance further to make sure the proactive refresh timer was
    // truly cancelled by clearSession (would fire around 14m if still alive).
    await advanceSeconds(s, 14 * 60);
    expect(refreshRequestCount(s)).toBe(refreshBaseline);

    // No onSessionExpired callback should have fired (logout != expiry).
    expect(tab.isSessionExpired()).toBe(false);
    expectNoFalseLogout(s, { expectSessionLoss: false });
  });
});
