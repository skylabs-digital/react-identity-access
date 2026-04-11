import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AppProvider, useApp } from '../providers/AppProvider';

function Probe() {
  const { appId, baseUrl, appInfo, isAppLoading, appError } = useApp();
  return (
    <div>
      <span data-testid="appId">{appId ?? 'undefined'}</span>
      <span data-testid="baseUrl">{baseUrl}</span>
      <span data-testid="appInfo">{appInfo ? 'present' : 'null'}</span>
      <span data-testid="isLoading">{isAppLoading ? 'true' : 'false'}</span>
      <span data-testid="appError">{appError ? appError.message : 'null'}</span>
    </div>
  );
}

describe('AppProvider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => 'application/json' },
      json: async () => ({ data: { id: 'app-1', name: 'App One' } }),
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('without appId (SUPERUSER backoffice flow)', () => {
    it('mounts without fetching public app info', async () => {
      render(
        <AppProvider config={{ baseUrl: 'https://api.example.com' }}>
          <Probe />
        </AppProvider>
      );

      expect(screen.getByTestId('appId').textContent).toBe('undefined');
      expect(screen.getByTestId('baseUrl').textContent).toBe('https://api.example.com');
      expect(screen.getByTestId('appInfo').textContent).toBe('null');
      expect(screen.getByTestId('isLoading').textContent).toBe('false');
      expect(screen.getByTestId('appError').textContent).toBe('null');

      await waitFor(() => {
        expect(fetchMock).not.toHaveBeenCalled();
      });
    });

    it('does not write to localStorage when no appId is provided', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      render(
        <AppProvider config={{ baseUrl: 'https://api.example.com' }}>
          <Probe />
        </AppProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false');
      });

      expect(setItemSpy).not.toHaveBeenCalled();
    });

    it('does not call the public app info endpoint when no appId is provided', async () => {
      render(
        <AppProvider config={{ baseUrl: 'https://api.example.com' }}>
          <Probe />
        </AppProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false');
      });

      const calledUrls = fetchMock.mock.calls.map(call => String(call[0]));
      expect(calledUrls.some(url => url.includes('/apps/'))).toBe(false);
      expect(calledUrls.some(url => url.includes('undefined'))).toBe(false);
    });
  });

  describe('with appId', () => {
    it('fetches public app info on mount', async () => {
      render(
        <AppProvider config={{ baseUrl: 'https://api.example.com', appId: 'app-1' }}>
          <Probe />
        </AppProvider>
      );

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalled();
      });

      const calledUrls = fetchMock.mock.calls.map(call => String(call[0]));
      expect(calledUrls.some(url => url.includes('/apps/app-1/public'))).toBe(true);
    });
  });
});
