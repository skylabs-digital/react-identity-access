import { ReactNode } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { UserType, Permission } from '../types/api';

export interface ProtectedProps {
  children: ReactNode;
  fallback?: ReactNode;
  minUserType?: UserType;
  requiredPermissions?: (string | Permission)[];
  requireAllPermissions?: boolean; // If true, user must have ALL permissions. If false, user needs ANY permission
}

const DefaultFallback = () => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '6px',
      textAlign: 'center',
      margin: '20px 0',
    }}
  >
    <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🔒</div>
    <h3 style={{ color: '#495057', marginBottom: '10px' }}>Access Required</h3>
    <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '15px' }}>
      You need to be signed in to view this content.
    </p>
    <button
      style={{
        padding: '8px 16px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
      }}
      onClick={() => (window.location.href = '/login')}
    >
      Sign In
    </button>
  </div>
);

const InsufficientPermissionsFallback = ({
  userType,
  minUserType,
  missingPermissions,
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
      padding: '20px',
      backgroundColor: '#fff3cd',
      border: '1px solid #ffeaa7',
      borderRadius: '6px',
      textAlign: 'center',
      margin: '20px 0',
    }}
  >
    <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⚠️</div>
    <h3 style={{ color: '#856404', marginBottom: '10px' }}>Insufficient Permissions</h3>
    {minUserType && userType ? (
      <>
        <p style={{ color: '#856404', fontSize: '14px', marginBottom: '10px' }}>
          This content requires <strong>{minUserType}</strong> access level or higher.
        </p>
        <p style={{ color: '#6c757d', fontSize: '12px' }}>
          Your current access level: <strong>{userType}</strong>
        </p>
      </>
    ) : (
      <>
        <p style={{ color: '#856404', fontSize: '14px', marginBottom: '10px' }}>
          You don't have the required permissions to view this content.
        </p>
        {missingPermissions && missingPermissions.length > 0 && (
          <p style={{ color: '#6c757d', fontSize: '12px' }}>
            Required permissions: <strong>{missingPermissions.join(', ')}</strong>
          </p>
        )}
      </>
    )}
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

export function Protected({
  children,
  fallback,
  minUserType,
  requiredPermissions,
  requireAllPermissions = false,
}: ProtectedProps) {
  const { hasValidSession, sessionManager, hasPermission, hasAnyPermission, hasAllPermissions } =
    useAuth();

  // Check if user has a valid session
  if (!hasValidSession()) {
    return <>{fallback || <DefaultFallback />}</>;
  }

  const user = sessionManager.getUser();

  if (!user) {
    // User session exists but no user data - show fallback
    return <>{fallback || <DefaultFallback />}</>;
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
        .map(permission => (typeof permission === 'string' ? permission : permission.name));

      return <InsufficientPermissionsFallback missingPermissions={missingPermissions} />;
    }
  }

  // User is authenticated and has sufficient permissions
  return <>{children}</>;
}
