import React from 'react';
import { useAuth } from '../../../src/providers/IdentityProvider';
import { useFeatureFlags } from '../../../src/providers/FeatureFlagsProvider';
import { useSettings } from '../../../src/providers/SettingsProvider';
import { useSubscription } from '../../../src/providers/SubscriptionProvider';
import { FeatureFlag } from '../../../src/components/feature-flags/FeatureFlag';
import { SubscriptionGuard } from '../../../src/components/subscription/SubscriptionGuard';
import { LimitGate } from '../../../src/components/subscription/LimitGate';
import { TenantSwitcher } from './TenantSwitcher';

interface AppSettings {
  siteName: string;
  theme: 'light' | 'dark';
  maxUsers: number;
  adminEmail: string;
  features: {
    advancedMode: boolean;
    betaFeatures: boolean;
  };
}

export function UserDashboard() {
  const { auth, logout } = useAuth();
  const { values: settings } = useSettings<AppSettings>();
  const { subscription, plans } = useSubscription();

  // Get current plan details
  const currentPlan = plans.find(plan => plan.id === subscription?.planId);
  const isAdmin = auth.user?.roles?.includes('admin') || auth.user?.permissions?.includes('manage_tenant');

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
              🚀 {settings.siteName}
            </h1>
            <TenantSwitcher />
            <FeatureFlag flag="beta_features">
              <span style={{ 
                background: '#ffc107', 
                color: '#1a1a1a', 
                padding: '4px 8px', 
                borderRadius: '12px', 
                fontSize: '12px',
                fontWeight: '600'
              }}>
                BETA
              </span>
            </FeatureFlag>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: '#6c757d', fontSize: '14px' }}>
              Welcome, {auth.user?.name || auth.user?.email}
            </span>
            {isAdmin && (
              <a
                href="/admin"
                style={{
                  background: '#007bff',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                ⚙️ Admin Panel
              </a>
            )}
            <button
              onClick={logout}
              style={{
                background: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Welcome Section */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ color: '#1a1a1a', fontSize: '32px', marginBottom: '16px', fontWeight: '600' }}>
            Welcome to your Dashboard
          </h2>
          <p style={{ color: '#6c757d', fontSize: '18px', marginBottom: '24px' }}>
            Manage your account, view analytics, and access all available features.
          </p>

          {/* Subscription Status */}
          {subscription && (
            <div style={{
              background: 'linear-gradient(135deg, #28a745, #20c997)',
              color: 'white',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
                <strong>Plan:</strong> {currentPlan?.name || subscription.planId}
              </h3>
              <p style={{ margin: 0, opacity: 0.9 }}>
                Status: {subscription.status} • Next billing: {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          )}
        </section>

        {/* Feature Grid */}
        <section style={{ marginBottom: '40px' }}>
          <h3 style={{ color: '#1a1a1a', fontSize: '24px', marginBottom: '24px', fontWeight: '600' }}>
            Available Features
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '24px' 
          }}>
            {/* Basic Features */}
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid #e9ecef',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h4 style={{ color: '#1a1a1a', fontSize: '18px', marginBottom: '12px', fontWeight: '600' }}>
                📊 Dashboard
              </h4>
              <p style={{ color: '#6c757d', marginBottom: '16px' }}>
                View your account overview and basic statistics.
              </p>
              <button style={{
                background: '#007bff',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}>
                View Dashboard
              </button>
            </div>

            {/* Analytics Feature */}
            <SubscriptionGuard 
              plan={['pro', 'enterprise']}
              fallback={
                <div style={{
                  background: '#f8f9fa',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid #e9ecef',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  opacity: 0.6
                }}>
                  <h4 style={{ color: '#1a1a1a', fontSize: '18px', marginBottom: '12px', fontWeight: '600' }}>
                    📈 Advanced Analytics
                    <span style={{ color: '#ffc107', fontSize: '14px' }}> (Pro)</span>
                  </h4>
                  <p style={{ color: '#6c757d', marginBottom: '16px' }}>
                    Deep insights into user behavior and system performance.
                  </p>
                  <button 
                    disabled
                    style={{
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'not-allowed',
                      fontSize: '14px'
                    }}
                  >
                    Upgrade Required
                  </button>
                </div>
              }
            >
              <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid #e9ecef',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h4 style={{ color: '#1a1a1a', fontSize: '18px', marginBottom: '12px', fontWeight: '600' }}>
                  📈 Advanced Analytics
                </h4>
                <p style={{ color: '#6c757d', marginBottom: '16px' }}>
                  Deep insights into user behavior and system performance.
                </p>
                <button 
                  style={{
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  View Analytics
                </button>
              </div>
            </SubscriptionGuard>

            {/* API Access */}
            <SubscriptionGuard 
              plan={['pro', 'enterprise']}
              fallback={
                <div style={{
                  background: '#f8f9fa',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid #e9ecef',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  opacity: 0.6
                }}>
                  <h4 style={{ color: '#1a1a1a', fontSize: '18px', marginBottom: '12px', fontWeight: '600' }}>
                    🔌 API Access
                    <span style={{ color: '#ffc107', fontSize: '14px' }}> (Pro)</span>
                  </h4>
                  <p style={{ color: '#6c757d', marginBottom: '16px' }}>
                    Programmatic access to your data and services.
                  </p>
                  <button 
                    disabled
                    style={{
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'not-allowed',
                      fontSize: '14px'
                    }}
                  >
                    Upgrade Required
                  </button>
                </div>
              }
            >
              <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid #e9ecef',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h4 style={{ color: '#1a1a1a', fontSize: '18px', marginBottom: '12px', fontWeight: '600' }}>
                  🔌 API Access
                </h4>
                <p style={{ color: '#6c757d', marginBottom: '16px' }}>
                  Programmatic access to your data and services.
                </p>
                <button 
                  style={{
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Manage API Keys
                </button>
              </div>
            </SubscriptionGuard>

            <FeatureFlag flag="advanced_dashboard">
              <div style={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid #e9ecef',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h4 style={{ fontSize: '18px', marginBottom: '12px', fontWeight: '600' }}>
                  ⚡ Advanced Dashboard
                </h4>
                <p style={{ marginBottom: '16px', opacity: 0.9 }}>
                  Enhanced dashboard with real-time data and custom widgets.
                </p>
                <button style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}>
                  Launch Advanced View
                </button>
              </div>
            </FeatureFlag>
          </div>
        </section>

        {/* Usage Limits */}
        <section style={{ marginBottom: '40px' }}>
          <h3 style={{ color: '#1a1a1a', fontSize: '24px', marginBottom: '24px', fontWeight: '600' }}>
            Usage & Limits
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '20px' 
          }}>
            {/* Users Limit */}
            <LimitGate
              limitKey="users"
              currentUsage={8}
              warningThreshold={0.8}
              warningComponent={
                <div style={{
                  background: '#fff3cd',
                  color: '#856404',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  fontSize: '12px'
                }}>
                  ⚠️ Approaching user limit
                </div>
              }
              fallback={
                <div style={{
                  background: '#f8d7da',
                  color: '#721c24',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  fontSize: '12px'
                }}>
                  🚫 User limit reached
                </div>
              }
            >
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #e9ecef'
              }}>
                <h4 style={{ color: '#1a1a1a', fontSize: '16px', marginBottom: '12px' }}>👥 Users</h4>
                <div style={{ 
                  background: '#e9ecef', 
                  height: '8px', 
                  borderRadius: '4px', 
                  marginBottom: '8px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    background: '#007bff',
                    height: '100%',
                    width: '80%',
                    borderRadius: '4px'
                  }} />
                </div>
                <p style={{ color: '#6c757d', fontSize: '14px', margin: 0 }}>
                  8 of 10 users
                </p>
              </div>
            </LimitGate>

            {/* Storage Limit */}
            <LimitGate
              limitKey="storage"
              currentUsage={7500}
              warningThreshold={0.9}
              warningComponent={
                <div style={{
                  background: '#fff3cd',
                  color: '#856404',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  fontSize: '12px'
                }}>
                  ⚠️ Storage almost full
                </div>
              }
              fallback={
                <div style={{
                  background: '#f8d7da',
                  color: '#721c24',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  fontSize: '12px'
                }}>
                  🚫 Storage limit reached
                </div>
              }
            >
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #e9ecef'
              }}>
                <h4 style={{ color: '#1a1a1a', fontSize: '16px', marginBottom: '12px' }}>💾 Storage</h4>
                <div style={{ 
                  background: '#e9ecef', 
                  height: '8px', 
                  borderRadius: '4px', 
                  marginBottom: '8px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    background: '#28a745',
                    height: '100%',
                    width: '75%',
                    borderRadius: '4px'
                  }} />
                </div>
                <p style={{ color: '#6c757d', fontSize: '14px', margin: 0 }}>
                  7.5 GB of 10 GB
                </p>
              </div>
            </LimitGate>
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <h3 style={{ color: '#1a1a1a', fontSize: '24px', marginBottom: '24px', fontWeight: '600' }}>
            Recent Activity
          </h3>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e9ecef',
            overflow: 'hidden'
          }}>
            {[
              { action: 'Logged in', time: '2 minutes ago', icon: '🔐' },
              { action: 'Updated profile', time: '1 hour ago', icon: '👤' },
              { action: 'Created new project', time: '3 hours ago', icon: '📁' },
              { action: 'Invited team member', time: '1 day ago', icon: '👥' },
            ].map((activity, index) => (
              <div 
                key={index}
                style={{
                  padding: '16px 20px',
                  borderBottom: index < 3 ? '1px solid #e9ecef' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <span style={{ fontSize: '20px' }}>{activity.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#1a1a1a', margin: 0, fontSize: '14px', fontWeight: '500' }}>
                    {activity.action}
                  </p>
                  <p style={{ color: '#6c757d', margin: 0, fontSize: '12px' }}>
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
