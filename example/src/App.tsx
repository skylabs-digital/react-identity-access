import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import {
  AppProvider,
  AuthProvider,
  FeatureFlagProvider,
  SubscriptionProvider,
  TenantProvider,
} from '@skylabs-digital/react-identity-access';

// Demo pages (real feature demos wired to the full provider stack)
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import SubscriptionDemo from './pages/SubscriptionDemo';
import RolePermissionTest from './components/RolePermissionTest';
import MagicLink from './pages/MagicLink';
import MagicLinkVerifyPage from './pages/MagicLinkVerifyPage';
import TenantSwitchDemo from './pages/TenantSwitchDemo';
import StandaloneAuthDemo from './pages/StandaloneAuthDemo';
import CookieSessionDemo from './pages/CookieSessionDemo';
import ZoneRoutingDemo from './pages/ZoneRoutingDemo';

// Labs (low-level provider / API inspection)
import { AuthPlayground } from './labs/AuthPlayground';
import { SessionPlayground } from './labs/SessionPlayground';
import { TenantPlayground } from './labs/TenantPlayground';
import { UserPlayground } from './labs/UserPlayground';
import { ApiServicesPlayground } from './labs/ApiServicesPlayground';
import { ProvidersPlayground } from './labs/ProvidersPlayground';
import { RefreshLabPlayground } from './labs/RefreshLabPlayground';

const BASE_URL =
  import.meta.env.VITE_BASE_URL || 'https://idachu-dev.skylabs.digital/api';
const APP_ID = import.meta.env.VITE_APP_ID || '67420000-5b08-420f-a384-5d9dc6532ba2';

function Shell() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-6">
              <Link to="/" className="text-xl font-bold text-gray-900">
                React Identity Access
              </Link>
              <Link to="/demo" className="text-gray-700 hover:text-gray-900 text-sm font-medium">
                Demo
              </Link>
              <Link to="/labs" className="text-gray-700 hover:text-gray-900 text-sm font-medium">
                Labs
              </Link>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                to="/demo/signup"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign Up
              </Link>
              <Link
                to="/demo/login"
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/demo" replace />} />

          {/* Demo routes — real feature pages */}
          <Route path="/demo" element={<Home />} />
          <Route path="/demo/login" element={<Login />} />
          <Route path="/demo/signup" element={<Signup />} />
          <Route path="/demo/password-recovery" element={<ForgotPassword />} />
          <Route path="/demo/dashboard" element={<Dashboard />} />
          <Route path="/demo/profile" element={<Profile />} />
          <Route path="/demo/settings" element={<Settings />} />
          <Route path="/demo/subscription" element={<SubscriptionDemo />} />
          <Route path="/demo/roles" element={<RolePermissionTest />} />
          <Route path="/demo/magic-link" element={<MagicLink />} />
          <Route path="/demo/magic-link/verify" element={<MagicLinkVerifyPage />} />
          <Route path="/demo/tenant-switch" element={<TenantSwitchDemo />} />
          <Route path="/demo/standalone-auth" element={<StandaloneAuthDemo />} />
          <Route path="/demo/cookie-session" element={<CookieSessionDemo />} />
          <Route path="/demo/zone-routing" element={<ZoneRoutingDemo />} />

          {/* Labs routes — low-level provider/API inspection */}
          <Route path="/labs" element={<LabsIndex />} />
          <Route path="/labs/auth" element={<AuthPlayground />} />
          <Route path="/labs/session" element={<SessionPlayground />} />
          <Route path="/labs/tenant" element={<TenantPlayground />} />
          <Route path="/labs/user" element={<UserPlayground />} />
          <Route path="/labs/api-services" element={<ApiServicesPlayground />} />
          <Route path="/labs/providers" element={<ProvidersPlayground />} />
          <Route path="/labs/refresh" element={<RefreshLabPlayground />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/demo" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function LabsIndex() {
  const labs = [
    { to: '/labs/auth', title: 'Auth', desc: 'Login/logout + auth state inspection' },
    { to: '/labs/session', title: 'Session', desc: 'Token lifecycle, refresh state, circuit breaker' },
    { to: '/labs/tenant', title: 'Tenant', desc: 'Tenant detection, switching, settings' },
    { to: '/labs/user', title: 'User', desc: 'Current user payload and roles' },
    { to: '/labs/api-services', title: 'API services', desc: 'Low-level service classes' },
    { to: '/labs/providers', title: 'Providers', desc: 'Provider readiness and context shapes' },
    { to: '/labs/refresh', title: 'Refresh lab', desc: 'Simulate refresh races and failures' },
  ];
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Labs</h1>
      <p className="text-gray-600 mb-6">
        Low-level exploration of the library's providers and services. Not meant for end
        users — these are scratchpads for developers integrating with the lib.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {labs.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="block bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <h2 className="text-lg font-semibold text-gray-900">{l.title}</h2>
            <p className="text-sm text-gray-600">{l.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function App() {
  return (
    <AppProvider
      config={{
        baseUrl: BASE_URL,
        appId: APP_ID,
      }}
    >
      <TenantProvider
        config={{
          tenantMode: 'selector',
          selectorParam: 'tenant',
        }}
      >
        <AuthProvider>
          <FeatureFlagProvider>
            <SubscriptionProvider>
              <Router>
                <Shell />
              </Router>
            </SubscriptionProvider>
          </FeatureFlagProvider>
        </AuthProvider>
      </TenantProvider>
    </AppProvider>
  );
}

export default App;
