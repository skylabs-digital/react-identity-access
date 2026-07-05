import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../providers/AuthProvider';
import type { SessionConfig } from '../services/SessionManager';
import { SessionManager } from '../services/SessionManager';

const BASE_URL = 'https://api.example.com';

describe('AuthProvider — new AuthConfig knobs forwarded to SessionManager', () => {
  let capturedConfig: SessionConfig | undefined;

  beforeEach(() => {
    capturedConfig = undefined;
    // Prevent bootstrap fetches from hanging.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 500,
        statusText: 'unmatched',
        headers: { get: () => 'application/json' },
        json: async () => ({}),
        text: async () => '',
      }))
    );
    // Capture the config the provider passes without breaking the real
    // instance creation. Grab the real static method BEFORE spying, then
    // delegate to it inside the spy.
    const realGetInstance = SessionManager.getInstance.bind(SessionManager);
    vi.spyOn(SessionManager, 'getInstance').mockImplementation((config: SessionConfig = {}) => {
      capturedConfig = config;
      return realGetInstance(config);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    SessionManager.resetAllInstances();
  });

  it('forwards refreshThreshold, autoRefresh, maxRefreshRetries, retryBackoffBase, storageKey', () => {
    render(
      <AuthProvider
        config={{
          baseUrl: BASE_URL,
          refreshThreshold: 123000,
          autoRefresh: false,
          maxRefreshRetries: 7,
          retryBackoffBase: 250,
          storageKey: 'custom_key',
        }}
      >
        <div>child</div>
      </AuthProvider>
    );

    expect(capturedConfig).toBeDefined();
    expect(capturedConfig?.refreshThreshold).toBe(123000);
    expect(capturedConfig?.autoRefresh).toBe(false);
    expect(capturedConfig?.maxRefreshRetries).toBe(7);
    expect(capturedConfig?.retryBackoffBase).toBe(250);
    expect(capturedConfig?.storageKey).toBe('custom_key');
  });
});
