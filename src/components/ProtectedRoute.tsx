import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { UserType, Permission } from '../types/api';

export interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  requiredUserType?: UserType; // If set, only users with this exact user type can access
  requiredPermissions?: (string | Permission)[];
  requireAllPermissions?: boolean; // If true, user must have ALL permissions. If false, user needs ANY permission
  fallback?: ReactNode;
}

const DefaultFallback = ({ redirectPath }: { redirectPath: string }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '2rem',
      backgroundColor: '#f9fafb',
      textAlign: 'center',
    }}
  >
    <div
      style={{
        backgroundColor: '#ffffff',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        maxWidth: '400px',
      }}
    >
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
      <h2 style={{ color: '#374151', marginBottom: '1rem' }}>Access Required</h2>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
        You need to be signed in to access this page.
      </p>
      <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Redirecting to {redirectPath}...</p>
    </div>
  </div>
);

const InsufficientPermissionsFallback = ({
  userType,
  requiredUserType,
  missingPermissions,
}: {
  userType?: UserType;
  requiredUserType?: UserType;
  missingPermissions?: string[];
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '2rem',
      backgroundColor: '#f9fafb',
      textAlign: 'center',
    }}
  >
    <div
      style={{
        backgroundColor: '#ffffff',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        maxWidth: '400px',
      }}
    >
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
      <h2 style={{ color: '#374151', marginBottom: '1rem' }}>Insufficient Permissions</h2>
      {requiredUserType && userType ? (
        <>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
            This page requires <strong>{requiredUserType}</strong> access.
          </p>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
            Your current user type: <strong>{userType}</strong>
          </p>
        </>
      ) : (
        <>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
            You don't have the required permissions to access this page.
          </p>
          {missingPermissions && missingPermissions.length > 0 && (
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
              Required permissions: <strong>{missingPermissions.join(', ')}</strong>
            </p>
          )}
        </>
      )}
    </div>
  </div>
);

// Helper function to check if user type matches the required type
const hasRequiredUserType = (userType: UserType, requiredUserType: UserType): boolean => {
  return userType === requiredUserType;
};

/**
 * @deprecated Use `AuthenticatedZone` or `AdminZone` from './ZoneRoute' instead.
 * ProtectedRoute will be removed in a future version.
 *
 * Migration:
 * ```tsx
 * // Before
 * <ProtectedRoute redirectTo="/login"><Page /></ProtectedRoute>
 *
 * // After
 * <AuthenticatedZone redirectTo="/login"><Page /></AuthenticatedZone>
 *
 * // For admin routes:
 * // Before
 * <ProtectedRoute requiredUserType="TENANT_ADMIN"><Admin /></ProtectedRoute>
 *
 * // After
 * <AdminZone><Admin /></AdminZone>
 * ```
 */
export function ProtectedRoute({
  children,
  redirectTo = '/login',
  requiredUserType,
  requiredPermissions,
  requireAllPermissions = false,
  fallback,
}: ProtectedRouteProps) {
  const { hasValidSession, sessionManager, hasPermission, hasAnyPermission, hasAllPermissions } =
    useAuth();
  const location = useLocation();

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[react-identity-access] ProtectedRoute is deprecated. Use AuthenticatedZone or AdminZone from ZoneRoute instead.'
      );
    }
  }, []);

  // Check if user has a valid session
  if (!hasValidSession()) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <>
        <DefaultFallback redirectPath={redirectTo} />
        <Navigate to={redirectTo} state={{ from: location.pathname }} replace />
      </>
    );
  }

  const user = sessionManager.getUser();

  if (!user) {
    // User session exists but no user data - redirect to login
    return <Navigate to={redirectTo} state={{ from: location.pathname }} replace />;
  }

  // Check user type if specified
  if (requiredUserType && !hasRequiredUserType(user.userType, requiredUserType)) {
    return (
      <InsufficientPermissionsFallback
        userType={user.userType}
        requiredUserType={requiredUserType}
      />
    );
  }

  // Check specific permissions if specified
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasRequiredPermissions = requireAllPermissions
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);

    if (!hasRequiredPermissions) {
      // Get missing permissions for better error message
      const missingPermissions = requiredPermissions
        .filter(permission => !hasPermission(permission))
        .map(permission => (typeof permission === 'string' ? permission : permission.name));

      return <InsufficientPermissionsFallback missingPermissions={missingPermissions} />;
    }
  }

  // User is authenticated and has sufficient permissions
  return <>{children}</>;
}
