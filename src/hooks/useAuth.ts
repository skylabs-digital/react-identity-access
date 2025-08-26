import { useCallback } from 'react';
import { useIdentityContext } from '../providers/IdentityProvider';
import { LoginCredentials, SignupCredentials, User } from '../types';

export interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  refreshSession: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const { auth, connector, tenant } = useIdentityContext();

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const tenantId = tenant.currentTenant?.id;
      await connector.login({
        ...credentials,
        tenantId,
      });

      // The provider will handle the state update through context
      window.location.reload(); // Simple approach to reinitialize
    },
    [connector, tenant.currentTenant?.id]
  );

  const logout = useCallback(async () => {
    try {
      await connector.logout();
      window.location.reload(); // Simple approach to clear state
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      window.location.reload();
    }
  }, [connector]);

  const signup = useCallback(async (_credentials: SignupCredentials) => {
    // For now, signup is not implemented in the connector
    // This would typically create a new user account
    throw new Error('Signup not implemented yet');
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<User>) => {
      if (!auth.user) {
        throw new Error('No authenticated user');
      }

      await connector.updateUser(updates);
      // Reload to get updated user data
      window.location.reload();
    },
    [connector, auth.user]
  );

  const refreshSession = useCallback(async () => {
    await connector.extendSession();
  }, [connector]);

  return {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    error: auth.error,
    login,
    logout,
    signup,
    updateProfile,
    refreshSession,
  };
}
