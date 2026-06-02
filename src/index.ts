// Export providers

export type { AppLoaderProps } from './components/AppLoader';
export { AppLoader, useAppLoaderState } from './components/AppLoader';
export { FeatureFlag } from './components/FeatureFlag';
export type { LandingRouteProps } from './components/LandingRoute';
export { LandingRoute } from './components/LandingRoute';
export type { LoginFormCopy, LoginFormProps, LoginFormStyles } from './components/LoginForm';
export { LoginForm } from './components/LoginForm';
export type {
  MagicLinkFormCopy,
  MagicLinkFormProps,
  MagicLinkFormStyles,
} from './components/MagicLinkForm';
export { MagicLinkForm } from './components/MagicLinkForm';
export type {
  MagicLinkVerifyCopy,
  MagicLinkVerifyProps,
  MagicLinkVerifyStyles,
} from './components/MagicLinkVerify';
export { MagicLinkVerify } from './components/MagicLinkVerify';
export type {
  PasswordRecoveryFormCopy,
  PasswordRecoveryFormProps,
  PasswordRecoveryFormStyles,
} from './components/PasswordRecoveryForm';
export { PasswordRecoveryForm } from './components/PasswordRecoveryForm';
// Export component types
export type { ProtectedProps } from './components/Protected';
// Export components
export { Protected } from './components/Protected';
export type { ProtectedRouteProps } from './components/ProtectedRoute';
export { ProtectedRoute } from './components/ProtectedRoute';
export type { SignupFormCopy, SignupFormProps, SignupFormStyles } from './components/SignupForm';
export { SignupForm } from './components/SignupForm';
export type { SubscriptionGuardProps } from './components/SubscriptionGuard';
export { SubscriptionGuard } from './components/SubscriptionGuard';
export type { TenantRouteProps } from './components/TenantRoute';
export { TenantRoute } from './components/TenantRoute';
export type { TenantSelectorProps, TenantSelectorStyles } from './components/TenantSelector';
export { TenantSelector } from './components/TenantSelector';
// Zone-based routing (RFC-005) - replaces TenantRoute, LandingRoute, ProtectedRoute
export {
  AdminZone,
  AuthenticatedZone,
  GuestZone,
  OpenZone,
  PublicZone,
  TenantAuthenticatedZone,
  TenantGuestZone,
  TenantOpenZone,
  TenantZone,
  UserZone,
  ZoneRoute,
} from './components/ZoneRoute';
export type { SessionExpiredReason } from './errors/SessionErrors';
// Session error classes
export {
  ConfigurationError,
  SessionExpiredError,
  TokenRefreshError,
  TokenRefreshTimeoutError,
} from './errors/SessionErrors';
export type { AppConfig } from './providers/AppProvider';
export { AppProvider, useApi, useApp } from './providers/AppProvider';
export type {
  AuthActionsValue,
  AuthConfig,
  AuthContextValue,
  AuthStateValue,
} from './providers/AuthProvider';
export {
  AuthProvider,
  useAuth,
  useAuthActions,
  useAuthOptional,
  useAuthState,
} from './providers/AuthProvider';
export type { FeatureFlagConfig, FeatureFlagContextValue } from './providers/FeatureFlagProvider';
export { FeatureFlagProvider, useFeatureFlags } from './providers/FeatureFlagProvider';
export type { RoutingContextValue, RoutingProviderProps } from './providers/RoutingProvider';
// Zone routing provider (RFC-005)
export { RoutingProvider, useRouting, useRoutingOptional } from './providers/RoutingProvider';
export type {
  SubscriptionConfig,
  SubscriptionContextValue,
} from './providers/SubscriptionProvider';
export { SubscriptionProvider, useSubscription } from './providers/SubscriptionProvider';
export type { TenantConfig } from './providers/TenantProvider';
export {
  TenantProvider,
  useSettings,
  useTenant,
  useTenantInfo,
  useTenantOptional,
  useTenantSettings,
} from './providers/TenantProvider';
export type { RequestOptions } from './services/HttpService';
// Base Services
export { HttpService } from './services/HttpService';
export type {
  JwtPayload,
  RefreshStats,
  SessionConfig,
  SessionState,
  TokenData,
} from './services/SessionManager';
export { SessionManager } from './services/SessionManager';
export type { ZoneRouteProps } from './types/zoneRouting';

// Main API Service - removed in favor of provider pattern

// Zone routing hooks and types (RFC-005)
export { buildRedirectUrl, useZoneNavigation } from './hooks/useZoneNavigation';
export { AppApiService } from './services/AppApiService';
// Domain API Services
export { AuthApiService } from './services/AuthApiService';
export { FeatureFlagApiService } from './services/FeatureFlagApiService';
export { HealthApiService } from './services/HealthApiService';
export { PermissionApiService } from './services/PermissionApiService';
export { RoleApiService } from './services/RoleApiService';
export { SubscriptionApiService } from './services/SubscriptionApiService';
export { SubscriptionPlanApiService } from './services/SubscriptionPlanApiService';
export { TenantApiService } from './services/TenantApiService';
export { UserApiService } from './services/UserApiService';
export type { JSONSchema } from './types/api';
// Types
export * from './types/api';
// Auth parameter types (RFC-002)
export type {
  ChangePasswordParams,
  ConfirmPasswordResetParams,
  LoginParams,
  RequestPasswordResetParams,
  SendMagicLinkParams,
  SignupParams,
  SignupTenantAdminParams,
  VerifyMagicLinkParams,
} from './types/authParams';
export type {
  AccessDeniedReason,
  AccessDeniedType,
  AccessMode,
  ReturnToStorage,
  RoutingConfig,
  UseZoneNavigationReturn,
  ZonePresetConfig,
  ZonePresets,
  ZoneRoots,
} from './types/zoneRouting';
export { DEFAULT_ZONE_PRESETS, DEFAULT_ZONE_ROOTS } from './types/zoneRouting';
