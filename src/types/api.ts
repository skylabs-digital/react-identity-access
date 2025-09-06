// Common API Response Types
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
  };
  message: string;
  type?: 'AUTH' | 'VALIDATION' | 'BUSINESS' | 'SYSTEM';
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// User Types
export enum UserType {
  SUPERUSER = 'SUPERUSER',
  TENANT_ADMIN = 'TENANT_ADMIN',
  USER = 'USER',
}

export interface User {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  userType: UserType;
  tenantId: string;
  roleId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  tenantId: string;
  userType?: string;
  roleId?: string;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
  tenantId: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SignupRequest {
  email: string;
  name: string;
  password: string;
  tenantId: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Role Types
export interface Role {
  id: string;
  name: string;
  description: string | null;
  appId: string;
  permissions: string[]; // API returns permissions as strings in 'resource.action' format
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  appId: string;
  permissionIds: string[];
}

export interface AssignRoleRequest {
  userId: string;
}

// Permission Types
export interface Permission {
  id: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
  appId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePermissionRequest {
  name: string;
  description?: string;
  resource: string;
  action: string;
  appId?: string;
}

// App Types
export interface App {
  id: string;
  name: string;
  description: string | null;
  securityLevel: 'ADMIN' | 'USER';
  isActive: boolean;
  autoApproveTenants: boolean;
  defaultSubscriptionPlanId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JSONSchema {
  $schema?: string;
  $id?: string;
  title?: string;
  description?: string;
  type?: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean' | 'null';
  properties?: { [key: string]: JSONSchema };
  items?: JSONSchema;
  required?: string[];
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  default?: unknown;
  placeholder?: string;
  additionalProperties?: boolean | JSONSchema;
}

export interface PublicAppInfo {
  id: string;
  name: string;
  description: string | null;
  settingsSchema: JSONSchema | null;
}

export interface CreateAppRequest {
  name: string;
  description?: string;
  securityLevel?: 'ADMIN' | 'USER';
}

// Tenant Types
export interface Tenant {
  id: string;
  name: string;
  domain: string | null;
  isActive: boolean;
  appId: string;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantRequest {
  name: string;
  domain?: string;
  appId: string;
  settings?: Record<string, any>;
}

export interface PublicTenantInfo {
  id: string;
  name: string;
  domain: string | null;
  appId: string;
}

export interface TenantSettings {
  [key: string]: any;
}

export interface UpdateTenantSettingsRequest {
  settings: TenantSettings;
}

// Subscription Types
export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'CANCELLED';
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionRequest {
  tenantId: string;
  planId: string;
  startDate?: string;
  endDate?: string;
}

// Subscription Plan Types
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
  appId: string;
  features: SubscriptionFeature[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionFeature {
  id: string;
  name: string;
  description: string | null;
  featureType: 'BOOLEAN' | 'NUMERIC' | 'TEXT';
  value: any;
  planId: string;
}

export interface CreateSubscriptionPlanRequest {
  name: string;
  description?: string;
  price: number;
  currency: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
  appId: string;
  features: CreateSubscriptionFeatureRequest[];
}

export interface CreateSubscriptionFeatureRequest {
  name: string;
  description?: string;
  featureType: 'BOOLEAN' | 'NUMERIC' | 'TEXT';
  value: any;
}

// Feature Flag Types
export interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  appId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeatureFlagRequest {
  name: string;
  description?: string;
  appId: string;
}

// Feature Flag API Response Types
export interface FeatureFlagItem {
  featureFlagId: string;
  key: string;
  name: string;
  value: boolean;
  isOverridden: boolean;
}

export interface FeatureFlagValueResponse {
  key: string;
  value: boolean;
}

// Subscription Feature Types
export interface PlanFeature {
  key: string;
  name: string;
  type: 'BOOLEAN' | 'NUMBER' | 'STRING' | 'boolean' | 'number' | 'string';
  value: any;
  description?: string;
}

export interface TenantSubscriptionFeatures {
  tenantId: string;
  planId: string;
  planName: string;
  subscriptionStatus: string;
  features: PlanFeature[];
  isActive: boolean;
}

// Common Query Parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
