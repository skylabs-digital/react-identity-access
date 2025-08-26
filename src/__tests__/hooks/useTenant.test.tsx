import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTenant } from '../../hooks/useTenant';
import { createTestConnector, createTestWrapper } from '../helpers/testUtils';

describe('useTenant Hook - Multi-tenancy Tests', () => {
  let connector: any;

  beforeEach(async () => {
    connector = createTestConnector();

    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?tenant=acme-corp' },
      writable: true,
    });

    // Mock tenant data
    const mockTenant = {
      id: 'acme-corp',
      name: 'Acme Corporation',
      domain: 'acme.example.com',
      settings: {
        allowSelfRegistration: true,
        requireEmailVerification: false,
        sessionTimeout: 3600,
        maxConcurrentSessions: 5,
        customBranding: { primaryColor: '#007bff' },
      },
      isActive: true,
      createdAt: new Date(),
    };

    // Mock connector methods
    vi.spyOn(connector, 'getTenant').mockResolvedValue(mockTenant);
    vi.spyOn(connector, 'getCurrentUser').mockRejectedValue(new Error('No session'));

    // Mock login to return a user
    const mockUser = {
      id: 'user-123',
      email: 'admin@acme.com',
      name: 'Admin User',
      roles: ['admin'],
      permissions: ['users:read', 'users:write'],
      tenants: ['acme-corp', 'tech-startup'],
    };

    vi.spyOn(connector, 'login').mockResolvedValue({
      user: mockUser,
      token: 'mock-token',
      refreshToken: 'mock-refresh-token',
    });

    // Mock getUserTenants for tenant switching
    vi.spyOn(connector, 'getUserTenants').mockResolvedValue([
      mockTenant,
      {
        id: 'tech-startup',
        name: 'Tech Startup',
        domain: 'tech.example.com',
        settings: {},
        isActive: true,
        createdAt: new Date(),
      },
    ]);
  });

  describe('Tenant Resolution', () => {
    it('should resolve tenant from query parameter', async () => {
      const wrapper = createTestWrapper(connector);
      const { result } = renderHook(() => useTenant(), { wrapper });

      // Wait for tenant resolution
      await waitFor(() => {
        expect(result.current).not.toBeNull();
        expect(result.current.currentTenant).not.toBeNull();
      });

      expect(result.current.currentTenant).toMatchObject({
        id: 'acme-corp',
        name: 'Acme Corporation',
        domain: 'acme.example.com',
        isActive: true,
      });
    });

    it('should indicate when tenant is active', async () => {
      const wrapper = createTestWrapper(connector);
      const { result } = renderHook(() => useTenant(), { wrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
        expect(result.current.currentTenant).not.toBeNull();
      });

      expect(result.current.isTenantActive).toBe(true);
    });
  });

  describe('Tenant Settings', () => {
    it('should provide tenant settings access', async () => {
      const wrapper = createTestWrapper(connector);
      const { result } = renderHook(() => useTenant(), { wrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
        expect(result.current.currentTenant).not.toBeNull();
      });

      // Test nested settings access
      expect(result.current.getTenantSetting('allowSelfRegistration')).toBe(true);
      expect(result.current.getTenantSetting('customBranding.primaryColor')).toBe('#007bff');
      expect(result.current.getTenantSetting('sessionTimeout')).toBe(3600);
    });

    it('should return default values for missing settings', async () => {
      const wrapper = createTestWrapper(connector);
      const { result } = renderHook(() => useTenant(), { wrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      expect(result.current.getTenantSetting('nonExistentSetting', 'default')).toBe('default');
      expect(result.current.getTenantSetting('nested.missing.path', false)).toBe(false);
    });
  });

  describe('Tenant Switching', () => {
    it('should allow authenticated users to switch tenants', async () => {
      // Mock authenticated user in connector
      vi.spyOn(connector, 'getCurrentUser').mockResolvedValue({
        id: 'user-123',
        email: 'admin@acme.com',
        name: 'Admin User',
        roles: ['admin'],
        permissions: ['users:read', 'users:write'],
        tenants: ['acme-corp', 'tech-startup'],
      });

      const wrapper = createTestWrapper(connector);
      const { result } = renderHook(() => useTenant(), { wrapper });

      // Wait for hooks to initialize
      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      // Mock window.location for redirect
      const mockLocation = {
        ...window.location,
        href: 'https://acme.example.com?tenant=acme-corp',
        search: '?tenant=acme-corp',
      };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });

      // Switch tenant - this should work since we have a mocked authenticated user
      await act(async () => {
        await result.current.switchTenant('tech-startup');
      });

      // Should update URL (either query-param or subdomain strategy)
      expect(mockLocation.href).toMatch(/(tenant=tech-startup|tech-startup\.example\.com)/);
    });

    it('should prevent unauthenticated users from switching tenants', async () => {
      const wrapper = createTestWrapper(connector);
      const { result } = renderHook(() => useTenant(), { wrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      await expect(result.current.switchTenant('tech-startup')).rejects.toThrow(
        'User must be authenticated to switch tenants'
      );
    });

    it('should prevent switching to unauthorized tenants', async () => {
      // Mock authenticated user in connector
      vi.spyOn(connector, 'getCurrentUser').mockResolvedValue({
        id: 'user-123',
        email: 'admin@acme.com',
        name: 'Admin User',
        roles: ['admin'],
        permissions: ['users:read', 'users:write'],
        tenants: ['acme-corp', 'tech-startup'],
      });

      const wrapper = createTestWrapper(connector);
      const { result } = renderHook(() => useTenant(), { wrapper });

      // Wait for hooks to initialize
      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      await expect(result.current.switchTenant('unauthorized-tenant')).rejects.toThrow(
        'User does not have access to this tenant'
      );
    });
  });

  describe('Loading States', () => {
    it('should provide loading state during tenant resolution', async () => {
      const wrapper = createTestWrapper(connector);
      const { result } = renderHook(() => useTenant(), { wrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      // Check that loading state exists (may be true or false depending on timing)
      expect(typeof result.current.isLoading).toBe('boolean');
    });
  });
});
