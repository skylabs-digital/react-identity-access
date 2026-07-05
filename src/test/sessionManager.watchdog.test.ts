import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionExpiredError } from '../errors/SessionErrors';
import type { TokenStorage } from '../services/SessionManager';
import { SessionManager } from '../services/SessionManager';

// In-memory storage matching the convention in sessionManager.test.ts
function createMemoryStorage(): TokenStorage & { data: any } {
  const store: { data: any } = { data: null };
  return {
    get: () => store.data,
    set: (d: any) => {
      store.data = d;
    },
    clear: () => {
      store.data = null;
    },
    get data() {
      return store.data;
    },
  };
}

// Fake JWT with a specific `exp` claim (seconds since epoch)
function makeJwt(expSec: number): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ userId: 'u1', email: 'a@b.com', exp: expSec }));
  return `${header}.${payload}.fakesig`;
}

// A refresh response whose access token is a JWT expiring `ttlSec` from *now*,
// and which deliberately omits `expiresIn` (mirrors idachu's /auth/refresh).
function makeRefreshResponseNoExpiresIn(ttlSec: number, rt: string) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        accessToken: makeJwt(Math.floor(Date.now() / 1000) + ttlSec),
        refreshToken: rt,
        user: { id: 'u1' },
        // NO expiresIn — server derives from JWT exp
      }),
  };
}

describe('SessionManager — clock-based expiry watchdog', () => {
  let storage: ReturnType<typeof createMemoryStorage>;

  beforeEach(() => {
    storage = createMemoryStorage();
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterEach(() => {
    SessionManager.resetAllInstances();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('idle dead token: watchdog flips state to expired and fires onSessionExpired with NO request', async () => {
    // No refresh token → nothing can refresh; the token simply dies on the clock.
    const onSessionExpired = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const sm = new SessionManager({
      tokenStorage: storage,
      autoRefresh: true,
      proactiveRefreshMargin: 30000,
      baseUrl: 'http://api',
      onSessionExpired,
    });
    // Access token valid for 60s, NO refresh token → cannot be refreshed.
    sm.setTokens({ accessToken: 'a', refreshToken: '', expiresIn: 60 });

    expect(sm.getState()).toBe('authenticated');
    expect(sm.hasValidSession()).toBe(true);

    // Advance past real expiry (60s). The idle user made no request.
    await vi.advanceTimersByTimeAsync(61000);

    // Watchdog must have detected the crossing purely on the clock.
    expect(sm.getState()).toBe('expired');
    expect(sm.hasValidSession()).toBe(false);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    // No network request was made — detection was clock-only.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('watchdog notifies subscribers when an idle token dies (isAuthenticated must flip)', async () => {
    const sm = new SessionManager({
      tokenStorage: storage,
      autoRefresh: true,
      baseUrl: 'http://api',
    });
    sm.setTokens({ accessToken: 'a', refreshToken: '', expiresIn: 60 });

    const listener = vi.fn();
    sm.subscribe(listener);

    await vi.advanceTimersByTimeAsync(61000);

    // A notify() must have fired so React's useSyncExternalStore re-renders.
    expect(listener).toHaveBeenCalled();
    expect(sm.getState()).toBe('expired');
  });

  it('watchdog does NOT fire expired if a proactive refresh renewed the token first', async () => {
    const onSessionExpired = vi.fn();
    // Refresh returns a fresh JWT (valid 1hr) with no expiresIn.
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(makeRefreshResponseNoExpiresIn(3600, 'r2')));
    vi.stubGlobal('fetch', fetchMock);

    const sm = new SessionManager({
      tokenStorage: storage,
      autoRefresh: true,
      proactiveRefreshMargin: 30000,
      baseUrl: 'http://api',
      maxRefreshRetries: 0,
      onSessionExpired,
    });
    // access token valid 60s WITH a refresh token → proactive refresh at 30s.
    sm.setTokens({ accessToken: makeJwt(Math.floor(Date.now() / 1000) + 60), refreshToken: 'r1' });

    // Cross the proactive margin → refresh fires and renews.
    await vi.advanceTimersByTimeAsync(31000);
    expect(fetchMock).toHaveBeenCalled();

    // Advance past the ORIGINAL expiry — session must still be alive.
    await vi.advanceTimersByTimeAsync(40000);
    expect(onSessionExpired).not.toHaveBeenCalled();
    expect(sm.getState()).toBe('authenticated');
    sm.destroy();
  });
});

describe('SessionManager — multi-cycle proactive chaining', () => {
  let storage: ReturnType<typeof createMemoryStorage>;

  beforeEach(() => {
    storage = createMemoryStorage();
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterEach(() => {
    SessionManager.resetAllInstances();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('refresh #1 → #2 → #3 all fire on schedule, chain survives missing expiresIn (JWT exp only)', async () => {
    let call = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      call++;
      // Each refresh returns a NEW JWT valid 60s, no expiresIn, rotated RT.
      return Promise.resolve(makeRefreshResponseNoExpiresIn(60, `r${call + 1}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const sm = new SessionManager({
      tokenStorage: storage,
      autoRefresh: true,
      proactiveRefreshMargin: 30000, // refresh 30s before the 60s expiry
      baseUrl: 'http://api',
      maxRefreshRetries: 0,
    });
    // Initial: JWT valid 60s, refresh at 30s.
    sm.setTokens({ accessToken: makeJwt(Math.floor(Date.now() / 1000) + 60), refreshToken: 'r1' });

    // Cycle 1: fires at 30s
    await vi.advanceTimersByTimeAsync(31000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Cycle 2: new token valid 60s from cycle-1 completion → next refresh ~30s later
    await vi.advanceTimersByTimeAsync(31000);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Cycle 3
    await vi.advanceTimersByTimeAsync(31000);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    expect(sm.getState()).toBe('authenticated');
    sm.destroy();
  });
});

describe('SessionManager — refresh-on-return after idle', () => {
  let storage: ReturnType<typeof createMemoryStorage>;

  beforeEach(() => {
    storage = createMemoryStorage();
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterEach(() => {
    SessionManager.resetAllInstances();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('visibilitychange→visible triggers an immediate refresh when token is past threshold', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(makeRefreshResponseNoExpiresIn(3600, 'r2')));
    vi.stubGlobal('fetch', fetchMock);

    const sm = new SessionManager({
      tokenStorage: storage,
      autoRefresh: true,
      refreshThreshold: 300000,
      proactiveRefreshMargin: 60000,
      baseUrl: 'http://api',
      maxRefreshRetries: 0,
    });
    // Store a token that is already EXPIRED but with a valid refresh token.
    storage.set({
      accessToken: makeJwt(Math.floor(Date.now() / 1000) - 60),
      refreshToken: 'r1',
    });

    // No refresh should have happened yet — storage was seeded post-construction.
    expect(fetchMock).not.toHaveBeenCalled();

    // Simulate the tab becoming visible again after a long idle.
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    await vi.advanceTimersByTimeAsync(10);
    // The return-to-foreground triggered an immediate refresh that renewed the token.
    expect(fetchMock).toHaveBeenCalled();
    expect(sm.getTokens()?.refreshToken).toBe('r2');
    sm.destroy();
  });

  it('window focus triggers an immediate refresh when token is expired but refresh token exists', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(makeRefreshResponseNoExpiresIn(3600, 'r2')));
    vi.stubGlobal('fetch', fetchMock);

    const sm = new SessionManager({
      tokenStorage: storage,
      autoRefresh: true,
      refreshThreshold: 300000,
      baseUrl: 'http://api',
      maxRefreshRetries: 0,
    });
    storage.set({
      accessToken: makeJwt(Math.floor(Date.now() / 1000) - 60),
      refreshToken: 'r1',
    });

    expect(fetchMock).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('focus'));

    await vi.advanceTimersByTimeAsync(10);
    expect(fetchMock).toHaveBeenCalled();
    expect(sm.getTokens()?.refreshToken).toBe('r2');
    sm.destroy();
  });

  it('ensureValidSession refreshes on mount when token is expired but refresh token exists', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(makeRefreshResponseNoExpiresIn(3600, 'r2')));
    vi.stubGlobal('fetch', fetchMock);

    storage.set({
      accessToken: makeJwt(Math.floor(Date.now() / 1000) - 60),
      refreshToken: 'r1',
    });

    const sm = new SessionManager({
      tokenStorage: storage,
      autoRefresh: true,
      refreshThreshold: 300000,
      baseUrl: 'http://api',
      maxRefreshRetries: 0,
    });

    const result = await sm.ensureValidSession();
    expect(result).toBe('authenticated');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    sm.destroy();
  });
});

describe('SessionManager — reuse/rotation classification', () => {
  let storage: ReturnType<typeof createMemoryStorage>;

  beforeEach(() => {
    storage = createMemoryStorage();
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterEach(() => {
    SessionManager.resetAllInstances();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('"reuse detected — all sessions revoked" (400) is fatal → session closes', async () => {
    const onSessionExpired = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: () =>
        Promise.resolve({
          message: 'Refresh token reuse detected — all sessions revoked for security',
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const sm = new SessionManager({
      tokenStorage: storage,
      autoRefresh: true,
      refreshThreshold: 300000,
      baseUrl: 'http://api',
      maxRefreshRetries: 3,
      onSessionExpired,
    });
    storage.set({
      accessToken: makeJwt(Math.floor(Date.now() / 1000) - 60),
      refreshToken: 'r1',
    });

    await expect(sm.getValidAccessToken()).rejects.toBeInstanceOf(SessionExpiredError);
    // Only one attempt — reuse is fatal, no retry loop.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(sm.getState()).toBe('expired');
  });

  it('"refresh token already used — please use the latest token" (400) recovers by using the rotated token from storage', async () => {
    // First call: the token we send is stale → "already used" (transient).
    // Meanwhile storage has been rotated to r2 by a concurrent refresh.
    // The retry must re-read storage and send r2, which succeeds.
    let attempt = 0;
    const sentTokens: string[] = [];
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init: any) => {
      attempt++;
      const body = JSON.parse(init.body);
      sentTokens.push(body.refreshToken);
      if (attempt === 1) {
        // Simulate a concurrent refresh having rotated the token in storage.
        storage.set({
          accessToken: makeJwt(Math.floor(Date.now() / 1000) - 60),
          refreshToken: 'r2',
        });
        return {
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: () =>
            Promise.resolve({
              message: 'Refresh token already used — please use the latest token',
            }),
        };
      }
      return makeRefreshResponseNoExpiresIn(3600, 'r3');
    });
    vi.stubGlobal('fetch', fetchMock);

    const sm = new SessionManager({
      tokenStorage: storage,
      autoRefresh: true,
      refreshThreshold: 300000,
      baseUrl: 'http://api',
      maxRefreshRetries: 3,
      retryBackoffBase: 1,
    });
    storage.set({
      accessToken: makeJwt(Math.floor(Date.now() / 1000) - 60),
      refreshToken: 'r1',
    });

    const promise = sm.getValidAccessToken();
    await vi.advanceTimersByTimeAsync(50); // let backoff sleep elapse
    const token = await promise;

    expect(token).toBeTruthy();
    // Attempt 1 sent r1 (stale), attempt 2 re-read storage and sent r2 (rotated).
    expect(sentTokens[0]).toBe('r1');
    expect(sentTokens[1]).toBe('r2');
    expect(sm.getState()).toBe('authenticated');
    sm.destroy();
  });

  it('"already used" does not loop forever — bounded by maxRefreshRetries', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: () =>
        Promise.resolve({ message: 'Refresh token already used — please use the latest token' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const sm = new SessionManager({
      tokenStorage: storage,
      autoRefresh: true,
      refreshThreshold: 300000,
      baseUrl: 'http://api',
      maxRefreshRetries: 2,
      retryBackoffBase: 1,
    });
    storage.set({
      accessToken: makeJwt(Math.floor(Date.now() / 1000) - 60),
      refreshToken: 'r1',
    });

    const promise = sm.getValidAccessToken().catch(e => e);
    await vi.advanceTimersByTimeAsync(100);
    const err = await promise;

    expect(err).toBeInstanceOf(Error);
    // maxRefreshRetries=2 → 3 total attempts, then gives up (no infinite loop).
    expect(fetchMock).toHaveBeenCalledTimes(3);
    sm.destroy();
  });
});
