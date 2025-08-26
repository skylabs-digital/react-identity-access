import React from 'react';
import { useSettings, FeatureFlag } from '../../../src';

export function PublicLanding() {
  const { publicSettings, isLoading } = useSettings();

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Hero Section */}
      <header style={{ 
        background: `linear-gradient(135deg, ${publicSettings?.primaryColor || '#007bff'}, ${publicSettings?.secondaryColor || '#6c757d'})`,
        color: 'white',
        padding: '80px 20px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '20px', fontWeight: 'bold' }}>
            {publicSettings?.siteName || 'Welcome to Our Platform'}
          </h1>
          <p style={{ fontSize: '1.2rem', marginBottom: '30px', opacity: 0.9 }}>
            {publicSettings?.heroDescription || 'Discover amazing features and join our community'}
          </p>
          
          <FeatureFlag flag="show-cta-button">
            <button style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid white',
              padding: '12px 30px',
              fontSize: '1.1rem',
              borderRadius: '50px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}>
              {publicSettings?.ctaButtonText || 'Get Started'}
            </button>
          </FeatureFlag>
        </div>
      </header>

      {/* Features Section */}
      <section style={{ padding: '60px 20px', backgroundColor: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '50px', fontSize: '2.5rem', color: '#333' }}>
            Our Features
          </h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '30px' 
          }}>
            {/* Feature 1 - Always visible */}
            <div style={{
              padding: '30px',
              borderRadius: '10px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🚀</div>
              <h3 style={{ marginBottom: '15px', color: '#333' }}>Fast & Reliable</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Lightning-fast performance with 99.9% uptime guarantee.
              </p>
            </div>

            {/* Feature 2 - Controlled by Feature Flag */}
            <FeatureFlag flag="show-premium-features">
              <div style={{
                padding: '30px',
                borderRadius: '10px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                textAlign: 'center',
                border: '2px solid #ffd700'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⭐</div>
                <h3 style={{ marginBottom: '15px', color: '#333' }}>Premium Analytics</h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  Advanced insights and reporting for power users.
                </p>
                <span style={{ 
                  backgroundColor: '#ffd700', 
                  color: '#333', 
                  padding: '4px 8px', 
                  borderRadius: '4px', 
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}>
                  PREMIUM
                </span>
              </div>
            </FeatureFlag>

            {/* Feature 3 - Controlled by Settings */}
            {publicSettings?.showAdvancedFeatures && (
              <div style={{
                padding: '30px',
                borderRadius: '10px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🔧</div>
                <h3 style={{ marginBottom: '15px', color: '#333' }}>Advanced Tools</h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  Professional-grade tools for advanced users.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Testimonials Section - Feature Flag controlled */}
      <FeatureFlag flag="show-testimonials">
        <section style={{ padding: '60px 20px', backgroundColor: '#f8f9fa' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '50px', fontSize: '2.5rem', color: '#333' }}>
              What Our Users Say
            </h2>
            
            <div style={{
              backgroundColor: 'white',
              padding: '40px',
              borderRadius: '10px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              marginBottom: '30px'
            }}>
              <p style={{ fontSize: '1.2rem', fontStyle: 'italic', marginBottom: '20px', color: '#555' }}>
                "{publicSettings?.testimonialText || 'This platform has transformed how we work. Highly recommended!'}"
              </p>
              <div style={{ fontWeight: 'bold', color: '#333' }}>
                {publicSettings?.testimonialAuthor || 'Jane Doe, CEO at TechCorp'}
              </div>
            </div>
          </div>
        </section>
      </FeatureFlag>

      {/* Contact Section - Settings controlled */}
      {publicSettings?.showContactSection && (
        <section style={{ padding: '60px 20px', backgroundColor: 'white' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '30px', fontSize: '2.5rem', color: '#333' }}>
              Get In Touch
            </h2>
            <p style={{ marginBottom: '30px', color: '#666', fontSize: '1.1rem' }}>
              {publicSettings?.contactDescription || 'Ready to get started? Contact us today!'}
            </p>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '30px', 
              flexWrap: 'wrap' 
            }}>
              <div>
                <strong>Email:</strong><br />
                {publicSettings?.contactEmail || 'contact@example.com'}
              </div>
              <div>
                <strong>Phone:</strong><br />
                {publicSettings?.contactPhone || '+1 (555) 123-4567'}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer style={{ 
        backgroundColor: '#343a40', 
        color: 'white', 
        padding: '40px 20px', 
        textAlign: 'center' 
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <p style={{ marginBottom: '20px' }}>
            © 2024 {publicSettings?.siteName || 'Our Platform'}. All rights reserved.
          </p>
          
          <div style={{ marginBottom: '20px' }}>
            <a 
              href="/admin" 
              style={{ 
                color: '#adb5bd', 
                textDecoration: 'none',
                fontSize: '0.9rem'
              }}
            >
              Admin Login
            </a>
          </div>
          
          {publicSettings?.showFooterLinks && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <a href="#" style={{ color: '#adb5bd', textDecoration: 'none' }}>Privacy Policy</a>
              <a href="#" style={{ color: '#adb5bd', textDecoration: 'none' }}>Terms of Service</a>
              <a href="#" style={{ color: '#adb5bd', textDecoration: 'none' }}>Support</a>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
