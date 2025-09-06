export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  skipAuth?: boolean; // Skip automatic auth header injection
  skipRetry?: boolean; // Skip automatic retry on 401
}

export class HttpService {
  private baseUrl: string;
  private timeout: number;
  private sessionManager?: any; // SessionManager instance

  constructor(baseUrl: string, timeout = 10000) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = timeout;
  }

  setSessionManager(sessionManager: any): void {
    this.sessionManager = sessionManager;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.executeRequest<T>(method, endpoint, data, options, false);
  }

  private async executeRequest<T>(
    method: string,
    endpoint: string,
    data?: any,
    options?: RequestOptions,
    isRetry = false
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const requestTimeout = options?.timeout || this.timeout;

    // Inject auth headers automatically unless skipAuth is true
    let requestHeaders = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    if (!options?.skipAuth && this.sessionManager) {
      try {
        const authHeaders = await this.sessionManager.getAuthHeaders();
        requestHeaders = { ...requestHeaders, ...authHeaders };
      } catch (error) {
        // If auth header injection fails, continue without auth
        console.warn('Failed to inject auth headers:', error);
      }
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

      // Handle 401 Unauthorized with automatic retry
      if (response.status === 401 && !options?.skipRetry && !isRetry && this.sessionManager) {
        try {
          // Force token refresh by clearing current tokens and getting new auth headers
          const tokens = this.sessionManager.getTokens();
          if (tokens?.refreshToken) {
            // Trigger refresh through getAuthHeaders with expired token
            await this.sessionManager.getAuthHeaders();

            // Retry the original request
            return this.executeRequest<T>(method, endpoint, data, options, true);
          }
        } catch {
          // If refresh fails, throw the original 401 error
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

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
    return this.request<T>('GET', endpoint, undefined, options);
  }

  async post<T>(endpoint: string, data: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', endpoint, data, options);
  }

  async put<T>(endpoint: string, data: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }
}
