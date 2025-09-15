// Export providers
export { AppProvider, useApp, useApi } from './providers/AppProvider';
export type { AppConfig } from './providers/AppProvider';
export { AuthProvider, useAuth } from './providers/AuthProvider';
export type { AuthConfig, AuthContextValue } from './providers/AuthProvider';
export { FeatureFlagProvider, useFeatureFlags } from './providers/FeatureFlagProvider';
export type { FeatureFlagConfig, FeatureFlagContextValue } from './providers/FeatureFlagProvider';
export type { FeatureFlag as FeatureFlagType } from './types/api';
export { SubscriptionProvider, useSubscription } from './providers/SubscriptionProvider';
export type {
  SubscriptionConfig,
  SubscriptionContextValue,
} from './providers/SubscriptionProvider';
export { TenantProvider, useTenant, useTenantSettings, useSettings, useTenantInfo } from './providers/TenantProvider';
export type { TenantConfig } from './providers/TenantProvider';

// Export components
export { Protected } from './components/Protected';
export { ProtectedRoute } from './components/ProtectedRoute';
export { SubscriptionGuard } from './components/SubscriptionGuard';
export { FeatureFlag } from './components/FeatureFlag';
export { LoginForm } from './components/LoginForm';
export { SignupForm } from './components/SignupForm';
export { PasswordRecoveryForm } from './components/PasswordRecoveryForm';

// Export component types
export type { ProtectedProps } from './components/Protected';
export type { ProtectedRouteProps } from './components/ProtectedRoute';
export type { SubscriptionGuardProps } from './components/SubscriptionGuard';
export type { LoginFormProps, LoginFormCopy, LoginFormStyles } from './components/LoginForm';
export type { SignupFormProps, SignupFormCopy, SignupFormStyles } from './components/SignupForm';
export type {
  PasswordRecoveryFormProps,
  PasswordRecoveryFormCopy,
  PasswordRecoveryFormStyles,
} from './components/PasswordRecoveryForm';

// Export types
export { UserType } from './types/api';
export type { User, PlanFeature, TenantSubscriptionFeatures } from './types/api';

// Base Services
export { HttpService } from './services/HttpService';
export type { RequestOptions } from './services/HttpService';
export { SessionManager } from './services/SessionManager';
export type { TokenData, SessionConfig } from './services/SessionManager';

// Main API Service - removed in favor of provider pattern

// Domain API Services
export { AuthApiService } from './services/AuthApiService';
export { UserApiService } from './services/UserApiService';
export { RoleApiService } from './services/RoleApiService';
export { PermissionApiService } from './services/PermissionApiService';
export { AppApiService } from './services/AppApiService';
export { TenantApiService } from './services/TenantApiService';
export { SubscriptionApiService } from './services/SubscriptionApiService';
export { SubscriptionPlanApiService } from './services/SubscriptionPlanApiService';
export { FeatureFlagApiService } from './services/FeatureFlagApiService';
export { HealthApiService } from './services/HealthApiService';

// Types
export * from './types/api';
export type { JSONSchema } from './types/api';

// Utilities
export { ApiMappers } from './utils/mappers';
