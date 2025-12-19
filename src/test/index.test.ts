import { describe, it, expect } from 'vitest';
import { UserType } from '../types/api';
import { HttpService } from '../services/HttpService';
import { ApiMappers } from '../utils/mappers';
import { SessionManager } from '../services/SessionManager';

describe('react-identity-access', () => {
  describe('UserType enum', () => {
    it('should have correct user type values', () => {
      expect(UserType.SUPERUSER).toBe('SUPERUSER');
      expect(UserType.TENANT_ADMIN).toBe('TENANT_ADMIN');
      expect(UserType.USER).toBe('USER');
    });
  });

  describe('HttpService', () => {
    it('should create instance with base URL', () => {
      const httpService = new HttpService('https://api.example.com');
      expect(httpService).toBeInstanceOf(HttpService);
    });
  });

  describe('ApiMappers', () => {
    it('should exist and be accessible', () => {
      expect(ApiMappers).toBeDefined();
      expect(typeof ApiMappers).toBe('function');
    });
  });

  describe('SessionManager.getTokens', () => {
    const storageKey = 'test_auth_tokens';

    beforeEach(() => {
      window.localStorage.clear();
    });

    it('should return null when storage is empty', () => {
      const sessionManager = new SessionManager({ storageKey });
      expect(sessionManager.getTokens()).toBeNull();
    });

    it('should return null when tokenStorage contains user but no accessToken', () => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          user: { id: 'user-1', email: 'a@b.com' },
          refreshToken: 'refresh-only',
          expiresAt: Date.now() + 1000,
        })
      );

      const sessionManager = new SessionManager({ storageKey });
      expect(sessionManager.getTokens()).toBeNull();
    });

    it('should return tokens when accessToken exists', () => {
      const tokenData = {
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresAt: 123,
        expiresIn: 456,
        tokenType: 'Bearer',
        user: { id: 'user-1' },
      };

      window.localStorage.setItem(storageKey, JSON.stringify(tokenData));

      const sessionManager = new SessionManager({ storageKey });
      expect(sessionManager.getTokens()).toEqual({
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresAt: 123,
        expiresIn: 456,
        tokenType: 'Bearer',
      });
    });
  });

  describe('Library exports', () => {
    it('should export main components and providers', async () => {
      const exports = await import('../index');

      // Check that main exports exist
      expect(exports.HttpService).toBeDefined();
      expect(exports.UserType).toBeDefined();
      expect(exports.ApiMappers).toBeDefined();
      expect(exports.AppProvider).toBeDefined();
      expect(exports.AuthProvider).toBeDefined();
      expect(exports.FeatureFlagProvider).toBeDefined();
    });

    it('should export auth parameter types (RFC-002)', async () => {
      // TypeScript compilation validates that these types exist
      // This test ensures the types file can be imported without errors
      const authParamsModule = await import('../types/authParams');
      expect(authParamsModule).toBeDefined();

      // The types themselves don't have runtime values, but the module should be accessible
      // If types are missing, TypeScript compilation would fail
    });
  });
});
