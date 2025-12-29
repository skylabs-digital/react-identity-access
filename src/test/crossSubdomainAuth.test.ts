import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  encodeAuthTokens,
  decodeAuthTokens,
  AUTH_TRANSFER_PARAM,
  type AuthTokens,
} from '../utils/crossDomainAuth';
import { buildTenantHostname } from '../utils/tenantDetection';

describe('Cross-Subdomain Auth Flow', () => {
  const sampleTokens: AuthTokens = {
    accessToken: 'eyJhbGciOiJIUzI1NiJ9.access-token-payload',
    refreshToken: 'eyJhbGciOiJIUzI1NiJ9.refresh-token-payload',
    expiresIn: 3600,
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Token URL Transfer', () => {
    it('should encode tokens and build valid URL for subdomain switch', () => {
      const baseDomain = 'kommi.click';
      const targetTenant = 'test-admin';
      const currentHostname = 'kommi.click';

      // Build target hostname
      const newHostname = buildTenantHostname(targetTenant, currentHostname, baseDomain);
      expect(newHostname).toBe('test-admin.kommi.click');

      // Encode tokens for URL
      const encodedTokens = encodeAuthTokens(sampleTokens);

      // Build final URL (simulating what switchTenant does)
      const targetPath = '/onboarding';
      const url = new URL(`https://${newHostname}${targetPath}`);
      url.searchParams.set(AUTH_TRANSFER_PARAM, encodedTokens);

      // Verify URL structure
      expect(url.hostname).toBe('test-admin.kommi.click');
      expect(url.pathname).toBe('/onboarding');
      expect(url.searchParams.has(AUTH_TRANSFER_PARAM)).toBe(true);

      // Verify tokens can be extracted and decoded
      const extractedEncoded = url.searchParams.get(AUTH_TRANSFER_PARAM);
      const decodedTokens = decodeAuthTokens(extractedEncoded!);
      expect(decodedTokens).toEqual(sampleTokens);
    });

    it('should work for tenant-to-tenant switch', () => {
      const baseDomain = 'kommi.click';
      const targetTenant = 'new-tenant';
      const currentHostname = 'old-tenant.kommi.click';

      const newHostname = buildTenantHostname(targetTenant, currentHostname, baseDomain);
      expect(newHostname).toBe('new-tenant.kommi.click');

      const encodedTokens = encodeAuthTokens(sampleTokens);
      const url = new URL(`https://${newHostname}/dashboard`);
      url.searchParams.set(AUTH_TRANSFER_PARAM, encodedTokens);

      const decodedTokens = decodeAuthTokens(url.searchParams.get(AUTH_TRANSFER_PARAM)!);
      expect(decodedTokens).toEqual(sampleTokens);
    });

    it('should preserve existing URL params when adding tokens', () => {
      const newHostname = 'test-admin.kommi.click';
      const url = new URL(`https://${newHostname}/callback`);

      // Existing params
      url.searchParams.set('returnTo', '/dashboard');
      url.searchParams.set('lang', 'es');

      // Add tokens
      url.searchParams.set(AUTH_TRANSFER_PARAM, encodeAuthTokens(sampleTokens));

      // Verify all params preserved
      expect(url.searchParams.get('returnTo')).toBe('/dashboard');
      expect(url.searchParams.get('lang')).toBe('es');
      expect(url.searchParams.has(AUTH_TRANSFER_PARAM)).toBe(true);
    });
  });

  describe('Token Security', () => {
    it('should produce different encoded strings for different tokens', () => {
      const tokens1: AuthTokens = { ...sampleTokens };
      const tokens2: AuthTokens = {
        ...sampleTokens,
        accessToken: 'different-access-token',
      };

      const encoded1 = encodeAuthTokens(tokens1);
      const encoded2 = encodeAuthTokens(tokens2);

      expect(encoded1).not.toBe(encoded2);
    });

    it('should reject tampered token strings', () => {
      const encoded = encodeAuthTokens(sampleTokens);

      // Tamper with the encoded string
      const tampered = encoded.slice(0, -5) + 'xxxxx';

      // Should fail to decode or produce invalid result
      const decoded = decodeAuthTokens(tampered);
      expect(decoded === null || decoded.accessToken !== sampleTokens.accessToken).toBe(true);
    });

    it('should not expose tokens in URL fragment', () => {
      const newHostname = 'test-admin.kommi.click';
      const url = new URL(`https://${newHostname}/dashboard#section`);
      url.searchParams.set(AUTH_TRANSFER_PARAM, encodeAuthTokens(sampleTokens));

      // Tokens should be in search params, not hash
      expect(url.hash).toBe('#section');
      expect(url.search).toContain(AUTH_TRANSFER_PARAM);
    });
  });

  describe('switchTenant URL Building', () => {
    it('should build correct URL for root-to-subdomain switch', () => {
      // Simulate the URL building logic from TenantProvider.switchTenant
      const config = {
        baseDomain: 'kommi.click',
        tenantMode: 'subdomain' as const,
      };
      const targetTenantSlug = 'test-admin';
      const currentHostname = 'kommi.click';
      const currentPath = '/signup';
      const redirectPath = '/onboarding';

      const newHostname = buildTenantHostname(targetTenantSlug, currentHostname, config.baseDomain);

      const targetPath = redirectPath || currentPath;
      const url = new URL(`https://${newHostname}${targetPath}`);
      url.searchParams.set(AUTH_TRANSFER_PARAM, encodeAuthTokens(sampleTokens));

      expect(url.toString()).toBe(
        `https://test-admin.kommi.click/onboarding?${AUTH_TRANSFER_PARAM}=${encodeAuthTokens(sampleTokens)}`
      );
    });

    it('should use current path when redirectPath not provided', () => {
      const targetTenantSlug = 'acme';
      const currentHostname = 'kommi.click';
      const baseDomain = 'kommi.click';
      const currentPath = '/dashboard';

      const newHostname = buildTenantHostname(targetTenantSlug, currentHostname, baseDomain);
      const targetPath = currentPath; // No redirectPath provided

      const url = new URL(`https://${newHostname}${targetPath}`);
      url.searchParams.set(AUTH_TRANSFER_PARAM, encodeAuthTokens(sampleTokens));

      expect(url.pathname).toBe('/dashboard');
      expect(url.hostname).toBe('acme.kommi.click');
    });
  });

  describe('Login Response Token Extraction', () => {
    it('should extract tokens from login response for switchTenant', () => {
      // Simulate login response structure
      const loginResponse = {
        accessToken: 'new-access-token-from-login',
        refreshToken: 'new-refresh-token-from-login',
        expiresIn: 7200,
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
      };

      // Extract tokens for switchTenant (as done in AuthProvider.login)
      const tokens: AuthTokens = {
        accessToken: loginResponse.accessToken,
        refreshToken: loginResponse.refreshToken,
        expiresIn: loginResponse.expiresIn,
      };

      const encoded = encodeAuthTokens(tokens);
      const decoded = decodeAuthTokens(encoded);

      expect(decoded).toEqual(tokens);
      expect(decoded?.accessToken).toBe('new-access-token-from-login');
    });

    it('should extract tokens from verifyMagicLink response', () => {
      // Simulate magic link verify response
      const verifyResponse = {
        accessToken: 'magic-link-access-token',
        refreshToken: 'magic-link-refresh-token',
        expiresIn: 3600,
        user: {
          id: 'user-456',
          name: 'Jane Doe',
          email: 'jane@example.com',
        },
      };

      const tokens: AuthTokens = {
        accessToken: verifyResponse.accessToken,
        refreshToken: verifyResponse.refreshToken,
        expiresIn: verifyResponse.expiresIn,
      };

      const encoded = encodeAuthTokens(tokens);
      const decoded = decodeAuthTokens(encoded);

      expect(decoded).toEqual(tokens);
    });
  });

  describe('Full Flow Simulation', () => {
    it('should complete full root-to-subdomain auth flow', () => {
      // 1. User is on root domain (kommi.click)
      const rootHostname = 'kommi.click';
      const baseDomain = 'kommi.click';

      // 2. User signs up/logs in and gets tokens
      const authResponse = {
        accessToken: 'jwt-access-token-xyz',
        refreshToken: 'jwt-refresh-token-abc',
        expiresIn: 3600,
      };

      // 3. Tenant admin is created and needs to switch to tenant subdomain
      const targetTenantSlug = 'new-company';

      // 4. Build redirect URL with tokens (TenantProvider.switchTenant logic)
      const newHostname = buildTenantHostname(targetTenantSlug, rootHostname, baseDomain);
      expect(newHostname).toBe('new-company.kommi.click');

      const redirectUrl = new URL(`https://${newHostname}/onboarding`);
      redirectUrl.searchParams.set(AUTH_TRANSFER_PARAM, encodeAuthTokens(authResponse));

      // 5. On new subdomain, extract tokens from URL (AuthProvider logic)
      const urlTokens = redirectUrl.searchParams.get(AUTH_TRANSFER_PARAM);
      const extractedTokens = decodeAuthTokens(urlTokens!);

      // 6. Verify tokens match original
      expect(extractedTokens).toEqual(authResponse);

      // 7. Tokens would be stored in new subdomain's localStorage
      // (simulated - actual storage happens in AuthProvider)
      localStorage.setItem('auth_tokens', JSON.stringify(extractedTokens));

      const storedTokens = JSON.parse(localStorage.getItem('auth_tokens')!);
      expect(storedTokens.accessToken).toBe(authResponse.accessToken);
    });

    it('should handle selector mode without token URL transfer', () => {
      // In selector mode, localStorage is shared, so tokens don't need URL transfer
      const config = {
        tenantMode: 'selector' as const,
        selectorParam: 'tenant',
      };

      // Tokens are already in localStorage from login
      localStorage.setItem('auth_tokens', JSON.stringify(sampleTokens));

      // Switch tenant just changes URL param
      const urlParams = new URLSearchParams();
      urlParams.set(config.selectorParam, 'new-tenant');

      // Tokens should still be accessible
      const storedTokens = JSON.parse(localStorage.getItem('auth_tokens')!);
      expect(storedTokens).toEqual(sampleTokens);

      // No need for _auth param in selector mode
      expect(urlParams.has(AUTH_TRANSFER_PARAM)).toBe(false);
    });
  });
});
