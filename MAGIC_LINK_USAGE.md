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
      const result = await sendMagicLink(
        email,
        'https://yourapp.com', // frontendUrl for verification link
        'John', // optional name for new users
        'Doe'   // optional lastName for new users
      );
      console.log('Magic link sent:', result);
    } catch (error) {
      console.error('Failed to send magic link:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToken = async (token: string, email: string, appId: string, tenantId?: string) => {
    try {
      const result = await verifyMagicLink(token, email, appId, tenantId);
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

### Custom Styling

```tsx
const customStyles = {
  container: {
    maxWidth: '500px',
    padding: '3rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
  },
  title: {
    color: '#1e293b',
    fontSize: '2rem',
  },
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
  }
};

<MagicLinkForm
  styles={customStyles}
  copy={{
    title: 'Sign in with Magic Link',
    description: 'We\'ll send you a secure link to sign in instantly',
    submitButton: 'Send Secure Link',
    successMessage: 'Check your email! Click the link to sign in.'
  }}
/>
```

### Custom Copy/Text

```tsx
const customCopy = {
  title: 'Passwordless Authentication',
  description: 'Enter your email for instant, secure access',
  emailLabel: 'Your Email Address',
  emailPlaceholder: 'you@company.com',
  nameLabel: 'Your Name',
  submitButton: 'Send Authentication Link',
  successMessage: 'Authentication link sent! Check your inbox.',
  loginText: 'Prefer using a password?',
  loginLink: 'Sign in traditionally'
};

<MagicLinkForm copy={customCopy} />
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
