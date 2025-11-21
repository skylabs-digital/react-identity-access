# Changelog v2.0.0 - RFC-001 & RFC-002 Implementation

## 🚀 Major Changes (Breaking)

This release implements two major RFCs that modernize the authentication API and add automatic tenant switching capabilities.

### RFC-002: Modernize Auth Method API with Object Parameters

**Breaking Change:** All authentication methods now use object parameters instead of multiple positional arguments.

#### Before (v1.x)
```typescript
const { login, signup, sendMagicLink } = useAuth();
const { appId } = useApp();
const { tenantId } = useTenant();

// Old API - positional parameters
await login(username, password, appId, tenantId);
await signup(email, phoneNumber, name, password, tenantId, lastName, appId);
await sendMagicLink(email, tenantId, frontendUrl, name, lastName, appId);
```

#### After (v2.0)
```typescript
const { login, signup, sendMagicLink } = useAuth();

// New API - clean object parameters
await login({ username, password });
await signup({ email, phoneNumber, name, password, lastName });
await sendMagicLink({ email, frontendUrl, name, lastName });
```

#### Benefits
- ✅ **Self-documenting**: Parameter names visible at call site
- ✅ **No more redundancy**: appId and tenantId auto-injected from context
- ✅ **Easier to extend**: Adding new parameters doesn't break existing code
- ✅ **Better TypeScript**: Stronger type inference and autocomplete
- ✅ **Cleaner code**: Single object parameter vs 5-7 positional args

#### New Interfaces
```typescript
export interface LoginParams {
  username: string;
  password: string;
  tenantId?: string; // Override context if needed
}

export interface SignupParams {
  email?: string;
  phoneNumber?: string;
  name: string;
  password: string;
  lastName?: string;
  tenantId?: string;
}

export interface SendMagicLinkParams {
  email: string;
  frontendUrl: string;
  name?: string;
  lastName?: string;
  tenantId?: string;
}

// ... and more (see /src/types/authParams.ts)
```

### RFC-001: Post-Login Tenant Switch

**New Feature:** Automatic tenant switching after successful login.

#### How It Works
When you log in with a `tenantId` that differs from the current tenant context, the application **automatically** switches to the login tenant by updating the URL and reloading the page.

#### Before (v1.x)
```typescript
// Manual tenant switching required
const handleLogin = async () => {
  const response = await login(username, password, appId, loginTenantId);
  
  // Developer had to implement tenant switching manually
  if (loginTenantId !== currentTenantId) {
    // Custom switching logic...
  }
};
```

#### After (v2.0)
```typescript
// Automatic tenant switching built-in!
const handleLogin = async () => {
  await login({ 
    username, 
    password, 
    tenantId: differentTenantId 
  });
  // If tenantId differs, page automatically reloads with new tenant
  // No extra code needed!
};
```

#### New TenantProvider Method
```typescript
// src/providers/TenantProvider.tsx
interface TenantContextValue {
  // ... existing properties
  switchTenant: (tenantSlug: string, mode?: 'navigate' | 'reload') => void;
}

// Usage
const { switchTenant } = useTenant();
switchTenant('other-tenant-slug'); // Switches tenant and reloads page
```

#### Auto-Switch Implementation
The auto-switch logic is implemented in `AuthProvider` and works for:
- ✅ `login()` method
- ✅ `verifyMagicLink()` method
- ✅ Direct hook usage (not just in LoginForm)
- ✅ All authentication flows

```typescript
// In AuthProvider
const login = async (params: LoginParams) => {
  const { username, password, tenantId } = params;
  
  // Perform login
  const response = await authApiService.login({ ... });
  
  // AUTO-SWITCH: If tenantId differs from current tenant
  if (tenantId && currentTenant?.id && tenantId !== currentTenant.id) {
    const tenantInfo = await tenantApi.getTenantById(tenantId);
    switchTenant(tenantInfo.domain); // Page reloads here
  }
  
  return response;
};
```

## 📝 Migration Guide

### Step 1: Update Auth Method Calls

**Login**
```diff
- await login(username, password, appId, tenantId);
+ await login({ username, password });
```

**Signup**
```diff
- await signup(email, phoneNumber, name, password, tenantId, lastName, appId);
+ await signup({ email, phoneNumber, name, password, lastName });
```

**Magic Link**
```diff
- await sendMagicLink(email, tenantId, frontendUrl, name, lastName, appId);
+ await sendMagicLink({ email, frontendUrl, name, lastName });
```

**Password Reset**
```diff
- await requestPasswordReset(email, tenantId);
+ await requestPasswordReset({ email });
```

**Verify Magic Link**
```diff
- await verifyMagicLink(token, email, appId, tenantId);
+ await verifyMagicLink({ token, email });
```

### Step 2: Remove Redundant Context Extraction

```diff
  const { login } = useAuth();
- const { appId } = useApp();
- const { tenantId } = useTenant();
  
- await login(username, password, appId, tenantId);
+ await login({ username, password });
```

### Step 3: Handle Tenant Override (if needed)

For root tenant scenarios where you need to override the context:

```typescript
// Root tenant login with tenant selection
await login({ 
  username, 
  password, 
  tenantId: selectedTenantId // Explicit override
});
```

## 🎯 What's New

### New Exports
```typescript
// Auth parameter types
import type {
  LoginParams,
  SignupParams,
  SignupTenantAdminParams,
  SendMagicLinkParams,
  VerifyMagicLinkParams,
  RequestPasswordResetParams,
  ConfirmPasswordResetParams,
  ChangePasswordParams,
} from '@skylabs-digital/react-identity-access';
```

### Updated Components
All pre-built components have been updated to use the new API:
- ✅ `LoginForm`
- ✅ `SignupForm`
- ✅ `MagicLinkForm`
- ✅ `MagicLinkVerify`
- ✅ `PasswordRecoveryForm`

### New TenantProvider API
```typescript
const { tenant, tenantSlug, switchTenant } = useTenant();

// Current tenant info
console.log(tenant?.id);        // UUID
console.log(tenant?.domain);    // Slug/domain
console.log(tenantSlug);        // Current tenant slug

// Manual tenant switching
switchTenant('new-tenant-slug'); // Reloads with new tenant
```

## 🧪 Testing

### Updated Tests
- All existing tests pass
- New test for auth parameter types
- Type checking validates all changes

### Example Application
A new demo page has been added to the example app:
- Path: `/tenant-switch`
- Component: `TenantSwitchDemo`
- Demonstrates:
  - Object parameter API
  - Automatic tenant switching
  - Manual tenant switching

## ⚠️ Breaking Changes Summary

1. **Auth method signatures changed** from positional to object parameters
2. **appId and tenantId** no longer passed manually (auto-injected from context)
3. **Return types** now properly typed (LoginResponse, User, etc.)
4. **Pre-built components** updated internally (no prop changes)

## 🔄 Migration Timeline

- **v1.x**: Continues to receive critical bug fixes for 6 months
- **v2.0**: Current stable version with new APIs
- **Recommended**: Migrate to v2.0 for better DX and new features

## 📚 Documentation

Updated documentation:
- [RFC-001: Post-Login Tenant Switch](/docs/RFC/0001-post-login-tenant-switch.md)
- [RFC-002: Modernize Auth Method API](/docs/RFC/0002-simplify-auth-method-parameters.md)
- Example application with tenant switch demo

## 🚦 Version Info

- **Version**: 2.0.0
- **Breaking Changes**: Yes
- **Migration Required**: Yes
- **Backward Compatibility**: No (v1.x API removed)

## 💡 Tips

### TypeScript Support
The new object parameters have excellent TypeScript support:
```typescript
// Full autocomplete and type checking
login({
  username, // ✓ Required
  password, // ✓ Required
  tenantId, // ✓ Optional with inline documentation
});
```

### Tenant Override Pattern
```typescript
// Use case: Root tenant with tenant selection
const [selectedTenant, setSelectedTenant] = useState<string>();

const handleLogin = () => {
  await login({
    username,
    password,
    tenantId: selectedTenant, // Override context tenant
  });
};
```

### Error Handling
```typescript
try {
  await login({ username, password });
} catch (error) {
  // Tenant switching errors are logged but don't fail login
  console.error(error);
}
```

## 📞 Support

For questions or issues:
1. Check the RFCs in `/docs/RFC/`
2. Review the example application
3. Open an issue on GitHub
