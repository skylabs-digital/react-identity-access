import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionManager } from '../services/SessionManager';
import type { TokenStorage } from '../services/SessionManager';
import {
  SessionExpiredError,
  TokenRefreshTimeoutError,
  TokenRefreshError,
} from '../errors/SessionErrors';

// Helper to create an in-memory TokenStorage
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

// Helper to create tokens that expire in N seconds
function makeTokens(expiresInSec: number, refreshToken = 'refresh-abc') {
  return {
    accessToken: 'access-123',
    refreshToken,
    expiresAt: Date.now() + expiresInSec * 1000,
  };
}

// Helper to create a fake JWT with a specific `exp` claim (seconds since epoch)
function makeJwt(expSec: number): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ userId: 'u1', email: 'a@b.com', exp: expSec }));
  return `${header}.${payload}.fakesig`;
}

describe('SessionManager', () => {
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

  // ─── Basic token CRUD ───

  describe('Token CRUD', () => {
    it('should store and retrieve tokens', () => {
      const sm = new SessionManager({ tokenStorage: storage, autoRefresh: false });
      sm.setTokens({ accessToken: 'a', refreshToken: 'r', expiresIn: 3600 });
      const tokens = sm.getTokens();
      expect(tokens?.accessToken).toBe('a');
      expect(tokens?.refreshToken).toBe('r');
      expect(tokens?.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should clear tokens', () => {
      const sm = new SessionManager({ tokenStorage: storage, autoRefresh: false });
      sm.setTokens({ accessToken: 'a', refreshToken: 'r', expiresIn: 3600 });
      sm.clearTokens();
      expect(sm.getTokens()).toBeNull();
    });

    it('hasValidSession returns true for non-expired tokens', () => {
      const sm = new SessionManager({ tokenStorage: storage, autoRefresh: false });
      sm.setTokens({ accessToken: 'a', expiresIn: 3600 });
      expect(sm.hasValidSession()).toBe(true);
    });

    it('hasValidSession returns false for expired tokens', () => {
      const sm = new SessionManager({ tokenStorage: storage, autoRefresh: false });
      storage.set({ accessToken: 'a', expiresAt: Date.now() - 1000 });
      expect(sm.hasValidSession()).toBe(false);
    });
  });

  // ─── getValidAccessToken ───

  describe('getValidAccessToken', () => {
    it('returns token immediately if valid and not near expiry', async () => {
      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        refreshThreshold: 60000, // 1 min
        baseUrl: 'http://api',
      });
      storage.set(makeTokens(3600)); // expires in 1hr

      const token = await sm.getValidAccessToken();
      expect(token).toBe('access-123');
    });

    it('throws SessionExpiredError when no tokens exist', async () => {
      const onExpired = vi.fn();
      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: false,
        onSessionExpired: onExpired,
      });

      await expect(sm.getValidAccessToken()).rejects.toThrow(SessionExpiredError);
      expect(onExpired).toHaveBeenCalledOnce();
      expect(onExpired.mock.calls[0][0].reason).toBe('token_invalid');
    });

    it('throws SessionExpiredError when token expired and no refresh token', async () => {
      const onExpired = vi.fn();
      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        refreshThreshold: 60000,
        onSessionExpired: onExpired,
      });
      storage.set({ accessToken: 'a', expiresAt: Date.now() - 1000 }); // expired, no refresh

      await expect(sm.getValidAccessToken()).rejects.toThrow(SessionExpiredError);
      expect(onExpired).toHaveBeenCalledOnce();
    });
  });

  // ─── Error classification ───

  describe('Error classification during refresh', () => {
    function makeManagerWithFetch(fetchImpl: typeof global.fetch) {
      vi.stubGlobal('fetch', fetchImpl);
      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        refreshThreshold: 300000,
        baseUrl: 'http://api',
        maxRefreshRetries: 0, // No retries for classification tests
        retryBackoffBase: 0,
      });
      // Set tokens that need refresh (near expiry)
      storage.set(makeTokens(10)); // 10s left, within 5min threshold
      return sm;
    }

    it('classifies 401 "Refresh token expired" as SessionExpiredError(token_expired)', async () => {
      const sm = makeManagerWithFetch(
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: () => Promise.resolve({ message: 'Refresh token expired' }),
        })
      );

      try {
        await sm.getValidAccessToken();
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(SessionExpiredError);
        expect((e as SessionExpiredError).reason).toBe('token_expired');
      }
    });

    it('classifies 401 "Invalid refresh token" as SessionExpiredError(token_invalid)', async () => {
      const sm = makeManagerWithFetch(
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: () => Promise.resolve({ message: 'Invalid refresh token' }),
        })
      );

      try {
        await sm.getValidAccessToken();
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(SessionExpiredError);
        expect((e as SessionExpiredError).reason).toBe('token_invalid');
      }
    });

    it('classifies 400 "User account is inactive" as SessionExpiredError(user_inactive)', async () => {
      const sm = makeManagerWithFetch(
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: () => Promise.resolve({ message: 'User account is inactive' }),
        })
      );

      try {
        await sm.getValidAccessToken();
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(SessionExpiredError);
        expect((e as SessionExpiredError).reason).toBe('user_inactive');
      }
    });

    it('classifies 400 "User not found" as transient (TokenRefreshError after retries)', async () => {
      const sm = makeManagerWithFetch(
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: () => Promise.resolve({ message: 'User not found' }),
        })
      );

      try {
        await sm.getValidAccessToken();
        expect.unreachable('Should have thrown');
      } catch (e) {
        // With 0 retries, it wraps in TokenRefreshError
        expect(e).toBeInstanceOf(TokenRefreshError);
      }
    });

    it('classifies 500 as transient (TokenRefreshError after retries)', async () => {
      const sm = makeManagerWithFetch(
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({ message: 'Something went wrong' }),
        })
      );

      try {
        await sm.getValidAccessToken();
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(TokenRefreshError);
      }
    });

    it('classifies network error as transient (TokenRefreshError after retries)', async () => {
      const sm = makeManagerWithFetch(vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

      try {
        await sm.getValidAccessToken();
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(TokenRefreshError);
      }
    });
  });

  // ─── Retry with backoff ───

  describe('Retry with backoff', () => {
    it('retries transient errors up to maxRefreshRetries', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Error',
        json: () => Promise.resolve({ message: 'server error' }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        refreshThreshold: 300000,
        baseUrl: 'http://api',
        maxRefreshRetries: 2,
        retryBackoffBase: 100,
      });
      storage.set(makeTokens(10));

      // Capture the rejection handler BEFORE advancing timers
      const result = sm.getValidAccessToken().catch(e => e);
      // Advance through all backoff timers
      await vi.runAllTimersAsync();

      const error = await result;
      expect(error).toBeInstanceOf(TokenRefreshError);
      expect((error as TokenRefreshError).attempts).toBe(3); // initial + 2 retries
      // 1 initial + 2 retries = 3 fetch calls
      expect(fetchMock).toHaveBeenCalledTimes(3);
      sm.destroy();
    });

    it('does NOT retry fatal SessionExpiredError', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ message: 'Invalid refresh token' }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        refreshThreshold: 300000,
        baseUrl: 'http://api',
        maxRefreshRetries: 3,
        retryBackoffBase: 100,
      });
      storage.set(makeTokens(10));

      await expect(sm.getValidAccessToken()).rejects.toThrow(SessionExpiredError);
      // Only 1 fetch — no retries for fatal errors
      expect(fetchMock).toHaveBeenCalledTimes(1);
      sm.destroy();
    });

    it('succeeds after transient failures', async () => {
      let callCount = 0;
      const fetchMock = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Error',
            json: () => Promise.resolve({ message: 'server error' }),
          });
        }
        // 3rd call succeeds
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              accessToken: 'new-access',
              refreshToken: 'new-refresh',
              expiresIn: 3600,
            }),
        });
      });
      vi.stubGlobal('fetch', fetchMock);

      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        refreshThreshold: 300000,
        baseUrl: 'http://api',
        maxRefreshRetries: 3,
        retryBackoffBase: 100,
      });
      storage.set(makeTokens(10));

      const promise = sm.getValidAccessToken();
      // Advance through backoff: 100ms, 200ms
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);

      const token = await promise;
      expect(token).toBe('new-access');
      expect(fetchMock).toHaveBeenCalledTimes(3);
      sm.destroy();
    });
  });

  // ─── Queue + timeout ───

  describe('Queue and timeout', () => {
    it('queues concurrent calls and resolves all with same token', async () => {
      let resolveRefresh: () => void;
      const refreshPromise = new Promise<void>(r => {
        resolveRefresh = r;
      });

      const fetchMock = vi.fn().mockImplementation(async () => {
        await refreshPromise;
        return {
          ok: true,
          json: () =>
            Promise.resolve({
              accessToken: 'shared-token',
              refreshToken: 'r',
              expiresIn: 3600,
            }),
        };
      });
      vi.stubGlobal('fetch', fetchMock);

      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        refreshThreshold: 300000,
        baseUrl: 'http://api',
        maxRefreshRetries: 0,
        refreshQueueTimeout: 5000,
      });
      storage.set(makeTokens(10));

      // Fire 3 concurrent calls
      const p1 = sm.getValidAccessToken();
      const p2 = sm.getValidAccessToken();
      const p3 = sm.getValidAccessToken();

      // Only 1 fetch should have been called
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Resolve the refresh
      resolveRefresh!();

      const [t1, t2, t3] = await Promise.all([p1, p2, p3]);
      expect(t1).toBe('shared-token');
      expect(t2).toBe('shared-token');
      expect(t3).toBe('shared-token');
    });

    it('rejects queued call with TokenRefreshTimeoutError on timeout', async () => {
      // Fetch that never resolves
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));

      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        refreshThreshold: 300000,
        baseUrl: 'http://api',
        maxRefreshRetries: 0,
        refreshQueueTimeout: 500,
      });
      storage.set(makeTokens(10));

      // First call starts the refresh (won't resolve — fetch hangs)
      void sm.getValidAccessToken().catch(() => {}); // initiator, will hang
      // Second call queues — capture rejection BEFORE advancing timers
      const p2Result = sm.getValidAccessToken().catch(e => e);

      // Advance past queue timeout
      await vi.advanceTimersByTimeAsync(600);

      // p2 should timeout
      const p2Error = await p2Result;
      expect(p2Error).toBeInstanceOf(TokenRefreshTimeoutError);

      // Clean up timers
      sm.destroy();
    });

    it('rejects all queued on fatal error', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ message: 'Invalid refresh token' }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        refreshThreshold: 300000,
        baseUrl: 'http://api',
        maxRefreshRetries: 0,
        refreshQueueTimeout: 5000,
      });
      storage.set(makeTokens(10));

      const p1 = sm.getValidAccessToken();
      const p2 = sm.getValidAccessToken();

      await expect(p1).rejects.toThrow(SessionExpiredError);
      await expect(p2).rejects.toThrow(SessionExpiredError);
    });
  });

  // ─── clearSession rejects queue ───

  describe('clearSession', () => {
    it('rejects pending queue entries', async () => {
      // Fetch that never resolves
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));

      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        refreshThreshold: 300000,
        baseUrl: 'http://api',
        maxRefreshRetries: 0,
        refreshQueueTimeout: 30000,
      });
      storage.set(makeTokens(10));

      // Start refresh + queue a second call
      void sm.getValidAccessToken().catch(() => {}); // ignore - initiator
      const p2 = sm.getValidAccessToken();

      // Clear session while refresh is pending
      sm.clearSession();

      await expect(p2).rejects.toThrow(SessionExpiredError);
      expect(sm.getTokens()).toBeNull();
    });
  });

  // ─── onSessionExpired callback ───

  describe('onSessionExpired callback', () => {
    it('calls onSessionExpired on fatal refresh error', async () => {
      const onExpired = vi.fn();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: () => Promise.resolve({ message: 'Refresh token expired' }),
        })
      );

      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        refreshThreshold: 300000,
        baseUrl: 'http://api',
        maxRefreshRetries: 0,
        onSessionExpired: onExpired,
      });
      storage.set(makeTokens(10));

      await sm.getValidAccessToken().catch(() => {});

      expect(onExpired).toHaveBeenCalledOnce();
      expect(onExpired.mock.calls[0][0]).toBeInstanceOf(SessionExpiredError);
      expect(onExpired.mock.calls[0][0].reason).toBe('token_expired');
    });

    it('falls back to onRefreshFailed when onSessionExpired not set', async () => {
      const onRefreshFailed = vi.fn();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: () => Promise.resolve({ message: 'Invalid refresh token' }),
        })
      );

      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        refreshThreshold: 300000,
        baseUrl: 'http://api',
        maxRefreshRetries: 0,
        onRefreshFailed,
      });
      storage.set(makeTokens(10));

      await sm.getValidAccessToken().catch(() => {});

      expect(onRefreshFailed).toHaveBeenCalledOnce();
    });
  });

  // ─── getAuthHeaders backward compat ───

  describe('getAuthHeaders backward compatibility', () => {
    it('returns auth headers for valid token', async () => {
      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: false,
      });
      storage.set(makeTokens(3600));

      const headers = await sm.getAuthHeaders();
      expect(headers).toEqual({ Authorization: 'Bearer access-123' });
    });

    it('returns empty headers on expired token without refresh', async () => {
      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        refreshThreshold: 300000,
      });
      storage.set({ accessToken: 'a', expiresAt: Date.now() - 1000 });

      const headers = await sm.getAuthHeaders();
      expect(headers).toEqual({});
    });
  });

  // ─── Proactive refresh timer ───

  describe('Proactive refresh timer', () => {
    it('schedules proactive refresh before expiry', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            accessToken: 'refreshed',
            refreshToken: 'r2',
            expiresIn: 3600,
          }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        proactiveRefreshMargin: 30000, // 30s before expiry
        baseUrl: 'http://api',
        maxRefreshRetries: 0,
      });
      // Token expires in 60s, proactive at 30s before = fires at 30s
      storage.set(makeTokens(60));
      // Re-trigger timer scheduling by setting tokens
      sm.setTokens(makeTokens(60));

      expect(fetchMock).not.toHaveBeenCalled();

      // Advance to just before proactive fire (29s)
      await vi.advanceTimersByTimeAsync(29000);
      expect(fetchMock).not.toHaveBeenCalled();

      // Advance past proactive point (31s total)
      await vi.advanceTimersByTimeAsync(2000);

      // Give the async refresh a tick to resolve
      await vi.advanceTimersByTimeAsync(10);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('cancels proactive timer on clearSession', () => {
      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        proactiveRefreshMargin: 30000,
        baseUrl: 'http://api',
      });
      storage.set(makeTokens(60));
      sm.setTokens(makeTokens(60));

      // Spy on fetch to verify timer was cancelled
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      sm.clearSession();

      // Advance well past when the timer would fire
      vi.advanceTimersByTime(120000);

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  // ─── backgroundRefresh + getValidAccessToken coordination ───

  describe('backgroundRefresh shares refreshPromise with getValidAccessToken', () => {
    it('only makes 1 fetch when setTokens triggers immediate backgroundRefresh and concurrent getValidAccessToken calls follow', async () => {
      let resolveRefresh: () => void;
      const refreshGate = new Promise<void>(r => {
        resolveRefresh = r;
      });

      const fetchMock = vi.fn().mockImplementation(async () => {
        await refreshGate;
        return {
          ok: true,
          json: () =>
            Promise.resolve({
              accessToken: 'new-access',
              refreshToken: 'new-refresh',
              expiresIn: 3600,
            }),
        };
      });
      vi.stubGlobal('fetch', fetchMock);

      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        proactiveRefreshMargin: 60000,
        refreshThreshold: 60000,
        baseUrl: 'http://api',
        maxRefreshRetries: 0,
        refreshQueueTimeout: 5000,
      });

      // Set tokens that are already expired → scheduleProactiveRefresh → backgroundRefresh
      sm.setTokens({
        accessToken: 'old-access',
        refreshToken: 'old-refresh',
        expiresAt: Date.now() - 5000,
      });

      // backgroundRefresh started → 1 fetch call in progress
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Fire 5 concurrent getValidAccessToken calls — they should all queue
      const p1 = sm.getValidAccessToken();
      const p2 = sm.getValidAccessToken();
      const p3 = sm.getValidAccessToken();
      const p4 = sm.getValidAccessToken();
      const p5 = sm.getValidAccessToken();

      // Still only 1 fetch — no duplicates
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Let the refresh resolve
      resolveRefresh!();

      const results = await Promise.all([p1, p2, p3, p4, p5]);

      // All 5 should receive the same new token
      expect(results).toEqual([
        'new-access',
        'new-access',
        'new-access',
        'new-access',
        'new-access',
      ]);

      // Confirm: exactly 1 fetch call total
      expect(fetchMock).toHaveBeenCalledTimes(1);
      sm.destroy();
    });

    it('backgroundRefresh skips when getValidAccessToken already set refreshPromise', async () => {
      let resolveRefresh: () => void;
      const refreshGate = new Promise<void>(r => {
        resolveRefresh = r;
      });

      const fetchMock = vi.fn().mockImplementation(async () => {
        await refreshGate;
        return {
          ok: true,
          json: () =>
            Promise.resolve({
              accessToken: 'new-access',
              refreshToken: 'new-refresh',
              expiresIn: 3600,
            }),
        };
      });
      vi.stubGlobal('fetch', fetchMock);

      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        proactiveRefreshMargin: 60000,
        refreshThreshold: 300000,
        baseUrl: 'http://api',
        maxRefreshRetries: 0,
        refreshQueueTimeout: 5000,
      });

      // Set valid but near-expiry tokens (within refreshThreshold)
      storage.set(makeTokens(10));

      // Start refresh via getValidAccessToken (sets refreshPromise)
      const p1 = sm.getValidAccessToken();
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Now force setTokens with expired value — this triggers
      // scheduleProactiveRefresh → backgroundRefresh, but it should SKIP
      // because refreshPromise is already set
      sm.setTokens({
        accessToken: 'access-123',
        refreshToken: 'refresh-abc',
        expiresAt: Date.now() - 5000,
      });

      // Still only 1 fetch — backgroundRefresh was skipped
      expect(fetchMock).toHaveBeenCalledTimes(1);

      resolveRefresh!();
      const token = await p1;
      expect(token).toBe('new-access');
      sm.destroy();
    });

    it('queued getValidAccessToken calls receive the token from backgroundRefresh', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            accessToken: 'bg-refreshed',
            refreshToken: 'bg-refresh-token',
            expiresIn: 3600,
          }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        proactiveRefreshMargin: 60000,
        refreshThreshold: 60000,
        baseUrl: 'http://api',
        maxRefreshRetries: 0,
        refreshQueueTimeout: 5000,
      });

      // Trigger immediate backgroundRefresh
      sm.setTokens({
        accessToken: 'old',
        refreshToken: 'old-r',
        expiresAt: Date.now() - 1000,
      });

      // Queue calls
      const p1 = sm.getValidAccessToken();
      const p2 = sm.getValidAccessToken();

      // Let the fetch resolve
      await vi.advanceTimersByTimeAsync(10);

      const [t1, t2] = await Promise.all([p1, p2]);
      expect(t1).toBe('bg-refreshed');
      expect(t2).toBe('bg-refreshed');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      sm.destroy();
    });

    it('backgroundRefresh error rejects all queued getValidAccessToken calls', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ message: 'Refresh token expired' }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        proactiveRefreshMargin: 60000,
        refreshThreshold: 60000,
        baseUrl: 'http://api',
        maxRefreshRetries: 0,
        refreshQueueTimeout: 5000,
      });

      // Trigger immediate backgroundRefresh (will fail)
      sm.setTokens({
        accessToken: 'old',
        refreshToken: 'old-r',
        expiresAt: Date.now() - 1000,
      });

      // Queue calls that should be rejected
      const p1 = sm.getValidAccessToken().catch(e => e);
      const p2 = sm.getValidAccessToken().catch(e => e);

      await vi.advanceTimersByTimeAsync(10);

      const [e1, e2] = await Promise.all([p1, p2]);
      expect(e1).toBeInstanceOf(SessionExpiredError);
      expect(e2).toBeInstanceOf(SessionExpiredError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  // ─── JWT exp fallback ───

  describe('JWT exp fallback when expiresAt is missing', () => {
    it('getTokens() derives expiresAt from JWT exp when not stored', () => {
      const expSec = Math.floor(Date.now() / 1000) + 3600; // 1hr from now
      storage.set({
        accessToken: makeJwt(expSec),
        refreshToken: 'rt',
        // no expiresAt
      });

      const sm = new SessionManager({ tokenStorage: storage, autoRefresh: false });
      const tokens = sm.getTokens();

      expect(tokens).not.toBeNull();
      expect(tokens!.expiresAt).toBe(expSec * 1000);
    });

    it('isTokenExpired() returns true for expired JWT when expiresAt not stored', () => {
      const expSec = Math.floor(Date.now() / 1000) - 60; // expired 1 min ago
      storage.set({
        accessToken: makeJwt(expSec),
        refreshToken: 'rt',
      });

      const sm = new SessionManager({ tokenStorage: storage, autoRefresh: false });
      expect(sm.isTokenExpired()).toBe(true);
    });

    it('isTokenExpired() returns false for valid JWT when expiresAt not stored', () => {
      const expSec = Math.floor(Date.now() / 1000) + 3600;
      storage.set({
        accessToken: makeJwt(expSec),
        refreshToken: 'rt',
      });

      const sm = new SessionManager({ tokenStorage: storage, autoRefresh: false });
      expect(sm.isTokenExpired()).toBe(false);
    });

    it('hasValidSession() returns false when JWT is expired and expiresAt not stored', () => {
      const expSec = Math.floor(Date.now() / 1000) - 60;
      storage.set({
        accessToken: makeJwt(expSec),
        refreshToken: 'rt',
      });

      const sm = new SessionManager({ tokenStorage: storage, autoRefresh: false });
      expect(sm.hasValidSession()).toBe(false);
    });

    it('setTokens() persists expiresAt derived from JWT exp when neither expiresAt nor expiresIn provided', () => {
      const expSec = Math.floor(Date.now() / 1000) + 7200;
      const sm = new SessionManager({ tokenStorage: storage, autoRefresh: false });

      sm.setTokens({ accessToken: makeJwt(expSec), refreshToken: 'rt' });

      // Read raw stored data — expiresAt should be persisted
      const raw = storage.get();
      expect(raw.expiresAt).toBe(expSec * 1000);
    });

    it('triggers backgroundRefresh on init when JWT is expired and expiresAt not stored', async () => {
      const expSec = Math.floor(Date.now() / 1000) - 60; // expired

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            accessToken: 'new-access',
            refreshToken: 'new-refresh',
            expiresIn: 3600,
          }),
      });
      vi.stubGlobal('fetch', fetchMock);

      // Store tokens WITHOUT expiresAt — simulates legacy/external storage
      storage.set({
        accessToken: makeJwt(expSec),
        refreshToken: 'rt',
      });

      // Constructor calls scheduleProactiveRefresh → backgroundRefresh
      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        proactiveRefreshMargin: 60000,
        baseUrl: 'http://api',
        maxRefreshRetries: 0,
      });

      // backgroundRefresh should have been triggered
      await vi.advanceTimersByTimeAsync(10);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      sm.destroy();
    });

    it('getValidAccessToken() refreshes when JWT is expired and expiresAt not stored', async () => {
      const expSec = Math.floor(Date.now() / 1000) - 60; // expired

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            accessToken: 'refreshed-token',
            refreshToken: 'new-rt',
            expiresIn: 3600,
          }),
      });
      vi.stubGlobal('fetch', fetchMock);

      storage.set({
        accessToken: makeJwt(expSec),
        refreshToken: 'rt',
      });

      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        refreshThreshold: 300000,
        baseUrl: 'http://api',
        maxRefreshRetries: 0,
      });

      const token = await sm.getValidAccessToken();
      expect(token).toBe('refreshed-token');
      sm.destroy();
    });
  });

  // ─── destroy ───

  describe('destroy', () => {
    it('getInstance returns same instance — prevents double-refresh on React double-mount', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            accessToken: 'new-access',
            refreshToken: 'new-refresh',
            expiresIn: 3600,
          }),
      });
      vi.stubGlobal('fetch', fetchMock);

      // Pre-populate storage with expired tokens
      storage.set({
        accessToken: 'old',
        refreshToken: 'old-r',
        expiresAt: Date.now() - 5000,
      });

      const config = {
        tokenStorage: storage,
        autoRefresh: true,
        proactiveRefreshMargin: 60000,
        baseUrl: 'http://api',
        maxRefreshRetries: 0,
      };

      // Simulate React Strict Mode: getInstance called twice with same config
      const sm1 = SessionManager.getInstance(config);
      const sm2 = SessionManager.getInstance(config);

      // Same instance
      expect(sm1).toBe(sm2);

      // Only 1 backgroundRefresh started (from the first getInstance / constructor)
      await vi.advanceTimersByTimeAsync(10);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      sm1.destroy();
    });

    it('rejects pending queue and prevents future background refresh', async () => {
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));

      const sm = new SessionManager({
        tokenStorage: storage,
        autoRefresh: true,
        refreshThreshold: 300000,
        baseUrl: 'http://api',
        refreshQueueTimeout: 30000,
      });
      storage.set(makeTokens(10));

      void sm.getValidAccessToken().catch(() => {}); // initiator
      const p2 = sm.getValidAccessToken();

      sm.destroy();

      await expect(p2).rejects.toThrow(SessionExpiredError);
    });
  });
});
