import { IdentityConnector } from '../base/IdentityConnector';
import {
  LoginCredentials,
  AuthResponse,
  TokenPair,
  User,
  Role,
  Permission,
  Tenant,
  FeatureFlag,
  AuthenticationError,
  TenantError,
} from '../../types';
import { MockDataStore } from './MockDataStore';

export interface LocalStorageConnectorConfig {
  simulateDelay?: boolean;
  minDelay?: number;
  maxDelay?: number;
  errorRate?: number;
  debugMode?: boolean;
  storagePrefix?: string;
  seedData: {
    tenants?: Tenant[];
    users?: User[];
    roles?: Role[];
    featureFlags?: Record<string, FeatureFlag>;
  };
}

export class LocalStorageConnector extends IdentityConnector {
  private storage: Storage;
  private mockData: MockDataStore;
  private storagePrefix: string;

  constructor(config: LocalStorageConnectorConfig) {
    super(config);
    this.storage = window.localStorage;
    this.storagePrefix = config.storagePrefix || 'identity_';
    this.mockData = new MockDataStore(config.seedData);

    // Initialize storage with seed data if not exists
    this.initializeStorage();
  }

  private initializeStorage() {
    const existingData = this.getStorageItem('initialized');
    if (!existingData) {
      this.mockData.seedStorage(this.storage, this.storagePrefix);
      this.setStorageItem('initialized', 'true');
    }
  }

  public forceReinitialize() {
    this.storage.removeItem(`${this.storagePrefix}initialized`);
    this.initializeStorage();
  }

  private getStorageItem(key: string): string | null {
    return this.storage.getItem(`${this.storagePrefix}${key}`);
  }

  private setStorageItem(key: string, value: string): void {
    this.storage.setItem(`${this.storagePrefix}${key}`, value);
  }

  private async simulateDelay(): Promise<void> {
    if (!this.config.simulateDelay) return;

    const delay =
      Math.random() * (this.config.maxDelay - this.config.minDelay) + this.config.minDelay;

    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private simulateError(): void {
    if (this.config.errorRate && Math.random() < this.config.errorRate) {
      throw new Error('Simulated network error');
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    await this.simulateDelay();
    this.simulateError();

    const users = JSON.parse(this.getStorageItem('users') || '[]');
    const user = users.find(
      (u: User) =>
        u.email === credentials.email &&
        u.isActive &&
        (!credentials.tenantId || u.tenantId === credentials.tenantId)
    );

    if (!user) {
      throw new AuthenticationError('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // For demo purposes, validate password (in real implementation, verify password hash)
    if (credentials.password !== 'password') {
      throw new AuthenticationError('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const tokens = this.generateTokens(user);
    this.setStorageItem('currentUser', JSON.stringify(user));
    this.setStorageItem('tokens', JSON.stringify(tokens));

    return { user, tokens };
  }

  async logout(): Promise<void> {
    await this.simulateDelay();

    this.storage.removeItem(`${this.storagePrefix}currentUser`);
    this.storage.removeItem(`${this.storagePrefix}tokens`);
  }

  async refreshToken(_refreshToken: string): Promise<TokenPair> {
    await this.simulateDelay();

    const currentUser = this.getCurrentUserSync();
    if (!currentUser) {
      throw new AuthenticationError('No active session', 'INVALID_TOKEN');
    }

    return this.generateTokens(currentUser);
  }

  async getCurrentUser(): Promise<User> {
    await this.simulateDelay();

    const user = this.getCurrentUserSync();
    if (!user) {
      throw new AuthenticationError('No active session', 'INVALID_TOKEN');
    }

    return user;
  }

  private getCurrentUserSync(): User | null {
    const userData = this.getStorageItem('currentUser');
    return userData ? JSON.parse(userData) : null;
  }

  async updateUser(updates: Partial<User>): Promise<User> {
    await this.simulateDelay();

    const currentUser = this.getCurrentUserSync();
    if (!currentUser) {
      throw new AuthenticationError('No active session', 'INVALID_TOKEN');
    }

    const updatedUser = { ...currentUser, ...updates };
    this.setStorageItem('currentUser', JSON.stringify(updatedUser));

    // Update in users array
    const users = JSON.parse(this.getStorageItem('users') || '[]');
    const userIndex = users.findIndex((u: User) => u.id === currentUser.id);
    if (userIndex >= 0) {
      users[userIndex] = updatedUser;
      this.setStorageItem('users', JSON.stringify(users));
    }

    return updatedUser;
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    await this.simulateDelay();

    const roles = JSON.parse(this.getStorageItem('roles') || '[]');
    const user = JSON.parse(this.getStorageItem('users') || '[]').find(
      (u: User) => u.id === userId
    );

    if (!user) return [];

    return roles.filter(
      (role: Role) => user.roles.includes(role.name) || user.roles.includes(role.id)
    );
  }

  async getPermissions(roleIds: string[]): Promise<Permission[]> {
    await this.simulateDelay();

    const roles = JSON.parse(this.getStorageItem('roles') || '[]');
    const permissions: Permission[] = [];

    roleIds.forEach(roleId => {
      const role = roles.find((r: Role) => r.id === roleId || r.name === roleId);
      if (role) {
        permissions.push(...role.permissions);
      }
    });

    return permissions;
  }

  async getTenants(): Promise<Tenant[]> {
    await this.simulateDelay();

    const tenants = JSON.parse(this.getStorageItem('tenants') || '[]');
    return tenants;
  }

  async getTenant(tenantId: string): Promise<Tenant> {
    await this.simulateDelay();

    const tenants = JSON.parse(this.getStorageItem('tenants') || '[]');
    const tenant = tenants.find((t: Tenant) => t.id === tenantId);

    if (!tenant) {
      throw new TenantError('Tenant not found', 'TENANT_NOT_FOUND');
    }

    return tenant;
  }

  async getUserTenants(userId: string): Promise<Tenant[]> {
    await this.simulateDelay();

    const tenants = JSON.parse(this.getStorageItem('tenants') || '[]');
    const user = JSON.parse(this.getStorageItem('users') || '[]').find(
      (u: User) => u.id === userId
    );

    if (!user) return [];

    // For simplicity, return tenant where user belongs
    return tenants.filter((t: Tenant) => t.id === user.tenantId);
  }

  async validateSession(token: string): Promise<boolean> {
    await this.simulateDelay();

    const tokens = this.getStorageItem('tokens');
    if (!tokens) return false;

    const { accessToken, expiresAt } = JSON.parse(tokens);
    return accessToken === token && new Date(expiresAt) > new Date();
  }

  async extendSession(): Promise<void> {
    await this.simulateDelay();

    const currentUser = this.getCurrentUserSync();
    if (currentUser) {
      const newTokens = this.generateTokens(currentUser);
      this.setStorageItem('tokens', JSON.stringify(newTokens));
    }
  }

  async getFeatureFlags(tenantId: string): Promise<Record<string, FeatureFlag>> {
    await this.simulateDelay();

    const allFlags = JSON.parse(this.getStorageItem('featureFlags') || '{}');
    const tenantFlags: Record<string, FeatureFlag> = {};

    // Filter flags for this tenant
    Object.entries(allFlags).forEach(([key, flag]) => {
      const typedFlag = flag as FeatureFlag;
      if (!typedFlag.tenantId || typedFlag.tenantId === tenantId) {
        tenantFlags[key] = typedFlag;
      }
    });

    return tenantFlags;
  }

  async updateFeatureFlag(_tenantId: string, flagKey: string, enabled: boolean): Promise<void> {
    await this.simulateDelay();

    const allFlags = JSON.parse(this.getStorageItem('featureFlags') || '{}');

    if (allFlags[flagKey]) {
      allFlags[flagKey].tenantOverride = enabled;
      allFlags[flagKey].overrideAt = new Date().toISOString();
      allFlags[flagKey].overrideBy = this.getCurrentUserSync()?.id || 'system';

      this.setStorageItem('featureFlags', JSON.stringify(allFlags));
    }
  }

  private generateTokens(user: User): TokenPair {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (this.config.sessionTimeout || 3600000)); // 1 hour default

    return {
      accessToken: `mock_access_token_${user.id}_${now.getTime()}`,
      refreshToken: `mock_refresh_token_${user.id}_${now.getTime()}`,
      expiresAt,
      tokenType: 'Bearer',
    };
  }

  protected mapError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error('Unknown error occurred');
  }
}
