import { createContext, useContext, useReducer, useEffect, ReactNode, useMemo } from 'react';
import { useConnector } from './ConnectorProvider';
import { useTenant } from './TenantProvider';
import { LoginCredentials, AuthResponse, User, Role, Permission } from '../types';
import { BaseConnector, TokenInterceptor } from '../connectors/base/BaseConnector';

export interface IdentityConfig {
  autoLogin?: boolean;
  sessionTimeout?: number;
  requireEmailVerification?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface RoleState {
  roles: Role[];
  permissions: Permission[];
  isLoading: boolean;
}

interface IdentityContextValue {
  auth: AuthState;
  roles: RoleState;
  connector: BaseConnector;
  tenant: any;
  session: any;
  featureFlags: any;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  tokenInterceptor: TokenInterceptor;
}

const IdentityContext = createContext<IdentityContextValue | null>(null);

interface IdentityProviderProps {
  config?: IdentityConfig;
  children: ReactNode;
}

const initialAuthState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

const initialRoleState: RoleState = {
  roles: [],
  permissions: [],
  isLoading: false,
};

type IdentityAction =
  | { type: 'AUTH_LOADING'; payload: boolean }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'ROLES_SET'; payload: { roles: Role[]; permissions: Permission[] } }
  | { type: 'LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_ROLES'; payload: Role[] }
  | { type: 'SET_PERMISSIONS'; payload: Permission[] }
  | { type: 'ERROR'; payload: string }
  | { type: 'LOGIN_SUCCESS'; payload: AuthResponse }
  | { type: 'LOGOUT' };

interface IdentityState {
  auth: AuthState;
  roles: RoleState;
  loading: boolean;
  error: string | null;
  user: User | null;
}

const initialState: IdentityState = {
  auth: initialAuthState,
  roles: initialRoleState,
  loading: false,
  error: null,
  user: null,
};

function identityReducer(state: IdentityState, action: IdentityAction): IdentityState {
  switch (action.type) {
    case 'AUTH_LOADING':
      return {
        ...state,
        auth: { ...state.auth, isLoading: action.payload, error: null },
      };

    case 'AUTH_SUCCESS':
      return {
        ...state,
        auth: {
          user: action.payload,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      };

    case 'AUTH_ERROR':
      return {
        ...state,
        auth: {
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: action.payload,
        },
      };

    case 'AUTH_LOGOUT':
      return {
        ...state,
        auth: initialAuthState,
      };

    case 'ROLES_SET':
      return {
        ...state,
        roles: {
          roles: action.payload.roles,
          permissions: action.payload.permissions,
          isLoading: false,
        },
      };

    case 'LOADING':
      return {
        ...state,
        loading: action.payload,
      };

    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
      };

    case 'SET_ROLES':
      return {
        ...state,
        roles: {
          ...state.roles,
          roles: action.payload,
        },
      };

    case 'SET_PERMISSIONS':
      return {
        ...state,
        roles: {
          ...state.roles,
          permissions: action.payload,
        },
      };

    case 'ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        auth: {
          user: action.payload.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      };

    case 'LOGOUT':
      return {
        ...state,
        auth: initialAuthState,
        user: null,
      };

    default:
      return state;
  }
}

// Session management utility functions
const SessionStorage = {
  clear: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_refresh_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_expires_at');
  },

  store: (authData: AuthResponse) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_token', authData.tokens.accessToken);
    localStorage.setItem('auth_refresh_token', authData.tokens.refreshToken);
    localStorage.setItem('auth_user', JSON.stringify(authData.user));
    localStorage.setItem('auth_expires_at', authData.tokens.expiresAt.toString());
  },

  getToken: () => {
    if (typeof window === 'undefined') return { token: null, expiresAt: null };
    return {
      token: localStorage.getItem('auth_token'),
      expiresAt: localStorage.getItem('auth_expires_at'),
    };
  },

  getRefreshToken: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_refresh_token');
  },

  isTokenExpired: (expiresAt: string | null) => {
    if (!expiresAt) return true;
    return Date.now() > parseInt(expiresAt);
  },

  storeTokens: (authData: AuthResponse) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_token', authData.tokens.accessToken);
    localStorage.setItem('auth_refresh_token', authData.tokens.refreshToken);
    localStorage.setItem('auth_expires_at', authData.tokens.expiresAt.toString());
  },
};

export function IdentityProvider({ config: _config, children }: IdentityProviderProps) {
  const { connector, setTokenInterceptor } = useConnector();
  const { tenantId } = useTenant();
  const [state, dispatch] = useReducer(identityReducer, initialState);

  // Initialize authentication
  useEffect(() => {
    const loadUserData = async () => {
      try {
        dispatch({ type: 'LOADING', payload: true });

        // Get current user using generic CRUD API
        const userResponse = await connector.get<User>('currentUser');
        if (!userResponse.success) {
          throw new Error(userResponse.message || 'Failed to get current user');
        }

        const user = userResponse.data;
        dispatch({ type: 'SET_USER', payload: user });

        // Load user roles using generic CRUD API
        const rolesResponse = await connector.list<Role>(`users/${user.id}/roles`);
        if (rolesResponse.success) {
          const roles = rolesResponse.data;
          dispatch({ type: 'SET_ROLES', payload: roles });

          // Load permissions for these roles
          const roleIds = roles.map((role: Role) => role.id);
          const permissionsResponse = await connector.list<Permission>(
            `roles/permissions?roleIds=${roleIds.join(',')}`
          );
          if (permissionsResponse.success) {
            dispatch({ type: 'SET_PERMISSIONS', payload: permissionsResponse.data });
          }
        }
      } catch (error: any) {
        dispatch({ type: 'ERROR', payload: error.message || 'Failed to load user data' });
      }
    };

    loadUserData();
  }, [tenantId]);

  const login = async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'LOADING', payload: true });

      // Use generic CRUD API to authenticate
      const loginData = {
        email: credentials.email,
        password: credentials.password,
      };
      const response = await connector.create<AuthResponse>('auth/login', loginData);

      if (response.success) {
        // Store session data using utility
        const authData = response.data;
        SessionStorage.store(authData);

        dispatch({ type: 'LOGIN_SUCCESS', payload: authData });
        return authData;
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'ERROR', payload: errorMessage });
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Use generic CRUD API to logout
      await connector.create('auth/logout', {});

      // Clear session data using utility
      SessionStorage.clear();

      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state and session even if server logout fails
      SessionStorage.clear();
      dispatch({ type: 'LOGOUT' });
    }
  };

  const signup = async (email: string, _password: string, name: string) => {
    if (!tenantId) {
      throw new Error('No tenant selected');
    }

    try {
      dispatch({ type: 'LOADING', payload: true });

      // For now, create a mock user since signup is not implemented in base connector
      // This could be extended to support actual signup via connector
      const mockUser: User = {
        id: `user_${Date.now()}`,
        email,
        name,
        tenantId,
        roles: ['user'],
        isActive: true,
        createdAt: new Date(),
      };

      // Store user via connector's generic API
      await connector.create('users', mockUser);
      dispatch({ type: 'AUTH_SUCCESS', payload: mockUser });

      // Load user roles using connector's generic API
      const rolesResponse = await connector.list('roles');
      if (rolesResponse.success) {
        const userRoles = rolesResponse.data.filter(
          (role: any) => mockUser.roles.includes(role.name) || mockUser.roles.includes(role.id)
        ) as Role[];
        dispatch({ type: 'SET_ROLES', payload: userRoles });
      }
    } catch (error: any) {
      dispatch({ type: 'AUTH_ERROR', payload: error.message || 'Signup failed' });
    }
  };

  // Token interceptor for connector authentication - memoized to prevent infinite re-renders
  const tokenInterceptor = useMemo(
    () => ({
      getAccessToken: async (): Promise<string | null> => {
        const { token, expiresAt } = SessionStorage.getToken();

        if (!token || !expiresAt) return null;

        // Check if token is expired
        if (SessionStorage.isTokenExpired(expiresAt)) {
          // Try to refresh token
          return await tokenInterceptor.refreshToken();
        }

        return token;
      },

      refreshToken: async (): Promise<string | null> => {
        const refreshToken = SessionStorage.getRefreshToken();
        if (!refreshToken) {
          await tokenInterceptor.onTokenExpired();
          return null;
        }

        try {
          // Call refresh endpoint
          const response = await connector.create<AuthResponse>('auth/refresh', { refreshToken });
          if (response.success) {
            const authData = response.data;
            SessionStorage.storeTokens(authData);
            return authData.tokens.accessToken;
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
        }

        await tokenInterceptor.onTokenExpired();
        return null;
      },

      onTokenExpired: async (): Promise<void> => {
        // Clear session and logout
        SessionStorage.clear();
        dispatch({ type: 'LOGOUT' });
      },
    }),
    [connector, dispatch]
  );

  // Register token interceptor with connector
  useEffect(() => {
    setTokenInterceptor(tokenInterceptor);
  }, [setTokenInterceptor, tokenInterceptor]);

  const contextValue: IdentityContextValue = {
    auth: state.auth,
    roles: state.roles,
    connector,
    tenant: { tenantId },
    session: state.auth, // For compatibility, map auth to session
    featureFlags: {}, // Empty for now, will be populated by feature flag provider
    login,
    logout,
    signup,
    tokenInterceptor,
  };

  return <IdentityContext.Provider value={contextValue}>{children}</IdentityContext.Provider>;
}

export function useAuth(): IdentityContextValue {
  const context = useContext(IdentityContext);
  if (!context) {
    throw new Error('useAuth must be used within an IdentityProvider');
  }
  return context;
}

// Legacy export for compatibility
export function useIdentityContext(): IdentityContextValue {
  return useAuth();
}
