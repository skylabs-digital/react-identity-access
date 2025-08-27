import React from 'react';
import { useSettings } from '../../providers/SettingsProvider';
import { SchemaAnalyzer } from '../../utils/zod/schema-analyzer';
import { getNestedValue } from '../../utils/dot-notation';

export interface SettingsSwitchProps {
  settingKey: string;
  cases: Record<string, React.ReactNode>;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

export const SettingsSwitch: React.FC<SettingsSwitchProps> = ({
  settingKey,
  cases,
  fallback = null,
  requireAuth = false,
}) => {
  const { settings, publicSettings, isAuthenticated, schema } = useSettings();

  // Check authentication requirements
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  // Determine which settings object to use
  const isPublicField = SchemaAnalyzer.validatePublicAccess(settingKey, schema as any);
  const settingsToUse =
    requireAuth || (!isPublicField && !isAuthenticated)
      ? settings
      : isPublicField
        ? publicSettings
        : settings;

  // Get the value using dot notation
  const value = getNestedValue(settingsToUse, settingKey);

  // Convert value to string for case matching
  const stringValue = String(value);

  // Return the matching case or fallback
  if (stringValue in cases) {
    return <>{cases[stringValue]}</>;
  }

  return <>{fallback}</>;
};
