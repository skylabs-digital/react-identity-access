import { screen, waitFor, cleanup } from '@testing-library/react';
import { ProtectedRoute } from '../../components/guards/ProtectedRoute';
import { LocalStorageConnector } from '../../connectors/localStorage/LocalStorageConnector';
import {
  renderWithIdentityProvider,
  createTestConnector,
  setupAuthenticatedUser,
  setupUnauthenticatedUser,
} from '../helpers/testUtils';

describe('ProtectedRoute Component - Access Control Tests', () => {
  let connector: LocalStorageConnector;

  beforeEach(() => {
    connector = createTestConnector();

    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?tenant=acme-corp' },
      writable: true,
    });
  });

  afterEach(() => {
    cleanup();
    // Clear all localStorage to prevent test pollution
    localStorage.clear();
  });

  describe('Authentication Protection', () => {
    it('should show content for authenticated users', async () => {
      await setupAuthenticatedUser();

      await renderWithIdentityProvider(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
        { connector }
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should show access denied for unauthenticated users', async () => {
      setupUnauthenticatedUser();

      await renderWithIdentityProvider(
        <ProtectedRoute requireAuth={true}>
          <div>Protected Content</div>
        </ProtectedRoute>,
        { connector }
      );

      // Wait for the component to finish loading and render the access denied message
      await waitFor(() => {
        expect(screen.getByText('Access denied. Please log in.')).toBeInTheDocument();
      });

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Role-based Access Control', () => {
    it('should allow access with correct roles', async () => {
      await setupAuthenticatedUser();

      await renderWithIdentityProvider(
        <ProtectedRoute requireRoles={['admin']}>
          <div>Admin Content</div>
        </ProtectedRoute>,
        { connector }
      );

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });

    it('should deny access without required roles', async () => {
      await setupAuthenticatedUser();

      await renderWithIdentityProvider(
        <ProtectedRoute requireRoles={['super-admin']}>
          <div>Super Admin Content</div>
        </ProtectedRoute>,
        { connector }
      );

      expect(screen.queryByText('Super Admin Content')).not.toBeInTheDocument();
    });
  });

  describe('Permission-based Access Control', () => {
    it('should allow access with correct permissions', async () => {
      await setupAuthenticatedUser();

      await renderWithIdentityProvider(
        <ProtectedRoute requirePermissions={['read:analytics']}>
          <div>Analytics Dashboard</div>
        </ProtectedRoute>,
        { connector }
      );

      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    it('should deny access without required permissions', async () => {
      await setupAuthenticatedUser();

      await renderWithIdentityProvider(
        <ProtectedRoute requirePermissions={['manage:system']}>
          <div>System Management</div>
        </ProtectedRoute>,
        { connector }
      );

      expect(screen.queryByText('System Management')).not.toBeInTheDocument();
    });
  });
});
