import { SessionManager } from '../../../src/services/SessionManager.js';
import { SessionExpiredError } from '../../../src/errors/SessionErrors.js';
import type { SharedStorage } from '../core/shared-storage.js';
import type { SimAudit } from '../core/audit.js';

export interface BrowserTabConfig {
  id: string;
  storage: SharedStorage;
  baseUrl: string;
  audit: SimAudit;
  /** Called when session expires */
  onSessionExpired?: (tabId: string, error: SessionExpiredError) => void;
}

/**
 * Simulates a browser tab with its own SessionManager instance.
 * Multiple tabs share the same storage (simulating localStorage).
 */
export class BrowserTab {
  readonly id: string;
  readonly sessionManager: SessionManager;
  private audit: SimAudit;
  private sessionExpired = false;
  private sessionExpiredError: SessionExpiredError | null = null;
  private apiCallCount = 0;
  private apiErrorCount = 0;

  constructor(config: BrowserTabConfig) {
    this.id = config.id;
    this.audit = config.audit;

    // Each tab creates its own SessionManager instance with shared storage.
    // Note: In real browsers, each tab has its own JS context but shares localStorage.
    // SessionManager.getInstance uses a singleton per storageKey, which is realistic
    // for a single tab — but for multi-tab simulation we need separate instances.
    this.sessionManager = new SessionManager({
      storageKey: 'sim_auth_tokens',
      tokenStorage: config.storage,
      baseUrl: config.baseUrl,
      autoRefresh: true,
      proactiveRefreshMargin: 60000,
      refreshQueueTimeout: 10000,
      maxRefreshRetries: 3,
      retryBackoffBase: 1000,
      onSessionExpired: (error: SessionExpiredError) => {
        this.sessionExpired = true;
        this.sessionExpiredError = error;
        this.audit.logAction({
          tick: 0,
          simTime: new Date().toISOString(),
          action: 'session-expired',
          actor: { type: 'tab', id: this.id },
          result: 'fail',
          error: { code: error.reason, message: error.message },
        });
        config.onSessionExpired?.(this.id, error);
      },
    });
  }

  /** Make an API call (requests a valid access token) */
  async makeApiCall(): Promise<{ success: boolean; token?: string; error?: Error }> {
    this.apiCallCount++;
    try {
      const token = await this.sessionManager.getValidAccessToken();
      return { success: true, token };
    } catch (error) {
      this.apiErrorCount++;
      return { success: false, error: error as Error };
    }
  }

  /** Fire N concurrent API calls */
  async makeConcurrentApiCalls(count: number): Promise<Array<{ success: boolean; token?: string; error?: Error }>> {
    const promises = Array.from({ length: count }, () => this.makeApiCall());
    return Promise.all(promises);
  }

  isSessionExpired(): boolean {
    return this.sessionExpired;
  }

  getSessionExpiredError(): SessionExpiredError | null {
    return this.sessionExpiredError;
  }

  getApiCallCount(): number {
    return this.apiCallCount;
  }

  getApiErrorCount(): number {
    return this.apiErrorCount;
  }

  hasValidSession(): boolean {
    return this.sessionManager.hasValidSession();
  }

  destroy(): void {
    this.sessionManager.destroy();
  }
}
