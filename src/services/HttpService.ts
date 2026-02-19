import type { SessionManager } from './SessionManager';

export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  skipAuth?: boolean; // Skip automatic auth header injection
}

export class HttpService {
  private baseUrl: string;
  private timeout: number;
  private sessionManager?: SessionManager;

  constructor(baseUrl: string, timeout = 10000) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = timeout;
  }

  setSessionManager(sessionManager: SessionManager): void {
    this.sessionManager = sessionManager;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  private async executeRequest<T>(
    method: string,
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const requestTimeout = options?.timeout || this.timeout;

    // Inject auth headers via SessionManager.getValidAccessToken()
    // SessionManager handles refresh, queue, retry, and error classification
    let requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    if (!options?.skipAuth && this.sessionManager) {
      // SessionManager handles refresh, queue, retry, and error classification.
      // Throws SessionExpiredError | TokenRefreshTimeoutError | TokenRefreshError
      // which propagate to caller — they decide what to do.
      const accessToken = await this.sessionManager.getValidAccessToken();
      requestHeaders = { ...requestHeaders, Authorization: `Bearer ${accessToken}` };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), requestTimeout);

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${requestTimeout}ms`);
      }

      throw error;
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.executeRequest<T>('GET', endpoint, undefined, options);
  }

  async post<T>(endpoint: string, data: any, options?: RequestOptions): Promise<T> {
    return this.executeRequest<T>('POST', endpoint, data, options);
  }

  async put<T>(endpoint: string, data: any, options?: RequestOptions): Promise<T> {
    return this.executeRequest<T>('PUT', endpoint, data, options);
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.executeRequest<T>('DELETE', endpoint, undefined, options);
  }
}
