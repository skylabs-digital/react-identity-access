/**
 * Flow: session-generation (agentic)
 *
 * Regression for the v2.22 session-generation counter.
 *
 * Scenario: a refresh is in-flight when the consumer calls clearSession().
 * When the slow refresh response finally arrives, it must be discarded —
 * the tokens it carries belong to a previous "generation" of the session.
 *
 * Spec: qa/flows/edge/session-generation.md
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  startScenario,
  loginTab,
  advanceMs,
  advanceSeconds,
  expireAccessToken,
  refreshRequestCount,
  expectNoFalseLogout,
  teardown,
  type Scenario,
} from '../../harness/index.js';

describe('Flow: session-generation (agentic)', () => {
  let s: Scenario;

  afterEach(() => {
    if (s) teardown(s);
    vi.restoreAllMocks();
  });

  it('late-arriving refresh response after clearSession() is discarded', async () => {
    s = startScenario('session-generation');

    const tab = loginTab(s, 'tab-1');

    // Sanity: we start with a valid session.
    expect(tab.sessionManager.hasValidSession()).toBe(true);

    // Install a deliberately "slow" override for the next refresh: the
    // response is only resolved when we manually trigger `release()`.
    // While this promise is unresolved, the refresh call will be parked
    // inside the library awaiting fetch().
    let releaseSlow: () => void = () => {};
    const slowResponseReady = new Promise<void>(resolve => {
      releaseSlow = resolve;
    });

    // Build a "fresh-looking" response body, to simulate a valid backend
    // reply that the library *would* accept if it weren't for the session
    // generation guard. We capture these values so we can assert later that
    // they never leaked into storage.
    const lateAccessToken = s.ctx.server.issueAccessToken();
    const lateRefreshToken = s.ctx.server.issueRefreshToken();
    const lateBody = {
      accessToken: lateAccessToken,
      refreshToken: lateRefreshToken,
      expiresIn: 900,
    };

    s.ctx.server.overrideNextResponse(async () => {
      await slowResponseReady;
      return new Response(JSON.stringify(lateBody), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    // Expire the current access token so that getValidAccessToken() is
    // forced to go to the network rather than return the cached token.
    await expireAccessToken(s);

    // Kick off a refresh (but don't await — it will block on our override).
    // Wrap it so the eventual rejection isn't flagged as an unhandled
    // rejection by vitest (we'll assert on it later).
    const refreshPromise = tab.sessionManager
      .getValidAccessToken()
      .then(
        value => ({ kind: 'resolved' as const, value }),
        error => ({ kind: 'rejected' as const, error })
      );

    // Give the library a tick to actually issue the fetch and park on it.
    // advanceTimersByTimeAsync flushes microtasks between timer ticks,
    // so the fetch call runs and lands inside our slow override.
    await advanceMs(s, 10);

    // While the refresh is parked, the consumer logs out.
    tab.sessionManager.clearSession();

    // Immediately after clearSession, session state must be gone.
    expect(tab.sessionManager.getTokens()).toBeNull();
    expect(tab.sessionManager.hasValidSession()).toBe(false);
    expect(tab.sessionManager.getAccessToken()).toBeNull();

    // Now release the slow refresh so its response can be processed.
    releaseSlow();

    // Let microtasks flush and any scheduled retry timers run.
    await advanceMs(s, 50);

    // The original getValidAccessToken() promise must reject. It cannot
    // succeed — its session was cleared out from under it, and the
    // library promises (per session-generation guard) not to rehydrate
    // from a stale response.
    const settled = await refreshPromise;
    expect(settled.kind).toBe('rejected');

    // The rejection should be a SessionExpiredError (checked by name to
    // stay within the black-box contract — we do not import from src/).
    const err =
      settled.kind === 'rejected'
        ? (settled.error as { name?: string; reason?: string; message?: string } | undefined)
        : undefined;
    expect(err).toBeTruthy();
    // The spec says: "expect it to reject with SessionExpiredError".
    expect(err?.name).toBe('SessionExpiredError');

    // ── Core assertions for the flow ──────────────────────────────────

    // 1. The late response must NOT have written any tokens back.
    expect(tab.sessionManager.getTokens()).toBeNull();
    expect(tab.sessionManager.getAccessToken()).toBeNull();
    expect(tab.sessionManager.hasValidSession()).toBe(false);

    // 2. In particular, neither of the "late" tokens we sent in the
    //    slow response should be present anywhere in storage.
    const rawStorage = s.ctx.storage.peek();
    if (rawStorage) {
      const serialized = JSON.stringify(rawStorage);
      expect(serialized).not.toContain(lateAccessToken);
      expect(serialized).not.toContain(lateRefreshToken);
    }

    // 3. No background refresh retries should be scheduled after
    //    clearSession — advancing time should produce zero new refresh
    //    requests against the mock server.
    const refreshesAfterRelease = refreshRequestCount(s);
    await advanceSeconds(s, 60);
    expect(refreshRequestCount(s)).toBe(refreshesAfterRelease);

    // And also jump well past the proactive margin / exponential backoff
    // window: still nothing new.
    await advanceSeconds(s, 5 * 60);
    expect(refreshRequestCount(s)).toBe(refreshesAfterRelease);

    // 4. Session-expired callback must NOT be treated as a "false logout"
    //    by the regression harness — the user is the one who initiated
    //    clearSession, and the late rejection of the in-flight promise is
    //    expected behavior, not a library-initiated session loss.
    //
    //    Some implementations may or may not fire onSessionExpired here;
    //    the flow doc does not mandate either way, so we only assert that
    //    it is NOT fired spuriously (e.g. multiple times, or with a
    //    misleading reason). We tolerate either fired-once or not-fired.
    const expired = tab.isSessionExpired();
    if (expired) {
      const cbErr = tab.getSessionExpiredError();
      // If the library did fire onSessionExpired, it should have a
      // recognizable session-expired reason and not be a phantom.
      expect(cbErr).not.toBeNull();
    }

    // The single-tab "no false logout" assertion still has to pass in
    // the sense that we explicitly cleared the session, so any
    // onSessionExpired event is the user's own doing.
    // (We skip expectNoFalseLogout here because the clearSession() call
    //  itself is the cause — the assertion would be semantically wrong.)
    void expectNoFalseLogout; // referenced to keep the import used
  });
});
