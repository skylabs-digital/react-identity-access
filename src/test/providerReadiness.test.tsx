import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';

import type { LoginParams } from '../types/authParams';

// ============================================================================
// Optional Hooks Tests
// ============================================================================

describe('Optional Hooks', () => {
  describe('useAuthOptional', () => {
    it('should return null when not inside AuthProvider', async () => {
      const { useAuthOptional } = await import('../providers/AuthProvider');

      const { result } = renderHook(() => useAuthOptional());

      expect(result.current).toBeNull();
    });
  });

  describe('useAppOptional', () => {
    it('should return null when not inside AppProvider', async () => {
      const { useAppOptional } = await import('../providers/AppProvider');

      const { result } = renderHook(() => useAppOptional());

      expect(result.current).toBeNull();
    });
  });

  describe('useTenantOptional', () => {
    it('should return null when not inside TenantProvider', async () => {
      const { useTenantOptional } = await import('../providers/TenantProvider');

      const { result } = renderHook(() => useTenantOptional());

      expect(result.current).toBeNull();
    });
  });

  describe('useFeatureFlagsOptional', () => {
    it('should return null when not inside FeatureFlagProvider', async () => {
      const { useFeatureFlagsOptional } = await import('../providers/FeatureFlagProvider');

      const { result } = renderHook(() => useFeatureFlagsOptional());

      expect(result.current).toBeNull();
    });
  });

  describe('useSubscriptionOptional', () => {
    it('should return null when not inside SubscriptionProvider', async () => {
      const { useSubscriptionOptional } = await import('../providers/SubscriptionProvider');

      const { result } = renderHook(() => useSubscriptionOptional());

      expect(result.current).toBeNull();
    });
  });
});

// ============================================================================
// Required Hooks Throw Error Tests
// ============================================================================

describe('Required Hooks throw when used outside provider', () => {
  it('useAuth should throw when not inside AuthProvider', async () => {
    const { useAuth } = await import('../providers/AuthProvider');

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });

  it('useApp should throw when not inside AppProvider', async () => {
    const { useApp } = await import('../providers/AppProvider');

    expect(() => {
      renderHook(() => useApp());
    }).toThrow('useApp must be used within an AppProvider');
  });

  it('useTenant should throw when not inside TenantProvider', async () => {
    const { useTenant } = await import('../providers/TenantProvider');

    expect(() => {
      renderHook(() => useTenant());
    }).toThrow('useTenant must be used within a TenantProvider');
  });

  it('useFeatureFlags should throw when not inside FeatureFlagProvider', async () => {
    const { useFeatureFlags } = await import('../providers/FeatureFlagProvider');

    expect(() => {
      renderHook(() => useFeatureFlags());
    }).toThrow('useFeatureFlags must be used within a FeatureFlagProvider');
  });

  it('useSubscription should throw when not inside SubscriptionProvider', async () => {
    const { useSubscription } = await import('../providers/SubscriptionProvider');

    expect(() => {
      renderHook(() => useSubscription());
    }).toThrow('useSubscription must be used within a SubscriptionProvider');
  });
});

// ============================================================================
// LoginParams redirectPath Tests
// ============================================================================

describe('LoginParams redirectPath', () => {
  it('should accept redirectPath as optional parameter', () => {
    const paramsWithRedirect: LoginParams = {
      username: 'user@example.com',
      password: 'password123',
      tenantSlug: 'new-tenant',
      redirectPath: '/dashboard',
    };

    expect(paramsWithRedirect.redirectPath).toBe('/dashboard');
  });

  it('should work without redirectPath', () => {
    const paramsWithoutRedirect: LoginParams = {
      username: 'user@example.com',
      password: 'password123',
    };

    expect(paramsWithoutRedirect.redirectPath).toBeUndefined();
  });

  it('should accept various path formats', () => {
    const testPaths = [
      '/dashboard',
      '/onboarding',
      '/settings/profile',
      '/app?query=test',
      '/app#section',
      '/',
    ];

    testPaths.forEach(path => {
      const params: LoginParams = {
        username: 'user@example.com',
        password: 'password123',
        tenantSlug: 'tenant',
        redirectPath: path,
      };
      expect(params.redirectPath).toBe(path);
    });
  });

  it('should combine with tenantSlug for cross-tenant redirect', () => {
    const params: LoginParams = {
      username: 'user@example.com',
      password: 'password123',
      tenantSlug: 'other-tenant',
      redirectPath: '/onboarding',
    };

    expect(params.tenantSlug).toBe('other-tenant');
    expect(params.redirectPath).toBe('/onboarding');
  });
});
