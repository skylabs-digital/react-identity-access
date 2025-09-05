import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../providers/AuthProvider';
import { UserType, Permission } from '../types/api';

export interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  minUserType?: UserType;
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
      <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
        Redirecting to {redirectPath}...
      </p>
    </div>
  </div>
);

const InsufficientPermissionsFallback = ({ 
  userType, 
  minUserType, 
  missingPermissions 
}: { 
  userType?: UserType; 
  minUserType?: UserType;
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
      {minUserType && userType ? (
        <>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
            This page requires <strong>{minUserType}</strong> access level or higher.
          </p>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
            Your current access level: <strong>{userType}</strong>
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

// Helper function to check if user type meets minimum requirement
const hasMinimumUserType = (userType: UserType, minUserType: UserType): boolean => {
  const hierarchy = {
    [UserType.USER]: 1,
    [UserType.TENANT_ADMIN]: 2,
    [UserType.SUPERUSER]: 3,
  };

  return hierarchy[userType] >= hierarchy[minUserType];
};

export function ProtectedRoute({
  children,
  redirectTo = '/login',
  minUserType,
  requiredPermissions,
  requireAllPermissions = false,
  fallback,
}: ProtectedRouteProps) {
  const { 
    hasValidSession, 
    sessionManager, 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions 
  } = useAuth();
  const location = useLocation();

  // Check if user has a valid session
  if (!hasValidSession()) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <>
        <DefaultFallback redirectPath={redirectTo} />
        <Navigate 
          to={redirectTo} 
          state={{ from: location.pathname }} 
          replace 
        />
      </>
    );
  }

  const user = sessionManager.getUser();
  
  if (!user) {
    // User session exists but no user data - redirect to login
    return <Navigate to={redirectTo} state={{ from: location.pathname }} replace />;
  }

  // Check user type permissions if specified
  if (minUserType && !hasMinimumUserType(user.userType, minUserType)) {
    return <InsufficientPermissionsFallback userType={user.userType} minUserType={minUserType} />;
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
        .map(permission => typeof permission === 'string' ? permission : permission.name);
      
      return <InsufficientPermissionsFallback missingPermissions={missingPermissions} />;
    }
  }

  // User is authenticated and has sufficient permissions
  return <>{children}</>;
}
