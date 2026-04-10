import { ConfigurationError } from '../errors/SessionErrors';
import { decodeJwt } from './jwt';

const DANGEROUS_SCHEMES = /^(javascript|data|vbscript|file):/i;
const SAFE_SCHEMES = /^https?:\/\//i;

/**
 * Validate a baseUrl string. Empty/undefined is allowed (standalone mode and
 * inheritance from AppProvider both rely on this), but any non-empty value
 * must start with http:// or https://. Dangerous schemes (javascript:, data:,
 * vbscript:, file:) are rejected with a typed error.
 */
export function validateBaseUrl(baseUrl: unknown, field = 'baseUrl'): void {
  if (baseUrl === undefined || baseUrl === null || baseUrl === '') return;
  if (typeof baseUrl !== 'string') {
    throw new ConfigurationError(field, baseUrl, 'must be a string');
  }
  if (DANGEROUS_SCHEMES.test(baseUrl)) {
    throw new ConfigurationError(field, baseUrl, 'dangerous URL scheme is not allowed');
  }
  if (!SAFE_SCHEMES.test(baseUrl)) {
    throw new ConfigurationError(field, baseUrl, 'must start with http:// or https://');
  }
}

/**
 * Validate a numeric config option. Rejects NaN, Infinity, non-numbers, and
 * values outside [min, max]. `min` defaults to 0 (non-negative); pass a
 * positive `min` to require strictly positive.
 */
export function validateNumber(
  field: string,
  value: unknown,
  options: { min?: number; max?: number } = {}
): void {
  if (value === undefined) return;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ConfigurationError(field, value, 'must be a finite number');
  }
  const { min = 0, max = Number.MAX_SAFE_INTEGER } = options;
  if (value < min) {
    throw new ConfigurationError(field, value, `must be >= ${min}`);
  }
  if (value > max) {
    throw new ConfigurationError(field, value, `must be <= ${max}`);
  }
}

/**
 * Validate a boolean config option. Rejects strings like "true"/"false" that
 * callers sometimes pass by accident.
 */
export function validateBoolean(field: string, value: unknown): void {
  if (value === undefined) return;
  if (typeof value !== 'boolean') {
    throw new ConfigurationError(field, value, 'must be a boolean');
  }
}

/**
 * Validate an access token's structural shape. Tokens with dots are treated
 * as JWTs and must decode cleanly; tokens without dots are treated as opaque
 * and accepted as-is.
 */
export function validateTokenShape(token: unknown, field = 'accessToken'): void {
  if (typeof token !== 'string' || token.length === 0) {
    throw new ConfigurationError(field, token, 'must be a non-empty string');
  }

  if (!token.includes('.')) return;

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new ConfigurationError(
      field,
      `<${parts.length}-segment token>`,
      'JWT must have exactly 3 segments (header.payload.signature)'
    );
  }

  if (decodeJwt(token) === null) {
    throw new ConfigurationError(
      field,
      '<malformed JWT>',
      'JWT header or payload is not valid base64url-encoded JSON'
    );
  }
}

/**
 * Validate an expiresIn value (seconds until access token expires).
 * Must be a finite positive number if provided. Rejects 0, NaN, Infinity,
 * negative, and non-number inputs.
 */
export function validateExpiresIn(value: unknown): void {
  if (value === undefined) return;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new ConfigurationError('expiresIn', value, 'must be a finite positive number (seconds)');
  }
}

/**
 * Validate an absolute expiresAt timestamp (ms since epoch). Same rules as
 * expiresIn: finite, positive.
 */
export function validateExpiresAt(value: unknown): void {
  if (value === undefined) return;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new ConfigurationError(
      'expiresAt',
      value,
      'must be a finite positive timestamp (ms since epoch)'
    );
  }
}
