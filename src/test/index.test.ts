import { describe, it, expect } from 'vitest';
import { UserType } from '../types/api';
import { HttpService } from '../services/HttpService';
import { ApiMappers } from '../utils/mappers';

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
  });
});
