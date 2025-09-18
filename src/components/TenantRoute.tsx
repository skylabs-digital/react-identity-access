import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTenantInfo } from '../providers/TenantProvider';

export interface TenantRouteProps {
  children: ReactNode;
  redirectTo?: string;
  fallback?: ReactNode;
}

const DefaultTenantRequiredFallback = ({ redirectPath }: { redirectPath: string }) => (
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
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏢</div>
      <h2 style={{ color: '#374151', marginBottom: '1rem' }}>Tenant Required</h2>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
        This page requires a tenant context to access.
      </p>
      <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Redirecting to {redirectPath}...</p>
    </div>
  </div>
);

export function TenantRoute({
  children,
  redirectTo = '/',
  fallback,
}: TenantRouteProps) {
  const { tenant, isLoading, error } = useTenantInfo();
  const location = useLocation();

  // Show loading state while tenant is being detected/loaded
  if (isLoading) {
    return null; // Let TenantProvider handle loading fallback
  }

  // If there's an error loading tenant, let TenantProvider handle it
  if (error) {
    return null; // Let TenantProvider handle error fallback
  }

  // Check if tenant is required but not present
  if (!tenant) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <>
        <DefaultTenantRequiredFallback redirectPath={redirectTo} />
        <Navigate to={redirectTo} state={{ from: location.pathname }} replace />
      </>
    );
  }

  // Tenant is present, render children
  return <>{children}</>;
}
