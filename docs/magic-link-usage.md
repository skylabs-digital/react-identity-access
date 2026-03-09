# Magic Link Authentication Guide

## Overview

The react-identity-access library provides comprehensive Magic Link authentication, enabling passwordless login and signup flows. This guide covers implementation, components, and best practices for Magic Link authentication.

## Key Features

- **🔗 Passwordless Authentication**: No passwords required - just email verification
- **✨ Automatic Verification**: Seamless token verification from email links
- **🔄 Unified Flow**: Single form handles both login and signup
- **📧 Email/Phone Support**: Works with both email addresses and phone numbers
- **🎨 Fully Customizable**: Complete control over styling, copy, and behavior
- **🚀 Auto-redirect**: Configurable post-verification navigation

## Components

### 1. MagicLinkForm

The main component for sending Magic Link emails:

```tsx
import { MagicLinkForm } from '@skylabs-digital/react-identity-access';
import { useNavigate } from 'react-router-dom';

function MagicLinkPage() {
  const navigate = useNavigate();

  const handleSuccess = (response) => {
    console.log('Magic link sent successfully!', response);
    // Show success message or redirect
  };

  const handleError = (error) => {
    console.error('Failed to send magic link:', error);
  };

  return (
    <MagicLinkForm
      frontendUrl="https://yourapp.com" // Your app's base URL
      onSuccess={handleSuccess}
      onError={handleError}
      onLoginClick={() => navigate('/login')}
      onSignupClick={() => navigate('/signup')}
    />
  );
}
```

### 2. MagicLinkVerify

The component for automatic verification when users click the email link:

```tsx
import { MagicLinkVerify } from '@skylabs-digital/react-identity-access';
import { useNavigate } from 'react-router-dom';

function MagicLinkVerifyPage() {
  const navigate = useNavigate();

  const handleSuccess = (data) => {
    console.log('Magic link verified successfully!', data);
    // User is now authenticated
    navigate('/dashboard');
  };

  const handleError = (error) => {
    console.error('Magic link verification failed:', error);
  };

  const handleRetry = () => {
    // Reload page to retry verification
    window.location.reload();
  };

  return (
    <MagicLinkVerify
      onSuccess={handleSuccess}
      onError={handleError}
      onRetry={handleRetry}
      onBackToLogin={() => navigate('/login')}
      autoRedirectDelay={3000} // Auto-redirect after 3 seconds
    />
  );
}
```

## Implementation Steps

### Step 1: Setup Routes

Add the Magic Link routes to your React Router configuration:

```tsx
import { Routes, Route } from 'react-router-dom';
import MagicLinkPage from './pages/MagicLinkPage';
import MagicLinkVerifyPage from './pages/MagicLinkVerifyPage';

function App() {
  return (
    <Routes>
      {/* Other routes */}
      <Route path="/magic-link" element={<MagicLinkPage />} />
      <Route path="/magic-link/verify" element={<MagicLinkVerifyPage />} />
    </Routes>
  );
}
```

### Step 2: Updated Authentication Forms

The library now supports email/phone authentication and Magic Link options:

```tsx
import { LoginForm } from '@skylabs-digital/react-identity-access';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const navigate = useNavigate();

  return (
    <LoginForm
      onSuccess={(result) => {
        console.log('Login success:', result);
        navigate('/dashboard');
      }}
      onError={(error) => console.error('Login error:', error)}
      onMagicLinkClick={() => navigate('/magic-link')}
      onSignupClick={() => navigate('/signup')}
      showMagicLinkOption={true}
      copy={{
        usernameLabel: 'Email or Phone',
        usernamePlaceholder: 'Enter your email or phone number'
      }}
    />
  );
}
```

### Step 3: Updated SignupForm

Supports email/phone authentication and Magic Link option:

```tsx
import { SignupForm } from '@skylabs-digital/react-identity-access';
import { useNavigate } from 'react-router-dom';

function SignupPage() {
  const navigate = useNavigate();

  return (
    <SignupForm
      onSuccess={(result) => {
        console.log('Signup success:', result);
        navigate('/dashboard');
      }}
      onError={(error) => console.error('Signup error:', error)}
      onMagicLinkClick={() => navigate('/magic-link')}
      onLoginClick={() => navigate('/login')}
      showMagicLinkOption={true}
    />
  );
}
```

## Magic Link Flow Implementation

### Complete Authentication Flow

```tsx
import React, { useState, useEffect } from 'react';
import { 
  MagicLinkForm, 
  LoginForm, 
  SignupForm,
  useAuth 
} from '@skylabs-digital/react-identity-access';

type AuthView = 'login' | 'signup' | 'magic-link';

function AuthenticationFlow() {
  const [view, setView] = useState<AuthView>('login');
  const [magicLinkToken, setMagicLinkToken] = useState<string | null>(null);
  const { verifyMagicLink } = useAuth();

  // Check for magic link token in URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      setMagicLinkToken(token);
      setView('magic-link');
    }
  }, []);

  const handleAuthSuccess = (result: any) => {
    console.log('Authentication successful:', result);
    // Redirect to dashboard or main app
    window.location.href = '/dashboard';
  };

  const handleAuthError = (error: string) => {
    console.error('Authentication error:', error);
    // Show error message to user
  };

  return (
    <div className="auth-container">
      {view === 'login' && (
        <LoginForm
          onSuccess={handleAuthSuccess}
          onError={handleAuthError}
          onMagicLinkClick={() => setView('magic-link')}
          onSignupClick={() => setView('signup')}
        />
      )}

      {view === 'signup' && (
        <SignupForm
          onSuccess={handleAuthSuccess}
          onError={handleAuthError}
          onMagicLinkClick={() => setView('magic-link')}
          onLoginClick={() => setView('login')}
        />
      )}

      {view === 'magic-link' && (
        <MagicLinkForm
          verifyToken={magicLinkToken}
          onSuccess={handleAuthSuccess}
          onError={handleAuthError}
          onLoginClick={() => setView('login')}
          onSignupClick={() => setView('signup')}
        />
      )}
    </div>
  );
}
```

## Direct API Usage

### Using AuthProvider Methods

```tsx
import { useAuth } from '@skylabs-digital/react-identity-access';
import { useState } from 'react';

function CustomMagicLinkComponent() {
  const { sendMagicLink, verifyMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendMagicLink = async () => {
    try {
      setLoading(true);
      const result = await sendMagicLink({
        email,
        frontendUrl: 'https://yourapp.com',
        name: 'John',      // optional for new users
        lastName: 'Doe',   // optional for new users
      });
      console.log('Magic link sent:', result);
    } catch (error) {
      console.error('Failed to send magic link:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToken = async (token: string, email: string, appId: string, tenantSlug?: string) => {
    try {
      const result = await verifyMagicLink({ token, email, appId, tenantSlug });
      console.log('Verification result:', result);
      
      // User is now authenticated automatically
      console.log('User authenticated successfully');
    } catch (error) {
      console.error('Failed to verify magic link:', error);
    }
  };

  return (
    <div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
      />
      <button 
        onClick={handleSendMagicLink}
        disabled={loading || !email}
      >
        {loading ? 'Sending...' : 'Send Magic Link'}
      </button>
    </div>
  );
}
```

## Customization Options

Both `MagicLinkForm` and `MagicLinkVerify` support full customization through `copy`, `styles`, and (for `MagicLinkVerify`) `icons` props.

### MagicLinkForm Copy Reference

All keys are optional. Defaults are shown below:

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

### MagicLinkForm Styles Reference

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
| `toggleLink` | "New user? Add your name" toggle |

### MagicLinkVerify Copy Reference

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

### MagicLinkVerify Styles Reference

| Key | Targets |
|-----|---------|
| `container` | Root wrapper |
| `card` | Inner card |
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

### MagicLinkVerify Icons

| Key | Default | Description |
|-----|---------|-------------|
| `loading` | Animated spinner SVG | Shown during verification |
| `success` | Green checkmark SVG | Shown on success |
| `error` | Red X circle SVG | Shown on error |

### Custom Styling Example

```tsx
<MagicLinkForm
  styles={{
    container: {
      maxWidth: '500px',
      padding: '3rem',
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
    },
    title: { color: '#1e293b', fontSize: '2rem' },
    button: {
      backgroundColor: '#3b82f6',
      padding: '1rem 2rem',
      borderRadius: '8px',
    },
    successText: {
      backgroundColor: '#dcfce7',
      color: '#166534',
      padding: '1rem',
      borderRadius: '8px',
    },
  }}
  copy={{
    title: 'Sign in with Magic Link',
    description: "We'll send you a secure link to sign in instantly",
    submitButton: 'Send Secure Link',
    successMessage: 'Check your email! Click the link to sign in.',
  }}
/>
```

### i18n Example (Spanish)

```tsx
<MagicLinkForm
  copy={{
    title: 'Iniciar sesion con Magic Link',
    description: 'Ingrese su email para recibir un enlace de acceso seguro.',
    emailLabel: 'Correo electronico',
    emailPlaceholder: 'tu@empresa.com',
    nameLabel: 'Nombre',
    submitButton: 'Enviar enlace de acceso',
    successMessage: '¡Enlace enviado! Revise su correo electronico.',
    loginText: '¿Prefiere usar contraseña?',
    loginLink: 'Iniciar sesion con contraseña',
  }}
/>
```

## Backend Integration

### Expected API Endpoints

Your backend should implement these endpoints:

```
POST /auth/magic-link/send
{
  "email": "user@example.com",
  "tenantId": "tenant-123",
  "name": "John",      // optional for new users
  "lastName": "Doe"    // optional for new users
}

POST /auth/magic-link/verify
{
  "token": "magic-link-token-from-email"
}
```

### Response Formats

```typescript
// Send Magic Link Response
{
  "message": "Magic link sent successfully",
  "emailSent": true
}

// Verify Magic Link Response
{
  "user": { /* User object */ },
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token",
  "expiresIn": 3600,
  "isNewUser": true // indicates if user was created during this process
}
```

## Migration Guide

### From Email-Only to Email/Phone Support

1. Update your login forms to use `username` instead of `email`:

```tsx
// Before
<LoginForm onSuccess={handleLogin} />

// After - no changes needed, automatically supports username
<LoginForm onSuccess={handleLogin} />
```

2. Update signup forms to support optional email/phone:

```tsx
// Before
const handleSignup = (email, name, password, tenantId) => {
  // signup logic
};

// After
const handleSignup = (email, phoneNumber, name, password, tenantId, lastName) => {
  // Updated signup logic - at least email or phoneNumber required
};
```

### Adding Magic Link to Existing Forms

Simply add the magic link handlers:

```tsx
// Add to existing LoginForm
<LoginForm
  // ... existing props
  onMagicLinkClick={() => setView('magic-link')}
  showMagicLinkOption={true}
/>

// Add to existing SignupForm  
<SignupForm
  // ... existing props
  onMagicLinkClick={() => setView('magic-link')}
  showMagicLinkOption={true}
/>
```

## Best Practices

1. **URL Token Handling**: Always check URL parameters for magic link tokens on page load
2. **Error Handling**: Provide clear error messages for failed magic link operations
3. **Loading States**: Show loading indicators during magic link send/verify operations
4. **User Feedback**: Clearly communicate when magic links are sent and what users should expect
5. **Fallback Options**: Always provide traditional login/signup as fallback options
6. **Security**: Ensure magic link tokens have appropriate expiration times on your backend

## Troubleshooting

### Common Issues

1. **Magic link not working**: Check that the token parameter is correctly extracted from URL
2. **User not created**: Ensure name is provided when sending magic link for new users
3. **Authentication fails**: Verify that tenant ID is correct and user has proper permissions
4. **Email not sent**: Check backend email service configuration and API endpoint responses

### Debug Mode

Enable debug logging to troubleshoot issues:

```tsx
// Add to your AuthProvider configuration
const authConfig = {
  debug: true, // Enable debug logging
  onRefreshFailed: () => {
    console.log('Token refresh failed, redirecting to login');
  }
};
```
