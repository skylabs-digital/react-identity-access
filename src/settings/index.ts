// Core exports
export { SettingsProvider, useSettings } from './core/SettingsProvider';
export type { SettingsProviderProps, SettingsContextValue, SettingsConnector } from './core/types';

// Connectors
export { localStorageConnector, createFetchConnector } from './connectors';
export type { FetchConnectorConfig } from './connectors';

// Components
export { SettingsConditional, SettingsSwitch, SettingsAdminPanel } from './components';
export type {
  SettingsConditionalProps,
  SettingsSwitchProps,
  SettingsAdminPanelProps,
  SettingsSection,
} from './components';

// Utilities
export { getNestedValue, setNestedValue, hasNestedValue } from './utils/dot-notation';
