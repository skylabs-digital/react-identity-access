// Core Provider
export { IdentityProvider, useIdentityContext } from './providers/IdentityProvider';

// Connectors
export { IdentityConnector } from './connectors/base/IdentityConnector';
export { LocalStorageConnector } from './connectors/localStorage/LocalStorageConnector';
export type { LocalStorageConnectorConfig } from './connectors/localStorage/LocalStorageConnector';

// Hooks
export { useAuth } from './hooks/useAuth';
export { useRoles } from './hooks/useRoles';
export { useTenant } from './hooks/useTenant';
export { useFeatureFlags } from './hooks/useFeatureFlags';
export { useSession } from './hooks/useSession';

export type {
  UseAuthReturn,
  UseRolesReturn,
  UseTenantReturn,
  UseFeatureFlagsReturn,
  UseSessionReturn,
} from './hooks';

// Guards
export { ProtectedRoute } from './components/guards/ProtectedRoute';
export { RoleGuard } from './components/guards/RoleGuard';
export { PermissionGuard } from './components/guards/PermissionGuard';

export type {
  ProtectedRouteProps,
  RoleGuardProps,
  PermissionGuardProps,
} from './components/guards';

// Feature Flags
export { FeatureFlag } from './components/feature-flags/FeatureFlag';
export { FeatureToggle } from './components/feature-flags/FeatureToggle';

export type { FeatureFlagProps, FeatureToggleProps } from './components/feature-flags';

// Settings Management
export { SettingsProvider, useSettings } from './settings/core/SettingsProvider';
export type {
  SettingsProviderProps,
  SettingsContextValue,
  SettingsConnector,
} from './settings/core/types';

// Settings Connectors
export {
  LocalStorageConnector as SettingsLocalStorageConnector,
  localStorageConnector as settingsLocalStorageConnector,
  FetchConnector as SettingsFetchConnector,
  createFetchConnector as createSettingsFetchConnector,
} from './settings/connectors';
export type { FetchConnectorConfig as SettingsFetchConnectorConfig } from './settings/connectors';

// Settings Components
export { SettingsConditional, SettingsSwitch, SettingsAdminPanel } from './settings/components';
export type {
  SettingsConditionalProps,
  SettingsSwitchProps,
  SettingsAdminPanelProps,
  SettingsSection,
} from './settings/components';

// Settings Utilities
export { getNestedValue, setNestedValue, hasNestedValue } from './settings/utils/dot-notation';

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
