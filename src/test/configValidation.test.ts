import { describe, it, expect } from 'vitest';
import {
  validateBaseUrl,
  validateNumber,
  validateBoolean,
  validateTokenShape,
  validateExpiresIn,
  validateExpiresAt,
} from '../utils/configValidation';
import { ConfigurationError } from '../errors/SessionErrors';

describe('configValidation', () => {
  describe('validateBaseUrl', () => {
    it('accepts empty / undefined / null (inherit or standalone)', () => {
      expect(() => validateBaseUrl(undefined)).not.toThrow();
      expect(() => validateBaseUrl(null)).not.toThrow();
      expect(() => validateBaseUrl('')).not.toThrow();
    });

    it('accepts http and https URLs', () => {
      expect(() => validateBaseUrl('http://api.example.com')).not.toThrow();
      expect(() => validateBaseUrl('https://api.example.com')).not.toThrow();
      expect(() => validateBaseUrl('https://api.example.com/v1/path')).not.toThrow();
    });

    it('rejects javascript: scheme (XSS vector)', () => {
      expect(() => validateBaseUrl('javascript:alert(1)')).toThrow(ConfigurationError);
      expect(() => validateBaseUrl('JavaScript:alert(1)')).toThrow(ConfigurationError);
    });

    it('rejects data: scheme', () => {
      expect(() => validateBaseUrl('data:text/html,<script>alert(1)</script>')).toThrow(
        ConfigurationError
      );
    });

    it('rejects vbscript: and file: schemes', () => {
      expect(() => validateBaseUrl('vbscript:msgbox')).toThrow(ConfigurationError);
      expect(() => validateBaseUrl('file:///etc/passwd')).toThrow(ConfigurationError);
    });

    it('rejects non-http(s) schemes with clear message', () => {
      expect(() => validateBaseUrl('ftp://host')).toThrow(/must start with http/);
    });

    it('rejects non-string values', () => {
      expect(() => validateBaseUrl(123)).toThrow(/must be a string/);
      expect(() => validateBaseUrl({})).toThrow(/must be a string/);
    });

    it('honors the field name in error messages', () => {
      try {
        validateBaseUrl('javascript:alert(1)', 'AuthProvider.baseUrl');
      } catch (e) {
        expect((e as ConfigurationError).field).toBe('AuthProvider.baseUrl');
      }
    });
  });

  describe('validateNumber', () => {
    it('accepts undefined (optional)', () => {
      expect(() => validateNumber('field', undefined)).not.toThrow();
    });

    it('accepts finite numbers in range', () => {
      expect(() => validateNumber('field', 0)).not.toThrow();
      expect(() => validateNumber('field', 42)).not.toThrow();
      expect(() => validateNumber('field', 1.5)).not.toThrow();
    });

    it('rejects NaN and Infinity', () => {
      expect(() => validateNumber('f', NaN)).toThrow(/finite number/);
      expect(() => validateNumber('f', Infinity)).toThrow(/finite number/);
      expect(() => validateNumber('f', -Infinity)).toThrow(/finite number/);
    });

    it('rejects non-number types', () => {
      expect(() => validateNumber('f', '5')).toThrow(/finite number/);
      expect(() => validateNumber('f', null)).toThrow(/finite number/);
      expect(() => validateNumber('f', {})).toThrow(/finite number/);
    });

    it('enforces min bound', () => {
      expect(() => validateNumber('f', -1)).toThrow(/>= 0/);
      expect(() => validateNumber('f', 0, { min: 1 })).toThrow(/>= 1/);
    });

    it('enforces max bound', () => {
      expect(() => validateNumber('f', 100, { max: 50 })).toThrow(/<= 50/);
    });
  });

  describe('validateBoolean', () => {
    it('accepts undefined and booleans', () => {
      expect(() => validateBoolean('f', undefined)).not.toThrow();
      expect(() => validateBoolean('f', true)).not.toThrow();
      expect(() => validateBoolean('f', false)).not.toThrow();
    });

    it('rejects truthy strings (common mistake)', () => {
      expect(() => validateBoolean('f', 'true')).toThrow(/must be a boolean/);
      expect(() => validateBoolean('f', 'false')).toThrow(/must be a boolean/);
      expect(() => validateBoolean('f', 1)).toThrow(/must be a boolean/);
      expect(() => validateBoolean('f', 0)).toThrow(/must be a boolean/);
    });
  });

  describe('validateTokenShape', () => {
    function makeJwt(payload: object = { sub: 'u1' }): string {
      const h = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
      const p = btoa(JSON.stringify(payload));
      return `${h}.${p}.sig`;
    }

    it('accepts valid 3-segment JWTs', () => {
      expect(() => validateTokenShape(makeJwt())).not.toThrow();
    });

    it('accepts opaque tokens (no dots)', () => {
      expect(() => validateTokenShape('opaque-token-abc123')).not.toThrow();
    });

    it('rejects empty string and non-string', () => {
      expect(() => validateTokenShape('')).toThrow(/non-empty string/);
      expect(() => validateTokenShape(null)).toThrow(/non-empty string/);
      expect(() => validateTokenShape(42)).toThrow(/non-empty string/);
    });

    it('rejects 2-segment "JWT-ish" tokens', () => {
      expect(() => validateTokenShape('header.payload')).toThrow(/3 segments/);
    });

    it('rejects 4-segment tokens', () => {
      expect(() => validateTokenShape('a.b.c.d')).toThrow(/3 segments/);
    });

    it('rejects JWT with non-base64url header', () => {
      expect(() => validateTokenShape('!!!not-base64!!!.eyJhIjoxfQ.sig')).toThrow(
        /header.*not valid/
      );
    });

    it('rejects JWT with non-JSON payload after decode', () => {
      const badPayload = btoa('not-json');
      expect(() => validateTokenShape(`eyJhbGciOiJub25lIn0.${badPayload}.sig`)).toThrow(
        /payload.*not valid/
      );
    });
  });

  describe('validateExpiresIn', () => {
    it('accepts undefined and positive finite numbers', () => {
      expect(() => validateExpiresIn(undefined)).not.toThrow();
      expect(() => validateExpiresIn(1)).not.toThrow();
      expect(() => validateExpiresIn(3600)).not.toThrow();
    });

    it('rejects zero, negative, NaN, Infinity', () => {
      expect(() => validateExpiresIn(0)).toThrow(ConfigurationError);
      expect(() => validateExpiresIn(-1)).toThrow(ConfigurationError);
      expect(() => validateExpiresIn(NaN)).toThrow(ConfigurationError);
      expect(() => validateExpiresIn(Infinity)).toThrow(ConfigurationError);
    });
  });

  describe('validateExpiresAt', () => {
    it('accepts undefined and positive timestamps', () => {
      expect(() => validateExpiresAt(undefined)).not.toThrow();
      expect(() => validateExpiresAt(Date.now())).not.toThrow();
      expect(() => validateExpiresAt(1)).not.toThrow();
    });

    it('rejects zero, negative, NaN, Infinity', () => {
      expect(() => validateExpiresAt(0)).toThrow(ConfigurationError);
      expect(() => validateExpiresAt(-1)).toThrow(ConfigurationError);
      expect(() => validateExpiresAt(NaN)).toThrow(ConfigurationError);
    });
  });
});
