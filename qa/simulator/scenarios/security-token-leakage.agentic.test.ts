/**
 * Flow: security/token-leakage-scan (agentic)
 *
 * Security scan: assert that the library never leaks access or refresh tokens
 * through any publicly observable side effect:
 *   - console.log / console.warn / console.error
 *   - window.location.href (URL parameters, e.g. ?_auth=...)
 *   - document.cookie (when enableCookieSession: false)
 *   - postMessage payloads (window.parent, window.postMessage, frames)
 *   - thrown Error messages (network failure, HTTP 401/500, malformed body)
 *   - onSessionExpired callback error.message / error payload
 *
 * Motivated by v2.31 removal of the insecure _auth URL token transfer: any
 * future regression that writes a token to a URL, a cookie, a log line, or a
 * cross-frame message is a HIGH/CRITICAL security bug.
 *
 * Black-box: this file only touches the public harness DSL and BrowserTab.
 * It does not read src/ or dist/.
 *
 * Spec: qa/flows/security/token-leakage-scan.md
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  startScenario,
  loginTab,
  advanceMs,
  advanceSeconds,
  advanceMinutes,
  expireAccessToken,
  failNextRefresh,
  serverErrorNext,
  refreshRequestCount,
  teardown,
  BASE_URL,
  type Scenario,
} from '../../harness/index.js';
import { BrowserTab } from '../actors/browser-tab.js';

// ─── Capture harness ──────────────────────────────────────────────────────

interface CaptureBus {
  logs: string[];
  urlWrites: string[];
  cookieWrites: string[];
  postMessages: string[];
  errors: string[];
}

function makeCapture(): CaptureBus {
  return {
    logs: [],
    urlWrites: [],
    cookieWrites: [],
    postMessages: [],
    errors: [],
  };
}

/** Stringify anything without throwing. */
function safeStringify(v: unknown): string {
  if (v === null || v === undefined) return String(v);
  if (typeof v === 'string') return v;
  if (v instanceof Error) {
    // Capture the message, name, stack, and any enumerable props.
    const enumerableProps: Record<string, unknown> = {};
    for (const k of Object.keys(v)) {
      enumerableProps[k] = (v as unknown as Record<string, unknown>)[k];
    }
    return `${v.name}: ${v.message}\n${v.stack ?? ''}\n${JSON.stringify(enumerableProps)}`;
  }
  try {
    return JSON.stringify(v);
  } catch {
    try {
      return String(v);
    } catch {
      return '[unstringifiable]';
    }
  }
}

/** Install spies on console, window.location, document.cookie, postMessage. */
function installSpies(bus: CaptureBus): () => void {
  const joinArgs = (args: unknown[]) => args.map(safeStringify).join(' ');

  // Console spies. Use mockImplementation to silence and capture.
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    bus.logs.push('log: ' + joinArgs(args));
  });
  vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    bus.logs.push('warn: ' + joinArgs(args));
  });
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    bus.logs.push('error: ' + joinArgs(args));
  });
  vi.spyOn(console, 'info').mockImplementation((...args: unknown[]) => {
    bus.logs.push('info: ' + joinArgs(args));
  });
  vi.spyOn(console, 'debug').mockImplementation((...args: unknown[]) => {
    bus.logs.push('debug: ' + joinArgs(args));
  });

  // window.location.href — jsdom/node may not provide window by default,
  // but if it does we intercept href assignments and history.replaceState.
  // Also track the current location.href after the scenario.
  const w = (globalThis as unknown as { window?: Window }).window;
  const cleanups: Array<() => void> = [];

  if (w && typeof w === 'object') {
    // Capture any current href
    try {
      if (w.location && typeof w.location.href === 'string') {
        bus.urlWrites.push('initial: ' + w.location.href);
      }
    } catch {
      /* ignore */
    }

    // Intercept history.pushState / replaceState — the common way SPAs
    // mutate the URL without reload.
    try {
      if (w.history) {
        const origPush = w.history.pushState.bind(w.history);
        const origReplace = w.history.replaceState.bind(w.history);
        w.history.pushState = (...args: Parameters<typeof origPush>) => {
          bus.urlWrites.push('pushState: ' + safeStringify(args));
          return origPush(...args);
        };
        w.history.replaceState = (...args: Parameters<typeof origReplace>) => {
          bus.urlWrites.push('replaceState: ' + safeStringify(args));
          return origReplace(...args);
        };
        cleanups.push(() => {
          w.history.pushState = origPush;
          w.history.replaceState = origReplace;
        });
      }
    } catch {
      /* ignore */
    }

    // Intercept postMessage on window and parent (same window in test env).
    try {
      const origPostMessage = w.postMessage?.bind(w);
      if (origPostMessage) {
        w.postMessage = ((...args: unknown[]) => {
          bus.postMessages.push('postMessage: ' + safeStringify(args));
          return (origPostMessage as (...a: unknown[]) => unknown)(...args);
        }) as typeof w.postMessage;
        cleanups.push(() => {
          w.postMessage = origPostMessage;
        });
      }
    } catch {
      /* ignore */
    }

    // Intercept document.cookie writes.
    try {
      const doc = (w as unknown as { document?: Document }).document;
      if (doc) {
        const proto = Object.getPrototypeOf(doc);
        const desc = Object.getOwnPropertyDescriptor(proto, 'cookie');
        if (desc && desc.configurable) {
          const origGet = desc.get?.bind(doc);
          const origSet = desc.set?.bind(doc);
          Object.defineProperty(doc, 'cookie', {
            configurable: true,
            get() {
              return origGet ? origGet() : '';
            },
            set(value: string) {
              bus.cookieWrites.push('set: ' + safeStringify(value));
              if (origSet) origSet(value);
            },
          });
          cleanups.push(() => {
            Object.defineProperty(doc, 'cookie', desc);
          });
        }
        // Snapshot whatever is already there.
        try {
          bus.cookieWrites.push('initial: ' + (doc.cookie ?? ''));
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }
  } else {
    // Pure Node environment — no window/document. Record that fact so we
    // can tell the difference between "clean" and "not observable".
    bus.urlWrites.push('no-window');
    bus.cookieWrites.push('no-document');
    bus.postMessages.push('no-window');
  }

  return () => {
    for (const fn of cleanups) {
      try {
        fn();
      } catch {
        /* ignore */
      }
    }
  };
}

/** Scan a collection of strings for any of the needle substrings. */
function findLeakage(
  haystack: string[],
  needles: Array<{ label: string; value: string }>,
): Array<{ label: string; needle: string; where: string }> {
  const hits: Array<{ label: string; needle: string; where: string }> = [];
  for (const line of haystack) {
    for (const { label, value } of needles) {
      if (!value || value.length < 6) continue;
      if (line.includes(value)) {
        hits.push({ label, needle: value, where: line.slice(0, 200) });
      }
    }
  }
  return hits;
}

describe('Security: token-leakage-scan (agentic)', () => {
  let s: Scenario;
  let restoreSpies: (() => void) | null = null;

  afterEach(() => {
    if (restoreSpies) {
      restoreSpies();
      restoreSpies = null;
    }
    if (s) teardown(s);
    vi.restoreAllMocks();
  });

  it('full lifecycle (login → refresh → expiry → logout) leaks no token via console, URL, cookie, postMessage, or error messages', async () => {
    const bus = makeCapture();
    restoreSpies = installSpies(bus);

    s = startScenario('security-token-leakage');
    const tab = loginTab(s, 'leak-tab-1');

    // Remember the tokens we started with so we can scan for them later.
    const initialTokens = tab.sessionManager.getTokens();
    expect(initialTokens).not.toBeNull();
    const initialAccess = initialTokens!.accessToken;
    const initialRefresh = initialTokens!.refreshToken;

    // The list of token substrings we scan for. We use the first 20 chars
    // per the spec so partial or encoded leaks are still detected, but we
    // avoid trivial false negatives from the full string being too unique.
    const tokenNeedles: Array<{ label: string; value: string }> = [
      { label: 'initial-access-20', value: initialAccess.slice(0, 20) },
      { label: 'initial-refresh-20', value: initialRefresh.slice(0, 20) },
      { label: 'initial-access-full', value: initialAccess },
      { label: 'initial-refresh-full', value: initialRefresh },
    ];

    // Also add rotating tokens after each refresh.
    const addRotatedNeedles = () => {
      const t = tab.sessionManager.getTokens();
      if (t) {
        if (t.accessToken && t.accessToken !== initialAccess) {
          tokenNeedles.push({ label: 'rotated-access-20', value: t.accessToken.slice(0, 20) });
          tokenNeedles.push({ label: 'rotated-access-full', value: t.accessToken });
        }
        if (t.refreshToken && t.refreshToken !== initialRefresh) {
          tokenNeedles.push({ label: 'rotated-refresh-20', value: t.refreshToken.slice(0, 20) });
          tokenNeedles.push({ label: 'rotated-refresh-full', value: t.refreshToken });
        }
      }
    };

    // ─── Step 1: make a normal API call (no refresh). Nothing should be
    //            logged or broadcast about the token.
    const call1 = await tab.makeApiCall();
    expect(call1.success).toBe(true);

    // ─── Step 2: force a proactive refresh cycle by advancing past the
    //            proactive margin (60s before the 15m expiry).
    await advanceMinutes(s, 14);
    // At this point the library should have rotated tokens in the background.
    expect(refreshRequestCount(s)).toBeGreaterThanOrEqual(1);
    addRotatedNeedles();

    // ─── Step 3: make another API call on the rotated token.
    const call2 = await tab.makeApiCall();
    expect(call2.success).toBe(true);

    // ─── Step 4: hard-expire the access token and force an on-demand refresh.
    await expireAccessToken(s);
    const call3 = await tab.makeApiCall();
    expect(call3.success).toBe(true);
    addRotatedNeedles();

    // ─── Step 5: provoke a network error on the next refresh, then recover.
    await expireAccessToken(s);
    failNextRefresh(s, 1);
    const call4 = await tab.makeApiCall();
    // Library retries; eventual success or library error — both fine. We
    // only care that any surfaced error message does not contain a token.
    if (!call4.success && call4.error) {
      bus.errors.push('call4-network: ' + safeStringify(call4.error));
    }
    await advanceMs(s, 500);
    addRotatedNeedles();

    // ─── Step 6: provoke an HTTP 500 on the next refresh.
    await expireAccessToken(s);
    serverErrorNext(s, 1);
    const call5 = await tab.makeApiCall();
    if (!call5.success && call5.error) {
      bus.errors.push('call5-500: ' + safeStringify(call5.error));
    }
    await advanceMs(s, 500);
    addRotatedNeedles();

    // ─── Step 7: provoke a malformed response body on the next refresh.
    await expireAccessToken(s);
    s.ctx.server.overrideNextResponse(
      () =>
        new Response('this is not json {{{{', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );
    const call6 = await tab.makeApiCall();
    if (!call6.success && call6.error) {
      bus.errors.push('call6-malformed: ' + safeStringify(call6.error));
    }
    await advanceMs(s, 500);

    // ─── Step 8: provoke a 401 invalid_grant to trigger onSessionExpired.
    //            Use a second tab so we can observe the expired callback
    //            without entangling it with the first tab's state.
    const expiredErrors: string[] = [];
    const tab2 = new BrowserTab({
      id: 'leak-tab-2',
      storage: s.ctx.storage,
      baseUrl: BASE_URL,
      audit: s.ctx.audit,
      onSessionExpired: (tabId, error) => {
        expiredErrors.push(`${tabId}: ${safeStringify(error)}`);
      },
    });
    s.tabs.push(tab2);

    // Seed tab2 with fresh tokens so we have a clean session to expire.
    const tab2Access = s.ctx.server.issueAccessToken();
    const tab2Refresh = s.ctx.server.issueRefreshToken();
    tab2.sessionManager.setTokens({
      accessToken: tab2Access,
      refreshToken: tab2Refresh,
      expiresIn: 900,
    });
    tokenNeedles.push({ label: 'tab2-access-20', value: tab2Access.slice(0, 20) });
    tokenNeedles.push({ label: 'tab2-refresh-20', value: tab2Refresh.slice(0, 20) });
    tokenNeedles.push({ label: 'tab2-access-full', value: tab2Access });
    tokenNeedles.push({ label: 'tab2-refresh-full', value: tab2Refresh });

    // Expire and force a refresh that the server rejects as invalid_grant.
    await expireAccessToken(s);
    s.ctx.server.overrideNextResponse(
      () =>
        new Response(JSON.stringify({ error: 'invalid_grant', message: 'token revoked' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
    );
    const expiredCall = await tab2.makeApiCall();
    if (!expiredCall.success && expiredCall.error) {
      bus.errors.push('tab2-401: ' + safeStringify(expiredCall.error));
    }
    await advanceSeconds(s, 2);

    // Drain any queued onSessionExpired side effects into the capture bus.
    for (const e of expiredErrors) {
      bus.errors.push('onSessionExpired: ' + e);
    }

    // ─── Step 9: logout (clearSession) and advance time to ensure no
    //            post-logout refresh leaks.
    tab.sessionManager.clearSession();
    tab2.sessionManager.clearSession();
    await advanceMinutes(s, 5);

    // ─── Collect all captured strings into one haystack ─────────────────
    const haystack: string[] = [
      ...bus.logs,
      ...bus.urlWrites,
      ...bus.cookieWrites,
      ...bus.postMessages,
      ...bus.errors,
    ];

    // Stash on globalThis so the reporter (below) can read it.
    (globalThis as unknown as { __leakageBus: CaptureBus }).__leakageBus = bus;
    (globalThis as unknown as { __leakageHits: ReturnType<typeof findLeakage> }).__leakageHits =
      findLeakage(haystack, tokenNeedles);

    // ─── Assertions ─────────────────────────────────────────────────────

    // 1. No token substring in any captured string.
    const hits = findLeakage(haystack, tokenNeedles);
    if (hits.length > 0) {
      // eslint-disable-next-line no-console
      process.stderr.write(
        'LEAKAGE HITS:\n' + hits.map(h => `  [${h.label}] in ${h.where}`).join('\n') + '\n',
      );
    }
    expect(hits).toEqual([]);

    // 2. No URL writes contain "_auth=" (v2.31 regression guard).
    for (const u of bus.urlWrites) {
      expect(u).not.toContain('_auth=');
    }

    // 3. Cookie writes: when enableCookieSession is false (default in BrowserTab),
    //    there should be no cookie writes attributable to the library other than
    //    whatever the test env already had. Specifically: no "set:" entries.
    const setCookies = bus.cookieWrites.filter(c => c.startsWith('set:'));
    expect(setCookies).toEqual([]);

    // 4. No postMessage calls were made by the library.
    const libPostMessages = bus.postMessages.filter(m => m.startsWith('postMessage:'));
    expect(libPostMessages).toEqual([]);

    // 5. Error messages (captured from caller promise rejections AND from the
    //    onSessionExpired callback) must not contain token substrings.
    for (const e of bus.errors) {
      for (const needle of tokenNeedles) {
        expect(e).not.toContain(needle.value);
      }
    }
  });
});
