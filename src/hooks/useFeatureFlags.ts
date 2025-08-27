import { useCallback } from 'react';
import { useIdentityContext } from '../providers/IdentityProvider';
import { FeatureFlag } from '../types';

export interface UseFeatureFlagsReturn {
  flags: Record<string, FeatureFlag>;
  isEnabled: (flagKey: string) => boolean;
  getFlag: (flagKey: string) => FeatureFlag | null;
  canEdit: (flagKey: string) => boolean;
  updateFlag: (flagKey: string, enabled: boolean) => Promise<void>;
  editableFlags: string[];
  isLoading: boolean;
  lastSync: Date | null;
  error: string | null;
}

export function useFeatureFlags(): UseFeatureFlagsReturn {
  const { featureFlags, connector, tenant, auth } = useIdentityContext();

  const isEnabled = useCallback(
    (flagKey: string): boolean => {
      const flag = featureFlags.flags[flagKey];
      if (!flag) return false;

      // If server has disabled the flag, it's always disabled
      if (!flag.serverEnabled) return false;

      // Check for tenant override
      if (flag.adminEditable && featureFlags.tenantOverrides[flagKey] !== undefined) {
        return featureFlags.tenantOverrides[flagKey];
      }

      // Check for user segment targeting
      if (flag.userSegment && auth.user) {
        const userHasSegment = flag.userSegment.some(
          (segment: any) =>
            auth.user!.roles.includes(segment) ||
            (auth.user!.permissions && auth.user!.permissions.includes(segment))
        );
        if (!userHasSegment) return false;
      }

      // Check rollout percentage
      if (flag.rolloutPercentage !== undefined && auth.user) {
        const userHash = hashString(auth.user.id);
        const userPercentile = userHash % 100;
        if (userPercentile >= flag.rolloutPercentage) return false;
      }

      return flag.defaultState;
    },
    [featureFlags.flags, featureFlags.tenantOverrides, auth.user]
  );

  const getFlag = useCallback(
    (flagKey: string): FeatureFlag | null => {
      return featureFlags.flags[flagKey] || null;
    },
    [featureFlags.flags]
  );

  const canEdit = useCallback(
    (flagKey: string): boolean => {
      const flag = featureFlags.flags[flagKey];
      if (!flag) return false;

      // Only editable if server enabled and admin editable
      return flag.serverEnabled && flag.adminEditable;
    },
    [featureFlags.flags]
  );

  const updateFlag = useCallback(
    async (flagKey: string, enabled: boolean): Promise<void> => {
      if (!canEdit(flagKey)) {
        throw new Error('Flag is not editable');
      }

      if (!tenant.currentTenant) {
        throw new Error('No current tenant');
      }

      const response = await connector.update<FeatureFlag>(
        `tenants/${tenant.currentTenant.id}/feature-flags/${flagKey}`,
        flagKey,
        { tenantOverride: enabled }
      );
      if (!response.success) {
        throw new Error(
          typeof response.error === 'string' ? response.error : 'Failed to update feature flag'
        );
      }
      // The provider should handle updating the state
      // For now, we'll trigger a simple state update
      window.dispatchEvent(
        new CustomEvent('featureFlagUpdated', {
          detail: { flagKey, enabled },
        })
      );
    },
    [canEdit, connector, tenant.currentTenant]
  );

  return {
    flags: featureFlags.flags,
    isEnabled,
    getFlag,
    canEdit,
    updateFlag,
    editableFlags: featureFlags.editableFlags,
    isLoading: featureFlags.isLoading,
    lastSync: featureFlags.lastSync,
    error: featureFlags.error,
  };
}

// Simple hash function for user ID to percentage
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
