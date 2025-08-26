import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageConnector } from '../connectors/localStorage/LocalStorageConnector';
import { testSeedData } from './helpers/testSeedData';

describe('Basic Library Functionality', () => {
  let connector: LocalStorageConnector;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    connector = new LocalStorageConnector({
      simulateDelay: false,
      errorRate: 0,
      seedData: testSeedData,
    });
  });

  describe('LocalStorageConnector', () => {
    it('should initialize with mock data', async () => {
      const tenants = await connector.getTenants();
      expect(tenants).toBeDefined();
      expect(tenants.length).toBeGreaterThan(0);
      expect(tenants[0]).toHaveProperty('id');
      expect(tenants[0]).toHaveProperty('name');
    });

    it('should authenticate users with correct credentials', async () => {
      const result = await connector.login({
        email: 'admin@acme.com',
        password: 'password',
        tenantId: 'acme-corp',
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('admin@acme.com');
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      await expect(
        connector.login({
          email: 'admin@acme.com',
          password: 'wrongpassword',
          tenantId: 'acme-corp',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should load user roles and permissions', async () => {
      // First login
      await connector.login({
        email: 'admin@acme.com',
        password: 'password',
        tenantId: 'acme-corp',
      });

      const roles = await connector.getUserRoles('admin-1');
      expect(roles).toBeDefined();
      expect(roles.length).toBeGreaterThan(0);
      expect(roles[0]).toHaveProperty('name');
      expect(roles[0]).toHaveProperty('permissions');
    });

    it('should load feature flags for tenant', async () => {
      const flags = await connector.getFeatureFlags('acme-corp');
      expect(flags).toBeDefined();
      expect(Object.keys(flags)).toContain('new-dashboard');
      expect(flags['new-dashboard']).toHaveProperty('serverEnabled');
      expect(flags['new-dashboard']).toHaveProperty('rolloutPercentage');
    });

    it('should validate sessions', async () => {
      // Login to get a session
      const loginResult = await connector.login({
        email: 'admin@acme.com',
        password: 'password',
        tenantId: 'acme-corp',
      });

      expect(loginResult.tokens).toBeDefined();
      const sessionToken = loginResult.tokens.accessToken;

      // Validate the session
      const isValid = await connector.validateSession(sessionToken);
      expect(isValid).toBe(true);

      // Test invalid session
      const isInvalid = await connector.validateSession('invalid-token');
      expect(isInvalid).toBe(false);
    });
  });

  describe('Library Integration', () => {
    it('should provide complete authentication flow', async () => {
      // 1. Get available tenants
      const tenants = await connector.getTenants();
      expect(tenants.length).toBeGreaterThan(0);

      // 2. Login with tenant
      const loginResult = await connector.login({
        email: 'admin@acme.com',
        password: 'password',
        tenantId: 'acme-corp',
      });
      expect(loginResult.user).toBeDefined();

      // 3. Get current user
      const user = await connector.getCurrentUser();
      expect(user).toBeDefined();
      expect(loginResult.user).toBeDefined();

      // 4. Get user roles
      const roles = await connector.getUserRoles(user!.id);
      expect(roles.length).toBeGreaterThan(0);

      // 5. Get feature flags
      const flags = await connector.getFeatureFlags(user!.tenantId);
      expect(Object.keys(flags).length).toBeGreaterThan(0);

      // 6. Logout
      await connector.logout();
      await expect(connector.getCurrentUser()).rejects.toThrow('No active session');
    });

    it('should handle multi-tenant scenarios', async () => {
      const tenants = await connector.getTenants();
      expect(tenants.length).toBeGreaterThanOrEqual(2);

      // Test different tenants have different settings
      const acmeFlags = await connector.getFeatureFlags('acme-corp');
      const techFlags = await connector.getFeatureFlags('tech-startup');

      expect(acmeFlags).toBeDefined();
      expect(techFlags).toBeDefined();

      // Both should have feature flags but potentially different configurations
      expect(Object.keys(acmeFlags).length).toBeGreaterThan(0);
      expect(Object.keys(techFlags).length).toBeGreaterThan(0);
    });
  });
});
