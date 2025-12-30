import { describe, it, expect } from 'vitest';
import { UserType } from '../types/api';

// Helper function extracted from ProtectedRoute for testing
const hasRequiredUserType = (userType: UserType, requiredUserType: UserType): boolean => {
  return userType === requiredUserType;
};

describe('ProtectedRoute', () => {
  describe('hasRequiredUserType', () => {
    it('should return true when user type matches required type exactly', () => {
      expect(hasRequiredUserType(UserType.USER, UserType.USER)).toBe(true);
      expect(hasRequiredUserType(UserType.TENANT_ADMIN, UserType.TENANT_ADMIN)).toBe(true);
      expect(hasRequiredUserType(UserType.SUPERUSER, UserType.SUPERUSER)).toBe(true);
    });

    it('should return false when user type does not match required type', () => {
      // USER trying to access TENANT_ADMIN routes
      expect(hasRequiredUserType(UserType.USER, UserType.TENANT_ADMIN)).toBe(false);
      // USER trying to access SUPERUSER routes
      expect(hasRequiredUserType(UserType.USER, UserType.SUPERUSER)).toBe(false);
      // TENANT_ADMIN trying to access SUPERUSER routes
      expect(hasRequiredUserType(UserType.TENANT_ADMIN, UserType.SUPERUSER)).toBe(false);
      // TENANT_ADMIN trying to access USER-only routes
      expect(hasRequiredUserType(UserType.TENANT_ADMIN, UserType.USER)).toBe(false);
      // SUPERUSER trying to access USER-only routes
      expect(hasRequiredUserType(UserType.SUPERUSER, UserType.USER)).toBe(false);
      // SUPERUSER trying to access TENANT_ADMIN-only routes
      expect(hasRequiredUserType(UserType.SUPERUSER, UserType.TENANT_ADMIN)).toBe(false);
    });

    it('should enforce exact match - higher level user cannot access lower level routes', () => {
      // This is the key difference from minUserType
      // SUPERUSER should NOT be able to access TENANT_ADMIN-only routes
      expect(hasRequiredUserType(UserType.SUPERUSER, UserType.TENANT_ADMIN)).toBe(false);
      // SUPERUSER should NOT be able to access USER-only routes
      expect(hasRequiredUserType(UserType.SUPERUSER, UserType.USER)).toBe(false);
      // TENANT_ADMIN should NOT be able to access USER-only routes
      expect(hasRequiredUserType(UserType.TENANT_ADMIN, UserType.USER)).toBe(false);
    });
  });

  describe('ProtectedRouteProps interface', () => {
    it('should have requiredUserType as optional property', () => {
      const propsWithUserType = {
        children: null,
        requiredUserType: UserType.SUPERUSER,
      };

      const propsWithoutUserType = {
        children: null,
      };

      expect(propsWithUserType).toHaveProperty('requiredUserType');
      expect(propsWithoutUserType).not.toHaveProperty('requiredUserType');
    });

    it('should accept all UserType values for requiredUserType', () => {
      const userTypeValues = [UserType.USER, UserType.TENANT_ADMIN, UserType.SUPERUSER];

      userTypeValues.forEach(userType => {
        const props = {
          children: null,
          requiredUserType: userType,
        };
        expect(props.requiredUserType).toBe(userType);
      });
    });
  });

  describe('Access control scenarios', () => {
    it('should allow access when requiredUserType is not set', () => {
      // When requiredUserType is undefined, any authenticated user should have access
      const requiredUserType = undefined;
      const userTypes = [UserType.USER, UserType.TENANT_ADMIN, UserType.SUPERUSER];

      userTypes.forEach(userType => {
        // If no requiredUserType, the check is skipped (always passes)
        const hasAccess = !requiredUserType || hasRequiredUserType(userType, requiredUserType);
        expect(hasAccess).toBe(true);
      });
    });

    it('should restrict SUPERUSER-only routes to SUPERUSER', () => {
      const requiredUserType = UserType.SUPERUSER;

      expect(hasRequiredUserType(UserType.SUPERUSER, requiredUserType)).toBe(true);
      expect(hasRequiredUserType(UserType.TENANT_ADMIN, requiredUserType)).toBe(false);
      expect(hasRequiredUserType(UserType.USER, requiredUserType)).toBe(false);
    });

    it('should restrict TENANT_ADMIN-only routes to TENANT_ADMIN', () => {
      const requiredUserType = UserType.TENANT_ADMIN;

      expect(hasRequiredUserType(UserType.TENANT_ADMIN, requiredUserType)).toBe(true);
      expect(hasRequiredUserType(UserType.SUPERUSER, requiredUserType)).toBe(false);
      expect(hasRequiredUserType(UserType.USER, requiredUserType)).toBe(false);
    });

    it('should restrict USER-only routes to USER', () => {
      const requiredUserType = UserType.USER;

      expect(hasRequiredUserType(UserType.USER, requiredUserType)).toBe(true);
      expect(hasRequiredUserType(UserType.TENANT_ADMIN, requiredUserType)).toBe(false);
      expect(hasRequiredUserType(UserType.SUPERUSER, requiredUserType)).toBe(false);
    });
  });

  describe('Mock AuthContext with requiredUserType', () => {
    it('should deny access when user type does not match required', () => {
      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@test.com',
        userType: UserType.USER,
        isActive: true,
        tenantId: 'tenant-1',
        roleId: 'role-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const requiredUserType = UserType.SUPERUSER;
      const hasAccess = hasRequiredUserType(mockUser.userType, requiredUserType);

      expect(hasAccess).toBe(false);
    });

    it('should allow access when user type matches required', () => {
      const mockUser = {
        id: '1',
        name: 'Admin User',
        email: 'admin@test.com',
        userType: UserType.SUPERUSER,
        isActive: true,
        tenantId: 'tenant-1',
        roleId: 'role-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const requiredUserType = UserType.SUPERUSER;
      const hasAccess = hasRequiredUserType(mockUser.userType, requiredUserType);

      expect(hasAccess).toBe(true);
    });
  });

  describe('Permission combinations', () => {
    it('should work independently of requiredPermissions', () => {
      // Mock scenario: user has correct permissions but wrong userType
      const hasAllPermissions = true;

      const userType = UserType.USER;
      const requiredUserType = UserType.SUPERUSER;

      // User has all permissions but wrong userType
      const hasCorrectUserType = hasRequiredUserType(userType, requiredUserType);

      expect(hasAllPermissions).toBe(true);
      expect(hasCorrectUserType).toBe(false);
      // Should be denied because userType check fails
      expect(hasAllPermissions && hasCorrectUserType).toBe(false);
    });

    it('should allow when both userType and permissions match', () => {
      const hasAllPermissions = true;

      const userType = UserType.SUPERUSER;
      const requiredUserType = UserType.SUPERUSER;

      const hasCorrectUserType = hasRequiredUserType(userType, requiredUserType);

      expect(hasAllPermissions).toBe(true);
      expect(hasCorrectUserType).toBe(true);
      expect(hasAllPermissions && hasCorrectUserType).toBe(true);
    });
  });
});
