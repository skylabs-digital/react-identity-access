import { useCallback } from 'react';
import { useIdentityContext } from '../providers/IdentityProvider';
import { Role, Permission } from '../types';

export interface UseRolesReturn {
  roles: Role[];
  permissions: Permission[];
  hasRole: (roleName: string) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyRole: (roleNames: string[]) => boolean;
  hasAllRoles: (roleNames: string[]) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  canAccess: (resource: string, action: string) => boolean;
  isLoading: boolean;
}

export function useRoles(): UseRolesReturn {
  const { roles, auth } = useIdentityContext();

  const hasRole = useCallback(
    (roleName: string): boolean => {
      if (!auth.user) return false;
      return auth.user.roles.includes(roleName);
    },
    [auth.user]
  );

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!auth.user?.permissions) return false;
      return auth.user.permissions.includes(permission);
    },
    [auth.user]
  );

  const hasAnyRole = useCallback(
    (roleNames: string[]): boolean => {
      if (!auth.user) return false;
      return roleNames.some(roleName => auth.user!.roles.includes(roleName));
    },
    [auth.user]
  );

  const hasAllRoles = useCallback(
    (roleNames: string[]): boolean => {
      if (!auth.user) return false;
      return roleNames.every(roleName => auth.user!.roles.includes(roleName));
    },
    [auth.user]
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]): boolean => {
      if (!auth.user?.permissions) return false;
      return permissions.some(permission => auth.user!.permissions!.includes(permission));
    },
    [auth.user]
  );

  const hasAllPermissions = useCallback(
    (permissions: string[]): boolean => {
      if (!auth.user?.permissions) return false;
      return permissions.every(permission => auth.user!.permissions!.includes(permission));
    },
    [auth.user]
  );

  const canAccess = useCallback(
    (resource: string, action: string): boolean => {
      const permissionString = `${action}:${resource}`;
      return hasPermission(permissionString);
    },
    [hasPermission]
  );

  return {
    roles: roles.currentUserRoles,
    permissions: roles.permissions,
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAllRoles,
    hasAnyPermission,
    hasAllPermissions,
    canAccess,
    isLoading: roles.isLoading,
  };
}
