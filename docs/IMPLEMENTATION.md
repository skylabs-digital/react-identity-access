# Implementation Details

## Architecture Overview

The React Identity Access library is built with a modular architecture that separates concerns and provides flexibility for different deployment scenarios.

### Core Components

#### 1. Identity Provider
- **Purpose**: Central context provider that manages authentication state
- **Location**: `src/providers/IdentityProvider.tsx`
- **Key Features**:
  - Manages global authentication state
  - Handles tenant resolution
  - Provides context to all child components

#### 2. Connectors
- **Purpose**: Abstract data layer for different backend integrations
- **Base Class**: `src/connectors/base/IdentityConnector.ts`
- **Implementations**:
  - `LocalStorageConnector`: Mock implementation for development/testing
  - Extensible for real backend integrations

#### 3. Hooks System
- **Purpose**: Provide one-liner access to authentication features
- **Location**: `src/hooks/`
- **Key Hooks**:
  - `useAuth`: Authentication state and actions
  - `useRoles`: Role and permission checking
  - `useFeatureFlags`: Feature flag management
  - `useTenant`: Multi-tenant operations
  - `useSession`: Session management

#### 4. Component Guards
- **Purpose**: Declarative access control components
- **Location**: `src/components/guards/`
- **Components**:
  - `ProtectedRoute`: Route-level protection
  - `RoleGuard`: Role-based content protection
  - `PermissionGuard`: Permission-based content protection

#### 5. Feature Flag System
- **Purpose**: Runtime feature toggling with dual control
- **Location**: `src/components/feature-flags/`
- **Components**:
  - `FeatureFlag`: Conditional rendering based on flags
  - `FeatureToggle`: Admin interface for flag management

## Data Flow

```
User Action → Hook → Context → Connector → Backend/Storage
     ↓
Component Re-render ← State Update ← Response Processing
```

## Tenant Resolution Strategy

The library supports configurable tenant resolution with the following priority:

1. **Subdomain Strategy** (Production)
   - Extracts tenant from subdomain
   - Format: `{tenant}.domain.com`

2. **Query Parameter Strategy** (Development)
   - Uses URL query parameter
   - Stores in sessionStorage for persistence
   - Format: `?tenant=acme-corp`

3. **Fallback Handling**
   - Redirects to configurable landing page
   - Default fallback to root path

## Feature Flag Architecture

### Dual Control System

1. **Server Level Control**
   - Global enable/disable for entire feature
   - Server-disabled flags are invisible to tenant admins
   - Defined in seed/server data

2. **Tenant Level Control**
   - Tenant admin can toggle enabled server flags
   - Uses `adminEditable` prop for configuration
   - Overrides stored in tenant-specific data

### Configuration Structure

```typescript
interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  category: 'ui' | 'feature' | 'experiment' | 'rollout';
  
  // Server control
  serverEnabled: boolean;
  tenantId?: string;
  rolloutPercentage?: number;
  
  // Tenant control
  adminEditable: boolean;
  defaultState: boolean;
  tenantOverride?: boolean;
}
```

## Security Considerations

### Authentication Flow
1. Credentials validated against connector
2. JWT tokens generated and stored securely
3. Session validation on each request
4. Automatic token refresh handling

### Authorization Model
- **Role-Based Access Control (RBAC)**
- **Permission-Based Access Control (PBAC)**
- **Resource-Action Pattern**: `resource:action` (e.g., `users:read`)

### Multi-Tenant Isolation
- Tenant ID validation on all operations
- Data scoping by tenant context
- Cross-tenant access prevention

## Performance Optimizations

### Context Optimization
- Selective re-rendering using multiple contexts
- Memoized hook returns
- Lazy loading of non-critical features

### Caching Strategy
- Session data cached in memory
- Feature flags cached with TTL
- Role/permission data cached per session

### Bundle Size
- Tree-shakeable exports
- Minimal dependencies
- Optional UI components

## Testing Strategy

### Unit Tests
- Hook functionality testing
- Component behavior verification
- Connector integration testing

### Integration Tests
- End-to-end authentication flows
- Multi-tenant scenarios
- Feature flag toggling

### Mock Data
- Comprehensive seed data for development
- Realistic user scenarios
- Multiple tenant configurations

## Extensibility Points

### Custom Connectors
Implement the `IdentityConnector` abstract class:

```typescript
class CustomConnector extends IdentityConnector {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Custom implementation
  }
  
  // Implement other required methods...
}
```

### Custom Components
All components accept custom styling and behavior props:

```typescript
<ProtectedRoute
  fallback={<CustomAccessDenied />}
  loadingComponent={<CustomSpinner />}
  redirectTo="/custom-login"
>
  {/* Protected content */}
</ProtectedRoute>
```

### Custom Hooks
Build on top of base hooks for specific use cases:

```typescript
function useAdminAccess() {
  const { hasRole } = useRoles();
  const { isEnabled } = useFeatureFlags();
  
  return {
    canAccessAdminPanel: hasRole('admin') && isEnabled('admin-panel'),
    canManageUsers: hasRole('admin') && isEnabled('user-management'),
  };
}
```
