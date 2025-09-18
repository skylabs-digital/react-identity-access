import { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { SessionManager } from '../services/SessionManager';
import { AuthApiService } from '../services/AuthApiService';
import { RoleApiService } from '../services/RoleApiService';
import { UserApiService } from '../services/UserApiService';
import { HttpService } from '../services/HttpService';
import { useApp } from './AppProvider';
import { useTenantInfo } from './TenantProvider';
import type { Role, Permission, User } from '../types/api';

export interface AuthConfig {
  onRefreshFailed?: () => void;
  initialRoles?: Role[]; // For SSR injection
}

export interface AuthContextValue {
  sessionManager: SessionManager;
  authenticatedHttpService: HttpService; // Authenticated HttpService for protected endpoints
  // Auth methods
  login: (email: string, password: string, tenantId: string) => Promise<any>;
  signup: (
    email: string,
    name: string,
    password: string,
    tenantId: string,
    lastName?: string
  ) => Promise<any>;
  signupTenantAdmin: (
    email: string,
    name: string,
    password: string,
    tenantName: string,
    lastName?: string
  ) => Promise<any>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  requestPasswordReset: (email: string, tenantId: string) => Promise<void>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<void>;
  refreshToken: () => Promise<void>;
  logout: () => void;
  // Session methods
  setTokens: (tokens: { accessToken: string; refreshToken: string; expiresIn: number }) => void;
  hasValidSession: () => boolean;
  clearSession: () => void;
  // User data
  currentUser: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  refreshUser: () => Promise<void>;
  // Role and Permission methods
  userRole: Role | null;
  userPermissions: string[];
  availableRoles: Role[];
  rolesLoading: boolean;
  hasPermission: (permission: string | Permission) => boolean;
  hasAnyPermission: (permissions: (string | Permission)[]) => boolean;
  hasAllPermissions: (permissions: (string | Permission)[]) => boolean;
  getUserPermissionStrings: () => string[];
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  config?: AuthConfig;
  children: ReactNode;
}

export function AuthProvider({ config = {}, children }: AuthProviderProps) {
  const { appId, baseUrl } = useApp();
  const tenantInfo = useTenantInfo();
  const tenantSlug = tenantInfo?.tenantSlug || null;
  const [availableRoles, setAvailableRoles] = useState<Role[]>(config.initialRoles || []);
  const [rolesLoading, setRolesLoading] = useState(!config.initialRoles);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(false);
  const [userError, setUserError] = useState<Error | null>(null);

  // Create services with stable references
  const sessionManager = useMemo(() => {
    const storageKey = tenantSlug ? `auth_tokens_${tenantSlug}` : 'auth_tokens';
    const tokenStorage = {
      get: () => {
        try {
          const stored = localStorage.getItem(storageKey);
          return stored ? JSON.parse(stored) : null;
        } catch {
          return null;
        }
      },
      set: (tokens: any) => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(tokens));
        } catch {
          // Handle storage errors silently
        }
      },
      clear: () => {
        try {
          localStorage.removeItem(storageKey);
        } catch {
          // Handle storage errors silently
        }
      },
    };

    return new SessionManager({
      onRefreshFailed: config.onRefreshFailed,
      tokenStorage,
      baseUrl: baseUrl,
    });
  }, [tenantSlug, baseUrl, config.onRefreshFailed]);

  const authenticatedHttpService = useMemo(() => {
    const service = new HttpService(baseUrl);
    service.setSessionManager(sessionManager);
    return service;
  }, [baseUrl, sessionManager]);

  const authApiService = useMemo(() => {
    return new AuthApiService(new HttpService(baseUrl));
  }, [baseUrl]);

  const userApiService = useMemo(() => {
    return new UserApiService(authenticatedHttpService, sessionManager);
  }, [authenticatedHttpService, sessionManager]);

  const roleApiService = useMemo(() => {
    return new RoleApiService(new HttpService(baseUrl));
  }, [baseUrl]);

  // Calculate derived values with useMemo to prevent recalculation
  const user = useMemo(() => {
    return currentUser || sessionManager.getUser();
  }, [currentUser, sessionManager]);

  const userRole = useMemo(() => {
    return user?.roleId ? availableRoles.find(role => role.id === user.roleId) || null : null;
  }, [user, availableRoles]);

  const userPermissions = useMemo(() => {
    const permissions = userRole?.permissions || [];
    // Permissions from API are already strings in 'resource.action' format
    return permissions;
  }, [userRole]);

  // Debug log only when userPermissions actually changes
  useEffect(() => {
    console.log('AuthProvider - userPermissions changed:', userPermissions);
  }, [userPermissions]);

  const contextValue = useMemo(() => {
    // Load user data from API
    const loadUserData = async () => {
      try {
        setIsUserLoading(true);
        setUserError(null);

        const user = sessionManager.getUser();
        if (!user?.id) {
          throw new Error('No user ID available in session');
        }

        const userData = await userApiService.getUserById(user.id);
        setCurrentUser(userData);
        sessionManager.setUser(userData); // Update session with fresh data
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load user data');
        setUserError(error);
        console.error('Failed to load user data:', error);
      } finally {
        setIsUserLoading(false);
      }
    };

    const refreshUser = async () => {
      await loadUserData();
    };

    // Auth methods
    const login = async (email: string, password: string, tenantId: string) => {
      const loginResponse = await authApiService.login({
        email,
        password,
        tenantId,
      });

      sessionManager.setTokens({
        accessToken: loginResponse.accessToken,
        refreshToken: loginResponse.refreshToken,
        expiresIn: loginResponse.expiresIn,
      });

      // Store user data if available in the response
      if (loginResponse.user) {
        sessionManager.setUser(loginResponse.user);
        setCurrentUser(loginResponse.user);

        // Load complete user data from API after login
        try {
          await loadUserData();
        } catch (error) {
          console.warn('Failed to load complete user data after login:', error);
        }
      }

      return loginResponse;
    };

    const signup = async (
      email: string,
      name: string,
      password: string,
      tenantId: string,
      lastName?: string
    ) => {
      const signupResponse = await authApiService.signup({
        email,
        name,
        password,
        tenantId,
        lastName,
      });
      return signupResponse;
    };

    const signupTenantAdmin = async (
      email: string,
      name: string,
      password: string,
      tenantName: string,
      lastName?: string
    ) => {
      const signupResponse = await authApiService.signupTenantAdmin({
        email,
        name,
        password,
        tenantName,
        appId,
        lastName,
      });
      return signupResponse;
    };

    const changePassword = async (currentPassword: string, newPassword: string) => {
      const authHeaders = await sessionManager.getAuthHeaders();
      await authApiService.changePassword({ currentPassword, newPassword }, authHeaders);
    };

    const requestPasswordReset = async (email: string, tenantId: string) => {
      await authApiService.requestPasswordReset({ email, tenantId });
    };

    const confirmPasswordReset = async (token: string, newPassword: string) => {
      await authApiService.confirmPasswordReset({ token, newPassword });
    };

    const refreshToken = async () => {
      const tokens = sessionManager.getTokens();
      if (!tokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      const refreshResponse = await authApiService.refreshToken({
        refreshToken: tokens.refreshToken,
      });

      sessionManager.setTokens({
        accessToken: refreshResponse.accessToken,
        refreshToken: refreshResponse.refreshToken || tokens.refreshToken,
        expiresIn: refreshResponse.expiresIn,
      });
    };

    const logout = () => {
      sessionManager.clearSession();
      setCurrentUser(null);
      setUserError(null);
    };

    const setTokens = (tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }) => {
      sessionManager.setTokens(tokens);
    };

    const hasValidSession = () => {
      return sessionManager.hasValidSession();
    };

    const clearSession = () => {
      sessionManager.clearSession();
      setCurrentUser(null);
      setUserError(null);
    };

    // Role and Permission methods
    const fetchRoles = async () => {
      if (!appId) return;

      try {
        setRolesLoading(true);
        const { roles } = await roleApiService.getRolesByApp(appId);
        setAvailableRoles(roles);
      } catch (error) {
        console.error('Failed to fetch roles:', error);
      } finally {
        setRolesLoading(false);
      }
    };

    const refreshRoles = async () => {
      await fetchRoles();
    };

    // Helper functions for permission checks
    const hasPermission = (permission: string | Permission): boolean => {
      if (!userPermissions || userPermissions.length === 0) {
        return false;
      }

      if (typeof permission === 'string') {
        // userPermissions is now an array of strings in 'resource.action' format
        return userPermissions.includes(permission);
      }

      // For Permission objects, convert to string and check
      const permissionString = `${permission.resource}.${permission.action}`;
      return userPermissions.includes(permissionString);
    };

    const hasAnyPermission = (permissions: (string | Permission)[]): boolean => {
      return permissions.some(permission => hasPermission(permission));
    };

    const hasAllPermissions = (permissions: (string | Permission)[]): boolean => {
      return permissions.every(permission => hasPermission(permission));
    };

    // Utility function to get all user permissions in resource.action format
    const getUserPermissionStrings = (): string[] => {
      if (!userPermissions) return [];
      // userPermissions is already an array of strings
      return userPermissions;
    };

    return {
      sessionManager,
      authenticatedHttpService,
      login,
      signup,
      signupTenantAdmin,
      changePassword,
      requestPasswordReset,
      confirmPasswordReset,
      refreshToken,
      logout,
      setTokens,
      hasValidSession,
      clearSession,
      currentUser,
      isUserLoading,
      userError,
      refreshUser,
      userRole,
      userPermissions,
      availableRoles,
      rolesLoading,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      getUserPermissionStrings,
      refreshRoles,
    };
  }, [
    sessionManager,
    authenticatedHttpService,
    authApiService,
    userApiService,
    roleApiService,
    appId,
    availableRoles,
    currentUser,
    isUserLoading,
    userError,
    userRole,
    userPermissions,
  ]);

  // Fetch roles on mount if not provided via SSR
  useEffect(() => {
    if (!config.initialRoles && appId) {
      const fetchRoles = async () => {
        try {
          setRolesLoading(true);
          const internalHttpService = new HttpService(baseUrl);
          const roleApiService = new RoleApiService(internalHttpService);
          const { roles } = await roleApiService.getRolesByApp(appId);
          setAvailableRoles(roles);
        } catch (error) {
          console.error('Failed to fetch roles:', error);
        } finally {
          setRolesLoading(false);
        }
      };

      fetchRoles();
    }
  }, [appId, baseUrl, config.initialRoles]);

  // Initialize user data from session on mount
  useEffect(() => {
    const user = sessionManager.getUser();
    if (user && sessionManager.hasValidSession()) {
      setCurrentUser(user);
    }
  }, [sessionManager]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
