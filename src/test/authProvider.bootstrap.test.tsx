import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { SessionManager } from '../services/SessionManager';

const BASE_URL = 'https://api.example.com';

/**
 * Set up a URL-routed fetch mock. The handlers map runs in order: the first
 * pattern that matches the URL returns its response. Non-matching URLs fall
 * through to a permissive default (returns 500 with empty body) so unrelated
 * effects (e.g. roles fetch) don't hang the test.
 */
function mockFetchByUrl(
  handlers: Array<{
    match: (url: string) => boolean;
    response: () => Promise<Response> | Response;
  }>,
  fallback?: () => Promise<Response> | Response
) {
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    for (const h of handlers) {
      if (h.match(url)) return h.response();
    }
    return fallback
      ? fallback()
      : ({
          ok: false,
          status: 500,
          statusText: 'unmatched',
          headers: { get: () => 'application/json' },
          json: async () => ({}),
          text: async () => '',
        } as unknown as Response);
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

function jsonResponse(body: unknown, init: { status?: number; ok?: boolean } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: 'OK',
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

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

function seedExpiredAccessWithFreshRefresh(extra: Record<string, unknown> = {}) {
  localStorage.setItem(
    'auth_tokens',
    JSON.stringify({
      accessToken: 'expired-access',
      refreshToken: 'fresh-refresh',
      expiresAt: Date.now() - 5000,
      ...extra,
    })
  );
}

/** Probe component that records every render's reactive flags. */
function AuthProbe({
  onSnapshot,
}: {
  onSnapshot?: (snap: { isAuthReady: boolean; isAuthenticated: boolean }) => void;
}) {
  const auth = useAuth();
  if (onSnapshot) {
    onSnapshot({ isAuthReady: auth.isAuthReady, isAuthenticated: auth.isAuthenticated });
  }
  return (
    <div>
      <span data-testid="isAuthReady">{String(auth.isAuthReady)}</span>
      <span data-testid="isAuthenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="sessionStatus">{auth.sessionStatus}</span>
    </div>
  );
}

describe('AuthProvider bootstrap — anti "estado trunco"', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    SessionManager.resetAllInstances();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('NEVER exposes isAuthReady=true while isAuthenticated=false when a refresh could resolve the session', async () => {
    let resolveRefresh: ((v: Response) => void) | null = null;
    const refreshFetch = new Promise<Response>(r => {
      resolveRefresh = r;
    });

    mockFetchByUrl([
      {
        match: u => u.includes('/auth/refresh'),
        response: () => refreshFetch,
      },
      // Any other URL gets a generic empty user/role response.
      {
        match: () => true,
        response: () => jsonResponse(SAMPLE_USER),
      },
    ]);

    seedExpiredAccessWithFreshRefresh({ user: SAMPLE_USER });

    const snapshots: { isAuthReady: boolean; isAuthenticated: boolean }[] = [];

    render(
      <AuthProvider config={{ baseUrl: BASE_URL, appId: 'app-1' }}>
        <AuthProbe onSnapshot={s => snapshots.push(s)} />
      </AuthProvider>
    );

    // Let the bootstrap reach the fetch call.
    for (let i = 0; i < 5; i++) await Promise.resolve();

    // Pre-flip window: ALL snapshots so far MUST have isAuthReady=false (we
    // haven't released the refresh). Otherwise the consumer would observe
    // the "estado trunco" pair.
    const truncatedBefore = snapshots.find(s => s.isAuthReady && !s.isAuthenticated);
    expect(truncatedBefore).toBeUndefined();

    // Release the refresh with a successful response.
    resolveRefresh!(
      jsonResponse({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        expiresIn: 3600,
      })
    );

    await waitFor(() => {
      expect(screen.getByTestId('isAuthReady').textContent).toBe('true');
    });

    expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
    expect(screen.getByTestId('sessionStatus').textContent).toBe('authenticated');

    // Final invariant: no snapshot in the full history hit the trunco pair.
    const trunco = snapshots.find(s => s.isAuthReady && !s.isAuthenticated);
    expect(trunco).toBeUndefined();
  });

  it('expired access + valid refresh → authenticated after bootstrap', async () => {
    mockFetchByUrl([
      {
        match: u => u.includes('/auth/refresh'),
        response: () =>
          jsonResponse({
            accessToken: 'new-access',
            refreshToken: 'new-refresh',
            expiresIn: 3600,
          }),
      },
      {
        match: u => u.includes('/users/'),
        response: () => jsonResponse(SAMPLE_USER),
      },
      {
        match: () => true,
        response: () => jsonResponse({ roles: [] }),
      },
    ]);

    seedExpiredAccessWithFreshRefresh({ user: SAMPLE_USER });

    render(
      <AuthProvider config={{ baseUrl: BASE_URL, appId: 'app-1' }}>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('isAuthReady').textContent).toBe('true');
    });

    expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
    expect(screen.getByTestId('sessionStatus').textContent).toBe('authenticated');
  });

  it('expired access + 401 refresh → expired + onSessionExpired fired', async () => {
    mockFetchByUrl([
      {
        match: u => u.includes('/auth/refresh'),
        response: () => jsonResponse({ message: 'token invalid' }, { ok: false, status: 401 }),
      },
      {
        match: () => true,
        response: () => jsonResponse({ roles: [] }),
      },
    ]);

    seedExpiredAccessWithFreshRefresh();

    const onSessionExpired = vi.fn();

    render(
      <AuthProvider config={{ baseUrl: BASE_URL, appId: 'app-1', onSessionExpired }}>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('isAuthReady').textContent).toBe('true');
    });

    expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
    expect(screen.getByTestId('sessionStatus').textContent).toBe('expired');
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('expired access + malformed JSON refresh body → expired', async () => {
    mockFetchByUrl([
      {
        match: u => u.includes('/auth/refresh'),
        response: () =>
          ({
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: { get: () => 'application/json' },
            json: async () => {
              throw new SyntaxError('Unexpected token');
            },
            text: async () => '',
          }) as unknown as Response,
      },
      {
        match: () => true,
        response: () => jsonResponse({ roles: [] }),
      },
    ]);

    seedExpiredAccessWithFreshRefresh();

    // Pre-create the SessionManager singleton with minimal retries so the
    // bootstrap settles within the test timeout. AuthProvider's useMemo will
    // see this instance via getInstance().
    SessionManager.getInstance({
      baseUrl: BASE_URL,
      maxRefreshRetries: 0,
      retryBackoffBase: 1,
    });

    render(
      <AuthProvider config={{ baseUrl: BASE_URL, appId: 'app-1' }}>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('isAuthReady').textContent).toBe('true');
    });

    expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
    expect(screen.getByTestId('sessionStatus').textContent).toBe('expired');
  });

  it('StrictMode double-mount produces exactly one /auth/refresh fetch', async () => {
    const fn = mockFetchByUrl([
      {
        match: u => u.includes('/auth/refresh'),
        response: () =>
          jsonResponse({
            accessToken: 'new',
            refreshToken: 'new-r',
            expiresIn: 3600,
          }),
      },
      {
        match: () => true,
        response: () => jsonResponse(SAMPLE_USER),
      },
    ]);

    seedExpiredAccessWithFreshRefresh({ user: SAMPLE_USER });

    render(
      <StrictMode>
        <AuthProvider config={{ baseUrl: BASE_URL, appId: 'app-1' }}>
          <AuthProbe />
        </AuthProvider>
      </StrictMode>
    );

    await waitFor(() => {
      expect(screen.getByTestId('isAuthReady').textContent).toBe('true');
    });

    const refreshCalls = fn.mock.calls.filter(([url]) => String(url).includes('/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
  });

  it('sessionStatus is "unauthenticated" when no tokens exist after bootstrap', async () => {
    mockFetchByUrl([], () => jsonResponse({ roles: [] }, { ok: false, status: 500 }));

    render(
      <AuthProvider config={{ baseUrl: BASE_URL, appId: 'app-1' }}>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('isAuthReady').textContent).toBe('true');
    });

    expect(screen.getByTestId('sessionStatus').textContent).toBe('unauthenticated');
  });
});
