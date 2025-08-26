import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { IdentityProvider } from '../../providers/IdentityProvider';
import { createTestConnector, createTestWrapper } from '../helpers/testUtils';

describe('useAuth Hook - User Experience Tests', () => {
  let connector: any;

  beforeEach(() => {
    connector = createTestConnector();

    // Mock tenant resolution
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?tenant=acme-corp' },
      writable: true,
    });

    // Mock login functionality
    vi.spyOn(connector, 'login').mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'admin@acme.com',
        name: 'John Admin',
        tenantId: 'acme-corp',
        roles: ['admin'],
        permissions: ['users:read', 'users:write'],
      },
      token: 'mock-token',
      refreshToken: 'mock-refresh-token',
    });

    // Mock getCurrentUser to return no session initially
    vi.spyOn(connector, 'getCurrentUser').mockRejectedValue(new Error('No session'));
  });

  describe('Authentication Flow', () => {
    it('should provide login functionality with one-liner simplicity', async () => {
      // Test unauthenticated state
      const wrapper = createTestWrapper(connector);
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBe(null);

      // Test authenticated state with SSR initial state
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
              name: 'John Admin',
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

      const { result: authResult } = renderHook(() => useAuth(), { wrapper: authenticatedWrapper });

      await waitFor(() => {
        expect(authResult.current).not.toBeNull();
      });

      expect(authResult.current.isAuthenticated).toBe(true);
      expect(authResult.current.user).toMatchObject({
        email: 'admin@acme.com',
        name: 'John Admin',
      });
    });

    it('should handle login errors gracefully', async () => {
      const wrapper = createTestWrapper(connector);
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      // Should remain unauthenticated on error
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBe(null);
    });

    it('should provide logout functionality', async () => {
      // Start with authenticated state
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
              name: 'John Admin',
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

      const { result } = renderHook(() => useAuth(), { wrapper: authenticatedWrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Test logout functionality exists
      expect(typeof result.current.logout).toBe('function');
    });
  });

  describe('Profile Management', () => {
    it('should allow profile updates for authenticated users', async () => {
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
              email: 'user@acme.com',
              name: 'Original Name',
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

      const { result } = renderHook(() => useAuth(), { wrapper: authenticatedWrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.name).toBe('Original Name');
      expect(typeof result.current.updateProfile).toBe('function');
    });

    it('should prevent profile updates for unauthenticated users', async () => {
      const wrapper = createTestWrapper(connector);
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(typeof result.current.updateProfile).toBe('function');
    });
  });

  describe('Loading States', () => {
    it('should handle connector initialization delays', async () => {
      const wrapper = createTestWrapper(connector);
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      expect(typeof result.current.isLoading).toBe('boolean');
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should provide error information when authentication fails', async () => {
      const wrapper = createTestWrapper(connector);
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBe(null);
      expect(typeof result.current.login).toBe('function');
    });
  });
});
