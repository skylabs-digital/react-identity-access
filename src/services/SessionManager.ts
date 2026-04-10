import {
  SessionExpiredError,
  TokenRefreshTimeoutError,
  TokenRefreshError,
  ConfigurationError,
} from '../errors/SessionErrors';
import {
  validateBaseUrl,
  validateNumber,
  validateBoolean,
  validateTokenShape,
  validateExpiresIn,
  validateExpiresAt,
} from '../utils/configValidation';
import { decodeJwt, extractJwtClaim, extractJwtExpiry } from '../utils/jwt';

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
  autoRefresh?: boolean;
  refreshThreshold?: number;
  /** @deprecated Use onSessionExpired instead */
  onRefreshFailed?: () => void;
  onSessionExpired?: (error: SessionExpiredError) => void;
  tokenStorage?: TokenStorage;
  baseUrl?: string;
  enableCookieSession?: boolean; // When true, sends credentials: 'include' on refresh calls for cross-subdomain cookie auth
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
  // --- Singleton registry (keyed by storageKey) ---
  private static instances = new Map<string, SessionManager>();

  /**
   * Get or create a SessionManager instance for the given config.
   * Returns the same instance when called with the same storageKey/tenantSlug.
   * Mutable config (callbacks, baseUrl) is updated on the existing instance.
   */
  static getInstance(config: SessionConfig = {}): SessionManager {
    const key = SessionManager.resolveStorageKey(config);
    const existing = SessionManager.instances.get(key);
    if (existing) {
      existing.updateConfig(config);
      return existing;
    }
    const instance = new SessionManager(config);
    SessionManager.instances.set(key, instance);
    return instance;
  }

  /** Reset all singleton instances. For testing only. */
  static resetAllInstances(): void {
    for (const instance of SessionManager.instances.values()) {
      instance.destroy();
    }
    SessionManager.instances.clear();
  }

  private static resolveStorageKey(config: SessionConfig): string {
    return config.storageKey || 'auth_tokens';
  }

  private storageKey: string;
  private autoRefresh: boolean;
  private refreshThreshold: number;
  private baseUrl: string;
  private onRefreshFailed?: () => void;
  private onSessionExpired?: (error: SessionExpiredError) => void;
  private tokenStorage: TokenStorage;
  private enableCookieSession: boolean;

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
  private sessionGeneration = 0;
  private consecutiveBackgroundFailures = 0;
  private static readonly MAX_BACKGROUND_FAILURES = 3;

  constructor(config: SessionConfig = {}) {
    SessionManager.validateConfig(config);

    this.storageKey = config.storageKey || 'auth_tokens';

    this.autoRefresh = config.autoRefresh ?? true;
    this.refreshThreshold = config.refreshThreshold || 300000; // 5 minutes
    this.onRefreshFailed = config.onRefreshFailed;
    this.onSessionExpired = config.onSessionExpired;
    this.baseUrl = config.baseUrl || '';
    this.enableCookieSession = config.enableCookieSession ?? false;

    // New config with defaults
    this.proactiveRefreshMargin = config.proactiveRefreshMargin ?? 60000; // 1 minute
    this.refreshQueueTimeout = config.refreshQueueTimeout ?? 10000; // 10 seconds
    this.maxRefreshRetries = config.maxRefreshRetries ?? 3;
    this.retryBackoffBase = config.retryBackoffBase ?? 1000; // 1 second

    this.tokenStorage = config.tokenStorage || this.createTokenStorage(this.storageKey);

    this.attachVisibilityListener();
    this.scheduleProactiveRefresh();
  }

  private static validateConfig(config: SessionConfig): void {
    validateBaseUrl(config.baseUrl);
    validateBoolean('enableCookieSession', config.enableCookieSession);
    validateBoolean('autoRefresh', config.autoRefresh);
    validateNumber('refreshThreshold', config.refreshThreshold, { min: 0 });
    validateNumber('proactiveRefreshMargin', config.proactiveRefreshMargin, { min: 0 });
    validateNumber('refreshQueueTimeout', config.refreshQueueTimeout, { min: 1 });
    validateNumber('maxRefreshRetries', config.maxRefreshRetries, { min: 0 });
    validateNumber('retryBackoffBase', config.retryBackoffBase, { min: 1 });
  }

  /** Update mutable config (callbacks, baseUrl) on an existing instance. */
  private updateConfig(config: SessionConfig): void {
    if (config.onSessionExpired !== undefined) this.onSessionExpired = config.onSessionExpired;
    if (config.onRefreshFailed !== undefined) this.onRefreshFailed = config.onRefreshFailed;
    if (config.baseUrl) this.baseUrl = config.baseUrl;
    if (config.enableCookieSession !== undefined)
      this.enableCookieSession = config.enableCookieSession;
  }

  // --- Storage helpers ---

  // Lazily allocated when localStorage rejects a write. Non-null ⇒ fallback active.
  private memoryStore: Map<string, string> | null = null;

  private createTokenStorage(storageKey: string): TokenStorage {
    if (!SessionManager.probeLocalStorage()) {
      this.activateMemoryFallback();
    }

    return {
      get: () => {
        const stored = this.storageGet(storageKey);
        if (!stored) return null;
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      },
      set: (data: any) => {
        this.storageSet(storageKey, JSON.stringify(data));
      },
      clear: () => {
        this.storageRemove(storageKey);
      },
    };
  }

  private static probeLocalStorage(): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      localStorage.setItem('__sm_probe__', '1');
      localStorage.removeItem('__sm_probe__');
      return true;
    } catch {
      return false;
    }
  }

  private activateMemoryFallback(): Map<string, string> {
    if (!this.memoryStore) {
      this.memoryStore = new Map();
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[SessionManager] localStorage unavailable — falling back to in-memory session. Cross-tab and reload persistence are lost.'
        );
      }
    }
    return this.memoryStore;
  }

  private storageGet(key: string): string | null {
    if (this.memoryStore) return this.memoryStore.get(key) ?? null;
    try {
      return localStorage.getItem(key);
    } catch {
      return this.activateMemoryFallback().get(key) ?? null;
    }
  }

  private storageSet(key: string, value: string): void {
    if (this.memoryStore) {
      this.memoryStore.set(key, value);
      return;
    }
    try {
      localStorage.setItem(key, value);
    } catch {
      // Mid-session storage failure (quota, policy change). Switch to memory
      // so the current session keeps working, then replay the write.
      this.activateMemoryFallback().set(key, value);
    }
  }

  private storageRemove(key: string): void {
    if (this.memoryStore) {
      this.memoryStore.delete(key);
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch {
      // Best-effort: remove failures are ignored; the next write will fall back.
    }
  }

  // --- Token CRUD ---

  setTokens(tokens: TokenData): void {
    validateTokenShape(tokens.accessToken, 'accessToken');
    // Refresh tokens are often opaque, so we only reject obvious type errors.
    // Empty string remains allowed for legacy cookie-session flows.
    if (tokens.refreshToken !== undefined && typeof tokens.refreshToken !== 'string') {
      throw new ConfigurationError('refreshToken', tokens.refreshToken, 'must be a string');
    }
    validateExpiresIn(tokens.expiresIn);
    validateExpiresAt(tokens.expiresAt);

    const expiresAt =
      tokens.expiresAt ||
      (tokens.expiresIn ? Date.now() + tokens.expiresIn * 1000 : undefined) ||
      extractJwtExpiry(tokens.accessToken);

    const tokenData: TokenData = {
      ...tokens,
      expiresAt,
    };

    // Merge with existing storage to preserve non-token data (e.g. user)
    const currentData = this.tokenStorage.get() || {};
    this.tokenStorage.set({ ...currentData, ...tokenData });

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
    const resolvedExpiresAt = expiresAt || extractJwtExpiry(accessToken);

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
      // Already past the proactive refresh point — refresh now
      this.backgroundRefresh();
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

  // --- Visibility-aware rescheduling ---

  private visibilityListener: (() => void) | null = null;

  private attachVisibilityListener(): void {
    if (this.visibilityListener) return;
    if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') {
      return;
    }
    // Browsers throttle/drop setTimeout while the tab is hidden, and clock
    // skew (NTP, laptop sleep) can make a pending timer miss its window.
    // Rescheduling on visibility recomputes from current Date.now().
    this.visibilityListener = () => {
      if (document.visibilityState !== 'visible' || this.isDestroyed) return;
      this.scheduleProactiveRefresh();
    };
    try {
      document.addEventListener('visibilitychange', this.visibilityListener);
    } catch {
      this.visibilityListener = null;
    }
  }

  private detachVisibilityListener(): void {
    if (this.visibilityListener && typeof document !== 'undefined') {
      try {
        document.removeEventListener('visibilitychange', this.visibilityListener);
      } catch {
        // ignore
      }
    }
    this.visibilityListener = null;
  }

  private backgroundRefresh(): void {
    if (this.isDestroyed) return;

    const tokens = this.getTokens();
    if (!tokens?.refreshToken) return;

    // If a refresh is already in progress (e.g. from getValidAccessToken), skip
    if (this.refreshPromise) return;

    const gen = this.sessionGeneration;

    // Use the shared refresh mechanism so refreshPromise is set.
    // This ensures concurrent getValidAccessToken() calls queue behind
    // this refresh instead of starting a duplicate one.
    this.startRefreshAndResolveQueue(tokens.refreshToken)
      .then(() => {
        // Success — reset circuit breaker
        this.consecutiveBackgroundFailures = 0;
      })
      .catch(error => {
        if (error instanceof SessionExpiredError) {
          // Fatal — already handled by startRefreshAndResolveQueue
        } else if (this.sessionGeneration === gen) {
          // Circuit breaker: after MAX_BACKGROUND_FAILURES consecutive transient
          // failures, treat as fatal to prevent infinite retry loops
          this.consecutiveBackgroundFailures++;
          if (this.consecutiveBackgroundFailures >= SessionManager.MAX_BACKGROUND_FAILURES) {
            if (process.env.NODE_ENV === 'development') {
              console.error(
                `[SessionManager] Background refresh failed ${this.consecutiveBackgroundFailures} consecutive times — expiring session`
              );
            }
            this.consecutiveBackgroundFailures = 0;
            this.handleSessionExpired(
              new SessionExpiredError('token_invalid', 'Background refresh failed repeatedly')
            );
            return;
          }

          // Transient — schedule background retry in 30s (only if session wasn't cleared)
          if (process.env.NODE_ENV === 'development') {
            console.warn(
              '[SessionManager] Background refresh failed, retrying in 30s:',
              error.message
            );
          }
          this.backgroundRetryTimerId = setTimeout(() => {
            this.backgroundRefresh();
          }, 30000);
        }
      });
  }

  /**
   * Wait for any in-progress token refresh to settle.
   * Returns true if refresh succeeded, false if it failed or no refresh was pending.
   */
  async waitForPendingRefresh(): Promise<boolean> {
    if (!this.refreshPromise) return false;
    try {
      await this.refreshPromise;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Attempt to restore a session using a backend-set HttpOnly cookie.
   * Sends a refresh request with credentials: 'include' but without a refresh token in the body.
   * If the backend responds with tokens (cookie carried the refresh token), stores them and returns true.
   * If it fails (no cookie, expired, etc.), returns false — this is a normal outcome, not an error.
   *
   * Only works when enableCookieSession is true.
   */
  async attemptCookieSessionRestore(): Promise<boolean> {
    if (!this.enableCookieSession || !this.baseUrl) return false;

    const url = `${this.baseUrl}/auth/refresh`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        credentials: 'include',
      });

      if (!response.ok) return false;

      const data = await response.json();
      if (!data.accessToken) return false;

      this.setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || '',
        expiresIn: data.expiresIn,
      });

      return true;
    } catch {
      return false;
    }
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
    const gen = this.sessionGeneration;

    for (let attempt = 0; attempt <= this.maxRefreshRetries; attempt++) {
      // Bail out if session was cleared during retry (logout, session expired, etc.)
      if (this.sessionGeneration !== gen) {
        throw new SessionExpiredError('token_invalid', 'Session cleared during refresh');
      }

      try {
        await this.performTokenRefresh(refreshToken, gen);
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
  private async performTokenRefresh(refreshToken: string, gen: number): Promise<void> {
    // Use Web Locks API to coordinate refresh across browser tabs.
    // Without this, multiple tabs sharing localStorage can send the same
    // refresh token simultaneously, triggering "reuse detected" on servers
    // that rotate refresh tokens.
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request(`session-refresh:${this.storageKey}`, () =>
        this.performTokenRefreshInner(refreshToken, gen)
      );
    }
    return this.performTokenRefreshInner(refreshToken, gen);
  }

  private async performTokenRefreshInner(refreshToken: string, gen: number): Promise<void> {
    if (!this.baseUrl) {
      throw new Error('Base URL not configured for token refresh');
    }

    // Re-read tokens from storage: another browser tab sharing localStorage
    // may have already refreshed while we were waiting for the lock or retrying.
    const freshTokens = this.getTokens();
    if (
      freshTokens?.accessToken &&
      !this.isTokenExpired(freshTokens) &&
      !this.shouldRefreshToken(freshTokens)
    ) {
      // Another tab already refreshed — the access token in storage is valid.
      // Skip the fetch entirely to avoid sending a stale refresh token
      // (which would trigger "reuse detected" on servers with token rotation).
      return;
    }

    // Use the freshest refresh token from storage. If another tab rotated it,
    // the old RT we received as parameter is now invalid — use the new one.
    const currentRefreshToken = freshTokens?.refreshToken || refreshToken;

    const url = `${this.baseUrl}/auth/refresh`;

    // Extract deviceId from the refresh token JWT if present.
    // Some backends require it as a separate body field for refresh.
    const deviceId = extractJwtClaim(currentRefreshToken, 'deviceId');
    const refreshBody: Record<string, string> = { refreshToken: currentRefreshToken };
    if (deviceId) {
      refreshBody.deviceId = deviceId;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(refreshBody),
        ...(this.enableCookieSession && { credentials: 'include' as RequestCredentials }),
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
      // All 401s are fatal — no retry
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
        // Expired/invalid tokens returned as 400 — also fatal
        if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
          throw new SessionExpiredError('token_invalid', errorMessage);
        }
        // Token reuse / revocation — fatal (server revoked all sessions)
        if (errorMessage.includes('reuse') || errorMessage.includes('revoked')) {
          throw new SessionExpiredError('token_invalid', errorMessage);
        }
        // Other 400s — transient ("User not found", "Token refresh failed: ...")
        throw new Error(`Token refresh failed (400): ${errorMessage}`);
      }

      // 5xx or other — transient
      throw new Error(`Token refresh failed: ${response.status} ${errorMessage}`);
    }

    // Session may have been cleared (logout) while the fetch was in-flight.
    // Do NOT write tokens back to storage if that happened.
    if (this.sessionGeneration !== gen) {
      throw new SessionExpiredError('token_invalid', 'Session cleared during refresh');
    }

    const refreshResponse = await response.json();

    this.setTokens({
      accessToken: refreshResponse.accessToken,
      refreshToken: refreshResponse.refreshToken || currentRefreshToken,
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
    this.sessionGeneration++;
    this.cancelProactiveTimer();
    // clearTokens removes the entire storage entry (tokens + user data)
    this.clearTokens();

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
    // Remove from singleton registry
    SessionManager.instances.delete(this.storageKey);
    this.cancelProactiveTimer();
    this.detachVisibilityListener();
    const error = new SessionExpiredError('token_invalid', 'SessionManager destroyed');
    this.rejectQueue(error);
  }

  // --- JWT helpers ---

  getTokenPayload(): JwtPayload | null {
    const token = this.getTokens()?.accessToken;
    if (!token) return null;
    return (decodeJwt(token)?.payload as unknown as JwtPayload) ?? null;
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
