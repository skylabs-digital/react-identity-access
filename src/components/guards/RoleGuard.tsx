import { ReactNode } from 'react';
import { useRoles } from '../../hooks/useRoles';

export interface RoleGuardProps {
  children: ReactNode;
  roles: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  roles,
  requireAll = false,
  fallback,
}) => {
  const { hasAnyRole, hasAllRoles } = useRoles();

  const hasAccess = requireAll ? hasAllRoles(roles) : hasAnyRole(roles);

  if (!hasAccess) {
    return fallback || null;
  }

  return <>{children}</>;
};
