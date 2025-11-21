import React, { useState } from 'react';
import { useAuth, useTenant, useApp } from '@skylabs-digital/react-identity-access';

/**
 * Demo page showcasing RFC-001 (Auto-switch tenant) and RFC-002 (Object parameters)
 *
 * This demonstrates:
 * 1. Login with object parameters (RFC-002)
 * 2. Automatic tenant switching after login (RFC-001)
 * 3. Manual tenant switching using switchTenant
 */
export default function TenantSwitchDemo() {
  const { login, currentUser, logout } = useAuth();
  const { tenant, tenantSlug, switchTenant } = useTenant();
  const { appId } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [targetTenantSlug, setTargetTenantSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // RFC-002: Object parameters - clean and self-documenting
      const result = await login({
        username,
        password,
        tenantSlug: targetTenantSlug || undefined, // RFC-001: Target tenant slug for auto-switch
      });

      // RFC-001: If tenantSlug differs from current tenant, auto-switch happens here
      // The page will reload with the new tenant, so this message may not be seen
      setMessage('Login successful! Auto-switching tenant...');
    } catch (err: any) {
      console.error('[TenantSwitchDemo] Login failed:', err);
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSwitch = (slug: string) => {
    // Manual tenant switching
    switchTenant(slug);
  };

  const handleLogout = () => {
    logout();
    setMessage('Logged out successfully');
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Tenant Switching Demo</h1>

        {/* Current State */}
        <div className="mb-8 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-3 text-gray-900">Current State</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">App ID:</span>{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">{appId}</code>
            </p>
            <p>
              <span className="font-medium">Current Tenant ID:</span>{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">{tenant?.id || 'None'}</code>
            </p>
            <p>
              <span className="font-medium">Current Tenant Slug:</span>{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">{tenantSlug || 'None'}</code>
            </p>
            <p>
              <span className="font-medium">Current User:</span>{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">
                {currentUser ? `${currentUser.name} (${currentUser.email})` : 'Not logged in'}
              </code>
            </p>
          </div>
        </div>

        {/* RFC Implementation Info */}
        <div className="mb-8 p-4 bg-green-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-3 text-gray-900">🚀 RFC Implementations</h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-green-800">RFC-002: Object Parameters</p>
              <p className="text-gray-700 mt-1">Auth methods now use clean object parameters:</p>
              <pre className="bg-gray-800 text-green-400 p-2 rounded mt-2 overflow-x-auto">
                {`login({ username, password, tenantId })`}
              </pre>
            </div>
            <div>
              <p className="font-medium text-green-800">RFC-001: Auto-Switch Tenant</p>
              <p className="text-gray-700 mt-1">
                When you login with a different tenantId, the app automatically switches to that
                tenant and reloads the page.
              </p>
            </div>
          </div>
        </div>

        {/* Login Form */}
        {!currentUser && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Test Auto-Switch Login</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username (email)
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Tenant Slug (optional)
                </label>
                <input
                  type="text"
                  value={targetTenantSlug}
                  onChange={e => setTargetTenantSlug(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., tech-store"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 If you provide a different tenant slug, auto-switch will happen after login
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Logging in...' : 'Login with Auto-Switch'}
              </button>
            </form>
          </div>
        )}

        {/* Logged In Actions */}
        {currentUser && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Logged In Actions</h2>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 font-medium"
            >
              Logout
            </button>
          </div>
        )}

        {/* Manual Tenant Switch */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Manual Tenant Switch</h2>
          <p className="text-sm text-gray-600 mb-4">
            Test manual tenant switching by entering a tenant slug below:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter tenant slug"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              id="manual-tenant-slug"
            />
            <button
              onClick={() => {
                const input = document.getElementById('manual-tenant-slug') as HTMLInputElement;
                if (input.value) {
                  handleManualSwitch(input.value);
                }
              }}
              className="bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 font-medium"
            >
              Switch Tenant
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ⚠️ This will reload the page with the new tenant context
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">{error}</div>
        )}
        {message && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
            {message}
          </div>
        )}

        {/* Code Example */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-3 text-gray-900">Code Example</h2>
          <pre className="bg-gray-800 text-gray-100 p-4 rounded overflow-x-auto text-sm">
            {`// RFC-002: Clean object parameters
const { login } = useAuth();
const { switchTenant } = useTenant();

// Login with automatic tenant switching
await login({
  username: 'user@example.com',
  password: 'secret',
  tenantId: 'different-tenant-id', // Auto-switch happens here
});

// Manual tenant switching
switchTenant('tenant-slug'); // Page reloads with new tenant`}
          </pre>
        </div>
      </div>
    </div>
  );
}
