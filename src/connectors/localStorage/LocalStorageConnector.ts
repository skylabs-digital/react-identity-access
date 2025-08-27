import { BaseConnector, ConnectorConfig, SeedData } from '../base/BaseConnector';

export interface LocalStorageConnectorConfig extends ConnectorConfig {
  storagePrefix?: string;
  simulateDelay?: boolean;
  minDelay?: number;
  maxDelay?: number;
  errorRate?: number;
}

export class LocalStorageConnector extends BaseConnector {
  private storagePrefix: string;
  private storage: Storage;

  constructor(config: LocalStorageConnectorConfig) {
    super(config);
    this.storagePrefix = config.storagePrefix || `${config.appId}_`;
    this.storage = typeof window !== 'undefined' ? window.localStorage : ({} as Storage);
  }

  protected async getItem<T>(path: string): Promise<T | null> {
    const stored = this.getStorageItem(path);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }

    // Fallback to seed data
    const seedKey = this.mapPathToSeedKey(path);
    if (seedKey && this.seedData?.[seedKey]) {
      const seedArray = this.seedData[seedKey] as any[];
      return seedArray.length > 0 ? seedArray[0] : null;
    }

    return null;
  }

  protected async getList<T>(path: string): Promise<T[]> {
    const stored = this.getStorageItem(path);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        // Fall through to seed data
      }
    }

    // Fallback to seed data
    const seedKey = this.mapPathToSeedKey(path);
    if (seedKey && this.seedData?.[seedKey]) {
      return this.seedData[seedKey] as T[];
    }

    return [];
  }

  protected async setItem<T>(path: string, value: T): Promise<void> {
    this.setStorageItem(path, JSON.stringify(value));
  }

  protected async createItem<T>(path: string, data: any): Promise<T> {
    // Handle authentication routes specially
    if (path === 'auth/login') {
      return this.handleLogin(data) as T;
    }

    if (path === 'auth/signup') {
      return this.handleSignup(data) as T;
    }

    if (path === 'auth/logout') {
      return this.handleLogout() as T;
    }

    // Default behavior for other paths
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const item = { ...data, id } as T;

    // Get existing list and add new item
    const existingList = await this.getList<T>(path);
    const updatedList = [...existingList, item];
    await this.setItem(path, updatedList);

    return item;
  }

  private async handleLogin(credentials: { email: string; password: string }): Promise<any> {
    const users = await this.getList<any>('users');
    const passwords = this.seedData?.passwords || {};

    // Find user by email
    const user = users.find(u => u.email === credentials.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const expectedPassword = passwords[user.id];
    if (!expectedPassword || expectedPassword !== credentials.password) {
      throw new Error('Invalid credentials');
    }

    // Return user data and tokens - session management is handled by IdentityProvider
    return {
      user,
      tokens: {
        accessToken: `mock_token_${user.id}`,
        refreshToken: `mock_refresh_${user.id}`,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        tokenType: 'Bearer' as const,
      },
    };
  }

  private async handleSignup(data: {
    email: string;
    password: string;
    name: string;
  }): Promise<any> {
    const users = await this.getList<any>('users');

    // Check if user already exists
    const existingUser = users.find(u => u.email === data.email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Create new user
    const newUser = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: data.email,
      name: data.name,
      isActive: true,
      roles: ['user'],
      permissions: [],
      tenantId: 'acme-corp', // Default tenant for demo
      createdAt: new Date().toISOString(),
    };

    // Add to users list
    const updatedUsers = [...users, newUser];
    await this.setItem('users', updatedUsers);

    // Store password
    const passwords = this.getStorageItem('passwords');
    const passwordsObj = passwords ? JSON.parse(passwords) : {};
    passwordsObj[newUser.id] = data.password;
    this.setStorageItem('passwords', JSON.stringify(passwordsObj));

    return {
      user: newUser,
      tokens: {
        accessToken: `mock_token_${newUser.id}`,
        refreshToken: `mock_refresh_${newUser.id}`,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        tokenType: 'Bearer' as const,
      },
    };
  }

  private async handleLogout(): Promise<any> {
    // Logout doesn't need to do anything in LocalStorage connector
    // Session management is handled by IdentityProvider
    return { success: true };
  }

  protected async updateItem<T>(path: string, id: string, updates: Partial<T>): Promise<T> {
    const existingList = await this.getList<T & { id: string }>(path);
    const itemIndex = existingList.findIndex(item => item.id === id);

    if (itemIndex === -1) {
      throw new Error(`Item with id ${id} not found in ${path}`);
    }

    const updatedItem = { ...existingList[itemIndex], ...updates };
    existingList[itemIndex] = updatedItem;
    await this.setItem(path, existingList);

    return updatedItem;
  }

  protected async deleteItem(path: string, id: string): Promise<void> {
    const existingList = await this.getList<{ id: string }>(path);
    const filteredList = existingList.filter(item => item.id !== id);
    await this.setItem(path, filteredList);
  }

  private mapPathToSeedKey(path: string): keyof SeedData | null {
    const pathMappings: Record<string, keyof SeedData> = {
      users: 'users',
      roles: 'roles',
      permissions: 'permissions',
      tenants: 'tenants',
      'feature-flags': 'featureFlags',
      featureFlags: 'featureFlags',
      'auth/login': 'users',
      'auth/me': 'users',
      'auth/logout': 'users',
      'auth/signup': 'users',
      currentUser: 'users',
    };

    return pathMappings[path] || null;
  }

  private getStorageItem(key: string): string | null {
    return this.storage.getItem(`${this.storagePrefix}${key}`);
  }

  private setStorageItem(key: string, value: string): void {
    this.storage.setItem(`${this.storagePrefix}${key}`, value);
  }

  protected mapError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error(String(error));
  }
}
