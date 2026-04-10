import { createContext, useContext, ReactNode, useMemo, useState, useEffect, useRef } from 'react';
import { SessionManager } from '../services/SessionManager';
import { AuthApiService } from '../services/AuthApiService';
import { RoleApiService } from '../services/RoleApiService';
import { UserApiService } from '../services/UserApiService';
import { TenantApiService } from '../services/TenantApiService';
import { HttpService } from '../services/HttpService';
import { useAppOptional } from './AppProvider';
import { useTenantOptional } from './TenantProvider';
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

const USER_TENANTS_STORAGE_KEY = 'userTenants';

function readUserTenants(): UserTenantMembership[] {
  try {
    const cached = localStorage.getItem(USER_TENANTS_STORAGE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
}

function writeUserTenants(tenants: UserTenantMembership[]): void {
  try {
    localStorage.setItem(USER_TENANTS_STORAGE_KEY, JSON.stringify(tenants));
  } catch {
    // Ignore storage errors
  }
}

function clearUserTenants(): void {
  try {
    localStorage.removeItem(USER_TENANTS_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export interface AuthConfig {
  /** @deprecated Use onSessionExpired instead */
  onRefreshFailed?: () => void;
  onSessionExpired?: (error: SessionExpiredError) => void;
  initialRoles?: Role[];
  refreshQueueTimeout?: number;
  proactiveRefreshMargin?: number;
  autoSwitchSingleTenant?: boolean;
  onTenantSelectionRequired?: (tenants: UserTenantMembership[]) => void;
  enableCookieSession?: boolean;
  baseUrl?: string;
  appId?: string;
}

/** Reactive auth state + permission helpers. Subscribe via useAuthState(). */
export interface AuthStateValue {
  isAuthenticated: boolean;
  isAuthInitializing: boolean;
  isAuthReady: boolean;
  currentUser: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  userRole: Role | null;
  userPermissions: string[];
  availableRoles: Role[];
  rolesLoading: boolean;
  userTenants: UserTenantMembership[];
  hasTenantContext: boolean;
  sessionManager: SessionManager;
  authenticatedHttpService: HttpService;
  hasPermission: (permission: string | Permission) => boolean;
  hasAnyPermission: (permissions: (string | Permission)[]) => boolean;
  hasAllPermissions: (permissions: (string | Permission)[]) => boolean;
  getUserPermissionStrings: () => string[];
}

/** Stable auth action methods. Subscribe via useAuthActions() — never re-renders. */
export interface AuthActionsValue {
  login: (params: LoginParams) => Promise<LoginResponse>;
  signup: (params: SignupParams) => Promise<User>;
  signupTenantAdmin: (params: SignupTenantAdminParams) => Promise<{ user: User; tenant: any }>;
  sendMagicLink: (params: SendMagicLinkParams) => Promise<MagicLinkResponse>;
  verifyMagicLink: (params: VerifyMagicLinkParams) => Promise<VerifyMagicLinkResponse>;
  changePassword: (params: ChangePasswordParams) => Promise<void>;
  requestPasswordReset: (params: RequestPasswordResetParams) => Promise<void>;
  confirmPasswordReset: (params: ConfirmPasswordResetParams) => Promise<void>;
  refreshToken: () => Promise<void>;
  logout: () => void;
  setTokens: (tokens: { accessToken: string; refreshToken: string; expiresIn: number }) => void;
  hasValidSession: () => boolean;
  clearSession: () => void;
  loadUserData: (forceRefresh?: boolean) => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  switchToTenant: (tenantId: string, options?: { redirectPath?: string }) => Promise<void>;
  refreshUserTenants: () => Promise<UserTenantMembership[]>;
}

export type AuthContextValue = AuthStateValue & AuthActionsValue;

const AuthStateContext = createContext<AuthStateValue | null>(null);
const AuthActionsContext = createContext<AuthActionsValue | null>(null);

interface AuthProviderProps {
  config?: AuthConfig;
  children: ReactNode;
}

export function AuthProvider({ config = {}, children }: AuthProviderProps) {
  const appContext = useAppOptional();
  const tenantContext = useTenantOptional();

  const baseUrl = appContext?.baseUrl ?? config.baseUrl ?? '';
  const appId = appContext?.appId ?? config.appId;
  const tenant = tenantContext?.tenant ?? null;
  const tenantSlug = tenantContext?.tenantSlug ?? null;
  const switchTenant = tenantContext?.switchTenant ?? (() => {});

  if (!baseUrl) {
    throw new Error(
      '[AuthProvider] baseUrl is required. Provide it via AppProvider or AuthConfig.baseUrl.'
    );
  }

  const [availableRoles, setAvailableRoles] = useState<Role[]>(config.initialRoles || []);
  const [rolesLoading, setRolesLoading] = useState(!config.initialRoles);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(false);
  const [userError, setUserError] = useState<Error | null>(null);
  const [userTenants, setUserTenants] = useState<UserTenantMembership[]>(() => readUserTenants());

  // === SYNCHRONOUS INITIALIZATION ===
  // Process URL tokens and localStorage BEFORE first render completes
  // This ensures guards see valid session immediately
  const initRef = useRef<{
    done: boolean;
    urlTokens: ReturnType<typeof extractAuthTokensFromUrl>;
  }>({ done: false, urlTokens: null });

  if (!initRef.current.done) {
    initRef.current.done = true;
    initRef.current.urlTokens = extractAuthTokensFromUrl();
  }

  // CRITICAL: Initialize to TRUE if we have URL tokens, so isAuthReady stays false until user is loaded
  const [isLoadingAfterUrlTokens, setIsLoadingAfterUrlTokens] = useState(
    () => initRef.current.urlTokens !== null
  );

  const sessionManager = useMemo(() => {
    const manager = SessionManager.getInstance({
      baseUrl,
      enableCookieSession: config.enableCookieSession,
      refreshQueueTimeout: config.refreshQueueTimeout,
      proactiveRefreshMargin: config.proactiveRefreshMargin,
      onSessionExpired: (error: SessionExpiredError) => {
        setCurrentUser(null);
        setUserError(null);
        setUserTenants([]);
        clearUserTenants();
        if (config.onSessionExpired) {
          config.onSessionExpired(error);
        } else if (config.onRefreshFailed) {
          config.onRefreshFailed();
        }
      },
    });

    if (initRef.current.urlTokens) {
      manager.setTokens({
        accessToken: initRef.current.urlTokens.accessToken,
        refreshToken: initRef.current.urlTokens.refreshToken,
        expiresIn: initRef.current.urlTokens.expiresIn,
      });
    }

    return manager;
  }, [
    baseUrl,
    config.enableCookieSession,
    config.refreshQueueTimeout,
    config.proactiveRefreshMargin,
  ]);

  // CRITICAL: Initialize isRestoringSession to TRUE if there's a valid session OR if tokens are expired but
  // refreshable (backgroundRefresh is pending). This keeps isAuthReady false until
  // the refresh attempt settles, preventing premature redirects to login.
  const [isRestoringSession, setIsRestoringSession] = useState(() => {
    if (initRef.current.urlTokens) return false;
    const tokens = sessionManager.getTokens();
    if (tokens) {
      return sessionManager.hasValidSession() || !!tokens.refreshToken;
    }
    if (config.enableCookieSession) return true;
    return false;
  });

  const isAuthReady = initRef.current.done && !isLoadingAfterUrlTokens && !isRestoringSession;

  const authenticatedHttpService = useMemo(() => {
    const service = new HttpService(baseUrl);
    service.setSessionManager(sessionManager);
    return service;
  }, [baseUrl, sessionManager]);

  const authApiService = useMemo(
    () => new AuthApiService(authenticatedHttpService),
    [authenticatedHttpService]
  );

  const userApiService = useMemo(
    () => new UserApiService(authenticatedHttpService),
    [authenticatedHttpService]
  );

  const roleApiService = useMemo(
    () => new RoleApiService(authenticatedHttpService),
    [authenticatedHttpService]
  );

  const userRole = useMemo(() => {
    return currentUser?.roleId
      ? availableRoles.find(role => role.id === currentUser.roleId) || null
      : null;
  }, [currentUser, availableRoles]);

  const userPermissions = useMemo(() => userRole?.permissions || [], [userRole]);

  const isAuthenticated = useMemo(
    () => sessionManager.hasValidSession() && currentUser !== null,
    [sessionManager, currentUser]
  );

  const hasTenantContext = useMemo(() => currentUser?.tenantId != null, [currentUser]);

  // --- Actions: stable references, read latest state via impl ref ---

  // Live implementation of every action. Rebuilt each render so closures
  // capture latest state, but the exposed `actions` proxy stays stable.
  const actionsImplRef = useRef<AuthActionsValue>(null as unknown as AuthActionsValue);

  const loadUserData = async (forceRefresh = false) => {
    try {
      if (!sessionManager.hasValidSession()) return;
      if (!forceRefresh && currentUser) return;

      const userId = sessionManager.getUserId();
      if (!userId) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[AuthProvider] No userId available in token or storage');
        }
        return;
      }

      setIsUserLoading(true);
      setUserError(null);

      const userData = await userApiService.getUserById(userId);
      setCurrentUser(userData);
      sessionManager.setUser(userData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load user data');
      setUserError(error);
      if (process.env.NODE_ENV === 'development') {
        console.error('[AuthProvider] Failed to load user data:', error);
      }
    } finally {
      setIsUserLoading(false);
    }
  };

  const login = async (params: LoginParams): Promise<LoginResponse> => {
    const { username, password, tenantSlug: targetSlug, redirectPath } = params;

    let resolvedTenantId = tenant?.id;
    let targetTenantSlug = tenantSlug;

    if (targetSlug) {
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

    const shouldSwitch = targetSlug && targetSlug !== tenantSlug;

    sessionManager.setTokens({
      accessToken: loginResponse.accessToken,
      refreshToken: loginResponse.refreshToken,
      expiresIn: loginResponse.expiresIn,
    });

    if (loginResponse.user) {
      sessionManager.setUser(loginResponse.user);
      setCurrentUser(loginResponse.user);

      try {
        await loadUserData();
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[AuthProvider] Failed to load complete user data after login:', error);
        }
      }
    }

    if (loginResponse.tenants && loginResponse.tenants.length > 0) {
      setUserTenants(loginResponse.tenants);
      writeUserTenants(loginResponse.tenants);
    }

    const hasTenant = loginResponse.user?.tenantId !== null;

    const tokens = {
      accessToken: loginResponse.accessToken,
      refreshToken: loginResponse.refreshToken,
      expiresIn: loginResponse.expiresIn,
    };

    if (shouldSwitch && targetTenantSlug) {
      switchTenant(targetTenantSlug, { tokens, redirectPath });
      return loginResponse;
    }

    if (redirectPath && redirectPath !== window.location.pathname) {
      switchTenant(targetTenantSlug || tenantSlug || '', { tokens, redirectPath });
      return loginResponse;
    }

    if (!hasTenant && loginResponse.tenants && loginResponse.tenants.length > 0) {
      const autoSwitch = params.autoSwitch !== false && config.autoSwitchSingleTenant !== false;

      if (loginResponse.tenants.length === 1 && autoSwitch) {
        const singleTenant = loginResponse.tenants[0];
        switchTenant(singleTenant.subdomain, { tokens, redirectPath });
        return loginResponse;
      } else if (loginResponse.tenants.length > 1 && config.onTenantSelectionRequired) {
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

    return authApiService.signup({
      email,
      phoneNumber,
      name,
      password,
      tenantId: tenantId ?? tenant?.id,
      lastName,
      appId,
    });
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

    return authApiService.signupTenantAdmin({
      email,
      phoneNumber,
      name,
      password,
      tenantName,
      appId,
      lastName,
    });
  };

  const changePassword = async (params: ChangePasswordParams): Promise<void> => {
    await authApiService.changePassword(params);
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
    await authApiService.confirmPasswordReset(params);
  };

  const sendMagicLink = async (params: SendMagicLinkParams): Promise<MagicLinkResponse> => {
    const { email, frontendUrl, name, lastName, tenantId } = params;
    const resolvedTenantId = tenantId ?? tenant?.id;
    if (!resolvedTenantId) {
      throw new Error('tenantId is required for magic link authentication');
    }
    return authApiService.sendMagicLink({
      email,
      tenantId: resolvedTenantId,
      frontendUrl,
      name,
      lastName,
      appId,
    });
  };

  const verifyMagicLink = async (
    params: VerifyMagicLinkParams
  ): Promise<VerifyMagicLinkResponse> => {
    const { token, email, tenantSlug: targetSlug } = params;

    let resolvedTenantId = tenant?.id;
    let targetTenantSlug = tenantSlug;

    if (targetSlug) {
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

    const shouldSwitch = targetSlug && targetSlug !== tenantSlug;

    sessionManager.setTokens({
      accessToken: verifyResponse.accessToken,
      refreshToken: verifyResponse.refreshToken,
      expiresIn: verifyResponse.expiresIn,
    });

    if (verifyResponse.user) {
      sessionManager.setUser(verifyResponse.user);
      setCurrentUser(verifyResponse.user);

      try {
        await loadUserData();
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            '[AuthProvider] Failed to load complete user data after magic link:',
            error
          );
        }
      }
    }

    if (shouldSwitch && targetTenantSlug && targetTenantSlug !== tenantSlug) {
      switchTenant(targetTenantSlug, {
        tokens: {
          accessToken: verifyResponse.accessToken,
          refreshToken: verifyResponse.refreshToken,
          expiresIn: verifyResponse.expiresIn,
        },
      });
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
    setUserTenants([]);
    clearUserTenants();
  };

  const setTokens = (tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }) => {
    sessionManager.setTokens(tokens);
  };

  const hasValidSession = () => sessionManager.hasValidSession();

  const clearSession = () => {
    sessionManager.clearSession();
    setCurrentUser(null);
    setUserError(null);
  };

  const refreshRoles = async () => {
    if (!appId) return;
    try {
      setRolesLoading(true);
      const { roles } = await roleApiService.getRolesByApp(appId);
      setAvailableRoles(roles);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[AuthProvider] Failed to fetch roles:', error);
      }
    } finally {
      setRolesLoading(false);
    }
  };

  const switchToTenant = async (
    tenantId: string,
    options?: { redirectPath?: string }
  ): Promise<void> => {
    const { redirectPath } = options || {};

    const tokens = sessionManager.getTokens();
    if (!tokens?.refreshToken) {
      throw new Error('No refresh token available for tenant switch');
    }

    const response = await authApiService.switchTenant({
      refreshToken: tokens.refreshToken,
      tenantId,
    });

    sessionManager.setTokens({
      accessToken: response.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: response.expiresIn,
    });

    setCurrentUser(response.user);
    sessionManager.setUser(response.user);

    const targetTenant = userTenants.find(t => t.id === tenantId);
    if (targetTenant) {
      switchTenant(targetTenant.subdomain, {
        tokens: {
          accessToken: response.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: response.expiresIn,
        },
        redirectPath,
      });
    }
  };

  const refreshUserTenants = async (): Promise<UserTenantMembership[]> => {
    const tenants = await authApiService.getUserTenants();
    setUserTenants(tenants);
    writeUserTenants(tenants);
    return tenants;
  };

  // Refresh the live action impl on every render — closures capture latest state
  actionsImplRef.current = {
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
    loadUserData,
    refreshUser: () => loadUserData(),
    refreshRoles,
    switchToTenant,
    refreshUserTenants,
  };

  // Stable proxy — same reference across every render. Delegates to
  // the live impl ref so each call sees the freshest closures.
  const actions = useMemo<AuthActionsValue>(
    () => ({
      login: params => actionsImplRef.current.login(params),
      signup: params => actionsImplRef.current.signup(params),
      signupTenantAdmin: params => actionsImplRef.current.signupTenantAdmin(params),
      sendMagicLink: params => actionsImplRef.current.sendMagicLink(params),
      verifyMagicLink: params => actionsImplRef.current.verifyMagicLink(params),
      changePassword: params => actionsImplRef.current.changePassword(params),
      requestPasswordReset: params => actionsImplRef.current.requestPasswordReset(params),
      confirmPasswordReset: params => actionsImplRef.current.confirmPasswordReset(params),
      refreshToken: () => actionsImplRef.current.refreshToken(),
      logout: () => actionsImplRef.current.logout(),
      setTokens: tokens => actionsImplRef.current.setTokens(tokens),
      hasValidSession: () => actionsImplRef.current.hasValidSession(),
      clearSession: () => actionsImplRef.current.clearSession(),
      loadUserData: forceRefresh => actionsImplRef.current.loadUserData(forceRefresh),
      refreshUser: () => actionsImplRef.current.refreshUser(),
      refreshRoles: () => actionsImplRef.current.refreshRoles(),
      switchToTenant: (tenantId, options) =>
        actionsImplRef.current.switchToTenant(tenantId, options),
      refreshUserTenants: () => actionsImplRef.current.refreshUserTenants(),
    }),
    []
  );

  // --- State value with permission helpers ---

  const stateValue = useMemo<AuthStateValue>(() => {
    const hasPermission = (permission: string | Permission): boolean => {
      if (!userPermissions || userPermissions.length === 0) return false;
      if (typeof permission === 'string') return userPermissions.includes(permission);
      return userPermissions.includes(`${permission.resource}.${permission.action}`);
    };

    return {
      isAuthenticated,
      isAuthInitializing: !isAuthReady,
      isAuthReady,
      currentUser,
      isUserLoading,
      userError,
      userRole,
      userPermissions,
      availableRoles,
      rolesLoading,
      userTenants,
      hasTenantContext,
      sessionManager,
      authenticatedHttpService,
      hasPermission,
      hasAnyPermission: permissions => permissions.some(p => hasPermission(p)),
      hasAllPermissions: permissions => permissions.every(p => hasPermission(p)),
      getUserPermissionStrings: () => userPermissions || [],
    };
  }, [
    isAuthenticated,
    isAuthReady,
    currentUser,
    isUserLoading,
    userError,
    userRole,
    userPermissions,
    availableRoles,
    rolesLoading,
    userTenants,
    hasTenantContext,
    sessionManager,
    authenticatedHttpService,
  ]);

  // --- Effects ---

  useEffect(() => {
    if (config.initialRoles || !appId) return;

    let cancelled = false;
    setRolesLoading(true);
    roleApiService
      .getRolesByApp(appId)
      .then(({ roles }) => {
        if (!cancelled) setAvailableRoles(roles);
      })
      .catch(error => {
        if (process.env.NODE_ENV === 'development') {
          console.error('[AuthProvider] Failed to fetch roles:', error);
        }
      })
      .finally(() => {
        if (!cancelled) setRolesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [appId, config.initialRoles, roleApiService]);

  // Cross-subdomain auth: Clean URL and load user data after sync token processing
  const [urlTokensCleanedUp, setUrlTokensCleanedUp] = useState(false);
  useEffect(() => {
    if (urlTokensCleanedUp) return;
    setUrlTokensCleanedUp(true);

    if (initRef.current.urlTokens) {
      clearAuthTokensFromUrl();
      setIsLoadingAfterUrlTokens(true);

      actionsImplRef.current
        .loadUserData()
        .catch(error => {
          if (process.env.NODE_ENV === 'development') {
            console.error('[AuthProvider] Failed to load user data after URL tokens:', error);
          }
        })
        .finally(() => {
          setIsLoadingAfterUrlTokens(false);
        });
    }
  }, [urlTokensCleanedUp]);

  // Initialize user data from session on mount.
  // If a background refresh is in progress (expired token being renewed), wait for it
  // before checking session validity — prevents premature redirect to login.
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!sessionManager.hasValidSession() && sessionManager.getTokens()?.refreshToken) {
        await sessionManager.waitForPendingRefresh();
      }
      if (cancelled) return;

      if (
        !sessionManager.hasValidSession() &&
        !sessionManager.getTokens() &&
        config.enableCookieSession
      ) {
        await sessionManager.attemptCookieSessionRestore();
        if (cancelled) return;
      }

      const user = sessionManager.getUser();
      if (user && sessionManager.hasValidSession()) {
        setCurrentUser(user);
      }
      setIsRestoringSession(false);
    };
    init();

    return () => {
      cancelled = true;
    };
  }, [sessionManager, config.enableCookieSession]);

  // Auto-load user data if we have tokens but no currentUser
  useEffect(() => {
    if (!urlTokensCleanedUp) return;
    if (initRef.current.urlTokens) return;

    if (!currentUser && !isUserLoading && !userError && sessionManager.hasValidSession()) {
      actionsImplRef.current
        .loadUserData()
        .catch(() => {
          // Silent fail - error already logged in loadUserData
        })
        .finally(() => {
          setIsRestoringSession(false);
        });
    } else {
      setIsRestoringSession(false);
    }
  }, [currentUser, isUserLoading, userError, sessionManager, urlTokensCleanedUp]);

  return (
    <AuthActionsContext.Provider value={actions}>
      <AuthStateContext.Provider value={stateValue}>{children}</AuthStateContext.Provider>
    </AuthActionsContext.Provider>
  );
}

/** Fine-grained subscription to reactive auth state. */
export function useAuthState(): AuthStateValue {
  const state = useContext(AuthStateContext);
  if (!state) {
    throw new Error('useAuthState must be used within an AuthProvider');
  }
  return state;
}

/**
 * Fine-grained subscription to stable auth actions.
 * The returned object has a stable reference — subscribers never re-render
 * when auth state changes.
 */
export function useAuthActions(): AuthActionsValue {
  const actions = useContext(AuthActionsContext);
  if (!actions) {
    throw new Error('useAuthActions must be used within an AuthProvider');
  }
  return actions;
}

/**
 * Backward-compatible hook that exposes state + actions together.
 * Prefer useAuthState() or useAuthActions() for fine-grained re-render control.
 */
export function useAuth(): AuthContextValue {
  const state = useContext(AuthStateContext);
  const actions = useContext(AuthActionsContext);
  if (!state || !actions) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}

/** Optional variant of useAuth — returns null when not inside a provider. */
export function useAuthOptional(): AuthContextValue | null {
  const state = useContext(AuthStateContext);
  const actions = useContext(AuthActionsContext);
  return useMemo(() => {
    if (!state || !actions) return null;
    return { ...state, ...actions };
  }, [state, actions]);
}
