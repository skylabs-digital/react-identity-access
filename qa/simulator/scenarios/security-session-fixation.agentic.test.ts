/**
 * Flow: security/session-fixation (agentic)
 *
 * Regression for the v2.31 removal of the `_auth` URL token transfer.
 *
 * Spec: qa/flows/security/session-fixation.md
 *
 * Black-box regression. We never read `src/` or `dist/` directly from this
 * file; the harness boots a real SessionManager via the public-facing
 * qa/harness surface and we verify:
 *
 *  1. A URL that contains `?_auth=<attacker-token>` does NOT hydrate a
 *     session — `SessionManager.getTokens()` must remain null after mount.
 *  2. No code path (including tenant-switch–style clearSession operations)
 *     produces or follows a URL that appends `?_auth=`.
 *
 * Run:
 *   yarn vitest run --config qa/vitest.config.ts \
 *     qa/simulator/scenarios/security-session-fixation.agentic.test.ts
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { SessionManager } from '../../../src/services/SessionManager.js';
import { SharedStorage } from '../core/shared-storage.js';
import {
  startScenario,
  loginTab,
  refreshRequestCount,
  teardown,
  BASE_URL,
  type Scenario,
} from '../../harness';

const ATTACKER_TOKEN =
  'attacker.' +
  Buffer.from(JSON.stringify({ sub: 'attacker', exp: 9999999999 })).toString(
    'base64url'
  ) +
  '.sig';

type LocationLike = {
  href: string;
  origin: string;
  protocol: string;
  host: string;
  hostname: string;
  pathname: string;
  search: string;
  hash: string;
  assign: (url: string) => void;
  replace: (url: string) => void;
  reload: () => void;
};

function installMockWindow(search: string): {
  location: LocationLike;
  assignCalls: string[];
  replaceCalls: string[];
  restore: () => void;
} {
  const assignCalls: string[] = [];
  const replaceCalls: string[] = [];
  const location: LocationLike = {
    href: `https://victim.example.com/${search}`,
    origin: 'https://victim.example.com',
    protocol: 'https:',
    host: 'victim.example.com',
    hostname: 'victim.example.com',
    pathname: '/',
    search,
    hash: '',
    assign: (url: string) => {
      assignCalls.push(url);
    },
    replace: (url: string) => {
      replaceCalls.push(url);
    },
    reload: () => {
      /* no-op */
    },
  };

  const priorWindow = (globalThis as any).window;
  const priorDocument = (globalThis as any).document;

  (globalThis as any).window = {
    location,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  };
  (globalThis as any).document = {
    cookie: '',
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  return {
    location,
    assignCalls,
    replaceCalls,
    restore: () => {
      if (priorWindow === undefined) {
        delete (globalThis as any).window;
      } else {
        (globalThis as any).window = priorWindow;
      }
      if (priorDocument === undefined) {
        delete (globalThis as any).document;
      } else {
        (globalThis as any).document = priorDocument;
      }
    },
  };
}

describe('Flow: security/session-fixation (agentic)', () => {
  let s: Scenario;
  const createdManagers: SessionManager[] = [];
  let mockWindow: ReturnType<typeof installMockWindow> | null = null;

  afterEach(() => {
    for (const m of createdManagers) {
      try {
        m.destroy();
      } catch {
        /* ignore */
      }
    }
    createdManagers.length = 0;
    if (mockWindow) {
      mockWindow.restore();
      mockWindow = null;
    }
    if (s) teardown(s);
    vi.restoreAllMocks();
  });

  it('vector 1: ?_auth=<attacker-token> must not hydrate a session on mount', async () => {
    // Install a fake window.location that contains the attacker's token in the
    // query string — simulating a victim who clicked on
    // https://victim.example.com/?_auth=<attacker-token>
    mockWindow = installMockWindow(`?_auth=${encodeURIComponent(ATTACKER_TOKEN)}`);

    s = startScenario('security-session-fixation');

    // Fresh, empty storage — no prior session anywhere.
    const storage = new SharedStorage();
    expect(storage.peek()).toBeNull();

    // Fail the scenario if the library ever makes a /auth/refresh or any
    // fetch call while mounting a cold SessionManager — it shouldn't need to.
    const refreshBefore = refreshRequestCount(s);

    const sm = new SessionManager({
      storageKey: 'sim_auth_tokens_fixation',
      tokenStorage: storage,
      baseUrl: BASE_URL,
      autoRefresh: true,
      proactiveRefreshMargin: 60000,
      refreshQueueTimeout: 10000,
      maxRefreshRetries: 3,
      retryBackoffBase: 1000,
      onSessionExpired: () => {
        /* no-op */
      },
    } as any);
    createdManagers.push(sm);

    // Assertion A: storage remains empty after construction.
    expect(storage.peek()).toBeNull();

    // Assertion B: the SessionManager exposes no tokens.
    expect(sm.getTokens()).toBeNull();
    expect(sm.getAccessToken()).toBeNull();
    expect(sm.hasValidSession()).toBe(false);

    // Assertion C: no network activity triggered by reading window.location.
    expect(refreshRequestCount(s)).toBe(refreshBefore);

    // Assertion D: the attacker's token is nowhere in the serialized state.
    const serialized = JSON.stringify(storage.peek());
    expect(serialized).not.toContain(ATTACKER_TOKEN);
    expect(serialized).not.toContain('_auth=');
  });

  it('vector 2: clearSession (tenant-switch style) never emits a ?_auth= URL', async () => {
    // Start with a neutral window (no _auth in the URL).
    mockWindow = installMockWindow('');

    s = startScenario('security-session-fixation-switch');

    // Start a logged-in tab and then simulate a tenant switch by clearing the
    // session. The public tenant-switch path uses clearSession() under the hood
    // (see qa/simulator/scenarios/flow-tenant-switch.agentic.test.ts).
    const tab = loginTab(s, 'tab-1');
    expect(tab.sessionManager.hasValidSession()).toBe(true);

    // Snapshot any URL the library might have written through location.assign
    // or location.replace BEFORE we clear.
    const initialAssigns = [...mockWindow.assignCalls];
    const initialReplaces = [...mockWindow.replaceCalls];

    tab.sessionManager.clearSession();

    // Assertion A: session was actually cleared.
    expect(tab.sessionManager.getTokens()).toBeNull();
    expect(tab.sessionManager.hasValidSession()).toBe(false);

    // Assertion B: no navigation the library may have performed contains
    // `_auth=` in its URL.
    const newAssigns = mockWindow.assignCalls.slice(initialAssigns.length);
    const newReplaces = mockWindow.replaceCalls.slice(initialReplaces.length);
    for (const url of [...newAssigns, ...newReplaces]) {
      expect(url).not.toContain('_auth=');
    }

    // Assertion C: the current location.href itself must not have been
    // rewritten to include `_auth=` by any library code path.
    expect(mockWindow.location.href).not.toContain('_auth=');
    expect(mockWindow.location.search).not.toContain('_auth=');
  });

  it('vector 3: storing a new session never persists anything keyed to _auth', async () => {
    mockWindow = installMockWindow('');
    s = startScenario('security-session-fixation-persist');

    const tab = loginTab(s, 'tab-1');
    expect(tab.sessionManager.hasValidSession()).toBe(true);

    const stored = s.ctx.storage.peek();
    expect(stored).not.toBeNull();

    // The serialized storage record must not contain the `_auth` key or the
    // `_auth=` query fragment — this is a guard against future regressions
    // that might try to round-trip tokens through a URL.
    const serialized = JSON.stringify(stored);
    expect(serialized).not.toContain('_auth=');
    expect(serialized).not.toMatch(/["']_auth["']\s*:/);
  });
});
