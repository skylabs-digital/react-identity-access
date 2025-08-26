import { render, screen, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { IdentityProvider } from '../../providers/IdentityProvider';
import { LocalStorageConnector } from '../../connectors/localStorage/LocalStorageConnector';
import { testSeedData } from './testSeedData';

export const createTestWrapper = (connector: LocalStorageConnector) => {
  return ({ children }: { children: ReactNode }) => (
    <IdentityProvider
      connector={connector}
      tenantResolver={{
        strategy: 'query-param',
        queryParam: { paramName: 'tenant', storageKey: 'test-tenant' },
      }}
    >
      {children}
    </IdentityProvider>
  );
};

export const createTestConnector = () => {
  const connector = new LocalStorageConnector({
    simulateDelay: false,
    errorRate: 0,
    seedData: testSeedData,
  });

  // Force reinitialize to ensure fresh test data
  connector.forceReinitialize();

  return connector;
};

export const renderWithIdentityProvider = async (
  ui: ReactNode,
  options: {
    connector?: LocalStorageConnector;
    waitForInitialization?: boolean;
  } = {}
) => {
  const connector = options.connector || createTestConnector();
  const Wrapper = createTestWrapper(connector);

  const result = render(<Wrapper>{ui}</Wrapper>);

  if (options.waitForInitialization !== false) {
    // Wait for the loading state to finish
    await waitFor(
      () => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  }

  return { ...result, connector };
};

export const setupAuthenticatedUser = async (_connector?: LocalStorageConnector) => {
  // Simulate login by setting up localStorage with authenticated user data
  const mockUser = {
    id: 'admin-1',
    email: 'admin@acme.com',
    name: 'John Admin',
    tenantId: 'acme-corp',
    roles: ['admin'],
    permissions: ['read:users', 'write:users', 'manage:users', 'read:analytics', 'view:analytics'],
    isActive: true,
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date(),
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
  };

  // Set up localStorage to simulate authenticated state
  localStorage.setItem('identity_currentUser', JSON.stringify(mockUser));
  localStorage.setItem('identity_tokens', JSON.stringify(mockTokens));
  localStorage.setItem(
    'identity_session',
    JSON.stringify({
      isValid: true,
      expiresAt: mockTokens.expiresAt,
      lastActivity: new Date(),
    })
  );

  return mockUser;
};

export const setupUnauthenticatedUser = () => {
  // Clear any existing auth data
  localStorage.removeItem('identity_currentUser');
  localStorage.removeItem('identity_tokens');
  localStorage.removeItem('identity_session');
};
