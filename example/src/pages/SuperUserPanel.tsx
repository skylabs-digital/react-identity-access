import { FeatureFlag, UserType } from '@skylabs-digital/react-identity-access';

function SuperUserPanel() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          padding: '2rem',
        }}
      >
        <h1 style={{ color: '#dc2626', marginBottom: '1rem' }}>⚡ Super User Panel</h1>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
          This page requires <strong>{UserType.SUPERUSER}</strong> access level.
        </p>

        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          }}
        >
          <div
            style={{
              padding: '1.5rem',
              backgroundColor: '#fef2f2',
              borderRadius: '6px',
              border: '1px solid #fca5a5',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#dc2626' }}>🏢 Tenant Management</h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#dc2626' }}>
              Create, modify, and delete tenants
            </p>
            <button
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Manage Tenants
            </button>
          </div>

          <div
            style={{
              padding: '1.5rem',
              backgroundColor: '#fef2f2',
              borderRadius: '6px',
              border: '1px solid #fca5a5',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#dc2626' }}>🔧 System Config</h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#dc2626' }}>
              Global system configuration and maintenance
            </p>
            <button
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              System Settings
            </button>
          </div>

          <FeatureFlag name="superuser_monitoring">
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: '#f3f4f6',
                borderRadius: '6px',
                border: '1px solid #6b7280',
              }}
            >
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>📈 System Monitoring</h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#6b7280' }}>
                Monitor system health and performance
              </p>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#374151',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                View Monitoring
              </button>
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                Feature controlled by "superuser_monitoring" flag
              </div>
            </div>
          </FeatureFlag>
        </div>

        <div
          style={{
            marginTop: '2rem',
            padding: '1rem',
            backgroundColor: '#fef2f2',
            borderRadius: '6px',
            border: '1px solid #dc2626',
          }}
        >
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#dc2626' }}>🚨 Maximum Security Level</h4>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#dc2626' }}>
            This page is protected by <code>ProtectedRoute</code> with{' '}
            <code>minUserType={UserType.SUPERUSER}</code>. Only SUPERUSER accounts can access this
            content.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SuperUserPanel;
