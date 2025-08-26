import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { useRoles } from '../../hooks/useRoles';
import { IdentityProvider } from '../../providers/IdentityProvider';
import { createTestConnector, createTestWrapper } from '../helpers/testUtils';

describe('useRoles Hook - Authorization Tests', () => {
  let connector: any;

  beforeEach(() => {
    connector = createTestConnector();

    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?tenant=acme-corp' },
      writable: true,
    });

    // Mock login functionality
    vi.spyOn(connector, 'login').mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'admin@acme.com',
        name: 'Admin User',
        tenantId: 'acme-corp',
        roles: ['admin', 'user'],
        permissions: ['users:read', 'users:write', 'read:users'],
      },
      token: 'mock-token',
      refreshToken: 'mock-refresh-token',
    });

    vi.spyOn(connector, 'getCurrentUser').mockRejectedValue(new Error('No session'));
  });

  describe('Role Checking', () => {
    it('should check user roles correctly for admin user', async () => {
      // Create wrapper with authenticated user SSR state
      const authenticatedWrapper = ({ children }: { children: React.ReactNode }) => (
        <IdentityProvider
          connector={connector}
          tenantResolver={{
            strategy: 'query-param',
            queryParam: { paramName: 'tenant', storageKey: 'test-tenant' },
          }}
          initialState={{
            user: {
              id: 'user-123',
              email: 'admin@acme.com',
              name: 'Admin User',
              tenantId: 'acme-corp',
              roles: ['admin'],
              permissions: ['users:read', 'users:write'],
              createdAt: new Date(),
              isActive: true,
            },
            tenant: {
              id: 'acme-corp',
              name: 'Acme Corporation',
              domain: 'acme.example.com',
              settings: {
                allowSelfRegistration: true,
                requireEmailVerification: false,
                sessionTimeout: 3600,
                maxConcurrentSessions: 5,
              },
              isActive: true,
              createdAt: new Date(),
            },
          }}
        >
          {children}
        </IdentityProvider>
      );

      const { result } = renderHook(() => useRoles(), { wrapper: authenticatedWrapper });

      // Wait for hook to initialize
      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      // Check admin role
      expect(result.current.hasRole('admin')).toBe(true);
      expect(result.current.hasRole('user')).toBe(false);
      expect(result.current.hasRole('super_admin')).toBe(false);
    });

    it('should check multiple roles with hasAnyRole', async () => {
      const authenticatedWrapper = ({ children }: { children: React.ReactNode }) => (
        <IdentityProvider
          connector={connector}
          tenantResolver={{
            strategy: 'query-param',
            queryParam: { paramName: 'tenant', storageKey: 'test-tenant' },
          }}
          initialState={{
            user: {
              id: 'user-123',
              email: 'admin@acme.com',
              name: 'Admin User',
              tenantId: 'acme-corp',
              roles: ['admin'],
              permissions: ['users:read', 'users:write'],
              createdAt: new Date(),
              isActive: true,
            },
            tenant: {
              id: 'acme-corp',
              name: 'Acme Corporation',
              domain: 'acme.example.com',
              settings: {
                allowSelfRegistration: true,
                requireEmailVerification: false,
                sessionTimeout: 3600,
                maxConcurrentSessions: 5,
              },
              isActive: true,
              createdAt: new Date(),
            },
          }}
        >
          {children}
        </IdentityProvider>
      );

      const { result } = renderHook(() => useRoles(), { wrapper: authenticatedWrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      expect(result.current.hasAnyRole(['admin', 'super_admin'])).toBe(true);
      expect(result.current.hasAnyRole(['user', 'moderator'])).toBe(false);
    });

    it('should check multiple roles with hasAllRoles', async () => {
      const authenticatedWrapper = ({ children }: { children: React.ReactNode }) => (
        <IdentityProvider
          connector={connector}
          tenantResolver={{
            strategy: 'query-param',
            queryParam: { paramName: 'tenant', storageKey: 'test-tenant' },
          }}
          initialState={{
            user: {
              id: 'user-123',
              email: 'admin@acme.com',
              name: 'Admin User',
              tenantId: 'acme-corp',
              roles: ['admin'],
              permissions: ['users:read', 'users:write'],
              createdAt: new Date(),
              isActive: true,
            },
            tenant: {
              id: 'acme-corp',
              name: 'Acme Corporation',
              domain: 'acme.example.com',
              settings: {
                allowSelfRegistration: true,
                requireEmailVerification: false,
                sessionTimeout: 3600,
                maxConcurrentSessions: 5,
              },
              isActive: true,
              createdAt: new Date(),
            },
          }}
        >
          {children}
        </IdentityProvider>
      );

      const { result } = renderHook(() => useRoles(), { wrapper: authenticatedWrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      // Admin user should have admin role but not user role
      expect(result.current.hasAllRoles(['admin'])).toBe(true);
      expect(result.current.hasAllRoles(['admin', 'user'])).toBe(false);
    });
  });

  describe('Permission Checking', () => {
    it('should check permissions correctly for admin user', async () => {
      const authenticatedWrapper = ({ children }: { children: React.ReactNode }) => (
        <IdentityProvider
          connector={connector}
          tenantResolver={{
            strategy: 'query-param',
            queryParam: { paramName: 'tenant', storageKey: 'test-tenant' },
          }}
          initialState={{
            user: {
              id: 'user-123',
              email: 'admin@acme.com',
              name: 'Admin User',
              tenantId: 'acme-corp',
              roles: ['admin'],
              permissions: ['users:read', 'users:write'],
              createdAt: new Date(),
              isActive: true,
            },
            tenant: {
              id: 'acme-corp',
              name: 'Acme Corporation',
              domain: 'acme.example.com',
              settings: {
                allowSelfRegistration: true,
                requireEmailVerification: false,
                sessionTimeout: 3600,
                maxConcurrentSessions: 5,
              },
              isActive: true,
              createdAt: new Date(),
            },
          }}
        >
          {children}
        </IdentityProvider>
      );

      const { result } = renderHook(() => useRoles(), { wrapper: authenticatedWrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      // Check permissions
      expect(result.current.hasPermission('users:read')).toBe(true);
      expect(result.current.hasPermission('users:write')).toBe(true);
      expect(result.current.hasPermission('admin:delete')).toBe(false);
    });

    it('should check permissions correctly for regular user', async () => {
      const authenticatedWrapper = ({ children }: { children: React.ReactNode }) => (
        <IdentityProvider
          connector={connector}
          tenantResolver={{
            strategy: 'query-param',
            queryParam: { paramName: 'tenant', storageKey: 'test-tenant' },
          }}
          initialState={{
            user: {
              id: 'user-456',
              email: 'user@acme.com',
              name: 'Regular User',
              tenantId: 'acme-corp',
              roles: ['user'],
              permissions: ['users:read'],
              createdAt: new Date(),
              isActive: true,
            },
            tenant: {
              id: 'acme-corp',
              name: 'Acme Corporation',
              domain: 'acme.example.com',
              settings: {
                allowSelfRegistration: true,
                requireEmailVerification: false,
                sessionTimeout: 3600,
                maxConcurrentSessions: 5,
              },
              isActive: true,
              createdAt: new Date(),
            },
          }}
        >
          {children}
        </IdentityProvider>
      );

      const { result } = renderHook(() => useRoles(), { wrapper: authenticatedWrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      // Check permissions for regular user
      expect(result.current.hasPermission('users:read')).toBe(true);
      expect(result.current.hasPermission('users:write')).toBe(false);
      expect(result.current.hasPermission('admin:delete')).toBe(false);
    });

    it('should use canAccess helper for resource-action patterns', async () => {
      const authenticatedWrapper = ({ children }: { children: React.ReactNode }) => (
        <IdentityProvider
          connector={connector}
          tenantResolver={{
            strategy: 'query-param',
            queryParam: { paramName: 'tenant', storageKey: 'test-tenant' },
          }}
          initialState={{
            user: {
              id: 'user-123',
              email: 'admin@acme.com',
              name: 'Admin User',
              tenantId: 'acme-corp',
              roles: ['admin'],
              permissions: ['users:read', 'users:write'],
              createdAt: new Date(),
              isActive: true,
            },
            tenant: {
              id: 'acme-corp',
              name: 'Acme Corporation',
              domain: 'acme.example.com',
              settings: {
                allowSelfRegistration: true,
                requireEmailVerification: false,
                sessionTimeout: 3600,
                maxConcurrentSessions: 5,
              },
              isActive: true,
              createdAt: new Date(),
            },
          }}
        >
          {children}
        </IdentityProvider>
      );

      const { result } = renderHook(() => useRoles(), { wrapper: authenticatedWrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      // Check resource-action patterns
      expect(result.current.canAccess('read', 'users')).toBe(true);
      expect(result.current.canAccess('write', 'users')).toBe(true);
      expect(result.current.canAccess('delete', 'admin')).toBe(false);
    });
  });

  describe('Unauthenticated State', () => {
    it('should return false for all checks when not authenticated', async () => {
      const wrapper = createTestWrapper(connector);
      const { result } = renderHook(() => useRoles(), { wrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      expect(result.current.hasRole('admin')).toBe(false);
      expect(result.current.hasPermission('read:users')).toBe(false);
      expect(result.current.canAccess('users', 'read')).toBe(false);
      expect(result.current.hasAnyRole(['admin', 'user'])).toBe(false);
      expect(result.current.hasAllRoles(['admin'])).toBe(false);
    });
  });
});
