// Core Providers
export * from './providers/ConnectorProvider';
export * from './providers/IdentityProvider';
export * from './providers/TenantProvider';
export * from './providers/FeatureFlagsProvider';
export * from './providers/SettingsProvider';
export * from './providers/SubscriptionProvider';
export * from './providers/TenantPaymentProvider';

// Connectors
export { BaseConnector } from './connectors/base/BaseConnector';
export { LocalStorageConnector } from './connectors/localStorage/LocalStorageConnector';
export type { LocalStorageConnectorConfig } from './connectors/localStorage/LocalStorageConnector';
// LocalStorageSubscriptionConnector removed - using LocalStorageConnector for subscriptions

// Hooks
export { useAuth } from './hooks/useAuth';
export { useRoles } from './hooks/useRoles';
export { useTenant } from './hooks/useTenant';
export { useFeatureFlags } from './hooks/useFeatureFlags';
export { useSession } from './hooks/useSession';
export { useSubscription } from './hooks/useSubscription';

export type {
  UseAuthReturn,
  UseRolesReturn,
  UseTenantReturn,
  UseFeatureFlagsReturn,
  UseSessionReturn,
  UseSubscriptionReturn,
} from './hooks';

// Guards
export {
  FeatureFlag,
  FeatureGate,
  LimitGate,
  SubscriptionGuard,
  RoleGuard,
  ProtectedRoute,
} from './components';

// Utilities
export * from './utils/dot-notation';
export * from './utils/zod/schema-analyzer';

// Gateways
export * from './gateways';

// Types
export type {
  User,
  Tenant,
  Role,
  Permission,
  FeatureFlag as FeatureFlagType,
  LoginCredentials,
  SignupCredentials,
  AuthResponse,
  TokenPair,
  AuthState,
  TenantState,
  RoleState,
  SessionState,
  FeatureFlagsState,
  IdentityConfig,
  TenantResolver,
  TenantSettings,
  AuthenticationError,
  TenantError,
  DebugLog,
} from './types';
