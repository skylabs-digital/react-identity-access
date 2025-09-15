# React Identity Access

A powerful, modern authentication and authorization library for React applications. Built with TypeScript, featuring role-based access control, permission management, and seamless integration with React applications.

## 🚀 Features

- **🔐 Secure Authentication** - JWT-based authentication with automatic token refresh
- **👥 Role-Based Access Control** - Granular permission system with role hierarchy
- **🛡️ Protected Components** - Easy-to-use components for conditional rendering
- **📱 Multi-Tenant Support** - Built-in support for multi-tenant applications
- **🎯 TypeScript First** - Full TypeScript support with comprehensive type definitions
- **⚡ Modern React** - Built with React hooks and context for optimal performance
- **🔄 Session Management** - Automatic session handling and token refresh
- **🎨 Feature Flags** - Built-in feature flag management
- **💳 Subscription Management** - Integrated billing and subscription handling

## 📦 Installation

```bash
npm install @skylabs-digital/react-identity-access
# or
yarn add @skylabs-digital/react-identity-access
# or
pnpm add @skylabs-digital/react-identity-access
```

## 🏃‍♂️ Quick Start

### 1. Setup Providers

Wrap your application with the required providers:

```tsx
import { AppProvider, AuthProvider } from '@skylabs-digital/react-identity-access';

function App() {
  return (
    <AppProvider
      config={{
        baseUrl: 'https://your-api.com',
        appId: 'your-app-id',
        tenantMode: 'subdomain', // or 'path' or 'header'
        selectorParam: 'tenant',
      }}
    >
      <AuthProvider>
        {/* Your app components */}
      </AuthProvider>
    </AppProvider>
  );
}
```

### 2. Use Authentication

```tsx
import { useAuth } from '@skylabs-digital/react-identity-access';

function LoginComponent() {
  const { login, logout, sessionManager } = useAuth();
  const user = sessionManager.getUser();

  const handleLogin = async () => {
    try {
      await login('user@example.com', 'password', 'tenant-id');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div>
      {user ? (
        <div>
          <p>Welcome, {user.name}!</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}
```

### 3. Protect Components

```tsx
import { Protected } from '@skylabs-digital/react-identity-access';

function AdminPanel() {
  return (
    <Protected
      requiredPermissions={['admin:read', 'users:manage']}
      fallback={<div>Access denied</div>}
    >
      <div>Admin content here</div>
    </Protected>
  );
}
```

## 🏗️ Architecture

### Core Providers

- **AppProvider** - Application configuration and context
- **AuthProvider** - Authentication and session management
- **FeatureFlagProvider** - Feature flag management
- **SubscriptionProvider** - Billing and subscription handling

### Permission System

The library uses a resource-action permission format:

```
resource:action
```

Examples:
- `users:read` - Read user data
- `products:write` - Create/update products
- `admin:*` - All admin permissions
- `reports:read` - View reports

## 📚 Documentation

- [📖 Implementation Guide](./docs/implementation.md)
- [🔧 Advanced Usage](./docs/advanced-usage.md)
- [🤝 Contributing](./docs/contributing.md)
- [📋 API Reference](./docs/api-reference.md)
- [🎯 Examples](./docs/examples.md)

## 🎮 Demo Application

A complete demo application is included in the `template/` directory. To run it:

```bash
cd template
pnpm install
pnpm start
```

The demo showcases:
- User authentication flow
- Role-based dashboard
- Permission testing
- Protected routes
- Feature flag usage

## 🛠️ Development

### Prerequisites

- Node.js 16+
- pnpm (recommended) or npm/yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/skylabs-digital/react-identity-access.git
cd react-identity-access

# Install dependencies
pnpm install

# Build the library
pnpm build

# Run tests
pnpm test

# Start development
pnpm dev
```

### Project Structure

```
react-identity-access/
├── src/                    # Library source code
│   ├── components/         # React components
│   ├── providers/          # Context providers
│   ├── services/           # API services
│   ├── types/              # TypeScript definitions
│   └── index.ts           # Main export
├── template/               # Demo application
├── docs/                   # Documentation
├── dist/                   # Built library
└── package.json
```

## 🔧 Configuration

### Environment Variables

```env
REACT_APP_BASE_URL=https://your-api.com
REACT_APP_ID=your-app-id
REACT_APP_TENANT_MODE=subdomain
```

### AppProvider Config

```tsx
interface AppConfig {
  baseUrl: string;           // API base URL
  appId: string;            // Application identifier
  tenantMode: 'subdomain' | 'path' | 'header';
  selectorParam: string;    // Tenant selector parameter
  apiTimeout?: number;      // Request timeout (default: 30000)
  retryAttempts?: number;   // Retry attempts (default: 3)
}
```

## 🧪 Testing

The library includes comprehensive tests:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## 📈 Performance

- **Tree-shakable** - Only import what you need
- **Lazy loading** - Components load on demand
- **Optimized re-renders** - Minimal React re-renders
- **Caching** - Intelligent caching of API responses

## 🔒 Security

- **JWT tokens** with automatic refresh
- **Secure storage** of sensitive data
- **CSRF protection** built-in
- **Permission validation** on both client and server
- **Audit logging** for security events

## 🌐 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./docs/contributing.md) for details.

## 📞 Support

- 📧 Email: support@skylabs.com
- 💬 Discord: [Join our community](https://discord.gg/skylabs)
- 🐛 Issues: [GitHub Issues](https://github.com/skylabs-digital/react-identity-access/issues)
- 📖 Docs: [Documentation](./docs/)

## 🎯 Roadmap

- [ ] OAuth 2.0 / OpenID Connect support
- [ ] Multi-factor authentication
- [ ] Advanced audit logging
- [ ] GraphQL integration
- [ ] React Native support
- [ ] SSR/Next.js optimization

---

Made with ❤️ by [Skylabs Digital](https://skylabs.digital)
