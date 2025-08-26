import React from 'react';
import { useSettings } from '../core/SettingsProvider';
import { SchemaAnalyzer } from '../zod/schema-analyzer';
import { getNestedValue } from '../utils/dot-notation';

export interface SettingsConditionalProps {
  settingKey: string;
  children: React.ReactNode;
  requireAuth?: boolean;
  fallback?: React.ReactNode;
}

export const SettingsConditional: React.FC<SettingsConditionalProps> = ({
  settingKey,
  children,
  requireAuth = false,
  fallback = null,
}) => {
  const { settings, publicSettings, isAuthenticated, schema } = useSettings();

  // Determine which settings object to use
  const isPublicField = SchemaAnalyzer.validatePublicAccess(settingKey, schema);
  const settingsToUse =
    requireAuth || (!isPublicField && !isAuthenticated)
      ? settings
      : isPublicField
        ? publicSettings
        : settings;

  // Get the value using dot notation
  const value = getNestedValue(settingsToUse, settingKey);

  // Check authentication requirements
  if (requireAuth && !isAuthenticated) {
    return <>{fallback}</>;
  }

  // Only render children if value is truthy
  if (!value) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
