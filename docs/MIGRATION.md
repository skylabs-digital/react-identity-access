# Migration Guide

Guide for migrating to React Identity Access from other authentication solutions and upgrading between versions.

## Migration from Other Libraries

### From Auth0

```typescript
// Before: Auth0
import { useAuth0 } from '@auth0/auth0-react';

const { user, isAuthenticated, loginWithRedirect, logout } = useAuth0();

// After: React Identity Access
import { useAuth } from 'react-identity-access';

const { auth, login, logout } = useAuth();
const { user, isAuthenticated } = auth;

// Login flow change
// Before: loginWithRedirect()
// After: login({ email, password })
```

**Key Differences:**
- Auth0 uses redirect-based OAuth, RIA uses credential-based auth
- Auth0 manages users externally, RIA can use local or API-based user management
- RIA includes built-in multi-tenancy and subscription management

**Migration Steps:**
1. Replace Auth0Provider with RIA providers
2. Update login flow from redirect to form-based
3. Migrate user data to RIA format
4. Update role/permission checking logic

### From Firebase Auth

```typescript
// Before: Firebase
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';

const [user, loading, error] = useAuthState(auth);

// After: React Identity Access
import { useAuth } from 'react-identity-access';

const { auth: { user, isLoading, error } } = useAuth();
```

**Migration Steps:**
1. Export user data from Firebase
2. Transform Firebase user format to RIA User interface
3. Replace Firebase providers with RIA providers
4. Update authentication methods

### From NextAuth.js

```typescript
// Before: NextAuth
import { useSession } from 'next-auth/react';

const { data: session, status } = useSession();

// After: React Identity Access
import { useAuth } from 'react-identity-access';

const { auth } = useAuth();
const session = auth.user;
const status = auth.isLoading ? 'loading' : auth.isAuthenticated ? 'authenticated' : 'unauthenticated';
```

## Version Migrations

### v1.x to v2.x

**Breaking Changes:**
- Connector configuration moved from string-based to object-based
- Session storage refactored to per-tenant keys
- Provider hierarchy simplified

**Migration Steps:**

1. **Update Connector Configuration**
```typescript
// v1.x
<ConnectorProvider type="localStorage" appId="my-app">

// v2.x
<ConnectorProvider
  config={{
    type: 'localStorage',
    appId: 'my-app',
    seedData: { /* ... */ }
  }}
>
```

2. **Update Session Storage Access**
```typescript
// v1.x - Direct localStorage access
const session = JSON.parse(localStorage.getItem('auth_session') || '{}');

// v2.x - Use hooks
const { auth } = useAuth();
const session = auth.user;
```

3. **Update Provider Nesting**
```typescript
// v1.x
<ConnectorProvider>
  <TenantProvider>
    <IdentityProvider>
      <FeatureFlagsProvider>
        <App />

// v2.x - Same structure, but simplified configuration
<ConnectorProvider config={connectorConfig}>
  <TenantProvider config={tenantConfig}>
    <IdentityProvider>
      <FeatureFlagsProvider>
        <App />
```

### v2.x to v3.x

**Breaking Changes:**
- Subscription system added
- Settings provider requires schema validation
- Component props standardized

**Migration Steps:**

1. **Add Subscription Provider**
```typescript
// Add to provider hierarchy
<SubscriptionProvider>
  <App />
</SubscriptionProvider>
```

2. **Update Settings with Schema**
```typescript
// v2.x
<SettingsProvider defaults={defaultSettings}>

// v3.x
import { z } from 'zod';

const settingsSchema = z.object({
  theme: z.enum(['light', 'dark']),
  notifications: z.boolean()
});

<SettingsProvider 
  schema={settingsSchema}
  defaults={defaultSettings}
>
```

## Data Migration

### User Data Format

**Source Format (Generic):**
```json
{
  "id": "user123",
  "email": "user@example.com",
  "name": "John Doe",
  "roles": ["user"],
  "metadata": {
    "company": "Acme Corp"
  }
}
```

**Target Format (RIA):**
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  roles: string[];
  permissions?: string[];
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}
```

**Migration Script:**
```typescript
const migrateUsers = (sourceUsers: any[], tenantId: string): User[] => {
  return sourceUsers.map(user => ({
    id: user.id,
    email: user.email,
    name: user.name || user.displayName,
    tenantId,
    roles: user.roles || ['user'],
    permissions: user.permissions || [],
    isActive: user.active !== false,
    createdAt: new Date(user.createdAt || Date.now()),
    lastLoginAt: user.lastLogin ? new Date(user.lastLogin) : undefined
  }));
};
```

### Tenant Data Migration

```typescript
const migrateTenants = (sourceOrgs: any[]): Tenant[] => {
  return sourceOrgs.map(org => ({
    id: org.id || org.slug,
    name: org.name || org.displayName,
    domain: org.domain,
    isActive: org.status === 'active',
    createdAt: new Date(org.createdAt),
    settings: org.settings || {}
  }));
};
```

### Feature Flags Migration

```typescript
const migrateFeatureFlags = (sourceFlags: any[]): FeatureFlag[] => {
  return sourceFlags.map(flag => ({
    id: flag.id || flag.key,
    key: flag.key,
    name: flag.name || flag.key,
    description: flag.description || '',
    defaultState: flag.enabled || false,
    adminEditable: flag.adminEditable !== false,
    tenantId: flag.tenantId
  }));
};
```

## Database Migration

### SQL Migration Scripts

```sql
-- Create RIA tables
CREATE TABLE tenants (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  settings JSON
);

CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  roles JSON,
  permissions JSON,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE feature_flags (
  id VARCHAR(255) PRIMARY KEY,
  key VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  default_state BOOLEAN DEFAULT false,
  admin_editable BOOLEAN DEFAULT true,
  tenant_id VARCHAR(255),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE KEY unique_flag_per_tenant (key, tenant_id)
);

-- Migrate existing data
INSERT INTO tenants (id, name, domain, is_active, created_at)
SELECT 
  id,
  name,
  domain,
  status = 'active',
  created_at
FROM legacy_organizations;

INSERT INTO users (id, email, name, tenant_id, roles, is_active, created_at)
SELECT 
  u.id,
  u.email,
  u.name,
  u.organization_id,
  JSON_ARRAY(COALESCE(u.role, 'user')),
  u.active,
  u.created_at
FROM legacy_users u;
```

### MongoDB Migration

```javascript
// MongoDB migration script
db.legacy_users.find().forEach(function(user) {
  db.users.insertOne({
    _id: user._id,
    email: user.email,
    name: user.name || user.displayName,
    tenantId: user.organizationId,
    roles: user.roles || ['user'],
    permissions: user.permissions || [],
    isActive: user.active !== false,
    createdAt: user.createdAt || new Date(),
    lastLoginAt: user.lastLogin
  });
});

db.legacy_organizations.find().forEach(function(org) {
  db.tenants.insertOne({
    _id: org._id,
    name: org.name,
    domain: org.domain,
    isActive: org.status === 'active',
    createdAt: org.createdAt || new Date(),
    settings: org.settings || {}
  });
});
```

## Configuration Migration

### Environment Variables

**Before (Generic Auth):**
```bash
AUTH_DOMAIN=auth.example.com
AUTH_CLIENT_ID=abc123
AUTH_CLIENT_SECRET=secret123
```

**After (RIA):**
```bash
REACT_APP_API_URL=https://api.myapp.com
REACT_APP_API_KEY=your-api-key
REACT_APP_APP_ID=my-app
REACT_APP_ENVIRONMENT=production
```

### Provider Configuration

**Before:**
```typescript
<AuthProvider
  domain="auth.example.com"
  clientId="abc123"
  redirectUri={window.location.origin}
>
```

**After:**
```typescript
<ConnectorProvider
  config={{
    type: 'fetch',
    appId: 'my-app',
    baseUrl: process.env.REACT_APP_API_URL,
    apiKey: process.env.REACT_APP_API_KEY
  }}
>
  <TenantProvider config={{ strategy: 'subdomain' }}>
    <IdentityProvider>
```

## Testing Migration

### Update Test Setup

```typescript
// Before
import { renderWithAuth } from './test-utils';

// After
import { renderWithProviders } from './test-utils';

const renderWithProviders = (ui: ReactElement, options?: any) => {
  const mockConnector = new MockConnector({
    type: 'mock',
    appId: 'test'
  });
  
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <ConnectorProvider connector={mockConnector}>
      <TenantProvider config={{ strategy: 'static', static: { tenantId: 'test' } }}>
        <IdentityProvider>
          {children}
        </IdentityProvider>
      </TenantProvider>
    </ConnectorProvider>
  );
  
  return render(ui, { wrapper: Wrapper, ...options });
};
```

### Update Test Cases

```typescript
// Before
describe('Authentication', () => {
  it('should login user', async () => {
    const { getByText } = renderWithAuth(<LoginForm />);
    // Auth0/Firebase specific tests
  });
});

// After
describe('Authentication', () => {
  it('should login user', async () => {
    const { getByText } = renderWithProviders(<LoginForm />);
    
    fireEvent.change(getByLabelText('Email'), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(getByLabelText('Password'), {
      target: { value: 'password' }
    });
    fireEvent.click(getByText('Sign In'));
    
    await waitFor(() => {
      expect(mockConnector.login).toHaveBeenCalled();
    });
  });
});
```

## Rollback Strategy

### Gradual Migration

```typescript
// Feature flag for gradual rollout
const useNewAuth = useFeatureFlag('use_new_auth_system');

const AuthProvider = ({ children }: { children: ReactNode }) => {
  if (useNewAuth) {
    return (
      <ConnectorProvider config={riaConfig}>
        <IdentityProvider>
          {children}
        </IdentityProvider>
      </ConnectorProvider>
    );
  }
  
  return (
    <LegacyAuthProvider>
      {children}
    </LegacyAuthProvider>
  );
};
```

### Data Backup

```typescript
// Backup existing data before migration
const backupData = async () => {
  const backup = {
    users: await legacyAuth.getUsers(),
    organizations: await legacyAuth.getOrganizations(),
    settings: await legacyAuth.getSettings(),
    timestamp: new Date().toISOString()
  };
  
  // Store backup
  await fs.writeFile(
    `backup-${Date.now()}.json`,
    JSON.stringify(backup, null, 2)
  );
};
```

### Rollback Procedure

1. **Disable new system via feature flag**
2. **Restore from backup if needed**
3. **Revert environment variables**
4. **Deploy previous version**

```bash
# Emergency rollback script
#!/bin/bash
echo "Rolling back to previous version..."

# Disable feature flag
curl -X POST https://api.myapp.com/feature-flags/use_new_auth_system \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# Deploy previous version
kubectl rollout undo deployment/my-app

echo "Rollback complete"
```

## Post-Migration Checklist

### Functionality Testing
- [ ] User login/logout works
- [ ] Role-based access control functions
- [ ] Multi-tenant isolation verified
- [ ] Feature flags toggle correctly
- [ ] Settings persist properly
- [ ] Subscription features work (if applicable)

### Performance Testing
- [ ] Page load times acceptable
- [ ] Authentication flow responsive
- [ ] Memory usage within limits
- [ ] Bundle size optimized

### Security Testing
- [ ] Session isolation per tenant
- [ ] Unauthorized access blocked
- [ ] Token refresh working
- [ ] Logout clears all data

### Monitoring Setup
- [ ] Error tracking configured
- [ ] Performance monitoring active
- [ ] User analytics working
- [ ] Health checks passing

## Common Migration Issues

### Issue: Session Data Loss
**Cause:** Different session storage keys
**Solution:** Migrate existing sessions during deployment

```typescript
// Migration script for sessions
const migrateExistingSessions = () => {
  const oldSession = localStorage.getItem('auth_session');
  if (oldSession && !localStorage.getItem('auth_session_demo')) {
    const sessionData = JSON.parse(oldSession);
    localStorage.setItem(`auth_session_${sessionData.tenantId}`, oldSession);
  }
};
```

### Issue: Role Mapping Conflicts
**Cause:** Different role naming conventions
**Solution:** Create role mapping during migration

```typescript
const roleMapping = {
  'administrator': 'admin',
  'moderator': 'moderator',
  'member': 'user'
};

const migrateUserRoles = (user: any) => ({
  ...user,
  roles: user.roles.map((role: string) => roleMapping[role] || role)
});
```

### Issue: API Endpoint Mismatches
**Cause:** Different API structure expectations
**Solution:** Update connector path mappings

```typescript
const pathMappings = {
  'users': 'api/v1/users',
  'tenants': 'api/v1/organizations',
  'auth/login': 'api/v1/authenticate'
};
```
