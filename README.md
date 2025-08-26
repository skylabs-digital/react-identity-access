# React Identity Access

A comprehensive React library for authentication, authorization, multi-tenancy, feature flags, and settings management with one-liner APIs for rapid prototyping.

## Features

- **One-Liner Authentication**: `const { login, user } = useAuth()`
- **Declarative Guards**: `<ProtectedRoute>`, `<RoleGuard>`, `<PermissionGuard>`
- **Multi-Tenant Support**: Subdomain and query parameter strategies
- **Feature Flags**: Server + tenant admin dual control
- **Settings Management**: Type-safe configuration with public/private settings
- **Role-Based Access Control**: Flexible RBAC with permissions
- **TypeScript First**: Full type safety and IntelliSense
- **Rapid Prototyping**: 90% functionality out-of-the-box

## Quick Start

### Installation

```bash
npm install react-identity-access
# or
yarn add react-identity-access
```

### Basic Setup (2 minutes)

```tsx
import { 
  IdentityProvider, 
  SettingsProvider, 
  LocalStorageConnector, 
  SettingsLocalStorageConnector,
  z
} from 'react-identity-access';
import { mySeedData } from './seedData'; // Define your own seed data

const identityConnector = new LocalStorageConnector({
  seedData: mySeedData // Required: provide your own seed data
});

const settingsConnector = new SettingsLocalStorageConnector();

const settingsSchema = z.object({
  siteName: z.string().public(),
  theme: z.enum(['light', 'dark']).public(),
  maxUsers: z.number(),
});

function App() {
  return (
    <IdentityProvider connector={identityConnector}>
      <SettingsProvider
        appId="my-app"
        tenantId="default"
        version="1.0.0"
        connector={settingsConnector}
        schema={settingsSchema}
        defaults={{
          siteName: 'My App',
          theme: 'light',
          maxUsers: 100,
        }}
      >
        <YourAppContent />
      </SettingsProvider>
    </IdentityProvider>
  );
}
```

### One-Liner Authentication

```tsx
import { useAuth } from 'react-identity-access';

function LoginButton() {
  const { login, logout, user, isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <button onClick={logout}>Logout {user?.name}</button>;
  }

  return (
    <button onClick={() => login({ email: 'admin@acme.com', password: 'admin123' })}>
      Login
    </button>
  );
}
```

### Declarative Protection

```tsx
import { ProtectedRoute, RoleGuard, FeatureFlag } from 'react-identity-access';

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
    </div>
  );
}
```

## 📚 Documentation

| Guide | Description |
|-------|-------------|
| **[Quick Start](./docs/QUICK_START.md)** | Get up and running in 5 minutes |
| **[API Reference](./docs/API_REFERENCE.md)** | Complete hook and component documentation |
| **[Settings Management](./docs/SETTINGS.md)** | Configuration and settings system guide |
| **[Seed Data Guide](./docs/SEED_DATA_GUIDE.md)** | How to configure your own seed data |
| **[SSR Integration](./docs/SSR_INTEGRATION.md)** | Server-Side Rendering setup guide |
| **[Examples](./docs/EXAMPLES.md)** | Real-world usage patterns |
| **[Architecture](./docs/ARCHITECTURE.md)** | System design and concepts |
| **[Implementation](./docs/IMPLEMENTATION.md)** | Technical details and extensibility |

## 🔐 Development Credentials

The library comes with pre-seeded test data for immediate development:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `superadmin@system.com` | `admin123` |
| Admin | `admin@acme.com` | `admin123` |
| User | `user@acme.com` | `user123` |

## 🚀 Core Concepts

### One-Liner APIs

Every common authentication task can be accomplished with a single line:

```tsx
// Authentication
const { login, user, isAuthenticated } = useAuth();

// Role checking
const { hasRole, hasPermission } = useRoles();

// Feature flags
const { isEnabled } = useFeatureFlags();

// Multi-tenancy
const { currentTenant, switchTenant } = useTenant();

// Settings management
const { settings, updateSetting } = useSettings();
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
```

### Multi-Tenant Architecture

Configure tenant resolution strategy based on your deployment:

```tsx
// Production: subdomain-based
const connector = new LocalStorageConnector({
  tenantStrategy: 'subdomain' // tenant.yourdomain.com
});

// Development: query parameter
const connector = new LocalStorageConnector({
  tenantStrategy: 'query-param' // ?tenant=acme-corp
});
```

### SSR Integration

Inject initial state from your SSR framework to eliminate loading states:

```tsx
// Next.js, Remix, Gatsby, etc.
<IdentityProvider 
  connector={connector}
  initialState={{
    tenant: ssrTenantData,
    user: ssrUserData,
    featureFlags: ssrFeatureFlags
  }}
>
  <App />
</IdentityProvider>
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

Type-safe configuration system with public/private settings:

- **Schema Validation**: Zod-based type safety and validation
- **Public/Private Settings**: Control visibility to end users
- **Multi-Tenant**: Tenant-specific configuration management
- **Multiple Connectors**: LocalStorage, API, or custom backends

```tsx
// Settings schema with public/private fields
const settingsSchema = z.object({
  siteName: z.string().public(),      // Visible to all users
  theme: z.enum(['light', 'dark']).public(),
  maxUsers: z.number(),               // Private by default
  adminEmail: z.string().email(),
});

// Using settings
const { settings, updateSetting } = useSettings();

// Conditional rendering based on settings
<SettingsConditional settingKey="theme" expectedValue="dark">
  <DarkModeInterface />
</SettingsConditional>

// Admin panel for settings management
<SettingsAdminPanel
  title="App Configuration"
  sections={[
    { key: 'general', label: 'General', fields: ['siteName', 'theme'] },
    { key: 'limits', label: 'Limits', fields: ['maxUsers'] }
  ]}
/>
```

## 💡 Examples

### Client Application

```tsx
function ClientApp() {
  const { user, login, logout } = useAuth();
  const { hasRole } = useRoles();

  return (
    <div>
      {user ? (
        <div>
          <h1>Welcome, {user.name}!</h1>
          
          <RoleGuard role="premium">
            <PremiumFeatures />
          </RoleGuard>
          
          <FeatureFlag flag="new-ui">
            <NewUserInterface />
          </FeatureFlag>
          
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <LoginForm onLogin={login} />
      )}
    </div>
  );
}
```

### Admin Panel

```tsx
function AdminPanel() {
  const { toggleFlag, flags } = useFeatureFlags();

  return (
    <ProtectedRoute requireRole="admin">
      <div>
        <h1>Admin Panel</h1>
        
        <PermissionGuard permission="users:manage">
          <UserManagement />
        </PermissionGuard>
        
        <PermissionGuard permission="features:manage">
          <div>
            <h2>Feature Flags</h2>
            {flags.map(flag => (
              <FeatureToggle 
                key={flag.key} 
                flag={flag.key} 
                onToggle={toggleFlag}
              />
            ))}
          </div>
        </PermissionGuard>
      </div>
    </ProtectedRoute>
  );
}
```

### Multi-Tenant Dashboard

```tsx
function MultiTenantDashboard() {
  const { currentTenant, switchTenant, availableTenants } = useTenant();

  return (
    <div>
      <header>
        <h1>{currentTenant?.name} Dashboard</h1>
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
      </header>
      
      <main>
        <RoleGuard role="admin" fallback={<UserDashboard />}>
          <AdminDashboard />
        </RoleGuard>
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
