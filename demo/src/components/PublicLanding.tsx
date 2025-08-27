import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../src/providers/IdentityProvider';
import { useFeatureFlags } from '../../../src/providers/FeatureFlagsProvider';
import { useSettings } from '../../../src/providers/SettingsProvider';
import { useSubscription } from '../../../src/providers/SubscriptionProvider';
import { FeatureFlag } from '../../../src/components/feature-flags/FeatureFlag';
import { FeatureGate } from '../../../src/components/subscription/FeatureGate';
import { TenantSwitcher } from './TenantSwitcher';

interface AppSettings {
  siteName: string;
  theme: 'light' | 'dark';
  maxUsers: number;
  adminEmail: string;
  features: {
    advancedMode: boolean;
    betaFeatures: boolean;
  };
  publicSettings: {
    heroTitle: string;
    heroSubtitle: string;
    companyName: string;
    supportEmail: string;
  };
}

export function PublicLanding() {
  const { login, auth } = useAuth();
  const { values: settings } = useSettings<AppSettings>();
  const { subscription } = useSubscription();
  const navigate = useNavigate();
  const [loginForm, setLoginForm] = useState({ email: 'admin@acme-corp.com', password: 'admin123' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Handle login redirect only on form submission
  const handleLoginRedirect = () => {
    if (auth.isAuthenticated && auth.user) {
      const isAdmin = auth.user.roles?.includes('admin') || auth.user.permissions?.includes('manage_tenant');
      navigate(isAdmin ? '/admin' : '/dashboard');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      await login({email: loginForm.email, password: loginForm.password});
      // Redirect after successful login
      handleLoginRedirect();
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Header */}
      <header style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        padding: '16px 0',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: '600' }}>
              🚀 {settings.siteName}
            </h1>
            <TenantSwitcher />
          </div>
          <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <button 
              onClick={() => navigate('/')}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'white', 
                textDecoration: 'none', 
                fontWeight: '500',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Home
            </button>
            <a href="#features" style={{ color: 'white', textDecoration: 'none', fontWeight: '500' }}>Features</a>
            <a href="#pricing" style={{ color: 'white', textDecoration: 'none', fontWeight: '500' }}>Pricing</a>
            {auth.isAuthenticated && (
              <>
                <button 
                  onClick={() => navigate('/dashboard')}
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.2)', 
                    border: '1px solid rgba(255, 255, 255, 0.3)', 
                    color: 'white', 
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Dashboard
                </button>
                {(auth.user?.roles?.includes('admin') || auth.user?.permissions?.includes('manage_tenant')) && (
                  <button 
                    onClick={() => navigate('/admin')}
                    style={{ 
                      background: 'rgba(255, 193, 7, 0.3)', 
                      border: '1px solid rgba(255, 193, 7, 0.5)', 
                      color: '#ffc107', 
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Admin
                  </button>
                )}
              </>
            )}
            <FeatureFlag flag="beta_public_content">
              <span style={{ 
                background: 'rgba(255, 193, 7, 0.2)', 
                color: '#ffc107', 
                padding: '4px 8px', 
                borderRadius: '12px', 
                fontSize: '12px',
                fontWeight: '600'
              }}>
                BETA
              </span>
            </FeatureFlag>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ padding: '80px 20px', textAlign: 'center', color: 'white' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '48px', fontWeight: '700', marginBottom: '24px', lineHeight: '1.2' }}>
            {settings.publicSettings?.heroTitle || `Welcome to ${settings.siteName}`}
          </h2>
          <p style={{ fontSize: '20px', marginBottom: '40px', opacity: 0.9, lineHeight: '1.6' }}>
            {settings.publicSettings?.heroSubtitle || 'The ultimate identity and access management solution for modern applications.'}
            <FeatureFlag flag="advanced_public_features">
              {' Experience advanced multi-tenant capabilities.'}
            </FeatureFlag>
          </p>
          
          {/* Login Form */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            padding: '32px',
            borderRadius: '16px',
            maxWidth: '400px',
            margin: '0 auto',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <h3 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: '600' }}>Sign In</h3>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input
                type="email"
                placeholder="Email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontSize: '16px'
                }}
              />
              <input
                type="password"
                placeholder="Password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontSize: '16px'
                }}
              />
              <button
                type="submit"
                disabled={isLoggingIn}
                style={{
                  background: 'linear-gradient(45deg, #28a745, #20c997)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isLoggingIn ? 'not-allowed' : 'pointer',
                  opacity: isLoggingIn ? 0.7 : 1,
                  transition: 'all 0.2s'
                }}
              >
                {isLoggingIn ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
            <div style={{ marginTop: '16px', fontSize: '14px', opacity: 0.8 }}>
              <p><strong>Demo credentials:</strong></p>
              <p>Admin: admin@acme-corp.com / admin123</p>
              <p>User: user@acme-corp.com / user123</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ padding: '80px 20px', background: 'rgba(255, 255, 255, 0.05)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: 'white', fontSize: '36px', marginBottom: '48px', fontWeight: '600' }}>
            Powerful Features
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '32px' 
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '32px',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)'
            }}>
              <h3 style={{ color: 'white', fontSize: '24px', marginBottom: '16px', fontWeight: '600' }}>
                🔐 Multi-Tenant Authentication
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6' }}>
                Secure authentication with tenant isolation and role-based access control.
              </p>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '32px',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)'
            }}>
              <h3 style={{ color: 'white', fontSize: '24px', marginBottom: '16px', fontWeight: '600' }}>
                🚩 Feature Flags
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6' }}>
                Dynamic feature toggling for controlled rollouts and A/B testing.
              </p>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '32px',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)'
            }}>
              <h3 style={{ color: 'white', fontSize: '24px', marginBottom: '16px', fontWeight: '600' }}>
                💳 Subscription Management
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6' }}>
                Built-in billing and subscription management with multiple payment gateways.
              </p>
            </div>

            <FeatureFlag flag="advanced_public_features">
              <div style={{
                background: 'rgba(255, 193, 7, 0.2)',
                padding: '32px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 193, 7, 0.4)',
                backdropFilter: 'blur(10px)'
              }}>
                <h3 style={{ color: '#ffc107', fontSize: '24px', marginBottom: '16px', fontWeight: '600' }}>
                  ⚡ Advanced Analytics
                </h3>
                <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6' }}>
                  Deep insights into user behavior and system performance.
                  <FeatureGate 
                    feature="advanced_analytics"
                    fallback={<span> (Pro feature)</span>}
                  >
                    <span></span>
                  </FeatureGate>
                </p>
              </div>
            </FeatureFlag>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{ padding: '80px 20px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: 'white', fontSize: '36px', marginBottom: '48px', fontWeight: '600' }}>
            Simple Pricing
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '24px' 
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '32px',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              textAlign: 'center'
            }}>
              <h3 style={{ color: 'white', fontSize: '24px', marginBottom: '16px' }}>Starter</h3>
              <div style={{ fontSize: '32px', color: 'white', fontWeight: '700', marginBottom: '16px' }}>
                $9<span style={{ fontSize: '16px', fontWeight: '400' }}>/month</span>
              </div>
              <ul style={{ color: 'rgba(255, 255, 255, 0.8)', textAlign: 'left', listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: '8px' }}>✓ Up to 10 users</li>
                <li style={{ marginBottom: '8px' }}>✓ Basic authentication</li>
                <li style={{ marginBottom: '8px' }}>✓ Feature flags</li>
                <li style={{ marginBottom: '8px' }}>✓ Email support</li>
              </ul>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #28a745, #20c997)',
              padding: '32px',
              borderRadius: '16px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              textAlign: 'center',
              position: 'relative'
            }}>
              <FeatureFlag flag="beta_public_content">
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: '#ff6b6b',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  BETA
                </div>
              </FeatureFlag>
              <h3 style={{ color: 'white', fontSize: '24px', marginBottom: '16px' }}>Pro</h3>
              <div style={{ fontSize: '32px', color: 'white', fontWeight: '700', marginBottom: '16px' }}>
                $29<span style={{ fontSize: '16px', fontWeight: '400' }}>/month</span>
              </div>
              <ul style={{ color: 'rgba(255, 255, 255, 0.9)', textAlign: 'left', listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: '8px' }}>✓ Up to 100 users</li>
                <li style={{ marginBottom: '8px' }}>✓ Advanced authentication</li>
                <li style={{ marginBottom: '8px' }}>✓ All feature flags</li>
                <li style={{ marginBottom: '8px' }}>✓ Subscription management</li>
                <li style={{ marginBottom: '8px' }}>✓ Priority support</li>
              </ul>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '32px',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              textAlign: 'center'
            }}>
              <h3 style={{ color: 'white', fontSize: '24px', marginBottom: '16px' }}>Enterprise</h3>
              <div style={{ fontSize: '32px', color: 'white', fontWeight: '700', marginBottom: '16px' }}>
                Custom
              </div>
              <ul style={{ color: 'rgba(255, 255, 255, 0.8)', textAlign: 'left', listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: '8px' }}>✓ Unlimited users</li>
                <li style={{ marginBottom: '8px' }}>✓ SSO & SAML</li>
                <li style={{ marginBottom: '8px' }}>✓ Custom integrations</li>
                <li style={{ marginBottom: '8px' }}>✓ 24/7 dedicated support</li>
                <li style={{ marginBottom: '8px' }}>✓ SLA guarantee</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ 
        background: 'rgba(0, 0, 0, 0.2)', 
        padding: '40px 20px', 
        textAlign: 'center',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
            © 2024 {settings.publicSettings?.companyName || settings.siteName}. Built with React Identity Access.
          </p>
          <FeatureFlag flag="beta_public_content">
            <p style={{ color: '#ffc107', marginTop: '8px', fontSize: '14px' }}>
              🚧 This is a beta version - some features may be experimental
            </p>
          </FeatureFlag>
        </div>
      </footer>
    </div>
  );
}
