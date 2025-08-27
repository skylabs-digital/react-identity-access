import { User, Role, Permission, Tenant, FeatureFlag } from '../../types';
import { ApiResponse, createSuccessResponse, createErrorResponse } from '../../types/responses';

export interface SeedData {
  tenants?: Tenant[];
  users?: User[];
  roles?: Role[];
  permissions?: Permission[];
  featureFlags?: Record<string, FeatureFlag>;
  passwords?: Record<string, string>;
}

export interface TokenInterceptor {
  getAccessToken(): Promise<string | null>;
  refreshToken(): Promise<string | null>;
  onTokenExpired(): Promise<void>;
}

export interface ConnectorConfig {
  appId: string;
  seedData?: SeedData;
  baseUrl?: string;
  type: 'localStorage' | 'fetch';
  apiKey?: string;
  tokenInterceptor?: TokenInterceptor;
  [key: string]: any;
}

export abstract class BaseConnector {
  protected config: ConnectorConfig;
  protected seedData?: SeedData;

  constructor(config: ConnectorConfig) {
    this.config = config;
    this.seedData = config.seedData;
  }

  // Generic CRUD operations with seed data fallback
  protected abstract getItem<T>(path: string): Promise<T | null>;
  protected abstract getList<T>(path: string): Promise<T[]>;
  protected abstract setItem<T>(path: string, value: T): Promise<void>;
  protected abstract createItem<T>(path: string, data: any): Promise<T>;
  protected abstract updateItem<T>(path: string, id: string, updates: Partial<T>): Promise<T>;
  protected abstract deleteItem(path: string, id: string): Promise<void>;

  // Generic CRUD API with standardized responses
  async get<T>(path: string, requireAuth = false): Promise<ApiResponse<T>> {
    try {
      if (requireAuth && this.config.tokenInterceptor) {
        const token = await this.config.tokenInterceptor.getAccessToken();
        if (!token) {
          return createErrorResponse('Authentication required', 'UNAUTHORIZED', 'BUSINESS');
        }
      }

      const data = await this.getItem<T>(path);
      if (data === null) {
        return createErrorResponse('Item not found', 'NOT_FOUND', 'BUSINESS');
      }
      return createSuccessResponse(data);
    } catch (error) {
      return createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error',
        'INTERNAL_ERROR',
        'BUSINESS'
      );
    }
  }

  async list<T>(
    path: string,
    page = 1,
    limit = 100,
    requireAuth = false
  ): Promise<ApiResponse<T[]>> {
    try {
      if (requireAuth && this.config.tokenInterceptor) {
        const token = await this.config.tokenInterceptor.getAccessToken();
        if (!token) {
          return createErrorResponse('Authentication required', 'UNAUTHORIZED', 'BUSINESS');
        }
      }

      const allData = await this.getList<T>(path);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const data = allData.slice(startIndex, endIndex);

      const total = allData.length;
      const totalPages = Math.ceil(total / limit);

      return createSuccessResponse(data, undefined, {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      });
    } catch (error) {
      return createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error',
        'INTERNAL_ERROR',
        'BUSINESS'
      );
    }
  }

  async create<T>(path: string, data: any, requireAuth = false): Promise<ApiResponse<T>> {
    try {
      if (requireAuth && this.config.tokenInterceptor) {
        const token = await this.config.tokenInterceptor.getAccessToken();
        if (!token) {
          return createErrorResponse('Authentication required', 'UNAUTHORIZED', 'BUSINESS');
        }
      }

      const result = await this.createItem<T>(path, data);
      return createSuccessResponse(result, 'Item created successfully');
    } catch (error) {
      return createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error',
        'INTERNAL_ERROR',
        'BUSINESS'
      );
    }
  }

  // Alias for create - more user-friendly for endpoints like login
  async post<T>(path: string, data: any): Promise<ApiResponse<T>> {
    return this.create<T>(path, data);
  }

  async update<T>(path: string, id: string, updates: Partial<T>): Promise<ApiResponse<T>> {
    try {
      const updatedItem = await this.updateItem<T>(path, id, updates);
      return createSuccessResponse(updatedItem, 'Item updated successfully');
    } catch (error) {
      return createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error',
        'INTERNAL_ERROR',
        'BUSINESS'
      );
    }
  }

  async delete(path: string, id: string): Promise<ApiResponse<void>> {
    try {
      await this.deleteItem(path, id);
      return createSuccessResponse(undefined, 'Item deleted successfully');
    } catch (error) {
      return createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error',
        'INTERNAL_ERROR',
        'BUSINESS'
      );
    }
  }

  // Seed data fallback helpers
  protected getSeedData<T>(key: keyof SeedData): T[] {
    if (!this.seedData || !this.seedData[key]) return [];
    return this.seedData[key] as T[];
  }

  protected async getWithSeedFallback<T>(key: string, seedKey: keyof SeedData): Promise<T[]> {
    const data = await this.getList<T>(key);
    if (data.length === 0) {
      return this.getSeedData<T>(seedKey);
    }
    return data;
  }

  // Only keep essential connector methods that providers cannot implement
  // All domain logic will be moved to providers using the generic CRUD API

  // Error handling
  protected handleError(error: unknown): never {
    throw this.mapError(error);
  }

  protected abstract mapError(error: unknown): Error;
}
