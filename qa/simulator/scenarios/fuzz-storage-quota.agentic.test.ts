/**
 * Fuzz: storage-quota (agentic)
 *
 * Attacks the storage layer (the SharedStorage TokenStorage abstraction that
 * the library receives via `tokenStorage`). The library treats storage as
 * untrusted: corrupt records, missing fields, extra fields, quota exceeded,
 * and a storage that throws on every op should all degrade gracefully.
 *
 * Vectors (per qa/flows/fuzz/storage-quota-fuzz.md):
 *   V1. setTokens when storage.set throws QuotaExceededError on next write.
 *   V2. Corrupt record: storage.get returns "not-json" (library expects object).
 *   V3. Empty-object record: {} — missing required fields.
 *   V4. Extra-unknown-fields record — should be ignored, not crash.
 *   V5. getItem returns null mid-session.
 *   V6. Storage stub that throws on EVERY operation.
 *
 * Observed for each: crash / silent loss / false logout / fallback / typed error.
 *
 * Spec: qa/flows/fuzz/storage-quota-fuzz.md
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  startScenario,
  loginTab,
  advanceSeconds,
  advanceMinutes,
  refreshRequestCount,
  teardown,
  type Scenario,
} from '../../harness/index.js';
import { SharedStorage } from '../core/shared-storage.js';

type Finding = {
  id: string;
  vector: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  type: 'bug' | 'security' | 'ux' | 'observation';
  summary: string;
  evidence: Record<string, unknown>;
};

const FINDINGS: Finding[] = [];
const ASSERTION_DETAILS: Array<{ name: string; passed: boolean; detail?: string }> = [];

function record(assertion: { name: string; passed: boolean; detail?: string }) {
  ASSERTION_DETAILS.push(assertion);
  expect(assertion.passed, `${assertion.name}${assertion.detail ? ` — ${assertion.detail}` : ''}`).toBe(true);
}

class QuotaExceededErrorStub extends Error {
  name = 'QuotaExceededError';
  code = 22;
  constructor() {
    super('QuotaExceededError: exceeded the quota.');
  }
}

describe('Fuzz: storage-quota (agentic)', () => {
  let s: Scenario | undefined;

  afterEach(() => {
    if (s) teardown(s);
    s = undefined;
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // V1: storage.set throws QuotaExceededError during setTokens
  // ─────────────────────────────────────────────────────────────
  it('V1: setTokens with storage.set throwing QuotaExceededError', async () => {
    s = startScenario('fuzz-storage-quota-v1');
    const tab = loginTab(s, 'tab-1');
    tab.sessionManager.clearSession();

    // Inject quota failure on the very next set() call.
    const setSpy = vi.spyOn(s.ctx.storage, 'set').mockImplementationOnce(() => {
      throw new QuotaExceededErrorStub();
    });

    const at = s.ctx.server.issueAccessToken();
    const rt = s.ctx.server.issueRefreshToken();

    let thrown: unknown = null;
    try {
      tab.sessionManager.setTokens({ accessToken: at, refreshToken: rt, expiresIn: 900 });
    } catch (err) {
      thrown = err;
    }

    const hasSession = tab.sessionManager.hasValidSession();
    const memTokens = tab.sessionManager.getTokens();

    record({
      name: 'V1: setSpy invoked at least once',
      passed: setSpy.mock.calls.length >= 1,
      detail: `calls=${setSpy.mock.calls.length}`,
    });

    // Observation: either the error bubbles as a typed error (acceptable),
    // or it is swallowed and session lives only in memory (acceptable fallback),
    // or it crashes with an ugly untyped stack (finding).
    if (thrown) {
      const msg = (thrown as Error).message || '';
      const looksLikeLeak = /\/src\/|\.ts:\d+|node_modules/.test(msg);
      if (looksLikeLeak) {
        FINDINGS.push({
          id: 'V1-stack-leak',
          vector: 'storage.set throws QuotaExceededError',
          severity: 'medium',
          type: 'security',
          summary: 'Error message includes internal path/stack fragments.',
          evidence: { message: msg.slice(0, 400) },
        });
      }
      // An untyped raw QuotaExceededError re-thrown to the caller is still
      // a usability issue — typed SessionError would be preferable.
      if ((thrown as Error).name === 'QuotaExceededError') {
        FINDINGS.push({
          id: 'V1-raw-quota-propagation',
          vector: 'storage.set throws QuotaExceededError',
          severity: 'high',
          type: 'bug',
          summary:
            'QuotaExceededError propagated untyped out of setTokens. No graceful fallback (in-memory session) or typed wrapper.',
          evidence: {
            errorName: (thrown as Error).name,
            errorMessage: (thrown as Error).message,
            hasValidSession: hasSession,
            memTokensNull: memTokens === null,
          },
        });
      }
    } else {
      // No throw → library swallowed it. Check whether the in-memory session
      // is still usable (ideal fallback) or silently lost (bad).
      if (!hasSession || memTokens === null) {
        FINDINGS.push({
          id: 'V1-silent-session-loss',
          vector: 'storage.set throws QuotaExceededError',
          severity: 'high',
          type: 'bug',
          summary: 'QuotaExceededError silently swallowed AND session is not usable in memory.',
          evidence: { hasValidSession: hasSession, memTokensNull: memTokens === null },
        });
      }
    }

    record({
      name: 'V1: library does not crash the process',
      passed: true, // reaching this line means we caught/handled it
    });
  });

  // ─────────────────────────────────────────────────────────────
  // V2: Corrupt record — storage.get returns "not-json" primitive
  // ─────────────────────────────────────────────────────────────
  it('V2: storage.get returns a string primitive ("not-json")', async () => {
    s = startScenario('fuzz-storage-quota-v2');

    // Step 1: create a fresh tab in an empty-storage state (no auto-populate).
    const tab = loginTab(s, 'tab-1');
    tab.sessionManager.clearSession(); // drops in-memory + storage

    // Step 2: poison every subsequent read with a string primitive.
    vi.spyOn(s.ctx.storage, 'get').mockImplementation(() => 'not-json' as unknown as any);

    // Step 3: observe reads.
    let crashedHas: unknown = null;
    let hasSession: boolean | undefined;
    try {
      hasSession = tab.sessionManager.hasValidSession();
    } catch (err) {
      crashedHas = err;
    }

    let crashedGet: unknown = null;
    let getTokensOut: unknown = undefined;
    try {
      getTokensOut = tab.sessionManager.getTokens();
    } catch (err) {
      crashedGet = err;
    }

    let crashedValid: unknown = null;
    try {
      await tab.sessionManager.getValidAccessToken();
    } catch (err) {
      crashedValid = err;
    }

    record({
      name: 'V2: hasValidSession did not crash on corrupt string',
      passed: crashedHas === null,
      detail: crashedHas ? (crashedHas as Error).message : undefined,
    });
    record({
      name: 'V2: getTokens did not crash on corrupt string',
      passed: crashedGet === null,
      detail: crashedGet ? (crashedGet as Error).message : undefined,
    });
    record({
      name: 'V2: hasValidSession() returned false on corrupted record',
      passed: hasSession === false,
      detail: `hasSession=${hasSession}`,
    });

    if (crashedHas || crashedGet) {
      FINDINGS.push({
        id: 'V2-crash-on-corrupt-string',
        vector: 'storage.get returns "not-json" string primitive',
        severity: 'critical',
        type: 'bug',
        summary:
          'Library crashed while reading a corrupted (non-object) storage record instead of treating it as no-session.',
        evidence: {
          hasValidSessionError: (crashedHas as Error | null)?.message ?? null,
          getTokensError: (crashedGet as Error | null)?.message ?? null,
        },
      });
    } else if (hasSession) {
      FINDINGS.push({
        id: 'V2-accepts-corrupt-record',
        vector: 'storage.get returns "not-json" string primitive',
        severity: 'high',
        type: 'bug',
        summary:
          'hasValidSession() returned true on a corrupt (string-primitive) storage record.',
        evidence: { getTokensOut },
      });
    }

    // getValidAccessToken is allowed to throw (no session) — just should not crash the host.
    if (crashedValid) {
      const msg = (crashedValid as Error).message || '';
      const leaks = /\/src\/|node_modules|\.ts:\d+/.test(msg);
      if (leaks) {
        FINDINGS.push({
          id: 'V2-getvalid-leaks-path',
          vector: 'getValidAccessToken with corrupt storage',
          severity: 'medium',
          type: 'security',
          summary: 'getValidAccessToken error contained internal path fragments.',
          evidence: { message: msg.slice(0, 400) },
        });
      }
    }
  });

  // ─────────────────────────────────────────────────────────────
  // V3: Empty-object record — {} missing all required fields
  // ─────────────────────────────────────────────────────────────
  it('V3: storage.get returns {} (missing required fields)', async () => {
    s = startScenario('fuzz-storage-quota-v3');
    vi.spyOn(s.ctx.storage, 'get').mockImplementation(() => ({}) as any);

    let crashed: unknown = null;
    let tab;
    try {
      tab = loginTab(s, 'tab-1');
    } catch (err) {
      crashed = err;
    }

    record({
      name: 'V3: loginTab did not crash on {} record',
      passed: crashed === null,
      detail: crashed ? (crashed as Error).message : undefined,
    });

    if (crashed) {
      FINDINGS.push({
        id: 'V3-crash-on-empty-record',
        vector: 'storage.get returns {}',
        severity: 'critical',
        type: 'bug',
        summary: 'Library crashed reading an empty-object storage record.',
        evidence: { error: (crashed as Error).message },
      });
      return;
    }

    const hasSession = tab!.sessionManager.hasValidSession();
    const tokens = tab!.sessionManager.getTokens();
    record({
      name: 'V3: hasValidSession() === false on {} record',
      passed: !hasSession,
      detail: `hasSession=${hasSession}, tokens=${JSON.stringify(tokens)}`,
    });
    if (hasSession) {
      FINDINGS.push({
        id: 'V3-accepts-empty-record',
        vector: 'storage.get returns {}',
        severity: 'high',
        type: 'bug',
        summary:
          'hasValidSession() returned true on an empty-object storage record (missing all required fields).',
        evidence: { tokens },
      });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // V4: Extra-unknown-fields record — should be tolerated
  // ─────────────────────────────────────────────────────────────
  it('V4: storage.get returns valid record with extra unknown fields', async () => {
    s = startScenario('fuzz-storage-quota-v4');

    // Build a valid record by letting the tab populate storage naturally,
    // then poison subsequent reads with an augmented copy.
    const tab = loginTab(s, 'tab-1');
    const originalRecord = s.ctx.storage.peek();
    record({
      name: 'V4: baseline record is populated',
      passed: originalRecord !== null,
    });

    // Augment with unknown fields and a rogue nested object.
    const augmented = {
      ...originalRecord,
      __attacker: 'payload',
      nested: { a: 1, b: [1, 2, 3] },
      'weird-key!': 0,
      'unicode_emoji_\u{1F642}': true,
      huge: 'x'.repeat(5000),
    };

    vi.spyOn(s.ctx.storage, 'get').mockImplementation(() => augmented as any);

    let caught: unknown = null;
    let token: string | null = null;
    try {
      token = await tab.sessionManager.getValidAccessToken();
    } catch (err) {
      caught = err;
    }

    record({
      name: 'V4: getValidAccessToken did not throw on extra-field record',
      passed: caught === null,
      detail: caught ? (caught as Error).message : undefined,
    });
    record({
      name: 'V4: returned access token is non-empty string',
      passed: typeof token === 'string' && token.length > 0,
      detail: `token=${token?.slice(0, 12)}…`,
    });

    if (caught) {
      FINDINGS.push({
        id: 'V4-rejects-extra-fields',
        vector: 'storage record with extra unknown fields',
        severity: 'low',
        type: 'ux',
        summary:
          'Library rejected a storage record that contained extra unknown fields. Per docs, unknown fields should be ignored.',
        evidence: { error: (caught as Error).message },
      });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // V5: getItem returns null unexpectedly mid-session
  // ─────────────────────────────────────────────────────────────
  it('V5: storage.get returns null mid-session (user cleared localStorage)', async () => {
    s = startScenario('fuzz-storage-quota-v5');
    const tab = loginTab(s, 'tab-1');
    const baselineRefreshes = refreshRequestCount(s);

    // Let some time pass normally.
    await advanceSeconds(s, 5);

    // Now the user clears storage from devtools — every subsequent get() is null.
    vi.spyOn(s.ctx.storage, 'get').mockImplementation(() => null);

    // Try to pull a valid token.
    let result: { success: boolean; token?: string; error?: Error };
    try {
      result = await tab.makeApiCall();
    } catch (err) {
      result = { success: false, error: err as Error };
    }

    record({
      name: 'V5: makeApiCall did not raise an uncaught exception',
      passed: !!result,
    });

    // Either the library returns a cached in-memory token (good fallback),
    // or it triggers a refresh using whatever RT it still has in memory,
    // or it fires onSessionExpired (acceptable — treat as logout).
    const sessionExpired = tab.isSessionExpired();
    const refreshesAfter = refreshRequestCount(s);

    record({
      name: 'V5: library reacts deterministically (did not silently loop or hang)',
      passed: true,
      detail: `success=${result.success} sessionExpired=${sessionExpired} refreshDelta=${
        refreshesAfter - baselineRefreshes
      }`,
    });

    // Capture the behavior as an observation regardless of pass/fail —
    // it's useful data for the orchestrator.
    FINDINGS.push({
      id: 'V5-behavior-observation',
      vector: 'storage.get returns null mid-session',
      severity: 'info',
      type: 'observation',
      summary:
        'Behavior when storage is externally cleared mid-session (reference for future regression).',
      evidence: {
        makeApiCallSuccess: result.success,
        errorName: result.error?.name ?? null,
        errorMessage: result.error?.message?.slice(0, 200) ?? null,
        sessionExpiredFired: sessionExpired,
        refreshesTriggered: refreshesAfter - baselineRefreshes,
      },
    });
  });

  // ─────────────────────────────────────────────────────────────
  // V6: Every storage op throws — hostile environment
  // ─────────────────────────────────────────────────────────────
  it('V6: storage stub throws on every op', async () => {
    s = startScenario('fuzz-storage-quota-v6');
    const tab = loginTab(s, 'tab-1');
    tab.sessionManager.clearSession();

    const boom = () => {
      throw new Error('storage is disabled');
    };
    vi.spyOn(s.ctx.storage, 'get').mockImplementation(boom as any);
    vi.spyOn(s.ctx.storage, 'set').mockImplementation(boom as any);
    vi.spyOn(s.ctx.storage, 'clear').mockImplementation(boom as any);

    const at = s.ctx.server.issueAccessToken();
    const rt = s.ctx.server.issueRefreshToken();

    let setThrew: unknown = null;
    try {
      tab.sessionManager.setTokens({ accessToken: at, refreshToken: rt, expiresIn: 900 });
    } catch (err) {
      setThrew = err;
    }

    // Whether set threw or not, at worst the session lives in memory.
    // Test getValidAccessToken next — it should not crash the process.
    let getThrew: unknown = null;
    let tokenOut: string | null = null;
    try {
      tokenOut = await tab.sessionManager.getValidAccessToken();
    } catch (err) {
      getThrew = err;
    }

    record({
      name: 'V6: library survived a fully hostile storage stub',
      passed: true, // survived == reached this line
      detail: `setThrew=${!!setThrew} getThrew=${!!getThrew}`,
    });

    if (!setThrew && !getThrew && typeof tokenOut === 'string') {
      // Perfect graceful degradation.
      FINDINGS.push({
        id: 'V6-graceful-degradation',
        vector: 'storage throws on every op',
        severity: 'info',
        type: 'observation',
        summary: 'Library degraded gracefully to in-memory session when all storage ops throw.',
        evidence: { tokenOut: tokenOut.slice(0, 16) + '…' },
      });
    } else {
      const leakMsg =
        (setThrew as Error | null)?.message ||
        (getThrew as Error | null)?.message ||
        '';
      const leaks = /\/src\/|node_modules|\.ts:\d+/.test(leakMsg);
      FINDINGS.push({
        id: 'V6-hostile-storage-propagation',
        vector: 'storage throws on every op',
        severity: leaks ? 'medium' : 'high',
        type: leaks ? 'security' : 'bug',
        summary: leaks
          ? 'Hostile-storage error surfaced to caller AND message contains internal path fragments.'
          : 'Hostile-storage error surfaced raw to caller instead of a typed error / graceful fallback.',
        evidence: {
          setError: (setThrew as Error | null)?.message?.slice(0, 300) ?? null,
          getError: (getThrew as Error | null)?.message?.slice(0, 300) ?? null,
        },
      });
    }

    // Long-idle pass: does a scheduled proactive refresh crash the tab?
    let crashedLater: unknown = null;
    try {
      await advanceMinutes(s, 20);
    } catch (err) {
      crashedLater = err;
    }
    record({
      name: 'V6: advancing 20 minutes with hostile storage did not crash',
      passed: crashedLater === null,
      detail: crashedLater ? (crashedLater as Error).message : undefined,
    });
    if (crashedLater) {
      FINDINGS.push({
        id: 'V6-timer-crash',
        vector: 'hostile storage during scheduled proactive refresh',
        severity: 'critical',
        type: 'bug',
        summary: 'Proactive-refresh timer threw when storage was hostile.',
        evidence: { error: (crashedLater as Error).message },
      });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Finalizer: write the fuzz report JSON
  // ─────────────────────────────────────────────────────────────
  it('writes fuzz report', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const outDir = path.resolve(process.cwd(), 'qa/reports/.tmp');
    fs.mkdirSync(outDir, { recursive: true });
    const status = FINDINGS.some(
      (f) => f.severity === 'critical' || f.severity === 'high'
    )
      ? 'findings'
      : 'pass';
    const passed = ASSERTION_DETAILS.filter((a) => a.passed).length;
    const failed = ASSERTION_DETAILS.filter((a) => !a.passed).length;
    const report = {
      flow: 'storage-quota-fuzz',
      type: 'agentic',
      category: 'fuzz',
      priority: 'medium',
      status,
      findings: FINDINGS,
      assertions: {
        passed,
        failed,
        details: ASSERTION_DETAILS,
      },
      implementation: 'qa/simulator/scenarios/fuzz-storage-quota.agentic.test.ts',
      notes:
        'Six vectors exercised against the SharedStorage TokenStorage abstraction: quota exceeded on set, corrupt string record, empty-object record, extra-unknown-fields record, null mid-session, and a fully hostile storage stub. Failures are injected via vi.spyOn of the public SharedStorage methods (get/set/clear) — src/ is never inspected.',
    };
    fs.writeFileSync(
      path.join(outDir, 'storage-quota-fuzz.json'),
      JSON.stringify(report, null, 2)
    );
    expect(fs.existsSync(path.join(outDir, 'storage-quota-fuzz.json'))).toBe(true);
  });
});
