import type { SimRng } from './rng.js';
import type { SimAudit } from './audit.js';
import type { MockServerConfig } from '../types.js';
import { DEFAULT_SERVER_CONFIG } from '../types.js';

/**
 * Creates a JWT-like token string with embedded exp claim.
 * Not a real JWT — just base64-encoded JSON that SessionManager can decode.
 */
export function makeJwt(expiresAtMs: number, extra?: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      userId: 'sim-user-1',
      email: 'sim@test.com',
      phoneNumber: null,
      userType: 'user',
      role: 'admin',
      tenantId: 'sim-tenant',
      appId: 'sim-app',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresAtMs / 1000),
      ...extra,
    })
  );
  const sig = btoa('sim-signature');
  return `${header}.${payload}.${sig}`;
}

interface TokenRecord {
  refreshToken: string;
  used: boolean;
  createdAt: number;
  expiresAt: number;
}

/**
 * Programmable mock server that simulates the /auth/refresh endpoint.
 *
 * Tracks token state: which refresh tokens are valid, which have been used,
 * and enforces rotation + reuse detection policies.
 */
export class MockServer {
  private config: MockServerConfig;
  private rng: SimRng;
  private audit: SimAudit;
  private tokenCounter = 0;

  // Track all issued refresh tokens
  private refreshTokens = new Map<string, TokenRecord>();

  // Track fetch calls for assertions
  private fetchCallLog: Array<{
    time: number;
    refreshToken: string;
    result: 'ok' | 'fail' | 'network-error' | 'server-error' | 'reuse-detected' | 'expired' | 'invalid';
    responseToken?: string;
  }> = [];

  // Temporary overrides for failure injection
  private nextResponseOverride: (() => Response | Promise<Response>) | null = null;
  private temporaryFailureCount = 0;
  private temporaryFailureType: 'network' | '500' | null = null;
  private skipLatency = true; // Skip latency by default (fake timers make it slow)

  constructor(config: Partial<MockServerConfig>, rng: SimRng, audit: SimAudit) {
    this.config = { ...DEFAULT_SERVER_CONFIG, ...config };
    this.rng = rng;
    this.audit = audit;
  }

  /** Issue an initial refresh token (simulates login) */
  issueRefreshToken(): string {
    const rt = `rt_${++this.tokenCounter}_${Date.now()}`;
    this.refreshTokens.set(rt, {
      refreshToken: rt,
      used: false,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.refreshTokenLifetimeMs,
    });
    return rt;
  }

  /** Issue an initial access token (simulates login) */
  issueAccessToken(): string {
    return makeJwt(Date.now() + this.config.accessTokenLifetimeMs);
  }

  /** Get the fetch mock function to install as global fetch */
  createFetchMock(): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();

      // Only intercept /auth/refresh
      if (!url.endsWith('/auth/refresh')) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      // Parse request body
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const requestedRT = body.refreshToken as string;

      // Check for response override
      if (this.nextResponseOverride) {
        const override = this.nextResponseOverride;
        this.nextResponseOverride = null;
        return override();
      }

      // Check for temporary failure injection
      if (this.temporaryFailureCount > 0) {
        this.temporaryFailureCount--;
        if (this.temporaryFailureType === 'network') {
          this.logFetchCall(requestedRT, 'network-error');
          throw new TypeError('Failed to fetch');
        }
        if (this.temporaryFailureType === '500') {
          this.logFetchCall(requestedRT, 'server-error');
          return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
            status: 500,
            statusText: 'Internal Server Error',
          });
        }
      }

      // Simulate response latency (skip when using fake timers to avoid timeout issues)
      // The latency is still tracked in the log for assertion purposes
      const [minLatency, maxLatency] = this.config.responseLatencyMs;
      const latency = this.rng.int(minLatency, maxLatency);
      if (latency > 0 && !this.skipLatency) {
        await new Promise(resolve => setTimeout(resolve, latency));
      }

      // Random network failure
      if (this.config.networkFailureRate > 0 && this.rng.chance(this.config.networkFailureRate)) {
        this.logFetchCall(requestedRT, 'network-error');
        throw new TypeError('Failed to fetch');
      }

      // Random server error
      if (this.config.serverErrorRate > 0 && this.rng.chance(this.config.serverErrorRate)) {
        this.logFetchCall(requestedRT, 'server-error');
        return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
          status: 500,
          statusText: 'Internal Server Error',
        });
      }

      // Validate refresh token
      const record = this.refreshTokens.get(requestedRT);

      if (!record) {
        // Unknown token
        this.logFetchCall(requestedRT, 'invalid');
        return new Response(
          JSON.stringify({ success: false, message: 'Refresh token invalid' }),
          { status: 401 }
        );
      }

      if (record.expiresAt < Date.now()) {
        // Expired refresh token
        this.logFetchCall(requestedRT, 'expired');
        return new Response(
          JSON.stringify({ success: false, message: 'Refresh token expired' }),
          { status: 401 }
        );
      }

      if (record.used && this.config.reuseDetection) {
        // Reuse detected — server revokes all sessions
        this.logFetchCall(requestedRT, 'reuse-detected');
        // Invalidate ALL tokens for this "user"
        for (const [, tr] of this.refreshTokens) {
          tr.expiresAt = 0;
        }
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Refresh token reuse detected — all sessions revoked for security',
          }),
          { status: 400 }
        );
      }

      // Mark as used
      record.used = true;

      // Issue new tokens
      const newAccessToken = makeJwt(Date.now() + this.config.accessTokenLifetimeMs);
      let newRefreshToken: string | undefined;

      if (this.config.rotateRefreshTokens) {
        newRefreshToken = `rt_${++this.tokenCounter}_${Date.now()}`;
        this.refreshTokens.set(newRefreshToken, {
          refreshToken: newRefreshToken,
          used: false,
          createdAt: Date.now(),
          expiresAt: Date.now() + this.config.refreshTokenLifetimeMs,
        });
      }

      this.logFetchCall(requestedRT, 'ok', newRefreshToken);

      return new Response(
        JSON.stringify({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: Math.floor(this.config.accessTokenLifetimeMs / 1000),
        }),
        { status: 200 }
      );
    };
  }

  /** Enable or disable simulated response latency (disabled by default for fake timers) */
  setLatencyEnabled(enabled: boolean): void {
    this.skipLatency = !enabled;
  }

  /** Inject N consecutive failures of the given type */
  injectFailures(count: number, type: 'network' | '500'): void {
    this.temporaryFailureCount = count;
    this.temporaryFailureType = type;
  }

  /** Override the next response completely */
  overrideNextResponse(fn: () => Response | Promise<Response>): void {
    this.nextResponseOverride = fn;
  }

  /** Get the log of all fetch calls for assertions */
  getFetchCallLog() {
    return [...this.fetchCallLog];
  }

  /** Count how many actual refresh requests were made */
  getRefreshRequestCount(): number {
    return this.fetchCallLog.length;
  }

  /** Check if any reuse was detected */
  hadReuseDetection(): boolean {
    return this.fetchCallLog.some(c => c.result === 'reuse-detected');
  }

  /** Reset state for a new simulation */
  reset(): void {
    this.refreshTokens.clear();
    this.fetchCallLog = [];
    this.tokenCounter = 0;
    this.nextResponseOverride = null;
    this.temporaryFailureCount = 0;
    this.temporaryFailureType = null;
  }

  private logFetchCall(
    refreshToken: string,
    result: typeof this.fetchCallLog[number]['result'],
    responseToken?: string,
  ): void {
    this.fetchCallLog.push({
      time: Date.now(),
      refreshToken,
      result,
      responseToken,
    });
  }
}
