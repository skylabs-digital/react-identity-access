import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AppProvider } from '../providers/AppProvider';
import { TenantProvider, useTenantOptional } from '../providers/TenantProvider';
import { SessionManager } from '../services/SessionManager';

function Probe() {
  const tenant = useTenantOptional();
  return (
    <div>
      <span data-testid="present">{tenant ? 'yes' : 'no'}</span>
      <span data-testid="slug">{tenant?.tenantSlug ?? 'none'}</span>
    </div>
  );
}

describe('TenantProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    // Any fetch call returns 500 so cache-miss paths don't block indefinitely
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

  describe('useTenantOptional', () => {
    it('returns null when rendered outside TenantProvider', () => {
      render(<Probe />);
      expect(screen.getByTestId('present').textContent).toBe('no');
    });
  });

  describe('selector mode', () => {
    it('reads tenant slug from the configured URL search param', async () => {
      // jsdom does not allow writing window.location directly; use history
      window.history.replaceState({}, '', '/?tenant=acme');

      render(
        <AppProvider config={{ baseUrl: 'https://api.example.com', appId: 'app-1' }}>
          <TenantProvider config={{ tenantMode: 'selector', selectorParam: 'tenant' }}>
            <Probe />
          </TenantProvider>
        </AppProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('present').textContent).toBe('yes');
        expect(screen.getByTestId('slug').textContent).toBe('acme');
      });

      // Cleanup
      window.history.replaceState({}, '', '/');
    });

    it('returns null slug when the selector param is missing', async () => {
      window.history.replaceState({}, '', '/');

      render(
        <AppProvider config={{ baseUrl: 'https://api.example.com', appId: 'app-1' }}>
          <TenantProvider config={{ tenantMode: 'selector', selectorParam: 'tenant' }}>
            <Probe />
          </TenantProvider>
        </AppProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('present').textContent).toBe('yes');
      });
      expect(screen.getByTestId('slug').textContent).toBe('none');
    });
  });

  describe('fixed mode', () => {
    it('uses the configured fixedTenantSlug regardless of URL', async () => {
      window.history.replaceState({}, '', '/?tenant=ignored');

      render(
        <AppProvider config={{ baseUrl: 'https://api.example.com', appId: 'app-1' }}>
          <TenantProvider config={{ tenantMode: 'fixed', fixedTenantSlug: 'globex' }}>
            <Probe />
          </TenantProvider>
        </AppProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('slug').textContent).toBe('globex');
      });

      window.history.replaceState({}, '', '/');
    });
  });
});
