# React Identity Access

A powerful, modern authentication and authorization library for React applications. Built with TypeScript, featuring role-based access control, permission management, Magic Link authentication, and seamless integration with React applications.

## 🚀 Features

- **🔐 Secure Authentication** - JWT-based authentication with automatic token refresh
- **✨ Magic Link Authentication** - Passwordless authentication via email with automatic verification
- **📧 Flexible Login** - Support for both email and phone number authentication
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
import { 
  AppProvider, 
  TenantProvider, 
  AuthProvider 
} from '@skylabs-digital/react-identity-access';

function App() {
  return (
    <AppProvider
      config={{
        baseUrl: 'https://your-api.com',
        appId: 'your-app-id',
      }}
    >
      <TenantProvider
        config={{
          tenantMode: 'selector', // 'subdomain', 'selector', or 'fixed'
          selectorParam: 'tenant',
        }}
      >
        <AuthProvider>
          {/* Your app components */}
        </AuthProvider>
      </TenantProvider>
    </AppProvider>
  );
}
```

### 2. Traditional Authentication

```tsx
import { useAuth } from '@skylabs-digital/react-identity-access';

function LoginComponent() {
  const { login, logout, sessionManager } = useAuth();
  const user = sessionManager.getUser();

  const handleLogin = async () => {
    try {
      // Supports both email and phone number
      await login('user@example.com', 'password'); // Email
      // await login('+1234567890', 'password'); // Phone
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

### 3. Magic Link Authentication

```tsx
import { 
  MagicLinkForm, 
  MagicLinkVerify,
  useAuth 
} from '@skylabs-digital/react-identity-access';
import { useNavigate } from 'react-router-dom';

// Send Magic Link
function MagicLinkLogin() {
  const navigate = useNavigate();

  const handleSuccess = (response) => {
    console.log('Magic link sent successfully!');
  };

  return (
    <MagicLinkForm
      frontendUrl="https://yourapp.com"
      onSuccess={handleSuccess}
      onLoginClick={() => navigate('/login')}
      onSignupClick={() => navigate('/signup')}
    />
  );
}

// Verify Magic Link (at /magic-link/verify route)
function MagicLinkVerifyPage() {
  const navigate = useNavigate();

  const handleSuccess = (data) => {
    console.log('Magic link verified!', data);
    navigate('/dashboard');
  };

  const handleError = (error) => {
    console.error('Verification failed:', error);
  };

  return (
    <MagicLinkVerify
      onSuccess={handleSuccess}
      onError={handleError}
      onBackToLogin={() => navigate('/login')}
      autoRedirectDelay={3000}
    />
  );
}
```

### 4. Protect Components

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

## 🧩 Pre-built Components

The library includes ready-to-use form components with full customization support:

### Authentication Forms

```tsx
import { 
  LoginForm, 
  SignupForm, 
  MagicLinkForm,
  MagicLinkVerify,
  PasswordRecoveryForm 
} from '@skylabs-digital/react-identity-access';

// Login Form (supports email/phone + password)
<LoginForm
  onSuccess={(user) => console.log('Logged in:', user)}
  onForgotPasswordClick={() => navigate('/forgot-password')}
  onSignupClick={() => navigate('/signup')}
  onMagicLinkClick={() => navigate('/magic-link')}
  showMagicLinkOption={true}
/>

// Signup Form
<SignupForm
  onSuccess={(user) => console.log('Signed up:', user)}
  onLoginClick={() => navigate('/login')}
  onMagicLinkClick={() => navigate('/magic-link')}
  showMagicLinkOption={true}
/>

// Magic Link Form
<MagicLinkForm
  frontendUrl="https://yourapp.com"
  onSuccess={() => console.log('Magic link sent!')}
  onLoginClick={() => navigate('/login')}
  onSignupClick={() => navigate('/signup')}
/>

// Magic Link Verification
<MagicLinkVerify
  onSuccess={(data) => navigate('/dashboard')}
  onError={(error) => console.error(error)}
  onBackToLogin={() => navigate('/login')}
/>

// Password Recovery
<PasswordRecoveryForm
  onSuccess={() => console.log('Recovery email sent!')}
  onBackToLogin={() => navigate('/login')}
/>
```

### Customization

All components support full customization of copy, styles, and icons:

```tsx
<LoginForm
  copy={{
    title: 'Welcome Back',
    submitButton: 'Sign In',
    usernameLabel: 'Email or Phone',
  }}
  styles={{
    container: { backgroundColor: '#f8f9fa' },
    button: { backgroundColor: '#007bff' },
  }}
  icons={{
    showPassword: <CustomEyeIcon />,
    hidePassword: <CustomEyeOffIcon />,
  }}
/>
```

## 🏗️ Architecture

### Core Providers

- **AppProvider** - Application configuration and context
- **TenantProvider** - Multi-tenant configuration and management
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

A complete demo application is included in the `example/` directory. To run it:

```bash
cd example
yarn install
yarn start
```

The demo showcases:
- **Traditional Authentication** - Email/phone + password login
- **Magic Link Authentication** - Passwordless login with automatic verification
- **User Registration** - Signup with email/phone support
- **Password Recovery** - Reset password functionality
- **Role-based Dashboard** - Different views based on user roles
- **Permission Testing** - Interactive permission system testing
- **Protected Routes** - Route-level access control
- **Feature Flag Usage** - Dynamic feature toggling
- **Multi-tenant Support** - Tenant switching and management

## 🛠️ Development

### Prerequisites

- Node.js 18+
- yarn (recommended) or npm

### Setup

```bash
# Clone the repository
git clone https://github.com/skylabs-digital/react-identity-access.git
cd react-identity-access

# Install dependencies
yarn install

# Build the library
yarn build

# Run tests
yarn test

# Run CI pipeline
yarn ci

# Start example app
cd example && yarn start
```

### Project Structure

```
react-identity-access/
├── src/                    # Library source code
│   ├── components/         # React components (forms, guards, etc.)
│   ├── providers/          # Context providers (Auth, Tenant, etc.)
│   ├── services/           # API services and HTTP client
│   ├── types/              # TypeScript definitions
│   └── index.ts           # Main export
├── example/                # Demo application
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

### Provider Configuration

```tsx
// AppProvider Config
interface AppConfig {
  baseUrl: string;           // API base URL
  appId: string;            // Application identifier
  apiTimeout?: number;      // Request timeout (default: 30000)
  retryAttempts?: number;   // Retry attempts (default: 3)
}

// TenantProvider Config
interface TenantConfig {
  tenantMode: 'subdomain' | 'selector' | 'fixed';
  selectorParam?: string;   // For 'selector' mode
  fixedTenantSlug?: string; // For 'fixed' mode
  initialTenant?: string;   // Initial tenant value
}
```

## 🧪 Testing

The library includes comprehensive tests:

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:coverage
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

- [x] **Magic Link Authentication** - Passwordless authentication via email ✅
- [x] **Email/Phone Login Support** - Flexible authentication methods ✅
- [x] **Pre-built Form Components** - Ready-to-use authentication forms ✅
- [x] **Multi-tenant Architecture** - Separate App and Tenant providers ✅
- [ ] **OAuth 2.0 / OpenID Connect** - Social login integration
- [ ] **Multi-factor Authentication** - SMS/TOTP support
- [ ] **Advanced Audit Logging** - Comprehensive security tracking
- [ ] **GraphQL Integration** - GraphQL API support
- [ ] **React Native Support** - Mobile app integration
- [ ] **SSR/Next.js Optimization** - Server-side rendering support
- [ ] **Biometric Authentication** - WebAuthn/FIDO2 support

---

Made with ❤️ by [Skylabs Digital](https://skylabs.digital)
