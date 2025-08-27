import { User, Tenant, FeatureFlag, SubscriptionPlan, Role, Permission } from '../../src/types';

export const mockUsers: User[] = [
  // Acme Corp users
  {
    id: 'admin-1',
    tenantId: 'acme-corp',
    email: 'admin@acme-corp.com',
    name: 'Admin User',
    roles: ['admin'],
    permissions: ['manage_tenant', 'view_analytics'],
    isActive: true,
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'user-1',
    tenantId: 'acme-corp',
    email: 'user@acme-corp.com',
    name: 'Regular User',
    roles: ['user'],
    permissions: ['view_dashboard'],
    isActive: true,
    createdAt: new Date('2024-02-20'),
  },
  {
    id: 'user-2',
    tenantId: 'acme-corp',
    email: 'john.doe@acme-corp.com',
    name: 'John Doe',
    roles: ['user'],
    permissions: ['view_dashboard'],
    isActive: true,
    createdAt: new Date('2024-03-10'),
  },
  {
    id: 'user-3',
    tenantId: 'acme-corp',
    email: 'jane.smith@acme-corp.com',
    name: 'Jane Smith',
    roles: ['user', 'editor'],
    permissions: ['view_dashboard', 'edit_content'],
    isActive: true,
    createdAt: new Date('2024-03-15'),
  },
  {
    id: 'user-4',
    tenantId: 'acme-corp',
    email: 'mike.wilson@acme-corp.com',
    name: 'Mike Wilson',
    roles: ['user'],
    permissions: ['view_dashboard'],
    isActive: false,
    createdAt: new Date('2024-02-05'),
  },
  {
    id: 'manager-1',
    tenantId: 'acme-corp',
    email: 'sarah.manager@acme-corp.com',
    name: 'Sarah Manager',
    roles: ['manager'],
    permissions: ['view_dashboard', 'manage_users'],
    isActive: true,
    createdAt: new Date('2024-01-20'),
  },

  // Startup Inc users
  {
    id: 'startup-admin-1',
    tenantId: 'startup-inc',
    email: 'admin@startup-inc.com',
    name: 'Startup Admin',
    roles: ['admin'],
    permissions: ['manage_tenant', 'view_analytics'],
    isActive: true,
    createdAt: new Date('2024-02-16'),
  },
  {
    id: 'startup-user-1',
    tenantId: 'startup-inc',
    email: 'dev@startup-inc.com',
    name: 'Developer',
    roles: ['user'],
    permissions: ['view_dashboard'],
    isActive: true,
    createdAt: new Date('2024-02-20'),
  },
  {
    id: 'startup-user-2',
    tenantId: 'startup-inc',
    email: 'designer@startup-inc.com',
    name: 'UI Designer',
    roles: ['user'],
    permissions: ['view_dashboard'],
    isActive: true,
    createdAt: new Date('2024-03-01'),
  },

  // Freelancer Pro users
  {
    id: 'freelancer-admin-1',
    tenantId: 'freelancer',
    email: 'admin@freelancer-pro.com',
    name: 'Freelancer Admin',
    roles: ['admin'],
    permissions: ['manage_tenant', 'view_analytics'],
    isActive: true,
    createdAt: new Date('2024-03-02'),
  },

  // Demo Company users
  {
    id: 'demo-admin-1',
    tenantId: 'demo-tenant',
    email: 'admin@demo-company.com',
    name: 'Demo Admin',
    roles: ['admin'],
    permissions: ['manage_tenant', 'view_analytics'],
    isActive: true,
    createdAt: new Date('2024-03-21'),
  },
  {
    id: 'demo-user-1',
    tenantId: 'demo-tenant',
    email: 'user@demo-company.com',
    name: 'Demo User',
    roles: ['user'],
    permissions: ['view_dashboard'],
    isActive: true,
    createdAt: new Date('2024-03-22'),
  },
  {
    id: 'demo-user-2',
    tenantId: 'demo-tenant',
    email: 'tester@demo-company.com',
    name: 'QA Tester',
    roles: ['user'],
    permissions: ['view_dashboard'],
    isActive: true,
    createdAt: new Date('2024-03-23'),
  }
];

export const mockTenants: Tenant[] = [
  {
    id: 'acme-corp',
    name: 'Acme Corporation',
    domain: 'acme-corp.com',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    settings: {
      allowSelfRegistration: true,
      requireEmailVerification: false,
      sessionTimeout: 3600,
      maxConcurrentSessions: 5
    }
  },
  {
    id: 'startup-inc',
    name: 'Startup Inc',
    domain: 'startup-inc.com',
    isActive: true,
    createdAt: new Date('2024-02-15'),
    settings: {
      allowSelfRegistration: true,
      requireEmailVerification: true,
      sessionTimeout: 7200,
      maxConcurrentSessions: 3
    }
  },
  {
    id: 'freelancer',
    name: 'Freelancer Pro',
    domain: 'freelancer-pro.com',
    isActive: true,
    createdAt: new Date('2024-03-01'),
    settings: {
      allowSelfRegistration: false,
      requireEmailVerification: true,
      sessionTimeout: 1800,
      maxConcurrentSessions: 1
    }
  },
  {
    id: 'demo-tenant',
    name: 'Demo Company',
    domain: 'demo-company.com',
    isActive: true,
    createdAt: new Date('2024-03-20'),
    settings: {
      allowSelfRegistration: true,
      requireEmailVerification: false,
      sessionTimeout: 3600,
      maxConcurrentSessions: 10
    }
  }
];

// Mock passwords for demo (in real app, these would be hashed)
export const mockPasswords: Record<string, string> = {
  // Acme Corp passwords
  'admin@acme-corp.com': 'admin123',
  'user@acme-corp.com': 'user123',
  'john.doe@acme-corp.com': 'user123',
  'jane.smith@acme-corp.com': 'user123',
  'mike.wilson@acme-corp.com': 'user123',
  'sarah.manager@acme-corp.com': 'manager123',
  
  // Startup Inc passwords
  'admin@startup-inc.com': 'admin123',
  'dev@startup-inc.com': 'dev123',
  'designer@startup-inc.com': 'design123',
  
  // Freelancer Pro passwords
  'admin@freelancer-pro.com': 'freelancer123',
  
  // Demo Company passwords
  'admin@demo-company.com': 'demo123',
  'user@demo-company.com': 'demo123',
  'tester@demo-company.com': 'test123',
};

// Mock feature flags for demo (as array for connector compatibility)
export const mockFeatureFlags: FeatureFlag[] = [
  {
    id: 'advanced_public_features',
    key: 'advanced_public_features',
    name: 'Advanced Public Features',
    description: 'Show advanced features section on public landing',
    category: 'ui',
    serverEnabled: true,
    adminEditable: true,
    defaultState: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'beta_public_content',
    key: 'beta_public_content',
    name: 'Beta Public Content',
    description: 'Show beta indicators and content on public pages',
    category: 'ui',
    serverEnabled: true,
    adminEditable: true,
    defaultState: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'admin_feature_flags',
    key: 'admin_feature_flags',
    name: 'Admin Feature Flags Management',
    description: 'Allow admins to manage feature flags (Pro+ feature)',
    category: 'feature',
    serverEnabled: true,
    adminEditable: false,
    defaultState: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'advanced_analytics',
    key: 'advanced_analytics',
    name: 'Advanced Analytics',
    description: 'Advanced analytics and reporting dashboard',
    category: 'feature',
    serverEnabled: true,
    adminEditable: false,
    defaultState: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'user_management',
    key: 'user_management',
    name: 'User Management',
    description: 'Full user management capabilities',
    category: 'feature',
    serverEnabled: true,
    adminEditable: false,
    defaultState: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Legacy format for backward compatibility
export const mockFeatureFlagsRecord: Record<string, FeatureFlag> = {
  advanced_public_features: mockFeatureFlags[0],
  beta_public_content: mockFeatureFlags[1],
  admin_feature_flags: mockFeatureFlags[2],
  advanced_analytics: mockFeatureFlags[3],
  user_management: mockFeatureFlags[4],
};

// Mock permissions for demo
export const mockPermissions: Permission[] = [
  // User management permissions
  {
    id: 'perm-1',
    name: 'view_users',
    resource: 'users',
    action: 'read',
  },
  {
    id: 'perm-2',
    name: 'create_users',
    resource: 'users',
    action: 'create',
  },
  {
    id: 'perm-3',
    name: 'edit_users',
    resource: 'users',
    action: 'update',
  },
  {
    id: 'perm-4',
    name: 'delete_users',
    resource: 'users',
    action: 'delete',
  },
  
  // Tenant management permissions
  {
    id: 'perm-5',
    name: 'manage_tenant',
    resource: 'tenant',
    action: 'manage',
  },
  {
    id: 'perm-6',
    name: 'view_tenant_settings',
    resource: 'tenant',
    action: 'read',
  },
  
  // Analytics permissions
  {
    id: 'perm-7',
    name: 'view_analytics',
    resource: 'analytics',
    action: 'read',
  },
  {
    id: 'perm-8',
    name: 'export_analytics',
    resource: 'analytics',
    action: 'export',
  },
  
  // Dashboard permissions
  {
    id: 'perm-9',
    name: 'view_dashboard',
    resource: 'dashboard',
    action: 'read',
  },
  
  // Content permissions
  {
    id: 'perm-10',
    name: 'edit_content',
    resource: 'content',
    action: 'update',
  },
  {
    id: 'perm-11',
    name: 'publish_content',
    resource: 'content',
    action: 'publish',
  },
  
  // Feature flags permissions
  {
    id: 'perm-12',
    name: 'manage_feature_flags',
    resource: 'feature_flags',
    action: 'manage',
  },
  
  // Billing permissions
  {
    id: 'perm-13',
    name: 'view_billing',
    resource: 'billing',
    action: 'read',
  },
  {
    id: 'perm-14',
    name: 'manage_billing',
    resource: 'billing',
    action: 'manage',
  },
];

// Mock roles for demo
export const mockRoles: Role[] = [
  {
    id: 'role-admin',
    name: 'admin',
    displayName: 'Administrator',
    permissions: [
      mockPermissions.find(p => p.name === 'view_users')!,
      mockPermissions.find(p => p.name === 'create_users')!,
      mockPermissions.find(p => p.name === 'edit_users')!,
      mockPermissions.find(p => p.name === 'delete_users')!,
      mockPermissions.find(p => p.name === 'manage_tenant')!,
      mockPermissions.find(p => p.name === 'view_tenant_settings')!,
      mockPermissions.find(p => p.name === 'view_analytics')!,
      mockPermissions.find(p => p.name === 'export_analytics')!,
      mockPermissions.find(p => p.name === 'view_dashboard')!,
      mockPermissions.find(p => p.name === 'manage_feature_flags')!,
      mockPermissions.find(p => p.name === 'view_billing')!,
      mockPermissions.find(p => p.name === 'manage_billing')!,
    ],
    isSystemRole: true,
  },
  {
    id: 'role-manager',
    name: 'manager',
    displayName: 'Manager',
    permissions: [
      mockPermissions.find(p => p.name === 'view_users')!,
      mockPermissions.find(p => p.name === 'create_users')!,
      mockPermissions.find(p => p.name === 'edit_users')!,
      mockPermissions.find(p => p.name === 'view_tenant_settings')!,
      mockPermissions.find(p => p.name === 'view_analytics')!,
      mockPermissions.find(p => p.name === 'view_dashboard')!,
      mockPermissions.find(p => p.name === 'view_billing')!,
    ],
    isSystemRole: true,
  },
  {
    id: 'role-editor',
    name: 'editor',
    displayName: 'Editor',
    permissions: [
      mockPermissions.find(p => p.name === 'view_users')!,
      mockPermissions.find(p => p.name === 'view_dashboard')!,
      mockPermissions.find(p => p.name === 'edit_content')!,
      mockPermissions.find(p => p.name === 'publish_content')!,
    ],
    isSystemRole: true,
  },
  {
    id: 'role-user',
    name: 'user',
    displayName: 'User',
    permissions: [
      mockPermissions.find(p => p.name === 'view_dashboard')!,
    ],
    isSystemRole: true,
  },
];

// Mock subscription plans for demo
export const mockSubscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'free',
    displayName: 'Free',
    description: 'Perfect for getting started with basic features',
    price: 0,
    currency: 'USD',
    interval: 'monthly',
    features: [
      'Up to 5 users',
      'Basic dashboard',
      'Email support',
      'Core features'
    ],
    limits: {
      users: 5,
      storage: 1000, // MB
      apiCalls: 1000
    },
    isActive: true,
    trialDays: 0
  },
  {
    id: 'starter',
    name: 'starter',
    displayName: 'Starter',
    description: 'Great for small teams and growing businesses',
    price: 29,
    currency: 'USD',
    interval: 'monthly',
    features: [
      'Up to 25 users',
      'Advanced dashboard',
      'Priority email support',
      'All core features',
      'Basic analytics'
    ],
    limits: {
      users: 25,
      storage: 10000, // MB
      apiCalls: 10000
    },
    isActive: true,
    trialDays: 14
  },
  {
    id: 'pro',
    name: 'pro',
    displayName: 'Pro',
    description: 'Perfect for established teams with advanced needs',
    price: 99,
    currency: 'USD',
    interval: 'monthly',
    features: [
      'Up to 100 users',
      'Advanced dashboard',
      'Priority support',
      'All features',
      'Advanced analytics',
      'Custom integrations',
      'Feature flags management'
    ],
    limits: {
      users: 100,
      storage: 50000, // MB
      apiCalls: 50000
    },
    isActive: true,
    trialDays: 14
  },
  {
    id: 'enterprise',
    name: 'enterprise',
    displayName: 'Enterprise',
    description: 'For large organizations with custom requirements',
    price: 299,
    currency: 'USD',
    interval: 'monthly',
    features: [
      'Unlimited users',
      'Custom dashboard',
      'Dedicated support',
      'All features',
      'Advanced analytics',
      'Custom integrations',
      'Feature flags management',
      'SSO integration',
      'Custom branding'
    ],
    limits: {
      users: -1, // Unlimited
      storage: -1, // Unlimited
      apiCalls: -1 // Unlimited
    },
    isActive: true,
    trialDays: 30
  }
];
