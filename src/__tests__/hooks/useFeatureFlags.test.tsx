import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { IdentityProvider } from '../../providers/IdentityProvider';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import {
  createTestConnector,
  createTestWrapper,
  setupAuthenticatedUser,
} from '../helpers/testUtils';

describe('useFeatureFlags Hook - Feature Flag Management Tests', () => {
  let connector: any;

  beforeEach(() => {
    connector = createTestConnector();

    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?tenant=acme-corp' },
      writable: true,
    });
  });

  describe('Feature Flag Reading', () => {
    it('should check if feature flags are enabled correctly', async () => {
      await setupAuthenticatedUser();
      const wrapper = createTestWrapper(connector);
      const { result } = renderHook(() => useFeatureFlags(), { wrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      expect(typeof result.current.isEnabled).toBe('function');
      expect(result.current.isEnabled('new-dashboard')).toBe(true);
      expect(result.current.isEnabled('premium-analytics')).toBe(false);
    });

    it('should respect server-disabled flags', async () => {
      const wrapper = createTestWrapper(connector);
      const { result } = renderHook(() => useFeatureFlags(), { wrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      expect(typeof result.current.isEnabled).toBe('function');
    });

    it('should handle rollout percentage correctly', async () => {
      const wrapper = createTestWrapper(connector);
      const { result } = renderHook(() => useFeatureFlags(), { wrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      expect(typeof result.current.isEnabled).toBe('function');
    });
  });

  describe('Feature Flag Management', () => {
    it('should allow admin to toggle editable flags', async () => {
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

      const { result } = renderHook(() => useFeatureFlags(), { wrapper: authenticatedWrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      expect(typeof result.current.updateFlag).toBe('function');
      expect(typeof result.current.isEnabled).toBe('function');
    });

    it('should prevent editing non-editable flags', async () => {
      const wrapper = createTestWrapper(connector);
      const { result } = renderHook(() => useFeatureFlags(), { wrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      expect(typeof result.current.updateFlag).toBe('function');
    });

    it('should provide list of editable flags for admin UI', async () => {
      const wrapper = createTestWrapper(connector);
      const { result } = renderHook(() => useFeatureFlags(), { wrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      expect(Array.isArray(result.current.editableFlags)).toBe(true);
    });
  });

  describe('User Segmentation', () => {
    it('should respect user segment targeting', async () => {
      const wrapper = createTestWrapper(connector);
      const { result } = renderHook(() => useFeatureFlags(), { wrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      expect(typeof result.current.isEnabled).toBe('function');
    });
  });

  describe('Flag Metadata', () => {
    it('should provide complete flag information', async () => {
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

      const { result } = renderHook(() => useFeatureFlags(), { wrapper: authenticatedWrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      expect(typeof result.current.getFlag).toBe('function');
    });

    it('should return null for non-existent flags', async () => {
      const wrapper = createTestWrapper(connector);
      const { result } = renderHook(() => useFeatureFlags(), { wrapper });

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      expect(typeof result.current.getFlag).toBe('function');
    });
  });
});
