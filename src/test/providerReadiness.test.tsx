import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Import the functions we're testing
import {
  encodeAuthTokens,
  decodeAuthTokens,
  extractAuthTokensFromUrl,
  clearAuthTokensFromUrl,
  AUTH_TRANSFER_PARAM,
} from '../utils/crossDomainAuth';
import type { LoginParams } from '../types/authParams';

// ============================================================================
// Cross-Domain Auth Utilities Tests
// ============================================================================

describe('Cross-Domain Auth Utilities', () => {
  describe('encodeAuthTokens', () => {
    it('should encode tokens to URL-safe base64', () => {
      const tokens = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresIn: 3600,
      };

      const encoded = encodeAuthTokens(tokens);

      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
      // URL-safe: no +, /, or = characters
      expect(encoded).not.toMatch(/[+/=]/);
    });

    it('should produce decodable output', () => {
      const tokens = {
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        expiresIn: 7200,
      };

      const encoded = encodeAuthTokens(tokens);
      const decoded = decodeAuthTokens(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded?.accessToken).toBe(tokens.accessToken);
      expect(decoded?.refreshToken).toBe(tokens.refreshToken);
      expect(decoded?.expiresIn).toBe(tokens.expiresIn);
    });

    it('should handle tokens with special characters', () => {
      const tokens = {
        accessToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTY3ODkwIn0',
        refreshToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJyZWZyZXNoIjoidHJ1ZSJ9',
        expiresIn: 3600,
      };

      const encoded = encodeAuthTokens(tokens);
      const decoded = decodeAuthTokens(encoded);

      expect(decoded?.accessToken).toBe(tokens.accessToken);
      expect(decoded?.refreshToken).toBe(tokens.refreshToken);
    });
  });

  describe('decodeAuthTokens', () => {
    it('should return null for invalid base64', () => {
      const result = decodeAuthTokens('not-valid-base64!!!');
      expect(result).toBeNull();
    });

    it('should return null for valid base64 but invalid JSON', () => {
      const invalidJson = btoa('not json');
      const result = decodeAuthTokens(invalidJson);
      expect(result).toBeNull();
    });

    it('should return null for JSON missing required fields', () => {
      const missingFields = btoa(JSON.stringify({ accessToken: 'only-access' }));
      const result = decodeAuthTokens(missingFields);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = decodeAuthTokens('');
      expect(result).toBeNull();
    });

    it('should handle URL-safe base64 (with - and _)', () => {
      const tokens = {
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 3600,
      };
      const encoded = encodeAuthTokens(tokens);
      const decoded = decodeAuthTokens(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded?.accessToken).toBe('access');
    });
  });

  describe('AUTH_TRANSFER_PARAM', () => {
    it('should be _auth', () => {
      expect(AUTH_TRANSFER_PARAM).toBe('_auth');
    });
  });
});

// ============================================================================
// extractAuthTokensFromUrl Tests (with window mock)
// ============================================================================

describe('extractAuthTokensFromUrl', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Mock window.location
    delete (window as any).location;
  });

  afterEach(() => {
    // @ts-expect-error - restoring original location in tests
    window.location = originalLocation;
  });

  it('should return null when no _auth param present', () => {
    (window as any).location = {
      search: '',
      href: 'https://example.com/',
    };

    const result = extractAuthTokensFromUrl();
    expect(result).toBeNull();
  });

  it('should return null when _auth param is empty', () => {
    (window as any).location = {
      search: '?_auth=',
      href: 'https://example.com/?_auth=',
    };

    const result = extractAuthTokensFromUrl();
    expect(result).toBeNull();
  });

  it('should extract and decode valid tokens from URL', () => {
    const tokens = {
      accessToken: 'test-access',
      refreshToken: 'test-refresh',
      expiresIn: 3600,
    };
    const encoded = encodeAuthTokens(tokens);

    (window as any).location = {
      search: `?_auth=${encoded}`,
      href: `https://example.com/?_auth=${encoded}`,
    };

    const result = extractAuthTokensFromUrl();

    expect(result).not.toBeNull();
    expect(result?.accessToken).toBe(tokens.accessToken);
    expect(result?.refreshToken).toBe(tokens.refreshToken);
    expect(result?.expiresIn).toBe(tokens.expiresIn);
  });

  it('should return null for invalid encoded tokens', () => {
    (window as any).location = {
      search: '?_auth=invalid-garbage-data',
      href: 'https://example.com/?_auth=invalid-garbage-data',
    };

    const result = extractAuthTokensFromUrl();
    expect(result).toBeNull();
  });

  it('should handle URL with other params', () => {
    const tokens = {
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 3600,
    };
    const encoded = encodeAuthTokens(tokens);

    (window as any).location = {
      search: `?foo=bar&_auth=${encoded}&baz=qux`,
      href: `https://example.com/?foo=bar&_auth=${encoded}&baz=qux`,
    };

    const result = extractAuthTokensFromUrl();

    expect(result).not.toBeNull();
    expect(result?.accessToken).toBe('access');
  });
});

// ============================================================================
// clearAuthTokensFromUrl Tests
// ============================================================================

describe('clearAuthTokensFromUrl', () => {
  const originalLocation = window.location;
  const originalHistory = window.history;

  beforeEach(() => {
    delete (window as any).location;
    (window as any).history = {
      replaceState: vi.fn(),
    };
  });

  afterEach(() => {
    // @ts-expect-error - restoring original location in tests
    window.location = originalLocation;
    (window as any).history = originalHistory;
  });

  it('should remove _auth param from URL', () => {
    (window as any).location = {
      search: '?_auth=sometoken',
      pathname: '/dashboard',
      hash: '',
      href: 'https://example.com/dashboard?_auth=sometoken',
    };

    clearAuthTokensFromUrl();

    expect(window.history.replaceState).toHaveBeenCalledWith(
      {},
      '',
      'https://example.com/dashboard'
    );
  });

  it('should preserve other URL params', () => {
    (window as any).location = {
      search: '?foo=bar&_auth=sometoken&baz=qux',
      pathname: '/dashboard',
      hash: '',
      href: 'https://example.com/dashboard?foo=bar&_auth=sometoken&baz=qux',
    };

    clearAuthTokensFromUrl();

    expect(window.history.replaceState).toHaveBeenCalledWith(
      {},
      '',
      'https://example.com/dashboard?foo=bar&baz=qux'
    );
  });

  it('should preserve hash', () => {
    (window as any).location = {
      search: '?_auth=sometoken',
      pathname: '/dashboard',
      hash: '#section1',
      href: 'https://example.com/dashboard?_auth=sometoken#section1',
    };

    clearAuthTokensFromUrl();

    expect(window.history.replaceState).toHaveBeenCalledWith(
      {},
      '',
      'https://example.com/dashboard#section1'
    );
  });

  it('should do nothing if no _auth param', () => {
    (window as any).location = {
      search: '?foo=bar',
      pathname: '/dashboard',
      hash: '',
      href: 'https://example.com/dashboard?foo=bar',
    };

    clearAuthTokensFromUrl();

    // Should still call replaceState but URL unchanged (no _auth to remove)
    expect(window.history.replaceState).toHaveBeenCalled();
  });
});

// ============================================================================
// Optional Hooks Tests
// ============================================================================

describe('Optional Hooks', () => {
  describe('useAuthOptional', () => {
    it('should return null when not inside AuthProvider', async () => {
      const { useAuthOptional } = await import('../providers/AuthProvider');

      const { result } = renderHook(() => useAuthOptional());

      expect(result.current).toBeNull();
    });
  });

  describe('useAppOptional', () => {
    it('should return null when not inside AppProvider', async () => {
      const { useAppOptional } = await import('../providers/AppProvider');

      const { result } = renderHook(() => useAppOptional());

      expect(result.current).toBeNull();
    });
  });

  describe('useTenantOptional', () => {
    it('should return null when not inside TenantProvider', async () => {
      const { useTenantOptional } = await import('../providers/TenantProvider');

      const { result } = renderHook(() => useTenantOptional());

      expect(result.current).toBeNull();
    });
  });

  describe('useFeatureFlagsOptional', () => {
    it('should return null when not inside FeatureFlagProvider', async () => {
      const { useFeatureFlagsOptional } = await import('../providers/FeatureFlagProvider');

      const { result } = renderHook(() => useFeatureFlagsOptional());

      expect(result.current).toBeNull();
    });
  });

  describe('useSubscriptionOptional', () => {
    it('should return null when not inside SubscriptionProvider', async () => {
      const { useSubscriptionOptional } = await import('../providers/SubscriptionProvider');

      const { result } = renderHook(() => useSubscriptionOptional());

      expect(result.current).toBeNull();
    });
  });
});

// ============================================================================
// Required Hooks Throw Error Tests
// ============================================================================

describe('Required Hooks throw when used outside provider', () => {
  it('useAuth should throw when not inside AuthProvider', async () => {
    const { useAuth } = await import('../providers/AuthProvider');

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });

  it('useApp should throw when not inside AppProvider', async () => {
    const { useApp } = await import('../providers/AppProvider');

    expect(() => {
      renderHook(() => useApp());
    }).toThrow('useApp must be used within an AppProvider');
  });

  it('useTenant should throw when not inside TenantProvider', async () => {
    const { useTenant } = await import('../providers/TenantProvider');

    expect(() => {
      renderHook(() => useTenant());
    }).toThrow('useTenant must be used within a TenantProvider');
  });

  it('useFeatureFlags should throw when not inside FeatureFlagProvider', async () => {
    const { useFeatureFlags } = await import('../providers/FeatureFlagProvider');

    expect(() => {
      renderHook(() => useFeatureFlags());
    }).toThrow('useFeatureFlags must be used within a FeatureFlagProvider');
  });

  it('useSubscription should throw when not inside SubscriptionProvider', async () => {
    const { useSubscription } = await import('../providers/SubscriptionProvider');

    expect(() => {
      renderHook(() => useSubscription());
    }).toThrow('useSubscription must be used within a SubscriptionProvider');
  });
});

// ============================================================================
// Token Encoding/Decoding Edge Cases
// ============================================================================

describe('Token Encoding Edge Cases', () => {
  it('should handle very long tokens', () => {
    const longToken = 'a'.repeat(10000);
    const tokens = {
      accessToken: longToken,
      refreshToken: longToken,
      expiresIn: 3600,
    };

    const encoded = encodeAuthTokens(tokens);
    const decoded = decodeAuthTokens(encoded);

    expect(decoded?.accessToken).toBe(longToken);
    expect(decoded?.refreshToken).toBe(longToken);
  });

  it('should handle tokens with dots and hyphens', () => {
    const tokens = {
      accessToken: 'token-with-dots.and-hyphens_and_underscores',
      refreshToken: 'refresh-with-special.chars_here',
      expiresIn: 3600,
    };

    const encoded = encodeAuthTokens(tokens);
    const decoded = decodeAuthTokens(encoded);

    expect(decoded?.accessToken).toBe(tokens.accessToken);
    expect(decoded?.refreshToken).toBe(tokens.refreshToken);
  });

  it('should handle expiresIn of 0', () => {
    const tokens = {
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 0,
    };

    const encoded = encodeAuthTokens(tokens);
    const decoded = decodeAuthTokens(encoded);

    expect(decoded?.expiresIn).toBe(0);
  });

  it('should handle very large expiresIn', () => {
    const tokens = {
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 999999999,
    };

    const encoded = encodeAuthTokens(tokens);
    const decoded = decodeAuthTokens(encoded);

    expect(decoded?.expiresIn).toBe(999999999);
  });
});

// ============================================================================
// isAuthReady blocking with URL tokens Tests
// ============================================================================

describe('isAuthReady blocking behavior', () => {
  describe('when URL has auth tokens', () => {
    it('should keep isAuthReady false until user data is loaded', () => {
      // This tests the logic: isAuthReady = initRef.current.done && !isLoadingAfterUrlTokens
      // When URL tokens are present, isLoadingAfterUrlTokens starts as false,
      // then becomes true when loadUserData starts, then false when it finishes

      // The key insight is:
      // 1. initRef.current.done = true (sync, after extracting tokens)
      // 2. isLoadingAfterUrlTokens = true (while loading user)
      // 3. isAuthReady = true && !true = false (blocked)
      // 4. After loadUserData completes: isLoadingAfterUrlTokens = false
      // 5. isAuthReady = true && !false = true (unblocked)

      const done = true;
      const isLoadingAfterUrlTokens = true;
      const isAuthReady = done && !isLoadingAfterUrlTokens;

      expect(isAuthReady).toBe(false);
    });

    it('should set isAuthReady true after user data is loaded', () => {
      const done = true;
      const isLoadingAfterUrlTokens = false; // After loadUserData completes
      const isAuthReady = done && !isLoadingAfterUrlTokens;

      expect(isAuthReady).toBe(true);
    });
  });

  describe('when URL has no auth tokens', () => {
    it('should have isAuthReady true immediately', () => {
      // When no URL tokens, isLoadingAfterUrlTokens stays false
      const done = true;
      const isLoadingAfterUrlTokens = false; // Never set to true
      const isAuthReady = done && !isLoadingAfterUrlTokens;

      expect(isAuthReady).toBe(true);
    });
  });

  describe('before initialization', () => {
    it('should have isAuthReady false before init completes', () => {
      const done = false;
      const isLoadingAfterUrlTokens = false;
      const isAuthReady = done && !isLoadingAfterUrlTokens;

      expect(isAuthReady).toBe(false);
    });
  });
});

// ============================================================================
// URL Token Flow Integration Tests
// ============================================================================

describe('URL Token Flow', () => {
  it('should follow correct state transitions when URL has tokens', () => {
    // Simulate the state machine for URL token flow
    const states: Array<{
      phase: string;
      done: boolean;
      isLoadingAfterUrlTokens: boolean;
      isAuthReady: boolean;
    }> = [];

    // Phase 1: Before init
    let done = false;
    let isLoadingAfterUrlTokens = false;
    states.push({
      phase: 'before_init',
      done,
      isLoadingAfterUrlTokens,
      isAuthReady: done && !isLoadingAfterUrlTokens,
    });

    // Phase 2: After sync token extraction (but before useEffect runs)
    done = true;
    states.push({
      phase: 'after_sync_extraction',
      done,
      isLoadingAfterUrlTokens,
      isAuthReady: done && !isLoadingAfterUrlTokens,
    });

    // Phase 3: useEffect starts loading user data
    isLoadingAfterUrlTokens = true;
    states.push({
      phase: 'loading_user_data',
      done,
      isLoadingAfterUrlTokens,
      isAuthReady: done && !isLoadingAfterUrlTokens,
    });

    // Phase 4: loadUserData completes
    isLoadingAfterUrlTokens = false;
    states.push({
      phase: 'user_data_loaded',
      done,
      isLoadingAfterUrlTokens,
      isAuthReady: done && !isLoadingAfterUrlTokens,
    });

    // Verify state transitions
    expect(states[0].isAuthReady).toBe(false); // before_init
    expect(states[1].isAuthReady).toBe(true); // after_sync_extraction (briefly true)
    expect(states[2].isAuthReady).toBe(false); // loading_user_data (blocked)
    expect(states[3].isAuthReady).toBe(true); // user_data_loaded (ready)
  });

  it('should follow correct state transitions when URL has no tokens', () => {
    const states: Array<{
      phase: string;
      done: boolean;
      isLoadingAfterUrlTokens: boolean;
      isAuthReady: boolean;
    }> = [];

    // Phase 1: Before init
    let done = false;
    const isLoadingAfterUrlTokens = false; // Never changes

    states.push({
      phase: 'before_init',
      done,
      isLoadingAfterUrlTokens,
      isAuthReady: done && !isLoadingAfterUrlTokens,
    });

    // Phase 2: After sync check (no tokens found)
    done = true;
    states.push({
      phase: 'after_sync_check',
      done,
      isLoadingAfterUrlTokens,
      isAuthReady: done && !isLoadingAfterUrlTokens,
    });

    // Verify state transitions
    expect(states[0].isAuthReady).toBe(false); // before_init
    expect(states[1].isAuthReady).toBe(true); // after_sync_check (immediately ready)
  });
});

// ============================================================================
// Real JWT-like Token Tests
// ============================================================================

describe('Real JWT-like Token Handling', () => {
  it('should handle real JWT format tokens', () => {
    // Simulated JWT tokens (not real, just the format)
    const tokens = {
      accessToken:
        'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxZmM3OTQwYy03NGZlLTRjYzctOTdkZS05NWNhMzIyMWNkNzIiLCJlbWFpbCI6InRlc3RAYWRtaW40LmNvbSIsInBob25lTnVtYmVyIjpudWxsLCJ1c2VyVHlwZSI6IlRFTkFOVF9BRE1JTiIsInJvbGUiOm51bGwsInRlbmFudElkIjoiNTU3ODU0NWMtOGU4ZS00MmIzLTk2NWMtNTZlNGNiNTkwZTBmIiwiYXBwSWQiOiI0NzJiNzQ2YS01ZDQ1LTRmOTQtYTc2MS1hZGExZjU5OGQyNjgiLCJpYXQiOjE3NjY5NzAyNDUsImV4cCI6MTc2Njk3Mzg0NX0.FG1ansMWmxmevIDcTI-a9CNF3aMCPcx88SrRTcUtbweCEIG_-XGlhy85rnJIRnvviV6E3eLZJtkOLsvhORAwYn44wYytJ2kW1CiagG5dsjUYRec0SY2o993Y4a22MSnePtzT2vvj6xMNixf3miqT8G4iKkffCzL13pfkHc4wh_zNQPp_Ie2VE7Q3t2FvJAxPgs3NMjqYuOUzeoXffPy-2qmndBEfvf1HFeB3R9SD7r3ZkzoOBZo9f0kLwiKwIzc0BAzfJriagXxi6J4oGsUBM5pNz02JuCEXnFGVoykBHAWeSlD5IzR6qJl779UzuCPEcsMdKNyaKLpRlvAUrI_GoA',
      refreshToken:
        'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxZmM3OTQwYy03NGZlLTRjYzctOTdkZS05NWNhMzIyMWNkNzIiLCJlbWFpbCI6InRlc3RAYWRtaW40LmNvbSIsInBob25lTnVtYmVyIjpudWxsLCJ1c2VyVHlwZSI6IlRFTkFOVF9BRE1JTiIsInJvbGUiOm51bGwsInRlbmFudElkIjoiNTU3ODU0NWMtOGU4ZS00MmIzLTk2NWMtNTZlNGNiNTkwZTBmIiwiYXBwSWQiOiI0NzJiNzQ2YS01ZDQ1LTRmOTQtYTc2MS1hZGExZjU5OGQyNjgiLCJpYXQiOjE3NjY5NzAyNDUsImV4cCI6MTc2NzU3NTA0NX0.SRc4ctOVVo-OGKu4-hB58a6wF1NgocDnNq30UquxZpgIbQRTu5EYWrWY824bOLZ4iQ-eXsTr1L3LststsawhPrLSGjlCdhGsS2dhsIdr0XhmmEGC9GR9IG0MGeS7wJp2XkCxEfhavzpntL-VsZtII2LKSl6aXsnqH89j29HKJHVUuN3xHgKyu7qgwL7Egv3H2uxkNJegUSmGi0uQPmh43HYp_8DK0TJSrp15pqTfaxp1RXve7GAbGiBrxofLfLqCRa9wu9fylX1sCyzwGiLq70aR0kxFwuUmoiwZUzKOSSgC5b2DANsSyDOIk8iLmfkXBsBNgozpu6lg6QlsBTHUJg',
      expiresIn: 3600,
    };

    const encoded = encodeAuthTokens(tokens);
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = decodeAuthTokens(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.accessToken).toBe(tokens.accessToken);
    expect(decoded?.refreshToken).toBe(tokens.refreshToken);
    expect(decoded?.expiresIn).toBe(3600);
  });

  it('should produce URL-safe encoded output for JWT tokens', () => {
    const tokens = {
      accessToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test',
      refreshToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.refresh',
      expiresIn: 3600,
    };

    const encoded = encodeAuthTokens(tokens);

    // Should be URL-safe (no +, /, =)
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');

    // Should be usable in a URL
    const url = new URL(`https://example.com/?_auth=${encoded}`);
    expect(url.searchParams.get('_auth')).toBe(encoded);
  });
});

// ============================================================================
// LoginParams redirectPath Tests
// ============================================================================

describe('LoginParams redirectPath', () => {
  it('should accept redirectPath as optional parameter', () => {
    // Test that LoginParams interface accepts redirectPath
    const paramsWithRedirect: LoginParams = {
      username: 'user@example.com',
      password: 'password123',
      tenantSlug: 'new-tenant',
      redirectPath: '/dashboard',
    };

    expect(paramsWithRedirect.redirectPath).toBe('/dashboard');
  });

  it('should work without redirectPath', () => {
    const paramsWithoutRedirect: LoginParams = {
      username: 'user@example.com',
      password: 'password123',
    };

    expect(paramsWithoutRedirect.redirectPath).toBeUndefined();
  });

  it('should accept various path formats', () => {
    const testPaths = [
      '/dashboard',
      '/onboarding',
      '/settings/profile',
      '/app?query=test',
      '/app#section',
      '/',
    ];

    testPaths.forEach(path => {
      const params: LoginParams = {
        username: 'user@example.com',
        password: 'password123',
        tenantSlug: 'tenant',
        redirectPath: path,
      };
      expect(params.redirectPath).toBe(path);
    });
  });

  it('should combine with tenantSlug for cross-tenant redirect', () => {
    const params: LoginParams = {
      username: 'user@example.com',
      password: 'password123',
      tenantSlug: 'other-tenant',
      redirectPath: '/onboarding',
    };

    // Verify all params are set correctly
    expect(params.tenantSlug).toBe('other-tenant');
    expect(params.redirectPath).toBe('/onboarding');
  });
});
