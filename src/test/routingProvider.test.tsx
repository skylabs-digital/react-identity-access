import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { RoutingProvider, useRouting, useRoutingOptional } from '../providers/RoutingProvider';
import { DEFAULT_ZONE_ROOTS, DEFAULT_ZONE_PRESETS } from '../types/zoneRouting';

/**
 * Tests for RoutingProvider and related hooks
 */

describe('RoutingProvider', () => {
  describe('useRoutingOptional', () => {
    it('should return defaults when used outside RoutingProvider', () => {
      const { result } = renderHook(() => useRoutingOptional());

      expect(result.current.zoneRoots).toEqual(DEFAULT_ZONE_ROOTS);
      expect(result.current.presets).toEqual(DEFAULT_ZONE_PRESETS);
      expect(result.current.loadingFallback).toBeNull();
      expect(result.current.accessDeniedFallback).toBeNull();
      expect(result.current.onAccessDenied).toBeUndefined();
      expect(result.current.returnToParam).toBe('returnTo');
      expect(result.current.returnToStorage).toBe('url');
    });

    it('should return provider values when inside RoutingProvider', () => {
      const customConfig = {
        zoneRoots: {
          tenantGuest: '/auth/login',
          tenantUser: '/app/home',
        },
        returnToParam: 'redirect',
        returnToStorage: 'session' as const,
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <RoutingProvider config={customConfig}>{children}</RoutingProvider>
      );

      const { result } = renderHook(() => useRoutingOptional(), { wrapper });

      expect(result.current.zoneRoots.tenantGuest).toBe('/auth/login');
      expect(result.current.zoneRoots.tenantUser).toBe('/app/home');
      // Defaults should still be there for non-overridden values
      expect(result.current.zoneRoots.publicGuest).toBe('/');
      expect(result.current.returnToParam).toBe('redirect');
      expect(result.current.returnToStorage).toBe('session');
    });
  });

  describe('useRouting', () => {
    it('should throw error when used outside RoutingProvider', () => {
      const { result } = renderHook(() => {
        try {
          return useRouting();
        } catch (error) {
          return { error };
        }
      });

      expect((result.current as { error: Error }).error.message).toBe(
        'useRouting must be used within a RoutingProvider'
      );
    });

    it('should return context value when inside RoutingProvider', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <RoutingProvider>{children}</RoutingProvider>
      );

      const { result } = renderHook(() => useRouting(), { wrapper });

      expect(result.current.zoneRoots).toEqual(DEFAULT_ZONE_ROOTS);
      expect(result.current.presets).toEqual(DEFAULT_ZONE_PRESETS);
    });
  });

  describe('Config Merging', () => {
    it('should merge custom zoneRoots with defaults', () => {
      const customConfig = {
        zoneRoots: {
          tenantGuest: '/custom-login',
          tenantAdmin: '/custom-admin',
        },
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <RoutingProvider config={customConfig}>{children}</RoutingProvider>
      );

      const { result } = renderHook(() => useRouting(), { wrapper });

      // Custom values
      expect(result.current.zoneRoots.tenantGuest).toBe('/custom-login');
      expect(result.current.zoneRoots.tenantAdmin).toBe('/custom-admin');
      // Default values preserved
      expect(result.current.zoneRoots.publicGuest).toBe('/');
      expect(result.current.zoneRoots.publicUser).toBe('/account');
      expect(result.current.zoneRoots.tenantUser).toBe('/dashboard');
    });

    it('should merge custom presets with defaults', () => {
      const customConfig = {
        presets: {
          landing: { tenant: 'optional' as const, auth: 'optional' as const },
        },
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <RoutingProvider config={customConfig}>{children}</RoutingProvider>
      );

      const { result } = renderHook(() => useRouting(), { wrapper });

      // Custom preset
      expect(result.current.presets.landing).toEqual({
        tenant: 'optional',
        auth: 'optional',
      });
      // Default presets preserved
      expect(result.current.presets.login).toEqual(DEFAULT_ZONE_PRESETS.login);
      expect(result.current.presets.admin).toEqual(DEFAULT_ZONE_PRESETS.admin);
    });

    it('should accept onAccessDenied callback', () => {
      const onAccessDenied = vi.fn();
      const customConfig = { onAccessDenied };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <RoutingProvider config={customConfig}>{children}</RoutingProvider>
      );

      const { result } = renderHook(() => useRouting(), { wrapper });

      expect(result.current.onAccessDenied).toBe(onAccessDenied);
    });

    it('should accept loadingFallback and accessDeniedFallback', () => {
      const LoadingComponent = () => <div>Loading...</div>;
      const AccessDeniedComponent = () => <div>Access Denied</div>;

      const customConfig = {
        loadingFallback: <LoadingComponent />,
        accessDeniedFallback: <AccessDeniedComponent />,
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <RoutingProvider config={customConfig}>{children}</RoutingProvider>
      );

      const { result } = renderHook(() => useRouting(), { wrapper });

      expect(result.current.loadingFallback).not.toBeNull();
      expect(result.current.accessDeniedFallback).not.toBeNull();
    });
  });

  describe('returnTo Configuration', () => {
    it('should use default returnTo config', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <RoutingProvider>{children}</RoutingProvider>
      );

      const { result } = renderHook(() => useRouting(), { wrapper });

      expect(result.current.returnToParam).toBe('returnTo');
      expect(result.current.returnToStorage).toBe('url');
    });

    it('should allow custom returnTo param name', () => {
      const customConfig = {
        returnToParam: 'redirect_uri',
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <RoutingProvider config={customConfig}>{children}</RoutingProvider>
      );

      const { result } = renderHook(() => useRouting(), { wrapper });

      expect(result.current.returnToParam).toBe('redirect_uri');
    });

    it('should allow session storage for returnTo', () => {
      const customConfig = {
        returnToStorage: 'session' as const,
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <RoutingProvider config={customConfig}>{children}</RoutingProvider>
      );

      const { result } = renderHook(() => useRouting(), { wrapper });

      expect(result.current.returnToStorage).toBe('session');
    });

    it('should allow local storage for returnTo', () => {
      const customConfig = {
        returnToStorage: 'local' as const,
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <RoutingProvider config={customConfig}>{children}</RoutingProvider>
      );

      const { result } = renderHook(() => useRouting(), { wrapper });

      expect(result.current.returnToStorage).toBe('local');
    });
  });

  describe('Full Configuration', () => {
    it('should accept complete configuration', () => {
      const onAccessDenied = vi.fn();
      const fullConfig = {
        zoneRoots: {
          publicGuest: '/landing',
          publicUser: '/user-account',
          publicAdmin: '/admin-panel',
          tenantGuest: '/auth/signin',
          tenantUser: '/app/dashboard',
          tenantAdmin: '/app/admin',
          default: '/home',
        },
        presets: {
          landing: { tenant: 'forbidden' as const, auth: 'forbidden' as const },
        },
        loadingFallback: <div>Loading</div>,
        accessDeniedFallback: <div>Denied</div>,
        onAccessDenied,
        returnToParam: 'next',
        returnToStorage: 'session' as const,
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <RoutingProvider config={fullConfig}>{children}</RoutingProvider>
      );

      const { result } = renderHook(() => useRouting(), { wrapper });

      expect(result.current.zoneRoots.publicGuest).toBe('/landing');
      expect(result.current.zoneRoots.tenantUser).toBe('/app/dashboard');
      expect(result.current.presets.landing.auth).toBe('forbidden');
      expect(result.current.loadingFallback).not.toBeNull();
      expect(result.current.accessDeniedFallback).not.toBeNull();
      expect(result.current.onAccessDenied).toBe(onAccessDenied);
      expect(result.current.returnToParam).toBe('next');
      expect(result.current.returnToStorage).toBe('session');
    });
  });
});

describe('Smart Redirect Logic', () => {
  it('should determine correct redirect for guest without tenant', () => {
    const { result } = renderHook(() => useRoutingOptional());
    expect(result.current.zoneRoots.publicGuest).toBe('/');
  });

  it('should determine correct redirect for guest with tenant', () => {
    const { result } = renderHook(() => useRoutingOptional());
    expect(result.current.zoneRoots.tenantGuest).toBe('/login');
  });

  it('should determine correct redirect for user without tenant', () => {
    const { result } = renderHook(() => useRoutingOptional());
    expect(result.current.zoneRoots.publicUser).toBe('/account');
  });

  it('should determine correct redirect for user with tenant', () => {
    const { result } = renderHook(() => useRoutingOptional());
    expect(result.current.zoneRoots.tenantUser).toBe('/dashboard');
  });

  it('should determine correct redirect for admin without tenant', () => {
    const { result } = renderHook(() => useRoutingOptional());
    expect(result.current.zoneRoots.publicAdmin).toBe('/admin');
  });

  it('should determine correct redirect for admin with tenant', () => {
    const { result } = renderHook(() => useRoutingOptional());
    expect(result.current.zoneRoots.tenantAdmin).toBe('/admin/dashboard');
  });
});

describe('Preset Configuration', () => {
  it('should have correct landing preset', () => {
    const { result } = renderHook(() => useRoutingOptional());
    expect(result.current.presets.landing.tenant).toBe('forbidden');
    expect(result.current.presets.landing.auth).toBe('optional');
  });

  it('should have correct login preset', () => {
    const { result } = renderHook(() => useRoutingOptional());
    expect(result.current.presets.login.tenant).toBe('required');
    expect(result.current.presets.login.auth).toBe('forbidden');
  });

  it('should have correct authenticated preset', () => {
    const { result } = renderHook(() => useRoutingOptional());
    expect(result.current.presets.authenticated.auth).toBe('required');
  });

  it('should have correct tenant preset', () => {
    const { result } = renderHook(() => useRoutingOptional());
    expect(result.current.presets.tenant.tenant).toBe('required');
  });

  it('should have correct tenantAuth preset', () => {
    const { result } = renderHook(() => useRoutingOptional());
    expect(result.current.presets.tenantAuth.tenant).toBe('required');
    expect(result.current.presets.tenantAuth.auth).toBe('required');
  });

  it('should have correct admin preset with userType', () => {
    const { result } = renderHook(() => useRoutingOptional());
    expect(result.current.presets.admin.tenant).toBe('required');
    expect(result.current.presets.admin.auth).toBe('required');
    expect(result.current.presets.admin.userType).toBeDefined();
  });

  it('should have correct open preset', () => {
    const { result } = renderHook(() => useRoutingOptional());
    expect(result.current.presets.open.tenant).toBe('optional');
    expect(result.current.presets.open.auth).toBe('optional');
  });
});
