# React Identity Access

A comprehensive React library for authentication, authorization, multi-tenancy, feature flags, and settings management with modular providers and one-liner APIs for rapid prototyping.

## Features

- **Modular Architecture**: Use only what you need with independent providers
- **One-Liner Authentication**: `const { login, user } = useAuth()`
- **Declarative Guards**: `<ProtectedRoute>`, `<RoleGuard>`, `<PermissionGuard>`
- **Multi-Tenant Support**: Subdomain and query parameter strategies
- **Feature Flags**: Dynamic feature toggles with tenant-specific overrides
- **Settings Management**: Schema-validated configuration with auto-save
- **Subscription Management**: Billing and plan management
- **TypeScript First**: Full type safety and IntelliSense
- **Rapid Prototyping**: 90% functionality out-of-the-box

## Quick Start

### Installation

```bash
npm install react-identity-access
# or
yarn add react-identity-access
```

### Basic Setup (1 minute) - Unified Provider

```tsx
import { ReactIdentityProvider, z } from 'react-identity-access';

const settingsSchema = z.object({
  siteName: z.string(),
  theme: z.enum(['light', 'dark']),
  maxUsers: z.number(),
});

function App() {
  const config = {
    connector: {
      type: 'localStorage',
      appId: 'my-app',
    },
    tenantResolver: {
      strategy: 'query-param',
      queryParam: {
        paramName: 'tenant',
        storageKey: 'app-tenant',
      },
    },
    features: {
      settings: true,
      subscription: true,
      featureFlags: true,
    },
  };

  return (
    <ReactIdentityProvider
      config={config}
      settingsSchema={settingsSchema}
      settingsDefaults={{
        siteName: 'My App',
        theme: 'light',
        maxUsers: 100,
      }}
    >
      <YourAppContent />
    </ReactIdentityProvider>
  );
}
```

### Production Setup

```tsx
function App() {
  const config = {
    connector: {
      type: 'fetch',
      appId: 'my-app',
      apiKey: process.env.REACT_APP_API_KEY,
      baseUrl: 'https://api.myapp.com',
    },
    tenantResolver: {
      strategy: 'subdomain',
    },
    features: {
      settings: true,
      subscription: true,
      featureFlags: true,
    },
  };

  return (
    <ReactIdentityProvider
      config={config}
      settingsSchema={settingsSchema}
      settingsDefaults={defaults}
    >
      <YourAppContent />
    </ReactIdentityProvider>
  );
}
```

### One-Liner Authentication

```tsx
import { useAuth } from 'react-identity-access';

function LoginButton() {
  const { login, logout, auth } = useAuth();

  if (auth.isAuthenticated) {
    return <button onClick={logout}>Logout {auth.user?.email}</button>;
  }

  return (
    <button onClick={() => login('admin@acme.com', 'admin123')}>
      Login
    </button>
  );
}
```

### Declarative Protection

```tsx
import { 
  ProtectedRoute, 
  RoleGuard, 
  FeatureFlag,
  SubscriptionGuard,
  FeatureGate,
  LimitGate 
} from 'react-identity-access';

function App() {
  return (
    <Routes>
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
      <RoleGuard role="admin">
        <AdminSection />
      </RoleGuard>
      
      <FeatureFlag flag="new-dashboard">
        <NewDashboard />
      </FeatureFlag>
      
      <SubscriptionGuard requiredPlan="pro">
        <ProFeatures />
      </SubscriptionGuard>
      
      <FeatureGate feature="advanced-analytics" fallback={<UpgradePrompt />}>
        <AdvancedAnalytics />
      </FeatureGate>
      
      <LimitGate limit="api_calls" warningThreshold={0.8}>
        <ApiUsageWidget />
      </LimitGate>
    </div>
  );
}
```

## 📚 Documentation

| Guide | Description |
|-------|-------------|
| **[Quick Start](./docs/QUICK_START.md)** | Get up and running in 5 minutes |
| **[Unified Provider](./docs/UNIFIED_PROVIDER.md)** | ⭐ **NEW**: Single provider for all features |
| **[System Status](./docs/SYSTEM_STATUS.md)** | Current implementation status and roadmap |
| **[API Reference](./docs/API_REFERENCE.md)** | Complete hook and component documentation |
| **[Settings Management](./docs/SETTINGS.md)** | Configuration and settings system guide |
| **[Feature Flags](./docs/FEATURE_FLAGS.md)** | Feature flag system documentation |
| **[Examples](./docs/EXAMPLES.md)** | Real-world usage patterns |
| **[Architecture](./docs/ARCHITECTURE.md)** | System design and concepts |

## 🔐 Development Credentials

The library comes with pre-seeded test data for immediate development:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `superadmin@system.com` | `admin123` |
| Admin | `admin@acme.com` | `admin123` |
| User | `user@acme.com` | `user123` |

## 🚀 Core Concepts

### Unified Provider Architecture

The `ReactIdentityProvider` unifies all functionality with a single configuration:

```tsx
// Single unified provider with all features
<ReactIdentityProvider
  config={{
    connector: { type: 'localStorage', appId: 'my-app' },
    tenantResolver: { strategy: 'query-param' },
    features: {
      settings: true,
      subscription: true,
      featureFlags: true,
    },
  }}
  settingsSchema={schema}
  settingsDefaults={defaults}
>
  <YourApp />
</ReactIdentityProvider>
```

### Legacy Modular Architecture (Still Supported)

For backward compatibility, individual providers can still be used:

```tsx
// Individual providers for granular control
<IdentityProvider>
  <SettingsProvider schema={schema} defaults={defaults}>
    <SubscriptionProvider>
      <YourApp />
    </SubscriptionProvider>
  </SettingsProvider>
</IdentityProvider>
```

### One-Liner APIs

Every common task can be accomplished with a single line:

```tsx
// Authentication
const { login, logout, auth } = useAuth();

// Role checking
const { hasRole, hasPermission } = useRoles();

// Feature flags
const { flags, isEnabled, toggleFlag } = useFeatureFlags();

// Multi-tenancy
const { tenantId, tenant } = useTenant();

// Settings management
const { values, updateSetting, save } = useSettings();

// Subscription management
const { subscription, plans, subscribe, usage, limits } = useSubscription();

// Payment processing (for tenant-to-customer payments)
const { processPayment, paymentHistory } = useTenantPayment();
```

### Declarative Components

Protect content and routes declaratively without imperative checks:

```tsx
<ProtectedRoute requireRole="admin">
  <AdminPanel />
</ProtectedRoute>

<RoleGuard role={["admin", "moderator"]}>
  <ModerationTools />
</RoleGuard>

<PermissionGuard permission="users:write">
  <EditUserButton />
</PermissionGuard>

<FeatureFlag flag="beta-features">
  <BetaPanel />
</FeatureFlag>

<SettingsConditional settingKey="theme" expectedValue="dark">
  <DarkModeStyles />
</SettingsConditional>

<SubscriptionGuard requiredPlan="enterprise">
  <EnterpriseFeatures />
</SubscriptionGuard>

<FeatureGate feature="ai-assistant" fallback={<UpgradePrompt />}>
  <AIAssistant />
</FeatureGate>

<LimitGate limit="storage" warningThreshold={0.9}>
  <StorageUsageIndicator />
</LimitGate>
```

### Multi-Tenant Architecture

Configure tenant resolution strategy based on your deployment:

```tsx
// Production: subdomain-based
<TenantProvider config={{ strategy: 'subdomain' }}>
  <YourApp />
</TenantProvider>

// Development: query parameter
<TenantProvider config={{
  strategy: 'query-param',
  queryParam: {
    paramName: 'tenant',
    storageKey: 'app-tenant',
  },
}}>
  <YourApp />
</TenantProvider>
```

### Backend Configuration

Choose between localStorage (development) or fetch (production):

```tsx
// Development: localStorage mock data
const devConfig = {
  connector: {
    type: 'localStorage',
    appId: 'my-app',
  },
};

// Production: API backend
const prodConfig = {
  connector: {
    type: 'fetch',
    appId: 'my-app',
    apiKey: process.env.REACT_APP_API_KEY,
    baseUrl: 'https://api.myapp.com',
    endpoints: {
      identity: '/api/v1/identity',
      settings: '/api/v1/settings',
      subscription: '/api/v1/subscription',
      featureFlags: '/api/v1/feature-flags',
    },
  },
};

<ReactIdentityProvider config={config}>
  <YourApp />
</ReactIdentityProvider>
```

### Feature Flag System

Dual control system with server and tenant admin levels:

- **Server Control**: Global enable/disable for entire feature
- **Tenant Control**: Tenant admin can toggle server-enabled flags
- **No Super Admin UI**: Optional components for tenant admin only

```tsx
// Simple usage
<FeatureFlag flag="new-dashboard">
  <NewDashboard />
</FeatureFlag>

// Admin toggle interface
<FeatureToggle flag="beta-features" adminOnly={true} />
```

### Settings Management

Schema-validated configuration system with auto-save:

- **Schema Validation**: Zod-based type safety and validation
- **Auto-Save**: Automatic persistence with dirty state tracking
- **Multi-Tenant**: Tenant-specific configuration management
- **Version Control**: Settings versioning and migration support

```tsx
// Settings schema
const settingsSchema = z.object({
  siteName: z.string(),
  theme: z.enum(['light', 'dark']),
  maxUsers: z.number(),
  adminEmail: z.string().email(),
});

// Using settings
const { values, updateSetting, isDirty, save } = useSettings();

// Update settings
updateSetting('theme', 'dark');

// Manual save (or use autoSave config)
if (isDirty) {
  await save();
}
```

## 💡 Examples

### Client Application

```tsx
function ClientApp() {
  const { auth, login, logout } = useAuth();
  const { isEnabled } = useFeatureFlags();

  return (
    <div>
      {auth.isAuthenticated ? (
        <div>
          <h1>Welcome, {auth.user?.email}!</h1>
          
          {isEnabled('premium-features') && (
            <PremiumFeatures />
          )}
          
          {isEnabled('new-ui') && (
            <NewUserInterface />
          )}
          
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={() => login('demo@example.com', 'password')}>
          Login
        </button>
      )}
    </div>
  );
}
```

### Admin Panel

```tsx
function AdminPanel() {
  const { flags, toggleFlag } = useFeatureFlags();
  const { values: settings, updateSetting } = useSettings();
  const { subscription, plans } = useSubscription();

  return (
    <div>
      <h1>Admin Panel</h1>
      
      <section>
        <h2>Feature Flags</h2>
        {Object.entries(flags).map(([key, enabled]) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => toggleFlag(key, e.target.checked)}
            />
            {key}
          </label>
        ))}
      </section>
      
      <section>
        <h2>Settings</h2>
        <input
          value={settings.siteName}
          onChange={(e) => updateSetting('siteName', e.target.value)}
          placeholder="Site Name"
        />
      </section>
      
      <section>
        <h2>Subscription</h2>
        <p>Current Plan: {subscription?.planId || 'None'}</p>
        <p>Status: {subscription?.status || 'Inactive'}</p>
      </section>
    </div>
  );
}
```

### Multi-Tenant Dashboard

```tsx
function MultiTenantDashboard() {
  const { tenantId, tenant } = useTenant();
  const { auth } = useAuth();

  return (
    <div>
      <header>
        <h1>{tenant?.name || tenantId} Dashboard</h1>
        <p>User: {auth.user?.email}</p>
      </header>
      
      <main>
        {auth.user?.roles?.includes('admin') ? (
          <AdminDashboard />
        ) : (
          <UserDashboard />
        )}
      </main>
    </div>
  );
}
```

## 🛠️ Development

### Running Tests

```bash
yarn test
```

### Running Demo

```bash
cd demo
yarn dev
```

### Building

```bash
yarn build
```

## 📦 Package Information

- **Bundle Size**: ~15KB gzipped
- **Dependencies**: React 18+, TypeScript 4.9+
- **Browser Support**: Modern browsers (ES2020+)
- **License**: MIT

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.
