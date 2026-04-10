import { useState } from 'react';
import {
  useTenant,
  useTenantOptional,
  useTenantInfo,
} from '@skylabs-digital/react-identity-access';

export function TenantPlayground() {
  const tenantCtx = useTenant();
  const tenantOptional = useTenantOptional();
  const tenantInfo = useTenantInfo();
  const [switchSlug, setSwitchSlug] = useState('');

  return (
    <div>
      <h2>Tenant</h2>

      <div className="grid">
        <div className="section">
          <h3>useTenant()</h3>
          <div className="row">
            <span>tenantSlug:</span>
            <span className="ok">{tenantCtx.tenantSlug || '(none)'}</span>
          </div>
          <div className="row">
            <span>isTenantLoading:</span>
            <span className="info">{String(tenantCtx.isTenantLoading)}</span>
          </div>
          <div className="row">
            <span>tenantError:</span>
            <span className={tenantCtx.tenantError ? 'err' : 'ok'}>
              {tenantCtx.tenantError?.message || 'null'}
            </span>
          </div>
          <h3>tenant object</h3>
          <pre>
            {tenantCtx.tenant ? JSON.stringify(tenantCtx.tenant, null, 2) : 'null'}
          </pre>
        </div>

        <div className="section">
          <h3>useTenantOptional()</h3>
          <pre>{tenantOptional ? 'Context available' : 'null (no provider)'}</pre>

          <h3>useTenantInfo()</h3>
          <div className="row">
            <span>tenant:</span>
            <span className="info">{tenantInfo.tenant?.name || 'null'}</span>
          </div>
          <div className="row">
            <span>tenantSlug:</span>
            <span className="info">{tenantInfo.tenantSlug || '(none)'}</span>
          </div>
          <div className="row">
            <span>isLoading:</span>
            <span className="info">{String(tenantInfo.isLoading)}</span>
          </div>
          <div className="row">
            <span>error:</span>
            <span className={tenantInfo.error ? 'err' : 'ok'}>
              {tenantInfo.error?.message || 'null'}
            </span>
          </div>
        </div>
      </div>

      <div className="section">
        <h3>Switch Tenant</h3>
        <div className="row">
          <input
            value={switchSlug}
            onChange={e => setSwitchSlug(e.target.value)}
            placeholder="tenant slug"
          />
          <button onClick={() => tenantCtx.switchTenant(switchSlug)} disabled={!switchSlug}>
            switchTenant()
          </button>
          <button onClick={() => tenantCtx.retryTenant()}>retryTenant()</button>
        </div>
      </div>
    </div>
  );
}
