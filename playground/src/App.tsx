import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import {
  AppProvider,
  TenantProvider,
  AuthProvider,
  FeatureFlagProvider,
  SubscriptionProvider,
} from '@skylabs-digital/react-identity-access';
import { AuthPlayground } from './sections/AuthPlayground';
import { SessionPlayground } from './sections/SessionPlayground';
import { TenantPlayground } from './sections/TenantPlayground';
import { UserPlayground } from './sections/UserPlayground';
import { ApiServicesPlayground } from './sections/ApiServicesPlayground';
import { ProvidersPlayground } from './sections/ProvidersPlayground';
import { RefreshLabPlayground } from './sections/RefreshLabPlayground';

const BASE_URL = 'https://idachu-dev.skylabs.digital/api';
const APP_ID = '67420000-5b08-420f-a384-5d9dc6532ba2';

const TABS = [
  'Auth',
  'Session & Tokens',
  'Tenant',
  'User & Roles',
  'API Services',
  'Providers State',
  'Refresh Lab',
] as const;

type Tab = (typeof TABS)[number];

export default function App() {
  const [tab, setTab] = useState<Tab>('Auth');

  return (
    <BrowserRouter>
      <AppProvider config={{ baseUrl: BASE_URL, appId: APP_ID }}>
        <TenantProvider config={{ tenantMode: 'selector', selectorParam: 'tenant' }}>
          <AuthProvider
            config={{
              onSessionExpired: (err) => {
                console.warn('[Playground] Session expired:', err.reason, err.message);
              },
            }}
          >
            <FeatureFlagProvider>
              <SubscriptionProvider>
                <div>
                  <h1>react-identity-access playground</h1>
                  <div className="row" style={{ marginBottom: 8, fontSize: 11, color: '#888' }}>
                    <span>baseUrl: {BASE_URL}</span>
                    <span>|</span>
                    <span>appId: {APP_ID.slice(0, 8)}...</span>
                  </div>

                  <div className="nav">
                    {TABS.map((t) => (
                      <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
                        {t}
                      </button>
                    ))}
                  </div>

                  {tab === 'Auth' && <AuthPlayground />}
                  {tab === 'Session & Tokens' && <SessionPlayground />}
                  {tab === 'Tenant' && <TenantPlayground />}
                  {tab === 'User & Roles' && <UserPlayground />}
                  {tab === 'API Services' && <ApiServicesPlayground />}
                  {tab === 'Providers State' && <ProvidersPlayground />}
                  {tab === 'Refresh Lab' && <RefreshLabPlayground />}
                </div>
              </SubscriptionProvider>
            </FeatureFlagProvider>
          </AuthProvider>
        </TenantProvider>
      </AppProvider>
    </BrowserRouter>
  );
}
