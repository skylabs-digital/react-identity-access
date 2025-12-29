import { describe, it, expect } from 'vitest';
import {
  encodeAuthTokens,
  decodeAuthTokens,
  buildUrlWithAuthTokens,
  appendAuthTokensToUrl,
  AUTH_TRANSFER_PARAM,
} from '../utils/crossDomainAuth';

describe('crossDomainAuth', () => {
  const sampleTokens = {
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-access-token',
    refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-refresh-token',
    expiresIn: 3600,
  };

  describe('encodeAuthTokens / decodeAuthTokens', () => {
    it('should encode and decode tokens correctly', () => {
      const encoded = encodeAuthTokens(sampleTokens);
      const decoded = decodeAuthTokens(encoded);

      expect(decoded).toEqual(sampleTokens);
    });

    it('should produce URL-safe encoded string', () => {
      const encoded = encodeAuthTokens(sampleTokens);

      // Should not contain characters that need URL encoding
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
    });

    it('should return null for invalid encoded string', () => {
      expect(decodeAuthTokens('invalid-base64!')).toBe(null);
      expect(decodeAuthTokens('')).toBe(null);
    });

    it('should return null for valid base64 but invalid structure', () => {
      const invalidPayload = btoa(JSON.stringify({ foo: 'bar' }));
      expect(decodeAuthTokens(invalidPayload)).toBe(null);
    });

    it('should handle tokens with special characters', () => {
      const tokensWithSpecial = {
        accessToken: 'token+with/special=chars',
        refreshToken: 'another+token/here=',
        expiresIn: 7200,
      };

      const encoded = encodeAuthTokens(tokensWithSpecial);
      const decoded = decodeAuthTokens(encoded);

      expect(decoded).toEqual(tokensWithSpecial);
    });

    it('should handle roundtrip encoding/decoding', () => {
      // Test that we can encode, put in URL, extract from URL, and decode
      const encoded = encodeAuthTokens(sampleTokens);
      const urlWithTokens = `https://example.com?${AUTH_TRANSFER_PARAM}=${encoded}`;
      const url = new URL(urlWithTokens);
      const extractedEncoded = url.searchParams.get(AUTH_TRANSFER_PARAM);
      const decoded = decodeAuthTokens(extractedEncoded!);

      expect(decoded).toEqual(sampleTokens);
    });
  });

  describe('buildUrlWithAuthTokens', () => {
    it('should build URL with auth tokens', () => {
      const result = buildUrlWithAuthTokens(
        'https://tenant.example.com',
        sampleTokens,
        '/dashboard'
      );

      expect(result).toContain('https://tenant.example.com/dashboard');
      expect(result).toContain(`${AUTH_TRANSFER_PARAM}=`);

      // Verify tokens can be decoded from URL
      const url = new URL(result);
      const encoded = url.searchParams.get(AUTH_TRANSFER_PARAM);
      expect(decodeAuthTokens(encoded!)).toEqual(sampleTokens);
    });

    it('should use root path when path not provided', () => {
      const result = buildUrlWithAuthTokens('https://tenant.example.com', sampleTokens);

      expect(result).toContain('https://tenant.example.com/');
    });

    it('should preserve protocol', () => {
      const httpResult = buildUrlWithAuthTokens('http://tenant.example.com', sampleTokens);
      const httpsResult = buildUrlWithAuthTokens('https://tenant.example.com', sampleTokens);

      expect(httpResult).toMatch(/^http:\/\//);
      expect(httpsResult).toMatch(/^https:\/\//);
    });
  });

  describe('appendAuthTokensToUrl', () => {
    it('should append auth tokens to existing URL', () => {
      const result = appendAuthTokensToUrl(
        'https://tenant.example.com/dashboard?existing=param',
        sampleTokens
      );

      expect(result).toContain('existing=param');
      expect(result).toContain(`${AUTH_TRANSFER_PARAM}=`);

      // Verify tokens can be decoded
      const url = new URL(result);
      const encoded = url.searchParams.get(AUTH_TRANSFER_PARAM);
      expect(decodeAuthTokens(encoded!)).toEqual(sampleTokens);
    });

    it('should work with URL without existing params', () => {
      const result = appendAuthTokensToUrl('https://tenant.example.com/dashboard', sampleTokens);

      expect(result).toContain(`${AUTH_TRANSFER_PARAM}=`);
    });

    it('should preserve path and hash', () => {
      const result = appendAuthTokensToUrl(
        'https://tenant.example.com/path/to/page#section',
        sampleTokens
      );

      expect(result).toContain('/path/to/page');
      expect(result).toContain('#section');
    });
  });

  describe('AUTH_TRANSFER_PARAM', () => {
    it('should be _auth', () => {
      expect(AUTH_TRANSFER_PARAM).toBe('_auth');
    });
  });
});
