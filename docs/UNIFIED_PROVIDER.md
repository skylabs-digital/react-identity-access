# Unified Provider System

The `ReactIdentityProvider` is a unified provider that manages all connectors (identity, settings, subscription, feature flags, payments) with a single configuration. This eliminates the need to configure each provider separately and ensures consistency across all features.

**Note**: There's also a `SimpleUnifiedProvider` for basic use cases that provides a simplified API.

## Key Benefits

- **Single Configuration**: Define connector type (localStorage/fetch) in one place
- **Shared App Context**: appId and apiKey are consistent across all features
- **Easy Environment Switching**: Change from development (localStorage) to production (fetch) with one config change
- **Consistent API**: All connectors follow the same patterns
- **Simplified Setup**: One provider wraps everything

## Basic Usage

### ReactIdentityProvider (Full-Featured)

```tsx
import { ReactIdentityProvider, z } from 'react-identity-access';

// Define your settings schema
const settingsSchema = z.object({
  siteName: z.string(),
  theme: z.enum(['light', 'dark']),
  maxUsers: z.number(),
  adminEmail: z.string(),
});

const defaultSettings = {
  siteName: 'My App',
  theme: 'light' as const,
  maxUsers: 100,
  adminEmail: 'admin@example.com',
};

function App() {
  const config = {
    connector: {
      type: 'localStorage', // or 'fetch'
      appId: 'my-app',
      apiKey: 'your-api-key', // optional for localStorage
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
      settingsDefaults={defaultSettings}
      settingsVersion="1.0.0"
    >
      <YourApp />
    </ReactIdentityProvider>
  );
}
```

### SimpleUnifiedProvider (Simplified)

```tsx
import { SimpleUnifiedProvider, z } from 'react-identity-access';

function App() {
  return (
    <SimpleUnifiedProvider
      config={{
        type: 'localStorage',
        appId: 'my-app',
      }}
      settingsSchema={settingsSchema}
      settingsDefaults={defaultSettings}
      tenantResolver={{
        strategy: 'query-param',
        queryParam: {
          paramName: 'tenant',
          storageKey: 'app-tenant',
        },
      }}
    >
      <YourApp />
    </SimpleUnifiedProvider>
  );
}
```

## Configuration Options

### Connector Configuration

#### localStorage Configuration (Development)
```tsx
const config = {
  connector: {
    type: 'localStorage',
    appId: 'my-app',
    // apiKey is optional for localStorage
  },
  // ... other options
};
```

#### Fetch Configuration (Production)
```tsx
const config = {
  connector: {
    type: 'fetch',
    appId: 'my-app',
    apiKey: 'your-production-api-key',
    baseUrl: 'https://api.yourapp.com',
    endpoints: {
      identity: '/api/v1/identity',
      settings: '/api/v1/settings',
      subscription: '/api/v1/subscription',
      featureFlags: '/api/v1/feature-flags',
    },
  },
  // ... other options
};
```

### Tenant Resolution

#### Query Parameter (Development)
```tsx
tenantResolver: {
  strategy: 'query-param',
  queryParam: {
    paramName: 'tenant',
    storageKey: 'app-tenant', // Optional: persist in sessionStorage
  },
}
```

#### Subdomain (Production)
```tsx
tenantResolver: {
  strategy: 'subdomain',
  subdomain: {
    pattern: '{tenant}.yourapp.com', // Optional: custom pattern
  },
}
```

### Feature Control

```tsx
const config = {
  // ... connector config
  features: {
    settings: true,      // Enable settings management
    subscription: true,  // Enable subscription features
    featureFlags: true,  // Enable feature flags
  },
};
```

### Payment Gateway Integration

```tsx
import { StripePaymentGateway, MercadoPagoPaymentGateway } from 'react-identity-access';

const stripeGateway = new StripePaymentGateway({
  publicKey: process.env.REACT_APP_STRIPE_PUBLIC_KEY,
  secretKey: process.env.STRIPE_SECRET_KEY,
});

const config = {
  // ... other config
};

<ReactIdentityProvider
  config={config}
  paymentGateway={stripeGateway}
  subscriptionPlans={[
    { id: 'basic', name: 'Basic', price: 9.99 },
    { id: 'pro', name: 'Pro', price: 29.99 },
    { id: 'enterprise', name: 'Enterprise', price: 99.99 },
  ]}
>
  <YourApp />
</ReactIdentityProvider>
```

### Custom Components

```tsx
const config = {
  // ... other config
  components: {
    LoadingComponent: () => <div>Loading...</div>,
    LandingComponent: () => <div>Welcome! Please select a tenant.</div>,
    ErrorComponent: ({ error }) => <div>Error: {error}</div>,
  },
};
```

## Environment-Specific Configurations

### Development Environment
```tsx
// config/development.ts
export const devConfig = {
  connector: {
    type: 'localStorage' as const,
    appId: 'my-app-dev',
  },
  tenantResolver: {
    strategy: 'query-param' as const,
    queryParam: {
      paramName: 'tenant',
      storageKey: 'dev-tenant',
    },
  },
  features: {
    settings: true,
    subscription: true,
    featureFlags: true,
  },
};
```

### Production Environment
```tsx
// config/production.ts
export const prodConfig = {
  connector: {
    type: 'fetch' as const,
    appId: 'my-app',
    apiKey: process.env.REACT_APP_API_KEY,
    baseUrl: 'https://api.myapp.com',
  },
  tenantResolver: {
    strategy: 'subdomain' as const,
  },
  features: {
    settings: true,
    subscription: true,
    featureFlags: true,
  },
};
```

### Usage with Environment Config
```tsx
import { devConfig } from './config/development';
import { prodConfig } from './config/production';

const config = process.env.NODE_ENV === 'production' ? prodConfig : devConfig;

function App() {
  return (
    <ReactIdentityProvider
      config={config}
      settingsSchema={settingsSchema}
      settingsDefaults={defaultSettings}
    >
      <YourApp />
    </ReactIdentityProvider>
  );
}
```

## Accessing Unified Features

Use the provided hooks to access all features through the unified system:

```tsx
import { 
  useAuth, 
  useSettings, 
  useSubscription, 
  useFeatureFlags,
  useTenantPayment,
  useConnectors, 
  useAppContext 
} from 'react-identity-access';

function MyComponent() {
  // Authentication
  const { auth, login, logout } = useAuth();
  
  // Settings
  const { values, updateSetting, save } = useSettings();
  
  // Subscription & billing
  const { subscription, subscribe, usage, limits } = useSubscription();
  
  // Feature flags
  const { isEnabled, toggleFlag } = useFeatureFlags();
  
  // Payment processing (tenant-to-customer)
  const { processPayment, paymentHistory } = useTenantPayment();
  
  // Low-level connector access (if needed)
  const { identity, settings, subscription, featureFlags } = useConnectors();
  const { appId, apiKey, baseUrl } = useAppContext();
}
```

## Migration from Individual Providers

### Before (Multiple Providers)
```tsx
// Old way - multiple providers with separate configs
<IdentityProvider>
  <SettingsProvider 
    schema={schema}
    defaults={defaults}
  >
    <SubscriptionProvider>
      <TenantPaymentProvider paymentGateway={gateway}>
        <App />
      </TenantPaymentProvider>
    </SubscriptionProvider>
  </SettingsProvider>
</IdentityProvider>
```

### After (Unified Provider)
```tsx
// New way - single provider with unified config
<ReactIdentityProvider
  config={{
    connector: {
      type: 'localStorage',
      appId: 'my-app',
    },
    features: {
      settings: true,
      subscription: true,
      featureFlags: true,
    },
  }}
  settingsSchema={schema}
  settingsDefaults={defaults}
  paymentGateway={gateway}
  subscriptionPlans={plans}
>
  <App />
</ReactIdentityProvider>
```

### Simplified Option
```tsx
// Even simpler with SimpleUnifiedProvider
<SimpleUnifiedProvider
  config={{ type: 'localStorage', appId: 'my-app' }}
  settingsSchema={schema}
  settingsDefaults={defaults}
>
  <App />
</SimpleUnifiedProvider>
```

## Best Practices

1. **Environment Variables**: Use environment variables for production API keys and URLs
2. **Type Safety**: Use TypeScript with proper typing for configuration
3. **Feature Flags**: Disable unused features to reduce bundle size
4. **Error Handling**: Provide custom error components for better UX
5. **Loading States**: Customize loading components to match your design
6. **Payment Security**: Never expose payment gateway secret keys in frontend code
7. **Subscription Limits**: Implement proper usage tracking and limit enforcement
8. **Multi-tenancy**: Use appropriate tenant resolution strategy for your deployment

## API Reference

### ReactIdentityProviderProps

```tsx
interface ReactIdentityProviderProps {
  config: ReactIdentityConfig;
  children: React.ReactNode;
  
  // Settings-specific props
  settingsSchema?: ZodSchema;
  settingsDefaults?: any;
  settingsVersion?: string;
  
  // Subscription-specific props
  subscriptionPlans?: Plan[];
  paymentGateway?: PaymentGateway;
}
```

### SimpleUnifiedProviderProps

```tsx
interface SimpleUnifiedProviderProps {
  config: {
    type: 'localStorage' | 'fetch';
    appId: string;
    apiKey?: string;
    baseUrl?: string;
  };
  children: React.ReactNode;
  
  // Settings props
  settingsSchema?: any;
  settingsDefaults?: any;
  settingsVersion?: string;
  
  // Tenant resolver
  tenantResolver?: {
    strategy: 'query-param' | 'subdomain';
    queryParam?: {
      paramName: string;
      storageKey: string;
    };
  };
  
  // Components
  LoadingComponent?: React.ComponentType;
  LandingComponent?: React.ComponentType;
}
```

### ReactIdentityConfig

```tsx
interface ReactIdentityConfig {
  connector: ConnectorConfig;
  tenantResolver?: TenantResolver;
  features?: {
    settings?: boolean;
    subscription?: boolean;
    featureFlags?: boolean;
  };
  components?: {
    LoadingComponent?: React.ComponentType;
    LandingComponent?: React.ComponentType;
    ErrorComponent?: React.ComponentType<{ error: string }>;
  };
}
```

### ConnectorConfig

```tsx
interface ConnectorConfig {
  type: 'localStorage' | 'fetch';
  appId: string;
  apiKey?: string;
  baseUrl?: string;
  endpoints?: {
    identity?: string;
    settings?: string;
    subscription?: string;
    featureFlags?: string;
    payments?: string;
  };
}
```

## Current Implementation Status

### ✅ Fully Implemented
- `ReactIdentityProvider` - Full unified provider with all features
- `SimpleUnifiedProvider` - Simplified provider for basic use cases
- Settings management with schema validation
- Subscription and billing system
- Payment gateway integration (Stripe, MercadoPago)
- Feature flags system
- Multi-tenant support

### ⚠️ Partially Implemented
- Some fetch connectors still use localStorage fallback
- TypeScript types need refinement

### 🎯 Usage Recommendation

For new projects, use `ReactIdentityProvider` for full control or `SimpleUnifiedProvider` for rapid prototyping. Both provide the unified architecture benefits while maintaining backward compatibility with individual providers.
```
