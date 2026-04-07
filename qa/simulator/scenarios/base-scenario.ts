import { SessionManager } from '../../../src/services/SessionManager.js';
import { MockServer } from '../core/mock-fetch.js';
import { SimRng } from '../core/rng.js';
import { SimAudit } from '../core/audit.js';
import { SharedStorage } from '../core/shared-storage.js';
import { BrowserTab } from '../actors/browser-tab.js';
import { ApiCaller } from '../actors/api-caller.js';
import type { MockServerConfig } from '../types.js';

export const BASE_URL = 'http://sim-api';

export interface ScenarioContext {
  rng: SimRng;
  audit: SimAudit;
  server: MockServer;
  storage: SharedStorage;
  apiCaller: ApiCaller;
}

/**
 * Create a fresh scenario context with mock server, shared storage, and audit.
 * Installs the mock fetch globally.
 */
export function createScenarioContext(
  seed?: string,
  serverConfig?: Partial<MockServerConfig>,
): ScenarioContext {
  const rng = new SimRng(seed);
  const audit = new SimAudit();
  const server = new MockServer(serverConfig ?? {}, rng, audit);
  const storage = new SharedStorage();
  const apiCaller = new ApiCaller(audit);

  // Install mock fetch globally
  vi.stubGlobal('fetch', server.createFetchMock());

  return { rng, audit, server, storage, apiCaller };
}

/**
 * Create a browser tab with initial tokens already set.
 * Simulates a user who is already logged in.
 */
export function createLoggedInTab(
  ctx: ScenarioContext,
  tabId: string,
  onSessionExpired?: (tabId: string, error: any) => void,
): BrowserTab {
  const tab = new BrowserTab({
    id: tabId,
    storage: ctx.storage,
    baseUrl: BASE_URL,
    audit: ctx.audit,
    onSessionExpired,
  });

  // Set initial tokens if storage is empty
  if (!ctx.storage.peek()) {
    const accessToken = ctx.server.issueAccessToken();
    const refreshToken = ctx.server.issueRefreshToken();
    tab.sessionManager.setTokens({
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes
    });
  }

  return tab;
}

/**
 * Clean up after scenario: destroy tabs, reset singleton registry.
 */
export function cleanupScenario(tabs: BrowserTab[]): void {
  for (const tab of tabs) {
    tab.destroy();
  }
  SessionManager.resetAllInstances();
}
