import { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useRoles } from '../../hooks/useRoles';

export interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireRoles?: string[];
  requirePermissions?: string[];
  requireAnyRole?: boolean;
  requireAnyPermission?: boolean;
  fallback?: ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requireRoles = [],
  requirePermissions = [],
  requireAnyRole = false,
  requireAnyPermission = false,
  fallback,
  redirectTo,
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { hasAnyRole, hasAllRoles, hasAnyPermission, hasAllPermissions } = useRoles();

  // Show loading while checking authentication
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    if (redirectTo) {
      window.location.href = redirectTo;
      return null;
    }
    return fallback || <div>Access denied. Please log in.</div>;
  }

  // Check role requirements
  if (requireRoles.length > 0) {
    const hasRequiredRoles = requireAnyRole ? hasAnyRole(requireRoles) : hasAllRoles(requireRoles);

    if (!hasRequiredRoles) {
      if (redirectTo) {
        window.location.href = redirectTo;
        return null;
      }
      return fallback || <div>Access denied. Insufficient roles.</div>;
    }
  }

  // Check permission requirements
  if (requirePermissions.length > 0) {
    const hasRequiredPermissions = requireAnyPermission
      ? hasAnyPermission(requirePermissions)
      : hasAllPermissions(requirePermissions);

    if (!hasRequiredPermissions) {
      if (redirectTo) {
        window.location.href = redirectTo;
        return null;
      }
      return fallback || <div>Access denied. Insufficient permissions.</div>;
    }
  }

  return <>{children}</>;
};
