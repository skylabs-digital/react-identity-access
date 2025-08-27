import React, { useState } from 'react';

interface TenantSwitcherProps {
  currentTenant?: string;
  onTenantChange?: (tenant: string) => void;
}

const availableTenants = [
  { id: 'acme-corp', name: 'Acme Corporation', description: 'Enterprise customer' },
  { id: 'startup-inc', name: 'Startup Inc', description: 'Growing startup' },
  { id: 'freelancer', name: 'Freelancer Pro', description: 'Individual plan' },
  { id: 'demo-tenant', name: 'Demo Company', description: 'Demo environment' },
];

export function TenantSwitcher({ currentTenant, onTenantChange }: TenantSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleTenantSwitch = (tenantId: string) => {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('tenant', tenantId);
    window.location.href = `${window.location.pathname}?${urlParams.toString()}`;
    setIsOpen(false);
    onTenantChange?.(tenantId);
  };

  const currentTenantData = availableTenants.find(t => t.id === currentTenant);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: '#007bff',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: '500'
        }}
      >
        🏢 {currentTenantData?.name || 'Select Tenant'}
        <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            marginTop: '4px',
            minWidth: '250px'
          }}
        >
          {availableTenants.map(tenant => (
            <button
              key={tenant.id}
              onClick={() => handleTenantSwitch(tenant.id)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: tenant.id === currentTenant ? '#f8f9fa' : 'white',
                textAlign: 'left',
                cursor: 'pointer',
                borderBottom: '1px solid #eee',
                fontSize: '14px'
              }}
              onMouseEnter={(e) => {
                if (tenant.id !== currentTenant) {
                  e.currentTarget.style.background = '#f8f9fa';
                }
              }}
              onMouseLeave={(e) => {
                if (tenant.id !== currentTenant) {
                  e.currentTarget.style.background = 'white';
                }
              }}
            >
              <div style={{ fontWeight: '500', color: '#1a1a1a' }}>{tenant.name}</div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                {tenant.description}
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
