# React Identity Access

A comprehensive, production-ready React library for multi-tenant identity and access management with built-in authentication, authorization, feature flags, subscriptions, and payment processing.

## 🚀 Quick Start

```bash
npm install react-identity-access
```

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

function App() {
  return (
    <ConnectorProvider
      config={{
        type: 'localStorage', // or 'fetch' for API
        appId: 'my-app',
        seedData: {
          tenants: [{ id: 'demo', name: 'Demo Tenant' }],
          users: [{ id: '1', email: 'admin@demo.com', tenantId: 'demo' }]
        }
      }}
    >
      <TenantProvider config={{ strategy: 'query-param' }}>
        <IdentityProvider>
          <FeatureFlagsProvider>
            <SubscriptionProvider>
              <SettingsProvider schema={settingsSchema} defaults={defaultSettings}>
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

## ✨ Features

### 🔐 Multi-Tenant Authentication
- **Tenant-isolated sessions**: Each tenant maintains separate user sessions
- **Automatic tenant switching**: Preserves sessions across tenant changes
- **Role-based access control**: Fine-grained permissions system
- **Token management**: Automatic refresh and expiration handling

### 🚩 Feature Flags
- **Dynamic toggling**: Enable/disable features per tenant
- **Admin controls**: Tenant admins can manage their feature flags
- **React components**: `<FeatureFlag>` and `<FeatureGate>` components
- **Server-side control**: Centralized feature flag management

### 💳 Subscription Management
- **Multiple plans**: Support for tiered subscription models
- **Usage limits**: Enforce feature and usage restrictions
- **Billing integration**: Built-in payment gateway support
- **Plan changes**: Seamless subscription upgrades/downgrades

### ⚙️ Settings Management
- **Schema validation**: Type-safe settings with Zod schemas
- **Tenant-specific**: Isolated settings per tenant
- **Manual save**: Explicit save actions prevent data loss
- **Version control**: Settings versioning support

### 🔌 Flexible Architecture
- **Pluggable connectors**: localStorage, REST API, or custom
- **Payment gateways**: Stripe, MercadoPago, extensible
- **TypeScript first**: Full type safety throughout
- **SSR ready**: Server-side rendering support

## 📖 Core Concepts

### Providers Architecture

The library uses a layered provider architecture:

```
ConnectorProvider (Data Layer)
└── TenantProvider (Tenant Resolution)
    └── IdentityProvider (Authentication)
        └── FeatureFlagsProvider (Feature Control)
            └── SubscriptionProvider (Billing)
                └── SettingsProvider (Configuration)
```

### Connectors

Connectors abstract data access:

- **LocalStorageConnector**: Perfect for demos and prototyping
- **FetchConnector**: Production REST API integration
- **Custom Connectors**: Implement `BaseConnector` for any data source

### Multi-Tenant Sessions

Sessions are stored per tenant using the pattern `auth_session_[tenantId]`:

```typescript
// Automatic tenant isolation
localStorage.getItem('auth_session_acme-corp')
localStorage.getItem('auth_session_startup-inc')
```

## 🛠️ Development

### Prerequisites

- Node.js 18+
- React 18+
- TypeScript 5+

### Installation

```bash
git clone https://github.com/your-org/react-identity-access
cd react-identity-access
npm install
```

### Demo Application

```bash
cd demo
npm install
npm run dev
```

Visit `http://localhost:5174?tenant=acme-corp` to see the demo.

### Testing

```bash
npm test
```

### Building

```bash
npm run build
```

## 📚 Documentation

- [**Getting Started**](./docs/GETTING_STARTED.md) - Complete setup guide
- [**API Reference**](./docs/API_REFERENCE.md) - Detailed API documentation
- [**Architecture**](./docs/ARCHITECTURE.md) - System design and patterns
- [**Components**](./docs/COMPONENTS.md) - React component library
- [**Connectors**](./docs/CONNECTORS.md) - Data layer implementation
- [**Deployment**](./docs/DEPLOYMENT.md) - Production deployment guide
- [**Migration**](./docs/MIGRATION.md) - Version upgrade guides
- [**Contributing**](./docs/CONTRIBUTING.md) - Development guidelines
- [**Examples**](./docs/EXAMPLES.md) - Real-world usage examples

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./docs/CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Run tests: `npm test`
6. Commit changes: `git commit -m 'Add amazing feature'`
7. Push to branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

Built with modern React patterns and inspired by enterprise-grade identity solutions.

---

**Need help?** Check our [documentation](./docs/) or open an [issue](https://github.com/your-org/react-identity-access/issues).
