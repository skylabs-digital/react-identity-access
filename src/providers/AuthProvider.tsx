import { createContext, useContext, ReactNode, useMemo, useState, useEffect, useRef } from 'react';
import { SessionManager } from '../services/SessionManager';
import { AuthApiService } from '../services/AuthApiService';
import { RoleApiService } from '../services/RoleApiService';
import { UserApiService } from '../services/UserApiService';
import { TenantApiService } from '../services/TenantApiService';
import { HttpService } from '../services/HttpService';
import { useApp } from './AppProvider';
import { useTenant } from './TenantProvider';
import { extractAuthTokensFromUrl, clearAuthTokensFromUrl } from '../utils/crossDomainAuth';
import { SessionExpiredError } from '../errors/SessionErrors';
import type {
  Role,
  Permission,
  User,
  LoginResponse,
  VerifyMagicLinkResponse,
  MagicLinkResponse,
  UserTenantMembership,
} from '../types/api';
import type {
  LoginParams,
  SignupParams,
  SignupTenantAdminParams,
  SendMagicLinkParams,
  VerifyMagicLinkParams,
  RequestPasswordResetParams,
  ConfirmPasswordResetParams,
  ChangePasswordParams,
} from '../types/authParams';

export interface AuthConfig {
  /** @deprecated Use onSessionExpired instead */
  onRefreshFailed?: () => void;
  onSessionExpired?: (error: SessionExpiredError) => void;
  initialRoles?: Role[]; // For SSR injection
  // Session config
  refreshQueueTimeout?: number; // ms before queued requests timeout (default: 10000)
  proactiveRefreshMargin?: number; // ms before expiry to trigger proactive refresh (default: 60000)
  // Multi-tenant options (RFC-004)
  autoSwitchSingleTenant?: boolean; // Auto-switch if user has only one tenant (default: true)
  onTenantSelectionRequired?: (tenants: UserTenantMembership[]) => void; // Callback when user needs to select tenant
}

export interface AuthContextValue {
  // RFC-003: Authentication state
  isAuthenticated: boolean;
  sessionManager: SessionManager;
  authenticatedHttpService: HttpService; // Authenticated HttpService for protected endpoints
  // Auth methods (RFC-002: Object parameters)
  login: (params: LoginParams) => Promise<LoginResponse>;
  signup: (params: SignupParams) => Promise<User>;
  signupTenantAdmin: (params: SignupTenantAdminParams) => Promise<{ user: User; tenant: any }>;
  // Magic Link methods
  sendMagicLink: (params: SendMagicLinkParams) => Promise<MagicLinkResponse>;
  verifyMagicLink: (params: VerifyMagicLinkParams) => Promise<VerifyMagicLinkResponse>;
  changePassword: (params: ChangePasswordParams) => Promise<void>;
  requestPasswordReset: (params: RequestPasswordResetParams) => Promise<void>;
  confirmPasswordReset: (params: ConfirmPasswordResetParams) => Promise<void>;
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
  loadUserData: (forceRefresh?: boolean) => Promise<void>;
  refreshUser: () => Promise<void>;
  // Initialization state (for cross-subdomain auth)
  isAuthInitializing: boolean;
  isAuthReady: boolean;
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
  // RFC-004: Multi-tenant user membership
  userTenants: UserTenantMembership[];
  hasTenantContext: boolean;
  switchToTenant: (tenantId: string, options?: { redirectPath?: string }) => Promise<void>;
  refreshUserTenants: () => Promise<UserTenantMembership[]>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  config?: AuthConfig;
  children: ReactNode;
}

export function AuthProvider({ config = {}, children }: AuthProviderProps) {
  const { appId, baseUrl } = useApp();
  const { tenant, tenantSlug, switchTenant } = useTenant();
  const [availableRoles, setAvailableRoles] = useState<Role[]>(config.initialRoles || []);
  const [rolesLoading, setRolesLoading] = useState(!config.initialRoles);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(false);
  const [userError, setUserError] = useState<Error | null>(null);
  const [lastUserFetch, setLastUserFetch] = useState<number>(0);

  // RFC-004: Multi-tenant user membership state
  const [userTenants, setUserTenants] = useState<UserTenantMembership[]>(() => {
    // Try to load cached tenants from localStorage
    try {
      const cached = localStorage.getItem('userTenants');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [hasTenantContext, setHasTenantContext] = useState<boolean>(false);

  // === SYNCHRONOUS INITIALIZATION ===
  // Process URL tokens and localStorage BEFORE first render completes
  // This ensures guards see valid session immediately
  const initRef = useRef<{
    done: boolean;
    urlTokens: ReturnType<typeof extractAuthTokensFromUrl>;
  }>({ done: false, urlTokens: null });

  // Extract URL tokens synchronously on first render
  if (!initRef.current.done) {
    initRef.current.done = true;
    initRef.current.urlTokens = extractAuthTokensFromUrl();
    if (initRef.current.urlTokens) {
      console.log(
        '[AuthProvider] SYNC: URL tokens found, will block isAuthReady until user loaded'
      );
    }
  }

  // Track if we're loading user after URL token consumption
  // CRITICAL: Initialize to TRUE if we have URL tokens, so isAuthReady stays false until user is loaded
  const [isLoadingAfterUrlTokens, setIsLoadingAfterUrlTokens] = useState(() => {
    const hasUrlTokens = initRef.current.urlTokens !== null;
    console.log('[AuthProvider] SYNC: isLoadingAfterUrlTokens initial:', hasUrlTokens);
    return hasUrlTokens;
  });

  // Create services with stable references — singleton per tenantSlug
  const sessionManager = useMemo(() => {
    const manager = SessionManager.getInstance({
      tenantSlug: tenantSlug,
      baseUrl: baseUrl,
      refreshQueueTimeout: config.refreshQueueTimeout,
      proactiveRefreshMargin: config.proactiveRefreshMargin,
      onSessionExpired: (error: SessionExpiredError) => {
        // Clear React auth state when session expires
        setCurrentUser(null);
        setUserError(null);
        setUserTenants([]);
        setHasTenantContext(false);
        try {
          localStorage.removeItem('userTenants');
        } catch {
          // Ignore localStorage errors
        }
        // Call user callbacks
        if (config.onSessionExpired) {
          config.onSessionExpired(error);
        } else if (config.onRefreshFailed) {
          config.onRefreshFailed();
        }
      },
    });

    // If we have URL tokens, save them immediately (sync)
    if (initRef.current.urlTokens) {
      console.log('[AuthProvider] SYNC: Saving URL tokens to session manager');
      manager.setTokens({
        accessToken: initRef.current.urlTokens.accessToken,
        refreshToken: initRef.current.urlTokens.refreshToken,
        expiresIn: initRef.current.urlTokens.expiresIn,
      });
      console.log('[AuthProvider] SYNC: Session valid:', manager.hasValidSession());
    }

    return manager;
  }, [tenantSlug, baseUrl, config.refreshQueueTimeout, config.proactiveRefreshMargin]);

  // Track if we're restoring an existing session (tokens in localStorage but user not loaded yet)
  // CRITICAL: Initialize to TRUE if there's a valid session OR if tokens are expired but
  // refreshable (backgroundRefresh is pending). This keeps isAuthReady false until
  // the refresh attempt settles, preventing premature redirects to login.
  const [isRestoringSession, setIsRestoringSession] = useState(() => {
    if (initRef.current.urlTokens) return false; // URL tokens path handles its own blocking
    const tokens = sessionManager.getTokens();
    if (!tokens) return false;
    // Valid session (need to load user) OR expired but has refreshToken (refresh pending)
    return sessionManager.hasValidSession() || !!tokens.refreshToken;
  });

  // Auth is ready when:
  // 1. Initial token check is done AND
  // 2. If we had URL tokens, user data must be loaded (not loading) AND
  // 3. If we had an existing session, user data must be restored
  const isAuthReady = initRef.current.done && !isLoadingAfterUrlTokens && !isRestoringSession;

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

  // RFC-003: Compute isAuthenticated from session state
  const isAuthenticated = useMemo(() => {
    return sessionManager.hasValidSession() && currentUser !== null;
  }, [sessionManager, currentUser]);

  // Cache configuration: refetch user data every 5 minutes
  const USER_DATA_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  const contextValue = useMemo(() => {
    // Load user data from API with cache control
    const loadUserData = async (forceRefresh = false) => {
      try {
        // 1. Check if we have a valid session
        if (!sessionManager.hasValidSession()) {
          return;
        }

        // 2. Check if we should use cached data
        const now = Date.now();
        const cacheValid = !forceRefresh && now - lastUserFetch < USER_DATA_CACHE_TTL;

        if (cacheValid && currentUser) {
          return;
        }

        // 3. Get userId from token (source of truth) or fallback to stored user
        const userId = sessionManager.getUserId();
        if (!userId) {
          console.warn('[AuthProvider] No userId available in token or storage');
          return;
        }

        setIsUserLoading(true);
        setUserError(null);

        const userData = await userApiService.getUserById(userId);
        setCurrentUser(userData);
        sessionManager.setUser(userData); // Update session with fresh data
        setLastUserFetch(Date.now()); // Update cache timestamp
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load user data');
        setUserError(error);
        console.error('[AuthProvider] Failed to load user data:', error);
      } finally {
        setIsUserLoading(false);
      }
    };

    const refreshUser = async () => {
      await loadUserData();
    };

    // Auth methods (RFC-002: Object parameters + RFC-001: Auto-switch + RFC-004: Multi-tenant)
    const login = async (params: LoginParams): Promise<LoginResponse> => {
      const { username, password, tenantSlug: targetSlug, redirectPath } = params;

      // RFC-001: Get tenantId from slug if provided, otherwise use current context
      let resolvedTenantId = tenant?.id;
      let targetTenantSlug = tenantSlug;
      let targetSessionManager = sessionManager;

      if (targetSlug) {
        // Get tenant ID from public endpoint using slug
        const tenantApi = new TenantApiService(authenticatedHttpService, appId);
        const tenantInfo = await tenantApi.getPublicTenantInfo(targetSlug);
        resolvedTenantId = tenantInfo.id;
        targetTenantSlug = targetSlug;
      }

      const loginResponse = await authApiService.login({
        username,
        password,
        appId,
        tenantId: resolvedTenantId,
      });

      // Check if we need to switch
      const shouldSwitch = targetSlug && targetSlug !== tenantSlug;

      // Save tokens to the correct tenant

      if (shouldSwitch) {
        // If switching, create a new SessionManager for the target tenant
        targetSessionManager = new SessionManager({
          tenantSlug: targetTenantSlug,
          baseUrl: baseUrl,
        });
      }

      targetSessionManager.setTokens({
        accessToken: loginResponse.accessToken,
        refreshToken: loginResponse.refreshToken,
        expiresIn: loginResponse.expiresIn,
      });

      // Store user data if available in the response
      if (loginResponse.user) {
        targetSessionManager.setUser(loginResponse.user);
        setCurrentUser(loginResponse.user);

        // Load complete user data from API after login
        try {
          await loadUserData();
        } catch (error) {
          console.warn('Failed to load complete user data after login:', error);
        }
      }

      // RFC-004: Store user tenants from login response
      if (loginResponse.tenants && loginResponse.tenants.length > 0) {
        setUserTenants(loginResponse.tenants);
        // Cache in localStorage
        try {
          localStorage.setItem('userTenants', JSON.stringify(loginResponse.tenants));
        } catch {
          // Ignore localStorage errors
        }
      }

      // RFC-004: Determine if we have tenant context
      const hasTenant = loginResponse.user?.tenantId !== null;
      setHasTenantContext(hasTenant);

      // Build tokens object for redirect
      const tokens = {
        accessToken: loginResponse.accessToken,
        refreshToken: loginResponse.refreshToken,
        expiresIn: loginResponse.expiresIn,
      };

      // Handle navigation after login
      if (shouldSwitch && targetTenantSlug) {
        // Switching to different tenant - use switchTenant for cross-subdomain auth
        switchTenant(targetTenantSlug, { tokens, redirectPath });
        return loginResponse; // Code after this won't execute due to page reload
      }

      // Same tenant or no tenant switch - navigate to redirectPath if provided
      if (redirectPath && redirectPath !== window.location.pathname) {
        // Use switchTenant even for same tenant to handle redirect consistently
        switchTenant(targetTenantSlug || tenantSlug || '', { tokens, redirectPath });
        return loginResponse;
      }

      // RFC-004: Handle global login (no tenantId) - auto-switch or callback
      if (!hasTenant && loginResponse.tenants && loginResponse.tenants.length > 0) {
        const autoSwitch = params.autoSwitch !== false && config.autoSwitchSingleTenant !== false; // default true

        if (loginResponse.tenants.length === 1 && autoSwitch) {
          // Auto-switch to the only tenant
          const singleTenant = loginResponse.tenants[0];
          switchTenant(singleTenant.subdomain, { tokens, redirectPath });
          return loginResponse;
        } else if (loginResponse.tenants.length > 1 && config.onTenantSelectionRequired) {
          // Multiple tenants - trigger callback for tenant selection
          config.onTenantSelectionRequired(loginResponse.tenants);
        }
      }

      return loginResponse;
    };

    const signup = async (params: SignupParams): Promise<User> => {
      const { email, phoneNumber, name, password, lastName, tenantId } = params;

      if (!email && !phoneNumber) {
        throw new Error('Either email or phoneNumber is required');
      }
      if (!name || !password) {
        throw new Error('Name and password are required');
      }

      const resolvedTenantId = tenantId ?? tenant?.id;

      const signupResponse = await authApiService.signup({
        email,
        phoneNumber,
        name,
        password,
        tenantId: resolvedTenantId,
        lastName,
        appId,
      });
      return signupResponse;
    };

    const signupTenantAdmin = async (
      params: SignupTenantAdminParams
    ): Promise<{ user: User; tenant: any }> => {
      const { email, phoneNumber, name, password, tenantName, lastName } = params;

      if (!email && !phoneNumber) {
        throw new Error('Either email or phoneNumber is required');
      }
      if (!name || !password || !tenantName) {
        throw new Error('Name, password, and tenantName are required');
      }

      const signupResponse = await authApiService.signupTenantAdmin({
        email,
        phoneNumber,
        name,
        password,
        tenantName,
        appId,
        lastName,
      });
      return signupResponse;
    };

    const changePassword = async (params: ChangePasswordParams): Promise<void> => {
      const { currentPassword, newPassword } = params;
      const authHeaders = await sessionManager.getAuthHeaders();
      await authApiService.changePassword({ currentPassword, newPassword }, authHeaders);
    };

    const requestPasswordReset = async (params: RequestPasswordResetParams): Promise<void> => {
      const { email, tenantId } = params;
      const resolvedTenantId = tenantId ?? tenant?.id;

      if (!resolvedTenantId) {
        throw new Error('tenantId is required for password reset');
      }

      await authApiService.requestPasswordReset({ email, tenantId: resolvedTenantId });
    };

    const confirmPasswordReset = async (params: ConfirmPasswordResetParams): Promise<void> => {
      const { token, newPassword } = params;
      await authApiService.confirmPasswordReset({ token, newPassword });
    };

    // Magic Link methods
    const sendMagicLink = async (params: SendMagicLinkParams): Promise<MagicLinkResponse> => {
      const { email, frontendUrl, name, lastName, tenantId } = params;
      const resolvedTenantId = tenantId ?? tenant?.id;

      if (!resolvedTenantId) {
        throw new Error('tenantId is required for magic link authentication');
      }

      const response = await authApiService.sendMagicLink({
        email,
        tenantId: resolvedTenantId,
        frontendUrl,
        name,
        lastName,
        appId,
      });
      return response;
    };

    const verifyMagicLink = async (
      params: VerifyMagicLinkParams
    ): Promise<VerifyMagicLinkResponse> => {
      const { token, email, tenantSlug: targetSlug } = params;

      // RFC-001: Get tenantId from slug if provided, otherwise use current context
      let resolvedTenantId = tenant?.id;
      let targetTenantSlug = tenantSlug;
      let targetSessionManager = sessionManager;

      if (targetSlug) {
        // Get tenant ID from public endpoint using slug
        const tenantApi = new TenantApiService(authenticatedHttpService, appId);
        const tenantInfo = await tenantApi.getPublicTenantInfo(targetSlug);
        resolvedTenantId = tenantInfo.id;
        targetTenantSlug = targetSlug;
      }

      const verifyResponse = await authApiService.verifyMagicLink({
        token,
        email,
        appId,
        tenantId: resolvedTenantId,
      });

      // Check if we need to switch
      const shouldSwitch = targetSlug && targetSlug !== tenantSlug;

      // Save tokens to the correct tenant

      if (shouldSwitch) {
        // If switching, create a new SessionManager for the target tenant
        targetSessionManager = new SessionManager({
          tenantSlug: targetTenantSlug,
          baseUrl: baseUrl,
        });
      }
      targetSessionManager.setTokens({
        accessToken: verifyResponse.accessToken,
        refreshToken: verifyResponse.refreshToken,
        expiresIn: verifyResponse.expiresIn,
      });

      // Store user data
      if (verifyResponse.user) {
        targetSessionManager.setUser(verifyResponse.user);
        setCurrentUser(verifyResponse.user);

        // Load complete user data from API after magic link login
        try {
          await loadUserData();
        } catch (error) {
          console.warn('Failed to load complete user data after magic link login:', error);
        }
      }

      // Now perform the switch if needed
      if (shouldSwitch && targetTenantSlug && targetTenantSlug !== tenantSlug) {
        // Pass tokens for cross-subdomain auth
        switchTenant(targetTenantSlug, {
          tokens: {
            accessToken: verifyResponse.accessToken,
            refreshToken: verifyResponse.refreshToken,
            expiresIn: verifyResponse.expiresIn,
          },
        });
        // Code after this won't execute due to page reload
      }

      return verifyResponse;
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
      // RFC-004: Clear multi-tenant state
      setUserTenants([]);
      setHasTenantContext(false);
      try {
        localStorage.removeItem('userTenants');
      } catch {
        // Ignore localStorage errors
      }
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

    // RFC-004: Switch to a different tenant without re-authentication
    const switchToTenant = async (
      tenantId: string,
      options?: { redirectPath?: string }
    ): Promise<void> => {
      const { redirectPath } = options || {};

      // Get refresh token from session
      const tokens = sessionManager.getTokens();
      if (!tokens?.refreshToken) {
        throw new Error('No refresh token available for tenant switch');
      }

      // Call switch-tenant endpoint
      const response = await authApiService.switchTenant({
        refreshToken: tokens.refreshToken,
        tenantId,
      });

      // Update tokens with tenant-scoped token
      sessionManager.setTokens({
        accessToken: response.accessToken,
        refreshToken: tokens.refreshToken, // Keep the same refresh token
        expiresIn: response.expiresIn,
      });

      // Update user with tenant context
      setCurrentUser(response.user);
      sessionManager.setUser(response.user);
      setHasTenantContext(true);

      // Find target tenant info from userTenants
      const targetTenant = userTenants.find(t => t.id === tenantId);

      if (targetTenant) {
        // Use TenantProvider's switchTenant for URL handling
        switchTenant(targetTenant.subdomain, {
          tokens: {
            accessToken: response.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: response.expiresIn,
          },
          redirectPath,
        });
        // Code after this won't execute due to page reload
      }
    };

    // RFC-004: Refresh user tenants from backend
    const refreshUserTenants = async (): Promise<UserTenantMembership[]> => {
      const authHeaders = await sessionManager.getAuthHeaders();
      const tenants = await authApiService.getUserTenants(authHeaders);
      setUserTenants(tenants);
      // Cache in localStorage
      try {
        localStorage.setItem('userTenants', JSON.stringify(tenants));
      } catch {
        // Ignore localStorage errors
      }
      return tenants;
    };

    return {
      // RFC-003: Authentication state
      isAuthenticated,
      sessionManager,
      authenticatedHttpService,
      login,
      signup,
      signupTenantAdmin,
      sendMagicLink,
      verifyMagicLink,
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
      loadUserData,
      refreshUser,
      isAuthInitializing: !isAuthReady,
      isAuthReady,
      userRole,
      userPermissions,
      availableRoles,
      rolesLoading,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      getUserPermissionStrings,
      refreshRoles,
      // RFC-004: Multi-tenant user membership
      userTenants,
      hasTenantContext,
      switchToTenant,
      refreshUserTenants,
    };
  }, [
    isAuthenticated,
    sessionManager,
    authenticatedHttpService,
    authApiService,
    userApiService,
    roleApiService,
    appId,
    tenant,
    tenantSlug,
    switchTenant,
    availableRoles,
    currentUser,
    isUserLoading,
    userError,
    userTenants,
    hasTenantContext,
    isAuthReady,
    userRole,
    userPermissions,
    lastUserFetch,
    USER_DATA_CACHE_TTL,
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

  // Cross-subdomain auth: Clean URL and load user data after sync token processing
  const [urlTokensCleanedUp, setUrlTokensCleanedUp] = useState(false);
  useEffect(() => {
    if (urlTokensCleanedUp) return;
    setUrlTokensCleanedUp(true);

    // Clean URL if we had tokens (tokens already saved to sessionManager synchronously)
    if (initRef.current.urlTokens) {
      console.log('[AuthProvider] EFFECT: Cleaning up URL after sync token processing');
      clearAuthTokensFromUrl();

      // Block auth ready until user data is loaded
      setIsLoadingAfterUrlTokens(true);
      console.log('[AuthProvider] EFFECT: Loading user data (blocking isAuthReady)...');

      contextValue
        .loadUserData()
        .catch(error => {
          console.error('[AuthProvider] Failed to load user data:', error);
        })
        .finally(() => {
          console.log('[AuthProvider] EFFECT: User data loaded, releasing isAuthReady');
          setIsLoadingAfterUrlTokens(false);
        });
    }
  }, [contextValue, urlTokensCleanedUp]);

  // Initialize user data from session on mount.
  // If a background refresh is in progress (expired token being renewed), wait for it
  // before checking session validity — prevents premature redirect to login.
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // If token is expired but a refresh is pending, wait for it
      if (!sessionManager.hasValidSession() && sessionManager.getTokens()?.refreshToken) {
        await sessionManager.waitForPendingRefresh();
      }
      if (cancelled) return;

      const user = sessionManager.getUser();
      if (user && sessionManager.hasValidSession()) {
        setCurrentUser(user);
        setIsRestoringSession(false);
      } else if (!sessionManager.hasValidSession()) {
        setIsRestoringSession(false);
      }
      // If hasValidSession() but no cached user, keep isRestoringSession=true
      // — the auto-load effect below will handle it
    };
    init();

    return () => {
      cancelled = true;
    };
  }, [sessionManager]);

  // Auto-load user data if we have tokens but no currentUser
  useEffect(() => {
    // Wait until URL tokens cleanup is done before auto-loading
    if (!urlTokensCleanedUp) return;

    // If we had URL tokens, user data is already being loaded by the cleanup effect
    if (initRef.current.urlTokens) return;

    // Only trigger auto-load if we don't have currentUser and not already loading
    if (!currentUser && !isUserLoading && sessionManager.hasValidSession()) {
      console.log('[AuthProvider] Auto-loading user data...');
      contextValue
        .loadUserData()
        .catch(() => {
          // Silent fail - error already logged in loadUserData
        })
        .finally(() => {
          setIsRestoringSession(false);
        });
    } else if (currentUser) {
      setIsRestoringSession(false);
    }
  }, [currentUser, isUserLoading, contextValue, sessionManager, urlTokensCleanedUp]);

  // Periodic refresh of user data (every 5 minutes)
  useEffect(() => {
    if (!sessionManager.hasValidSession() || !currentUser) {
      return; // Only refresh if authenticated
    }

    const refreshInterval = setInterval(() => {
      contextValue.loadUserData().catch(() => {
        // Silent fail - error already logged in loadUserData
      });
    }, USER_DATA_CACHE_TTL);

    return () => clearInterval(refreshInterval);
  }, [sessionManager, currentUser, contextValue, USER_DATA_CACHE_TTL]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Optional hook that returns AuthContext if available, null otherwise.
 * Useful for components that may or may not be inside an AuthProvider.
 */
export function useAuthOptional(): AuthContextValue | null {
  return useContext(AuthContext);
}
