# Seed Data Configuration Guide

The React Identity Access library requires developers to provide their own seed data when using the `LocalStorageConnector`. This ensures the library remains agnostic and allows developers to define their own data structure for development and testing.

## Overview

The `LocalStorageConnector` is designed for development and testing purposes. It requires a `seedData` configuration that defines the initial data structure for your application.

## Basic Setup

```tsx
import { LocalStorageConnector } from 'react-identity-access';

const connector = new LocalStorageConnector({
  simulateDelay: true,
  minDelay: 200,
  maxDelay: 800,
  seedData: {
    tenants: [...],
    users: [...],
    roles: [...],
    featureFlags: {...}
  }
});
```

## Seed Data Structure

### SeedData Interface

```tsx
interface SeedData {
  tenants?: Tenant[];
  users?: User[];
  roles?: Role[];
  featureFlags?: Record<string, FeatureFlag>;
}
```

All properties are optional, allowing you to define only the data you need for your specific use case.

## Example Seed Data

### Complete Example

```tsx
import { User, Tenant, Role, Permission, FeatureFlag, TenantSettings } from 'react-identity-access';

export const mySeedData = {
  tenants: [
    {
      id: 'my-company',
      name: 'My Company',
      domain: 'mycompany.example.com',
      settings: {
        allowSelfRegistration: true,
        requireEmailVerification: false,
        sessionTimeout: 3600000, // 1 hour
        maxConcurrentSessions: 3,
        customBranding: {
          primaryColor: '#007bff',
          secondaryColor: '#6c757d',
        },
      } as TenantSettings,
      isActive: true,
      createdAt: new Date('2024-01-01'),
    },
  ] as Tenant[],

  users: [
    {
      id: 'admin-1',
      email: 'admin@mycompany.com',
      name: 'Admin User',
      tenantId: 'my-company',
      roles: ['admin'],
      permissions: ['read:users', 'write:users', 'manage:users'],
      isActive: true,
      createdAt: new Date('2024-01-01'),
      lastLoginAt: new Date(),
    },
    {
      id: 'user-1',
      email: 'user@mycompany.com',
      name: 'Regular User',
      tenantId: 'my-company',
      roles: ['user'],
      permissions: ['read:own', 'write:own'],
      isActive: true,
      createdAt: new Date('2024-01-01'),
      lastLoginAt: new Date(),
    },
  ] as User[],

  roles: [
    {
      id: 'admin',
      name: 'admin',
      displayName: 'Administrator',
      permissions: [
        { id: 'read:users', name: 'read:users', resource: 'users', action: 'read' },
        { id: 'write:users', name: 'write:users', resource: 'users', action: 'write' },
        { id: 'manage:users', name: 'manage:users', resource: 'users', action: 'manage' },
      ] as Permission[],
      isSystemRole: true,
    },
    {
      id: 'user',
      name: 'user',
      displayName: 'User',
      permissions: [
        { id: 'read:own', name: 'read:own', resource: 'profile', action: 'read' },
        { id: 'write:own', name: 'write:own', resource: 'profile', action: 'write' },
      ] as Permission[],
      isSystemRole: true,
    },
  ] as Role[],

  featureFlags: {
    'new-feature': {
      key: 'new-feature',
      name: 'New Feature',
      description: 'Enable the new feature for testing',
      category: 'feature',
      serverEnabled: true,
      adminEditable: true,
      defaultState: false,
      tenantId: 'my-company',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  } as Record<string, FeatureFlag>,
};
```

### Minimal Example

For simple testing scenarios, you can provide minimal seed data:

```tsx
const minimalSeedData = {
  tenants: [
    {
      id: 'test-tenant',
      name: 'Test Tenant',
      domain: 'test.example.com',
      settings: {
        allowSelfRegistration: true,
        requireEmailVerification: false,
        sessionTimeout: 3600000,
        maxConcurrentSessions: 1,
      },
      isActive: true,
      createdAt: new Date(),
    },
  ],
  users: [
    {
      id: 'test-user',
      email: 'test@example.com',
      name: 'Test User',
      tenantId: 'test-tenant',
      roles: ['user'],
      permissions: ['read:own'],
      isActive: true,
      createdAt: new Date(),
    },
  ],
  roles: [
    {
      id: 'user',
      name: 'user',
      displayName: 'User',
      permissions: [
        { id: 'read:own', name: 'read:own', resource: 'profile', action: 'read' },
      ],
      isSystemRole: true,
    },
  ],
  featureFlags: {},
};
```

## Best Practices

### 1. Organize Seed Data in Separate Files

Create dedicated files for your seed data to keep your main application code clean:

```tsx
// seedData/index.ts
export { developmentSeedData } from './development';
export { testSeedData } from './test';
export { demSeedData } from './demo';
```

### 2. Environment-Specific Seed Data

Use different seed data for different environments:

```tsx
// config/connectors.ts
import { developmentSeedData, testSeedData } from '../seedData';

const seedData = process.env.NODE_ENV === 'test' 
  ? testSeedData 
  : developmentSeedData;

export const connector = new LocalStorageConnector({
  simulateDelay: process.env.NODE_ENV !== 'test',
  seedData,
});
```

### 3. Type Safety

Always use proper TypeScript types to ensure your seed data matches the expected interfaces:

```tsx
import type { SeedData } from 'react-identity-access';

export const mySeedData: SeedData = {
  // Your seed data here
};
```

### 4. Consistent IDs and References

Ensure that user roles reference existing role names/IDs and that tenantIds match existing tenant IDs:

```tsx
// ✅ Good - consistent references
const seedData = {
  tenants: [{ id: 'company-a', ... }],
  users: [{ tenantId: 'company-a', roles: ['admin'], ... }],
  roles: [{ name: 'admin', ... }],
};

// ❌ Bad - inconsistent references
const seedData = {
  tenants: [{ id: 'company-a', ... }],
  users: [{ tenantId: 'company-b', roles: ['administrator'], ... }], // Wrong tenant and role
  roles: [{ name: 'admin', ... }],
};
```

## Testing with Seed Data

For unit tests, you can provide minimal seed data or empty arrays:

```tsx
// test/helpers/testConnector.ts
import { LocalStorageConnector } from 'react-identity-access';

export const createTestConnector = () => {
  return new LocalStorageConnector({
    simulateDelay: false,
    errorRate: 0,
    seedData: {
      tenants: [],
      users: [],
      roles: [],
      featureFlags: {},
    },
  });
};
```

## Migration from Previous Versions

If you were using the library before this change, you need to:

1. **Add seedData parameter**: The `LocalStorageConnector` now requires a `seedData` parameter
2. **Move your data**: Extract any hardcoded data from the library and define it in your project
3. **Update tests**: Ensure all test files provide the required `seedData` parameter

### Before (Old Version)
```tsx
const connector = new LocalStorageConnector({
  simulateDelay: true,
});
```

### After (Current Version)
```tsx
import { mySeedData } from './seedData';

const connector = new LocalStorageConnector({
  simulateDelay: true,
  seedData: mySeedData,
});
```

This change ensures the library remains agnostic and allows you to define exactly the data structure your application needs.
