import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FetchConnector } from '../../connectors/FetchConnector';
import { z } from '../../zod';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('FetchConnector', () => {
  const testSchema = z.object({
    publicField: z.string().public(),
    privateField: z.string(),
    theme: z.enum(['light', 'dark']).public(),
  });

  const testSettings = {
    publicField: 'public value',
    privateField: 'private value',
    theme: 'light' as const,
  };

  let connector: FetchConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new FetchConnector({
      baseUrl: 'http://localhost:3001/api/v1',
      apiKey: 'test-api-key',
    });
  });

  describe('getPublicSettings', () => {
    it('should fetch public settings successfully', async () => {
      const publicSettings = { publicField: 'public value', theme: 'light' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: publicSettings }),
      });

      const result = await connector.getPublicSettings('app1', 'tenant1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/settings/app1/tenant1/public',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'test-api-key',
          },
        }
      );
      expect(result).toEqual(publicSettings);
    });

    it('should return empty object when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await connector.getPublicSettings('app1', 'tenant1');

      expect(result).toEqual({});
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await connector.getPublicSettings('app1', 'tenant1');

      expect(result).toEqual({});
    });
  });

  describe('getPrivateSettings', () => {
    it('should fetch private settings successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: testSettings }),
      });

      const result = await connector.getPrivateSettings('app1', 'tenant1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/settings/app1/tenant1/private',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'test-api-key',
          },
        }
      );
      expect(result).toEqual(testSettings);
    });

    it('should return empty object when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await connector.getPrivateSettings('app1', 'tenant1');

      expect(result).toEqual({});
    });
  });

  describe('updateSettings', () => {
    it('should update settings successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: testSettings }),
      });

      await connector.updateSettings('app1', 'tenant1', testSettings);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/v1/settings/app1/tenant1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key',
        },
        body: JSON.stringify(testSettings),
      });
    });

    it('should throw error when update fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ success: false, error: 'Validation failed' }),
      });

      await expect(connector.updateSettings('app1', 'tenant1', testSettings)).rejects.toThrow(
        'Failed to update settings'
      );
    });
  });

  describe('custom fetch function', () => {
    it('should use custom fetch function when provided', async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      });

      const customConnector = new FetchConnector({
        baseUrl: 'http://localhost:3001/api/v1',
        apiKey: 'test-api-key',
        fetchFn: customFetch,
      });

      await customConnector.getPublicSettings('app1', 'tenant1');

      expect(customFetch).toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should inject authorization header with custom fetch', async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      });

      const customConnector = new FetchConnector({
        baseUrl: 'http://localhost:3001/api/v1',
        apiKey: 'test-api-key',
        fetchFn: customFetch,
      });

      await customConnector.getPrivateSettings('app1', 'tenant1');

      expect(customFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/settings/app1/tenant1/private',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-api-key',
          }),
        })
      );
    });
  });

  describe('schema operations', () => {
    it('should get schema successfully', async () => {
      const schemaData = { version: '1.0.0', schema: 'schema data' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: schemaData }),
      });

      const result = await connector.getSchema('app1', 'tenant1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/settings/app1/tenant1/schema',
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result).toEqual(schemaData);
    });

    it('should update schema successfully', async () => {
      const schemaData = { version: '1.0.0', schema: testSchema };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await connector.updateSchema('app1', 'tenant1', testSchema, '1.0.0');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/settings/app1/tenant1/schema',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'test-api-key',
          },
          body: JSON.stringify(schemaData),
        }
      );
    });
  });
});
