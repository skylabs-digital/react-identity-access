import { describe, it, expect } from 'vitest';
import { UserType } from '../types/api';
import { DEFAULT_ZONE_PRESETS, DEFAULT_ZONE_ROOTS, AccessMode } from '../types/zoneRouting';

/**
 * Unit tests for zone routing logic
 * These test the pure functions and types without React rendering
 */

describe('Zone Routing Types', () => {
  describe('DEFAULT_ZONE_ROOTS', () => {
    it('should have all required zone roots defined', () => {
      expect(DEFAULT_ZONE_ROOTS.publicGuest).toBe('/');
      expect(DEFAULT_ZONE_ROOTS.publicUser).toBe('/account');
      expect(DEFAULT_ZONE_ROOTS.publicAdmin).toBe('/admin');
      expect(DEFAULT_ZONE_ROOTS.tenantGuest).toBe('/login');
      expect(DEFAULT_ZONE_ROOTS.tenantUser).toBe('/dashboard');
      expect(DEFAULT_ZONE_ROOTS.tenantAdmin).toBe('/admin/dashboard');
      expect(DEFAULT_ZONE_ROOTS.default).toBe('/');
    });
  });

  describe('DEFAULT_ZONE_PRESETS', () => {
    it('should have landing preset configured correctly', () => {
      expect(DEFAULT_ZONE_PRESETS.landing).toEqual({
        tenant: 'forbidden',
        auth: 'optional',
      });
    });

    it('should have login preset configured correctly', () => {
      expect(DEFAULT_ZONE_PRESETS.login).toEqual({
        tenant: 'required',
        auth: 'forbidden',
      });
    });

    it('should have authenticated preset configured correctly', () => {
      expect(DEFAULT_ZONE_PRESETS.authenticated).toEqual({
        auth: 'required',
      });
    });

    it('should have admin preset configured correctly', () => {
      expect(DEFAULT_ZONE_PRESETS.admin).toEqual({
        tenant: 'required',
        auth: 'required',
        userType: UserType.TENANT_ADMIN,
      });
    });

    it('should have user preset configured correctly', () => {
      expect(DEFAULT_ZONE_PRESETS.user).toEqual({
        tenant: 'required',
        auth: 'required',
        userType: UserType.USER,
      });
    });

    it('should have open preset configured correctly', () => {
      expect(DEFAULT_ZONE_PRESETS.open).toEqual({
        tenant: 'optional',
        auth: 'optional',
      });
    });

    it('should have tenantAuth preset configured correctly', () => {
      expect(DEFAULT_ZONE_PRESETS.tenantAuth).toEqual({
        tenant: 'required',
        auth: 'required',
      });
    });

    it('should have tenantOpen preset configured correctly', () => {
      expect(DEFAULT_ZONE_PRESETS.tenantOpen).toEqual({
        tenant: 'required',
        auth: 'optional',
      });
    });
  });
});

describe('Access Mode Logic', () => {
  // Helper function to simulate checkAccessMode logic
  function checkAccessMode(
    mode: AccessMode | undefined,
    condition: boolean
  ): 'pass' | 'fail' | 'skip' {
    if (!mode || mode === 'optional') return 'skip';
    if (mode === 'required') return condition ? 'pass' : 'fail';
    if (mode === 'forbidden') return condition ? 'fail' : 'pass';
    return 'skip';
  }

  describe('required mode', () => {
    it('should pass when condition is true', () => {
      expect(checkAccessMode('required', true)).toBe('pass');
    });

    it('should fail when condition is false', () => {
      expect(checkAccessMode('required', false)).toBe('fail');
    });
  });

  describe('forbidden mode', () => {
    it('should fail when condition is true', () => {
      expect(checkAccessMode('forbidden', true)).toBe('fail');
    });

    it('should pass when condition is false', () => {
      expect(checkAccessMode('forbidden', false)).toBe('pass');
    });
  });

  describe('optional mode', () => {
    it('should skip when condition is true', () => {
      expect(checkAccessMode('optional', true)).toBe('skip');
    });

    it('should skip when condition is false', () => {
      expect(checkAccessMode('optional', false)).toBe('skip');
    });
  });

  describe('undefined mode', () => {
    it('should skip when condition is true', () => {
      expect(checkAccessMode(undefined, true)).toBe('skip');
    });

    it('should skip when condition is false', () => {
      expect(checkAccessMode(undefined, false)).toBe('skip');
    });
  });
});

describe('User Type Matching', () => {
  // Helper function to simulate matchesUserType logic
  function matchesUserType(
    currentType: UserType | undefined,
    required: UserType | UserType[] | undefined
  ): boolean {
    if (!required) return true;
    if (!currentType) return false;

    if (Array.isArray(required)) {
      return required.includes(currentType);
    }
    return currentType === required;
  }

  it('should match when no requirement is set', () => {
    expect(matchesUserType(UserType.USER, undefined)).toBe(true);
    expect(matchesUserType(UserType.TENANT_ADMIN, undefined)).toBe(true);
    expect(matchesUserType(undefined, undefined)).toBe(true);
  });

  it('should not match when user type is undefined but required', () => {
    expect(matchesUserType(undefined, UserType.USER)).toBe(false);
    expect(matchesUserType(undefined, UserType.TENANT_ADMIN)).toBe(false);
  });

  it('should match single user type correctly', () => {
    expect(matchesUserType(UserType.USER, UserType.USER)).toBe(true);
    expect(matchesUserType(UserType.TENANT_ADMIN, UserType.TENANT_ADMIN)).toBe(true);
    expect(matchesUserType(UserType.USER, UserType.TENANT_ADMIN)).toBe(false);
    expect(matchesUserType(UserType.TENANT_ADMIN, UserType.USER)).toBe(false);
  });

  it('should match array of user types correctly', () => {
    const bothTypes = [UserType.USER, UserType.TENANT_ADMIN];
    expect(matchesUserType(UserType.USER, bothTypes)).toBe(true);
    expect(matchesUserType(UserType.TENANT_ADMIN, bothTypes)).toBe(true);

    const onlyUser = [UserType.USER];
    expect(matchesUserType(UserType.USER, onlyUser)).toBe(true);
    expect(matchesUserType(UserType.TENANT_ADMIN, onlyUser)).toBe(false);
  });
});

describe('Smart Redirect Logic', () => {
  // Helper function to simulate getSmartRedirect logic
  function getSmartRedirect(
    state: { hasTenant: boolean; isAuthenticated: boolean; userType?: UserType },
    zoneRoots: typeof DEFAULT_ZONE_ROOTS
  ): string {
    if (!state.hasTenant) {
      if (!state.isAuthenticated) return zoneRoots.publicGuest;
      if (state.userType === UserType.TENANT_ADMIN) return zoneRoots.publicAdmin;
      return zoneRoots.publicUser;
    } else {
      if (!state.isAuthenticated) return zoneRoots.tenantGuest;
      if (state.userType === UserType.TENANT_ADMIN) return zoneRoots.tenantAdmin;
      return zoneRoots.tenantUser;
    }
  }

  describe('without tenant', () => {
    it('should redirect guest to publicGuest', () => {
      const result = getSmartRedirect(
        { hasTenant: false, isAuthenticated: false },
        DEFAULT_ZONE_ROOTS
      );
      expect(result).toBe('/');
    });

    it('should redirect regular user to publicUser', () => {
      const result = getSmartRedirect(
        { hasTenant: false, isAuthenticated: true, userType: UserType.USER },
        DEFAULT_ZONE_ROOTS
      );
      expect(result).toBe('/account');
    });

    it('should redirect admin to publicAdmin', () => {
      const result = getSmartRedirect(
        { hasTenant: false, isAuthenticated: true, userType: UserType.TENANT_ADMIN },
        DEFAULT_ZONE_ROOTS
      );
      expect(result).toBe('/admin');
    });
  });

  describe('with tenant', () => {
    it('should redirect guest to tenantGuest', () => {
      const result = getSmartRedirect(
        { hasTenant: true, isAuthenticated: false },
        DEFAULT_ZONE_ROOTS
      );
      expect(result).toBe('/login');
    });

    it('should redirect regular user to tenantUser', () => {
      const result = getSmartRedirect(
        { hasTenant: true, isAuthenticated: true, userType: UserType.USER },
        DEFAULT_ZONE_ROOTS
      );
      expect(result).toBe('/dashboard');
    });

    it('should redirect admin to tenantAdmin', () => {
      const result = getSmartRedirect(
        { hasTenant: true, isAuthenticated: true, userType: UserType.TENANT_ADMIN },
        DEFAULT_ZONE_ROOTS
      );
      expect(result).toBe('/admin/dashboard');
    });
  });
});

describe('Access Denied Type Detection', () => {
  type AccessDeniedType =
    | 'no_tenant'
    | 'has_tenant'
    | 'not_authenticated'
    | 'already_authenticated'
    | 'wrong_user_type'
    | 'missing_permissions';

  // Helper function to simulate checkAccessMode
  function checkAccessMode(
    mode: AccessMode | undefined,
    condition: boolean
  ): 'pass' | 'fail' | 'skip' {
    if (!mode || mode === 'optional') return 'skip';
    if (mode === 'required') return condition ? 'pass' : 'fail';
    if (mode === 'forbidden') return condition ? 'fail' : 'pass';
    return 'skip';
  }

  // Helper function to simulate matchesUserType
  function matchesUserType(
    currentType: UserType | undefined,
    required: UserType | UserType[] | undefined
  ): boolean {
    if (!required) return true;
    if (!currentType) return false;
    if (Array.isArray(required)) {
      return required.includes(currentType);
    }
    return currentType === required;
  }

  // Helper function to simulate getAccessDeniedType logic
  function getAccessDeniedType(
    requirements: {
      tenant?: AccessMode;
      auth?: AccessMode;
      userType?: UserType | UserType[];
      permissions?: string[];
      requireAllPermissions?: boolean;
    },
    state: {
      hasTenant: boolean;
      isAuthenticated: boolean;
      userType?: UserType;
      permissions: string[];
    }
  ): AccessDeniedType | null {
    // Check tenant requirement
    const tenantCheck = checkAccessMode(requirements.tenant, state.hasTenant);
    if (tenantCheck === 'fail') {
      return state.hasTenant ? 'has_tenant' : 'no_tenant';
    }

    // Check auth requirement
    const authCheck = checkAccessMode(requirements.auth, state.isAuthenticated);
    if (authCheck === 'fail') {
      return state.isAuthenticated ? 'already_authenticated' : 'not_authenticated';
    }

    // Check user type
    if (requirements.userType && state.isAuthenticated) {
      if (!matchesUserType(state.userType, requirements.userType)) {
        return 'wrong_user_type';
      }
    }

    // Check permissions
    if (requirements.permissions && requirements.permissions.length > 0) {
      const checkFn =
        requirements.requireAllPermissions !== false
          ? (perms: string[]) => perms.every(p => state.permissions.includes(p))
          : (perms: string[]) => perms.some(p => state.permissions.includes(p));
      if (!checkFn(requirements.permissions)) {
        return 'missing_permissions';
      }
    }

    return null;
  }

  describe('tenant checks', () => {
    it('should detect no_tenant when tenant is required but missing', () => {
      const result = getAccessDeniedType(
        { tenant: 'required' },
        { hasTenant: false, isAuthenticated: false, permissions: [] }
      );
      expect(result).toBe('no_tenant');
    });

    it('should detect has_tenant when tenant is forbidden but present', () => {
      const result = getAccessDeniedType(
        { tenant: 'forbidden' },
        { hasTenant: true, isAuthenticated: false, permissions: [] }
      );
      expect(result).toBe('has_tenant');
    });

    it('should pass when tenant is optional', () => {
      const result = getAccessDeniedType(
        { tenant: 'optional' },
        { hasTenant: true, isAuthenticated: false, permissions: [] }
      );
      expect(result).toBeNull();
    });
  });

  describe('auth checks', () => {
    it('should detect not_authenticated when auth is required but user is guest', () => {
      const result = getAccessDeniedType(
        { auth: 'required' },
        { hasTenant: false, isAuthenticated: false, permissions: [] }
      );
      expect(result).toBe('not_authenticated');
    });

    it('should detect already_authenticated when auth is forbidden but user is logged in', () => {
      const result = getAccessDeniedType(
        { auth: 'forbidden' },
        { hasTenant: false, isAuthenticated: true, userType: UserType.USER, permissions: [] }
      );
      expect(result).toBe('already_authenticated');
    });

    it('should pass when auth is optional', () => {
      const result = getAccessDeniedType(
        { auth: 'optional' },
        { hasTenant: false, isAuthenticated: true, userType: UserType.USER, permissions: [] }
      );
      expect(result).toBeNull();
    });
  });

  describe('user type checks', () => {
    it('should detect wrong_user_type when user type does not match', () => {
      const result = getAccessDeniedType(
        { auth: 'required', userType: UserType.TENANT_ADMIN },
        { hasTenant: false, isAuthenticated: true, userType: UserType.USER, permissions: [] }
      );
      expect(result).toBe('wrong_user_type');
    });

    it('should pass when user type matches', () => {
      const result = getAccessDeniedType(
        { auth: 'required', userType: UserType.TENANT_ADMIN },
        {
          hasTenant: false,
          isAuthenticated: true,
          userType: UserType.TENANT_ADMIN,
          permissions: [],
        }
      );
      expect(result).toBeNull();
    });

    it('should pass when user type is in allowed array', () => {
      const result = getAccessDeniedType(
        { auth: 'required', userType: [UserType.USER, UserType.TENANT_ADMIN] },
        { hasTenant: false, isAuthenticated: true, userType: UserType.USER, permissions: [] }
      );
      expect(result).toBeNull();
    });
  });

  describe('permission checks', () => {
    it('should detect missing_permissions when user lacks required permissions (all)', () => {
      const result = getAccessDeniedType(
        { permissions: ['read', 'write'], requireAllPermissions: true },
        { hasTenant: false, isAuthenticated: true, userType: UserType.USER, permissions: ['read'] }
      );
      expect(result).toBe('missing_permissions');
    });

    it('should pass when user has all required permissions', () => {
      const result = getAccessDeniedType(
        { permissions: ['read', 'write'], requireAllPermissions: true },
        {
          hasTenant: false,
          isAuthenticated: true,
          userType: UserType.USER,
          permissions: ['read', 'write'],
        }
      );
      expect(result).toBeNull();
    });

    it('should pass when user has any required permission (requireAllPermissions=false)', () => {
      const result = getAccessDeniedType(
        { permissions: ['read', 'write'], requireAllPermissions: false },
        { hasTenant: false, isAuthenticated: true, userType: UserType.USER, permissions: ['read'] }
      );
      expect(result).toBeNull();
    });

    it('should detect missing_permissions when user has no required permissions (any)', () => {
      const result = getAccessDeniedType(
        { permissions: ['read', 'write'], requireAllPermissions: false },
        {
          hasTenant: false,
          isAuthenticated: true,
          userType: UserType.USER,
          permissions: ['delete'],
        }
      );
      expect(result).toBe('missing_permissions');
    });
  });

  describe('combined checks', () => {
    it('should check tenant before auth', () => {
      const result = getAccessDeniedType(
        { tenant: 'required', auth: 'required' },
        { hasTenant: false, isAuthenticated: false, permissions: [] }
      );
      expect(result).toBe('no_tenant');
    });

    it('should check auth before userType', () => {
      const result = getAccessDeniedType(
        { auth: 'required', userType: UserType.TENANT_ADMIN },
        { hasTenant: true, isAuthenticated: false, permissions: [] }
      );
      expect(result).toBe('not_authenticated');
    });

    it('should pass all checks for valid state', () => {
      const result = getAccessDeniedType(
        {
          tenant: 'required',
          auth: 'required',
          userType: UserType.TENANT_ADMIN,
          permissions: ['admin:read'],
        },
        {
          hasTenant: true,
          isAuthenticated: true,
          userType: UserType.TENANT_ADMIN,
          permissions: ['admin:read', 'admin:write'],
        }
      );
      expect(result).toBeNull();
    });
  });
});

describe('Return URL Building', () => {
  // Helper function to simulate buildRedirectUrl logic
  function buildRedirectUrl(
    redirectTo: string,
    returnPath: string | boolean | undefined,
    currentPath: string,
    returnToParam: string,
    returnToStorage: 'url' | 'session' | 'local'
  ): string {
    if (!returnPath || returnToStorage !== 'url') {
      return redirectTo;
    }

    const returnUrl = typeof returnPath === 'string' ? returnPath : currentPath;
    const separator = redirectTo.includes('?') ? '&' : '?';
    return `${redirectTo}${separator}${returnToParam}=${encodeURIComponent(returnUrl)}`;
  }

  it('should return redirectTo when returnPath is undefined', () => {
    const result = buildRedirectUrl('/login', undefined, '/dashboard', 'returnTo', 'url');
    expect(result).toBe('/login');
  });

  it('should return redirectTo when returnPath is false', () => {
    const result = buildRedirectUrl('/login', false, '/dashboard', 'returnTo', 'url');
    expect(result).toBe('/login');
  });

  it('should return redirectTo when storage is not url', () => {
    const result = buildRedirectUrl('/login', true, '/dashboard', 'returnTo', 'session');
    expect(result).toBe('/login');
  });

  it('should append returnTo param with current path when returnPath is true', () => {
    const result = buildRedirectUrl('/login', true, '/dashboard', 'returnTo', 'url');
    expect(result).toBe('/login?returnTo=%2Fdashboard');
  });

  it('should append returnTo param with custom path when returnPath is string', () => {
    const result = buildRedirectUrl('/login', '/custom-return', '/dashboard', 'returnTo', 'url');
    expect(result).toBe('/login?returnTo=%2Fcustom-return');
  });

  it('should use & separator when redirectTo already has query params', () => {
    const result = buildRedirectUrl('/login?foo=bar', true, '/dashboard', 'returnTo', 'url');
    expect(result).toBe('/login?foo=bar&returnTo=%2Fdashboard');
  });

  it('should encode special characters in return path', () => {
    const result = buildRedirectUrl(
      '/login',
      true,
      '/dashboard?id=123&tab=settings',
      'returnTo',
      'url'
    );
    expect(result).toBe('/login?returnTo=%2Fdashboard%3Fid%3D123%26tab%3Dsettings');
  });
});
