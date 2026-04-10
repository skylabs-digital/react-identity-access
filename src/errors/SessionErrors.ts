/**
 * Session error classes for deterministic token refresh handling.
 *
 * These errors allow consumers to distinguish between:
 * - Fatal session errors (refresh token invalid → must logout)
 * - Timeout errors (queue wait exceeded → can retry)
 * - Transient refresh errors (network issues → system keeps retrying)
 */

export type SessionExpiredReason = 'token_expired' | 'token_invalid' | 'user_inactive';

/**
 * Thrown when the refresh token is definitively invalid and the session must end.
 * Consumers should redirect to login when catching this error.
 */
export class SessionExpiredError extends Error {
  public readonly reason: SessionExpiredReason;

  constructor(reason: SessionExpiredReason, message?: string) {
    const defaultMessages: Record<SessionExpiredReason, string> = {
      token_expired: 'Refresh token has expired',
      token_invalid: 'Refresh token is invalid',
      user_inactive: 'User account is inactive',
    };
    super(message || defaultMessages[reason]);
    this.name = 'SessionExpiredError';
    this.reason = reason;
  }
}

/**
 * Thrown when a queued request exceeds its timeout waiting for a token refresh.
 * The refresh may still be in progress — the caller can retry.
 */
export class TokenRefreshTimeoutError extends Error {
  public readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Token refresh timed out after ${timeoutMs}ms`);
    this.name = 'TokenRefreshTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Thrown when token refresh fails after all retries due to transient errors.
 * The proactive timer will keep retrying in the background.
 */
export class TokenRefreshError extends Error {
  public readonly attempts: number;
  public readonly lastError?: Error;

  constructor(attempts: number, lastError?: Error) {
    super(
      `Token refresh failed after ${attempts} attempts: ${lastError?.message || 'Unknown error'}`
    );
    this.name = 'TokenRefreshError';
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

/**
 * Thrown synchronously when a configuration value is invalid (wrong type,
 * out of range, dangerous scheme). Raised at construction time so callers
 * get immediate feedback.
 */
export class ConfigurationError extends Error {
  public readonly field: string;
  public readonly received: unknown;

  constructor(field: string, received: unknown, reason: string) {
    super(`Invalid configuration "${field}": ${reason} (received: ${describeValue(received)})`);
    this.name = 'ConfigurationError';
    this.field = field;
    this.received = received;
  }
}

function describeValue(v: unknown): string {
  if (v === undefined) return 'undefined';
  try {
    const json = JSON.stringify(v);
    if (json === undefined) return typeof v;
    return json.length > 50 ? `${json.slice(0, 47)}...` : json;
  } catch {
    return typeof v;
  }
}
