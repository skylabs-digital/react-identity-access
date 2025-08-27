import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConnectorProvider } from '../../src/providers/ConnectorProvider';
import { TenantProvider } from '../../src/providers/TenantProvider';
import { IdentityProvider } from '../../src/providers/IdentityProvider';
import { FeatureFlagsProvider } from '../../src/providers/FeatureFlagsProvider';
import { SubscriptionProvider } from '../../src/providers/SubscriptionProvider';
import { SettingsProvider } from '../../src/providers/SettingsProvider';
import { useAuth } from '../../src/hooks/useAuth';
import { PublicLanding } from './components/PublicLanding';
import { UserDashboard } from './components/UserDashboard';
import { AdminPanel, defaultSettings, settingsSchema } from './components/AdminPanel';
import { mockUsers, mockTenants, mockPasswords, mockFeatureFlags } from './mockData';

// Demo handles authentication inline, no separate login page needed

// Login wrapper component that shows login form if not authenticated
function LoginWrapper({
  children,
  requireAdmin = false,
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
}) {
  const auth = useAuth();

  if (!auth.isAuthenticated) {
    return <PublicLanding />;
  }

  if (requireAdmin) {
    console.log(auth.user);
    const isAdmin =
      auth.user?.roles?.includes('admin') || auth.user?.permissions?.includes('manage_tenant');
    if (!isAdmin) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}

export const App: React.FC = () => {
  // Check if tenant is provided in URL, if not redirect to default
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tenant = urlParams.get('tenant');

    // Only redirect if no tenant is specified
    if (!tenant) {
      window.location.href = '?tenant=acme-corp';
    }
  }, []);

  return (
    <Router>
      <ConnectorProvider
        config={{
          type: 'localStorage',
          appId: 'demo-app',
          seedData: {
            tenants: mockTenants,
            users: mockUsers,
            passwords: mockPasswords,
            featureFlags: mockFeatureFlags,
          },
        }}
      >
        <TenantProvider
          config={{
            strategy: 'query-param',
          }}
        >
          <IdentityProvider>
            <FeatureFlagsProvider>
              <SubscriptionProvider>
                <SettingsProvider
                  schema={settingsSchema}
                  defaults={defaultSettings}
                  config={{ version: '1.0.0', autoSave: true }}
                >
                  <Routes>
                    <Route path="/" element={<PublicLanding />} />
                    <Route
                      path="/dashboard"
                      element={
                        <LoginWrapper>
                          <UserDashboard />
                        </LoginWrapper>
                      }
                    />
                    <Route
                      path="/admin"
                      element={
                        <LoginWrapper requireAdmin={true}>
                          <AdminPanel />
                        </LoginWrapper>
                      }
                    />
                  </Routes>
                </SettingsProvider>
              </SubscriptionProvider>
            </FeatureFlagsProvider>
          </IdentityProvider>
        </TenantProvider>
      </ConnectorProvider>
    </Router>
  );
};
