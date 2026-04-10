import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth, useAuthOptional } from '../providers/AuthProvider';
import { SessionManager } from '../services/SessionManager';
import { ConfigurationError } from '../errors/SessionErrors';

// Minimal stub that just reports auth readiness and the sessionManager baseUrl.
function AuthProbe() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="isAuthReady">{String(auth.isAuthReady)}</span>
      <span data-testid="isAuthenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="hasTenantContext">{String(auth.hasTenantContext)}</span>
    </div>
  );
}

function OptionalProbe() {
  const auth = useAuthOptional();
  return <div data-testid="optional">{auth ? 'present' : 'null'}</div>;
}

describe('AuthProvider', () => {
  beforeEach(() => {
    // Wipe localStorage to avoid session bleed between tests
    localStorage.clear();
    // Mock fetch so any background refresh attempts don't hit the network
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

  describe('Standalone mode (no AppProvider/TenantProvider)', () => {
    it('renders successfully when baseUrl is passed via AuthConfig', async () => {
      render(
        <AuthProvider config={{ baseUrl: 'https://api.example.com', appId: 'app-1' }}>
          <AuthProbe />
        </AuthProvider>
      );

      // isAuthReady settles once init and session restore complete
      await waitFor(() => {
        expect(screen.getByTestId('isAuthReady').textContent).toBe('true');
      });

      expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
      expect(screen.getByTestId('hasTenantContext').textContent).toBe('false');
    });

    it('throws when neither AppProvider nor AuthConfig.baseUrl is provided', () => {
      // Silence React's error boundary console output for this assertion
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() =>
        render(
          <AuthProvider>
            <AuthProbe />
          </AuthProvider>
        )
      ).toThrow(/baseUrl is required/);

      spy.mockRestore();
    });
  });

  describe('baseUrl validation', () => {
    it('rejects javascript: baseUrl with ConfigurationError', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() =>
        render(
          <AuthProvider config={{ baseUrl: 'javascript:alert(1)', appId: 'app-1' }}>
            <AuthProbe />
          </AuthProvider>
        )
      ).toThrow(ConfigurationError);
      spy.mockRestore();
    });

    it('rejects data: baseUrl', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() =>
        render(
          <AuthProvider config={{ baseUrl: 'data:text/html,evil', appId: 'app-1' }}>
            <AuthProbe />
          </AuthProvider>
        )
      ).toThrow(/dangerous URL scheme/);
      spy.mockRestore();
    });

    it('rejects ftp: baseUrl', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() =>
        render(
          <AuthProvider config={{ baseUrl: 'ftp://host', appId: 'app-1' }}>
            <AuthProbe />
          </AuthProvider>
        )
      ).toThrow(/must start with http/);
      spy.mockRestore();
    });
  });

  describe('useAuthOptional', () => {
    it('returns null when rendered outside of AuthProvider', () => {
      render(<OptionalProbe />);
      expect(screen.getByTestId('optional').textContent).toBe('null');
    });

    it('returns a context value when rendered inside AuthProvider', async () => {
      render(
        <AuthProvider config={{ baseUrl: 'https://api.example.com' }}>
          <OptionalProbe />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('optional').textContent).toBe('present');
      });
    });
  });
});
