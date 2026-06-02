import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionExpiredError } from '../errors/SessionErrors';
import type { TokenStorage } from '../services/SessionManager';
import { SessionManager } from '../services/SessionManager';

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

describe('SessionManager — state machine + subscribe', () => {
  let storage: ReturnType<typeof createMemoryStorage>;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  afterEach(() => {
    SessionManager.resetAllInstances();
    vi.restoreAllMocks();
  });

  describe('subscribe + getSnapshot', () => {
    it('fires listener and bumps snapshot on setTokens', () => {
      const sm = new SessionManager({ tokenStorage: storage, autoRefresh: false });
      const listener = vi.fn();
      const initial = sm.getSnapshot();
      sm.subscribe(listener);

      sm.setTokens({ accessToken: 'a', refreshToken: 'r', expiresIn: 3600 });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(sm.getSnapshot()).toBeGreaterThan(initial);
    });

    it('fires on setUser and clearUser', () => {
      const sm = new SessionManager({ tokenStorage: storage, autoRefresh: false });
      sm.setTokens({ accessToken: 'a', refreshToken: 'r', expiresIn: 3600 });

      const listener = vi.fn();
      sm.subscribe(listener);

      sm.setUser({ id: 'u1' });
      expect(listener).toHaveBeenCalledTimes(1);

      sm.clearUser();
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('fires on clearSession', () => {
      const sm = new SessionManager({ tokenStorage: storage, autoRefresh: false });
      sm.setTokens({ accessToken: 'a', refreshToken: 'r', expiresIn: 3600 });

      const listener = vi.fn();
      sm.subscribe(listener);
      sm.clearSession();

      expect(listener).toHaveBeenCalled();
    });

    it('unsubscribe stops listener invocations', () => {
      const sm = new SessionManager({ tokenStorage: storage, autoRefresh: false });
      const listener = vi.fn();
      const unsubscribe = sm.subscribe(listener);

      sm.setTokens({ accessToken: 'a', refreshToken: 'r', expiresIn: 3600 });
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      sm.setUser({ id: 'u1' });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('isolates one subscriber throwing from others', () => {
      const sm = new SessionManager({ tokenStorage: storage, autoRefresh: false });
      const good = vi.fn();
      sm.subscribe(() => {
        throw new Error('boom');
      });
      sm.subscribe(good);

      sm.setTokens({ accessToken: 'a', refreshToken: 'r', expiresIn: 3600 });

      expect(good).toHaveBeenCalled();
    });
  });

  describe('state transitions', () => {
    it("starts as 'idle' when storage is empty", () => {
      const sm = new SessionManager({ tokenStorage: storage, autoRefresh: false });
      expect(sm.getState()).toBe('idle');
    });

    it("starts as 'restoring' when storage has tokens", () => {
      storage.set({ accessToken: 'a', refreshToken: 'r', expiresAt: Date.now() + 3600_000 });
      const sm = new SessionManager({ tokenStorage: storage, autoRefresh: false });
      expect(sm.getState()).toBe('restoring');
    });

    it("setTokens with non-expired tokens transitions to 'authenticated'", () => {
      const sm = new SessionManager({ tokenStorage: storage, autoRefresh: false });
      sm.setTokens({ accessToken: 'a', refreshToken: 'r', expiresIn: 3600 });
      expect(sm.getState()).toBe('authenticated');
    });

    it("clearSession('logout') transitions to 'idle'", () => {
      const sm = new SessionManager({ tokenStorage: storage, autoRefresh: false });
      sm.setTokens({ accessToken: 'a', refreshToken: 'r', expiresIn: 3600 });
      sm.clearSession('logout');
      expect(sm.getState()).toBe('idle');
    });

    it("clearSession() default transitions to 'expired'", () => {
      const sm = new SessionManager({ tokenStorage: storage, autoRefresh: false });
      sm.setTokens({ accessToken: 'a', refreshToken: 'r', expiresIn: 3600 });
      sm.clearSession();
      expect(sm.getState()).toBe('expired');
    });
  });

  describe('logout vs expired distinction', () => {
    it("clearSession('logout') does not fire onSessionExpired", () => {
      const onSessionExpired = vi.fn();
      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: false,
        onSessionExpired,
      });
      sm.setTokens({ accessToken: 'a', refreshToken: 'r', expiresIn: 3600 });

      sm.clearSession('logout');

      expect(onSessionExpired).not.toHaveBeenCalled();
    });

    it('logout during in-flight refresh suppresses onSessionExpired', async () => {
      let resolveFetch: (v: any) => void = () => {};
      const fetchMock = vi.fn().mockImplementation(
        () =>
          new Promise(r => {
            resolveFetch = r;
          })
      );
      vi.stubGlobal('fetch', fetchMock);

      const onSessionExpired = vi.fn();
      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        baseUrl: 'http://api',
        proactiveRefreshMargin: 0,
        refreshThreshold: 10_000,
        maxRefreshRetries: 0,
        onSessionExpired,
      });
      storage.set({
        accessToken: 'old',
        refreshToken: 'rt',
        expiresAt: Date.now() + 5_000, // within refreshThreshold
      });

      // Start refresh that we'll race with a logout.
      const refreshPromise = sm.getValidAccessToken().catch(() => undefined);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Logout while refresh is hanging.
      sm.clearSession('logout');

      // Now make the in-flight refresh reject (simulating server 401 race).
      resolveFetch({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'token expired' }),
      });

      await refreshPromise;

      expect(onSessionExpired).not.toHaveBeenCalled();
      expect(sm.getState()).toBe('idle');
    });
  });

  describe('globalThis registry', () => {
    it('returns the same instance for the same storageKey across getInstance calls', () => {
      const a = SessionManager.getInstance({ storageKey: 'shared', baseUrl: 'http://api' });
      const b = SessionManager.getInstance({ storageKey: 'shared', baseUrl: 'http://api' });
      expect(a).toBe(b);
    });

    it('exposes the registry on globalThis (defensive against duplicated bundles)', () => {
      SessionManager.getInstance({ storageKey: 'global-probe', baseUrl: 'http://api' });
      const g = globalThis as Record<string, unknown>;
      const registry = g['__RIA_SESSION_INSTANCES_V1__'];
      expect(registry).toBeInstanceOf(Map);
      expect((registry as Map<string, unknown>).has('global-probe')).toBe(true);
    });
  });

  describe('ensureValidSession', () => {
    it("returns 'unauthenticated' when storage has no tokens", async () => {
      const sm = new SessionManager({ tokenStorage: storage, autoRefresh: false });
      const result = await sm.ensureValidSession();
      expect(result).toBe('unauthenticated');
      expect(sm.getState()).toBe('idle');
    });

    it("returns 'authenticated' for fresh non-expired tokens without hitting fetch", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: false,
        proactiveRefreshMargin: 0,
        refreshThreshold: 0,
      });
      storage.set({
        accessToken: 'fresh',
        refreshToken: 'rt',
        expiresAt: Date.now() + 3600_000,
      });

      const result = await sm.ensureValidSession();

      expect(result).toBe('authenticated');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("returns 'authenticated' after refresh when access is expired but refresh is valid", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ accessToken: 'new', refreshToken: 'rt2', expiresIn: 3600 }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        baseUrl: 'http://api',
        proactiveRefreshMargin: 0,
        refreshThreshold: 0,
        maxRefreshRetries: 0,
      });
      storage.set({ accessToken: 'old', refreshToken: 'rt', expiresAt: Date.now() - 1000 });

      const result = await sm.ensureValidSession();

      expect(result).toBe('authenticated');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(sm.getTokens()?.accessToken).toBe('new');
    });

    it("returns 'expired' and fires onSessionExpired when refresh returns 401", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'token invalid' }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const onSessionExpired = vi.fn();
      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        baseUrl: 'http://api',
        proactiveRefreshMargin: 0,
        refreshThreshold: 0,
        maxRefreshRetries: 0,
        onSessionExpired,
      });
      storage.set({ accessToken: 'old', refreshToken: 'rt', expiresAt: Date.now() - 1000 });

      const result = await sm.ensureValidSession();

      expect(result).toBe('expired');
      expect(onSessionExpired).toHaveBeenCalledTimes(1);
      expect(onSessionExpired.mock.calls[0][0]).toBeInstanceOf(SessionExpiredError);
      expect(sm.getState()).toBe('expired');
    });

    it("returns 'expired' when refresh body is malformed JSON", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      });
      vi.stubGlobal('fetch', fetchMock);

      const onSessionExpired = vi.fn();
      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        baseUrl: 'http://api',
        proactiveRefreshMargin: 0,
        refreshThreshold: 0,
        maxRefreshRetries: 0,
        onSessionExpired,
      });
      storage.set({ accessToken: 'old', refreshToken: 'rt', expiresAt: Date.now() - 1000 });

      const result = await sm.ensureValidSession();

      expect(result).toBe('expired');
      expect(sm.getState()).toBe('expired');
    });

    it('deduplicates with an already in-flight refresh (single network call)', async () => {
      // Gate the refresh so we can fire ensureValidSession while it's mid-flight.
      let resolveFetch: (v: unknown) => void = () => {};
      const fetchMock = vi.fn().mockImplementation(
        () =>
          new Promise(r => {
            resolveFetch = r;
          })
      );
      vi.stubGlobal('fetch', fetchMock);

      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        baseUrl: 'http://api',
        proactiveRefreshMargin: 0,
        refreshThreshold: 0,
        maxRefreshRetries: 0,
      });
      storage.set({ accessToken: 'old', refreshToken: 'rt', expiresAt: Date.now() - 1000 });

      // Kick off a refresh via getValidAccessToken to populate refreshPromise.
      const inFlightCall = sm.getValidAccessToken().catch(() => undefined);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(sm.getRefreshInFlight()).toBe(true);

      // Now run ensureValidSession concurrently — it must NOT start a second
      // fetch. It should wait on the existing refreshPromise.
      const ensurePromise = sm.ensureValidSession();
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Release the refresh with a successful response.
      resolveFetch({
        ok: true,
        json: async () => ({ accessToken: 'new', refreshToken: 'rt2', expiresIn: 3600 }),
      });

      const result = await ensurePromise;
      await inFlightCall;

      expect(result).toBe('authenticated');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(sm.getTokens()?.accessToken).toBe('new');
    });

    it("returns 'expired' when access token is present but refresh token is missing", async () => {
      const onSessionExpired = vi.fn();
      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: false,
        onSessionExpired,
      });
      storage.set({ accessToken: 'old', expiresAt: Date.now() - 1000 });

      const result = await sm.ensureValidSession();

      expect(result).toBe('expired');
      expect(onSessionExpired).toHaveBeenCalled();
    });
  });

  describe('getRefreshStats', () => {
    it('reflects in-flight refresh state', async () => {
      let resolveFetch: (v: any) => void = () => {};
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(
          () =>
            new Promise(r => {
              resolveFetch = r;
            })
        )
      );

      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        baseUrl: 'http://api',
        proactiveRefreshMargin: 0,
        refreshThreshold: 0,
        maxRefreshRetries: 0,
      });
      storage.set({ accessToken: 'old', refreshToken: 'rt', expiresAt: Date.now() - 1000 });

      const p = sm.getValidAccessToken().catch(() => undefined);

      const duringStats = sm.getRefreshStats();
      expect(duringStats.inFlight).toBe(true);
      expect(duringStats.isRefreshing).toBe(true);

      resolveFetch({
        ok: true,
        json: async () => ({ accessToken: 'new', refreshToken: 'rt2', expiresIn: 3600 }),
      });
      await p;

      const afterStats = sm.getRefreshStats();
      expect(afterStats.inFlight).toBe(false);
      expect(afterStats.isRefreshing).toBe(false);
    });

    it('captures lastExpiryReason after a fatal refresh failure', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: async () => ({ message: 'token expired' }),
        })
      );

      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        baseUrl: 'http://api',
        proactiveRefreshMargin: 0,
        refreshThreshold: 0,
        maxRefreshRetries: 0,
      });
      storage.set({ accessToken: 'old', refreshToken: 'rt', expiresAt: Date.now() - 1000 });

      await sm.ensureValidSession();

      const stats = sm.getRefreshStats();
      expect(stats.lastExpiryReason).toBeTruthy();
      expect(stats.state).toBe('expired');
    });
  });
});
