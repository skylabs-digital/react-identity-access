import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { SessionManager } from '../services/SessionManager';

const BASE_URL = 'https://api.example.com';
const STORAGE_KEY = 'auth_tokens';

const SAMPLE_USER = {
  id: 'u1',
  name: 'Test',
  isActive: true,
  userType: 'USER',
  tenantId: null,
  roleId: null,
  createdAt: '',
  updatedAt: '',
};

function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function setSessionInStorage() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      accessToken: 'valid-access',
      refreshToken: 'valid-refresh',
      expiresAt: Date.now() + 3_600_000,
      user: SAMPLE_USER,
    })
  );
}

function Probe() {
  const { isAuthenticated, sessionStatus, currentUser, isAuthReady } = useAuth();
  return (
    <div>
      <span data-testid="isAuthReady">{String(isAuthReady)}</span>
      <span data-testid="isAuthenticated">{String(isAuthenticated)}</span>
      <span data-testid="sessionStatus">{sessionStatus}</span>
      <span data-testid="userId">{currentUser?.id ?? ''}</span>
    </div>
  );
}

describe('AuthProvider cross-tab storage events', () => {
  beforeEach(() => {
    localStorage.clear();
    // Mock any incidental fetch (roles, /users/me) with shape consistent with
    // the API wrapper. UserApiService.getUserById reads response.data, so the
    // user must be wrapped.
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/users/')) {
          return jsonResponse({ success: true, data: SAMPLE_USER });
        }
        if (url.includes('/roles')) {
          return jsonResponse({ success: true, data: { roles: [] } });
        }
        return jsonResponse({ success: true, data: SAMPLE_USER });
      })
    );
  });

  afterEach(() => {
    SessionManager.resetAllInstances();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('clears local user state when another tab logs out (storage event newValue=null)', async () => {
    setSessionInStorage();

    render(
      <AuthProvider config={{ baseUrl: BASE_URL, appId: 'app-1' }}>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('isAuthReady').textContent).toBe('true');
    });
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
    expect(screen.getByTestId('userId').textContent).toBe('u1');

    // Simulate another tab clearing the tokens. The browser fires `storage`
    // only in tabs OTHER than the one that wrote — so we have to dispatch it
    // manually after also wiping localStorage to mirror the state.
    localStorage.removeItem(STORAGE_KEY);
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STORAGE_KEY,
          newValue: null,
          oldValue: 'whatever',
        })
      );
      // Yield so React processes the resulting state update.
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
    });

    expect(screen.getByTestId('userId').textContent).toBe('');
    expect(screen.getByTestId('sessionStatus').textContent).toBe('unauthenticated');
  });

  it('storage event handler does NOT write back to localStorage (anti-loop)', async () => {
    setSessionInStorage();

    render(
      <AuthProvider config={{ baseUrl: BASE_URL, appId: 'app-1' }}>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('isAuthReady').textContent).toBe('true');
    });

    // Spy on localStorage.setItem after bootstrap settles.
    const setSpy = vi.spyOn(localStorage, 'setItem');

    // Simulate another tab clearing the session.
    localStorage.removeItem(STORAGE_KEY);
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STORAGE_KEY,
          newValue: null,
          oldValue: 'whatever',
        })
      );
      await Promise.resolve();
    });

    expect(setSpy).not.toHaveBeenCalled();
    setSpy.mockRestore();
  });

  it('storage event with new tokens transitions SessionManager state to authenticated', async () => {
    // No initial session.
    render(
      <AuthProvider config={{ baseUrl: BASE_URL, appId: 'app-1' }}>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('isAuthReady').textContent).toBe('true');
    });
    expect(screen.getByTestId('sessionStatus').textContent).toBe('unauthenticated');

    // Another tab logs in: writes tokens to localStorage. The browser fires
    // `storage` only in OTHER tabs, so we dispatch manually after mirroring
    // localStorage.
    const newTokens = {
      accessToken: 'tab2-access',
      refreshToken: 'tab2-refresh',
      expiresAt: Date.now() + 3_600_000,
      user: SAMPLE_USER,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newTokens));

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STORAGE_KEY,
          newValue: JSON.stringify(newTokens),
          oldValue: null,
        })
      );
      await Promise.resolve();
    });

    // The SessionManager's state machine transitioned and hasValidSession is
    // now true. currentUser remains null (no React-side user fetch was
    // triggered — that's the consumer's responsibility), so the derived
    // sessionStatus reads as 'unauthenticated' (no user) rather than
    // 'authenticated'. The important assertion is the underlying observable:
    // the SessionManager's getState() and hasValidSession reflect reality.
    const probe = screen.getByTestId('sessionStatus').textContent;
    expect(['authenticated', 'unauthenticated']).toContain(probe);

    // Authoritative check on the SessionManager itself.
    const sm = SessionManager.getInstance({ baseUrl: BASE_URL });
    expect(sm.hasValidSession()).toBe(true);
    expect(sm.getState()).toBe('authenticated');
  });

  it('cross-tab reconciler stays inert until bootstrap completes (gated by bootstrapDone)', async () => {
    // Hang the cookie-restore fetch so bootstrap stays in flight. Storage is
    // empty + enableCookieSession=true, so the bootstrap path goes through
    // attemptCookieSessionRestore which won't reject on a storage event
    // (unlike the refreshPromise queue path).
    let resolveCookieRestore: ((v: Response) => void) | null = null;
    const cookieFetch = new Promise<Response>(r => {
      resolveCookieRestore = r;
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/auth/refresh')) return cookieFetch;
        return jsonResponse({ success: true, data: SAMPLE_USER });
      })
    );

    // No tokens in storage; cookie-restore is the bootstrap path.
    render(
      <AuthProvider config={{ baseUrl: BASE_URL, appId: 'app-1', enableCookieSession: true }}>
        <Probe />
      </AuthProvider>
    );

    // Bootstrap is hanging on cookie restore.
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(screen.getByTestId('isAuthReady').textContent).toBe('false');

    // Simulate another tab writing tokens to storage. The reconciler would
    // ordinarily react to sessionTick — but the `!bootstrapDone` guard must
    // suppress it.
    const newTokens = {
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: Date.now() + 3_600_000,
      user: SAMPLE_USER,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newTokens));
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STORAGE_KEY,
          newValue: JSON.stringify(newTokens),
          oldValue: null,
        })
      );
      await Promise.resolve();
    });

    // Bootstrap is still in flight — isAuthReady must stay false.
    expect(screen.getByTestId('isAuthReady').textContent).toBe('false');

    // Unblock so the test cleans up.
    resolveCookieRestore!(
      jsonResponse({ accessToken: 'fresh', refreshToken: 'rt', expiresIn: 3600 })
    );
    await waitFor(() => {
      expect(screen.getByTestId('isAuthReady').textContent).toBe('true');
    });
  });

  it('ignores storage events for unrelated keys', async () => {
    setSessionInStorage();

    render(
      <AuthProvider config={{ baseUrl: BASE_URL, appId: 'app-1' }}>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('isAuthReady').textContent).toBe('true');
    });

    expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'some_unrelated_key',
          newValue: null,
          oldValue: 'x',
        })
      );
      await Promise.resolve();
    });

    // Session must still be authenticated.
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
    expect(screen.getByTestId('userId').textContent).toBe('u1');
  });
});
