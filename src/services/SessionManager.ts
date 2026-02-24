import {
  SessionExpiredError,
  TokenRefreshTimeoutError,
  TokenRefreshError,
} from '../errors/SessionErrors';

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
  tenantSlug?: string | null;
  autoRefresh?: boolean;
  refreshThreshold?: number;
  /** @deprecated Use onSessionExpired instead */
  onRefreshFailed?: () => void;
  onSessionExpired?: (error: SessionExpiredError) => void;
  tokenStorage?: TokenStorage;
  baseUrl?: string;
  // New: deterministic refresh config
  proactiveRefreshMargin?: number; // ms before expiry to trigger proactive refresh (default: 60000)
  refreshQueueTimeout?: number; // ms before queued requests timeout (default: 10000)
  maxRefreshRetries?: number; // max retries per refresh attempt (default: 3)
  retryBackoffBase?: number; // base ms for exponential backoff (default: 1000)
}

interface QueueEntry {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

export class SessionManager {
  private storageKey: string;
  private autoRefresh: boolean;
  private refreshThreshold: number;
  private baseUrl: string;
  private onRefreshFailed?: () => void;
  private onSessionExpired?: (error: SessionExpiredError) => void;
  private tokenStorage: TokenStorage;

  // New config
  private proactiveRefreshMargin: number;
  private refreshQueueTimeout: number;
  private maxRefreshRetries: number;
  private retryBackoffBase: number;

  // Refresh state
  private refreshPromise: Promise<void> | null = null;
  private refreshQueue: QueueEntry[] = [];
  private proactiveTimerId: ReturnType<typeof setTimeout> | null = null;
  private backgroundRetryTimerId: ReturnType<typeof setTimeout> | null = null;
  private isDestroyed = false;

  constructor(config: SessionConfig = {}) {
    if (config.tenantSlug !== undefined) {
      this.storageKey = config.tenantSlug ? `auth_tokens_${config.tenantSlug}` : 'auth_tokens';
    } else {
      this.storageKey = config.storageKey || 'auth_tokens';
    }

    this.autoRefresh = config.autoRefresh ?? true;
    this.refreshThreshold = config.refreshThreshold || 300000; // 5 minutes
    this.onRefreshFailed = config.onRefreshFailed;
    this.onSessionExpired = config.onSessionExpired;
    this.baseUrl = config.baseUrl || '';

    // New config with defaults
    this.proactiveRefreshMargin = config.proactiveRefreshMargin ?? 60000; // 1 minute
    this.refreshQueueTimeout = config.refreshQueueTimeout ?? 10000; // 10 seconds
    this.maxRefreshRetries = config.maxRefreshRetries ?? 3;
    this.retryBackoffBase = config.retryBackoffBase ?? 1000; // 1 second

    this.tokenStorage = config.tokenStorage || this.createTokenStorage(this.storageKey);

    // Schedule proactive refresh if we already have tokens
    this.scheduleProactiveRefresh();
  }

  // --- Storage helpers ---

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

  // --- Token CRUD ---

  /**
   * Extract the `exp` claim from a JWT and convert to milliseconds.
   * Returns undefined if the token cannot be decoded or has no exp.
   */
  private static extractJwtExpiry(accessToken: string): number | undefined {
    try {
      const parts = accessToken.split('.');
      if (parts.length !== 3) return undefined;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (typeof payload.exp === 'number') {
        return payload.exp * 1000; // JWT exp is in seconds
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  setTokens(tokens: TokenData): void {
    const expiresAt =
      tokens.expiresAt ||
      (tokens.expiresIn ? Date.now() + tokens.expiresIn * 1000 : undefined) ||
      SessionManager.extractJwtExpiry(tokens.accessToken);

    const tokenData: TokenData = {
      ...tokens,
      expiresAt,
    };

    this.tokenStorage.set(tokenData);

    // Reschedule proactive refresh with new expiry
    this.scheduleProactiveRefresh();
  }

  getTokens(): TokenData | null {
    const { accessToken, refreshToken, expiresAt, expiresIn, tokenType } =
      this.tokenStorage.get() || {};

    if (!accessToken) {
      return null;
    }

    // Fallback: derive expiresAt from JWT exp claim when not stored
    const resolvedExpiresAt = expiresAt || SessionManager.extractJwtExpiry(accessToken);

    return {
      accessToken,
      refreshToken,
      expiresAt: resolvedExpiresAt,
      expiresIn,
      tokenType,
    };
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

  // --- Proactive refresh timer ---

  private scheduleProactiveRefresh(): void {
    this.cancelProactiveTimer();
    if (!this.autoRefresh || this.isDestroyed) return;

    const tokens = this.getTokens();
    if (!tokens?.expiresAt || !tokens.refreshToken) return;

    const refreshAt = tokens.expiresAt - this.proactiveRefreshMargin;
    const delay = refreshAt - Date.now();

    if (delay <= 0) {
      // Already past the proactive refresh point — defer to next tick so
      // destroy()/cancelProactiveTimer() can cancel it (e.g. React Strict Mode unmount).
      this.proactiveTimerId = setTimeout(() => {
        this.backgroundRefresh();
      }, 0);
      return;
    }

    this.proactiveTimerId = setTimeout(() => {
      this.backgroundRefresh();
    }, delay);
  }

  private cancelProactiveTimer(): void {
    if (this.proactiveTimerId !== null) {
      clearTimeout(this.proactiveTimerId);
      this.proactiveTimerId = null;
    }
    if (this.backgroundRetryTimerId !== null) {
      clearTimeout(this.backgroundRetryTimerId);
      this.backgroundRetryTimerId = null;
    }
  }

  private backgroundRefresh(): void {
    if (this.isDestroyed) return;

    const tokens = this.getTokens();
    if (!tokens?.refreshToken) return;

    // If a refresh is already in progress (e.g. from getValidAccessToken), skip
    if (this.refreshPromise) return;

    // Use the shared refresh mechanism so refreshPromise is set.
    // This ensures concurrent getValidAccessToken() calls queue behind
    // this refresh instead of starting a duplicate one.
    this.startRefreshAndResolveQueue(tokens.refreshToken)
      .then(() => {
        // Success — scheduleProactiveRefresh is called by setTokens()
      })
      .catch(error => {
        if (error instanceof SessionExpiredError) {
          // Fatal — already handled by startRefreshAndResolveQueue
        } else {
          // Transient — schedule background retry in 30s
          console.warn(
            '[SessionManager] Background refresh failed, retrying in 30s:',
            error.message
          );
          this.backgroundRetryTimerId = setTimeout(() => {
            this.backgroundRefresh();
          }, 30000);
        }
      });
  }

  // --- Core: getValidAccessToken with queue + timeout ---

  /**
   * Get a valid access token. If the token needs refresh, handles the refresh
   * with queuing, timeout, and retry logic.
   *
   * @throws {SessionExpiredError} if refresh token is invalid/expired → caller should logout
   * @throws {TokenRefreshTimeoutError} if queue wait exceeds timeout → caller can retry
   * @throws {TokenRefreshError} if refresh fails after all retries
   */
  async getValidAccessToken(): Promise<string> {
    const tokens = this.getTokens();

    // No tokens at all
    if (!tokens?.accessToken) {
      const error = new SessionExpiredError('token_invalid', 'No tokens available');
      this.handleSessionExpired(error);
      throw error;
    }

    // Token is valid and not near expiry — return immediately
    if (!this.shouldRefreshToken(tokens) && !this.isTokenExpired(tokens)) {
      return tokens.accessToken;
    }

    // Token needs refresh — no refresh token available
    if (!tokens.refreshToken) {
      const error = new SessionExpiredError('token_invalid', 'No refresh token available');
      this.handleSessionExpired(error);
      throw error;
    }

    // If refresh is already in progress, queue with timeout
    if (this.refreshPromise) {
      return this.enqueueForToken();
    }

    // Start the refresh process
    return this.startRefreshAndResolveQueue(tokens.refreshToken);
  }

  /**
   * Backward-compatible getAuthHeaders — now delegates to getValidAccessToken.
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const accessToken = await this.getValidAccessToken();
      return { Authorization: `Bearer ${accessToken}` };
    } catch (error) {
      // Maintain backward compat: return empty headers instead of throwing
      // for code that expects the old behavior
      if (error instanceof SessionExpiredError) {
        // Legacy callback
        if (this.onRefreshFailed) {
          this.onRefreshFailed();
        }
      }
      return {};
    }
  }

  private enqueueForToken(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        // Remove this entry from the queue
        const idx = this.refreshQueue.findIndex(e => e.timeoutId === timeoutId);
        if (idx !== -1) {
          this.refreshQueue.splice(idx, 1);
        }
        reject(new TokenRefreshTimeoutError(this.refreshQueueTimeout));
      }, this.refreshQueueTimeout);

      this.refreshQueue.push({ resolve, reject, timeoutId });
    });
  }

  private async startRefreshAndResolveQueue(refreshToken: string): Promise<string> {
    // Create the shared promise
    this.refreshPromise = this.executeRefreshWithRetry(refreshToken);

    try {
      await this.refreshPromise;

      // Refresh successful — get new token
      const newTokens = this.getTokens();
      const newAccessToken = newTokens?.accessToken || '';

      // Resolve all queued requests
      this.resolveQueue(newAccessToken);

      return newAccessToken;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Token refresh failed');

      if (err instanceof SessionExpiredError) {
        // Fatal — reject all and trigger session expiry
        this.rejectQueue(err);
        this.handleSessionExpired(err);
      } else {
        // Transient — reject all queued with the error
        this.rejectQueue(err);
      }

      throw err;
    } finally {
      this.refreshPromise = null;
    }
  }

  private resolveQueue(accessToken: string): void {
    const queue = [...this.refreshQueue];
    this.refreshQueue = [];
    for (const entry of queue) {
      clearTimeout(entry.timeoutId);
      entry.resolve(accessToken);
    }
  }

  private rejectQueue(error: Error): void {
    const queue = [...this.refreshQueue];
    this.refreshQueue = [];
    for (const entry of queue) {
      clearTimeout(entry.timeoutId);
      entry.reject(error);
    }
  }

  // --- Refresh with retry + error classification ---

  private async executeRefreshWithRetry(refreshToken: string): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRefreshRetries; attempt++) {
      try {
        await this.performTokenRefresh(refreshToken);
        return; // Success
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        // Fatal errors — do not retry
        if (err instanceof SessionExpiredError) {
          throw err;
        }

        lastError = err;

        // Don't wait after the last attempt
        if (attempt < this.maxRefreshRetries) {
          const backoff = this.retryBackoffBase * Math.pow(2, attempt);
          await this.sleep(backoff);
        }
      }
    }

    // All retries exhausted
    throw new TokenRefreshError(this.maxRefreshRetries + 1, lastError);
  }

  /**
   * Single refresh attempt with error classification.
   * Throws SessionExpiredError for fatal errors (no retry).
   * Throws generic Error for transient errors (will be retried).
   */
  private async performTokenRefresh(refreshToken: string): Promise<void> {
    if (!this.baseUrl) {
      throw new Error('Base URL not configured for token refresh');
    }

    const url = `${this.baseUrl}/auth/refresh`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch (networkError) {
      // Network error (e.g., TypeError: Failed to fetch) — transient
      throw networkError instanceof Error
        ? networkError
        : new Error('Network error during token refresh');
    }

    if (!response.ok) {
      // Try to extract error message from response body
      let errorMessage = '';
      try {
        const body = await response.json();
        errorMessage = (body.message || body.error || '').toLowerCase();
      } catch {
        errorMessage = response.statusText.toLowerCase();
      }

      // Classify the error based on status + message
      if (response.status === 401) {
        if (errorMessage.includes('expired')) {
          throw new SessionExpiredError('token_expired');
        }
        if (errorMessage.includes('invalid')) {
          throw new SessionExpiredError('token_invalid');
        }
        // Unknown 401 — treat as fatal
        throw new SessionExpiredError('token_invalid', `Unauthorized: ${errorMessage}`);
      }

      if (response.status === 400) {
        if (errorMessage.includes('inactive')) {
          throw new SessionExpiredError('user_inactive');
        }
        // Other 400s — transient ("User not found", "Token refresh failed: ...")
        throw new Error(`Token refresh failed (400): ${errorMessage}`);
      }

      // 5xx or other — transient
      throw new Error(`Token refresh failed: ${response.status} ${errorMessage}`);
    }

    const refreshResponse = await response.json();

    this.setTokens({
      accessToken: refreshResponse.accessToken,
      refreshToken: refreshResponse.refreshToken || refreshToken,
      expiresIn: refreshResponse.expiresIn,
    });
  }

  // --- Session expiry handler ---

  private handleSessionExpired(error: SessionExpiredError): void {
    this.cancelProactiveTimer();
    this.clearSession();

    if (this.onSessionExpired) {
      this.onSessionExpired(error);
    } else if (this.onRefreshFailed) {
      // Legacy callback fallback
      this.onRefreshFailed();
    }
  }

  // --- User data ---

  setUser(user: any): void {
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

  // --- Session lifecycle ---

  clearSession(): void {
    this.cancelProactiveTimer();
    this.clearTokens();
    this.clearUser();

    // Reject any pending queue entries
    const expiredError = new SessionExpiredError('token_invalid', 'Session cleared');
    this.rejectQueue(expiredError);
  }

  /**
   * Dispose of this SessionManager instance.
   * Cancels all timers and rejects pending queue entries.
   */
  destroy(): void {
    this.isDestroyed = true;
    this.cancelProactiveTimer();
    const error = new SessionExpiredError('token_invalid', 'SessionManager destroyed');
    this.rejectQueue(error);
  }

  // --- JWT helpers ---

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

  // --- Utility ---

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
