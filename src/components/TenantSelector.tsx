import React, { useState, useRef, useEffect } from 'react';
import { useAuthOptional } from '../providers/AuthProvider';
import type { UserTenantMembership } from '../types/api';

export interface TenantSelectorStyles {
  wrapper?: React.CSSProperties;
  button?: React.CSSProperties;
  buttonDisabled?: React.CSSProperties;
  dropdown?: React.CSSProperties;
  item?: React.CSSProperties;
  itemSelected?: React.CSSProperties;
  itemHover?: React.CSSProperties;
  itemRole?: React.CSSProperties;
  arrow?: React.CSSProperties;
}

const defaultStyles: Required<TenantSelectorStyles> = {
  wrapper: {
    position: 'relative',
  },
  button: {
    cursor: 'pointer',
    opacity: 1,
  },
  buttonDisabled: {
    cursor: 'not-allowed',
    opacity: 0.6,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'white',
    border: '1px solid #ccc',
    borderRadius: 4,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    maxHeight: 300,
    overflowY: 'auto',
  },
  item: {
    padding: '8px 12px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
  },
  itemSelected: {
    backgroundColor: '#f0f0f0',
  },
  itemHover: {
    backgroundColor: '#f5f5f5',
  },
  itemRole: {
    opacity: 0.7,
    marginLeft: 8,
  },
  arrow: {
    marginLeft: 8,
  },
};

export interface TenantSelectorProps {
  tenants?: UserTenantMembership[];
  currentTenantId?: string | null;
  onSelect?: (tenantId: string) => void;
  styles?: TenantSelectorStyles;
  className?: string;
  dropdownClassName?: string;
  itemClassName?: string;
  renderItem?: (tenant: UserTenantMembership, isSelected: boolean) => React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  showCurrentTenant?: boolean;
}

export function TenantSelector({
  tenants: propTenants,
  currentTenantId: propCurrentTenantId,
  onSelect: propOnSelect,
  styles: propStyles = {},
  className = '',
  dropdownClassName = '',
  itemClassName = '',
  renderItem,
  placeholder = 'Select tenant',
  disabled = false,
  showCurrentTenant = true,
}: TenantSelectorProps) {
  const mergedStyles = { ...defaultStyles, ...propStyles };
  const auth = useAuthOptional();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use props if provided, otherwise fall back to context
  const tenants = propTenants ?? auth?.userTenants ?? [];
  const currentTenantId = propCurrentTenantId ?? auth?.currentUser?.tenantId ?? null;

  const handleSelect = async (tenantId: string) => {
    setIsOpen(false);
    if (propOnSelect) {
      propOnSelect(tenantId);
    } else if (auth?.switchToTenant) {
      await auth.switchToTenant(tenantId);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find current tenant
  const currentTenant = tenants.find(t => t.id === currentTenantId);

  // Don't render if no tenants available
  if (tenants.length === 0) {
    return null;
  }

  // Don't render selector if only one tenant and showing current
  if (tenants.length === 1 && showCurrentTenant) {
    return (
      <div className={className}>
        <span>{tenants[0].name}</span>
      </div>
    );
  }

  const defaultRenderItem = (tenant: UserTenantMembership, isSelected: boolean) => (
    <span style={{ fontWeight: isSelected ? 'bold' : 'normal' }}>
      {tenant.name}
      {tenant.role && <span style={mergedStyles.itemRole}>({tenant.role})</span>}
    </span>
  );

  return (
    <div ref={dropdownRef} className={className} style={mergedStyles.wrapper}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          ...mergedStyles.button,
          ...(disabled ? mergedStyles.buttonDisabled : {}),
        }}
      >
        {currentTenant ? currentTenant.name : placeholder}
        <span style={mergedStyles.arrow}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className={dropdownClassName} style={mergedStyles.dropdown}>
          {tenants.map(tenant => {
            const isSelected = tenant.id === currentTenantId;
            return (
              <div
                key={tenant.id}
                className={itemClassName}
                onClick={() => handleSelect(tenant.id)}
                style={{
                  ...mergedStyles.item,
                  ...(isSelected ? mergedStyles.itemSelected : {}),
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    Object.assign(e.currentTarget.style, mergedStyles.itemHover);
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    const base = mergedStyles.item || {};
                    Object.keys(mergedStyles.itemHover || {}).forEach(key => {
                      (e.currentTarget.style as any)[key] = (base as any)[key] ?? '';
                    });
                  }
                }}
              >
                {renderItem
                  ? renderItem(tenant, isSelected)
                  : defaultRenderItem(tenant, isSelected)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TenantSelector;
