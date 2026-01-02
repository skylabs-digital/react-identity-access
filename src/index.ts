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
export {
  TenantProvider,
  useTenant,
  useTenantOptional,
  useTenantSettings,
  useSettings,
  useTenantInfo,
} from './providers/TenantProvider';
export type { TenantConfig } from './providers/TenantProvider';
// Zone routing provider (RFC-005)
export { RoutingProvider, useRouting, useRoutingOptional } from './providers/RoutingProvider';
export type { RoutingContextValue, RoutingProviderProps } from './providers/RoutingProvider';

// Export components
export { Protected } from './components/Protected';
export { ProtectedRoute } from './components/ProtectedRoute';
export { TenantRoute } from './components/TenantRoute';
export { LandingRoute } from './components/LandingRoute';
// Zone-based routing (RFC-005) - replaces TenantRoute, LandingRoute, ProtectedRoute
export {
  ZoneRoute,
  TenantZone,
  PublicZone,
  AuthenticatedZone,
  GuestZone,
  AdminZone,
  UserZone,
  OpenZone,
  TenantAuthenticatedZone,
  TenantOpenZone,
  TenantGuestZone,
} from './components/ZoneRoute';
export { SubscriptionGuard } from './components/SubscriptionGuard';
export { FeatureFlag } from './components/FeatureFlag';
export { LoginForm } from './components/LoginForm';
export { SignupForm } from './components/SignupForm';
export { MagicLinkForm } from './components/MagicLinkForm';
export { MagicLinkVerify } from './components/MagicLinkVerify';
export { PasswordRecoveryForm } from './components/PasswordRecoveryForm';
export { AppLoader, useAppLoaderState } from './components/AppLoader';
export { TenantSelector } from './components/TenantSelector';

// Export component types
export type { ProtectedProps } from './components/Protected';
export type { ProtectedRouteProps } from './components/ProtectedRoute';
export type { TenantRouteProps } from './components/TenantRoute';
export type { LandingRouteProps } from './components/LandingRoute';
export type { ZoneRouteProps } from './types/zoneRouting';
export type { SubscriptionGuardProps } from './components/SubscriptionGuard';
export type { LoginFormProps, LoginFormCopy, LoginFormStyles } from './components/LoginForm';
export type { SignupFormProps, SignupFormCopy, SignupFormStyles } from './components/SignupForm';
export type {
  MagicLinkVerifyProps,
  MagicLinkVerifyCopy,
  MagicLinkVerifyStyles,
} from './components/MagicLinkVerify';
export type {
  MagicLinkFormProps,
  MagicLinkFormCopy,
  MagicLinkFormStyles,
} from './components/MagicLinkForm';
export type {
  PasswordRecoveryFormProps,
  PasswordRecoveryFormCopy,
  PasswordRecoveryFormStyles,
} from './components/PasswordRecoveryForm';
export type { AppLoaderProps } from './components/AppLoader';
export type { TenantSelectorProps } from './components/TenantSelector';

// Export types
export { UserType } from './types/api';
export type { User, PlanFeature, TenantSubscriptionFeatures } from './types/api';

// Base Services
export { HttpService } from './services/HttpService';
export type { RequestOptions } from './services/HttpService';
export { SessionManager } from './services/SessionManager';
export type { TokenData, SessionConfig, JwtPayload } from './services/SessionManager';

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

// Auth parameter types (RFC-002)
export type {
  LoginParams,
  SignupParams,
  SignupTenantAdminParams,
  SendMagicLinkParams,
  VerifyMagicLinkParams,
  RequestPasswordResetParams,
  ConfirmPasswordResetParams,
  ChangePasswordParams,
} from './types/authParams';

// Utilities
export { ApiMappers } from './utils/mappers';

// Zone routing hooks and types (RFC-005)
export { useZoneNavigation, buildRedirectUrl } from './hooks/useZoneNavigation';
export type {
  AccessMode,
  AccessDeniedReason,
  AccessDeniedType,
  ZoneRoots,
  ZonePresets,
  ZonePresetConfig,
  RoutingConfig,
  ReturnToStorage,
  UseZoneNavigationReturn,
} from './types/zoneRouting';
export { DEFAULT_ZONE_ROOTS, DEFAULT_ZONE_PRESETS } from './types/zoneRouting';
