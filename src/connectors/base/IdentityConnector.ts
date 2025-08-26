import {
  LoginCredentials,
  AuthResponse,
  TokenPair,
  User,
  Role,
  Permission,
  Tenant,
  FeatureFlag,
} from '../../types';

export abstract class IdentityConnector {
  protected config: any;

  constructor(config: any) {
    this.config = config;
  }

  // Authentication
  abstract login(credentials: LoginCredentials): Promise<AuthResponse>;
  abstract logout(): Promise<void>;
  abstract refreshToken(refreshToken: string): Promise<TokenPair>;

  // User Management
  abstract getCurrentUser(): Promise<User>;
  abstract updateUser(updates: Partial<User>): Promise<User>;

  // Roles & Permissions
  abstract getUserRoles(userId: string): Promise<Role[]>;
  abstract getPermissions(roleIds: string[]): Promise<Permission[]>;

  // Multi-tenancy
  abstract getTenants(): Promise<Tenant[]>;
  abstract getTenant(tenantId: string): Promise<Tenant>;
  abstract getUserTenants(userId: string): Promise<Tenant[]>;

  // Session
  abstract validateSession(token: string): Promise<boolean>;
  abstract extendSession(): Promise<void>;

  // Feature Flags
  abstract getFeatureFlags(tenantId: string): Promise<Record<string, FeatureFlag>>;
  abstract updateFeatureFlag(tenantId: string, flagKey: string, enabled: boolean): Promise<void>;

  // Error handling
  protected handleError(error: unknown): never {
    throw this.mapError(error);
  }

  protected abstract mapError(error: unknown): Error;
}
