/**
 * Tenant detection utilities
 * Extracted for testability
 */

export interface TenantDetectionConfig {
  tenantMode: 'subdomain' | 'selector' | 'fixed';
  baseDomain?: string;
  selectorParam?: string;
  fixedTenantSlug?: string;
}

export interface LocationInfo {
  hostname: string;
  search: string;
}

/**
 * Detect tenant slug from subdomain
 */
export function detectSubdomainTenant(hostname: string, baseDomain?: string): string | null {
  // Skip localhost and IP addresses
  const isLocalhost =
    hostname === 'localhost' || hostname.startsWith('127.') || hostname.startsWith('192.168.');

  if (isLocalhost) {
    return null;
  }

  // If baseDomain is configured, use it to extract subdomain
  if (baseDomain) {
    const baseDomainLower = baseDomain.toLowerCase();
    const currentHost = hostname.toLowerCase();

    // Check if we're on the base domain (no subdomain)
    if (currentHost === baseDomainLower || currentHost === `www.${baseDomainLower}`) {
      return null;
    }

    // Check if hostname ends with baseDomain
    if (currentHost.endsWith(`.${baseDomainLower}`)) {
      const subdomain = currentHost.slice(0, -(baseDomainLower.length + 1));
      // Ignore www subdomain
      if (subdomain === 'www') {
        return null;
      }
      return subdomain;
    }

    // Hostname doesn't match baseDomain
    return null;
  }

  // Fallback: Extract subdomain assuming format subdomain.domain.tld
  const parts = hostname.split('.');
  if (parts.length >= 3 && parts[0] !== 'www') {
    return parts[0];
  }

  return null;
}

/**
 * Detect tenant slug from URL selector parameter
 */
export function detectSelectorTenant(
  search: string,
  selectorParam: string = 'tenant',
  localStorage?: Storage | null
): string | null {
  const urlParams = new URLSearchParams(search);
  const urlTenant = urlParams.get(selectorParam);

  if (urlTenant) {
    // Save to localStorage when found in URL
    if (localStorage) {
      localStorage.setItem('tenant', urlTenant);
    }
    return urlTenant;
  }

  // Fallback to localStorage if not in URL
  if (localStorage) {
    return localStorage.getItem('tenant');
  }

  return null;
}

/**
 * Main tenant detection function
 */
export function detectTenantSlug(
  config: TenantDetectionConfig,
  location: LocationInfo,
  localStorage?: Storage | null
): string | null {
  const { tenantMode, baseDomain, selectorParam, fixedTenantSlug } = config;

  if (tenantMode === 'fixed') {
    return fixedTenantSlug || null;
  }

  if (tenantMode === 'subdomain') {
    return detectSubdomainTenant(location.hostname, baseDomain);
  }

  if (tenantMode === 'selector') {
    return detectSelectorTenant(location.search, selectorParam, localStorage);
  }

  return null;
}

/**
 * Build the target hostname for tenant switching in subdomain mode
 * @param targetTenantSlug - The tenant slug to switch to
 * @param currentHostname - The current window.location.hostname
 * @param baseDomain - Optional configured base domain
 * @returns The new hostname or null if unable to determine
 */
export function buildTenantHostname(
  targetTenantSlug: string,
  currentHostname: string,
  baseDomain?: string
): string | null {
  // If baseDomain is configured, use it directly (recommended)
  if (baseDomain) {
    return `${targetTenantSlug}.${baseDomain}`;
  }

  // Fallback: try to detect from current hostname
  const parts = currentHostname.split('.');

  if (parts.length === 2) {
    // Root domain (e.g., kommi.click) - ADD subdomain at the beginning
    // kommi.click → test-admin.kommi.click
    return `${targetTenantSlug}.${currentHostname}`;
  } else if (parts.length >= 3) {
    // Already has subdomain (e.g., old-tenant.kommi.click) - REPLACE first part
    // old-tenant.kommi.click → test-admin.kommi.click
    parts[0] = targetTenantSlug;
    return parts.join('.');
  }

  // Single-part hostname (e.g., localhost) - cannot determine
  return null;
}
