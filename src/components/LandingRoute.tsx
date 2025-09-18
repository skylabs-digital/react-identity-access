import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTenantInfo } from '../providers/TenantProvider';

export interface LandingRouteProps {
  children: ReactNode;
  redirectTo?: string;
  fallback?: ReactNode;
}

const DefaultTenantDetectedFallback = ({ redirectPath }: { redirectPath: string }) => (
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
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀</div>
      <h2 style={{ color: '#374151', marginBottom: '1rem' }}>Tenant Detected</h2>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
        You are accessing a tenant-specific context. Redirecting to the appropriate page.
      </p>
      <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Redirecting to {redirectPath}...</p>
    </div>
  </div>
);

export function LandingRoute({ children, redirectTo = '/dashboard', fallback }: LandingRouteProps) {
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

  // Check if tenant is present (should redirect to tenant-specific route)
  if (tenant) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <>
        <DefaultTenantDetectedFallback redirectPath={redirectTo} />
        <Navigate to={redirectTo} state={{ from: location.pathname }} replace />
      </>
    );
  }

  // No tenant present, render public landing page
  return <>{children}</>;
}
