/**
 * Flow: tenant-switch (agentic)
 *
 * Verifies that switching tenants within the same origin (selector mode)
 * does not leak session state between tenants.
 *
 * Spec: qa/flows/smoke/tenant-switch.md
 *
 * This is the agentic (exploratory) implementation — run via:
 *   yarn vitest run --config qa/vitest.config.ts \
 *     qa/simulator/scenarios/flow-tenant-switch.agentic.test.ts
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  startScenario,
  loginTab,
  refreshRequestCount,
  expectNoFalseLogout,
  teardown,
  type Scenario,
} from '../../harness/index.js';
import { makeJwt } from '../core/mock-fetch.js';

interface JwtPayload {
  tenantId?: string;
  userId?: string;
  exp?: number;
  [k: string]: unknown;
}

function decodeJwt(token: string): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error(`invalid jwt shape: ${token}`);
  }
  const json = Buffer.from(parts[1], 'base64').toString('utf8');
  return JSON.parse(json) as JwtPayload;
}

describe('Flow: tenant-switch (agentic)', () => {
  let s: Scenario;

  afterEach(() => {
    if (s) teardown(s);
    vi.restoreAllMocks();
  });

  it('switching tenants clears previous session and does not leak state', async () => {
    s = startScenario('tenant-switch');

    // Step 1+2: Log in a tab. The default loginTab sets initial tokens with
    // the mock server's default tenantId ("sim-tenant"), so immediately
    // override them with a tenant-a JWT via setTokens().
    const tab = loginTab(s, 'tab-1');

    const tenantAAccessToken = makeJwt(Date.now() + 15 * 60 * 1000, {
      tenantId: 'tenant-a',
      userId: 'user-a',
    });
    const tenantARefreshToken = `rt_tenantA_${Date.now()}`;

    tab.sessionManager.setTokens({
      accessToken: tenantAAccessToken,
      refreshToken: tenantARefreshToken,
      expiresIn: 900,
    });

    // Step 3: Record access token.
    const recordedA = tab.sessionManager.getAccessToken();
    expect(recordedA).toBe(tenantAAccessToken);

    const payloadA = decodeJwt(recordedA!);
    expect(payloadA.tenantId).toBe('tenant-a');

    // Sanity: storage currently holds tenant-a tokens.
    const storageDuringA = s.ctx.storage.peek() as {
      accessToken?: string;
      refreshToken?: string;
    } | null;
    expect(storageDuringA).not.toBeNull();
    expect(storageDuringA!.refreshToken).toBe(tenantARefreshToken);
    expect(storageDuringA!.accessToken).toBe(tenantAAccessToken);
    expect(decodeJwt(storageDuringA!.accessToken!).tenantId).toBe('tenant-a');

    // Step 4a: Simulate a tenant switch — clear session.
    tab.sessionManager.clearSession();

    // Assertion: after clearSession, storage must be empty.
    const storageAfterClear = s.ctx.storage.peek();
    expect(storageAfterClear).toBeNull();
    expect(tab.sessionManager.getAccessToken()).toBeNull();
    expect(tab.sessionManager.hasValidSession()).toBe(false);

    // Step 4b: Log in again with a tenant-b token.
    const tenantBAccessToken = makeJwt(Date.now() + 15 * 60 * 1000, {
      tenantId: 'tenant-b',
      userId: 'user-b',
    });
    const tenantBRefreshToken = `rt_tenantB_${Date.now()}`;

    tab.sessionManager.setTokens({
      accessToken: tenantBAccessToken,
      refreshToken: tenantBRefreshToken,
      expiresIn: 900,
    });

    const recordedB = tab.sessionManager.getAccessToken();
    expect(recordedB).toBe(tenantBAccessToken);

    // Step 5: New token must be different.
    expect(recordedB).not.toBe(recordedA);

    // Assertion: new session has the new tenant id in its JWT payload.
    const payloadB = decodeJwt(recordedB!);
    expect(payloadB.tenantId).toBe('tenant-b');
    expect(payloadB.userId).toBe('user-b');

    // Assertion: no cross-tenant token leakage. Storage should reference
    // tenant-b only — tenant-a's refresh token must not be present and the
    // decoded access token must belong to tenant-b.
    const storageAfterB = s.ctx.storage.peek() as {
      accessToken?: string;
      refreshToken?: string;
    } | null;
    expect(storageAfterB).not.toBeNull();
    expect(storageAfterB!.refreshToken).toBe(tenantBRefreshToken);
    expect(storageAfterB!.refreshToken).not.toBe(tenantARefreshToken);
    expect(storageAfterB!.accessToken).toBe(tenantBAccessToken);
    const storedPayload = decodeJwt(storageAfterB!.accessToken!);
    expect(storedPayload.tenantId).toBe('tenant-b');
    expect(storedPayload.tenantId).not.toBe('tenant-a');

    // Step 6: refreshRequestCount should be 0 — no explicit refreshes were
    // triggered anywhere in this flow.
    expect(refreshRequestCount(s)).toBe(0);

    // The tab should not have received onSessionExpired during a clean switch.
    expectNoFalseLogout(s, { expectSessionLoss: false });

    // Final session should be valid.
    expect(tab.sessionManager.hasValidSession()).toBe(true);
  });
});
