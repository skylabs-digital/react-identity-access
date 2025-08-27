// Core types for the identity access library

export interface User {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  roles: string[];
  permissions?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  domain?: string;
  settings: TenantSettings;
  isActive: boolean;
  createdAt: Date;
}

export interface TenantSettings {
  allowSelfRegistration: boolean;
  requireEmailVerification: boolean;
  sessionTimeout: number;
  maxConcurrentSessions: number;
  customBranding?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  permissions: Permission[];
  isSystemRole: boolean;
  tenantId?: string;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenType: 'Bearer';
}

export interface LoginCredentials {
  email: string;
  password: string;
  tenantId?: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  name: string;
  tenantId?: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  user: User;
  tokens: TokenPair;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  tenantId?: string;
}

// Feature Flags
export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  category: 'ui' | 'feature' | 'experiment' | 'rollout';

  // Server control (company)
  serverEnabled: boolean;
  tenantId?: string;
  userSegment?: string[];
  rolloutPercentage?: number;

  // Control configuration
  adminEditable: boolean; // If tenant admin can edit it
  defaultState: boolean; // Default state when enabled

  // Tenant admin control (only if adminEditable = true)
  tenantOverride?: boolean;
  overrideReason?: string;
  overrideBy?: string;
  overrideAt?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface FeatureFlagConfig {
  adminEditable: boolean;
  defaultState: boolean;
}

// Configuration types
export interface IdentityConfig {
  tenantStrategy?: 'subdomain' | 'query-param';
  fallbackUrl?: string;
  sessionTimeout?: number;
  autoRefresh?: boolean;
  debugMode?: boolean;
  debugLevel?: DebugLevel;
  autoRefreshTokens?: boolean;
  maxRetries?: number;
}

export interface InitialState {
  tenant?: Tenant;
  user?: User;
  featureFlags?: Record<string, FeatureFlag>;
  roles?: Role[];
  permissions?: Permission[];
}

export interface TenantResolver {
  strategy: 'subdomain' | 'query-param';
  subdomain?: {
    pattern: string; // e.g., "{tenant}.example.com"
  };
  queryParam?: {
    paramName: string; // e.g., "tenant"
    storageKey: string; // sessionStorage key
  };
}

export interface CreateAppConfig {
  tenant?: {
    name: string;
    logo?: string;
    primaryColor?: string;
  };
  mockUsers?: {
    admin?: LoginCredentials;
    client?: LoginCredentials;
  };
  api?: {
    baseUrl: string;
  };
  preset?: 'saas-b2b' | 'ecommerce' | 'education' | 'startup-mvp';
  featureFlags?: {
    source?: 'auto' | 'api' | 'localStorage';
    seedData?: Record<string, FeatureFlagConfig>;
  };
}

export enum DebugLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4,
}

export interface DebugLog {
  level: DebugLevel;
  category: string;
  message: string;
  data?: any;
  timestamp: Date;
}

// State interfaces
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface TenantState {
  currentTenant: Tenant | null;
  availableTenants: Tenant[];
  isLoading: boolean;
  resolutionStrategy: 'subdomain' | 'query-param';
  showLanding: boolean;
}

export interface RoleState {
  roles: Role[];
  currentUserRoles: Role[];
  permissions: Permission[];
  isLoading: boolean;
}

export interface SessionState {
  tokens: TokenPair | null;
  isValid: boolean;
  expiresAt: Date | null;
  lastActivity: Date | null;
  isRefreshing: boolean;
}

export interface FeatureFlagsState {
  flags: Record<string, FeatureFlag>;
  serverFlags: Record<string, boolean>;
  tenantOverrides: Record<string, boolean>;
  editableFlags: string[]; // Only flags that tenant admin can edit
  isLoading: boolean;
  lastSync: Date | null;
  error: string | null;
}

// Error types
export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'EMAIL_NOT_VERIFIED'
  | 'INVALID_TOKEN';

export class AuthenticationError extends Error {
  code: AuthErrorCode;

  constructor(message: string, code: AuthenticationError['code']) {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
  }
}

export class AuthorizationError extends Error {
  code: 'INSUFFICIENT_PERMISSIONS' | 'ROLE_REQUIRED' | 'TENANT_ACCESS_DENIED';

  constructor(message: string, code: AuthorizationError['code']) {
    super(message);
    this.name = 'AuthorizationError';
    this.code = code;
  }
}

export class SessionError extends Error {
  code: 'SESSION_EXPIRED' | 'INVALID_TOKEN' | 'REFRESH_FAILED';

  constructor(message: string, code: SessionError['code']) {
    super(message);
    this.name = 'SessionError';
    this.code = code;
  }
}

export class TenantError extends Error {
  code: 'TENANT_NOT_FOUND' | 'TENANT_INACTIVE' | 'TENANT_SWITCH_FAILED';

  constructor(message: string, code: TenantError['code']) {
    super(message);
    this.name = 'TenantError';
    this.code = code;
  }
}

// Subscription & Payment Types
export interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: string[];
  limits: Record<string, number>; // e.g., { users: 10, storage: 1000 }
  isActive: boolean;
  trialDays?: number;
}

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  plan: SubscriptionPlan;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialStart?: Date;
  trialEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'digital_wallet';
  provider: 'stripe' | 'mercadopago' | 'paypal';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  metadata?: Record<string, any>;
}

export interface Invoice {
  id: string;
  tenantId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  dueDate: Date;
  paidAt?: Date;
  invoiceUrl?: string;
  downloadUrl?: string;
  items: InvoiceItem[];
  createdAt: Date;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Payment {
  id: string;
  tenantId: string;
  invoiceId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  paymentMethodId: string;
  gateway: 'stripe' | 'mercadopago' | 'paypal';
  gatewayTransactionId?: string;
  failureReason?: string;
  createdAt: Date;
  processedAt?: Date;
}

export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  phone?: string;
  billingAddress?: BillingAddress;
  paymentMethods: PaymentMethod[];
  defaultPaymentMethodId?: string;
  metadata?: Record<string, any>;
}

// Payment Gateway Abstraction
export interface PaymentGateway {
  name: string;
  initialize(config: Record<string, any>): Promise<void>;
  createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: Record<string, any>
  ): Promise<PaymentIntent>;
  confirmPayment(paymentIntentId: string, paymentMethodId: string): Promise<PaymentResult>;
  createCustomer(customer: Omit<Customer, 'id' | 'paymentMethods'>): Promise<string>;
  addPaymentMethod(customerId: string, paymentMethodData: any): Promise<PaymentMethod>;
  removePaymentMethod(paymentMethodId: string): Promise<void>;
  createSubscription(customerId: string, planId: string): Promise<Subscription>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  getInvoices(customerId: string): Promise<Invoice[]>;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status:
    | 'requires_payment_method'
    | 'requires_confirmation'
    | 'requires_action'
    | 'processing'
    | 'succeeded'
    | 'canceled';
  clientSecret?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  paymentIntent: PaymentIntent;
  error?: string;
}

// Subscription State
export interface SubscriptionState {
  subscription: Subscription | null;
  plans: SubscriptionPlan[];
  paymentMethods: PaymentMethod[];
  invoices: Invoice[];
  payments: Payment[];
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null;
}

// Tenant Payment System (for tenants to charge their customers)
export interface TenantPaymentConfig {
  id: string;
  tenantId: string;
  enabledGateways: string[];
  defaultGateway: string;
  gatewayConfigs: Record<string, Record<string, any>>;
  webhookEndpoints: Record<string, string>;
  isActive: boolean;
}

export interface TenantCustomer {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  phone?: string;
  billingAddress?: BillingAddress;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface TenantPayment {
  id: string;
  tenantId: string;
  customerId: string;
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  gateway: string;
  gatewayTransactionId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  processedAt?: Date;
}

// Error Types
export class SubscriptionError extends Error {
  code: 'SUBSCRIPTION_NOT_FOUND' | 'PLAN_NOT_FOUND' | 'PAYMENT_FAILED' | 'SUBSCRIPTION_CANCELED';

  constructor(message: string, code: SubscriptionError['code']) {
    super(message);
    this.name = 'SubscriptionError';
    this.code = code;
  }
}

export class PaymentError extends Error {
  code:
    | 'PAYMENT_METHOD_REQUIRED'
    | 'INSUFFICIENT_FUNDS'
    | 'GATEWAY_ERROR'
    | 'INVALID_PAYMENT_METHOD';

  constructor(message: string, code: PaymentError['code']) {
    super(message);
    this.name = 'PaymentError';
    this.code = code;
  }
}
