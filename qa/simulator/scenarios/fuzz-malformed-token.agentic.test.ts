/**
 * Fuzz flow: malformed-token-fuzz (agentic)
 *
 * Feeds malformed tokens to sessionManager.setTokens() and records how the
 * library reacts: crash / silent accept / typed error. Does NOT read src/.
 *
 * Spec: qa/flows/fuzz/malformed-token-fuzz.md
 */
import { describe, it, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  startScenario,
  loginTab,
  teardown,
  type Scenario,
} from '../../harness/index.js';

// ─── JWT helpers (black-box — we only produce strings, never introspect dist) ───

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function b64urlRaw(s: string): string {
  return Buffer.from(s, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function mkJwt(
  payload: Record<string, unknown>,
  opts: {
    header?: Record<string, unknown> | string;
    rawHeader?: string;
    rawPayload?: string;
    signature?: string | null;
  } = {}
): string {
  const header =
    opts.rawHeader !== undefined
      ? opts.rawHeader
      : typeof opts.header === 'string'
      ? opts.header
      : b64url(opts.header ?? { alg: 'HS256', typ: 'JWT' });
  const body =
    opts.rawPayload !== undefined ? opts.rawPayload : b64url(payload);
  const sig = opts.signature === null ? '' : opts.signature ?? b64urlRaw('sig');
  if (opts.signature === null) {
    return `${header}.${body}`;
  }
  return `${header}.${body}.${sig}`;
}

interface Finding {
  vector: string;
  description: string;
  input: {
    accessToken?: unknown;
    refreshToken?: unknown;
    expiresIn?: unknown;
  };
  observation: {
    threwOnSetTokens: boolean;
    threwOnGetValidToken: boolean;
    errorClassSet?: string;
    errorMessageSet?: string;
    errorClassGet?: string;
    errorMessageGet?: string;
    hasValidSessionAfter: boolean;
    storedAccessToken: string | null;
    storedRefreshToken: string | null;
    storagePersisted: boolean;
    consoleErrors: string[];
  };
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  type: 'bug' | 'security' | 'ux' | 'ok';
  notes: string;
}

interface FuzzReport {
  flowId: string;
  scenarioSeed: string;
  startedAt: string;
  finishedAt: string;
  totalVectors: number;
  findings: Finding[];
  summary: {
    crashes: number;
    silentAccepts: number;
    typedRejects: number;
    badPersists: number;
  };
}

describe('Fuzz: malformed-token-fuzz (agentic)', () => {
  let s: Scenario;

  afterEach(() => {
    if (s) teardown(s);
    vi.restoreAllMocks();
  });

  it('probes setTokens + getValidAccessToken with malformed inputs and emits a JSON report', async () => {
    s = startScenario('fuzz-malformed-token');
    const findings: Finding[] = [];
    const scenarioSeed = 'fuzz-malformed-token';
    const startedAt = new Date().toISOString();

    // Capture console.error output to detect leaks / diagnostics.
    const consoleErrors: string[] = [];
    const origErr = console.error;
    console.error = (...args: unknown[]) => {
      consoleErrors.push(args.map((a) => String(a)).join(' '));
    };

    const now = Date.now();
    const fiveMin = 5 * 60;

    const vectors: Array<{
      id: string;
      desc: string;
      build: () => { accessToken: any; refreshToken: any; expiresIn: any };
    }> = [
      {
        id: 'exp-in-past',
        desc: 'Access token with exp 1 hour in the past',
        build: () => ({
          accessToken: mkJwt({ sub: 'u1', exp: Math.floor(now / 1000) - 3600 }),
          refreshToken: 'rt_valid_1',
          expiresIn: fiveMin,
        }),
      },
      {
        id: 'exp-year-9999',
        desc: 'Access token with exp far in the future (year 9999)',
        build: () => ({
          accessToken: mkJwt({ sub: 'u1', exp: 253402300799 }),
          refreshToken: 'rt_valid_2',
          expiresIn: fiveMin,
        }),
      },
      {
        id: 'exp-as-string',
        desc: 'Access token with exp as a string instead of number',
        build: () => ({
          accessToken: mkJwt({ sub: 'u1', exp: String(Math.floor(now / 1000) + 900) }),
          refreshToken: 'rt_valid_3',
          expiresIn: fiveMin,
        }),
      },
      {
        id: 'exp-missing',
        desc: 'Access token missing the exp claim entirely',
        build: () => ({
          accessToken: mkJwt({ sub: 'u1' }),
          refreshToken: 'rt_valid_4',
          expiresIn: fiveMin,
        }),
      },
      {
        id: 'malformed-base64-body',
        desc: 'Access token body contains non-base64 characters',
        build: () => ({
          accessToken: 'aGVhZGVy.!!!not-base64!!!.c2ln',
          refreshToken: 'rt_valid_5',
          expiresIn: fiveMin,
        }),
      },
      {
        id: 'two-segments',
        desc: 'Access token with only 2 segments',
        build: () => ({
          accessToken: `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: 'u1', exp: Math.floor(now / 1000) + 900 })}`,
          refreshToken: 'rt_valid_6',
          expiresIn: fiveMin,
        }),
      },
      {
        id: 'four-segments',
        desc: 'Access token with 4 segments instead of 3',
        build: () => {
          const h = b64url({ alg: 'HS256', typ: 'JWT' });
          const p = b64url({ sub: 'u1', exp: Math.floor(now / 1000) + 900 });
          return {
            accessToken: `${h}.${p}.sig.extra`,
            refreshToken: 'rt_valid_7',
            expiresIn: fiveMin,
          };
        },
      },
      {
        id: 'truncated',
        desc: 'Access token truncated mid-payload',
        build: () => {
          const full = mkJwt({ sub: 'u1', exp: Math.floor(now / 1000) + 900 });
          return {
            accessToken: full.slice(0, Math.max(5, Math.floor(full.length / 2))),
            refreshToken: 'rt_valid_8',
            expiresIn: fiveMin,
          };
        },
      },
      {
        id: 'non-json-header',
        desc: 'Header segment is base64 but not JSON',
        build: () => ({
          accessToken: mkJwt(
            { sub: 'u1', exp: Math.floor(now / 1000) + 900 },
            { rawHeader: b64urlRaw('not-json-just-text') }
          ),
          refreshToken: 'rt_valid_9',
          expiresIn: fiveMin,
        }),
      },
      {
        id: 'alg-none',
        desc: 'Access token with alg: none header',
        build: () => ({
          accessToken: mkJwt(
            { sub: 'u1', exp: Math.floor(now / 1000) + 900 },
            { header: { alg: 'none', typ: 'JWT' }, signature: '' }
          ),
          refreshToken: 'rt_valid_10',
          expiresIn: fiveMin,
        }),
      },
      {
        id: 'no-signature',
        desc: 'Access token with no signature segment (header.payload)',
        build: () => ({
          accessToken: mkJwt(
            { sub: 'u1', exp: Math.floor(now / 1000) + 900 },
            { signature: null }
          ),
          refreshToken: 'rt_valid_11',
          expiresIn: fiveMin,
        }),
      },
      {
        id: 'empty-refresh',
        desc: 'Refresh token is empty string',
        build: () => ({
          accessToken: mkJwt({ sub: 'u1', exp: Math.floor(now / 1000) + 900 }),
          refreshToken: '',
          expiresIn: fiveMin,
        }),
      },
      {
        id: 'null-byte-deviceId',
        desc: 'Access token deviceId claim contains null bytes',
        build: () => ({
          accessToken: mkJwt({
            sub: 'u1',
            exp: Math.floor(now / 1000) + 900,
            deviceId: 'device\u0000\u0000\u0000id',
          }),
          refreshToken: 'rt_valid_12',
          expiresIn: fiveMin,
        }),
      },
      {
        id: 'emoji-deviceId',
        desc: 'Access token deviceId contains emoji',
        build: () => ({
          accessToken: mkJwt({
            sub: 'u1',
            exp: Math.floor(now / 1000) + 900,
            deviceId: '\u{1F4A3}\u{1F525}\u{1F480}device',
          }),
          refreshToken: 'rt_valid_13',
          expiresIn: fiveMin,
        }),
      },
      {
        id: 'giant-deviceId',
        desc: 'Access token deviceId is 10,000 characters',
        build: () => ({
          accessToken: mkJwt({
            sub: 'u1',
            exp: Math.floor(now / 1000) + 900,
            deviceId: 'A'.repeat(10000),
          }),
          refreshToken: 'rt_valid_14',
          expiresIn: fiveMin,
        }),
      },
      {
        id: 'expiresIn-negative',
        desc: 'expiresIn = -1',
        build: () => ({
          accessToken: mkJwt({ sub: 'u1', exp: Math.floor(now / 1000) + 900 }),
          refreshToken: 'rt_valid_15',
          expiresIn: -1,
        }),
      },
      {
        id: 'expiresIn-zero',
        desc: 'expiresIn = 0',
        build: () => ({
          accessToken: mkJwt({ sub: 'u1', exp: Math.floor(now / 1000) + 900 }),
          refreshToken: 'rt_valid_16',
          expiresIn: 0,
        }),
      },
      {
        id: 'expiresIn-infinity',
        desc: 'expiresIn = Number.POSITIVE_INFINITY',
        build: () => ({
          accessToken: mkJwt({ sub: 'u1', exp: Math.floor(now / 1000) + 900 }),
          refreshToken: 'rt_valid_17',
          expiresIn: Number.POSITIVE_INFINITY,
        }),
      },
      {
        id: 'expiresIn-nan',
        desc: 'expiresIn = NaN',
        build: () => ({
          accessToken: mkJwt({ sub: 'u1', exp: Math.floor(now / 1000) + 900 }),
          refreshToken: 'rt_valid_18',
          expiresIn: Number.NaN,
        }),
      },
    ];

    for (const v of vectors) {
      // Fresh tab/storage for each vector so state never bleeds.
      const tab = loginTab(s, `tab-${v.id}`);
      tab.sessionManager.clearSession();

      const localErrors: string[] = [];
      const before = consoleErrors.length;

      const input = v.build();
      const finding: Finding = {
        vector: v.id,
        description: v.desc,
        input: {
          accessToken:
            typeof input.accessToken === 'string'
              ? input.accessToken.length > 120
                ? `${input.accessToken.slice(0, 60)}…(${input.accessToken.length} chars)…${input.accessToken.slice(-20)}`
                : input.accessToken
              : input.accessToken,
          refreshToken: input.refreshToken,
          expiresIn: Number.isFinite(input.expiresIn)
            ? input.expiresIn
            : String(input.expiresIn),
        },
        observation: {
          threwOnSetTokens: false,
          threwOnGetValidToken: false,
          hasValidSessionAfter: false,
          storedAccessToken: null,
          storedRefreshToken: null,
          storagePersisted: false,
          consoleErrors: [],
        },
        severity: 'info',
        type: 'ok',
        notes: '',
      };

      try {
        tab.sessionManager.setTokens(input as any);
      } catch (e: any) {
        finding.observation.threwOnSetTokens = true;
        finding.observation.errorClassSet = e?.constructor?.name ?? 'Error';
        finding.observation.errorMessageSet = String(e?.message ?? e);
      }

      try {
        finding.observation.hasValidSessionAfter =
          tab.sessionManager.hasValidSession();
      } catch (e: any) {
        finding.notes += `hasValidSession threw: ${e?.message}; `;
      }

      try {
        const stored = tab.sessionManager.getTokens();
        finding.observation.storedAccessToken = stored?.accessToken ?? null;
        finding.observation.storedRefreshToken = stored?.refreshToken ?? null;
        finding.observation.storagePersisted = stored != null;
      } catch (e: any) {
        finding.notes += `getTokens threw: ${e?.message}; `;
      }

      // Attempt to retrieve a valid token — may trigger refresh via mock fetch.
      try {
        await tab.sessionManager.getValidAccessToken();
      } catch (e: any) {
        finding.observation.threwOnGetValidToken = true;
        finding.observation.errorClassGet = e?.constructor?.name ?? 'Error';
        finding.observation.errorMessageGet = String(e?.message ?? e);
      }

      finding.observation.consoleErrors = consoleErrors.slice(before);
      localErrors.push(...finding.observation.consoleErrors);

      // Classification
      const hasValid = finding.observation.hasValidSessionAfter;
      const persisted = finding.observation.storagePersisted;
      const threwSet = finding.observation.threwOnSetTokens;
      const threwGet = finding.observation.threwOnGetValidToken;

      // Leak detection: look for stack traces, file paths, etc.
      const combinedErrText = [
        finding.observation.errorMessageSet ?? '',
        finding.observation.errorMessageGet ?? '',
        ...localErrors,
      ].join('\n');
      const leaksStack = /\bat\s+\S+\s*\(/.test(combinedErrText);
      const leaksPath = /(\/src\/|\/dist\/|\.ts:\d+|\.js:\d+)/.test(
        combinedErrText
      );

      // Baseline classification.
      // Library behaviour observed: setTokens trusts `expiresIn` and does
      // NOT parse/validate the JWT structure. hasValidSession() returns true
      // based on the stored `expiresIn` alone. Downstream getValidAccessToken()
      // raises a typed SessionExpiredError once the mock server rejects the
      // refresh attempt (for tokens it never issued).
      const jwtStructurallyMalformed = new Set([
        'malformed-base64-body',
        'two-segments',
        'four-segments',
        'truncated',
        'non-json-header',
      ]);
      const claimQuality = new Set([
        'exp-in-past',
        'exp-year-9999',
        'exp-as-string',
        'exp-missing',
        'alg-none',
        'no-signature',
      ]);
      const deviceIdWeird = new Set([
        'null-byte-deviceId',
        'emoji-deviceId',
        'giant-deviceId',
      ]);

      if (threwSet) {
        finding.severity = 'info';
        finding.type = 'ok';
        finding.notes += 'Rejected at setTokens (typed error). ';
      } else if (v.id === 'empty-refresh') {
        // Empty refresh accepted at setTokens but produces a clear typed
        // "No refresh token available" downstream. Acceptable, though
        // setTokens should arguably reject the empty string up front.
        if (threwGet) {
          finding.severity = 'medium';
          finding.type = 'bug';
          finding.notes +=
            'setTokens accepts refreshToken="" and persists it; error only surfaces on the next getValidAccessToken. ';
        } else {
          finding.severity = 'high';
          finding.type = 'bug';
          finding.notes += 'Empty refresh token silently accepted. ';
        }
      } else if (jwtStructurallyMalformed.has(v.id)) {
        // These are not even valid JWTs. The library does no structural
        // validation. Classification depends on whether the downstream
        // refresh eventually rejects them.
        finding.severity = 'high';
        finding.type = 'bug';
        finding.notes +=
          'JWT structurally malformed but setTokens accepted it and hasValidSession()=' +
          hasValid +
          '. ';
      } else if (claimQuality.has(v.id)) {
        // Library never parses claims, so any exp value is accepted.
        // This is a medium-severity consistency gap.
        finding.severity = 'medium';
        finding.type = 'bug';
        finding.notes +=
          "JWT claims not validated; library trusts caller-provided expiresIn. hasValidSession()=" +
          hasValid +
          '. ';
      } else if (deviceIdWeird.has(v.id)) {
        finding.severity = 'low';
        finding.type = 'ux';
        finding.notes +=
          'Unusual deviceId claim accepted (claims are never parsed). ';
      } else if (v.id === 'expiresIn-negative') {
        if (!hasValid) {
          finding.severity = 'info';
          finding.type = 'ok';
          finding.notes += 'Negative expiresIn treated as already expired. ';
        } else {
          finding.severity = 'high';
          finding.type = 'bug';
          finding.notes += 'Negative expiresIn produced valid session. ';
        }
      } else if (v.id === 'expiresIn-zero') {
        finding.severity = 'high';
        finding.type = 'bug';
        finding.notes +=
          'expiresIn=0 produced hasValidSession()=' +
          hasValid +
          ' and no downstream error. ';
      } else if (v.id === 'expiresIn-infinity') {
        finding.severity = 'medium';
        finding.type = 'bug';
        finding.notes +=
          'Infinity expiresIn accepted, producing an effectively immortal session record. ';
      } else if (v.id === 'expiresIn-nan') {
        finding.severity = 'high';
        finding.type = 'bug';
        finding.notes +=
          'NaN expiresIn produced hasValidSession()=' +
          hasValid +
          '; computed expiry is non-deterministic. ';
      } else {
        finding.severity = 'low';
        finding.type = 'ux';
        finding.notes += 'Accepted and persisted. ';
      }

      if (leaksStack || leaksPath) {
        finding.severity =
          finding.severity === 'info' ? 'medium' : finding.severity;
        finding.type = 'security';
        finding.notes += `Error message leaks ${
          leaksStack ? 'stack trace' : 'internal path'
        }. `;
      }

      findings.push(finding);

      // Reset for next vector.
      try {
        tab.sessionManager.clearSession();
      } catch {
        /* ignore */
      }
      tab.destroy();
      // Remove the destroyed tab from the scenario's tab list so teardown
      // doesn't try to destroy it a second time.
      s.tabs = s.tabs.filter((t) => t !== tab);
    }

    // Restore console.error.
    console.error = origErr;

    const summary = {
      crashes: findings.filter(
        (f) =>
          f.notes.toLowerCase().includes('crash') ||
          f.observation.threwOnSetTokens === false &&
            f.observation.threwOnGetValidToken === false &&
            f.severity === 'critical'
      ).length,
      silentAccepts: findings.filter(
        (f) => f.type === 'bug' && f.severity === 'high'
      ).length,
      typedRejects: findings.filter((f) => f.type === 'ok').length,
      badPersists: findings.filter(
        (f) =>
          f.observation.hasValidSessionAfter &&
          (f.type === 'bug' || f.type === 'security')
      ).length,
    };

    const report: FuzzReport = {
      flowId: 'malformed-token-fuzz',
      scenarioSeed,
      startedAt,
      finishedAt: new Date().toISOString(),
      totalVectors: vectors.length,
      findings,
      summary,
    };

    const outDir = path.resolve(__dirname, '../../reports/.tmp');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'malformed-token-fuzz.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

    // Test only fails if the library actually crashed in a way we could not
    // contain — we want the report to always be produced.
    // Still, assert a sane baseline: every vector produced a finding.
    if (findings.length !== vectors.length) {
      throw new Error(
        `Expected ${vectors.length} findings, got ${findings.length}`
      );
    }
  });
});
