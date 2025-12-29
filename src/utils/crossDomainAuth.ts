/**
 * Cross-domain authentication utilities
 * Used to transfer auth tokens between subdomains during tenant switching
 */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const AUTH_TRANSFER_PARAM = '_auth';

/**
 * Encode auth tokens for URL transfer
 * Uses base64 encoding for safe URL transport
 */
export function encodeAuthTokens(tokens: AuthTokens): string {
  const payload = JSON.stringify(tokens);
  // Use base64url encoding (URL-safe)
  return btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Decode auth tokens from URL parameter
 */
export function decodeAuthTokens(encoded: string): AuthTokens | null {
  try {
    // Restore base64 padding and characters
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    const payload = atob(base64);
    const tokens = JSON.parse(payload);

    // Validate structure
    if (
      typeof tokens.accessToken === 'string' &&
      typeof tokens.refreshToken === 'string' &&
      typeof tokens.expiresIn === 'number'
    ) {
      return tokens;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract auth tokens from current URL if present
 */
export function extractAuthTokensFromUrl(): AuthTokens | null {
  if (typeof window === 'undefined') {
    console.log('[CrossDomainAuth] SSR environment, skipping URL token extraction');
    return null;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const encoded = urlParams.get(AUTH_TRANSFER_PARAM);

  console.log('[CrossDomainAuth] extractAuthTokensFromUrl called', {
    hasAuthParam: !!encoded,
    searchParams: window.location.search,
    encodedLength: encoded?.length,
  });

  if (!encoded) return null;

  const decoded = decodeAuthTokens(encoded);
  console.log('[CrossDomainAuth] Token decode result:', {
    success: !!decoded,
    hasAccessToken: !!decoded?.accessToken,
    hasRefreshToken: !!decoded?.refreshToken,
    expiresIn: decoded?.expiresIn,
  });

  return decoded;
}

/**
 * Remove auth tokens from URL without page reload
 */
export function clearAuthTokensFromUrl(): void {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  url.searchParams.delete(AUTH_TRANSFER_PARAM);

  console.log('[CrossDomainAuth] Clearing auth tokens from URL', {
    oldUrl: window.location.href,
    newUrl: url.toString(),
  });

  // Update URL without reload
  window.history.replaceState({}, '', url.toString());
}

/**
 * Build URL with auth tokens for cross-subdomain redirect
 */
export function buildUrlWithAuthTokens(baseUrl: string, tokens: AuthTokens, path?: string): string {
  const url = new URL(path || '/', baseUrl);
  url.searchParams.set(AUTH_TRANSFER_PARAM, encodeAuthTokens(tokens));
  return url.toString();
}

/**
 * Append auth tokens to an existing URL
 */
export function appendAuthTokensToUrl(url: string, tokens: AuthTokens): string {
  const urlObj = new URL(url);
  urlObj.searchParams.set(AUTH_TRANSFER_PARAM, encodeAuthTokens(tokens));
  return urlObj.toString();
}

export { AUTH_TRANSFER_PARAM };
