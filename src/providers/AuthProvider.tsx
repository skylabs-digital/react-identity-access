import { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { SessionManager } from '../services/SessionManager';
import { AuthApiService } from '../services/AuthApiService';
import { RoleApiService } from '../services/RoleApiService';
import { HttpService } from '../services/HttpService';
import { useApp } from './AppProvider';
import type { Role, Permission } from '../types/api';

export interface AuthConfig {
  onRefreshFailed?: () => void;
  initialRoles?: Role[]; // For SSR injection
}

export interface AuthContextValue {
  sessionManager: SessionManager;
  authenticatedHttpService: HttpService; // Authenticated HttpService for protected endpoints
  // Auth methods
  login: (email: string, password: string, tenantId: string) => Promise<any>;
  signup: (email: string, name: string, password: string, tenantId: string) => Promise<any>;
  signupTenantAdmin: (email: string, name: string, password: string, tenantName: string) => Promise<any>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  requestPasswordReset: (email: string, tenantId: string) => Promise<void>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<void>;
  refreshToken: () => Promise<void>;
  logout: () => void;
  // Session methods
  setTokens: (tokens: { accessToken: string; refreshToken: string; expiresIn: number }) => void;
  hasValidSession: () => boolean;
  clearSession: () => void;
  // Role and Permission methods
  userRole: Role | null;
  userPermissions: Permission[];
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
  const { appId, tenantSlug, baseUrl } = useApp();
  const [availableRoles, setAvailableRoles] = useState<Role[]>(config.initialRoles || []);
  const [rolesLoading, setRolesLoading] = useState(!config.initialRoles);

  const contextValue = useMemo(() => {
    // Create internal localStorage storage using tenantSlug as key prefix
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

    // Create internal HttpService for AuthApiService (no auth needed)
    const internalHttpService = new HttpService(baseUrl);
    const authApiService = new AuthApiService(internalHttpService);
    const roleApiService = new RoleApiService(internalHttpService);

    // Create SessionManager with internal storage and base URL
    const sessionManager = new SessionManager({
      onRefreshFailed: config.onRefreshFailed,
      tokenStorage,
      baseUrl: baseUrl,
    });

    // Create authenticated HttpService for protected endpoints
    const authenticatedHttpService = new HttpService(baseUrl);
    authenticatedHttpService.setSessionManager(sessionManager);

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
      }

      return loginResponse;
    };

    const signup = async (email: string, name: string, password: string, tenantId: string) => {
      const signupResponse = await authApiService.signup({ email, name, password, tenantId });
      return signupResponse;
    };

    const signupTenantAdmin = async (email: string, name: string, password: string, tenantName: string) => {
      const signupResponse = await authApiService.signupTenantAdmin({
        email,
        name,
        password,
        tenantName,
        appId,
      });
      return signupResponse;
    };

    const changePassword = async (currentPassword: string, newPassword: string) => {
      const authHeaders = await sessionManager.getAuthHeaders();
      await authApiService.changePassword(
        { currentPassword, newPassword },
        authHeaders
      );
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

    // Get current user's role
    const user = sessionManager.getUser();
    const userRole = user?.roleId 
      ? availableRoles.find(role => role.id === user.roleId) || null
      : null;

    // Get current user's permissions
    const userPermissions = userRole?.permissions || [];

    // Utility function to convert Permission to resource.action format (dot notation)
    const permissionToString = (permission: Permission): string => {
      return `${permission.resource}.${permission.action}`;
    };

    // Utility function to check if a permission string matches a Permission object
    const matchesPermission = (permissionString: string, permission: Permission): boolean => {
      return permissionString === permissionToString(permission) || permissionString === permission.name;
    };

    // Helper functions for permission checks
    const hasPermission = (permission: string | Permission): boolean => {
      if (!userPermissions) return false;
      
      if (typeof permission === 'string') {
        // Support both 'resource.action' format and legacy name format
        return userPermissions.some(p => matchesPermission(permission, p));
      }
      
      return userPermissions.some(p => p.id === permission.id);
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
      return userPermissions.map(permissionToString);
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
  }, [appId, tenantSlug, config, baseUrl, availableRoles]);

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

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
