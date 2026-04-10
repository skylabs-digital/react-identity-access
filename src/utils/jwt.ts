/**
 * Shared JWT helpers. Both SessionManager and configValidation use these to
 * avoid duplicating base64url decoding logic.
 */

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
}

function decodeSegment(segment: string): Record<string, unknown> {
  return JSON.parse(atob(segment.replace(/-/g, '+').replace(/_/g, '/')));
}

/**
 * Decode a JWT into its header and payload objects. Returns null for anything
 * that is not a structurally valid 3-segment JWT with parseable base64url
 * JSON header and payload. Does NOT verify the signature.
 */
export function decodeJwt(token: string): DecodedJwt | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return { header: decodeSegment(parts[0]), payload: decodeSegment(parts[1]) };
  } catch {
    return null;
  }
}

/**
 * Extract the `exp` claim (as ms since epoch) from a JWT access token, or
 * undefined if the token isn't a JWT or has no exp claim.
 */
export function extractJwtExpiry(token: string): number | undefined {
  const decoded = decodeJwt(token);
  const exp = decoded?.payload.exp;
  return typeof exp === 'number' ? exp * 1000 : undefined;
}

/**
 * Extract a string claim from a JWT payload, or undefined if the token isn't
 * a JWT, the claim is missing, or the claim value isn't a string.
 */
export function extractJwtClaim(token: string, claim: string): string | undefined {
  const value = decodeJwt(token)?.payload[claim];
  return typeof value === 'string' ? value : undefined;
}
