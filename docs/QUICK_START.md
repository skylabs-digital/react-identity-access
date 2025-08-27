# Quick Start Guide

## Installation

```bash
npm install react-identity-access
# or
yarn add react-identity-access
```

## Basic Setup (5 minutes)

### 1. Wrap your app with modular providers

```tsx
import { 
  ConnectorProvider, 
  TenantProvider, 
  IdentityProvider, 
  FeatureFlagsProvider, 
  SettingsProvider,
  SubscriptionProvider 
} from 'react-identity-access';

function App() {
  return (
    <ConnectorProvider config={{ type: 'localStorage', appId: 'my-app' }}>
      <TenantProvider config={{ strategy: 'query-param' }}>
        <IdentityProvider>
          <FeatureFlagsProvider>
            <SettingsProvider schema={settingsSchema} defaults={defaults}>
              <SubscriptionProvider>
                <YourAppContent />
              </SubscriptionProvider>
            </SettingsProvider>
          </FeatureFlagsProvider>
        </IdentityProvider>
      </TenantProvider>
    </ConnectorProvider>
  );
}
```

### 2. Add authentication to any component

```tsx
import { useAuth } from 'react-identity-access';

function LoginButton() {
  const { login, logout, auth } = useAuth();

  if (auth.isAuthenticated) {
    return (
      <div>
        Welcome, {auth.user?.email}!
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return (
    <button onClick={() => login('admin@acme.com', 'admin123')}>
      Login
    </button>
  );
}
```

### 3. Protect routes and content

```tsx
import { ProtectedRoute, RoleGuard } from 'react-identity-access';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute requireRole="admin">
          <AdminPanel />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      
      <RoleGuard role="admin">
        <AdminSection />
      </RoleGuard>
      
      <RoleGuard role={["user", "admin"]}>
        <UserSection />
      </RoleGuard>
    </div>
  );
}
```

### 4. Use feature flags

```tsx
import { FeatureFlag, useFeatureFlags } from 'react-identity-access';

function NewFeatureSection() {
  const { isEnabled } = useFeatureFlags();

  return (
    <div>
      <FeatureFlag flag="new-dashboard">
        <NewDashboard />
      </FeatureFlag>
      
      {isEnabled('beta-features') && (
        <BetaFeaturesPanel />
      )}
    </div>
  );
}
```

### 4. Use feature flags and settings

```tsx
import { useFeatureFlags, useSettings } from 'react-identity-access';

function AppContent() {
  const { flags, isEnabled, toggleFlag } = useFeatureFlags();
  const { values: settings, updateSetting } = useSettings();

  return (
    <div>
      {isEnabled('new-dashboard') && (
        <NewDashboard />
      )}
      
      <div>
        <h2>Settings</h2>
        <input
          value={settings.siteName}
          onChange={(e) => updateSetting('siteName', e.target.value)}
        />
      </div>
    </div>
  );
}
```

## Multi-Tenant Setup

### Configure tenant resolution

```tsx
// Production: subdomain-based
<TenantProvider config={{ strategy: 'subdomain' }}>
  <App />
</TenantProvider>

// Development: query parameter
<TenantProvider config={{
  strategy: 'query-param',
  queryParam: {
    paramName: 'tenant',
    storageKey: 'app-tenant',
  },
}}>
  <App />
</TenantProvider>
```

### Access tenant information

```tsx
import { useTenant } from 'react-identity-access';

function TenantInfo() {
  const { tenantId, tenant } = useTenant();

  return (
    <div>
      <h1>{tenant?.name || tenantId} Dashboard</h1>
      <p>Tenant ID: {tenantId}</p>
    </div>
  );
}
```

## Development Credentials

The localStorage connector comes with pre-seeded test data:

```
Admin: demo@example.com / password
User: user@example.com / password
```

## Next Steps

- [API Reference](./API_REFERENCE.md) - Complete hook and component documentation
- [Examples](./EXAMPLES.md) - Real-world usage patterns
- [Architecture](./ARCHITECTURE.md) - System design and concepts
- [Implementation](./IMPLEMENTATION.md) - Technical details and extensibility
