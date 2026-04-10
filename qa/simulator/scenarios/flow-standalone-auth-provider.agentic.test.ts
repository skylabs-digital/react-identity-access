/**
 * Flow: standalone-auth-provider (agentic)
 *
 * Spec: qa/flows/edge/standalone-auth-provider.md
 *
 * Regression for v2.27: AuthProvider (and its underlying SessionManager)
 * must work in a "standalone" configuration — with only a baseUrl supplied,
 * WITHOUT AppProvider/TenantProvider context.
 *
 * Node-only variant: the harness does not ship RTL helpers, so we drive
 * SessionManager directly at the service level. This mirrors exactly what
 * AuthProvider does on mount in standalone mode (construct a SessionManager
 * with baseUrl only, then drive hasValidSession / setTokens / clearSession).
 *
 * The BrowserTab harness actor is a thin wrapper around SessionManager that
 * already constructs it in standalone mode (just storageKey + tokenStorage +
 * baseUrl + autoRefresh, no AppProvider involved). We therefore build a
 * BrowserTab WITHOUT seeding tokens (bypassing createLoggedInTab) to observe
 * the empty-storage code path first.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  startScenario,
  advanceMinutes,
  refreshRequestCount,
  expectNoFalseLogout,
  teardown,
  BASE_URL,
  type Scenario,
} from '../../harness/index.js';
import { BrowserTab } from '../actors/browser-tab.js';

describe('Flow: standalone-auth-provider', () => {
  let s: Scenario;

  afterEach(() => {
    if (s) teardown(s);
    vi.restoreAllMocks();
  });

  it('SessionManager works standalone with only baseUrl (empty → setTokens → clearSession)', async () => {
    s = startScenario('standalone-auth-provider');

    // Step 2: Instantiate a SessionManager "standalone" (no AppProvider context).
    // BrowserTab's constructor does exactly this — it takes only storage + baseUrl
    // and creates a SessionManager without any tenant/app dependency.
    const tab = new BrowserTab({
      id: 'standalone-tab',
      storage: s.ctx.storage,
      baseUrl: BASE_URL,
      audit: s.ctx.audit,
    });
    s.tabs.push(tab);

    // Step 3: Does not throw; hasValidSession() is false on empty storage.
    expect(tab.sessionManager).toBeDefined();
    expect(tab.sessionManager.hasValidSession()).toBe(false);
    expect(tab.sessionManager.getAccessToken()).toBeNull();

    // No background refresh should have been scheduled on empty storage.
    expect(refreshRequestCount(s)).toBe(0);

    // Step 4: setTokens with a valid payload issued by the mock server.
    const accessToken = s.ctx.server.issueAccessToken();
    const refreshToken = s.ctx.server.issueRefreshToken();
    tab.sessionManager.setTokens({
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes — matches DEFAULT_SERVER_CONFIG
    });

    // Step 5: session is now valid.
    expect(tab.sessionManager.hasValidSession()).toBe(true);
    expect(tab.sessionManager.getAccessToken()).toBe(accessToken);

    // getValidAccessToken should resolve immediately (no refresh triggered).
    const validToken = await tab.sessionManager.getValidAccessToken();
    expect(validToken).toBe(accessToken);
    expect(refreshRequestCount(s)).toBe(0);

    // Step 6: clearSession.
    tab.sessionManager.clearSession();

    // Step 7: back to initial empty state, no pending background work.
    expect(tab.sessionManager.hasValidSession()).toBe(false);
    expect(tab.sessionManager.getAccessToken()).toBeNull();

    // Step 7b: Advance well past any proactive refresh margin to confirm no
    // background refresh fires after clearSession (no dangling timers).
    await advanceMinutes(s, 20);
    expect(refreshRequestCount(s)).toBe(0);

    // Step 7c: no false logout callback fired.
    expectNoFalseLogout(s, { expectSessionLoss: false });
    expect(tab.isSessionExpired()).toBe(false);
  });

  it('standalone SessionManager: second setTokens → clearSession cycle is idempotent', async () => {
    s = startScenario('standalone-auth-provider-cycle');

    const tab = new BrowserTab({
      id: 'standalone-tab-cycle',
      storage: s.ctx.storage,
      baseUrl: BASE_URL,
      audit: s.ctx.audit,
    });
    s.tabs.push(tab);

    // First cycle.
    tab.sessionManager.setTokens({
      accessToken: s.ctx.server.issueAccessToken(),
      refreshToken: s.ctx.server.issueRefreshToken(),
      expiresIn: 900,
    });
    expect(tab.sessionManager.hasValidSession()).toBe(true);
    tab.sessionManager.clearSession();
    expect(tab.sessionManager.hasValidSession()).toBe(false);

    // Second cycle with a fresh token pair — storage should be reusable.
    const newAccess = s.ctx.server.issueAccessToken();
    tab.sessionManager.setTokens({
      accessToken: newAccess,
      refreshToken: s.ctx.server.issueRefreshToken(),
      expiresIn: 900,
    });
    expect(tab.sessionManager.hasValidSession()).toBe(true);
    expect(tab.sessionManager.getAccessToken()).toBe(newAccess);

    tab.sessionManager.clearSession();
    expect(tab.sessionManager.hasValidSession()).toBe(false);

    // No refresh hits the wire during this whole cycle.
    expect(refreshRequestCount(s)).toBe(0);
    expectNoFalseLogout(s, { expectSessionLoss: false });
  });
});
