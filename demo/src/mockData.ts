import { User, Tenant, FeatureFlag } from '../../src/types';

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

// Mock feature flags for demo
export const mockFeatureFlags: Record<string, FeatureFlag> = {
  advanced_public_features: {
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
  beta_public_content: {
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
  admin_feature_flags: {
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
  advanced_analytics: {
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
  user_management: {
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
};
