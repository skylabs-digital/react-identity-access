export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  expiresIn?: number;
  tokenType?: string;
}

export interface JwtPayload {
  userId: string;
  email: string | null;
  phoneNumber: string | null;
  userType: string;
  role: string | null;
  tenantId: string | null;
  appId: string | null;
  iat?: number;
  exp?: number;
}

export interface TokenStorage {
  get(): any;
  set(data: any): void;
  clear(): void;
}

export interface SessionConfig {
  storageKey?: string;
  tenantSlug?: string | null; // Tenant slug to generate storage key automatically
  autoRefresh?: boolean;
  refreshThreshold?: number;
  onRefreshFailed?: () => void;
  tokenStorage?: TokenStorage;
  baseUrl?: string; // Base URL for API calls
}

export class SessionManager {
  private storageKey: string;
  private autoRefresh: boolean;
  private refreshThreshold: number;
  private baseUrl: string;
  private onRefreshFailed?: () => void;
  private tokenStorage: TokenStorage;

  // Refresh queue management
  private refreshPromise: Promise<void> | null = null;
  private refreshQueue: Array<{
    resolve: (headers: Record<string, string>) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(config: SessionConfig = {}) {
    // Generate storageKey based on tenantSlug if provided, otherwise use custom key or default
    if (config.tenantSlug !== undefined) {
      this.storageKey = config.tenantSlug ? `auth_tokens_${config.tenantSlug}` : 'auth_tokens';
    } else {
      this.storageKey = config.storageKey || 'auth_tokens';
    }

    this.autoRefresh = config.autoRefresh ?? true;
    this.refreshThreshold = config.refreshThreshold || 300000; // 5 minutes
    this.onRefreshFailed = config.onRefreshFailed;
    this.baseUrl = config.baseUrl || '';

    // Use provided tokenStorage or create default localStorage implementation
    this.tokenStorage = config.tokenStorage || this.createTokenStorage(this.storageKey);
  }

  // Helper to create a TokenStorage for a specific key
  private createTokenStorage(storageKey: string): TokenStorage {
    return {
      get: () => {
        try {
          const stored = localStorage.getItem(storageKey);
          return stored ? JSON.parse(stored) : null;
        } catch {
          return null;
        }
      },
      set: (data: any) => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(data));
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
  }

  setTokens(tokens: TokenData): void {
    // Convert expiresIn to expiresAt if needed
    const tokenData: TokenData = {
      ...tokens,
      expiresAt:
        tokens.expiresAt || (tokens.expiresIn ? Date.now() + tokens.expiresIn * 1000 : undefined),
    };

    // Always use this instance's tokenStorage (defined in constructor)
    this.tokenStorage.set(tokenData);
  }

  getTokens(): TokenData | null {
    return this.tokenStorage.get();
  }

  clearTokens(): void {
    this.tokenStorage.clear();
  }

  isTokenExpired(token?: TokenData): boolean {
    const tokens = token || this.getTokens();
    if (!tokens?.expiresAt) return false;

    return Date.now() >= tokens.expiresAt;
  }

  shouldRefreshToken(token?: TokenData): boolean {
    const tokens = token || this.getTokens();
    if (!tokens?.expiresAt || !this.autoRefresh) return false;

    return Date.now() >= tokens.expiresAt - this.refreshThreshold;
  }

  getAccessToken(): string | null {
    const tokens = this.getTokens();
    return tokens?.accessToken || null;
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    const tokens = this.getTokens();

    // No tokens available
    if (!tokens?.accessToken) {
      return {};
    }

    // Token is valid and doesn't need refresh yet, return headers immediately
    if (!this.shouldRefreshToken(tokens)) {
      return {
        Authorization: `Bearer ${tokens.accessToken}`,
      };
    }

    // Token needs refresh
    if (!tokens.refreshToken) {
      // No refresh token available, clear session and return empty headers
      this.clearSession();
      if (this.onRefreshFailed) {
        this.onRefreshFailed();
      }
      return {};
    }

    // If refresh is already in progress, queue this request
    if (this.refreshPromise) {
      return new Promise((resolve, reject) => {
        this.refreshQueue.push({ resolve, reject });
      });
    }

    // Start refresh process
    this.refreshPromise = this.performTokenRefresh(tokens.refreshToken);

    try {
      await this.refreshPromise;

      // Refresh successful, process queue
      const newTokens = this.getTokens();
      const headers: Record<string, string> = newTokens?.accessToken
        ? { Authorization: `Bearer ${newTokens.accessToken}` }
        : {};

      // Resolve all queued requests
      this.refreshQueue.forEach(({ resolve }) => resolve(headers));
      this.refreshQueue = [];

      return headers;
    } catch (error) {
      // Refresh failed, reject all queued requests
      const refreshError = error instanceof Error ? error : new Error('Token refresh failed');

      this.refreshQueue.forEach(({ reject }) => reject(refreshError));
      this.refreshQueue = [];

      // Clear session and notify
      this.clearSession();
      if (this.onRefreshFailed) {
        this.onRefreshFailed();
      }

      return {};
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(refreshToken: string): Promise<void> {
    if (!this.baseUrl) {
      throw new Error('Base URL not configured for token refresh');
    }

    const url = `${this.baseUrl}/auth/refresh`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
    }

    const refreshResponse = await response.json();

    this.setTokens({
      accessToken: refreshResponse.accessToken,
      refreshToken: refreshResponse.refreshToken || refreshToken,
      expiresIn: refreshResponse.expiresIn,
    });
  }

  setUser(user: any): void {
    // Store user data alongside tokens
    const currentData = this.tokenStorage.get() || {};
    this.tokenStorage.set({ ...currentData, user });
  }

  getUser(): any | null {
    const data = this.tokenStorage.get();
    return data?.user || null;
  }

  clearUser(): void {
    const currentData = this.tokenStorage.get() || {};
    delete currentData.user;
    this.tokenStorage.set(currentData);
  }

  clearSession(): void {
    this.clearTokens();
    this.clearUser();
  }

  /**
   * Decode JWT token and extract payload
   * Returns null if token is invalid or cannot be decoded
   */
  getTokenPayload(): JwtPayload | null {
    try {
      const tokens = this.getTokens();
      if (!tokens?.accessToken) return null;

      // JWT structure: header.payload.signature
      const parts = tokens.accessToken.split('.');
      if (parts.length !== 3) return null;

      // Decode base64 payload (second part)
      const payload = parts[1];
      const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decodedPayload) as JwtPayload;
    } catch {
      // Silent fail - invalid token format
      return null;
    }
  }

  /**
   * Get userId from token (source of truth) or fallback to stored user
   */
  getUserId(): string | null {
    // Priority 1: Get from JWT token (source of truth)
    const payload = this.getTokenPayload();
    if (payload?.userId) return payload.userId;

    // Priority 2: Fallback to stored user data
    const user = this.getUser();
    return user?.id || null;
  }

  hasValidSession(): boolean {
    const tokens = this.getTokens();
    return tokens !== null && !this.isTokenExpired(tokens);
  }
}
