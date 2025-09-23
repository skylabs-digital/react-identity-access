import { useApp, useTenant } from '@skylabs-digital/react-identity-access';
import { useState } from 'react';

export default function TenantTest() {
  const { appId, baseUrl } = useApp();
  const { tenant } = useTenant();
  const [newTenantSlug, setNewTenantSlug] = useState('acme-wedding-co');

  const handleTenantChange = () => {
    if (newTenantSlug.trim()) {
      // Update URL parameter to test tenant switching
      const url = new URL(window.location.href);
      url.searchParams.set('tenant', newTenantSlug.trim());
      window.location.href = url.toString();
    }
  };

  const clearTenant = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('tenant');
    window.location.href = url.toString();
  };

  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
      }}
    >
      <h2>Tenant Management Test</h2>

      <div style={{ marginBottom: '15px' }}>
        <h3>App Configuration</h3>
        <p>
          <strong>App ID:</strong> {appId}
        </p>
        <p>
          <strong>Base URL:</strong> {baseUrl}
        </p>
        <p>
          <strong>Current Tenant Slug:</strong> {'demo-tenant'}
        </p>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <h3>Tenant Information</h3>
        {/* Loading and error states removed for demo simplification */}
        {tenant && (
          <div style={{ backgroundColor: 'white', padding: '10px', borderRadius: '4px' }}>
            <p>
              <strong>Name:</strong> {tenant.name}
            </p>
            <p>
              <strong>ID:</strong> {tenant.id}
            </p>
            <p>
              <strong>Domain:</strong> {tenant.domain || 'None'}
            </p>
            <p>
              <strong>App ID:</strong> {tenant.appId}
            </p>
          </div>
        )}
        {!tenant && <p style={{ color: '#666' }}>No tenant loaded</p>}
      </div>

      <div>
        <h3>Switch Tenant</h3>
        <div style={{ marginBottom: '15px' }}>
          <h4>Available Tenants:</h4>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <button
              onClick={() => setNewTenantSlug('acme-wedding-co')}
              style={{
                padding: '8px 15px',
                backgroundColor: newTenantSlug === 'acme-wedding-co' ? '#28a745' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Acme Wedding Co. (Default)
            </button>
            <button
              onClick={() => setNewTenantSlug('dream-weddings-llc')}
              style={{
                padding: '8px 15px',
                backgroundColor: newTenantSlug === 'dream-weddings-llc' ? '#28a745' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Dream Weddings LLC
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Or enter custom tenant slug"
            value={newTenantSlug}
            onChange={e => setNewTenantSlug(e.target.value)}
            style={{
              flex: 1,
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
          <button
            onClick={handleTenantChange}
            disabled={!newTenantSlug.trim()}
            style={{
              padding: '8px 15px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: newTenantSlug.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Switch
          </button>
        </div>
        <button
          onClick={clearTenant}
          style={{
            padding: '8px 15px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Clear Tenant
        </button>
      </div>
    </div>
  );
}
