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
- **🎛️ Fully Customizable Components** - All texts, styles, and icons are overridable via props

## 📦 Installation

```bash
npm install @skylabs-digital/react-identity-access
# or
yarn add @skylabs-digital/react-identity-access
```

## 🏃‍♂️ Quick Start

### 1. Setup Providers

Wrap your application with the required providers in order:

```tsx
import {
  AppProvider,
  TenantProvider,
  AuthProvider,
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
          tenantMode: 'selector', // 'subdomain' | 'selector' | 'fixed' | 'optional'
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
  const { login, logout, currentUser } = useAuth();

  const handleLogin = async () => {
    try {
      // Supports both email and phone number
      await login({ username: 'user@example.com', password: 'password' });
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div>
      {currentUser ? (
        <div>
          <p>Welcome, {currentUser.name}!</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}
```

### 3. Pre-built Login Form

```tsx
import { LoginForm } from '@skylabs-digital/react-identity-access';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const navigate = useNavigate();

  return (
    <LoginForm
      onSuccess={() => navigate('/dashboard')}
      onForgotPassword={() => navigate('/forgot-password')}
      onSignupClick={() => navigate('/signup')}
      onMagicLinkClick={() => navigate('/magic-link')}
      showMagicLinkOption={true}
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

---

## 🧩 Component Reference

All form components support three customization axes:

- **`copy`** - Override any user-facing text (labels, placeholders, messages, buttons)
- **`styles`** - Override any inline style on any element (`React.CSSProperties`)
- **`icons`** - Override SVG icons (where applicable)

All customization props are **optional** and **backward compatible** — if you omit them, sensible defaults are used.

---

### LoginForm

Traditional email/phone + password login form.

#### Props (`LoginFormProps`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `copy` | `LoginFormCopy` | See below | Override user-facing texts |
| `styles` | `LoginFormStyles` | See below | Override inline styles |
| `icons` | `LoginFormIcons` | Eye/EyeOff SVGs | Override password toggle icons |
| `onSuccess` | `(data: any) => void` | — | Called after successful login |
| `onError` | `(error: string) => void` | — | Called on login failure |
| `onForgotPassword` | `() => void` | — | Navigate to forgot password |
| `onSignupClick` | `() => void` | — | Navigate to signup |
| `onMagicLinkClick` | `() => void` | — | Navigate to magic link |
| `showForgotPassword` | `boolean` | `true` | Show "Forgot password?" link |
| `showSignupLink` | `boolean` | `true` | Show signup link |
| `showMagicLinkOption` | `boolean` | `false` | Show magic link option |
| `className` | `string` | — | CSS class for the root element |

#### Copy (`LoginFormCopy`)

| Key | Default |
|-----|---------|
| `title` | `'Sign In'` |
| `usernameLabel` | `'Email or Phone'` |
| `usernamePlaceholder` | `'Enter your email or phone number'` |
| `passwordLabel` | `'Password'` |
| `passwordPlaceholder` | `'Enter your password'` |
| `submitButton` | `'Sign In'` |
| `loadingText` | `'Signing in...'` |
| `errorMessage` | `'Invalid credentials'` |
| `forgotPasswordLink` | `'Forgot your password?'` |
| `signupLink` | `'Sign up here'` |
| `signupText` | `"Don't have an account?"` |
| `magicLinkText` | `'Prefer passwordless?'` |
| `magicLinkLink` | `'Use Magic Link'` |
| `tenantNotFoundError` | `'Tenant not found'` |
| `dividerBullet` | `'•'` |
| `showPasswordAriaLabel` | `'Show password'` |
| `hidePasswordAriaLabel` | `'Hide password'` |

#### Styles (`LoginFormStyles`)

| Key | Targets |
|-----|---------|
| `container` | Root wrapper |
| `title` | `<h2>` heading |
| `form` | `<form>` element |
| `fieldGroup` | Each label+input group |
| `label` | `<label>` elements |
| `input` | `<input>` elements |
| `inputError` | Input in error state (merged on top of `input`) |
| `inputContainer` | Password field wrapper |
| `inputWithIcon` | Password input with toggle icon |
| `passwordToggle` | Show/hide password button |
| `button` | Submit button |
| `buttonDisabled` | Disabled state (merged on top of `button`) |
| `buttonLoading` | Loading state (merged on top of `button`) |
| `errorText` | Error message text |
| `linkContainer` | Links section wrapper |
| `link` | `<a>` link elements |
| `divider` | Bullet divider between links |

#### Usage Example

```tsx
<LoginForm
  copy={{
    title: 'Bienvenido',
    submitButton: 'Iniciar Sesion',
    usernameLabel: 'Correo electronico',
    forgotPasswordLink: '¿Olvidaste tu contraseña?',
  }}
  styles={{
    container: { maxWidth: '500px', backgroundColor: '#f0f4f8' },
    button: { backgroundColor: '#4f46e5', borderRadius: '12px' },
  }}
  icons={{
    showPassword: <MyEyeIcon />,
    hidePassword: <MyEyeOffIcon />,
  }}
  onSuccess={(data) => navigate('/dashboard')}
  onMagicLinkClick={() => navigate('/magic-link')}
  showMagicLinkOption
/>
```

---

### SignupForm

User registration form with email/phone, password, and optional tenant creation.

#### Props (`SignupFormProps`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `copy` | `SignupFormCopy` | See below | Override user-facing texts |
| `styles` | `SignupFormStyles` | See below | Override inline styles |
| `signupType` | `'user' \| 'tenant'` | `'user'` | User signup or tenant admin signup |
| `onSuccess` | `(data: any) => void` | — | Called after successful signup |
| `onError` | `(error: string) => void` | — | Called on signup failure |
| `onLoginClick` | `() => void` | — | Navigate to login |
| `onMagicLinkClick` | `() => void` | — | Navigate to magic link |
| `showLoginLink` | `boolean` | `true` | Show login link |
| `showMagicLinkOption` | `boolean` | `false` | Show magic link option |
| `className` | `string` | — | CSS class for the root element |

#### Copy (`SignupFormCopy`)

| Key | Default |
|-----|---------|
| `title` | `'Create Account'` |
| `nameLabel` | `'First Name'` |
| `namePlaceholder` | `'Enter your first name'` |
| `lastNameLabel` | `'Last Name'` |
| `lastNamePlaceholder` | `'Enter your last name'` |
| `emailLabel` | `'Email'` |
| `emailPlaceholder` | `'Enter your email'` |
| `phoneNumberLabel` | `'Phone Number'` |
| `phoneNumberPlaceholder` | `'Enter your phone number'` |
| `passwordLabel` | `'Password'` |
| `passwordPlaceholder` | `'Enter your password'` |
| `confirmPasswordLabel` | `'Confirm Password'` |
| `confirmPasswordPlaceholder` | `'Confirm your password'` |
| `tenantNameLabel` | `'Organization Name'` |
| `tenantNamePlaceholder` | `'Enter your organization name'` |
| `submitButton` | `'Create Account'` |
| `loadingText` | `'Creating account...'` |
| `errorMessage` | `'Failed to create account'` |
| `passwordMismatchError` | `'Passwords do not match'` |
| `loginLink` | `'Sign in here'` |
| `loginText` | `'Already have an account?'` |
| `magicLinkText` | `'Prefer passwordless?'` |
| `magicLinkLink` | `'Use Magic Link'` |
| `isAdminLabel` | `'Create new organization'` |
| `isAdminDescription` | `'Check this if you want to create a new organization'` |
| `contactMethodHint` | `'At least one contact method (email or phone) is required'` |
| `tenantNotFoundError` | `'Tenant not found'` |
| `dividerBullet` | `'•'` |

#### Styles (`SignupFormStyles`)

| Key | Targets |
|-----|---------|
| `container` | Root wrapper |
| `title` | `<h2>` heading |
| `form` | `<form>` element |
| `fieldGroup` | Each label+input group |
| `label` | `<label>` elements |
| `input` | `<input>` elements |
| `inputError` | Input in error state |
| `checkbox` | Checkbox input |
| `checkboxContainer` | Checkbox + label wrapper |
| `checkboxLabel` | Checkbox label text |
| `button` | Submit button |
| `buttonDisabled` | Disabled state (merged on top of `button`) |
| `buttonLoading` | Loading state (merged on top of `button`) |
| `errorText` | Error message text |
| `linkContainer` | Links section wrapper |
| `link` | `<a>` link elements |
| `divider` | Bullet divider between links |
| `hintText` | Contact method hint text |

---

### MagicLinkForm

Passwordless Magic Link send form. Handles both new and existing users.

#### Props (`MagicLinkFormProps`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `copy` | `MagicLinkFormCopy` | See below | Override user-facing texts |
| `styles` | `MagicLinkFormStyles` | See below | Override inline styles |
| `onSuccess` | `(data: any) => void` | — | Called after magic link sent |
| `onError` | `(error: string) => void` | — | Called on failure |
| `onLoginClick` | `() => void` | — | Navigate to login |
| `onSignupClick` | `() => void` | — | Navigate to signup |
| `showTraditionalLinks` | `boolean` | `true` | Show login/signup links |
| `className` | `string` | — | CSS class for the root element |
| `verifyToken` | `string` | — | Auto-verify a magic link token |
| `frontendUrl` | `string` | `window.location.origin` | Base URL for the magic link callback |

#### Copy (`MagicLinkFormCopy`)

| Key | Default |
|-----|---------|
| `title` | `'Sign In with Magic Link'` |
| `description` | `"Enter your email to receive a magic link..."` |
| `emailLabel` | `'Email'` |
| `emailPlaceholder` | `'Enter your email'` |
| `nameLabel` | `'Name'` |
| `namePlaceholder` | `'Enter your name'` |
| `lastNameLabel` | `'Last Name'` |
| `lastNamePlaceholder` | `'Enter your last name'` |
| `submitButton` | `'Send Magic Link'` |
| `loadingText` | `'Sending magic link...'` |
| `successMessage` | `'Magic link sent! Check your email...'` |
| `errorMessage` | `'Failed to send magic link. Please try again.'` |
| `verifyingText` | `'Verifying magic link...'` |
| `verifyingDescription` | `'Please wait while we verify your magic link...'` |
| `showNameToggle` | `'New user? Add your name'` |
| `hideNameToggle` | `'Existing user? Hide name fields'` |
| `loginLink` | `'Sign in with password'` |
| `loginText` | `'Already have an account?'` |
| `signupLink` | `'Sign up with password'` |
| `signupText` | `'Prefer traditional signup?'` |
| `tenantNotFoundError` | `'Tenant not found'` |
| `missingTenantOrEmailError` | `'Missing tenant or email'` |
| `dividerBullet` | `'•'` |

#### Styles (`MagicLinkFormStyles`)

| Key | Targets |
|-----|---------|
| `container` | Root wrapper |
| `title` | `<h2>` heading |
| `description` | Description paragraph |
| `form` | `<form>` element |
| `fieldGroup` | Each label+input group |
| `label` | `<label>` elements |
| `input` | `<input>` elements |
| `inputError` | Input in error state |
| `button` | Submit button |
| `buttonDisabled` | Disabled state (merged on top of `button`) |
| `buttonLoading` | Loading state (merged on top of `button`) |
| `errorText` | Error message text |
| `successText` | Success message text |
| `linkContainer` | Links section wrapper |
| `link` | `<a>` link elements |
| `divider` | Bullet divider between links |
| `verifyingContainer` | Verification loading wrapper |
| `verifyingText` | Verification description text |
| `toggleContainer` | Name fields toggle wrapper |
| `toggleLink` | "New user? Add your name" toggle button |

---

### MagicLinkVerify

Automatic Magic Link verification component. Reads token from URL params or accepts them as props.

#### Props (`MagicLinkVerifyProps`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `copy` | `MagicLinkVerifyCopy` | See below | Override user-facing texts |
| `styles` | `MagicLinkVerifyStyles` | See below | Override inline styles |
| `icons` | `MagicLinkVerifyIcons` | SVG icons | Override loading/success/error icons |
| `onSuccess` | `(data: any) => void` | — | Called after successful verification |
| `onError` | `(error: string) => void` | — | Called on verification failure |
| `onRetry` | `() => void` | — | Called before retry attempt |
| `onBackToLogin` | `() => void` | — | Navigate back to login |
| `className` | `string` | — | CSS class for the root element |
| `token` | `string` | URL param | Magic link token (auto-extracted from `?token=`) |
| `email` | `string` | URL param | User email (auto-extracted from `?email=`) |
| `appId` | `string` | URL param | App ID (auto-extracted from `?appId=`) |
| `tenantSlug` | `string` | URL param | Tenant slug (auto-extracted from `?tenantSlug=`) |
| `autoRedirectDelay` | `number` | `3000` | Milliseconds before auto-redirect (0 to disable) |

#### Copy (`MagicLinkVerifyCopy`)

| Key | Default |
|-----|---------|
| `title` | `'Verifying Magic Link'` |
| `verifyingMessage` | `'Please wait while we verify your magic link...'` |
| `successMessage` | `'Magic link verified successfully! You are now logged in.'` |
| `errorMessage` | `'Failed to verify magic link. The link may be expired or invalid.'` |
| `redirectingMessage` | `'Redirecting you to the dashboard...'` |
| `retryButton` | `'Try Again'` |
| `backToLoginButton` | `'Back to Login'` |
| `missingParamsError` | `'Missing required parameters: token or email'` |

#### Styles (`MagicLinkVerifyStyles`)

| Key | Targets |
|-----|---------|
| `container` | Root wrapper |
| `card` | Inner card (kept for compatibility) |
| `title` | `<h1>` heading |
| `message` | Verifying/redirecting message |
| `successMessage` | Success state message |
| `errorMessage` | Error state message |
| `spinner` | Loading spinner |
| `buttonContainer` | Error buttons wrapper |
| `retryButton` | "Try Again" button |
| `retryButtonHover` | Hover state for retry button |
| `backButton` | "Back to Login" button |
| `backButtonHover` | Hover state for back button |

#### Icons (`MagicLinkVerifyIcons`)

| Key | Default | Description |
|-----|---------|-------------|
| `loading` | Animated spinner | Shown during verification |
| `success` | Green checkmark SVG | Shown on success |
| `error` | Red X circle SVG | Shown on error |

---

### PasswordRecoveryForm

Password reset flow with two modes: request (send email) and reset (set new password).

#### Props (`PasswordRecoveryFormProps`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `copy` | `PasswordRecoveryFormCopy` | See below | Override user-facing texts |
| `styles` | `PasswordRecoveryFormStyles` | See below | Override inline styles |
| `mode` | `'request' \| 'reset'` | `'request'` | Current form mode |
| `token` | `string` | — | Pre-fill reset token |
| `onSuccess` | `(data?: any) => void` | — | Called after success |
| `onError` | `(error: string) => void` | — | Called on failure |
| `onBackToLogin` | `() => void` | — | Navigate back to login |
| `onModeChange` | `(mode: 'request' \| 'reset') => void` | — | Show mode switch links |
| `className` | `string` | — | CSS class for the root element |

#### Copy (`PasswordRecoveryFormCopy`)

| Key | Default |
|-----|---------|
| `title` | `'Reset Password'` |
| `subtitle` | `"Enter your email address and we'll send you a link..."` |
| `emailLabel` | `'Email'` |
| `emailPlaceholder` | `'Enter your email'` |
| `submitButton` | `'Send Reset Link'` |
| `loadingText` | `'Sending...'` |
| `successMessage` | `'Password reset link sent! Check your email.'` |
| `errorMessage` | `'Failed to send reset link'` |
| `backToLoginLink` | `'Back to Sign In'` |
| `resetTitle` | `'Set New Password'` |
| `resetSubtitle` | `'Enter your reset token and new password.'` |
| `tokenLabel` | `'Reset Token'` |
| `tokenPlaceholder` | `'Enter reset token from email'` |
| `newPasswordLabel` | `'New Password'` |
| `newPasswordPlaceholder` | `'Enter new password'` |
| `confirmPasswordLabel` | `'Confirm Password'` |
| `confirmPasswordPlaceholder` | `'Confirm new password'` |
| `resetSubmitButton` | `'Reset Password'` |
| `resetLoadingText` | `'Resetting...'` |
| `resetSuccessMessage` | `'Password reset successfully!'` |
| `passwordMismatchError` | `'Passwords do not match'` |
| `requestNewLinkLink` | `'Request New Link'` |
| `haveTokenLink` | `'I have a token'` |
| `tenantNotFoundError` | `'Tenant not found'` |
| `dividerBullet` | `'•'` |

#### Styles (`PasswordRecoveryFormStyles`)

| Key | Targets |
|-----|---------|
| `container` | Root wrapper |
| `title` | `<h2>` heading |
| `subtitle` | Subtitle paragraph |
| `form` | `<form>` element |
| `fieldGroup` | Each label+input group |
| `label` | `<label>` elements |
| `input` | `<input>` elements |
| `inputError` | Input in error state |
| `button` | Submit button |
| `buttonDisabled` | Disabled state (merged on top of `button`) |
| `buttonLoading` | Loading state (merged on top of `button`) |
| `errorText` | Error message text |
| `successText` | Success message text |
| `linkContainer` | Links section wrapper |
| `link` | `<a>` link elements |
| `modeSwitchDivider` | Bullet divider between mode links |

---

### TenantSelector

Dropdown component for switching between tenants. Integrates with `AuthProvider` context automatically.

#### Props (`TenantSelectorProps`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tenants` | `UserTenantMembership[]` | From context | Override tenant list |
| `currentTenantId` | `string \| null` | From context | Override current tenant |
| `onSelect` | `(tenantId: string) => void` | `auth.switchToTenant` | Custom selection handler |
| `styles` | `TenantSelectorStyles` | See below | Override inline styles |
| `className` | `string` | — | CSS class for root element |
| `dropdownClassName` | `string` | — | CSS class for dropdown |
| `itemClassName` | `string` | — | CSS class for each item |
| `renderItem` | `(tenant, isSelected) => ReactNode` | Default renderer | Custom item renderer |
| `placeholder` | `string` | `'Select tenant'` | Placeholder when no tenant selected |
| `disabled` | `boolean` | `false` | Disable the selector |
| `showCurrentTenant` | `boolean` | `true` | Show name when only 1 tenant |

#### Styles (`TenantSelectorStyles`)

| Key | Targets |
|-----|---------|
| `wrapper` | Root `<div>` (position: relative) |
| `button` | Trigger button |
| `buttonDisabled` | Disabled button state (merged on top of `button`) |
| `dropdown` | Dropdown menu container |
| `item` | Each tenant item |
| `itemSelected` | Selected tenant item (merged on top of `item`) |
| `itemHover` | Hover state for items |
| `itemRole` | Role badge next to tenant name |
| `arrow` | Arrow indicator (▲/▼) |

---

### Protected

Conditionally renders content based on permissions and/or roles.

```tsx
<Protected
  requiredPermissions={['users:read', 'users:write']}
  requireAll={true}
  fallback={<div>Access denied</div>}
>
  <AdminPanel />
</Protected>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `requiredPermissions` | `string[]` | — | Required permissions |
| `requiredRole` | `string` | — | Required user role |
| `requireAll` | `boolean` | `true` | All permissions required? |
| `fallback` | `ReactNode` | `null` | Shown when access denied |
| `onUnauthorized` | `() => void` | — | Callback on denial |

---

## 🎨 Customization Examples

### Internationalization (i18n)

Override all user-facing text for your locale:

```tsx
<LoginForm
  copy={{
    title: 'Iniciar Sesion',
    usernameLabel: 'Correo o Telefono',
    usernamePlaceholder: 'Ingrese su correo o telefono',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: 'Ingrese su contraseña',
    submitButton: 'Entrar',
    loadingText: 'Ingresando...',
    errorMessage: 'Credenciales invalidas',
    forgotPasswordLink: '¿Olvidaste tu contraseña?',
    signupText: '¿No tienes cuenta?',
    signupLink: 'Registrate aqui',
    showPasswordAriaLabel: 'Mostrar contraseña',
    hidePasswordAriaLabel: 'Ocultar contraseña',
  }}
/>
```

### Brand Theming

Apply your brand colors and spacing:

```tsx
const brandStyles = {
  container: {
    maxWidth: '480px',
    backgroundColor: '#1a1a2e',
    borderRadius: '16px',
    padding: '3rem',
  },
  title: { color: '#e94560', fontSize: '2rem' },
  input: {
    backgroundColor: '#16213e',
    color: '#ffffff',
    border: '1px solid #0f3460',
    borderRadius: '8px',
  },
  button: {
    backgroundColor: '#e94560',
    borderRadius: '8px',
    fontWeight: '600',
  },
  link: { color: '#e94560' },
};

<LoginForm styles={brandStyles} />
<SignupForm styles={brandStyles} />
<MagicLinkForm styles={brandStyles} />
```

### Custom Icons

```tsx
import { Eye, EyeOff } from 'lucide-react';

<LoginForm
  icons={{
    showPassword: <Eye size={16} />,
    hidePassword: <EyeOff size={16} />,
  }}
/>
```

---

## 🏗️ Architecture

### Core Providers

| Provider | Purpose |
|----------|---------|
| **AppProvider** | Application configuration (baseUrl, appId) |
| **TenantProvider** | Multi-tenant detection and management |
| **AuthProvider** | Authentication, session, and user data |
| **FeatureFlagProvider** | Feature flag management |
| **SubscriptionProvider** | Billing and subscription handling |
| **RoutingProvider** | Zone-based routing (RFC-005) |

### Permission System

The library uses a `resource:action` permission format:

```
users:read      - Read user data
products:write  - Create/update products
admin:*         - All admin permissions
reports:read    - View reports
```

## 📚 Documentation

- [📖 Implementation Guide](./docs/implementation.md)
- [🔧 Advanced Usage](./docs/advanced-usage.md)
- [📋 API Reference](./docs/api-reference.md)
- [🎯 Examples](./docs/examples.md)
- [✨ Magic Link Guide](./MAGIC_LINK_USAGE.md)
- [🛣️ Zone Routing](./docs/ZONE_ROUTING.md)
- [🤝 Contributing](./docs/contributing.md)

## 🎮 Demo Application

A complete demo application is included in the `example/` directory:

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
- yarn

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

# Run full CI pipeline (type-check + test + build)
yarn ci
```

### Project Structure

```
react-identity-access/
├── src/
│   ├── components/         # React components (forms, guards, selectors)
│   ├── providers/          # Context providers (App, Tenant, Auth, etc.)
│   ├── services/           # API services and HTTP client
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   ├── errors/             # Custom error classes
│   └── index.ts            # Public API exports
├── example/                # Demo application
├── docs/                   # Documentation
├── dist/                   # Built library (ES + CJS)
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
  appId: string;             // Application identifier
}

// TenantProvider Config
interface TenantConfig {
  tenantMode: 'subdomain' | 'selector' | 'fixed' | 'optional';
  selectorParam?: string;    // For 'selector' mode
  fixedTenantSlug?: string;  // For 'fixed' mode
  initialTenant?: string;    // Initial tenant value
}
```

## 🧪 Testing

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

- **JWT tokens** with automatic refresh and proactive renewal
- **Secure token storage** with configurable backends
- **Session generation tracking** to prevent stale token usage
- **Permission validation** on both client and server
- **Console output suppressed** in production and test environments

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

- [x] **Magic Link Authentication** - Passwordless authentication via email
- [x] **Email/Phone Login Support** - Flexible authentication methods
- [x] **Pre-built Form Components** - Ready-to-use, fully customizable authentication forms
- [x] **Multi-tenant Architecture** - Separate App and Tenant providers
- [x] **Zone-based Routing** - Declarative route access control (RFC-005)
- [x] **Customizable Copy & Styles** - All components support i18n and brand theming
- [ ] **OAuth 2.0 / OpenID Connect** - Social login integration
- [ ] **Multi-factor Authentication** - SMS/TOTP support
- [ ] **React Native Support** - Mobile app integration
- [ ] **SSR/Next.js Optimization** - Server-side rendering support
- [ ] **Biometric Authentication** - WebAuthn/FIDO2 support

---

Made with ❤️ by [Skylabs Digital](https://skylabs.digital)
