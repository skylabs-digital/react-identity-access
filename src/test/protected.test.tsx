import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Protected } from '../components/Protected';
import { AuthProvider } from '../providers/AuthProvider';
import { SessionManager } from '../services/SessionManager';
import { UserType } from '../types/api';

// Build a fake JWT with a future `exp` so hasValidSession returns true.
function makeJwt(expSec: number) {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ userId: 'u1', exp: expSec }));
  return `${header}.${payload}.sig`;
}

function primeSession(opts: { userType?: UserType; permissions?: string[]; roles?: string[] }) {
  const accessToken = makeJwt(Math.floor(Date.now() / 1000) + 3600);
  const user = {
    id: 'u1',
    email: 'a@b.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    userType: opts.userType ?? UserType.USER,
    permissions: (opts.permissions ?? []).map(name => ({ name })),
    roles: (opts.roles ?? []).map(name => ({ name, permissions: [] })),
  };
  localStorage.setItem(
    'auth_tokens',
    JSON.stringify({
      accessToken,
      refreshToken: 'rt',
      expiresAt: Date.now() + 3_600_000,
      user,
    })
  );
}

function Harness({ children }: { children: React.ReactNode }) {
  return <AuthProvider config={{ baseUrl: 'https://api.example.com' }}>{children}</AuthProvider>;
}

describe('Protected component', () => {
  beforeEach(() => {
    localStorage.clear();
    // Stub fetch so backgroundRefresh doesn't hit the network
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'mocked',
        headers: { get: () => 'application/json' },
        json: async () => ({}),
      })
    );
  });

  afterEach(() => {
    SessionManager.resetAllInstances();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders fallback when there is no session', () => {
    render(
      <Harness>
        <Protected fallback={<div data-testid="fallback">denied</div>}>
          <div data-testid="content">secret</div>
        </Protected>
      </Harness>
    );
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('renders default fallback (Access Required) when no custom fallback is passed', () => {
    render(
      <Harness>
        <Protected>
          <div data-testid="content">secret</div>
        </Protected>
      </Harness>
    );
    expect(screen.getByText(/access required/i)).toBeInTheDocument();
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('renders children when user has a valid session (no permission requirements)', async () => {
    primeSession({ userType: UserType.USER });
    await act(async () => {
      render(
        <Harness>
          <Protected>
            <div data-testid="content">welcome</div>
          </Protected>
        </Harness>
      );
    });
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('shows insufficient-permissions fallback when user lacks required permissions', async () => {
    // No roleId → no role → no permissions → any requiredPermissions fails
    primeSession({ userType: UserType.USER });
    await act(async () => {
      render(
        <Harness>
          <Protected requiredPermissions={['admin:write']}>
            <div data-testid="content">admin</div>
          </Protected>
        </Harness>
      );
    });
    expect(screen.getByText(/insufficient permissions/i)).toBeInTheDocument();
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('blocks access when user does not meet minUserType', async () => {
    primeSession({ userType: UserType.USER });
    await act(async () => {
      render(
        <Harness>
          <Protected minUserType={UserType.SUPERUSER}>
            <div data-testid="content">superuser</div>
          </Protected>
        </Harness>
      );
    });
    expect(screen.getByText(/insufficient permissions/i)).toBeInTheDocument();
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('allows access when user meets minUserType', async () => {
    primeSession({ userType: UserType.SUPERUSER });
    await act(async () => {
      render(
        <Harness>
          <Protected minUserType={UserType.TENANT_ADMIN}>
            <div data-testid="content">allowed</div>
          </Protected>
        </Harness>
      );
    });
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});
