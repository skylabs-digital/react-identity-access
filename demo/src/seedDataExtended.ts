// Define the extended seed data structure
export const extendedSeedData = {
  tenants: [
    {
      id: 'acme-corp',
      name: 'ACME Corporation',
      domain: 'acme.com',
      isActive: true,
      createdAt: new Date('2024-01-01'),
      settings: {
        theme: 'corporate',
        features: ['analytics', 'reporting']
      }
    },
    {
      id: 'tech-startup',
      name: 'Tech Startup Inc',
      domain: 'techstartup.com',
      isActive: true,
      createdAt: new Date('2024-01-01'),
      settings: {
        theme: 'modern',
        features: ['beta-features', 'advanced-analytics']
      }
    }
  ],
  users: [
    {
      id: 'user-1',
      email: 'admin@acme.com',
      name: 'John Admin',
      tenantId: 'acme-corp',
      roles: ['admin', 'user'],
      permissions: ['read:users', 'write:users', 'manage:system', 'manage:settings']
    },
    {
      id: 'user-2',
      email: 'user@acme.com',
      name: 'Jane User',
      tenantId: 'acme-corp',
      roles: ['user'],
      permissions: ['read:users']
    },
    {
      id: 'user-3',
      email: 'admin@techstartup.com',
      name: 'Mike Founder',
      tenantId: 'tech-startup',
      roles: ['super_admin', 'admin', 'user'],
      permissions: ['read:users', 'write:users', 'manage:system', 'manage:settings', 'manage:tenants']
    }
  ],
  featureFlags: {
    'show-cta-button': {
      name: 'Show CTA Button',
      description: 'Display the call-to-action button on the landing page',
      category: 'ui',
      enabled: true,
      serverEnabled: true,
      adminEditable: true,
      tenantOverrides: {
        'acme-corp': { enabled: true },
        'tech-startup': { enabled: true }
      }
    },
    'show-premium-features': {
      name: 'Show Premium Features',
      description: 'Display premium feature cards on the landing page',
      category: 'features',
      enabled: false,
      serverEnabled: true,
      adminEditable: true,
      tenantOverrides: {
        'acme-corp': { enabled: false },
        'tech-startup': { enabled: true }
      }
    },
    'show-testimonials': {
      name: 'Show Testimonials',
      description: 'Display testimonials section on the landing page',
      category: 'content',
      enabled: true,
      serverEnabled: true,
      adminEditable: true,
      tenantOverrides: {
        'acme-corp': { enabled: true },
        'tech-startup': { enabled: true }
      }
    },
    'premium-analytics': {
      name: 'Premium Analytics',
      description: 'Enable advanced analytics features for premium users',
      category: 'features',
      enabled: false,
      serverEnabled: true,
      adminEditable: true,
      tenantOverrides: {
        'acme-corp': { enabled: false },
        'tech-startup': { enabled: true }
      }
    },
    'new-dashboard': {
      name: 'New Dashboard',
      description: 'Enable the new dashboard design',
      category: 'ui',
      enabled: true,
      serverEnabled: true,
      adminEditable: true,
      tenantOverrides: {
        'acme-corp': { enabled: true },
        'tech-startup': { enabled: true }
      }
    }
  },
  settings: {
    'acme-corp': {
      // Branding & Appearance
      siteName: 'ACME Corporation',
      primaryColor: '#007bff',
      secondaryColor: '#6c757d',
      heroDescription: 'Leading the industry with innovative solutions and exceptional service',
      
      // Content Settings
      ctaButtonText: 'Get Started Today',
      testimonialText: 'ACME Corporation has transformed our business operations. Their solutions are top-notch and their support is outstanding.',
      testimonialAuthor: 'Sarah Johnson, CEO at Global Industries',
      
      // Contact Information
      contactEmail: 'contact@acme.com',
      contactPhone: '+1 (555) 123-4567',
      contactDescription: 'Ready to transform your business? Get in touch with our expert team today!',
      
      // Feature Visibility
      showAdvancedFeatures: false,
      showContactSection: true,
      showFooterLinks: true
    },
    'tech-startup': {
      // Branding & Appearance
      siteName: 'Tech Startup Inc',
      primaryColor: '#28a745',
      secondaryColor: '#17a2b8',
      heroDescription: 'Disrupting the market with cutting-edge technology and innovative solutions',
      
      // Content Settings
      ctaButtonText: 'Join the Revolution',
      testimonialText: 'Tech Startup Inc is at the forefront of innovation. Their platform has given us a competitive edge we never thought possible.',
      testimonialAuthor: 'David Chen, CTO at Future Corp',
      
      // Contact Information
      contactEmail: 'hello@techstartup.com',
      contactPhone: '+1 (555) 987-6543',
      contactDescription: 'Ready to disrupt your industry? Let\'s build the future together!',
      
      // Feature Visibility
      showAdvancedFeatures: true,
      showContactSection: true,
      showFooterLinks: true
    }
  }
};
