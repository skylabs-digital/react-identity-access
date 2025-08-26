import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsAdminPanel } from '../../components/SettingsAdminPanel';
import { SettingsProvider } from '../../core/SettingsProvider';
import { z } from '../../zod';
import type { SettingsConnector } from '../../core/types';

const mockConnector: SettingsConnector = {
  getPublicSettings: vi.fn().mockResolvedValue({}),
  getPrivateSettings: vi.fn().mockResolvedValue({}),
  updateSettings: vi.fn().mockResolvedValue(undefined),
  getSchema: vi.fn(),
  updateSchema: vi.fn(),
};

const testSchema = z.object({
  siteName: z.string().public(),
  theme: z.enum(['light', 'dark', 'auto']).public(),
  maxUsers: z.number().min(1),
  adminEmail: z.string().email(),
  features: z.object({
    advancedMode: z.boolean(),
    betaFeatures: z.boolean().public(),
  }),
});

const testSettings = {
  siteName: 'Test Site',
  theme: 'light' as const,
  maxUsers: 100,
  adminEmail: 'admin@test.com',
  features: {
    advancedMode: false,
    betaFeatures: true,
  },
};

const TestWrapper = ({
  settings = testSettings,
  isAuthenticated = true,
  children,
}: {
  settings?: any;
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

describe('SettingsAdminPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render admin panel with title', async () => {
    render(
      <TestWrapper>
        <SettingsAdminPanel title="Test Settings Panel" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Settings Panel')).toBeInTheDocument();
    });
  });

  it('should render all settings fields by default', async () => {
    render(
      <TestWrapper>
        <SettingsAdminPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Site')).toBeInTheDocument();
      expect(screen.getByDisplayValue('light')).toBeInTheDocument();
      expect(screen.getByDisplayValue('100')).toBeInTheDocument();
      expect(screen.getByDisplayValue('admin@test.com')).toBeInTheDocument();
    });
  });

  it('should render organized sections', async () => {
    const sections = [
      {
        key: 'general',
        label: 'General Settings',
        fields: ['siteName', 'theme'],
      },
      {
        key: 'admin',
        label: 'Admin Settings',
        fields: ['maxUsers', 'adminEmail'],
      },
    ];

    render(
      <TestWrapper>
        <SettingsAdminPanel sections={sections} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('General Settings')).toBeInTheDocument();
      expect(screen.getByText('Admin Settings')).toBeInTheDocument();
    });
  });

  it('should show public indicators when enabled', async () => {
    render(
      <TestWrapper>
        <SettingsAdminPanel showPublicIndicator={true} />
      </TestWrapper>
    );

    await waitFor(() => {
      // Should show public indicators for public fields
      const publicIndicators = screen.getAllByText('Public');
      expect(publicIndicators.length).toBeGreaterThan(0);
    });
  });

  it('should update settings when fields are changed', async () => {
    render(
      <TestWrapper>
        <SettingsAdminPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      const siteNameInput = screen.getByDisplayValue('Test Site');
      expect(siteNameInput).toBeInTheDocument();
    });

    const siteNameInput = screen.getByDisplayValue('Test Site');
    fireEvent.change(siteNameInput, { target: { value: 'Updated Site' } });

    await waitFor(() => {
      expect(siteNameInput).toHaveValue('Updated Site');
    });
  });

  it('should handle boolean fields with checkboxes', async () => {
    render(
      <TestWrapper>
        <SettingsAdminPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      const advancedModeCheckbox = screen.getByRole('checkbox', { name: /advancedMode/i });
      expect(advancedModeCheckbox).toBeInTheDocument();
      expect(advancedModeCheckbox).not.toBeChecked();
    });

    const advancedModeCheckbox = screen.getByRole('checkbox', { name: /advancedMode/i });
    fireEvent.click(advancedModeCheckbox);

    await waitFor(() => {
      expect(advancedModeCheckbox).toBeChecked();
    });
  });

  it('should handle enum fields with select dropdowns', async () => {
    render(
      <TestWrapper>
        <SettingsAdminPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      const themeSelect = screen.getByDisplayValue('light');
      expect(themeSelect).toBeInTheDocument();
    });

    const themeSelect = screen.getByDisplayValue('light');
    fireEvent.change(themeSelect, { target: { value: 'dark' } });

    await waitFor(() => {
      expect(themeSelect).toHaveValue('dark');
    });
  });

  it('should call onSave when save button is clicked', async () => {
    const onSave = vi.fn();

    render(
      <TestWrapper>
        <SettingsAdminPanel onSave={onSave} />
      </TestWrapper>
    );

    await waitFor(() => {
      const saveButton = screen.getByText('Save Settings');
      expect(saveButton).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(testSettings);
    });
  });

  it('should reset to original values when reset button is clicked', async () => {
    render(
      <TestWrapper>
        <SettingsAdminPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      const siteNameInput = screen.getByDisplayValue('Test Site');
      expect(siteNameInput).toBeInTheDocument();
    });

    // Change a value
    const siteNameInput = screen.getByDisplayValue('Test Site');
    fireEvent.change(siteNameInput, { target: { value: 'Modified Site' } });

    await waitFor(() => {
      expect(siteNameInput).toHaveValue('Modified Site');
    });

    // Reset
    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(siteNameInput).toHaveValue('Test Site');
    });
  });

  it('should handle nested object fields with dot notation', async () => {
    render(
      <TestWrapper>
        <SettingsAdminPanel
          sections={[
            {
              key: 'features',
              label: 'Features',
              fields: ['features.advancedMode', 'features.betaFeatures'],
            },
          ]}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Features')).toBeInTheDocument();
      const advancedModeCheckbox = screen.getByRole('checkbox', { name: /advancedMode/i });
      expect(advancedModeCheckbox).toBeInTheDocument();
    });
  });

  it('should not render when user is not authenticated', async () => {
    render(
      <TestWrapper isAuthenticated={false}>
        <div data-testid="container">
          <SettingsAdminPanel />
        </div>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('container')).toBeInTheDocument();
    });

    // Admin panel should not render for unauthenticated users
    expect(screen.queryByText('Save Settings')).not.toBeInTheDocument();
  });

  it('should handle validation errors gracefully', async () => {
    render(
      <TestWrapper>
        <SettingsAdminPanel />
      </TestWrapper>
    );

    await waitFor(() => {
      const maxUsersInput = screen.getByDisplayValue('100');
      expect(maxUsersInput).toBeInTheDocument();
    });

    // Try to set invalid value (negative number)
    const maxUsersInput = screen.getByDisplayValue('100');
    fireEvent.change(maxUsersInput, { target: { value: '-5' } });

    await waitFor(() => {
      expect(maxUsersInput).toHaveValue(-5);
    });

    // Save should handle validation error
    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    // Should not crash and should show some indication of error
    await waitFor(() => {
      expect(saveButton).toBeInTheDocument();
    });
  });

  it('should apply custom className', async () => {
    render(
      <TestWrapper>
        <SettingsAdminPanel className="custom-admin-panel" />
      </TestWrapper>
    );

    await waitFor(() => {
      const panel = screen.getByText('Save Settings').closest('div');
      expect(panel).toHaveClass('custom-admin-panel');
    });
  });

  it('should handle empty sections gracefully', async () => {
    render(
      <TestWrapper>
        <SettingsAdminPanel sections={[]} />
      </TestWrapper>
    );

    await waitFor(() => {
      // Should still render something, even with empty sections
      expect(screen.getByText('Save Settings')).toBeInTheDocument();
    });
  });
});
