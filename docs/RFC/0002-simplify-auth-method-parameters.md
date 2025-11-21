# RFC 0002: Modernize Auth Method API with Object Parameters

**Status:** Draft  
**Author:** Cascade  
**Created:** 2024-11-20  
**Updated:** 2024-11-20

## Summary

Modernize authentication method signatures by:
1. Using object parameters instead of multiple positional arguments
2. Removing redundant `appId` and `tenantId` parameters that can be inferred from context
3. Making all optional parameters clearly optional in the object structure
This will make the API more intuitive, easier to extend, and reduce boilerplate code.

## Problem Statement

Currently, authentication methods have several issues:

```typescript
// Current API - Multiple problems
const { login } = useAuth();
const { appId } = useApp();
const { tenantId } = useTenant();

// Problem 1: Too many positional parameters
await login(username, password, appId, tenantId);

// Problem 2: Hard to remember parameter order
await signup(email, phoneNumber, name, password, tenantId, lastName, appId);
// Was lastName before or after tenantId? 🤔

// Problem 3: Redundant context values
// Why pass appId and tenantId when they're already in context?
```

**Issues:**
1. **Too Many Parameters**: Functions with 5+ parameters are hard to use
2. **Positional Confusion**: Easy to mix up parameter order
3. **Redundant Code**: Must extract and pass values from context
4. **Hard to Extend**: Adding new parameters breaks existing calls
5. **Poor Readability**: Not clear what each parameter means at call site
6. **Poor DX**: Unnecessary boilerplate makes the API harder to use

## Current Implementation

### AuthProvider Method Signatures

```typescript
login: (username: string, password: string, appId?: string, tenantId?: string) => Promise<any>;

signup: (
  email?: string,
  phoneNumber?: string,
  name?: string,
  password?: string,
  tenantId?: string,
  lastName?: string,
  appId?: string
) => Promise<any>;

signupTenantAdmin: (
  email?: string,
  phoneNumber?: string,
  name?: string,
  password?: string,
  tenantName?: string,
  lastName?: string,
  appId?: string
) => Promise<any>;

sendMagicLink: (
  email: string,
  tenantId: string,
  frontendUrl: string,
  name?: string,
  lastName?: string,
  appId?: string
) => Promise<any>;

verifyMagicLink: (
  token: string, 
  email: string, 
  appId: string, 
  tenantId?: string
) => Promise<any>;

requestPasswordReset: (email: string, tenantId: string) => Promise<void>;
```

### Current Usage

```typescript
function LoginForm() {
  const { login } = useAuth();
  const { appId } = useApp();
  const { tenantId } = useTenant();
  
  const handleLogin = async () => {
    // Must manually extract and pass context values
    await login(username, password, appId, tenantId);
  };
}
```

## Proposed Solution

### Design Principles

1. **Object Parameters**: Use object parameters for all methods
2. **Self-Documenting**: Parameter names visible at call site
3. **Auto-Context**: `appId` and `tenantId` inferred from providers
4. **Override Support**: Allow manual override when needed (root tenant scenarios)
5. **Type Safety**: Strong TypeScript types with clear required/optional fields

### New Method Signatures

```typescript
// Login
interface LoginParams {
  username: string;
  password: string;
  tenantId?: string; // Override context if needed
}
login: (params: LoginParams) => Promise<LoginResponse>;

// Signup
interface SignupParams {
  email?: string;
  phoneNumber?: string;
  name: string;
  password: string;
  lastName?: string;
  tenantId?: string; // Override context if needed
}
signup: (params: SignupParams) => Promise<User>;

// Signup Tenant Admin
interface SignupTenantAdminParams {
  email?: string;
  phoneNumber?: string;
  name: string;
  password: string;
  tenantName: string;
  lastName?: string;
}
signupTenantAdmin: (params: SignupTenantAdminParams) => Promise<{ user: User; tenant: any }>;

// Send Magic Link
interface SendMagicLinkParams {
  email: string;
  frontendUrl: string;
  name?: string;
  lastName?: string;
  tenantId?: string; // Override context if needed
}
sendMagicLink: (params: SendMagicLinkParams) => Promise<MagicLinkResponse>;

// Verify Magic Link
interface VerifyMagicLinkParams {
  token: string;
  email: string;
  tenantId?: string; // Override context if needed
}
verifyMagicLink: (params: VerifyMagicLinkParams) => Promise<VerifyMagicLinkResponse>;

// Password Reset Request
interface RequestPasswordResetParams {
  email: string;
  tenantId?: string; // Override context if needed
}
requestPasswordReset: (params: RequestPasswordResetParams) => Promise<void>;

// Confirm Password Reset
interface ConfirmPasswordResetParams {
  token: string;
  newPassword: string;
}
confirmPasswordReset: (params: ConfirmPasswordResetParams) => Promise<void>;

// Change Password
interface ChangePasswordParams {
  currentPassword: string;
  newPassword: string;
}
changePassword: (params: ChangePasswordParams) => Promise<void>;
```

### Implementation Strategy

**AuthProvider Implementation:**

```typescript
export function AuthProvider({ config = {}, children }: AuthProviderProps) {
  const { appId, baseUrl } = useApp();
  const { tenant } = useTenant(); // { tenant: PublicTenantInfo | null, ... }
  const defaultTenantId = tenant?.id || null;
  
  // ... existing setup ...
  
  const contextValue = useMemo(() => {
    const login = async (params: LoginParams) => {
      const { username, password, tenantId } = params;
      
      // Use provided tenantId or fall back to context
      const resolvedTenantId = tenantId ?? defaultTenantId;
      
      const loginResponse = await authApiService.login({
        username,
        password,
        appId, // Always from AppProvider
        tenantId: resolvedTenantId, // From params or TenantProvider
      });
      
      // ... rest of login logic
      
      return loginResponse;
    };
    
    const signup = async (params: SignupParams) => {
      const { email, phoneNumber, name, password, lastName, tenantId } = params;
      
      if (!email && !phoneNumber) {
        throw new Error('Either email or phoneNumber is required');
      }
      
      const resolvedTenantId = tenantId ?? defaultTenantId;
      
      const signupResponse = await authApiService.signup({
        email,
        phoneNumber,
        name,
        password,
        tenantId: resolvedTenantId,
        lastName,
        appId,
      });
      
      return signupResponse;
    };
    
    const sendMagicLink = async (params: SendMagicLinkParams) => {
      const { email, frontendUrl, name, lastName, tenantId } = params;
      
      const resolvedTenantId = tenantId ?? defaultTenantId;
      
      if (!resolvedTenantId) {
        throw new Error('tenantId is required for magic link authentication');
      }
      
      const response = await authApiService.sendMagicLink({
        email,
        tenantId: resolvedTenantId,
        frontendUrl,
        name,
        lastName,
        appId,
      });
      
      return response;
    };
    
    const verifyMagicLink = async (params: VerifyMagicLinkParams) => {
      const { token, email, tenantId } = params;
      
      const resolvedTenantId = tenantId ?? defaultTenantId;
      
      const verifyResponse = await authApiService.verifyMagicLink({
        token,
        email,
        appId,
        tenantId: resolvedTenantId,
      });
      
      // ... rest of verification logic
      
      return verifyResponse;
    };
    
    const requestPasswordReset = async (params: RequestPasswordResetParams) => {
      const { email, tenantId } = params;
      
      const resolvedTenantId = tenantId ?? defaultTenantId;
      
      if (!resolvedTenantId) {
        throw new Error('tenantId is required for password reset');
      }
      
      await authApiService.requestPasswordReset({ email, tenantId: resolvedTenantId });
    };
    
    const changePassword = async (params: ChangePasswordParams) => {
      const { currentPassword, newPassword } = params;
      
      const authHeaders = await sessionManager.getAuthHeaders();
      await authApiService.changePassword({ currentPassword, newPassword }, authHeaders);
    };
    
    const confirmPasswordReset = async (params: ConfirmPasswordResetParams) => {
      const { token, newPassword } = params;
      
      await authApiService.confirmPasswordReset({ token, newPassword });
    };
    
    // ... other methods
    
    return {
      // ... all methods
      login,
      signup,
      signupTenantAdmin,
      sendMagicLink,
      verifyMagicLink,
      requestPasswordReset,
      confirmPasswordReset,
      changePassword,
      // ...
    };
  }, [
    authApiService,
    sessionManager,
    appId,
    defaultTenantId, // Depends on tenant?.id from TenantProvider
    // ... other dependencies
  ]);
  
  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
```

### Updated Usage

```typescript
// Simple case - use context values
function LoginForm() {
  const { login } = useAuth();
  
  const handleLogin = async () => {
    // Clean, self-documenting API
    await login({
      username,
      password,
    });
  };
}

// Edge case - root tenant login with tenant override
function RootTenantLogin() {
  const { login } = useAuth();
  const [selectedTenantId, setSelectedTenantId] = useState('');
  
  const handleLogin = async () => {
    // Override tenant only when necessary
    await login({
      username,
      password,
      tenantId: selectedTenantId, // Clear override
    });
  };
}

// Signup with optional last name
function SignupForm() {
  const { signup } = useAuth();
  
  const handleSignup = async () => {
    await signup({
      email,
      name,
      password,
      lastName, // Optional field, clear and explicit
    });
  };
}

// Magic link with optional fields
function MagicLinkForm() {
  const { sendMagicLink } = useAuth();
  
  const handleSendLink = async () => {
    await sendMagicLink({
      email,
      frontendUrl: window.location.origin,
      name, // Optional
      lastName, // Optional
    });
  };
}

// Change password - simple and clear
function ChangePasswordForm() {
  const { changePassword } = useAuth();
  
  const handleChangePassword = async () => {
    await changePassword({
      currentPassword,
      newPassword,
    });
  };
}
```

## Use Cases

### Use Case 1: Standard Tenant Login
**Scenario:** User on tenant subdomain/page logging in

```typescript
// Before (7 positional parameters total across the flow)
const { appId } = useApp();
const { tenantId } = useTenant();
await login(username, password, appId, tenantId);

// After (clean object parameter)
await login({ username, password });
```

### Use Case 2: Root Tenant Multi-Tenant Selector
**Scenario:** Root page where user selects which tenant to log into

```typescript
// Before (must extract and pass appId)
const { appId } = useApp();
await login(username, password, appId, selectedTenantId);

// After (clear tenant override)
await login({ 
  username, 
  password, 
  tenantId: selectedTenantId 
});
```

### Use Case 3: Signup with Optional Fields
**Scenario:** User signing up with optional last name

```typescript
// Before (confusing parameter order)
await signup(email, undefined, name, password, tenantId, lastName, appId);
// Which parameter is which? Hard to remember!

// After (self-documenting)
await signup({
  email,
  name,
  password,
  lastName, // Clear what this is
});
```

### Use Case 4: Magic Link on Specific Tenant
**Scenario:** Sending magic link from a tenant-specific page

```typescript
// Before (6 parameters, some optional)
await sendMagicLink(email, tenantId, frontendUrl, name, lastName, appId);

// After (clear required vs optional)
await sendMagicLink({
  email,
  frontendUrl: window.location.origin,
  name,
  lastName,
});
```

### Use Case 5: Password Reset
**Scenario:** User requesting password reset

```typescript
// Before
const { tenantId } = useTenant();
await requestPasswordReset(email, tenantId);

// After
await requestPasswordReset({ email });
```

## Benefits

1. **Self-Documenting Code**
   - Parameter names visible at call site: `login({ username, password })`
   - No need to remember parameter order
   - Code reads like natural language

2. **Better Developer Experience**
   - Less boilerplate code (no extracting appId/tenantId)
   - Object destructuring makes code cleaner
   - IDE autocomplete shows available parameters

3. **Fewer Bugs**
   - Can't pass parameters in wrong order
   - Can't accidentally pass wrong appId
   - TypeScript enforces required fields

4. **Easier to Extend**
   - Adding new parameters doesn't break existing code
   - Optional parameters are truly optional
   - No breaking changes when adding fields

5. **Cleaner Code**
   - Single parameter instead of 5-7 positional args
   - Optional fields clearly separated
   - More readable method calls

6. **Flexibility Maintained**
   - Can still override tenantId when needed (root tenant scenarios)
   - All existing functionality preserved
   - Context values used by default

7. **Better Type Safety**
   - Strong TypeScript interfaces for each method
   - Clear required vs optional parameters
   - Better IDE support and autocomplete

## Migration Guide

### Breaking Changes

This is a **breaking change** and will require updates to existing code.

### Migration Steps

**Step 1: Update login calls**

```typescript
// Before
const { appId } = useApp();
const { tenantId } = useTenant();
await login(username, password, appId, tenantId);

// After
await login({ username, password });
```

**Step 2: Update signup calls**

```typescript
// Before
await signup(email, phoneNumber, name, password, tenantId, lastName, appId);

// After
await signup({ 
  email, 
  phoneNumber, 
  name, 
  password, 
  lastName 
});
```

**Step 3: Update magic link calls**

```typescript
// Before
await sendMagicLink(email, tenantId, frontendUrl, name, lastName, appId);

// After
await sendMagicLink({ 
  email, 
  frontendUrl, 
  name, 
  lastName 
});
```

**Step 4: Update password reset calls**

```typescript
// Before
await requestPasswordReset(email, tenantId);

// After
await requestPasswordReset({ email });
```

**Step 5: Root tenant override (if needed)**

```typescript
// Before
await login(username, password, appId, selectedTenantId);

// After
await login({ 
  username, 
  password, 
  tenantId: selectedTenantId 
});
```

### Automated Migration

Could provide a codemod script to automate most of the migration:

```bash
npx @skylabs-digital/react-identity-access-codemod v2.0.0
```

## Implementation Plan

### Phase 1: Update AuthProvider
- [ ] Inject `useApp()` and `useTenantInfo()` into AuthProvider
- [ ] Update all method signatures
- [ ] Implement default value logic
- [ ] Add error handling for missing required values

### Phase 2: Update Components
- [ ] Update `LoginForm` component
- [ ] Update `SignupForm` component
- [ ] Update `MagicLinkForm` component
- [ ] Update `MagicLinkVerify` component
- [ ] Update `PasswordRecoveryForm` component

### Phase 3: Update Types
- [ ] Update `AuthContextValue` interface
- [ ] Create options types for each method
- [ ] Update component prop types

### Phase 4: Documentation
- [ ] Update README.md
- [ ] Update API reference
- [ ] Update examples
- [ ] Create migration guide
- [ ] Update CHANGELOG.md

### Phase 5: Testing
- [ ] Update unit tests
- [ ] Update integration tests
- [ ] Test root tenant scenarios
- [ ] Test tenant override scenarios

## Considerations

### Error Handling

**Question:** What if tenantId is required but not available in context?

**Solution:** Throw descriptive error
```typescript
const tenantId = options?.tenantId ?? defaultTenantId;

if (!tenantId && methodRequiresTenant) {
  throw new Error(
    'tenantId is required. Either provide it in options or ensure TenantProvider has a valid tenant.'
  );
}
```

### Optional Tenant Mode

**Question:** How does this work with `tenantMode: 'optional'`?

**Solution:** Methods that require tenant will fail gracefully with clear error message
```typescript
// Root/optional tenant mode - must provide tenantId
await login(username, password, { tenantId: selectedTenant });
```

### TypeScript Support

**Question:** How do we ensure type safety?

**Solution:** Strong typing for options
```typescript
interface LoginOptions {
  tenantId?: string;
}

interface SignupOptions {
  tenantId?: string;
  lastName?: string;
}

interface MagicLinkOptions {
  tenantId?: string;
  name?: string;
  lastName?: string;
}
```

## Versioning

This change will be released as a **major version bump** (v2.0.0) due to breaking changes.

**Semantic Versioning:**
- Current: `1.x.x`
- After RFC-002: `2.0.0`

## Alternatives Considered

### Alternative 1: Keep Current API (Positional Parameters)
```typescript
login(username: string, password: string, appId?: string, tenantId?: string)
```
**Pros:** No breaking changes  
**Cons:** Poor DX, hard to remember order, redundant code  
**Decision:** ❌ Rejected - improvement is worth breaking change

### Alternative 2: Use Options Object
```typescript
login(username: string, password: string, options?: { tenantId?: string })
```
**Pros:** Keeps main params positional  
**Cons:** "options" is for config, not params; still multiple positional args  
**Decision:** ❌ Rejected - confuses config with parameters

### Alternative 3: Object Parameters (SELECTED)
```typescript
login(params: { username: string; password: string; tenantId?: string })
```
**Pros:** Self-documenting, no order confusion, easy to extend  
**Cons:** Breaking change  
**Decision:** ✅ **SELECTED** - Best DX, worth the breaking change

### Alternative 4: Overload Methods
```typescript
login(username: string, password: string): Promise<LoginResponse>;
login(params: LoginParams): Promise<LoginResponse>;
```
**Pros:** Backward compatible  
**Cons:** Complex implementation, confusing overloads, maintenance burden  
**Decision:** ❌ Rejected - object params are clearer

### Alternative 5: Separate Methods
```typescript
loginWithTenant(username, password, tenantId);
loginWithContext(username, password);
```
**Pros:** Explicit about what each does  
**Cons:** API bloat, confusing naming, duplication  
**Decision:** ❌ Rejected - object params more elegant

## Open Questions

1. **Should we support appId override?**
   - Current proposal: No, always use AppProvider value
   - Reasoning: appId should never change within an app
   - **Decision:** Keep as is, no override needed

2. **Should signupTenantAdmin also use context tenantId?**
   - Current proposal: No, tenant admin creates new tenant
   - Reasoning: This method doesn't operate on existing tenant
   - **Decision:** No change needed for this method

3. **Migration timeline?**
   - Proposal: Release as v2.0.0 with migration guide
   - Provide 6 months of v1.x maintenance for critical bugs
   - **Decision:** TBD based on user feedback

## Related RFCs

This RFC works together with RFC-001:
- **RFC-001** adds automatic tenant switching after login
- **RFC-002** modernizes the auth method API
- Together they create a clean, intuitive authentication flow

**Combined Example:**
```typescript
// Clean login with automatic tenant switching
const handleLogin = async () => {
  // RFC-002: Object parameter API
  await login({ username, password, tenantId: selectedTenant });
  
  // RFC-001: Automatic tenant switch if needed
  if (selectedTenant !== currentTenant) {
    const info = await tenantApi.getTenantById(selectedTenant);
    switchTenant(info.domain);
  }
};
```

## References

- [RFC-001: Post-Login Tenant Switch](/docs/RFC/0001-post-login-tenant-switch.md)
- [AuthProvider Implementation](/src/providers/AuthProvider.tsx)
- [React Context Best Practices](https://react.dev/learn/passing-data-deeply-with-context)
- [TypeScript Function Overloads](https://www.typescriptlang.org/docs/handbook/2/functions.html#function-overloads)

## Decision

**Pending Review** - This RFC is open for discussion and feedback.

**Key Decision Points:**
1. ✅ Use object parameters instead of positional arguments
2. ✅ Remove appId parameter (always use AppProvider)
3. ✅ Make tenantId optional (use TenantProvider by default)
4. ✅ Self-documenting API with parameter names visible at call site
5. ✅ Release as major version bump (v2.0.0)
6. ⏳ Determine migration timeline
7. ⏳ Decide on codemod support
