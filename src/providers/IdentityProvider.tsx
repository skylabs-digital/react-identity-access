import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { IdentityConnector } from '../connectors/base/IdentityConnector';
import {
  AuthState,
  TenantState,
  RoleState,
  SessionState,
  FeatureFlagsState,
  IdentityConfig,
  TenantResolver,
  InitialState,
  User,
  Tenant,
  Role,
  Permission,
  FeatureFlag,
} from '../types';

// Context interfaces
interface IdentityContextValue {
  auth: AuthState;
  tenant: TenantState;
  roles: RoleState;
  session: SessionState;
  featureFlags: FeatureFlagsState;
  connector: IdentityConnector;
  config: IdentityConfig;
}

interface IdentityProviderProps {
  connector: IdentityConnector;
  config?: IdentityConfig;
  tenantResolver?: TenantResolver;
  initialState?: InitialState;
  LoadingComponent?: React.ComponentType;
  LandingComponent?: React.ComponentType;
  children: ReactNode;
}

// Create contexts
const IdentityContext = createContext<IdentityContextValue | null>(null);

// Initial states
const initialAuthState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

const initialTenantState: TenantState = {
  currentTenant: null,
  availableTenants: [],
  isLoading: true,
  resolutionStrategy: 'subdomain',
  showLanding: false,
};

const initialRoleState: RoleState = {
  roles: [],
  currentUserRoles: [],
  permissions: [],
  isLoading: false,
};

const initialSessionState: SessionState = {
  tokens: null,
  isValid: false,
  expiresAt: null,
  lastActivity: null,
  isRefreshing: false,
};

const initialFeatureFlagsState: FeatureFlagsState = {
  flags: {},
  serverFlags: {},
  tenantOverrides: {},
  editableFlags: [],
  isLoading: false,
  lastSync: null,
  error: null,
};

// Action types
type IdentityAction =
  | { type: 'AUTH_LOADING'; payload: boolean }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'TENANT_LOADING'; payload: boolean }
  | { type: 'TENANT_SET'; payload: Tenant }
  | { type: 'TENANT_ERROR'; payload: string }
  | { type: 'ROLES_SET'; payload: { roles: Role[]; permissions: Permission[] } }
  | { type: 'SESSION_SET'; payload: any }
  | { type: 'FEATURE_FLAGS_SET'; payload: Record<string, FeatureFlag> }
  | { type: 'FEATURE_FLAG_UPDATE'; payload: { key: string; enabled: boolean } };

// Combined state
interface IdentityState {
  auth: AuthState;
  tenant: TenantState;
  roles: RoleState;
  session: SessionState;
  featureFlags: FeatureFlagsState;
}

const initialState: IdentityState = {
  auth: initialAuthState,
  tenant: initialTenantState,
  roles: initialRoleState,
  session: initialSessionState,
  featureFlags: initialFeatureFlagsState,
};

// Reducer
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
        session: initialSessionState,
      };

    case 'TENANT_LOADING':
      return {
        ...state,
        tenant: { ...state.tenant, isLoading: action.payload },
      };

    case 'TENANT_SET':
      return {
        ...state,
        tenant: {
          ...state.tenant,
          currentTenant: action.payload,
          isLoading: false,
          showLanding: false,
        },
      };

    case 'TENANT_ERROR':
      return {
        ...state,
        tenant: {
          ...state.tenant,
          isLoading: false,
          showLanding: true,
        },
      };

    case 'ROLES_SET':
      return {
        ...state,
        roles: {
          ...state.roles,
          currentUserRoles: action.payload.roles,
          permissions: action.payload.permissions,
          isLoading: false,
        },
      };

    case 'SESSION_SET':
      return {
        ...state,
        session: {
          ...state.session,
          ...action.payload,
        },
      };

    case 'FEATURE_FLAGS_SET': {
      const flags = action.payload;
      const editableFlags = Object.keys(flags).filter(
        key => flags[key].serverEnabled && flags[key].adminEditable
      );

      return {
        ...state,
        featureFlags: {
          ...state.featureFlags,
          flags,
          editableFlags,
          isLoading: false,
          lastSync: new Date(),
          serverFlags: Object.fromEntries(
            Object.entries(flags).map(([key, flag]) => [key, flag.serverEnabled])
          ),
        },
      };
    }

    case 'FEATURE_FLAG_UPDATE': {
      const { key, enabled } = action.payload;
      return {
        ...state,
        featureFlags: {
          ...state.featureFlags,
          tenantOverrides: {
            ...state.featureFlags.tenantOverrides,
            [key]: enabled,
          },
        },
      };
    }

    default:
      return state;
  }
}

export function IdentityProvider({
  connector,
  config = {},
  tenantResolver,
  initialState: ssrInitialState,
  LoadingComponent,
  LandingComponent,
  children,
}: IdentityProviderProps) {
  // Create initial state with SSR data if provided
  const createInitialState = (): IdentityState => {
    const baseState = { ...initialState };

    if (initialState) {
      // Apply SSR tenant data
      if (ssrInitialState?.tenant) {
        baseState.tenant = {
          ...baseState.tenant,
          currentTenant: ssrInitialState.tenant,
          isLoading: false,
          showLanding: false,
        };
      }

      // Apply SSR user data
      if (ssrInitialState?.user) {
        baseState.auth = {
          user: ssrInitialState.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        };
      } else if (ssrInitialState?.tenant) {
        // If we have tenant data but no user data, set auth to not loading
        baseState.auth = {
          ...baseState.auth,
          isLoading: false,
        };
      }

      // Apply SSR feature flags
      if (ssrInitialState?.featureFlags) {
        const flags = ssrInitialState.featureFlags;
        const editableFlags = Object.keys(flags).filter(
          key => flags[key].serverEnabled && flags[key].adminEditable
        );

        baseState.featureFlags = {
          ...baseState.featureFlags,
          flags,
          editableFlags,
          isLoading: false,
          lastSync: new Date(),
          serverFlags: Object.fromEntries(
            Object.entries(flags).map(([key, flag]) => [key, flag.serverEnabled])
          ),
        };
      }

      // Apply SSR roles and permissions
      if (ssrInitialState?.roles && ssrInitialState?.permissions) {
        baseState.roles = {
          ...baseState.roles,
          currentUserRoles: ssrInitialState.roles,
          permissions: ssrInitialState.permissions,
          isLoading: false,
        };
      }
    }

    return baseState;
  };

  const [state, dispatch] = useReducer(identityReducer, createInitialState());

  // Initialize the system
  useEffect(() => {
    // Skip initialization completely if we have any SSR data
    if (ssrInitialState?.tenant || ssrInitialState?.user) {
      // SSR data is already loaded, no need to fetch from backend
      return;
    }

    initializeIdentitySystem();
  }, []);

  const initializeIdentitySystem = async () => {
    try {
      // 1. Resolve tenant first
      const tenantId = resolveTenantFromUrl();

      if (tenantId) {
        dispatch({ type: 'TENANT_LOADING', payload: true });
        try {
          const tenant = await connector.getTenant(tenantId);
          dispatch({ type: 'TENANT_SET', payload: tenant });

          // Load feature flags for this tenant
          await loadFeatureFlags(tenantId);
        } catch {
          dispatch({ type: 'TENANT_ERROR', payload: 'Tenant not found' });
          return;
        }
      } else {
        dispatch({ type: 'TENANT_ERROR', payload: 'No tenant specified' });
        return;
      }

      // 2. Check for existing session
      dispatch({ type: 'AUTH_LOADING', payload: true });
      try {
        const user = await connector.getCurrentUser();
        dispatch({ type: 'AUTH_SUCCESS', payload: user });

        // Load user roles and permissions
        await loadUserRoles(user.id);
      } catch {
        // No existing session, that's ok
        dispatch({ type: 'AUTH_LOADING', payload: false });
      }
    } catch {
      console.error('Failed to initialize identity system');
      dispatch({ type: 'AUTH_ERROR', payload: 'Initialization failed' });
    }
  };

  const resolveTenantFromUrl = (): string | null => {
    if (!tenantResolver) {
      // Default subdomain resolution
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      if (parts.length > 2) {
        return parts[0]; // First subdomain
      }
      return null;
    }

    if (tenantResolver.strategy === 'subdomain' && tenantResolver.subdomain) {
      const hostname = window.location.hostname;
      const pattern = tenantResolver.subdomain.pattern;
      const match = hostname.match(pattern.replace('{tenant}', '(.+)'));
      return match ? match[1] : null;
    }

    if (tenantResolver.strategy === 'query-param' && tenantResolver.queryParam) {
      const urlParams = new URLSearchParams(window.location.search);
      const tenantId = urlParams.get(tenantResolver.queryParam.paramName);

      if (tenantId && tenantResolver.queryParam.storageKey) {
        sessionStorage.setItem(tenantResolver.queryParam.storageKey, tenantId);
      }

      return tenantId || sessionStorage.getItem(tenantResolver.queryParam.storageKey || 'tenantId');
    }

    return null;
  };

  const loadUserRoles = async (userId: string) => {
    try {
      const roles = await connector.getUserRoles(userId);
      const roleIds = roles.map(r => r.id);
      const permissions = await connector.getPermissions(roleIds);

      dispatch({
        type: 'ROLES_SET',
        payload: { roles, permissions },
      });
    } catch {
      console.error('Failed to load user roles');
    }
  };

  const loadFeatureFlags = async (tenantId: string) => {
    try {
      const flags = await connector.getFeatureFlags(tenantId);
      dispatch({ type: 'FEATURE_FLAGS_SET', payload: flags });
    } catch {
      console.error('Failed to load feature flags');
    }
  };

  const contextValue: IdentityContextValue = {
    auth: state.auth,
    tenant: state.tenant,
    roles: state.roles,
    session: state.session,
    featureFlags: state.featureFlags,
    connector,
    config,
  };

  // Show loading component while initializing
  if (state.auth.isLoading || state.tenant.isLoading) {
    return LoadingComponent ? <LoadingComponent /> : <div>Loading...</div>;
  }

  // Show landing component if tenant resolution failed
  if (state.tenant.showLanding) {
    return LandingComponent ? <LandingComponent /> : <div>Please select a tenant</div>;
  }

  return <IdentityContext.Provider value={contextValue}>{children}</IdentityContext.Provider>;
}

// Hook to use the identity context
export function useIdentityContext(): IdentityContextValue {
  const context = useContext(IdentityContext);
  if (!context) {
    throw new Error('useIdentityContext must be used within IdentityProvider');
  }
  return context;
}
