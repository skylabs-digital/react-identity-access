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
  const context = useIdentityContext();
  const { auth } = context;

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      await context.login(credentials);
      // The provider handles state updates automatically
    },
    [context]
  );

  const logout = useCallback(async () => {
    await context.logout();
    // The provider handles state updates automatically
  }, [context]);

  const signup = useCallback(
    async (credentials: SignupCredentials) => {
      await context.signup(credentials.email, credentials.password, credentials.name);
      // The provider handles state updates automatically
    },
    [context]
  );

  const updateProfile = useCallback(
    async (updates: Partial<User>) => {
      if (!auth.user) {
        throw new Error('No authenticated user');
      }

      // Use connector's generic CRUD API to update user
      const response = await context.connector.update<User>(
        `users/${auth.user.id}`,
        auth.user.id,
        updates
      );
      if (!response.success) {
        throw new Error(
          typeof response.error === 'string' ? response.error : 'Failed to update profile'
        );
      }
      // Reload to get updated user data
      window.location.reload();
    },
    [context.connector, auth.user]
  );

  const refreshSession = useCallback(async () => {
    // Use connector's generic CRUD API to extend session
    const response = await context.connector.create('auth/extend-session', {});
    if (!response.success) {
      throw new Error(
        typeof response.error === 'string' ? response.error : 'Failed to refresh session'
      );
    }
  }, [context.connector]);

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
