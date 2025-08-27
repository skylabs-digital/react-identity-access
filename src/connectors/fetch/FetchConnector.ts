import { BaseConnector, ConnectorConfig, SeedData } from '../base/BaseConnector';

export interface FetchConnectorConfig extends ConnectorConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
}

export class FetchConnector extends BaseConnector {
  private baseUrl: string;
  private apiKey?: string;
  private timeout: number;

  constructor(config: FetchConnectorConfig) {
    super(config);
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 10000;
  }

  // CRUD Implementation
  protected async getItem<T>(path: string): Promise<T | null> {
    try {
      const response = await this.fetchWithAuth(`/${path}`, { method: 'GET' });
      if (response.status === 404 || response.status === 204) {
        // Return seed data if available
        const seedKey = this.mapPathToSeedKey(path);
        if (seedKey && this.seedData?.[seedKey]) {
          const seedArray = this.seedData[seedKey] as any[];
          return seedArray.length > 0 ? seedArray[0] : null;
        }
        return null;
      }
      if (!response.ok) throw new Error(`Failed to get ${path}`);
      return await response.json();
    } catch (error) {
      console.warn(`Failed to get ${path}, falling back to seed data:`, error);
      const seedKey = this.mapPathToSeedKey(path);
      if (seedKey && this.seedData?.[seedKey]) {
        const seedArray = this.seedData[seedKey] as any[];
        return seedArray.length > 0 ? seedArray[0] : null;
      }
      return null;
    }
  }

  protected async getList<T>(path: string): Promise<T[]> {
    try {
      const response = await this.fetchWithAuth(`/${path}`, { method: 'GET' });
      if (response.status === 404 || response.status === 204) {
        // Return seed data if available
        const seedKey = this.mapPathToSeedKey(path);
        if (seedKey && this.seedData?.[seedKey]) {
          return this.seedData[seedKey] as T[];
        }
        return [];
      }
      if (!response.ok) throw new Error(`Failed to get ${path} list`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn(`Failed to get ${path} list, falling back to seed data:`, error);
      const seedKey = this.mapPathToSeedKey(path);
      if (seedKey && this.seedData?.[seedKey]) {
        return this.seedData[seedKey] as T[];
      }
      return [];
    }
  }

  protected async setItem<T>(path: string, value: T): Promise<void> {
    const response = await this.fetchWithAuth(`/${path}`, {
      method: 'PUT',
      body: JSON.stringify(value),
    });
    if (!response.ok) throw new Error(`Failed to set ${path}`);
  }

  protected async createItem<T>(path: string, data: any): Promise<T> {
    const response = await this.fetchWithAuth(`/${path}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`Failed to create ${path}`);
    return await response.json();
  }

  protected async updateItem<T>(path: string, id: string, updates: Partial<T>): Promise<T> {
    const response = await this.fetchWithAuth(`/${path}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error(`Failed to update ${path} with id ${id}`);
    return await response.json();
  }

  protected async deleteItem(path: string, id: string): Promise<void> {
    const response = await this.fetchWithAuth(`/${path}/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`Failed to delete ${path} with id ${id}`);
  }

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const token = localStorage.getItem(`${this.config.appId}_token`);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
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
    };

    return pathMappings[path] || null;
  }

  protected mapError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error('Unknown error occurred');
  }
}
