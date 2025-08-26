import React, { useState } from 'react';
import { 
  useAuth, 
  useRoles, 
  useTenant, 
  useFeatureFlags, 
  useSettings,
  FeatureToggle,
  RoleGuard 
} from '../../../src';

export function AdminPanel() {
  const { user, logout } = useAuth();
  const { currentTenant } = useTenant();
  const { flags, editableFlags } = useFeatureFlags();
  const { settings, updateSetting, isLoading, error } = useSettings();
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'features' | 'users'>('overview');

  const tabStyle = (isActive: boolean) => ({
    padding: '12px 24px',
    backgroundColor: isActive ? '#007bff' : '#f8f9fa',
    color: isActive ? 'white' : '#333',
    border: '1px solid #dee2e6',
    cursor: 'pointer',
    borderRadius: '4px 4px 0 0',
    marginRight: '2px'
  });

  const contentStyle = {
    backgroundColor: 'white',
    border: '1px solid #dee2e6',
    borderRadius: '0 4px 4px 4px',
    padding: '30px',
    minHeight: '500px'
  };

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <header style={{ 
        backgroundColor: 'white', 
        borderBottom: '1px solid #dee2e6',
        padding: '20px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: 0, color: '#333' }}>Admin Panel</h1>
          <p style={{ margin: '5px 0 0 0', color: '#666' }}>
            {currentTenant?.name} - {user?.name}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <a 
            href="/" 
            style={{ 
              color: '#007bff', 
              textDecoration: 'none',
              padding: '8px 16px',
              border: '1px solid #007bff',
              borderRadius: '4px'
            }}
          >
            ← Back to Site
          </a>
          <button 
            onClick={logout}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Navigation Tabs */}
        <div style={{ marginBottom: '0' }}>
          <button 
            style={tabStyle(activeTab === 'overview')}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            style={tabStyle(activeTab === 'settings')}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
          <button 
            style={tabStyle(activeTab === 'features')}
            onClick={() => setActiveTab('features')}
          >
            Feature Flags
          </button>
          <RoleGuard roles={['super_admin']}>
            <button 
              style={tabStyle(activeTab === 'users')}
              onClick={() => setActiveTab('users')}
            >
              Users
            </button>
          </RoleGuard>
        </div>

        {/* Tab Content */}
        <div style={contentStyle}>
          {error && (
            <div style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
              border: '1px solid #f5c6cb'
            }}>
              Error: {error}
            </div>
          )}

          {activeTab === 'overview' && (
            <div>
              <h2 style={{ marginBottom: '30px' }}>Dashboard Overview</h2>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '20px',
                marginBottom: '30px'
              }}>
                <div style={{
                  backgroundColor: '#e3f2fd',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #bbdefb'
                }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#1565c0' }}>Active Features</h3>
                  <p style={{ fontSize: '2rem', margin: 0, fontWeight: 'bold', color: '#1565c0' }}>
                    {Object.values(flags).filter(f => f.serverEnabled).length}
                  </p>
                </div>
                
                <div style={{
                  backgroundColor: '#f3e5f5',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #ce93d8'
                }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#7b1fa2' }}>Settings Configured</h3>
                  <p style={{ fontSize: '2rem', margin: 0, fontWeight: 'bold', color: '#7b1fa2' }}>
                    {settings ? Object.keys(settings).length : 0}
                  </p>
                </div>
                
                <div style={{
                  backgroundColor: '#e8f5e8',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #a5d6a7'
                }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>Tenant</h3>
                  <p style={{ fontSize: '1.2rem', margin: 0, fontWeight: 'bold', color: '#2e7d32' }}>
                    {currentTenant?.name}
                  </p>
                </div>
              </div>

              <div>
                <h3>Recent Activity</h3>
                <div style={{ 
                  backgroundColor: '#f8f9fa', 
                  padding: '20px', 
                  borderRadius: '4px',
                  border: '1px solid #dee2e6'
                }}>
                  <p style={{ margin: 0, color: '#666' }}>
                    Welcome to the admin panel! Use the tabs above to manage settings and feature flags.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ margin: 0 }}>Settings Management</h2>
                <button
                  onClick={() => {
                    // Reset functionality would be implemented here
                    console.log('Reset settings');
                  }}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Reset to Defaults
                </button>
              </div>

              <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                <h4>Settings Configuration</h4>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                  Settings management interface would be implemented here. For now, you can see the current settings below:
                </p>
                
                <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                  <h5>Current Settings:</h5>
                  <pre style={{ fontSize: '12px', color: '#666', overflow: 'auto' }}>
                    {JSON.stringify(settings, null, 2)}
                  </pre>
                </div>
                
                <div style={{ marginTop: '20px' }}>
                  <button
                    onClick={() => {
                      // Example of updating a setting
                      updateSetting('siteName', 'Updated Site Name');
                    }}
                    style={{
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginRight: '10px'
                    }}
                  >
                    Test Update Setting
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div>
              <h2 style={{ marginBottom: '30px' }}>Feature Flags Management</h2>
              
              <div style={{ marginBottom: '20px' }}>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                  Control which features are visible to your users. Server-enabled flags can be toggled by admins.
                </p>
              </div>

              <div style={{ display: 'grid', gap: '15px' }}>
                {Object.entries(flags).map(([key, flag]) => (
                  <div 
                    key={key} 
                    style={{
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #dee2e6',
                      borderRadius: '8px',
                      padding: '20px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>{flag.name}</h4>
                        <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: '0.9rem' }}>
                          {flag.description}
                        </p>
                        <div style={{ display: 'flex', gap: '15px', fontSize: '0.8rem', color: '#888' }}>
                          <span>Category: <strong>{flag.category}</strong></span>
                          <span>Server: <strong>{flag.serverEnabled ? 'ON' : 'OFF'}</strong></span>
                          <span>Editable: <strong>{flag.adminEditable ? 'YES' : 'NO'}</strong></span>
                        </div>
                      </div>
                      
                      <div style={{ marginLeft: '20px' }}>
                        <FeatureToggle flag={key} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <RoleGuard roles={['super_admin']}>
              <div>
                <h2 style={{ marginBottom: '30px' }}>User Management</h2>
                
                <div style={{
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffeaa7',
                  borderRadius: '4px',
                  padding: '15px',
                  marginBottom: '20px'
                }}>
                  <strong>Note:</strong> User management functionality would be implemented here.
                  This is a demo showing the structure.
                </div>

                <div style={{ 
                  backgroundColor: '#f8f9fa', 
                  padding: '20px', 
                  borderRadius: '4px',
                  border: '1px solid #dee2e6'
                }}>
                  <h4>Current User Information</h4>
                  <p><strong>Name:</strong> {user?.name}</p>
                  <p><strong>Email:</strong> {user?.email}</p>
                  <p><strong>Roles:</strong> {user?.roles.join(', ')}</p>
                  <p><strong>Tenant:</strong> {currentTenant?.name}</p>
                </div>
              </div>
            </RoleGuard>
          )}
        </div>
      </div>
    </div>
  );
}
