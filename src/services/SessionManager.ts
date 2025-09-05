export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  expiresIn?: number;
  tokenType?: string;
}

export interface SessionConfig {
  storageKey?: string;
  autoRefresh?: boolean;
  refreshThreshold?: number;
  onRefreshFailed?: () => void;
  tokenStorage?: any;
  baseUrl?: string; // Base URL for API calls
}

export class SessionManager {
  private storageKey: string;
  private autoRefresh: boolean;
  private refreshThreshold: number;
  private baseUrl: string;
  private onRefreshFailed?: () => void;
  private tokenStorage?: any;
  
  // Refresh queue management
  private refreshPromise: Promise<void> | null = null;
  private refreshQueue: Array<{
    resolve: (headers: Record<string, string>) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(config: SessionConfig = {}) {
    this.storageKey = config.storageKey || 'auth_tokens';
    this.autoRefresh = config.autoRefresh ?? true;
    this.refreshThreshold = config.refreshThreshold || 300000; // 5 minutes
    this.onRefreshFailed = config.onRefreshFailed;
    this.tokenStorage = config.tokenStorage;
    this.baseUrl = config.baseUrl || '';
  }

  setTokens(tokens: TokenData): void {
    // Convert expiresIn to expiresAt if needed
    const tokenData: TokenData = {
      ...tokens,
      expiresAt: tokens.expiresAt || (tokens.expiresIn ? Date.now() + (tokens.expiresIn * 1000) : undefined),
    };
    
    if (this.tokenStorage) {
      this.tokenStorage.set(tokenData);
    } else {
      localStorage.setItem(this.storageKey, JSON.stringify(tokenData));
    }
  }

  getTokens(): TokenData | null {
    if (this.tokenStorage) {
      return this.tokenStorage.get();
    }
    
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  clearTokens(): void {
    if (this.tokenStorage) {
      this.tokenStorage.clear();
    } else {
      localStorage.removeItem(this.storageKey);
    }
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
    const userKey = `${this.storageKey}_user`;
    if (this.tokenStorage) {
      // If using custom storage, store user data alongside tokens
      const currentData = this.tokenStorage.get() || {};
      this.tokenStorage.set({ ...currentData, user });
    } else {
      localStorage.setItem(userKey, JSON.stringify(user));
    }
  }

  getUser(): any | null {
    const userKey = `${this.storageKey}_user`;
    if (this.tokenStorage) {
      const data = this.tokenStorage.get();
      return data?.user || null;
    }
    
    const stored = localStorage.getItem(userKey);
    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  clearUser(): void {
    const userKey = `${this.storageKey}_user`;
    if (this.tokenStorage) {
      const currentData = this.tokenStorage.get() || {};
      delete currentData.user;
      this.tokenStorage.set(currentData);
    } else {
      localStorage.removeItem(userKey);
    }
  }

  clearSession(): void {
    this.clearTokens();
    this.clearUser();
  }

  hasValidSession(): boolean {
    const tokens = this.getTokens();
    return tokens !== null && !this.isTokenExpired(tokens);
  }
}
