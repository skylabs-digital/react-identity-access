import { BrowserRouter as Router, Routes, Route, Link } from 'react-router';
import {
  AppProvider,
  AuthProvider,
  FeatureFlagProvider,
  SubscriptionProvider,
  TenantProvider,
} from '@skylabs-digital/react-identity-access';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import SubscriptionDemo from './pages/SubscriptionDemo';
import RolePermissionTest from './components/RolePermissionTest';

function App() {
  return (
    <AppProvider
      config={{
        baseUrl: process.env.REACT_APP_BASE_URL || 'http://localhost:3000',
        appId: process.env.REACT_APP_ID || '093009e3-24d4-410e-8d49-8453b961e28f',
        tenantMode: 'selector',
        selectorParam: 'tenant',
      }}
    >
      <AuthProvider>
        <TenantProvider>
          <FeatureFlagProvider>
            <SubscriptionProvider>
              <Router>
                <div className="min-h-screen bg-gray-50">
                  <nav className="bg-white shadow-sm border-b">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                      <div className="flex justify-between h-16">
                        <div className="flex items-center space-x-8">
                          <Link to="/" className="text-xl font-bold text-gray-900">
                            React Identity Access
                          </Link>
                          <div className="flex space-x-4">
                            <Link
                              to="/"
                              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                            >
                              Home
                            </Link>
                            <Link
                              to="/dashboard"
                              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                            >
                              Dashboard
                            </Link>
                            <Link
                              to="/profile"
                              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                            >
                              Profile
                            </Link>
                            <Link
                              to="/roles"
                              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                            >
                              Roles & Permissions
                            </Link>
                            <Link
                              to="/settings"
                              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                            >
                              Settings
                            </Link>
                            <Link
                              to="/subscription"
                              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                            >
                              Subscription
                            </Link>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Link
                            to="/signup"
                            className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                          >
                            Sign Up
                          </Link>
                          <Link
                            to="/login"
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
                      <Route path="/" element={<Home />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/signup" element={<Signup />} />
                      <Route path="/password-recovery" element={<ForgotPassword />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/subscription" element={<SubscriptionDemo />} />
                      <Route path="/roles" element={<RolePermissionTest />} />
                    </Routes>
                  </main>
                </div>
              </Router>
            </SubscriptionProvider>
          </FeatureFlagProvider>
        </TenantProvider>
      </AuthProvider>
    </AppProvider>
  );
}

export default App;
