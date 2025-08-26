import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../../core/SettingsProvider';
import { z } from '../../zod';
import type { SettingsConnector } from '../../core/types';

// Mock connector
const mockConnector: SettingsConnector = {
  getPublicSettings: vi.fn(),
  getPrivateSettings: vi.fn(),
  updateSettings: vi.fn(),
  getSchema: vi.fn(),
  updateSchema: vi.fn(),
};

const testSchema = z.object({
  publicField: z.string().public(),
  privateField: z.string(),
  theme: z.enum(['light', 'dark']).public(),
});

const defaultSettings = {
  publicField: 'default public',
  privateField: 'default private',
  theme: 'light' as const,
};

// Test component that uses the hook
function TestComponent() {
  const { settings, publicSettings, updateSetting, isLoading, isAuthenticated } = useSettings();

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="authenticated">
        {isAuthenticated ? 'authenticated' : 'not authenticated'}
      </div>
      <div data-testid="public-field">{publicSettings.publicField}</div>
      <div data-testid="private-field">{settings.privateField}</div>
      <div data-testid="theme">{settings.theme}</div>
      <button onClick={() => updateSetting('theme', 'dark')} data-testid="update-theme">
        Update Theme
      </button>
    </div>
  );
}

describe('SettingsProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide default settings initially', async () => {
    mockConnector.getPublicSettings = vi.fn().mockResolvedValue({});
    mockConnector.getPrivateSettings = vi.fn().mockResolvedValue({});

    render(
      <SettingsProvider
        appId="test-app"
        tenantId="test-tenant"
        schema={testSchema}
        version="1.0.0"
        defaults={defaultSettings}
        connector={mockConnector}
      >
        <TestComponent />
      </SettingsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    expect(screen.getByTestId('public-field')).toHaveTextContent('default public');
    expect(screen.getByTestId('private-field')).toHaveTextContent('default private');
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
  });

  it('should load settings from connector', async () => {
    const publicSettings = { publicField: 'loaded public', theme: 'dark' };
    const privateSettings = { ...publicSettings, privateField: 'loaded private' };

    mockConnector.getPublicSettings = vi.fn().mockResolvedValue(publicSettings);
    mockConnector.getPrivateSettings = vi.fn().mockResolvedValue(privateSettings);

    render(
      <SettingsProvider
        appId="test-app"
        tenantId="test-tenant"
        schema={testSchema}
        version="1.0.0"
        defaults={defaultSettings}
        connector={mockConnector}
        isAuthenticated={true}
      >
        <TestComponent />
      </SettingsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    expect(screen.getByTestId('public-field')).toHaveTextContent('loaded public');
    expect(screen.getByTestId('private-field')).toHaveTextContent('loaded private');
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
  });

  it('should only load public settings when not authenticated', async () => {
    const publicSettings = { publicField: 'public only', theme: 'dark' };

    mockConnector.getPublicSettings = vi.fn().mockResolvedValue(publicSettings);
    mockConnector.getPrivateSettings = vi.fn().mockResolvedValue({});

    render(
      <SettingsProvider
        appId="test-app"
        tenantId="test-tenant"
        schema={testSchema}
        version="1.0.0"
        defaults={defaultSettings}
        connector={mockConnector}
        isAuthenticated={false}
      >
        <TestComponent />
      </SettingsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    expect(mockConnector.getPublicSettings).toHaveBeenCalled();
    expect(mockConnector.getPrivateSettings).not.toHaveBeenCalled();
    expect(screen.getByTestId('authenticated')).toHaveTextContent('not authenticated');
  });

  it('should update settings through connector', async () => {
    mockConnector.getPublicSettings = vi.fn().mockResolvedValue({});
    mockConnector.getPrivateSettings = vi.fn().mockResolvedValue({});
    mockConnector.updateSettings = vi.fn().mockResolvedValue(undefined);

    render(
      <SettingsProvider
        appId="test-app"
        tenantId="test-tenant"
        schema={testSchema}
        version="1.0.0"
        defaults={defaultSettings}
        connector={mockConnector}
        isAuthenticated={true}
      >
        <TestComponent />
      </SettingsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    const updateButton = screen.getByTestId('update-theme');

    await act(async () => {
      updateButton.click();
    });

    expect(mockConnector.updateSettings).toHaveBeenCalledWith(
      'test-app',
      'test-tenant',
      expect.objectContaining({ theme: 'dark' }),
      testSchema
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('should handle connector errors gracefully', async () => {
    mockConnector.getPublicSettings = vi.fn().mockRejectedValue(new Error('Network error'));
    mockConnector.getPrivateSettings = vi.fn().mockRejectedValue(new Error('Network error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <SettingsProvider
        appId="test-app"
        tenantId="test-tenant"
        schema={testSchema}
        version="1.0.0"
        defaults={defaultSettings}
        connector={mockConnector}
      >
        <TestComponent />
      </SettingsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    // Should fall back to defaults
    expect(screen.getByTestId('public-field')).toHaveTextContent('default public');
    expect(screen.getByTestId('private-field')).toHaveTextContent('default private');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should validate settings against schema', async () => {
    const invalidSettings = {
      publicField: 'valid',
      privateField: 'valid',
      theme: 'invalid-theme', // This should fail enum validation
    };

    mockConnector.getPublicSettings = vi.fn().mockResolvedValue({});
    mockConnector.getPrivateSettings = vi.fn().mockResolvedValue(invalidSettings);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <SettingsProvider
        appId="test-app"
        tenantId="test-tenant"
        schema={testSchema}
        version="1.0.0"
        defaults={defaultSettings}
        connector={mockConnector}
        isAuthenticated={true}
      >
        <TestComponent />
      </SettingsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    // Should fall back to defaults due to validation error
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should throw error when used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useSettings must be used within a SettingsProvider');

    consoleSpy.mockRestore();
  });
});
