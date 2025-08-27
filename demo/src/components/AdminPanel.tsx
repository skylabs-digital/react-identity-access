import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../src/providers/IdentityProvider';
import { useFeatureFlags } from '../../../src/providers/FeatureFlagsProvider';
import { useSubscription } from '../../../src/providers/SubscriptionProvider';
import { useSettings } from '../../../src/providers/SettingsProvider';
import { useConnector } from '../../../src/providers/ConnectorProvider';
import { FeatureFlag } from '../../../src/components/feature-flags/FeatureFlag';
import { SubscriptionGuard } from '../../../src/components/subscription/SubscriptionGuard';
import { LimitGate } from '../../../src/components/subscription/LimitGate';
import { BillingHistory } from '../../../src/components/billing/BillingHistory';
import { mockUsers, mockTenants } from '../mockData';
import { TenantSwitcher } from './TenantSwitcher';
import { z } from '../../../src/utils/zod';
import { User } from '../../../src/types';

// Settings schema
export const settingsSchema = z.object({
  siteName: z.string().public(),
  theme: z.enum(['light', 'dark']),
  maxUsers: z.number(),
  adminEmail: z.string(),
  features: z.object({
    advancedMode: z.boolean(),
    betaFeatures: z.boolean(),
  }),
  publicSettings: z.object({
    heroTitle: z.string().public(),
    heroSubtitle: z.string().public(),
    companyName: z.string().public(),
    supportEmail: z.string().public(),
  }),
});

type AppSettings = z.infer<typeof settingsSchema>;

export const defaultSettings: AppSettings = {
  siteName: 'My App',
  theme: 'light',
  maxUsers: 100,
  adminEmail: 'admin@example.com',
  features: {
    advancedMode: false,
    betaFeatures: true,
  },
  publicSettings: {
    heroTitle: 'Welcome to My App',
    heroSubtitle: 'The ultimate identity and access management solution for modern applications.',
    companyName: 'My Company',
    supportEmail: 'support@myapp.com',
  },
};

export function AdminPanel() {
  const { auth, logout } = useAuth();
  const { flags, toggleFlag, isEnabled } = useFeatureFlags();
  const { values: settings, updateSetting, isDirty, save } = useSettings<AppSettings>();
  const { subscription, plans, subscribe } = useSubscription();
  const { connector } = useConnector();
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'features' | 'subscription' | 'users' | 'billing'>('overview');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = auth.user?.roles?.includes('admin') || auth.user?.permissions?.includes('manage_tenant');

  // Load users from connector
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await connector.list('users');
        if (response.success) {
          const allUsers = response.data || [];
          // Filter users for current tenant
          const tenantUsers = allUsers.filter((u: any) => u.tenantId === auth.user?.tenantId);
          setUsers(tenantUsers);
        }
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setLoading(false);
      }
    };

    if (auth.user?.tenantId) {
      loadUsers();
    }
  }, [connector, auth.user?.tenantId]);

  if (!isAdmin) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: '#dc3545' }}>Access Denied</h2>
        <p>You don't have permission to access the admin panel.</p>
      </div>
    );
  }

  // Calculate stats from real data
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.isActive).length;
  const adminUsers = users.filter(u => u.roles?.includes('admin')).length;
  const recentUsers = users.filter(u => {
    const daysSinceCreated = Math.floor((Date.now() - new Date(u.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceCreated <= 7;
  }).length;

  const baseTabs = [
    { id: 'overview', label: '📊 Overview', icon: '📊' },
    { id: 'settings', label: '⚙️ Settings', icon: '⚙️' },
    { id: 'subscription', label: '💳 Subscription', icon: '💳' },
  ];

  // Add conditional tabs based on feature flags and subscription
  const conditionalTabs: Array<{ id: string; label: string; icon: string }> = [];
  
  // Add feature flags tab if enabled and has proper subscription
  conditionalTabs.push({ id: 'features', label: '🚩 Feature Flags', icon: '🚩' });
  
  // Add users tab if user management is enabled
  conditionalTabs.push({ id: 'users', label: '👥 Users', icon: '👥' });
  
  // Add billing tab
  conditionalTabs.push({ id: 'billing', label: '💰 Billing', icon: '💰' });

  const tabs = [...baseTabs, ...conditionalTabs];

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e9ecef',
        padding: '16px 0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 style={{ color: '#1a1a1a', margin: 0, fontSize: '24px', fontWeight: '600' }}>
              ⚙️ Admin Panel - {settings.siteName}
            </h1>
            <TenantSwitcher />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: '#6c757d', fontSize: '14px' }}>
              {auth.user?.name || auth.user?.email}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <a
                href="/dashboard"
                style={{
                  background: '#28a745',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                🏠 Dashboard
              </a>
              <button
                onClick={logout}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', display: 'flex', gap: '20px' }}>
        {/* Sidebar */}
        <nav style={{ width: '250px', flexShrink: 0 }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e9ecef',
            overflow: 'hidden'
          }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  border: 'none',
                  background: activeTab === tab.id ? '#007bff' : 'white',
                  color: activeTab === tab.id ? 'white' : '#1a1a1a',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  borderBottom: '1px solid #e9ecef'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Main Content */}
        <main style={{ flex: 1 }}>
          {activeTab === 'overview' && (
            <div>
              <h2 style={{ color: '#1a1a1a', marginBottom: '24px' }}>System Overview</h2>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '20px',
                marginBottom: '30px'
              }}>
                <div style={{
                  background: 'white',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid #e9ecef'
                }}>
                  <h3 style={{ color: '#007bff', fontSize: '32px', margin: '0 0 8px 0' }}>{totalUsers}</h3>
                  <p style={{ color: '#6c757d', margin: 0 }}>Total Users</p>
                </div>

                <div style={{
                  background: 'white',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid #e9ecef'
                }}>
                  <h3 style={{ color: '#28a745', fontSize: '32px', margin: '0 0 8px 0' }}>{activeUsers}</h3>
                  <p style={{ color: '#6c757d', margin: 0 }}>Active Users</p>
                </div>

                <div style={{
                  background: 'white',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid #e9ecef'
                }}>
                  <h3 style={{ color: '#ffc107', fontSize: '32px', margin: '0 0 8px 0' }}>
                    {Object.keys(flags).length}
                  </h3>
                  <p style={{ color: '#6c757d', margin: 0 }}>Feature Flags</p>
                </div>

                <div style={{
                  background: 'white',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid #e9ecef'
                }}>
                  <h3 style={{ color: subscription ? '#28a745' : '#dc3545', fontSize: '32px', margin: '0 0 8px 0' }}>
                    {subscription ? (plans.find(p => p.id === subscription.planId)?.name || subscription.planId) : 'None'}
                  </h3>
                  <p style={{ color: '#6c757d', margin: 0 }}>Subscription Plan</p>
                </div>
              </div>

              <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid #e9ecef'
              }}>
                <h3 style={{ marginBottom: '16px' }}>System Status</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Authentication Service</span>
                    <span style={{ color: '#28a745', fontWeight: '600' }}>✅ Online</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Database Connection</span>
                    <span style={{ color: '#28a745', fontWeight: '600' }}>✅ Connected</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Payment Gateway</span>
                    <span style={{ color: '#28a745', fontWeight: '600' }}>✅ Active</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Email Service</span>
                    <span style={{ color: '#ffc107', fontWeight: '600' }}>⚠️ Limited</span>
                  </div>
                </div>
              </div>
            </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: '#1a1a1a', margin: 0 }}>System Settings</h2>
              {isDirty && (
                <button
                  onClick={save}
                  style={{
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Save Changes
                </button>
              )}
            </div>

            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#1a1a1a' }}>
                    Site Name
                  </label>
                  <input
                    type="text"
                    value={settings.siteName}
                    onChange={(e) => updateSetting('siteName', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e9ecef',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#1a1a1a' }}>
                      Theme
                    </label>
                    <select
                      value={settings.theme}
                      onChange={(e) => updateSetting('theme', e.target.value as 'light' | 'dark')}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #e9ecef',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#1a1a1a' }}>
                      Maximum Users
                    </label>
                    <input
                      type="number"
                      value={settings.maxUsers}
                      onChange={(e) => updateSetting('maxUsers', parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #e9ecef',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#1a1a1a' }}>
                      Admin Email
                    </label>
                    <input
                      type="email"
                      value={settings.adminEmail}
                      onChange={(e) => updateSetting('adminEmail', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #e9ecef',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <h4 style={{ marginBottom: '16px', color: '#1a1a1a' }}>Public Settings</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#1a1a1a' }}>
                          Hero Title
                        </label>
                        <input
                          type="text"
                          value={settings.publicSettings.heroTitle}
                          onChange={(e) => updateSetting('publicSettings', { ...settings.publicSettings, heroTitle: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #e9ecef',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#1a1a1a' }}>
                          Hero Subtitle
                        </label>
                        <textarea
                          value={settings.publicSettings.heroSubtitle}
                          onChange={(e) => updateSetting('publicSettings', { ...settings.publicSettings, heroSubtitle: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #e9ecef',
                            borderRadius: '6px',
                            fontSize: '14px',
                            minHeight: '80px',
                            resize: 'vertical'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#1a1a1a' }}>
                          Company Name
                        </label>
                        <input
                          type="text"
                          value={settings.publicSettings.companyName}
                          onChange={(e) => updateSetting('publicSettings', { ...settings.publicSettings, companyName: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #e9ecef',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#1a1a1a' }}>
                          Support Email
                        </label>
                        <input
                          type="email"
                          value={settings.publicSettings.supportEmail}
                          onChange={(e) => updateSetting('publicSettings', { ...settings.publicSettings, supportEmail: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #e9ecef',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ marginBottom: '16px', color: '#1a1a1a' }}>Feature Settings</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={settings.features.advancedMode}
                          onChange={(e) => updateSetting('features', { ...settings.features, advancedMode: e.target.checked })}
                        />
                        <span>Advanced Mode</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={settings.features.betaFeatures}
                          onChange={(e) => updateSetting('features', { ...settings.features, betaFeatures: e.target.checked })}
                        />
                        <span>Beta Features</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div>
              <h2 style={{ color: '#1a1a1a', marginBottom: '24px' }}>Feature Flags Management</h2>
              
              <SubscriptionGuard 
                plan={['pro', 'enterprise']}
                fallback={
                  <FeatureFlag flag="admin_feature_flags" fallback={
                    <div style={{
                      background: '#fff3cd',
                      color: '#856404',
                      padding: '20px',
                      borderRadius: '8px',
                      marginBottom: '24px',
                      border: '1px solid #ffeaa7',
                      textAlign: 'center'
                    }}>
                      <h3 style={{ margin: '0 0 8px 0' }}>🔒 Feature Flags Management</h3>
                      <p style={{ margin: '0 0 16px 0' }}>
                        Feature flags management is available for Pro and Enterprise plans only.
                      </p>
                      <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
                        Current plan: {subscription?.planId ? plans.find(p => p.id === subscription.planId)?.name || subscription.planId : 'None'}
                      </p>
                    </div>
                  }>
                    <div style={{
                      background: '#fff3cd',
                      color: '#856404',
                      padding: '20px',
                      borderRadius: '8px',
                      marginBottom: '24px',
                      border: '1px solid #ffeaa7',
                      textAlign: 'center'
                    }}>
                      <h3 style={{ margin: '0 0 8px 0' }}>🔒 Feature Flags Management</h3>
                      <p style={{ margin: '0 0 16px 0' }}>
                        Feature flags management is available for Pro and Enterprise plans only.
                      </p>
                      <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
                        Current plan: {subscription?.planId ? plans.find(p => p.id === subscription.planId)?.name || subscription.planId : 'None'}
                      </p>
                    </div>
                  </FeatureFlag>
                }
              >
                <div style={{
                  background: 'white',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {Object.entries(flags).map(([key, enabled]) => {
                      // Use flag key as display name if no metadata available
                      const flagDisplayName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                      return (
                        <div key={key} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '16px',
                          background: '#f8f9fa',
                          borderRadius: '8px',
                          border: '1px solid #e9ecef'
                        }}>
                          <div>
                            <strong>{flagDisplayName}</strong>
                            <div style={{ fontSize: '14px', color: '#6c757d', marginTop: '4px' }}>
                              Feature flag: {key}
                            </div>
                            <span style={{
                              background: '#28a745',
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              marginTop: '4px',
                              display: 'inline-block'
                            }}>
                              Editable
                            </span>
                          </div>
                          <button
                            onClick={() => toggleFlag(key, !enabled)}
                            style={{
                              background: enabled ? '#28a745' : '#6c757d',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            {enabled ? 'Enabled' : 'Disabled'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </SubscriptionGuard>
            </div>
          )}

          {activeTab === 'subscription' && (
            <div>
              <h2 style={{ color: '#1a1a1a', marginBottom: '24px' }}>Subscription Management</h2>
              
              <SubscriptionGuard 
                status="active"
                fallback={
                  <div style={{
                    background: '#fff3cd',
                    color: '#856404',
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '24px',
                    border: '1px solid #ffeaa7'
                  }}>
                    No active subscription. Choose a plan below to get started.
                  </div>
                }
              >
                <div style={{
                  background: 'white',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid #e9ecef',
                  marginBottom: '24px'
                }}>
                  <h3 style={{ color: '#28a745', marginBottom: '16px' }}>Current Subscription</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div>
                      <strong>Plan:</strong> {plans.find(p => p.id === subscription?.planId)?.name || subscription?.planId}
                    </div>
                    <div>
                      <strong>Status:</strong> {subscription?.status}
                    </div>
                    <div>
                      <strong>Price:</strong> ${(plans.find(p => p.id === subscription?.planId)?.price || 0) / 100}/{plans.find(p => p.id === subscription?.planId)?.interval || 'month'}
                    </div>
                    <div>
                      <strong>Next Billing:</strong> {subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>
              </SubscriptionGuard>

              <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid #e9ecef'
              }}>
                <h3 style={{ marginBottom: '20px' }}>Available Plans</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                  {plans.map(plan => (
                    <div key={plan.id} style={{
                      padding: '20px',
                      border: '1px solid #e9ecef',
                      borderRadius: '8px',
                      background: subscription?.planId === plan.id ? '#e8f5e8' : '#f8f9fa'
                    }}>
                      <h4 style={{ margin: '0 0 8px 0' }}>{plan.name}</h4>
                      <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '12px' }}>
                        {plan.features.join(', ')}
                      </p>
                      <div style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px' }}>
                        ${plan.price / 100}
                        <span style={{ fontSize: '14px', fontWeight: '400' }}>/{plan.interval}</span>
                      </div>
                      {subscription?.planId !== plan.id && (
                        <button
                          onClick={() => subscribe(plan.id)}
                          style={{
                            background: '#007bff',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            width: '100%'
                          }}
                        >
                          Subscribe
                        </button>
                      )}
                      {subscription?.planId === plan.id && (
                        <div style={{
                          background: '#28a745',
                          color: 'white',
                          padding: '8px 16px',
                          borderRadius: '12px',
                          border: '1px solid #e9ecef',
                          textAlign: 'center',
                          fontSize: '14px'
                        }}>
                          Current Plan
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ color: '#1a1a1a', margin: 0 }}>User Management</h2>
                <button style={{
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  + Invite User
                </button>
              </div>

              <div style={{
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #e9ecef',
                overflow: 'hidden'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1fr',
                  gap: '16px',
                  padding: '16px 20px',
                  background: '#f8f9fa',
                  borderBottom: '1px solid #e9ecef',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#6c757d'
                }}>
                  <div>Name</div>
                  <div>Email</div>
                  <div>Role</div>
                  <div>Status</div>
                  <div>Last Login</div>
                  <div>Actions</div>
                </div>

                {users.map(user => (
                  <div key={user.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1fr',
                    gap: '16px',
                    padding: '16px 20px',
                    borderBottom: '1px solid #e9ecef',
                    fontSize: '14px',
                    alignItems: 'center'
                  }}>
                    <div style={{ fontWeight: '500' }}>{user.name}</div>
                    <div style={{ color: '#6c757d' }}>{user.email}</div>
                    <div>
                      <span style={{
                        background: user.roles?.includes('admin') ? '#dc3545' : '#6c757d',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}>
                        {user.roles?.[0] || 'user'}
                      </span>
                    </div>
                    <div>
                      <span style={{
                        background: user.isActive ? '#28a745' : '#6c757d',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}>
                        {user.isActive ? 'active' : 'inactive'}
                      </span>
                    </div>
                    <div style={{ color: '#6c757d' }}>
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                    </div>
                    <div>
                      <button style={{
                        background: 'none',
                        border: '1px solid #e9ecef',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}>
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div>
              <h2 style={{ color: '#1a1a1a', marginBottom: '24px' }}>Billing & Invoices</h2>
              
              <SubscriptionGuard 
                status="active"
                fallback={
                  <div style={{
                    background: '#f8d7da',
                    color: '#721c24',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '24px',
                    border: '1px solid #f5c6cb',
                    textAlign: 'center'
                  }}>
                    <h3 style={{ margin: '0 0 8px 0' }}>💳 Billing History</h3>
                    <p style={{ margin: 0 }}>
                      Billing history is only available for active subscriptions.
                    </p>
                  </div>
                }
              >
                <div style={{
                  background: 'white',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid #e9ecef'
                }}>
                  <BillingHistory 
                    maxItems={20}
                    showDownloadLinks={true}
                    className="admin-billing-history"
                  />
                </div>
              </SubscriptionGuard>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default AdminPanel;
