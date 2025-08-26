import { render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { IdentityProvider } from '../../providers/IdentityProvider';
import { LocalStorageConnector } from '../../connectors/localStorage/LocalStorageConnector';
import { testSeedData } from '../helpers/testSeedData';
import { FeatureFlag } from '../../components/feature-flags/FeatureFlag';

const createWrapper = (connector: LocalStorageConnector) => {
  return ({ children }: { children: ReactNode }) => (
    <IdentityProvider
      connector={connector}
      tenantResolver={{
        strategy: 'query-param',
        queryParam: { paramName: 'tenant', storageKey: 'test-tenant' },
      }}
    >
      {children}
    </IdentityProvider>
  );
};

describe('FeatureFlag Component - Conditional Rendering Tests', () => {
  let connector: LocalStorageConnector;

  beforeEach(() => {
    connector = new LocalStorageConnector({
      simulateDelay: false,
      errorRate: 0,
      seedData: testSeedData,
    });

    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?tenant=acme-corp' },
      writable: true,
    });
  });

  describe('Feature Flag Rendering', () => {
    it('should render children when flag is enabled', async () => {
      const Wrapper = createWrapper(connector);

      render(
        <Wrapper>
          <FeatureFlag flag="new-dashboard">
            <div>New Dashboard Feature</div>
          </FeatureFlag>
        </Wrapper>
      );

      // Wait for feature flags to load
      await new Promise(resolve => setTimeout(resolve, 200));

      // new-dashboard is enabled by default
      expect(screen.getByText('New Dashboard Feature')).toBeInTheDocument();
    });

    it('should not render children when flag is disabled', async () => {
      const Wrapper = createWrapper(connector);

      render(
        <Wrapper>
          <FeatureFlag flag="premium-analytics">
            <div>Premium Analytics Feature</div>
          </FeatureFlag>
        </Wrapper>
      );

      await new Promise(resolve => setTimeout(resolve, 200));

      // premium-analytics is disabled by default
      expect(screen.queryByText('Premium Analytics Feature')).not.toBeInTheDocument();
    });

    it('should render fallback when flag is disabled', async () => {
      const Wrapper = createWrapper(connector);

      render(
        <Wrapper>
          <FeatureFlag flag="premium-analytics" fallback={<div>Feature not available</div>}>
            <div>Premium Analytics Feature</div>
          </FeatureFlag>
        </Wrapper>
      );

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(screen.getByText('Feature not available')).toBeInTheDocument();
      expect(screen.queryByText('Premium Analytics Feature')).not.toBeInTheDocument();
    });

    it('should handle non-existent flags gracefully', async () => {
      const Wrapper = createWrapper(connector);

      render(
        <Wrapper>
          <FeatureFlag flag="non-existent-flag">
            <div>This should not render</div>
          </FeatureFlag>
        </Wrapper>
      );

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(screen.queryByText('This should not render')).not.toBeInTheDocument();
    });
  });

  describe('Server Control', () => {
    it('should respect server-disabled flags', async () => {
      const Wrapper = createWrapper(connector);

      render(
        <Wrapper>
          <FeatureFlag flag="system-maintenance">
            <div>Maintenance Mode Active</div>
          </FeatureFlag>
        </Wrapper>
      );

      await new Promise(resolve => setTimeout(resolve, 200));

      // system-maintenance is server-disabled
      expect(screen.queryByText('Maintenance Mode Active')).not.toBeInTheDocument();
    });
  });
});
