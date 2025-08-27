import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ConnectorProvider } from '../../providers/ConnectorProvider';
import { TenantProvider } from '../../providers/TenantProvider';
import { IdentityProvider } from '../../providers/IdentityProvider';
import { SubscriptionProvider } from '../../providers/SubscriptionProvider';
import { SettingsProvider } from '../../providers/SettingsProvider';
import { LocalStorageConnector } from '../../connectors/localStorage/LocalStorageConnector';
import { z } from 'zod';

// Mock data for testing
export const mockTenants = [
  { id: 'tenant-1', name: 'Test Tenant 1', domain: 'test1.example.com' },
  { id: 'tenant-2', name: 'Test Tenant 2', domain: 'test2.example.com' },
];

export const mockUsers = [
  {
    id: 'user-1',
    email: 'user1@test.com',
    name: 'Test User 1',
    tenantId: 'tenant-1',
    roles: ['user'],
    permissions: ['read:profile'],
  },
  {
    id: 'admin-1',
    email: 'admin@test.com',
    name: 'Admin User',
    tenantId: 'tenant-1',
    roles: ['admin'],
    permissions: ['read:profile', 'write:settings', 'manage:users'],
  },
];

export const mockRoles = [
  {
    id: 'role-user',
    name: 'user',
    permissions: ['read:profile'],
    tenantId: 'tenant-1',
  },
  {
    id: 'role-admin',
    name: 'admin',
    permissions: ['read:profile', 'write:settings', 'manage:users'],
    tenantId: 'tenant-1',
  },
];

export const mockFeatureFlags = {
  'feature-a': {
    serverEnabled: true,
    adminEditable: true,
    defaultState: true,
    rolloutPercentage: 100,
  },
  'feature-b': {
    serverEnabled: false,
    adminEditable: false,
    defaultState: false,
    rolloutPercentage: 0,
  },
};

export const mockSubscriptionPlans = [
  {
    id: 'basic',
    name: 'Basic Plan',
    price: 9.99,
    features: ['feature-a'],
    limits: { users: 5, storage: 1000 },
  },
  {
    id: 'premium',
    name: 'Premium Plan',
    price: 29.99,
    features: ['feature-a', 'feature-b'],
    limits: { users: 50, storage: 10000 },
  },
];

export const mockSettingsSchema = {
  theme: {
    type: 'string',
    enum: ['light', 'dark'],
    default: 'light',
  },
  notifications: {
    type: 'boolean',
    default: true,
  },
  ui: {
    type: 'object',
    properties: {
      sidebar: {
        type: 'object',
        properties: {
          collapsed: {
            type: 'boolean',
            default: false,
          },
        },
      },
    },
  },
};

export const mockSettingsConfig = {
  version: '1.0.0',
  schema: mockSettingsSchema,
  defaults: {
    appName: 'Test App',
    theme: 'light' as const,
    notifications: {
      email: true,
      push: false,
    },
    publicSetting: 'public',
  },
};

// Test schema for settings
export const testSettingsSchema = z.object({
  appName: z.string().default('Test App'),
  theme: z.enum(['light', 'dark']).default('light'),
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(false),
  }),
  publicSetting: z.string().default('public').describe('public'),
});

export type TestSettings = z.infer<typeof testSettingsSchema>;

// Create mock connector with test data
export const createMockConnector = (overrides?: any) => {
  return new LocalStorageConnector({
    appId: 'test-app',
    type: 'localStorage',
    seedData: {
      tenants: mockTenants,
      users: mockUsers,
      roles: mockRoles,
      featureFlags: mockFeatureFlags,
      ...overrides,
    },
  });
};

// Wrapper components for testing
interface TestWrapperProps {
  children: React.ReactNode;
  includeIdentity?: boolean;
  includeSubscription?: boolean;
  includeSettings?: boolean;
  includeAll?: boolean;
  authenticated?: boolean;
}

export const TestWrapper: React.FC<TestWrapperProps> = ({
  children,
  includeIdentity = false,
  includeSubscription = false,
  includeSettings = false,
  includeAll = false,
}) => {
  const shouldIncludeIdentity = includeIdentity || includeAll;
  const shouldIncludeSubscription = includeSubscription || includeAll;
  const shouldIncludeSettings = includeSettings || includeAll;

  // Build provider tree from inside out
  let content = children;

  // Settings provider (innermost)
  if (shouldIncludeSettings) {
    content = (
      <SettingsProvider
        schema={testSettingsSchema}
        defaults={mockSettingsConfig.defaults}
        config={mockSettingsConfig}
      >
        {content}
      </SettingsProvider>
    );
  }

  // Subscription provider
  if (shouldIncludeSubscription) {
    content = <SubscriptionProvider>{content}</SubscriptionProvider>;
  }

  // Identity provider
  if (shouldIncludeIdentity) {
    content = <IdentityProvider>{content}</IdentityProvider>;
  }

  // Always wrap with tenant and connector (outermost)
  return (
    <ConnectorProvider config={{ type: 'localStorage', appId: 'test-app' }}>
      <TenantProvider config={{ strategy: 'subdomain' }}>{content}</TenantProvider>
    </ConnectorProvider>
  );
};

// Custom render function
export const renderWithProviders = (
  ui: React.ReactElement,
  options: RenderOptions & {
    includeIdentity?: boolean;
    includeSubscription?: boolean;
    includeSettings?: boolean;
    includeAll?: boolean;
    authenticated?: boolean;
  } = {}
) => {
  const {
    includeIdentity,
    includeSubscription,
    includeSettings,
    includeAll,
    authenticated,
    ...renderOptions
  } = options;
  const wrapperOptions = {
    includeIdentity,
    includeSubscription,
    includeSettings,
    includeAll,
    authenticated,
  };

  return render(ui, {
    wrapper: ({ children }) => <TestWrapper {...wrapperOptions}>{children}</TestWrapper>,
    ...renderOptions,
  });
};

// Helper to wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

// Mock authentication helper
export const mockAuthentication = (user = mockUsers[0]) => {
  localStorage.setItem('test-app_token', 'mock-token');
  localStorage.setItem('test-app_user', JSON.stringify(user));
};

// Clear authentication helper
export const clearAuthentication = () => {
  localStorage.removeItem('test-app_token');
  localStorage.removeItem('test-app_user');
};
