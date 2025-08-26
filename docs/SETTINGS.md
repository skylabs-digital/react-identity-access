# Settings Management

The React Identity Access library includes a comprehensive settings management system that allows you to handle application configuration, user preferences, and tenant-specific settings with type safety and schema validation.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
- [Connectors](#connectors)
- [Components](#components)
- [Schema Definition](#schema-definition)
- [Integration with Identity](#integration-with-identity)
- [Examples](#examples)
- [Best Practices](#best-practices)

## Overview

The settings system provides:

- **Type-safe configuration**: Zod schema validation for all settings
- **Public/Private settings**: Control visibility of settings to end users
- **Multi-tenant support**: Tenant-specific configuration management
- **Multiple storage backends**: LocalStorage, API, or custom connectors
- **React components**: Ready-to-use admin panels and conditional rendering
- **Identity integration**: Automatic authentication state detection

## Quick Start

### Basic Setup

```tsx
import { SettingsProvider, SettingsLocalStorageConnector, z } from 'react-identity-access';

// Define your settings schema
const settingsSchema = z.object({
  siteName: z.string().public(),
  theme: z.enum(['light', 'dark']).public(),
  maxUsers: z.number(),
  adminEmail: z.string().email(),
});

// Create connector
const settingsConnector = new SettingsLocalStorageConnector();

function App() {
  return (
    <SettingsProvider
      appId="my-app"
      tenantId="tenant-1"
      version="1.0.0"
      connector={settingsConnector}
      schema={settingsSchema}
      defaults={{
        siteName: 'My Application',
        theme: 'light',
        maxUsers: 100,
        adminEmail: 'admin@example.com',
      }}
    >
      <YourApp />
    </SettingsProvider>
  );
}
```

### Using Settings

```tsx
import { useSettings } from 'react-identity-access';

function MyComponent() {
  const { settings, publicSettings, updateSetting, isLoading } = useSettings();

  if (isLoading) return <div>Loading settings...</div>;

  return (
    <div>
      <h1>{settings.siteName}</h1>
      <p>Theme: {settings.theme}</p>
      
      <button 
        onClick={() => updateSetting('theme', settings.theme === 'light' ? 'dark' : 'light')}
      >
        Toggle Theme
      </button>
    </div>
  );
}
```

## Core Concepts

### Public vs Private Settings

Settings can be marked as public or private using Zod schema extensions:

```tsx
const schema = z.object({
  // Public settings - visible to all users
  siteName: z.string().public(),
  theme: z.enum(['light', 'dark']).public(),
  
  // Private settings - only visible to authenticated users
  adminEmail: z.string().email(),
  maxUsers: z.number().private(),
});
```

- **Public settings**: Accessible via `publicSettings`, can be displayed to anonymous users
- **Private settings**: Only available in `settings`, requires authentication

### Multi-Tenant Architecture

Settings are scoped by `appId` and `tenantId`:

```tsx
<SettingsProvider
  appId="my-app"        // Application identifier
  tenantId="tenant-1"   // Tenant identifier
  // ... other props
>
```

This allows different tenants to have completely separate configurations while sharing the same application.

### Schema Versioning

Settings support versioning for schema evolution:

```tsx
<SettingsProvider
  version="2.0.0"  // Schema version
  // ... other props
>
```

## API Reference

### SettingsProvider Props

```tsx
interface SettingsProviderProps {
  appId: string;                    // Application identifier
  tenantId: string;                 // Tenant identifier  
  version: string;                  // Schema version
  connector: SettingsConnector;     // Storage connector
  schema?: any;                     // Zod schema (optional)
  defaults?: any;                   // Default values
  isAuthenticated?: boolean;        // Manual auth override
  children: React.ReactNode;
}
```

### useSettings Hook

```tsx
interface SettingsContextValue {
  settings: any;                    // All settings (requires auth)
  publicSettings: any;              // Public settings only
  isLoading: boolean;               // Loading state
  error: string | null;             // Error message
  updateSetting: (key: string, value: any) => Promise<void>;
  updateSettings: (newSettings: any) => Promise<void>;
  resetSettings: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}
```

## Connectors

### LocalStorageConnector

Stores settings in browser localStorage:

```tsx
import { SettingsLocalStorageConnector } from 'react-identity-access';

const connector = new SettingsLocalStorageConnector();
```

**Features:**
- Automatic JSON serialization/deserialization
- Separate storage for public/private settings
- Schema caching
- Error handling for invalid JSON

### FetchConnector

Connects to a REST API backend:

```tsx
import { SettingsFetchConnector, createSettingsFetchConnector } from 'react-identity-access';

const connector = new SettingsFetchConnector({
  baseUrl: 'https://api.example.com',
  apiKey: 'your-api-key',
});

// Or use the factory function
const connector = createSettingsFetchConnector({
  baseUrl: 'https://api.example.com',
  apiKey: 'your-api-key',
});
```

**API Endpoints:**
- `GET /api/v1/settings/{appId}/{tenantId}/public` - Get public settings
- `GET /api/v1/settings/{appId}/{tenantId}/private` - Get private settings
- `POST /api/v1/settings/{appId}/{tenantId}` - Update settings
- `GET /api/v1/settings/{appId}/{tenantId}/schema` - Get schema
- `POST /api/v1/settings/{appId}/{tenantId}/schema` - Update schema

### Custom Connectors

Implement the `SettingsConnector` interface:

```tsx
interface SettingsConnector {
  getPublicSettings(appId: string, tenantId: string): Promise<any>;
  getPrivateSettings(appId: string, tenantId: string): Promise<any>;
  updateSettings(appId: string, tenantId: string, settings: any): Promise<void>;
  getSchema(appId: string, tenantId: string): Promise<any>;
  updateSchema(appId: string, tenantId: string, schema: any, version: string): Promise<void>;
}
```

## Components

### SettingsAdminPanel

A complete admin interface for managing settings:

```tsx
import { SettingsAdminPanel } from 'react-identity-access';

function AdminPage() {
  return (
    <SettingsAdminPanel
      title="Application Settings"
      sections={[
        {
          key: 'general',
          label: 'General Settings',
          fields: ['siteName', 'theme']
        },
        {
          key: 'advanced',
          label: 'Advanced Settings', 
          fields: ['maxUsers', 'adminEmail']
        }
      ]}
      onSave={(settings) => console.log('Settings saved:', settings)}
      onReset={() => console.log('Settings reset')}
    />
  );
}
```

### SettingsConditional

Conditionally render content based on setting values:

```tsx
import { SettingsConditional } from 'react-identity-access';

function MyComponent() {
  return (
    <div>
      <SettingsConditional settingKey="theme" expectedValue="dark">
        <DarkThemeContent />
      </SettingsConditional>
      
      <SettingsConditional 
        settingKey="features.betaMode" 
        expectedValue={true}
        fallback={<StandardFeatures />}
      >
        <BetaFeatures />
      </SettingsConditional>
    </div>
  );
}
```

### SettingsSwitch

A toggle switch for boolean settings:

```tsx
import { SettingsSwitch } from 'react-identity-access';

function SettingsPage() {
  return (
    <div>
      <SettingsSwitch
        settingKey="notifications.email"
        label="Email Notifications"
        description="Receive notifications via email"
      />
      
      <SettingsSwitch
        settingKey="features.darkMode"
        label="Dark Mode"
        disabled={!user.isPremium}
      />
    </div>
  );
}
```

## Schema Definition

### Zod Extensions

The settings system extends Zod with public/private field marking:

```tsx
import { z } from 'react-identity-access';

const schema = z.object({
  // Public fields
  siteName: z.string().public(),
  theme: z.enum(['light', 'dark']).public(),
  
  // Private fields (default)
  adminEmail: z.string().email(),
  secretKey: z.string().private(), // Explicit private
  
  // Nested objects
  features: z.object({
    betaMode: z.boolean().public(),
    advancedFeatures: z.boolean(),
  }),
  
  // Arrays
  allowedDomains: z.array(z.string()).public(),
});
```

### Schema Validation

Settings are automatically validated against the schema:

```tsx
// This will throw a validation error
await updateSetting('maxUsers', 'invalid-number');

// This will succeed
await updateSetting('maxUsers', 150);
```

### Schema Evolution

Handle schema changes with versioning:

```tsx
// Version 1.0.0
const schemaV1 = z.object({
  siteName: z.string().public(),
  theme: z.enum(['light', 'dark']).public(),
});

// Version 2.0.0 - Added new field
const schemaV2 = z.object({
  siteName: z.string().public(),
  theme: z.enum(['light', 'dark', 'auto']).public(), // Extended enum
  language: z.string().public().default('en'),        // New field with default
});
```

## Integration with Identity

The settings system automatically integrates with the identity system:

### Automatic Authentication Detection

```tsx
// Settings provider automatically detects authentication state
<IdentityProvider connector={identityConnector}>
  <SettingsProvider connector={settingsConnector}>
    <App />
  </SettingsProvider>
</IdentityProvider>
```

### Manual Authentication Override

```tsx
<SettingsProvider
  isAuthenticated={customAuthState}
  // ... other props
>
```

### Authentication-Based Access

```tsx
function MyComponent() {
  const { settings, publicSettings } = useSettings();
  const { isAuthenticated } = useAuth();
  
  // Always available
  console.log(publicSettings.siteName);
  
  // Only available when authenticated
  if (isAuthenticated) {
    console.log(settings.adminEmail);
  }
}
```

## Examples

### Complete Application Setup

```tsx
import React from 'react';
import { 
  IdentityProvider, 
  SettingsProvider,
  SettingsLocalStorageConnector,
  LocalStorageConnector,
  z
} from 'react-identity-access';

// Settings schema
const settingsSchema = z.object({
  siteName: z.string().public(),
  theme: z.enum(['light', 'dark']).public(),
  language: z.string().public(),
  maxUsers: z.number(),
  adminEmail: z.string().email(),
  features: z.object({
    betaMode: z.boolean().public(),
    advancedReports: z.boolean(),
  }),
});

// Connectors
const identityConnector = new LocalStorageConnector({ /* seed data */ });
const settingsConnector = new SettingsLocalStorageConnector();

function App() {
  return (
    <IdentityProvider connector={identityConnector}>
      <SettingsProvider
        appId="my-saas-app"
        tenantId="tenant-123"
        version="1.0.0"
        connector={settingsConnector}
        schema={settingsSchema}
        defaults={{
          siteName: 'My SaaS App',
          theme: 'light',
          language: 'en',
          maxUsers: 50,
          adminEmail: 'admin@example.com',
          features: {
            betaMode: false,
            advancedReports: false,
          },
        }}
      >
        <Router>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<AdminPanel />} />
          </Routes>
        </Router>
      </SettingsProvider>
    </IdentityProvider>
  );
}
```

### Settings Dashboard

```tsx
import { useSettings, SettingsSwitch, SettingsConditional } from 'react-identity-access';

function SettingsPage() {
  const { settings, updateSetting, isLoading } = useSettings();

  if (isLoading) return <div>Loading settings...</div>;

  return (
    <div className="settings-page">
      <h1>Settings</h1>
      
      <section>
        <h2>Appearance</h2>
        <SettingsSwitch
          settingKey="theme"
          label="Dark Mode"
          trueValue="dark"
          falseValue="light"
        />
      </section>
      
      <section>
        <h2>Features</h2>
        <SettingsSwitch
          settingKey="features.betaMode"
          label="Beta Features"
          description="Enable experimental features"
        />
        
        <SettingsConditional settingKey="features.betaMode" expectedValue={true}>
          <div className="beta-warning">
            ⚠️ Beta features may be unstable
          </div>
        </SettingsConditional>
      </section>
      
      <section>
        <h2>Localization</h2>
        <select 
          value={settings.language}
          onChange={(e) => updateSetting('language', e.target.value)}
        >
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
        </select>
      </section>
    </div>
  );
}
```

### Admin Panel with Full Settings Management

```tsx
import { SettingsAdminPanel, useAuth, RoleGuard } from 'react-identity-access';

function AdminPanel() {
  const { user } = useAuth();

  const handleSave = async (settings) => {
    console.log('Saving settings:', settings);
    // Additional save logic here
  };

  const handleReset = async () => {
    console.log('Resetting settings');
    // Additional reset logic here
  };

  return (
    <RoleGuard role="admin">
      <div className="admin-panel">
        <h1>Admin Panel</h1>
        
        <SettingsAdminPanel
          title="Application Configuration"
          sections={[
            {
              key: 'branding',
              label: 'Branding',
              fields: ['siteName', 'theme', 'language']
            },
            {
              key: 'limits',
              label: 'System Limits',
              fields: ['maxUsers']
            },
            {
              key: 'notifications',
              label: 'Notifications',
              fields: ['adminEmail']
            },
            {
              key: 'features',
              label: 'Feature Flags',
              fields: ['features.betaMode', 'features.advancedReports']
            }
          ]}
          onSave={handleSave}
          onReset={handleReset}
        />
      </div>
    </RoleGuard>
  );
}
```

### API Integration Example

```tsx
import { SettingsFetchConnector } from 'react-identity-access';

// Custom connector with authentication
class AuthenticatedSettingsConnector extends SettingsFetchConnector {
  constructor(config) {
    super({
      ...config,
      fetchModule: async (url, options = {}) => {
        const token = localStorage.getItem('authToken');
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
          },
        });
      },
    });
  }
}

const settingsConnector = new AuthenticatedSettingsConnector({
  baseUrl: 'https://api.myapp.com',
  apiKey: process.env.REACT_APP_API_KEY,
});
```

## Best Practices

### Schema Design

1. **Use descriptive field names**: `maxConcurrentUsers` instead of `max`
2. **Group related settings**: Use nested objects for organization
3. **Provide defaults**: Always include sensible default values
4. **Mark public fields explicitly**: Use `.public()` for end-user visible settings

```tsx
// Good schema design
const schema = z.object({
  branding: z.object({
    siteName: z.string().public(),
    logoUrl: z.string().url().public().optional(),
    primaryColor: z.string().public(),
  }),
  limits: z.object({
    maxUsers: z.number().min(1).max(10000),
    maxStorageGB: z.number().min(1),
  }),
  features: z.object({
    advancedAnalytics: z.boolean(),
    customDomains: z.boolean(),
  }),
});
```

### Performance Optimization

1. **Use public settings for anonymous users**: Avoid loading private settings unnecessarily
2. **Implement caching**: Use React Query or SWR for API-based connectors
3. **Batch updates**: Update multiple settings in a single call

```tsx
// Batch updates
const { updateSettings } = useSettings();

await updateSettings({
  'branding.siteName': 'New Name',
  'branding.primaryColor': '#007bff',
  'features.advancedAnalytics': true,
});
```

### Error Handling

1. **Provide fallbacks**: Always have default values
2. **Handle validation errors**: Show user-friendly error messages
3. **Implement retry logic**: For network-based connectors

```tsx
function SettingsForm() {
  const { updateSetting, error } = useSettings();
  const [localError, setLocalError] = useState(null);

  const handleUpdate = async (key, value) => {
    try {
      setLocalError(null);
      await updateSetting(key, value);
    } catch (err) {
      setLocalError(`Failed to update ${key}: ${err.message}`);
    }
  };

  if (error || localError) {
    return <div className="error">{error || localError}</div>;
  }

  // ... rest of component
}
```

### Security Considerations

1. **Validate on both client and server**: Never trust client-side validation alone
2. **Sanitize user input**: Especially for string fields that might be displayed
3. **Use HTTPS**: For API-based connectors
4. **Implement proper authentication**: Verify user permissions before allowing updates

```tsx
// Server-side validation example (Node.js/Express)
app.post('/api/v1/settings/:appId/:tenantId', authenticate, async (req, res) => {
  try {
    // Validate user has permission to update settings for this tenant
    if (!user.canManageSettings(req.params.tenantId)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Validate against schema
    const validatedSettings = settingsSchema.parse(req.body);
    
    // Update settings
    await updateSettings(req.params.appId, req.params.tenantId, validatedSettings);
    
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```
