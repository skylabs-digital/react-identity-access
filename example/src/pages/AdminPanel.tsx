import { FeatureFlag, UserType } from '@skylabs-digital/react-identity-access';

function AdminPanel() {
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
        <h1 style={{ color: '#1f2937', marginBottom: '1rem' }}>🛡️ Admin Panel</h1>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
          This page requires <strong>{UserType.TENANT_ADMIN}</strong> access level or higher.
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
              backgroundColor: '#f3f4f6',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>👥 User Management</h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#6b7280' }}>
              Manage users, roles, and permissions
            </p>
            <button
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Manage Users
            </button>
          </div>

          <div
            style={{
              padding: '1.5rem',
              backgroundColor: '#f3f4f6',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>⚙️ Settings</h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#6b7280' }}>
              Configure tenant settings and preferences
            </p>
            <button
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Open Settings
            </button>
          </div>

          <FeatureFlag name="admin_analytics">
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: '#fef3c7',
                borderRadius: '6px',
                border: '1px solid #f59e0b',
              }}
            >
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#92400e' }}>📊 Analytics</h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#92400e' }}>
                View detailed analytics and reports
              </p>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                View Analytics
              </button>
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#92400e' }}>
                Feature controlled by "admin_analytics" flag
              </div>
            </div>
          </FeatureFlag>
        </div>

        <div
          style={{
            marginTop: '2rem',
            padding: '1rem',
            backgroundColor: '#dbeafe',
            borderRadius: '6px',
            border: '1px solid #3b82f6',
          }}
        >
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e40af' }}>🔒 Access Control Demo</h4>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#1e40af' }}>
            This page is protected by <code>ProtectedRoute</code> with{' '}
            <code>minUserType={UserType.TENANT_ADMIN}</code>. Only TENANT_ADMIN and SUPERUSER can
            access this content.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
