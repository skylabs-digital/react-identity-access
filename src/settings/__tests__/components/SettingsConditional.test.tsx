import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettingsConditional } from '../../components/SettingsConditional';
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
  showAdvanced: z.boolean().public(),
  features: z.object({
    betaMode: z.boolean(),
    darkMode: z.boolean().public(),
  }),
  userPreferences: z.object({
    notifications: z.object({
      email: z.boolean(),
      push: z.boolean().public(),
    }),
  }),
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

describe('SettingsConditional', () => {
  it('should render children when boolean setting is true', async () => {
    const settings = { showAdvanced: true };

    render(
      <TestWrapper settings={settings}>
        <SettingsConditional settingKey="showAdvanced">
          <div data-testid="advanced-content">Advanced content</div>
        </SettingsConditional>
      </TestWrapper>
    );

    await screen.findByTestId('advanced-content');
    expect(screen.getByTestId('advanced-content')).toBeInTheDocument();
  });

  it('should not render children when boolean setting is false', async () => {
    const settings = { showAdvanced: false };

    render(
      <TestWrapper settings={settings}>
        <SettingsConditional settingKey="showAdvanced">
          <div data-testid="advanced-content">Advanced content</div>
        </SettingsConditional>
      </TestWrapper>
    );

    // Wait for provider to load
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(screen.queryByTestId('advanced-content')).not.toBeInTheDocument();
  });

  it('should work with nested dot notation', async () => {
    const settings = {
      features: { betaMode: true, darkMode: false },
      userPreferences: { notifications: { email: true, push: false } },
    };

    render(
      <TestWrapper settings={settings}>
        <SettingsConditional settingKey="features.betaMode">
          <div data-testid="beta-content">Beta features</div>
        </SettingsConditional>
        <SettingsConditional settingKey="userPreferences.notifications.email">
          <div data-testid="email-content">Email notifications</div>
        </SettingsConditional>
        <SettingsConditional settingKey="userPreferences.notifications.push">
          <div data-testid="push-content">Push notifications</div>
        </SettingsConditional>
      </TestWrapper>
    );

    await screen.findByTestId('beta-content');
    await screen.findByTestId('email-content');

    expect(screen.getByTestId('beta-content')).toBeInTheDocument();
    expect(screen.getByTestId('email-content')).toBeInTheDocument();
    expect(screen.queryByTestId('push-content')).not.toBeInTheDocument();
  });

  it('should respect authentication requirements', async () => {
    const settings = {
      showAdvanced: true,
      features: { betaMode: true, darkMode: true },
    };

    // Test with authenticated user
    render(
      <TestWrapper settings={settings} isAuthenticated={true}>
        <SettingsConditional settingKey="features.betaMode" requireAuth>
          <div data-testid="auth-content">Authenticated content</div>
        </SettingsConditional>
      </TestWrapper>
    );

    await screen.findByTestId('auth-content');
    expect(screen.getByTestId('auth-content')).toBeInTheDocument();
  });

  it('should not render when authentication is required but user is not authenticated', async () => {
    const settings = {
      showAdvanced: true,
      features: { betaMode: true, darkMode: true },
    };

    render(
      <TestWrapper settings={settings} isAuthenticated={false}>
        <SettingsConditional settingKey="features.betaMode" requireAuth>
          <div data-testid="auth-content">Authenticated content</div>
        </SettingsConditional>
      </TestWrapper>
    );

    // Wait for provider to load
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(screen.queryByTestId('auth-content')).not.toBeInTheDocument();
  });

  it('should render public settings even when not authenticated', async () => {
    const settings = {
      showAdvanced: true,
      features: { darkMode: true },
    };

    render(
      <TestWrapper settings={settings} isAuthenticated={false}>
        <SettingsConditional settingKey="showAdvanced">
          <div data-testid="public-content">Public content</div>
        </SettingsConditional>
        <SettingsConditional settingKey="features.darkMode">
          <div data-testid="dark-mode-content">Dark mode content</div>
        </SettingsConditional>
      </TestWrapper>
    );

    await screen.findByTestId('public-content');
    await screen.findByTestId('dark-mode-content');

    expect(screen.getByTestId('public-content')).toBeInTheDocument();
    expect(screen.getByTestId('dark-mode-content')).toBeInTheDocument();
  });

  it('should handle non-existent settings gracefully', async () => {
    const settings = { showAdvanced: true };

    render(
      <TestWrapper settings={settings}>
        <SettingsConditional settingKey="nonExistent.setting">
          <div data-testid="non-existent-content">Should not render</div>
        </SettingsConditional>
      </TestWrapper>
    );

    // Wait for provider to load
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(screen.queryByTestId('non-existent-content')).not.toBeInTheDocument();
  });

  it('should handle non-boolean values by checking truthiness', async () => {
    const settings = {
      stringValue: 'hello',
      emptyString: '',
      numberValue: 42,
      zeroValue: 0,
      nullValue: null,
      undefinedValue: undefined,
    };

    render(
      <TestWrapper settings={settings}>
        <SettingsConditional settingKey="stringValue">
          <div data-testid="string-content">String content</div>
        </SettingsConditional>
        <SettingsConditional settingKey="emptyString">
          <div data-testid="empty-string-content">Empty string content</div>
        </SettingsConditional>
        <SettingsConditional settingKey="numberValue">
          <div data-testid="number-content">Number content</div>
        </SettingsConditional>
        <SettingsConditional settingKey="zeroValue">
          <div data-testid="zero-content">Zero content</div>
        </SettingsConditional>
        <SettingsConditional settingKey="nullValue">
          <div data-testid="null-content">Null content</div>
        </SettingsConditional>
      </TestWrapper>
    );

    await screen.findByTestId('string-content');
    await screen.findByTestId('number-content');

    expect(screen.getByTestId('string-content')).toBeInTheDocument();
    expect(screen.getByTestId('number-content')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-string-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('zero-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('null-content')).not.toBeInTheDocument();
  });
});
