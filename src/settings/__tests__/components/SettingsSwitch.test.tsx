import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettingsSwitch } from '../../components/SettingsSwitch';
import { SettingsProvider } from '../../core/SettingsProvider';
import { z } from '../../zod';
import type { SettingsConnector } from '../../core/types';

const mockConnector: SettingsConnector = {
  getPublicSettings: vi.fn().mockResolvedValue({}),
  getPrivateSettings: vi.fn().mockResolvedValue({}),
  updateSettings: vi.fn(),
  getSchema: vi.fn(),
  updateSchema: vi.fn(),
};

const testSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).public(),
  userRole: z.enum(['user', 'admin', 'moderator']),
  status: z.string(),
});

const TestWrapper = ({
  settings,
  isAuthenticated = true,
  children,
}: {
  settings: any;
  isAuthenticated?: boolean;
  children: React.ReactNode;
}) => {
  const connector = {
    ...mockConnector,
    getPublicSettings: vi.fn().mockResolvedValue(settings),
    getPrivateSettings: vi.fn().mockResolvedValue(settings),
  };

  return (
    <SettingsProvider
      appId="test-app"
      tenantId="test-tenant"
      schema={testSchema}
      version="1.0.0"
      defaults={settings}
      connector={connector}
      isAuthenticated={isAuthenticated}
    >
      {children}
    </SettingsProvider>
  );
};

describe('SettingsSwitch', () => {
  it('should render matching case for enum value', async () => {
    const settings = { theme: 'dark' };

    render(
      <TestWrapper settings={settings}>
        <SettingsSwitch
          settingKey="theme"
          cases={{
            light: <div data-testid="light-theme">Light theme active</div>,
            dark: <div data-testid="dark-theme">Dark theme active</div>,
            auto: <div data-testid="auto-theme">Auto theme active</div>,
          }}
        />
      </TestWrapper>
    );

    await screen.findByTestId('dark-theme');
    expect(screen.getByTestId('dark-theme')).toBeInTheDocument();
    expect(screen.queryByTestId('light-theme')).not.toBeInTheDocument();
    expect(screen.queryByTestId('auto-theme')).not.toBeInTheDocument();
  });

  it('should render fallback when no matching case', async () => {
    const settings = { theme: 'unknown' };

    render(
      <TestWrapper settings={settings}>
        <SettingsSwitch
          settingKey="theme"
          cases={{
            light: <div data-testid="light-theme">Light theme</div>,
            dark: <div data-testid="dark-theme">Dark theme</div>,
          }}
          fallback={<div data-testid="fallback">Unknown theme</div>}
        />
      </TestWrapper>
    );

    await screen.findByTestId('fallback');
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('light-theme')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dark-theme')).not.toBeInTheDocument();
  });

  it('should render nothing when no matching case and no fallback', async () => {
    const settings = { theme: 'unknown' };

    render(
      <TestWrapper settings={settings}>
        <div data-testid="container">
          <SettingsSwitch
            settingKey="theme"
            cases={{
              light: <div data-testid="light-theme">Light theme</div>,
              dark: <div data-testid="dark-theme">Dark theme</div>,
            }}
          />
        </div>
      </TestWrapper>
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(screen.getByTestId('container')).toBeInTheDocument();
    expect(screen.queryByTestId('light-theme')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dark-theme')).not.toBeInTheDocument();
  });

  it('should work with dot notation for nested settings', async () => {
    const nestedSchema = z.object({
      user: z.object({
        preferences: z.object({
          theme: z.enum(['light', 'dark']).public(),
        }),
      }),
    });

    const settings = {
      user: {
        preferences: {
          theme: 'light',
        },
      },
    };

    const connector = {
      ...mockConnector,
      getPublicSettings: vi.fn().mockResolvedValue(settings),
      getPrivateSettings: vi.fn().mockResolvedValue(settings),
    };

    render(
      <SettingsProvider
        appId="test-app"
        tenantId="test-tenant"
        schema={nestedSchema}
        version="1.0.0"
        defaults={settings}
        connector={connector}
      >
        <SettingsSwitch
          settingKey="user.preferences.theme"
          cases={{
            light: <div data-testid="light-nested">Light nested theme</div>,
            dark: <div data-testid="dark-nested">Dark nested theme</div>,
          }}
        />
      </SettingsProvider>
    );

    await screen.findByTestId('light-nested');
    expect(screen.getByTestId('light-nested')).toBeInTheDocument();
  });

  it('should respect authentication requirements', async () => {
    const settings = { userRole: 'admin' };

    render(
      <TestWrapper settings={settings} isAuthenticated={true}>
        <SettingsSwitch
          settingKey="userRole"
          requireAuth
          cases={{
            user: <div data-testid="user-role">User role</div>,
            admin: <div data-testid="admin-role">Admin role</div>,
            moderator: <div data-testid="mod-role">Moderator role</div>,
          }}
        />
      </TestWrapper>
    );

    await screen.findByTestId('admin-role');
    expect(screen.getByTestId('admin-role')).toBeInTheDocument();
  });

  it('should not render when authentication required but user not authenticated', async () => {
    const settings = { userRole: 'admin' };

    render(
      <TestWrapper settings={settings} isAuthenticated={false}>
        <div data-testid="container">
          <SettingsSwitch
            settingKey="userRole"
            requireAuth
            cases={{
              user: <div data-testid="user-role">User role</div>,
              admin: <div data-testid="admin-role">Admin role</div>,
            }}
            fallback={<div data-testid="fallback">Not authenticated</div>}
          />
        </div>
      </TestWrapper>
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(screen.getByTestId('container')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-role')).not.toBeInTheDocument();
    expect(screen.queryByTestId('fallback')).not.toBeInTheDocument();
  });

  it('should render public settings even when not authenticated', async () => {
    const settings = { theme: 'dark' };

    render(
      <TestWrapper settings={settings} isAuthenticated={false}>
        <SettingsSwitch
          settingKey="theme"
          cases={{
            light: <div data-testid="light-public">Light public theme</div>,
            dark: <div data-testid="dark-public">Dark public theme</div>,
          }}
        />
      </TestWrapper>
    );

    await screen.findByTestId('dark-public');
    expect(screen.getByTestId('dark-public')).toBeInTheDocument();
  });

  it('should handle string values correctly', async () => {
    const settings = { status: 'active' };

    render(
      <TestWrapper settings={settings}>
        <SettingsSwitch
          settingKey="status"
          cases={{
            active: <div data-testid="active-status">Active status</div>,
            inactive: <div data-testid="inactive-status">Inactive status</div>,
            pending: <div data-testid="pending-status">Pending status</div>,
          }}
        />
      </TestWrapper>
    );

    await screen.findByTestId('active-status');
    expect(screen.getByTestId('active-status')).toBeInTheDocument();
  });

  it('should handle non-existent settings with fallback', async () => {
    const settings = {};

    render(
      <TestWrapper settings={settings}>
        <SettingsSwitch
          settingKey="nonExistent"
          cases={{
            value1: <div data-testid="value1">Value 1</div>,
            value2: <div data-testid="value2">Value 2</div>,
          }}
          fallback={<div data-testid="not-found">Setting not found</div>}
        />
      </TestWrapper>
    );

    await screen.findByTestId('not-found');
    expect(screen.getByTestId('not-found')).toBeInTheDocument();
  });

  it('should handle complex case values', async () => {
    const settings = { theme: 'dark' };

    const ComplexComponent = ({ type }: { type: string }) => (
      <div data-testid={`complex-${type}`}>Complex {type} component with props</div>
    );

    render(
      <TestWrapper settings={settings}>
        <SettingsSwitch
          settingKey="theme"
          cases={{
            light: <ComplexComponent type="light" />,
            dark: <ComplexComponent type="dark" />,
            auto: (
              <div data-testid="auto-complex">
                <span>Auto theme with</span>
                <strong>nested elements</strong>
              </div>
            ),
          }}
        />
      </TestWrapper>
    );

    await screen.findByTestId('complex-dark');
    expect(screen.getByTestId('complex-dark')).toBeInTheDocument();
    expect(screen.getByTestId('complex-dark')).toHaveTextContent(
      'Complex dark component with props'
    );
  });
});
