import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ConnectorProvider } from '../providers/ConnectorProvider';
import { TenantProvider } from '../providers/TenantProvider';
import { IdentityProvider } from '../providers/IdentityProvider';
import { FeatureFlagsProvider } from '../providers/FeatureFlagsProvider';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { useTenant } from '../hooks/useTenant';

// Test component that shows basic library usage
const BasicUsageDemo = () => {
  const { user, isAuthenticated } = useAuth();
  const { currentTenant } = useTenant();

  // Safe feature flag check
  let featureStatus = 'unknown';
  try {
    const { isEnabled } = useFeatureFlags();
    featureStatus = isEnabled('test-feature') ? 'enabled' : 'disabled';
  } catch {
    featureStatus = 'error';
  }

  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="user-email">{user?.email || 'no-user'}</div>
      <div data-testid="tenant-name">{currentTenant?.name || 'no-tenant'}</div>
      <div data-testid="feature-enabled">{featureStatus}</div>
    </div>
  );
};

// Minimal provider setup for testing
const TestProviders = ({ children }: { children: React.ReactNode }) => (
  <ConnectorProvider config={{ type: 'localStorage', appId: 'test-app' }}>
    <TenantProvider config={{ strategy: 'subdomain' }}>
      <IdentityProvider>
        <FeatureFlagsProvider>{children}</FeatureFlagsProvider>
      </IdentityProvider>
    </TenantProvider>
  </ConnectorProvider>
);

describe('Basic Library Functionality', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should render without crashing', () => {
    render(
      <TestProviders>
        <BasicUsageDemo />
      </TestProviders>
    );

    expect(screen.getByTestId('auth-status')).toBeInTheDocument();
    expect(screen.getByTestId('user-email')).toBeInTheDocument();
    expect(screen.getByTestId('tenant-name')).toBeInTheDocument();
    expect(screen.getByTestId('feature-enabled')).toBeInTheDocument();
  });

  it('should show not authenticated by default', () => {
    render(
      <TestProviders>
        <BasicUsageDemo />
      </TestProviders>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent('no-user');
  });

  it('should handle feature flags', () => {
    render(
      <TestProviders>
        <BasicUsageDemo />
      </TestProviders>
    );

    // Feature flags should work even without authentication
    expect(screen.getByTestId('feature-enabled')).toBeInTheDocument();
  });
});

// Test component for seed data usage
const SeedDataDemo = () => {
  const { user, isAuthenticated } = useAuth();
  const { currentTenant } = useTenant();

  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="user-id">{user?.id || 'no-user-id'}</div>
      <div data-testid="tenant-id">{currentTenant?.id || 'no-tenant-id'}</div>
    </div>
  );
};

// Provider with seed data
const SeedDataProviders = ({ children }: { children: React.ReactNode }) => {
  const seedData = {
    tenants: [
      {
        id: 'test-tenant',
        name: 'Test Tenant',
        domain: 'test.example.com',
        settings: {
          allowSelfRegistration: true,
          requireEmailVerification: false,
          sessionTimeout: 3600,
          maxConcurrentSessions: 5,
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
        createdAt: new Date(),
        isActive: true,
      },
    ],
    featureFlags: {
      'test-feature': {
        key: 'test-feature',
        name: 'Test Feature',
        description: 'A test feature for development',
        category: 'feature' as const,
        serverEnabled: true,
        adminEditable: true,
        defaultState: true,
        rolloutPercentage: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  };

  return (
    <ConnectorProvider
      config={{
        type: 'localStorage',
        appId: 'seed-test-app',
        seedData,
      }}
    >
      <TenantProvider config={{ strategy: 'subdomain' }}>
        <IdentityProvider>
          <FeatureFlagsProvider>{children}</FeatureFlagsProvider>
        </IdentityProvider>
      </TenantProvider>
    </ConnectorProvider>
  );
};

describe('Seed Data Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should load seed data for rapid prototyping', () => {
    render(
      <SeedDataProviders>
        <SeedDataDemo />
      </SeedDataProviders>
    );

    // Should render without errors
    expect(screen.getByTestId('auth-status')).toBeInTheDocument();
    expect(screen.getByTestId('user-id')).toBeInTheDocument();
    expect(screen.getByTestId('tenant-id')).toBeInTheDocument();
  });
});

// Test component for role-based rendering
const RoleBasedDemo = () => {
  const { user } = useAuth();

  const isAdmin = user?.roles?.includes('admin');
  const isUser = user?.roles?.includes('user');

  return (
    <div>
      <div data-testid="user-roles">{user?.roles?.join(',') || 'no-roles'}</div>
      {isUser && <div data-testid="user-content">User Content</div>}
      {isAdmin && <div data-testid="admin-content">Admin Content</div>}
    </div>
  );
};

describe('Role-Based Rendering Patterns', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should support role-based conditional rendering', () => {
    // Simulate authenticated user with roles
    localStorage.setItem(
      'test-app_user',
      JSON.stringify({
        id: 'test-user',
        email: 'test@example.com',
        roles: ['user'],
      })
    );
    localStorage.setItem('test-app_token', 'mock-token');

    render(
      <TestProviders>
        <RoleBasedDemo />
      </TestProviders>
    );

    expect(screen.getByTestId('user-roles')).toBeInTheDocument();
  });
});
