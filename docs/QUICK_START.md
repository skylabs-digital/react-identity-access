# Quick Start Guide

## Installation

```bash
npm install react-identity-access
# or
yarn add react-identity-access
```

## Basic Setup (5 minutes)

### 1. Wrap your app with IdentityProvider

```tsx
import { IdentityProvider, LocalStorageConnector } from 'react-identity-access';

const connector = new LocalStorageConnector();

function App() {
  return (
    <IdentityProvider connector={connector}>
      <YourAppContent />
    </IdentityProvider>
  );
}
```

### 2. Add authentication to any component

```tsx
import { useAuth } from 'react-identity-access';

function LoginButton() {
  const { login, logout, user, isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return (
      <div>
        Welcome, {user?.name}!
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return (
    <button onClick={() => login({ email: 'admin@acme.com', password: 'admin123' })}>
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

## Multi-Tenant Setup

### Configure tenant resolution

```tsx
const connector = new LocalStorageConnector({
  tenantStrategy: 'subdomain', // or 'query-param'
});

<IdentityProvider 
  connector={connector}
  tenantConfig={{
    strategy: 'subdomain',
    fallbackUrl: '/select-tenant'
  }}
>
  <App />
</IdentityProvider>
```

### Switch tenants

```tsx
import { useTenant } from 'react-identity-access';

function TenantSwitcher() {
  const { currentTenant, switchTenant, availableTenants } = useTenant();

  return (
    <select 
      value={currentTenant?.id} 
      onChange={(e) => switchTenant(e.target.value)}
    >
      {availableTenants.map(tenant => (
        <option key={tenant.id} value={tenant.id}>
          {tenant.name}
        </option>
      ))}
    </select>
  );
}
```

## Development Credentials

The LocalStorageConnector comes with pre-seeded test data:

```
Super Admin: superadmin@system.com / admin123
Admin: admin@acme.com / admin123  
User: user@acme.com / user123
```

## Next Steps

- [API Reference](./API_REFERENCE.md) - Complete hook and component documentation
- [Examples](./EXAMPLES.md) - Real-world usage patterns
- [Architecture](./ARCHITECTURE.md) - System design and concepts
- [Implementation](./IMPLEMENTATION.md) - Technical details and extensibility
