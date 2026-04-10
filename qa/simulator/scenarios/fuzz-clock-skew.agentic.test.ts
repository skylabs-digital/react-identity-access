/**
 * Fuzz flow: clock-skew-fuzz
 *
 * Spec: qa/flows/fuzz/clock-skew-fuzz.md
 *
 * Mess with Date.now() / time advancement to see how the refresh scheduler
 * copes with clock drift / NTP corrections / DST edges / proactive-margin
 * mis-configuration / past-dated tokens.
 *
 * Vectors:
 *  1. Forward NTP jump of 2h mid-session (does it stampede refreshes?).
 *  2. Backward NTP jump of 10min mid-session (does it stop firing a refresh?).
 *  3. Repeated small backwards jumps (second-by-second clock wobble).
 *  4. Huge forward jump of 1 year in one go.
 *  5. proactiveRefreshMargin greater than the access token lifetime.
 *  6. Persistent positive drift (client 5 min ahead of server).
 *  7. Persistent negative drift (client 5 min behind server).
 *
 * Observations are written to qa/reports/.tmp/clock-skew-fuzz.json via the
 * fuzz harness at the end of the suite.
 */
import { describe, it, afterEach, afterAll, vi } from 'vitest';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import {
  startScenario,
  loginTab,
  advanceMs,
  advanceMinutes,
  advanceSeconds,
  refreshRequestCount,
  expectNoFalseLogout,
  teardown,
  type Scenario,
} from '../../harness/index.js';

const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_YEAR = 365 * 24 * ONE_HOUR;

type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';
type Status = 'pass' | 'fail' | 'error';

interface Finding {
  vector: string;
  status: Status;
  severity: Severity;
  observation: string;
  evidence?: Record<string, unknown>;
  recommendedCrystallizedFlow?: string;
}

const findings: Finding[] = [];

function record(f: Finding): void {
  findings.push(f);
}

describe('Fuzz: clock-skew', () => {
  let s: Scenario;

  afterEach(() => {
    if (s) teardown(s);
    vi.restoreAllMocks();
  });

  afterAll(() => {
    const outDir = resolve(__dirname, '../../reports/.tmp');
    mkdirSync(outDir, { recursive: true });
    const passed = findings.filter((f) => f.status === 'pass').length;
    const failed = findings.filter((f) => f.status === 'fail').length;
    const errored = findings.filter((f) => f.status === 'error').length;
    const report = {
      flowId: 'clock-skew-fuzz',
      generatedAt: new Date(0).toISOString(), // deterministic under fake timers
      summary: {
        total: findings.length,
        passed,
        failed,
        errored,
      },
      findings,
    };
    writeFileSync(
      resolve(outDir, 'clock-skew-fuzz.json'),
      JSON.stringify(report, null, 2),
      'utf-8',
    );
  });

  // ───────────────────────────────────────────────────────────────────────
  // Vector 1: forward NTP jump of 2h mid-session
  // ───────────────────────────────────────────────────────────────────────
  it('v1: forward 2h NTP jump does not stampede refreshes', async () => {
    const vector = 'forward-2h-ntp-jump';
    try {
      s = startScenario('fuzz-clock-skew-v1', {
        accessTokenLifetimeMs: 15 * ONE_MINUTE,
      });
      const tab = loginTab(s, 'tab-1');

      // Baseline active use — make sure proactive timer is scheduled.
      let r = await tab.makeApiCall();
      const baseline = refreshRequestCount(s);

      // Jump system clock forward by 2 hours WITHOUT advancing timers.
      // Mimics NTP correction that re-aligned a fast client clock backwards
      // (or a slow one forwards) — whichever way, Date.now() suddenly jumps.
      const nowBefore = Date.now();
      vi.setSystemTime(nowBefore + 2 * ONE_HOUR);

      // Settle: advance a short slice so any "oh the clock moved" reaction
      // has a chance to fire, but not so long that the normal 14-minute
      // proactive timer naturally fires.
      await advanceMs(s, 500);

      const duringJump = refreshRequestCount(s);
      const stampede = duringJump - baseline;

      // After the jump, pending timers live in real-clock coordinates.
      // When we advance by the remaining time to the proactive point, at
      // most ONE additional refresh should occur.
      await advanceMinutes(s, 15);
      await advanceMs(s, 200);

      const afterSettle = refreshRequestCount(s);
      const totalAfterJump = afterSettle - baseline;

      // API call still succeeds.
      r = await tab.makeApiCall();

      if (stampede > 1) {
        record({
          vector,
          status: 'fail',
          severity: 'high',
          observation: `Forward clock jump triggered ${stampede} refreshes in one settle-tick (stampede)`,
          evidence: { baseline, duringJump, afterSettle },
          recommendedCrystallizedFlow: 'qa/flows/edge/ntp-forward-jump-stampede.md',
        });
      } else if (!r.success) {
        record({
          vector,
          status: 'fail',
          severity: 'high',
          observation: 'API call failed after forward NTP jump',
          evidence: { baseline, duringJump, afterSettle },
        });
      } else {
        record({
          vector,
          status: 'pass',
          severity: 'info',
          observation: `Forward NTP jump of 2h handled cleanly. Refreshes during settle=${stampede}, total after=${totalAfterJump}.`,
          evidence: { baseline, duringJump, afterSettle },
        });
      }
      expectNoFalseLogout(s, { expectSessionLoss: false });
    } catch (err) {
      record({
        vector,
        status: 'error',
        severity: 'critical',
        observation: `Uncaught exception: ${(err as Error).message}`,
        evidence: { stack: (err as Error).stack?.split('\n').slice(0, 5).join('\n') },
      });
      throw err;
    }
  });

  // ───────────────────────────────────────────────────────────────────────
  // Vector 2: backward NTP jump of 10 minutes mid-session
  // ───────────────────────────────────────────────────────────────────────
  it('v2: backward 10min NTP jump does not prevent future refresh', async () => {
    const vector = 'backward-10m-ntp-jump';
    try {
      s = startScenario('fuzz-clock-skew-v2', {
        accessTokenLifetimeMs: 15 * ONE_MINUTE,
      });
      const tab = loginTab(s, 'tab-1');
      await tab.makeApiCall();
      const baseline = refreshRequestCount(s);

      // Advance 5 minutes of activity.
      await advanceMinutes(s, 5);

      // NTP correction pulls the clock BACK by 10 minutes.
      // Note: token `exp` is stored as an absolute timestamp, so after the
      // backward jump Date.now() says the token has LONGER left to live.
      // A well-behaved scheduler should reschedule its proactive timer to
      // account for the new distance-to-exp rather than firing immediately.
      vi.setSystemTime(Date.now() - 10 * ONE_MINUTE);

      // Let any immediate reactions happen.
      await advanceMs(s, 250);
      const rightAfterJump = refreshRequestCount(s) - baseline;

      // Enough real queue-time for BOTH the real wall clock AND Date.now()
      // to cross the proactive-margin threshold (25m > 15m lifetime + 10m
      // backward jump).
      await advanceMinutes(s, 25);
      await advanceMs(s, 500);

      const afterSettle = refreshRequestCount(s);
      const refreshed = afterSettle - baseline;

      const r = await tab.makeApiCall();
      const afterApiCall = refreshRequestCount(s);
      const onDemandRefreshes = afterApiCall - afterSettle;

      if (!r.success) {
        record({
          vector,
          status: 'fail',
          severity: 'high',
          observation: 'API call failed after backward NTP jump; scheduler likely stuck',
          evidence: { baseline, afterSettle, refreshed, rightAfterJump, onDemandRefreshes },
          recommendedCrystallizedFlow: 'qa/flows/edge/ntp-backward-jump-stuck-scheduler.md',
        });
      } else if (refreshed === 0 && onDemandRefreshes === 0) {
        record({
          vector,
          status: 'fail',
          severity: 'high',
          observation:
            'Zero refresh requests reached server after backward jump, yet getValidAccessToken() resolved — stale token served past Date.now() expiry',
          evidence: { baseline, afterSettle, rightAfterJump, afterApiCall, onDemandRefreshes },
          recommendedCrystallizedFlow: 'qa/flows/edge/ntp-backward-jump-no-refresh.md',
        });
      } else if (refreshed === 0 && onDemandRefreshes > 0) {
        record({
          vector,
          status: 'fail',
          severity: 'medium',
          observation:
            'Proactive refresh timer never fired after backward jump; only the on-demand path refreshed the token',
          evidence: { baseline, afterSettle, rightAfterJump, afterApiCall, onDemandRefreshes },
          recommendedCrystallizedFlow: 'qa/flows/edge/ntp-backward-jump-proactive-missed.md',
        });
      } else if (rightAfterJump > 0) {
        record({
          vector,
          status: 'fail',
          severity: 'medium',
          observation: `Backward jump triggered ${rightAfterJump} immediate refresh(es) — should reschedule, not stampede`,
          evidence: { baseline, afterSettle, rightAfterJump, onDemandRefreshes },
        });
      } else {
        record({
          vector,
          status: 'pass',
          severity: 'info',
          observation: `Backward NTP jump rescheduled cleanly; ${refreshed} proactive refresh(es) fired.`,
          evidence: { baseline, afterSettle, rightAfterJump, onDemandRefreshes },
        });
      }
      expectNoFalseLogout(s, { expectSessionLoss: false });
    } catch (err) {
      record({
        vector,
        status: 'error',
        severity: 'critical',
        observation: `Uncaught exception: ${(err as Error).message}`,
      });
      throw err;
    }
  });

  // ───────────────────────────────────────────────────────────────────────
  // Vector 3: Repeated small backward jumps (wobbly clock)
  // ───────────────────────────────────────────────────────────────────────
  it('v3: repeated 1s backward jumps do not prevent session', async () => {
    const vector = 'repeated-small-backwards-jumps';
    try {
      s = startScenario('fuzz-clock-skew-v3', {
        accessTokenLifetimeMs: 15 * ONE_MINUTE,
      });
      const tab = loginTab(s, 'tab-1');
      await tab.makeApiCall();
      const baseline = refreshRequestCount(s);

      // 30 cycles of: advance 2s, then jump back 1s. Net +30s of real time,
      // but lots of backward movement for any scheduler that caches Date.now().
      for (let i = 0; i < 30; i++) {
        await advanceMs(s, 2000);
        vi.setSystemTime(Date.now() - 1000);
      }

      // Now advance far enough that proactive should have fired.
      await advanceMinutes(s, 15);
      await advanceMs(s, 200);

      const afterSettle = refreshRequestCount(s);
      const r = await tab.makeApiCall();

      if (!r.success) {
        record({
          vector,
          status: 'fail',
          severity: 'high',
          observation: 'Repeated backwards jumps left session unusable',
          evidence: { baseline, afterSettle },
        });
      } else {
        record({
          vector,
          status: 'pass',
          severity: 'info',
          observation: `Survived 30 backwards-jump wobble cycles; refreshes=${afterSettle - baseline}.`,
          evidence: { baseline, afterSettle },
        });
      }
      expectNoFalseLogout(s, { expectSessionLoss: false });
    } catch (err) {
      record({
        vector,
        status: 'error',
        severity: 'critical',
        observation: `Uncaught exception: ${(err as Error).message}`,
      });
      throw err;
    }
  });

  // ───────────────────────────────────────────────────────────────────────
  // Vector 4: Huge forward jump (1 year in one tick)
  // ───────────────────────────────────────────────────────────────────────
  it('v4: 1-year forward jump results in clean session-expired (not a crash)', async () => {
    const vector = 'forward-1-year-jump';
    try {
      s = startScenario('fuzz-clock-skew-v4', {
        accessTokenLifetimeMs: 15 * ONE_MINUTE,
        refreshTokenLifetimeMs: 7 * 24 * ONE_HOUR,
      });
      const tab = loginTab(s, 'tab-1');
      await tab.makeApiCall();
      const baseline = refreshRequestCount(s);

      // Jump system clock forward by 1 year (both AT and RT long expired).
      vi.setSystemTime(Date.now() + ONE_YEAR);
      await advanceMs(s, 500);

      // Attempt to use the session — should fail gracefully, not crash.
      const r = await tab.makeApiCall();

      // Allow any background refresh timers to fire.
      await advanceSeconds(s, 30);

      const afterSettle = refreshRequestCount(s);
      const refreshAttempts = afterSettle - baseline;

      if (r.success) {
        record({
          vector,
          status: 'fail',
          severity: 'high',
          observation: 'API call "succeeded" after 1-year forward jump — tokens should be invalid',
          evidence: { refreshAttempts },
        });
      } else {
        record({
          vector,
          status: 'pass',
          severity: 'info',
          observation: `1-year jump: API failed gracefully (refresh attempts=${refreshAttempts}). sessionExpired=${tab.isSessionExpired()}.`,
          evidence: { refreshAttempts, sessionExpired: tab.isSessionExpired() },
        });
      }
      // Expected session loss — this is a real logout.
      expectNoFalseLogout(s, { expectSessionLoss: true, reason: '1-year clock jump' });
    } catch (err) {
      record({
        vector,
        status: 'error',
        severity: 'critical',
        observation: `Uncaught exception on 1-year jump: ${(err as Error).message}`,
        evidence: { stack: (err as Error).stack?.split('\n').slice(0, 5).join('\n') },
        recommendedCrystallizedFlow: 'qa/flows/edge/huge-forward-clock-jump-crash.md',
      });
      throw err;
    }
  });

  // ───────────────────────────────────────────────────────────────────────
  // Vector 5: proactiveRefreshMargin > access token lifetime
  // The DSL doesn't let us override config per-tab, but we can still
  // observe behavior at the default margin; for full parity with the
  // vector we construct a BrowserTab manually with a giant margin via the
  // underlying actor. Fallback: assert documented default and record.
  // ───────────────────────────────────────────────────────────────────────
  it('v5: proactiveRefreshMargin > access token lifetime behavior', async () => {
    const vector = 'proactive-margin-bigger-than-access-lifetime';
    try {
      // Use a very short access-token lifetime so the default 60s margin
      // is already greater than the lifetime. This is the closest we can
      // get without touching the BrowserTab internals.
      s = startScenario('fuzz-clock-skew-v5', {
        accessTokenLifetimeMs: 30 * 1000, // 30s — shorter than 60s margin
      });
      const tab = loginTab(s, 'tab-1');

      // setTokens was called with expiresIn=900 by the base tab, so we need
      // to overwrite with a short-lifetime token that matches the server.
      const accessToken = s.ctx.server.issueAccessToken();
      const refreshToken = s.ctx.server.issueRefreshToken();
      tab.sessionManager.setTokens({
        accessToken,
        refreshToken,
        expiresIn: 30, // 30 seconds — shorter than default 60s proactive margin
      });

      const baseline = refreshRequestCount(s);

      // Make an API call immediately. With margin > lifetime, the library
      // should either (a) refresh immediately or (b) treat the token as
      // usable until real expiry. Either is defensible, but it must NOT
      // enter an infinite loop.
      const r1 = await tab.makeApiCall();

      // Advance 10s to see if a refresh loop develops.
      await advanceSeconds(s, 10);
      const mid = refreshRequestCount(s);
      const initialBurst = mid - baseline;

      // Advance further and watch for exponential refresh counts.
      await advanceSeconds(s, 60);
      const afterSettle = refreshRequestCount(s);
      const totalRefreshes = afterSettle - baseline;

      const r2 = await tab.makeApiCall();

      if (totalRefreshes > 10) {
        record({
          vector,
          status: 'fail',
          severity: 'high',
          observation: `Refresh loop detected: ${totalRefreshes} refreshes in ~70s when margin > lifetime`,
          evidence: { baseline, mid, afterSettle, initialBurst },
          recommendedCrystallizedFlow: 'qa/flows/edge/proactive-margin-refresh-loop.md',
        });
      } else if (!r1.success || !r2.success) {
        record({
          vector,
          status: 'fail',
          severity: 'medium',
          observation: 'API calls failed when proactive margin exceeded access lifetime',
          evidence: { r1: r1.success, r2: r2.success, totalRefreshes },
        });
      } else {
        record({
          vector,
          status: 'pass',
          severity: 'info',
          observation: `Margin>lifetime handled: ${totalRefreshes} refreshes across ~70s, API calls OK.`,
          evidence: { baseline, mid, afterSettle, initialBurst },
        });
      }
    } catch (err) {
      record({
        vector,
        status: 'error',
        severity: 'critical',
        observation: `Uncaught exception: ${(err as Error).message}`,
        evidence: { stack: (err as Error).stack?.split('\n').slice(0, 5).join('\n') },
      });
      throw err;
    }
  });

  // ───────────────────────────────────────────────────────────────────────
  // Vector 6: Persistent client drift (client 5 minutes AHEAD of server)
  // ───────────────────────────────────────────────────────────────────────
  it('v6: client 5 minutes ahead of server does not cause false logout', async () => {
    const vector = 'persistent-drift-client-5m-ahead';
    try {
      s = startScenario('fuzz-clock-skew-v6', {
        accessTokenLifetimeMs: 15 * ONE_MINUTE,
      });

      // Warp the client clock 5 minutes ahead before the tab is created.
      vi.setSystemTime(Date.now() + 5 * ONE_MINUTE);

      const tab = loginTab(s, 'tab-1');
      const baseline = refreshRequestCount(s);

      const r1 = await tab.makeApiCall();
      // Use for a full cycle.
      await advanceMinutes(s, 14);
      await advanceMs(s, 500);
      const midRefreshes = refreshRequestCount(s) - baseline;

      const r2 = await tab.makeApiCall();

      if (!r1.success || !r2.success) {
        record({
          vector,
          status: 'fail',
          severity: 'high',
          observation: 'API calls failed when client is 5m ahead of server',
          evidence: { midRefreshes },
        });
      } else {
        record({
          vector,
          status: 'pass',
          severity: 'info',
          observation: `Client-ahead drift handled. Refreshes during cycle=${midRefreshes}.`,
          evidence: { midRefreshes },
        });
      }
      expectNoFalseLogout(s, { expectSessionLoss: false });
    } catch (err) {
      record({
        vector,
        status: 'error',
        severity: 'critical',
        observation: `Uncaught exception: ${(err as Error).message}`,
      });
      throw err;
    }
  });

  // ───────────────────────────────────────────────────────────────────────
  // Vector 7: Persistent client drift (client 5 minutes BEHIND server)
  // ───────────────────────────────────────────────────────────────────────
  it('v7: client 5 minutes behind server does not cause false logout', async () => {
    const vector = 'persistent-drift-client-5m-behind';
    try {
      s = startScenario('fuzz-clock-skew-v7', {
        accessTokenLifetimeMs: 15 * ONE_MINUTE,
      });

      vi.setSystemTime(Date.now() - 5 * ONE_MINUTE);

      const tab = loginTab(s, 'tab-1');
      const baseline = refreshRequestCount(s);

      const r1 = await tab.makeApiCall();
      await advanceMinutes(s, 14);
      await advanceMs(s, 500);
      const midRefreshes = refreshRequestCount(s) - baseline;

      const r2 = await tab.makeApiCall();

      if (!r1.success || !r2.success) {
        record({
          vector,
          status: 'fail',
          severity: 'high',
          observation: 'API calls failed when client is 5m behind server',
          evidence: { midRefreshes },
        });
      } else {
        record({
          vector,
          status: 'pass',
          severity: 'info',
          observation: `Client-behind drift handled. Refreshes during cycle=${midRefreshes}.`,
          evidence: { midRefreshes },
        });
      }
      expectNoFalseLogout(s, { expectSessionLoss: false });
    } catch (err) {
      record({
        vector,
        status: 'error',
        severity: 'critical',
        observation: `Uncaught exception: ${(err as Error).message}`,
      });
      throw err;
    }
  });
});
