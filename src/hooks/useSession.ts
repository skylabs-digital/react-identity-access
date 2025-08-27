import { useCallback } from 'react';
import { useIdentityContext } from '../providers/IdentityProvider';
import { TokenPair } from '../types';

export interface UseSessionReturn {
  tokens: TokenPair | null;
  isValid: boolean;
  expiresAt: Date | null;
  lastActivity: Date | null;
  isRefreshing: boolean;
  extendSession: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  getTimeUntilExpiry: () => number | null;
  isExpiringSoon: (thresholdMinutes?: number) => boolean;
}

export function useSession(): UseSessionReturn {
  const { session, connector } = useIdentityContext();

  const extendSession = useCallback(async (): Promise<void> => {
    const response = await connector.create('auth/extend-session', {});
    if (!response.success) {
      throw new Error(
        typeof response.error === 'string' ? response.error : 'Failed to extend session'
      );
    }
  }, [connector]);

  const validateSession = useCallback(async (): Promise<boolean> => {
    if (!session.tokens?.accessToken) return false;

    try {
      const response = await connector.create('auth/validate-session', {
        accessToken: session.tokens.accessToken,
      });
      return response.success;
    } catch {
      return false;
    }
  }, [connector, session.tokens]);

  const getTimeUntilExpiry = useCallback((): number | null => {
    if (!session.expiresAt) return null;

    const now = new Date();
    const expiry = new Date(session.expiresAt);
    return expiry.getTime() - now.getTime();
  }, [session.expiresAt]);

  const isExpiringSoon = useCallback(
    (thresholdMinutes: number = 5): boolean => {
      const timeUntilExpiry = getTimeUntilExpiry();
      if (timeUntilExpiry === null) return false;

      const thresholdMs = thresholdMinutes * 60 * 1000;
      return timeUntilExpiry <= thresholdMs;
    },
    [getTimeUntilExpiry]
  );

  return {
    tokens: session.tokens,
    isValid: session.isValid,
    expiresAt: session.expiresAt,
    lastActivity: session.lastActivity,
    isRefreshing: session.isRefreshing,
    extendSession,
    validateSession,
    getTimeUntilExpiry,
    isExpiringSoon,
  };
}
