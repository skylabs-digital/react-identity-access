# Getting Started

This guide will help you integrate React Identity Access into your application step by step.

## Installation

```bash
npm install react-identity-access
# or
yarn add react-identity-access
```

## Basic Setup

### 1. Provider Configuration

Wrap your app with the provider hierarchy:

```tsx
import React from 'react';
import {
  ConnectorProvider,
  TenantProvider,
  IdentityProvider,
  FeatureFlagsProvider,
  SubscriptionProvider,
  SettingsProvider
} from 'react-identity-access';
import { z } from 'zod';

// Define your settings schema
const settingsSchema = z.object({
  siteName: z.string(),
  theme: z.enum(['light', 'dark']),
  maxUsers: z.number(),
  features: z.object({
    advancedMode: z.boolean(),
    betaFeatures: z.boolean()
  })
});

const defaultSettings = {
  siteName: 'My App',
  theme: 'light' as const,
  maxUsers: 100,
  features: {
    advancedMode: false,
    betaFeatures: false
  }
};

function App() {
  return (
    <ConnectorProvider
      config={{
        type: 'localStorage',
        appId: 'my-app',
        seedData: {
          tenants: [
            { id: 'demo', name: 'Demo Company', domain: 'demo.com' }
          ],
          users: [
            {
              id: '1',
              email: 'admin@demo.com',
              name: 'Admin User',
              tenantId: 'demo',
              roles: ['admin'],
              isActive: true,
              createdAt: new Date()
            }
          ],
          passwords: [
            { userId: '1', hash: 'admin123' } // Demo only - use proper hashing
          ]
        }
      }}
    >
      <TenantProvider config={{ strategy: 'query-param' }}>
        <IdentityProvider>
          <FeatureFlagsProvider>
            <SubscriptionProvider>
              <SettingsProvider 
                schema={settingsSchema} 
                defaults={defaultSettings}
                config={{ version: '1.0.0', autoSave: false }}
              >
                <YourApp />
              </SettingsProvider>
            </SubscriptionProvider>
          </FeatureFlagsProvider>
        </IdentityProvider>
      </TenantProvider>
    </ConnectorProvider>
  );
}
```

### 2. Using Hooks

Access functionality through hooks:

```tsx
import React from 'react';
import { useAuth, useFeatureFlags, useSettings, useSubscription } from 'react-identity-access';

function Dashboard() {
  const { auth, login, logout } = useAuth();
  const { isEnabled } = useFeatureFlags();
  const { values: settings, updateSetting } = useSettings();
  const { subscription } = useSubscription();

  if (!auth.isAuthenticated) {
    return <LoginForm onLogin={login} />;
  }

  return (
    <div>
      <h1>Welcome, {auth.user?.name}!</h1>
      
      {isEnabled('advanced_dashboard') && (
        <AdvancedDashboard />
      )}
      
      <SettingsPanel 
        settings={settings}
        onUpdate={updateSetting}
      />
      
      {subscription && (
        <SubscriptionStatus subscription={subscription} />
      )}
      
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### 3. Components

Use built-in components for common patterns:

```tsx
import { FeatureFlag, SubscriptionGuard, RoleGuard } from 'react-identity-access';

function MyComponent() {
  return (
    <div>
      <FeatureFlag flag="new_feature">
        <NewFeatureComponent />
      </FeatureFlag>
      
      <SubscriptionGuard 
        requiredPlan="pro"
        fallback={<UpgradePrompt />}
      >
        <ProFeature />
      </SubscriptionGuard>
      
      <RoleGuard 
        requiredRoles={['admin']}
        fallback={<div>Access denied</div>}
      >
        <AdminPanel />
      </RoleGuard>
    </div>
  );
}
```

## Configuration Options

### Connector Types

#### LocalStorage (Development/Demo)
```tsx
<ConnectorProvider
  config={{
    type: 'localStorage',
    appId: 'my-app',
    seedData: { /* your seed data */ }
  }}
>
```

#### Fetch (Production)
```tsx
<ConnectorProvider
  config={{
    type: 'fetch',
    appId: 'my-app',
    baseUrl: 'https://api.myapp.com',
    apiKey: process.env.REACT_APP_API_KEY,
    seedData: { /* fallback data */ }
  }}
>
```

### Tenant Resolution Strategies

#### Query Parameter
```tsx
<TenantProvider config={{ strategy: 'query-param' }}>
  // Resolves from ?tenant=demo
```

#### Subdomain
```tsx
<TenantProvider config={{ strategy: 'subdomain' }}>
  // Resolves from demo.myapp.com
```

#### Static
```tsx
<TenantProvider config={{ 
  strategy: 'static',
  static: { tenantId: 'my-tenant' }
}}>
```

## Authentication Flow

### 1. Login
```tsx
const { login } = useAuth();

const handleLogin = async (email: string, password: string) => {
  try {
    await login({ email, password });
    // User is now authenticated
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

### 2. Session Management
Sessions are automatically managed per tenant:
- `auth_session_tenant1` - Tenant 1 session
- `auth_session_tenant2` - Tenant 2 session

### 3. Token Refresh
Tokens are automatically refreshed when expired:
```tsx
// Automatic refresh happens behind the scenes
const { auth } = useAuth();
console.log(auth.user); // Always current user info
```

## Feature Flags

### Basic Usage
```tsx
const { isEnabled, toggleFlag } = useFeatureFlags();

// Check if feature is enabled
if (isEnabled('new_ui')) {
  return <NewUI />;
}

// Toggle feature (admin only)
await toggleFlag('beta_features', true);
```

### Component Usage
```tsx
<FeatureFlag flag="experimental_feature">
  <ExperimentalComponent />
</FeatureFlag>

<FeatureFlag 
  flag="premium_feature"
  fallback={<div>Premium feature - upgrade to access</div>}
>
  <PremiumComponent />
</FeatureFlag>
```

## Settings Management

### Schema Definition
```tsx
import { z } from 'zod';

const settingsSchema = z.object({
  appearance: z.object({
    theme: z.enum(['light', 'dark', 'auto']),
    language: z.string(),
    timezone: z.string()
  }),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    frequency: z.enum(['immediate', 'daily', 'weekly'])
  }),
  limits: z.object({
    maxUsers: z.number().min(1).max(1000),
    storageGB: z.number().min(1).max(100)
  })
});
```

### Usage
```tsx
const { values, updateSetting, save, isDirty } = useSettings();

// Update a nested setting
await updateSetting('appearance.theme', 'dark');

// Update multiple settings
await updateSettings({
  'notifications.email': true,
  'limits.maxUsers': 50
});

// Save changes (manual save mode)
if (isDirty) {
  await save();
}
```

## Subscription Management

### Basic Usage
```tsx
const { subscription, plans, subscribe, changePlan } = useSubscription();

// Display current subscription
console.log(subscription?.planId); // 'pro'
console.log(subscription?.status); // 'active'

// Subscribe to a plan
await subscribe('pro', {
  paymentMethod: 'card_123',
  billingCycle: 'monthly'
});

// Change plan
await changePlan('enterprise');
```

### Usage Gates
```tsx
<SubscriptionGuard requiredPlan="pro">
  <ProFeature />
</SubscriptionGuard>

<LimitGate 
  feature="api_calls" 
  current={apiCallsUsed}
  limit={subscription?.limits.apiCalls}
>
  <ApiCallButton />
</LimitGate>
```

## Next Steps

- [API Reference](./API_REFERENCE.md) - Detailed API documentation
- [Architecture](./ARCHITECTURE.md) - Understanding the system design
- [Components](./COMPONENTS.md) - Complete component reference
- [Examples](./EXAMPLES.md) - Real-world implementation examples
