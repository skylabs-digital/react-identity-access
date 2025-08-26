import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { 
  IdentityProvider, 
  LocalStorageConnector,
  SettingsProvider,
  useAuth
} from '../../src';
import { extendedSeedData } from './seedDataExtended';
import { settingsSchema, defaultSettings, settingsConnector } from './settingsConfig';
import { PublicLanding } from './components/PublicLanding';
import { LoginPage } from './components/LoginPage';
import { AdminPanel } from './components/AdminPanel';

// Create connector with extended demo configuration
const connector = new LocalStorageConnector({
  simulateDelay: true,
  minDelay: 200,
  maxDelay: 800,
  errorRate: 0.05,
  debugMode: true,
  seedData: extendedSeedData as any
});

// Route components
function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <>{children}</>;
}

export const App: React.FC = () => {
  // Check if tenant is provided in URL, if not redirect to default
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tenant = urlParams.get('tenant');
    const path = window.location.pathname;
    
    // Only redirect if we're on root path and no tenant is specified
    if (path === '/' && !tenant) {
      window.location.href = '?tenant=acme-corp';
    }
  }, []);

  return (
    <Router>
      <IdentityProvider 
        connector={connector}
        tenantResolver={{
          strategy: 'query-param',
          queryParam: {
            paramName: 'tenant',
            storageKey: 'demo-tenant'
          }
        }}
        LoadingComponent={() => <div style={{ padding: '20px', textAlign: 'center' }}>Initializing...</div>}
        LandingComponent={() => (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1>Welcome to React Identity Access Demo</h1>
            <p>Please specify a tenant to continue.</p>
            <p>Try: <a href="?tenant=acme-corp">acme-corp</a> or <a href="?tenant=tech-startup">tech-startup</a></p>
          </div>
        )}
      >
        <SettingsProvider
          appId="demo-app"
          schema={settingsSchema}
          version="1.0.0"
          defaults={defaultSettings}
          connector={settingsConnector}
        >
          <Routes>
            <Route path="/" element={<PublicLanding />} />
            <Route path="/admin" element={
              <ProtectedAdminRoute>
                <AdminPanel />
              </ProtectedAdminRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SettingsProvider>
      </IdentityProvider>
    </Router>
  );
}
