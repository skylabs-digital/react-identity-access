import { render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { IdentityProvider } from '../../providers/IdentityProvider';
import { LocalStorageConnector } from '../../connectors/localStorage/LocalStorageConnector';
import { testSeedData } from '../helpers/testSeedData';
import { RoleGuard, PermissionGuard } from '../../components/guards';

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

describe('Guard Components - Conditional Rendering Tests', () => {
  let connector: LocalStorageConnector;

  beforeEach(() => {
    connector = new LocalStorageConnector({
      simulateDelay: false,
      errorRate: 0,
      seedData: testSeedData,
    });

    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?tenant=acme-corp' },
      writable: true,
    });
  });

  describe('RoleGuard Component', () => {
    it('should hide content for unauthenticated users', async () => {
      const Wrapper = createWrapper(connector);

      render(
        <Wrapper>
          <RoleGuard roles={['admin']}>
            <div>Admin Only Content</div>
          </RoleGuard>
        </Wrapper>
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.queryByText('Admin Only Content')).not.toBeInTheDocument();
    });

    it('should show fallback for unauthorized users', async () => {
      const Wrapper = createWrapper(connector);

      render(
        <Wrapper>
          <RoleGuard roles={['admin']} fallback={<div>Admin access required</div>}>
            <div>Admin Only Content</div>
          </RoleGuard>
        </Wrapper>
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.getByText('Admin access required')).toBeInTheDocument();
      expect(screen.queryByText('Admin Only Content')).not.toBeInTheDocument();
    });

    it('should handle multiple roles with requireAny', async () => {
      const Wrapper = createWrapper(connector);

      render(
        <Wrapper>
          <RoleGuard
            roles={['admin', 'moderator']}
            requireAll={false}
            fallback={<div>Staff access required</div>}
          >
            <div>Staff Content</div>
          </RoleGuard>
        </Wrapper>
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.getByText('Staff access required')).toBeInTheDocument();
    });
  });

  describe('PermissionGuard Component', () => {
    it('should hide content for users without permissions', async () => {
      const Wrapper = createWrapper(connector);

      render(
        <Wrapper>
          <PermissionGuard permissions={['manage:users']}>
            <div>User Management</div>
          </PermissionGuard>
        </Wrapper>
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.queryByText('User Management')).not.toBeInTheDocument();
    });

    it('should show fallback for insufficient permissions', async () => {
      const Wrapper = createWrapper(connector);

      render(
        <Wrapper>
          <PermissionGuard
            permissions={['manage:users']}
            fallback={<div>Insufficient permissions</div>}
          >
            <div>User Management</div>
          </PermissionGuard>
        </Wrapper>
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.getByText('Insufficient permissions')).toBeInTheDocument();
    });

    it('should handle multiple permissions with requireAny', async () => {
      const Wrapper = createWrapper(connector);

      render(
        <Wrapper>
          <PermissionGuard
            permissions={['read:analytics', 'write:reports']}
            requireAll={false}
            fallback={<div>Analytics access required</div>}
          >
            <div>Analytics Dashboard</div>
          </PermissionGuard>
        </Wrapper>
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.getByText('Analytics access required')).toBeInTheDocument();
    });
  });

  describe('Nested Guards', () => {
    it('should handle nested role and permission guards', async () => {
      const Wrapper = createWrapper(connector);

      render(
        <Wrapper>
          <RoleGuard roles={['admin']} fallback={<div>Need admin role</div>}>
            <PermissionGuard
              permissions={['manage:users']}
              fallback={<div>Need user management permission</div>}
            >
              <div>Nested Protected Content</div>
            </PermissionGuard>
          </RoleGuard>
        </Wrapper>
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should show the first guard's fallback since user is not authenticated
      expect(screen.getByText('Need admin role')).toBeInTheDocument();
      expect(screen.queryByText('Need user management permission')).not.toBeInTheDocument();
      expect(screen.queryByText('Nested Protected Content')).not.toBeInTheDocument();
    });
  });
});
