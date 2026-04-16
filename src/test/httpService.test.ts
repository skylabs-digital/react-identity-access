import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpService } from '../services/HttpService';
import type { SessionManager } from '../services/SessionManager';

// Minimal SessionManager stub exposing only what HttpService calls.
function createSessionManagerStub(token = 'access-token'): SessionManager {
  const stub = {
    getValidAccessToken: vi.fn().mockResolvedValue(token),
  } as unknown as SessionManager;
  return stub;
}

function mockFetchOnce(init: {
  status?: number;
  statusText?: string;
  contentType?: string | null;
  body?: unknown;
  delay?: number;
}) {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  const contentType = init.contentType === undefined ? 'application/json' : init.contentType;
  const response = {
    ok,
    status,
    statusText: init.statusText ?? 'OK',
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? (contentType ?? null) : null),
    },
    json: async () => init.body,
  } as unknown as Response;

  const fetchMock = vi.fn().mockImplementation(async () => {
    if (init.delay) {
      await new Promise(resolve => setTimeout(resolve, init.delay));
    }
    return response;
  });
  globalThis.fetch = fetchMock as typeof fetch;
  return fetchMock;
}

describe('HttpService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('strips trailing slash from baseUrl', () => {
      const http = new HttpService('https://api.example.com/');
      expect(http.getBaseUrl()).toBe('https://api.example.com');
    });

    it('preserves baseUrl without trailing slash', () => {
      const http = new HttpService('https://api.example.com');
      expect(http.getBaseUrl()).toBe('https://api.example.com');
    });
  });

  describe('URL construction', () => {
    it('joins endpoint with leading slash', async () => {
      const fetchMock = mockFetchOnce({ body: { ok: true } });
      const http = new HttpService('https://api.example.com');
      await http.get('/users');
      expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/users', expect.any(Object));
    });

    it('adds leading slash when endpoint lacks it', async () => {
      const fetchMock = mockFetchOnce({ body: { ok: true } });
      const http = new HttpService('https://api.example.com');
      await http.get('users');
      expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/users', expect.any(Object));
    });
  });

  describe('auth header injection', () => {
    it('adds Authorization header from SessionManager.getValidAccessToken()', async () => {
      const fetchMock = mockFetchOnce({ body: {} });
      const http = new HttpService('https://api.example.com');
      const sm = createSessionManagerStub('abc123');
      http.setSessionManager(sm);

      await http.get('/me');

      const callArgs = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect((callArgs.headers as Record<string, string>).Authorization).toBe('Bearer abc123');
      expect(sm.getValidAccessToken).toHaveBeenCalledTimes(1);
    });

    it('skips auth header when skipAuth option is true', async () => {
      const fetchMock = mockFetchOnce({ body: {} });
      const http = new HttpService('https://api.example.com');
      const sm = createSessionManagerStub();
      http.setSessionManager(sm);

      await http.get('/public', { skipAuth: true });

      const callArgs = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect((callArgs.headers as Record<string, string>).Authorization).toBeUndefined();
      expect(sm.getValidAccessToken).not.toHaveBeenCalled();
    });

    it('skips auth header when SessionManager is not set', async () => {
      const fetchMock = mockFetchOnce({ body: {} });
      const http = new HttpService('https://api.example.com');

      await http.get('/public');

      const callArgs = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect((callArgs.headers as Record<string, string>).Authorization).toBeUndefined();
    });

    it('propagates errors thrown by SessionManager.getValidAccessToken', async () => {
      mockFetchOnce({ body: {} });
      const http = new HttpService('https://api.example.com');
      const sm = {
        getValidAccessToken: vi.fn().mockRejectedValue(new Error('SessionExpired')),
      } as unknown as SessionManager;
      http.setSessionManager(sm);

      await expect(http.get('/me')).rejects.toThrow('SessionExpired');
    });
  });

  describe('custom headers', () => {
    it('merges custom headers with Content-Type default', async () => {
      const fetchMock = mockFetchOnce({ body: {} });
      const http = new HttpService('https://api.example.com');

      await http.get('/x', { headers: { 'X-Trace-Id': 'trace-1' } });

      const callArgs = fetchMock.mock.calls[0]?.[1] as RequestInit;
      const headers = callArgs.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['X-Trace-Id']).toBe('trace-1');
    });
  });

  describe('HTTP verbs', () => {
    it('GET does not send a body', async () => {
      const fetchMock = mockFetchOnce({ body: {} });
      const http = new HttpService('https://api.example.com');

      await http.get('/items');

      const callArgs = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(callArgs.method).toBe('GET');
      expect(callArgs.body).toBeUndefined();
    });

    it('POST serializes data as JSON', async () => {
      const fetchMock = mockFetchOnce({ body: { id: 1 } });
      const http = new HttpService('https://api.example.com');

      await http.post('/items', { name: 'foo' });

      const callArgs = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(callArgs.method).toBe('POST');
      expect(callArgs.body).toBe('{"name":"foo"}');
    });

    it('PUT serializes data as JSON', async () => {
      const fetchMock = mockFetchOnce({ body: { id: 1 } });
      const http = new HttpService('https://api.example.com');

      await http.put('/items/1', { name: 'bar' });

      const callArgs = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(callArgs.method).toBe('PUT');
      expect(callArgs.body).toBe('{"name":"bar"}');
    });

    it('DELETE does not send a body', async () => {
      const fetchMock = mockFetchOnce({ body: {} });
      const http = new HttpService('https://api.example.com');

      await http.delete('/items/1');

      const callArgs = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(callArgs.method).toBe('DELETE');
      expect(callArgs.body).toBeUndefined();
    });
  });

  describe('response handling', () => {
    it('returns parsed JSON on 2xx with application/json content-type', async () => {
      mockFetchOnce({ body: { id: 42 } });
      const http = new HttpService('https://api.example.com');

      const result = await http.get<{ id: number }>('/x');
      expect(result).toEqual({ id: 42 });
    });

    it('returns empty object when content-type is not JSON', async () => {
      mockFetchOnce({ contentType: 'text/plain', body: 'ignored' });
      const http = new HttpService('https://api.example.com');

      const result = await http.get('/x');
      expect(result).toEqual({});
    });

    it('returns empty object when content-type header is missing', async () => {
      mockFetchOnce({ contentType: null, body: 'ignored' });
      const http = new HttpService('https://api.example.com');

      const result = await http.get('/x');
      expect(result).toEqual({});
    });

    it('throws on non-2xx with HTTP status code in error message', async () => {
      mockFetchOnce({ status: 500, statusText: 'Internal Server Error', body: {} });
      const http = new HttpService('https://api.example.com');

      await expect(http.get('/x')).rejects.toThrow('HTTP 500: Internal Server Error');
    });

    it('throws on 404 with Not Found', async () => {
      mockFetchOnce({ status: 404, statusText: 'Not Found', body: {} });
      const http = new HttpService('https://api.example.com');

      await expect(http.get('/missing')).rejects.toThrow('HTTP 404');
    });
  });

  describe('timeout handling', () => {
    it('rejects with timeout message when request exceeds timeout', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      globalThis.fetch = vi.fn().mockRejectedValue(abortError) as typeof fetch;

      const http = new HttpService('https://api.example.com', 5000);
      await expect(http.get('/slow')).rejects.toThrow('Request timeout after 5000ms');
    });

    it('uses per-request timeout override when provided', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      globalThis.fetch = vi.fn().mockRejectedValue(abortError) as typeof fetch;

      const http = new HttpService('https://api.example.com', 10000);
      await expect(http.get('/slow', { timeout: 100 })).rejects.toThrow(
        'Request timeout after 100ms'
      );
    });
  });

  describe('network error propagation', () => {
    it('rethrows non-abort errors unchanged', async () => {
      const networkError = new Error('Failed to fetch');
      globalThis.fetch = vi.fn().mockRejectedValue(networkError) as typeof fetch;

      const http = new HttpService('https://api.example.com');
      await expect(http.get('/x')).rejects.toThrow('Failed to fetch');
    });
  });

  describe('401 retry with forceRefresh', () => {
    // Build a Response-like object for the queued fetch responses below
    function makeResponse(init: {
      status: number;
      statusText?: string;
      body?: unknown;
      contentType?: string | null;
    }): Response {
      const status = init.status;
      const ok = status >= 200 && status < 300;
      const contentType = init.contentType === undefined ? 'application/json' : init.contentType;
      return {
        ok,
        status,
        statusText: init.statusText ?? (ok ? 'OK' : 'Unauthorized'),
        headers: {
          get: (name: string) =>
            name.toLowerCase() === 'content-type' ? (contentType ?? null) : null,
        },
        json: async () => init.body,
        text: async () => JSON.stringify(init.body ?? ''),
      } as unknown as Response;
    }

    function queueFetchResponses(responses: Response[]): ReturnType<typeof vi.fn> {
      const fetchMock = vi.fn();
      for (const r of responses) fetchMock.mockResolvedValueOnce(r);
      globalThis.fetch = fetchMock as typeof fetch;
      return fetchMock;
    }

    it('retries once after 401 via forceRefresh and returns success', async () => {
      const fetchMock = queueFetchResponses([
        makeResponse({ status: 401 }),
        makeResponse({ status: 200, body: { ok: true } }),
      ]);

      const sm = {
        getValidAccessToken: vi
          .fn()
          .mockResolvedValueOnce('old-token')
          .mockResolvedValueOnce('new-token'),
        forceRefresh: vi.fn().mockResolvedValue('new-token'),
      } as unknown as SessionManager;

      const http = new HttpService('https://api.example.com');
      http.setSessionManager(sm);

      const result = await http.get<{ ok: boolean }>('/me');

      expect(result).toEqual({ ok: true });
      expect(sm.forceRefresh).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      // Second call carries the refreshed bearer token
      const secondCallHeaders = (fetchMock.mock.calls[1][1] as RequestInit).headers as Record<
        string,
        string
      >;
      expect(secondCallHeaders.Authorization).toBe('Bearer new-token');
    });

    it('propagates error thrown by forceRefresh (e.g. SessionExpiredError) instead of the 401', async () => {
      const fetchMock = queueFetchResponses([makeResponse({ status: 401 })]);

      const sessionErr = new Error('SessionExpired');
      sessionErr.name = 'SessionExpiredError';
      const sm = {
        getValidAccessToken: vi.fn().mockResolvedValue('old-token'),
        forceRefresh: vi.fn().mockRejectedValue(sessionErr),
      } as unknown as SessionManager;

      const http = new HttpService('https://api.example.com');
      http.setSessionManager(sm);

      await expect(http.get('/me')).rejects.toThrow('SessionExpired');
      expect(sm.forceRefresh).toHaveBeenCalledTimes(1);
      // Only the first attempt — no retry after forceRefresh failed
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('propagates HTTP 401 on second 401 (no infinite loop)', async () => {
      const fetchMock = queueFetchResponses([
        makeResponse({ status: 401 }),
        makeResponse({ status: 401, statusText: 'Unauthorized' }),
      ]);

      const sm = {
        getValidAccessToken: vi.fn().mockResolvedValue('tok'),
        forceRefresh: vi.fn().mockResolvedValue('new-tok'),
      } as unknown as SessionManager;

      const http = new HttpService('https://api.example.com');
      http.setSessionManager(sm);

      await expect(http.get('/me')).rejects.toThrow('HTTP 401: Unauthorized');
      expect(sm.forceRefresh).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('does NOT retry when skipAuth is true — propagates 401', async () => {
      const fetchMock = queueFetchResponses([
        makeResponse({ status: 401, statusText: 'Unauthorized' }),
      ]);

      const sm = {
        getValidAccessToken: vi.fn(),
        forceRefresh: vi.fn(),
      } as unknown as SessionManager;

      const http = new HttpService('https://api.example.com');
      http.setSessionManager(sm);

      await expect(http.post('/auth/login', { email: 'a' }, { skipAuth: true })).rejects.toThrow(
        'HTTP 401'
      );
      expect(sm.forceRefresh).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does NOT retry when SessionManager is not configured — propagates 401', async () => {
      const fetchMock = queueFetchResponses([
        makeResponse({ status: 401, statusText: 'Unauthorized' }),
      ]);

      const http = new HttpService('https://api.example.com');

      await expect(http.get('/x')).rejects.toThrow('HTTP 401');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('two concurrent 401s share a single forceRefresh via SessionManager queue', async () => {
      // Both initial requests get 401, both retries succeed
      const fetchMock = queueFetchResponses([
        makeResponse({ status: 401 }),
        makeResponse({ status: 401 }),
        makeResponse({ status: 200, body: { who: 'a' } }),
        makeResponse({ status: 200, body: { who: 'b' } }),
      ]);

      // Simulate SessionManager.forceRefresh's queue dedup: multiple awaiters
      // of the same in-flight refresh resolve to the same token.
      let resolveForce: (token: string) => void;
      const forceGate = new Promise<string>(r => {
        resolveForce = r;
      });
      const forceRefresh = vi.fn().mockImplementation(() => forceGate);

      const sm = {
        getValidAccessToken: vi.fn().mockResolvedValue('old-token'),
        forceRefresh,
      } as unknown as SessionManager;

      const http = new HttpService('https://api.example.com');
      http.setSessionManager(sm);

      const p1 = http.get<{ who: string }>('/a');
      const p2 = http.get<{ who: string }>('/b');

      // Both 401s should be in-flight (or queued) before we resolve forceRefresh.
      // Flush microtasks so both requests reach the forceRefresh await.
      await Promise.resolve();
      await Promise.resolve();

      resolveForce!('new-token');

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toEqual({ who: 'a' });
      expect(r2).toEqual({ who: 'b' });

      // forceRefresh was called by each retry — but in the real SessionManager,
      // these share a single /auth/refresh via refreshPromise/queue. Here we
      // verify HttpService calls forceRefresh once per failing request (the
      // queue dedup lives in SessionManager, covered in sessionManager.test.ts).
      expect(forceRefresh).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });
  });
});
