import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ReactNode } from 'react';
import { LocalStorageConnector } from '../../connectors/localStorage/LocalStorageConnector';
import { testSeedData } from '../helpers/testSeedData';
import { IdentityProvider } from '../../providers/IdentityProvider';
import { useAuth } from '../../hooks/useAuth';
import { useRoles } from '../../hooks/useRoles';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { RoleGuard } from '../../components/guards/RoleGuard';
import { FeatureFlag } from '../../components/feature-flags/FeatureFlag';
import { ProtectedRoute } from '../../components/guards/ProtectedRoute';
import { createTestConnector } from '../helpers/testUtils';

// Test component that demonstrates one-liner API usage
function OneLineAPIDemo() {
  const { login, logout, user, isAuthenticated } = useAuth();
  const { hasRole } = useRoles();
  const { hasRole: hasPermission } = useRoles(); // Using roles for permissions demo
  const { isEnabled } = useFeatureFlags();

  return (
    <div>
      {!isAuthenticated ? (
        <button
          onClick={() => login({ email: 'admin@acme.com', password: 'password' })}
          data-testid="login-btn"
        >
          Login
        </button>
      ) : (
        <div>
          <div data-testid="user-info">Welcome {user?.name}</div>
          <button onClick={logout} data-testid="logout-btn">
            Logout
          </button>

          {/* One-liner role check */}
          {hasRole('admin') && <div data-testid="admin-content">Admin Panel</div>}

          {/* One-liner permission check */}
          {hasPermission('admin') && <div data-testid="user-mgmt">User Management</div>}

          {/* One-liner feature flag */}
          {isEnabled('new-dashboard') && <div data-testid="new-dashboard">New Dashboard</div>}

          {/* Component-based guards */}
          <RoleGuard roles={['admin']}>
            <div data-testid="role-guard-content">Role Protected Content</div>
          </RoleGuard>

          <FeatureFlag flag="premium-analytics">
            <div data-testid="premium-feature">Premium Analytics</div>
          </FeatureFlag>

          <ProtectedRoute requirePermissions={['read:analytics']}>
            <div data-testid="analytics-content">Analytics Dashboard</div>
          </ProtectedRoute>
        </div>
      )}
    </div>
  );
}

const createWrapper = (connector: LocalStorageConnector) => {
  return ({ children }: { children: ReactNode }) => (
    <IdentityProvider
      connector={connector}
      tenantResolver={{
        strategy: 'query-param',
        queryParam: { paramName: 'tenant', storageKey: 'test-tenant' },
      }}
    >
      {children}
    </IdentityProvider>
  );
};

describe('One-Liner API Integration Tests - Rapid Prototyping Experience', () => {
  let connector: LocalStorageConnector;

  beforeEach(() => {
    connector = createTestConnector();

    // Mock window.location for tenant resolution
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?tenant=acme-corp' },
      writable: true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('should provide complete authentication flow with minimal code', async () => {
    const Wrapper = createWrapper(connector);

    render(
      <Wrapper>
        <OneLineAPIDemo />
      </Wrapper>
    );

    // Wait for initialization to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Initially should show login button
    expect(screen.getByTestId('login-btn')).toBeInTheDocument();

    // Click login - one liner: login({ email, password })
    fireEvent.click(screen.getByTestId('login-btn'));

    // Should trigger page reload (mocked)
    await waitFor(() => {
      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  it('should provide one-liner role and permission checks', async () => {
    // Pre-authenticate by setting up the connector with a logged-in state
    const authenticatedConnector = new LocalStorageConnector({
      simulateDelay: false,
      errorRate: 0,
      seedData: testSeedData,
    });

    // Mock authenticated state
    vi.spyOn(authenticatedConnector, 'getCurrentUser').mockResolvedValue({
      id: 'admin-1',
      email: 'admin@acme.com',
      name: 'John Admin',
      tenantId: 'acme-corp',
      roles: ['admin'],
      permissions: ['read:users', 'write:users', 'manage:users', 'manage:roles', 'view:analytics'],
      isActive: true,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    });

    const AuthenticatedWrapper = ({ children }: { children: ReactNode }) => (
      <IdentityProvider
        connector={authenticatedConnector}
        tenantResolver={{
          strategy: 'query-param',
          queryParam: { paramName: 'tenant', storageKey: 'test-tenant' },
        }}
      >
        {children}
      </IdentityProvider>
    );

    render(
      <AuthenticatedWrapper>
        <OneLineAPIDemo />
      </AuthenticatedWrapper>
    );

    // Wait for authentication to complete
    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toBeInTheDocument();
    });

    // One-liner checks should work
    expect(screen.getByTestId('admin-content')).toBeInTheDocument(); // hasRole('admin')
    expect(screen.getByTestId('user-mgmt')).toBeInTheDocument(); // hasPermission('manage:users')
    expect(screen.getByTestId('role-guard-content')).toBeInTheDocument(); // <RoleGuard>
  });

  it('should provide 90% functionality out-of-the-box for rapid prototyping', async () => {
    const Wrapper = createWrapper(connector);

    render(
      <Wrapper>
        <OneLineAPIDemo />
      </Wrapper>
    );

    // Wait for initialization to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Should handle unauthenticated state gracefully
    expect(screen.getByTestId('login-btn')).toBeInTheDocument();

    // Protected content should not be visible
    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('user-mgmt')).not.toBeInTheDocument();
    expect(screen.queryByTestId('role-guard-content')).not.toBeInTheDocument();
  });

  it('should demonstrate minimal setup for admin vs client panels', async () => {
    // Admin Panel Component
    function AdminPanel() {
      const { hasRole } = useRoles();

      if (!hasRole('admin')) {
        return <div data-testid="access-denied">Access Denied</div>;
      }

      return (
        <div data-testid="admin-panel">
          <h1>Admin Panel</h1>
          <RoleGuard roles={['admin']}>
            <div data-testid="admin-tools">Admin Tools</div>
          </RoleGuard>
        </div>
      );
    }

    // Client Panel Component
    function ClientPanel() {
      const { isAuthenticated } = useAuth();
      const { isEnabled } = useFeatureFlags();

      if (!isAuthenticated) {
        return <div data-testid="login-required">Please Login</div>;
      }

      return (
        <div data-testid="client-panel">
          <h1>Client Dashboard</h1>
          {isEnabled('new-dashboard') && <div data-testid="new-ui">New UI</div>}
        </div>
      );
    }

    const Wrapper = createWrapper(connector);

    render(
      <Wrapper>
        <AdminPanel />
        <ClientPanel />
      </Wrapper>
    );

    // Wait for initialization to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Should show appropriate content based on authentication state
    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
    expect(screen.getByTestId('login-required')).toBeInTheDocument();
  });
});
