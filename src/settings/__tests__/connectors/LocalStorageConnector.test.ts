import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalStorageConnector } from '../../connectors/LocalStorageConnector';
import { z } from '../../zod';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('LocalStorageConnector', () => {
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

  let connector: LocalStorageConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new LocalStorageConnector();
  });

  describe('getPublicSettings', () => {
    it('should return public settings from localStorage', async () => {
      const publicSettings = { publicField: 'public value', theme: 'light' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(publicSettings));

      const result = await connector.getPublicSettings('app1', 'tenant1');

      expect(localStorageMock.getItem).toHaveBeenCalledWith('settings:app1:tenant1:public');
      expect(result).toEqual(publicSettings);
    });

    it('should return empty object if no public settings exist', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = await connector.getPublicSettings('app1', 'tenant1');

      expect(result).toEqual({});
    });

    it('should handle JSON parse errors', async () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const result = await connector.getPublicSettings('app1', 'tenant1');

      expect(result).toEqual({});
    });
  });

  describe('getPrivateSettings', () => {
    it('should return private settings from localStorage', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(testSettings));

      const result = await connector.getPrivateSettings('app1', 'tenant1');

      expect(localStorageMock.getItem).toHaveBeenCalledWith('settings:app1:tenant1:private');
      expect(result).toEqual(testSettings);
    });

    it('should return empty object if no private settings exist', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = await connector.getPrivateSettings('app1', 'tenant1');

      expect(result).toEqual({});
    });

    it('should handle JSON parse errors', async () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const result = await connector.getPrivateSettings('app1', 'tenant1');

      expect(result).toEqual({});
    });
  });

  describe('updateSettings', () => {
    it('should update both public and private settings', async () => {
      await connector.updateSettings('app1', 'tenant1', testSettings);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'settings:app1:tenant1:private',
        JSON.stringify(testSettings)
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'settings:app1:tenant1:public',
        JSON.stringify({ publicField: 'public value', theme: 'light' })
      );
    });

    it('should handle settings with no public fields', async () => {
      const privateSettings = { privateField: 'private value' };

      await connector.updateSettings('app1', 'tenant1', privateSettings);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'settings:app1:tenant1:private',
        JSON.stringify(privateSettings)
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'settings:app1:tenant1:public',
        JSON.stringify({})
      );
    });
  });

  describe('getSchema', () => {
    it('should return schema from localStorage', async () => {
      const schemaData = { version: '1.0.0', schema: 'schema data' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(schemaData));

      const result = await connector.getSchema('app1', 'tenant1');

      expect(localStorageMock.getItem).toHaveBeenCalledWith('settings:app1:tenant1:schema');
      expect(result).toEqual(schemaData);
    });

    it('should return null if no schema exists', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = await connector.getSchema('app1', 'tenant1');

      expect(result).toBeNull();
    });
  });

  describe('updateSchema', () => {
    it('should update schema in localStorage', async () => {
      const schemaData = { version: '1.0.0', schema: testSchema };

      await connector.updateSchema('app1', 'tenant1', schemaData, 'v1.0.0');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'settings:app1:tenant1:schema',
        JSON.stringify(schemaData)
      );
    });
  });

  describe('key generation', () => {
    it('should generate correct keys for different operations', async () => {
      await connector.getPublicSettings('myApp', 'myTenant');
      await connector.getPrivateSettings('myApp', 'myTenant');
      await connector.getSchema('myApp', 'myTenant');

      expect(localStorageMock.getItem).toHaveBeenCalledWith('settings:myApp:myTenant:public');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('settings:myApp:myTenant:private');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('settings:myApp:myTenant:schema');
    });
  });
});
