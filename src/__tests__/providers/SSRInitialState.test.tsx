import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IdentityProvider } from '../../providers/IdentityProvider';
import { LocalStorageConnector } from '../../connectors/localStorage/LocalStorageConnector';
import { testSeedData } from '../helpers/testSeedData';
import { useAuth, useTenant, useFeatureFlags, useRoles } from '../../hooks';
import { InitialState, Tenant, User } from '../../types';

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    hostname: 'acme.example.com',
    search: '',
  },
  writable: true,
});

// Test component to access hooks
function TestComponent() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { currentTenant, isLoading: tenantLoading } = useTenant();
  const { isEnabled } = useFeatureFlags();
  const { hasRole, hasPermission } = useRoles();

  if (authLoading || tenantLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? `Authenticated: ${user?.name}` : 'Not authenticated'}
      </div>
      <div data-testid="tenant-info">
        {currentTenant ? `Tenant: ${currentTenant.name}` : 'No tenant'}
      </div>
      <div data-testid="feature-flag">
        {isEnabled('test-feature') ? 'Feature enabled' : 'Feature disabled'}
      </div>
      <div data-testid="role-check">{hasRole('admin') ? 'Has admin role' : 'No admin role'}</div>
      <div data-testid="permission-check">
        {hasPermission('users:read') ? 'Can read users' : 'Cannot read users'}
      </div>
    </div>
  );
}

describe('SSR Initial State Injection', () => {
  let connector: LocalStorageConnector;

  const mockTenant: Tenant = {
    id: 'test-tenant',
    name: 'Test Organization',
    domain: 'test.example.com',
    settings: {
      allowSelfRegistration: true,
      requireEmailVerification: false,
      sessionTimeout: 3600,
      maxConcurrentSessions: 5,
    },
    isActive: true,
    createdAt: new Date(),
  };

  const mockUser: User = {
    id: 'test-user',
    email: 'test@example.com',
    name: 'John Doe',
    tenantId: 'test-tenant',
    roles: ['admin'],
    permissions: ['users:read'],
    isActive: true,
    createdAt: new Date(),
    lastLoginAt: new Date(),
  };

  const mockFeatureFlags = {
    'test-feature': {
      key: 'test-feature',
      name: 'Test Feature',
      description: 'A test feature',
      enabled: true,
      serverEnabled: true,
      adminEditable: true,
      category: 'feature' as const,
      defaultState: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const mockRoles = [
    {
      id: 'admin',
      name: 'admin',
      displayName: 'Administrator',
      permissions: [
        {
          id: 'users:read',
          name: 'Read Users',
          resource: 'users',
          action: 'read',
          tenantId: 'test-tenant',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      tenantId: 'test-tenant',
      isActive: true,
      isSystemRole: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockPermissions = [
    {
      id: 'users:read',
      name: 'Read Users',
      resource: 'users',
      action: 'read',
      tenantId: 'test-tenant',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    connector = new LocalStorageConnector({
      simulateDelay: false,
      errorRate: 0,
      seedData: testSeedData,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should initialize with SSR roles and permissions data', async () => {
    const ssrPermissions = [
      {
        id: 'read-all',
        name: 'read:all',
        resource: '*',
        action: 'read',
      },
      {
        id: 'write-all',
        name: 'write:all',
        resource: '*',
        action: 'write',
      },
      {
        id: 'delete-all',
        name: 'delete:all',
        resource: '*',
        action: 'delete',
      },
      {
        id: 'read-own',
        name: 'read:own',
        resource: 'own',
        action: 'read',
      },
      {
        id: 'write-own',
        name: 'write:own',
        resource: 'own',
        action: 'write',
      },
    ];

    const ssrRoles = [
      {
        id: 'admin-role',
        name: 'Administrator',
        displayName: 'Administrator',
        description: 'Full system access',
        permissions: [ssrPermissions[0], ssrPermissions[1], ssrPermissions[2]],
        tenantId: 'test-tenant',
        isSystemRole: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'user-role',
        name: 'User',
        displayName: 'User',
        description: 'Basic user access',
        permissions: [ssrPermissions[3], ssrPermissions[4]],
        tenantId: 'test-tenant',
        isSystemRole: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ];

    const ssrFeatureFlags = {
      'anonymous-access': {
        key: 'anonymous-access',
        name: 'Anonymous Access',
        description: 'Allow anonymous access to certain features',
        category: 'feature' as const,
        serverEnabled: true,
        adminEditable: false,
        defaultState: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    };

    const ssrState: InitialState = {
      tenant: mockTenant,
      roles: ssrRoles,
      permissions: ssrPermissions,
      featureFlags: ssrFeatureFlags,
    };

    const TestComponent = () => {
      const { roles, permissions, isLoading } = useRoles();

      return (
        <div>
          <div data-testid="loading-state">{isLoading ? 'loading' : 'ready'}</div>
          <div data-testid="roles-count">{roles.length}</div>
          <div data-testid="permissions-count">{permissions.length}</div>
          <div data-testid="admin-role-exists">
            {roles.some(r => r.name === 'Administrator') ? 'exists' : 'missing'}
          </div>
        </div>
      );
    };

    render(
      <IdentityProvider
        connector={connector}
        initialState={ssrState}
        tenantResolver={{
          strategy: 'subdomain',
        }}
      >
        <TestComponent />
      </IdentityProvider>
    );

    // Roles should be immediately available (no loading state)
    expect(screen.getByTestId('loading-state')).toHaveTextContent('ready');

    // SSR roles and permissions should be available
    expect(screen.getByTestId('roles-count')).toHaveTextContent('2');
    expect(screen.getByTestId('permissions-count')).toHaveTextContent('5');
    expect(screen.getByTestId('admin-role-exists')).toHaveTextContent('exists');
  });

  it('should initialize with SSR feature flags data', async () => {
    const ssrFeatureFlags = {
      'ssr-flag': {
        key: 'ssr-flag',
        name: 'SSR Test Flag',
        description: 'A feature flag provided via SSR',
        category: 'feature' as const,
        serverEnabled: true,
        adminEditable: true,
        defaultState: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      'disabled-flag': {
        key: 'disabled-flag',
        name: 'Disabled Flag',
        description: 'A disabled feature flag',
        category: 'feature' as const,
        serverEnabled: false,
        adminEditable: false,
        defaultState: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    };

    const ssrState: InitialState = {
      tenant: mockTenant,
      featureFlags: ssrFeatureFlags,
    };

    const TestComponent = () => {
      const { flags, isEnabled, isLoading } = useFeatureFlags();

      return (
        <div>
          <div data-testid="loading-state">{isLoading ? 'loading' : 'ready'}</div>
          <div data-testid="ssr-flag-enabled">{isEnabled('ssr-flag') ? 'enabled' : 'disabled'}</div>
          <div data-testid="disabled-flag-enabled">
            {isEnabled('disabled-flag') ? 'enabled' : 'disabled'}
          </div>
          <div data-testid="flags-count">{Object.keys(flags).length}</div>
        </div>
      );
    };

    render(
      <IdentityProvider
        connector={connector}
        initialState={ssrState}
        tenantResolver={{
          strategy: 'subdomain',
        }}
      >
        <TestComponent />
      </IdentityProvider>
    );

    // Feature flags should be immediately available (no loading state)
    expect(screen.getByTestId('loading-state')).toHaveTextContent('ready');

    // SSR feature flags should be available
    expect(screen.getByTestId('ssr-flag-enabled')).toHaveTextContent('enabled');
    expect(screen.getByTestId('disabled-flag-enabled')).toHaveTextContent('disabled');
    expect(screen.getByTestId('flags-count')).toHaveTextContent('2');
  });

  it('should initialize with SSR tenant data', async () => {
    const ssrState: InitialState = {
      tenant: mockTenant,
    };

    render(
      <IdentityProvider connector={connector} initialState={ssrState}>
        <TestComponent />
      </IdentityProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('tenant-info')).toHaveTextContent('Tenant: Test Organization');
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated');
    });
  });

  it('should initialize with SSR user data', async () => {
    const ssrState: InitialState = {
      tenant: mockTenant,
      user: mockUser,
    };

    render(
      <IdentityProvider connector={connector} initialState={ssrState}>
        <TestComponent />
      </IdentityProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated: John Doe');
      expect(screen.getByTestId('tenant-info')).toHaveTextContent('Tenant: Test Organization');
    });
  });

  it('should initialize with SSR feature flags', () => {
    const ssrState: InitialState = {
      tenant: mockTenant,
      user: mockUser,
      featureFlags: mockFeatureFlags,
    };

    render(
      <IdentityProvider connector={connector} initialState={ssrState}>
        <TestComponent />
      </IdentityProvider>
    );

    expect(screen.getByTestId('feature-flag')).toHaveTextContent('Feature enabled');
  });

  it('should initialize with SSR roles and permissions', () => {
    const ssrState: InitialState = {
      tenant: mockTenant,
      user: mockUser,
      roles: mockRoles,
      permissions: mockPermissions,
    };

    render(
      <IdentityProvider connector={connector} initialState={ssrState}>
        <TestComponent />
      </IdentityProvider>
    );

    expect(screen.getByTestId('role-check')).toHaveTextContent('Has admin role');
    expect(screen.getByTestId('permission-check')).toHaveTextContent('Can read users');
  });

  it('should initialize with complete SSR state', async () => {
    const ssrState: InitialState = {
      tenant: mockTenant,
      user: mockUser,
      roles: mockRoles,
      permissions: mockPermissions,
      featureFlags: mockFeatureFlags,
    };

    render(
      <IdentityProvider connector={connector} initialState={ssrState}>
        <TestComponent />
      </IdentityProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated: John Doe');
      expect(screen.getByTestId('tenant-info')).toHaveTextContent('Tenant: Test Organization');
      expect(screen.getByTestId('feature-flag')).toHaveTextContent('Feature enabled');
      expect(screen.getByTestId('role-check')).toHaveTextContent('Has admin role');
      expect(screen.getByTestId('permission-check')).toHaveTextContent('Can read users');
    });
  });

  it('should skip backend initialization when SSR data is complete', () => {
    const getTenantSpy = vi.spyOn(connector, 'getTenant');
    const getCurrentUserSpy = vi.spyOn(connector, 'getCurrentUser');

    const ssrState: InitialState = {
      tenant: mockTenant,
      user: mockUser,
    };

    render(
      <IdentityProvider connector={connector} initialState={ssrState}>
        <TestComponent />
      </IdentityProvider>
    );

    // Should not call backend methods when SSR data is provided
    expect(getTenantSpy).not.toHaveBeenCalled();
    expect(getCurrentUserSpy).not.toHaveBeenCalled();
  });

  it('should fall back to normal initialization when SSR data is incomplete', async () => {
    const ssrState: InitialState = {
      tenant: mockTenant,
      // Missing user data - should trigger normal initialization
    };

    render(
      <IdentityProvider connector={connector} initialState={ssrState}>
        <TestComponent />
      </IdentityProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('tenant-info')).toHaveTextContent('Tenant: Test Organization');
    });
  });

  it('should handle partial SSR state gracefully', async () => {
    const ssrState: InitialState = {
      tenant: mockTenant,
      // Missing user, roles, permissions, and feature flags
    };

    render(
      <IdentityProvider connector={connector} initialState={ssrState}>
        <TestComponent />
      </IdentityProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('tenant-info')).toHaveTextContent('Tenant: Test Organization');
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated');
      expect(screen.getByTestId('feature-flag')).toHaveTextContent('Feature disabled');
      expect(screen.getByTestId('role-check')).toHaveTextContent('No admin role');
      expect(screen.getByTestId('permission-check')).toHaveTextContent('Cannot read users');
    });
  });
});
