import { ReactNode } from 'react';
import { useRoles } from '../../hooks/useRoles';

export interface PermissionGuardProps {
  children: ReactNode;
  permissions: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permissions,
  requireAll = false,
  fallback,
}) => {
  const { hasAnyPermission, hasAllPermissions } = useRoles();

  const hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);

  if (!hasAccess) {
    return fallback || null;
  }

  return <>{children}</>;
};
