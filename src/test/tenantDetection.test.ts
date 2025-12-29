import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectSubdomainTenant,
  detectSelectorTenant,
  detectTenantSlug,
  buildTenantHostname,
} from '../utils/tenantDetection';

describe('tenantDetection', () => {
  describe('detectSubdomainTenant', () => {
    describe('with baseDomain configured', () => {
      const baseDomain = 'kommi.click';

      it('should return null when on base domain (no subdomain)', () => {
        expect(detectSubdomainTenant('kommi.click', baseDomain)).toBe(null);
      });

      it('should return null when on www.baseDomain', () => {
        expect(detectSubdomainTenant('www.kommi.click', baseDomain)).toBe(null);
      });

      it('should extract subdomain when present', () => {
        expect(detectSubdomainTenant('tenant1.kommi.click', baseDomain)).toBe('tenant1');
      });

      it('should extract subdomain for multi-level base domains', () => {
        expect(detectSubdomainTenant('acme.app.example.com', 'app.example.com')).toBe('acme');
      });

      it('should handle nested subdomains', () => {
        expect(detectSubdomainTenant('sub.tenant1.kommi.click', baseDomain)).toBe('sub.tenant1');
      });

      it('should return null when hostname does not match baseDomain', () => {
        expect(detectSubdomainTenant('other-domain.com', baseDomain)).toBe(null);
      });

      it('should be case-insensitive for hostname matching', () => {
        expect(detectSubdomainTenant('TENANT1.KOMMI.CLICK', baseDomain)).toBe('tenant1');
      });

      it('should be case-insensitive for baseDomain', () => {
        expect(detectSubdomainTenant('tenant1.kommi.click', 'KOMMI.CLICK')).toBe('tenant1');
      });
    });

    describe('without baseDomain (fallback)', () => {
      it('should extract subdomain for 3+ part hostnames', () => {
        expect(detectSubdomainTenant('tenant1.example.com')).toBe('tenant1');
      });

      it('should return null for 2-part hostnames', () => {
        expect(detectSubdomainTenant('example.com')).toBe(null);
      });

      it('should return null for single-part hostnames', () => {
        expect(detectSubdomainTenant('localhost')).toBe(null);
      });

      it('should ignore www subdomain', () => {
        expect(detectSubdomainTenant('www.example.com')).toBe(null);
      });

      it('should extract first part for 4+ part hostnames', () => {
        expect(detectSubdomainTenant('tenant.app.example.com')).toBe('tenant');
      });
    });

    describe('localhost and IP detection', () => {
      it('should return null for localhost', () => {
        expect(detectSubdomainTenant('localhost')).toBe(null);
        expect(detectSubdomainTenant('localhost', 'kommi.click')).toBe(null);
      });

      it('should return null for 127.0.0.1', () => {
        expect(detectSubdomainTenant('127.0.0.1')).toBe(null);
      });

      it('should return null for 127.x.x.x addresses', () => {
        expect(detectSubdomainTenant('127.0.0.1')).toBe(null);
        expect(detectSubdomainTenant('127.1.2.3')).toBe(null);
      });

      it('should return null for 192.168.x.x addresses', () => {
        expect(detectSubdomainTenant('192.168.1.100')).toBe(null);
        expect(detectSubdomainTenant('192.168.0.1')).toBe(null);
      });
    });
  });

  describe('detectSelectorTenant', () => {
    let mockStorage: { [key: string]: string };
    let localStorage: Storage;

    beforeEach(() => {
      mockStorage = {};
      localStorage = {
        getItem: (key: string) => mockStorage[key] || null,
        setItem: (key: string, value: string) => {
          mockStorage[key] = value;
        },
        removeItem: (key: string) => {
          delete mockStorage[key];
        },
        clear: () => {
          mockStorage = {};
        },
        length: 0,
        key: () => null,
      };
    });

    it('should extract tenant from URL parameter', () => {
      expect(detectSelectorTenant('?tenant=acme', 'tenant', localStorage)).toBe('acme');
    });

    it('should use custom selector parameter', () => {
      expect(detectSelectorTenant('?org=myorg', 'org', localStorage)).toBe('myorg');
    });

    it('should save tenant to localStorage when found in URL', () => {
      detectSelectorTenant('?tenant=new-tenant', 'tenant', localStorage);
      expect(mockStorage['tenant']).toBe('new-tenant');
    });

    it('should fallback to localStorage when URL param is missing', () => {
      mockStorage['tenant'] = 'stored-tenant';
      expect(detectSelectorTenant('', 'tenant', localStorage)).toBe('stored-tenant');
    });

    it('should return null when no URL param and no localStorage', () => {
      expect(detectSelectorTenant('', 'tenant', localStorage)).toBe(null);
    });

    it('should return null when no localStorage provided and no URL param', () => {
      expect(detectSelectorTenant('', 'tenant', null)).toBe(null);
    });

    it('should work without localStorage (URL param only)', () => {
      expect(detectSelectorTenant('?tenant=url-only', 'tenant', null)).toBe('url-only');
    });

    it('should handle complex query strings', () => {
      expect(detectSelectorTenant('?foo=bar&tenant=acme&baz=qux', 'tenant', localStorage)).toBe(
        'acme'
      );
    });

    it('should handle URL-encoded values', () => {
      expect(detectSelectorTenant('?tenant=my%20tenant', 'tenant', localStorage)).toBe('my tenant');
    });
  });

  describe('detectTenantSlug', () => {
    let mockStorage: { [key: string]: string };
    let localStorage: Storage;

    beforeEach(() => {
      mockStorage = {};
      localStorage = {
        getItem: (key: string) => mockStorage[key] || null,
        setItem: (key: string, value: string) => {
          mockStorage[key] = value;
        },
        removeItem: (key: string) => {
          delete mockStorage[key];
        },
        clear: () => {
          mockStorage = {};
        },
        length: 0,
        key: () => null,
      };
    });

    it('should use subdomain detection when tenantMode is subdomain', () => {
      const result = detectTenantSlug(
        { tenantMode: 'subdomain', baseDomain: 'kommi.click' },
        { hostname: 'tenant1.kommi.click', search: '' },
        localStorage
      );
      expect(result).toBe('tenant1');
    });

    it('should use selector detection when tenantMode is selector', () => {
      const result = detectTenantSlug(
        { tenantMode: 'selector', selectorParam: 'tenant' },
        { hostname: 'app.example.com', search: '?tenant=acme' },
        localStorage
      );
      expect(result).toBe('acme');
    });

    it('should NOT use localStorage in subdomain mode', () => {
      mockStorage['tenant'] = 'stored-tenant';
      const result = detectTenantSlug(
        { tenantMode: 'subdomain', baseDomain: 'kommi.click' },
        { hostname: 'kommi.click', search: '' },
        localStorage
      );
      expect(result).toBe(null);
    });

    it('should use localStorage fallback in selector mode', () => {
      mockStorage['tenant'] = 'stored-tenant';
      const result = detectTenantSlug(
        { tenantMode: 'selector' },
        { hostname: 'app.example.com', search: '' },
        localStorage
      );
      expect(result).toBe('stored-tenant');
    });
  });

  describe('buildTenantHostname', () => {
    describe('with baseDomain configured', () => {
      const baseDomain = 'kommi.click';

      it('should build hostname from baseDomain (root to tenant)', () => {
        // From kommi.click → test-admin.kommi.click
        expect(buildTenantHostname('test-admin', 'kommi.click', baseDomain)).toBe(
          'test-admin.kommi.click'
        );
      });

      it('should build hostname from baseDomain (tenant to tenant)', () => {
        // From old-tenant.kommi.click → new-tenant.kommi.click
        expect(buildTenantHostname('new-tenant', 'old-tenant.kommi.click', baseDomain)).toBe(
          'new-tenant.kommi.click'
        );
      });

      it('should work regardless of current hostname when baseDomain is set', () => {
        // Even from completely different domain
        expect(buildTenantHostname('acme', 'localhost', baseDomain)).toBe('acme.kommi.click');
        expect(buildTenantHostname('acme', 'other.domain.com', baseDomain)).toBe(
          'acme.kommi.click'
        );
      });

      it('should handle multi-level base domains', () => {
        expect(buildTenantHostname('tenant1', 'kommi.click', 'app.example.com')).toBe(
          'tenant1.app.example.com'
        );
      });
    });

    describe('without baseDomain (fallback detection)', () => {
      it('should ADD subdomain for 2-part hostname (root domain)', () => {
        // kommi.click → test-admin.kommi.click
        expect(buildTenantHostname('test-admin', 'kommi.click')).toBe('test-admin.kommi.click');
        expect(buildTenantHostname('acme', 'example.com')).toBe('acme.example.com');
      });

      it('should REPLACE first part for 3-part hostname (existing subdomain)', () => {
        // old-tenant.kommi.click → new-tenant.kommi.click
        expect(buildTenantHostname('new-tenant', 'old-tenant.kommi.click')).toBe(
          'new-tenant.kommi.click'
        );
        expect(buildTenantHostname('acme', 'www.example.com')).toBe('acme.example.com');
      });

      it('should REPLACE first part for 4+ part hostname', () => {
        // old.app.example.com → new.app.example.com
        expect(buildTenantHostname('new', 'old.app.example.com')).toBe('new.app.example.com');
      });

      it('should return null for single-part hostname (localhost)', () => {
        expect(buildTenantHostname('tenant', 'localhost')).toBe(null);
      });
    });

    describe('edge cases', () => {
      it('should handle empty tenant slug', () => {
        expect(buildTenantHostname('', 'kommi.click', 'kommi.click')).toBe('.kommi.click');
      });

      it('should handle tenant slug with hyphens', () => {
        expect(buildTenantHostname('my-cool-tenant', 'kommi.click', 'kommi.click')).toBe(
          'my-cool-tenant.kommi.click'
        );
      });

      it('should handle tenant slug with numbers', () => {
        expect(buildTenantHostname('tenant123', 'kommi.click', 'kommi.click')).toBe(
          'tenant123.kommi.click'
        );
      });
    });
  });
});
