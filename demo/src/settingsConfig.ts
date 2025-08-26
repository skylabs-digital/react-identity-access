import { z } from 'zod';
import { LocalStorageConnector } from '../../src';

// Define the settings schema
export const settingsSchema = z.object({
  // Branding & Appearance
  siteName: z.string().default('Our Platform'),
  primaryColor: z.string().default('#007bff'),
  secondaryColor: z.string().default('#6c757d'),
  heroDescription: z.string().default('Discover amazing features and join our community'),
  
  // Content Settings
  ctaButtonText: z.string().default('Get Started'),
  testimonialText: z.string().default('This platform has transformed how we work. Highly recommended!'),
  testimonialAuthor: z.string().default('Jane Doe, CEO at TechCorp'),
  
  // Contact Information
  contactEmail: z.string().email().default('contact@example.com'),
  contactPhone: z.string().default('+1 (555) 123-4567'),
  contactDescription: z.string().default('Ready to get started? Contact us today!'),
  
  // Feature Visibility
  showAdvancedFeatures: z.boolean().default(false),
  showContactSection: z.boolean().default(true),
  showFooterLinks: z.boolean().default(true)
});

// Default settings
export const defaultSettings = {
  siteName: 'Our Platform',
  primaryColor: '#007bff',
  secondaryColor: '#6c757d',
  heroDescription: 'Discover amazing features and join our community',
  ctaButtonText: 'Get Started',
  testimonialText: 'This platform has transformed how we work. Highly recommended!',
  testimonialAuthor: 'Jane Doe, CEO at TechCorp',
  contactEmail: 'contact@example.com',
  contactPhone: '+1 (555) 123-4567',
  contactDescription: 'Ready to get started? Contact us today!',
  showAdvancedFeatures: false,
  showContactSection: true,
  showFooterLinks: true
};

// Tenant-specific settings data
const tenantSettings: Record<string, any> = {
  'acme-corp': {
    siteName: 'ACME Corporation',
    primaryColor: '#007bff',
    secondaryColor: '#6c757d',
    heroDescription: 'Leading the industry with innovative solutions and exceptional service',
    ctaButtonText: 'Get Started Today',
    testimonialText: 'ACME Corporation has transformed our business operations. Their solutions are top-notch and their support is outstanding.',
    testimonialAuthor: 'Sarah Johnson, CEO at Global Industries',
    contactEmail: 'contact@acme.com',
    contactPhone: '+1 (555) 123-4567',
    contactDescription: 'Ready to transform your business? Get in touch with our expert team today!',
    showAdvancedFeatures: false,
    showContactSection: true,
    showFooterLinks: true
  },
  'tech-startup': {
    siteName: 'Tech Startup Inc',
    primaryColor: '#28a745',
    secondaryColor: '#17a2b8',
    heroDescription: 'Disrupting the market with cutting-edge technology and innovative solutions',
    ctaButtonText: 'Join the Revolution',
    testimonialText: 'Tech Startup Inc is at the forefront of innovation. Their platform has given us a competitive edge we never thought possible.',
    testimonialAuthor: 'David Chen, CTO at Future Corp',
    contactEmail: 'hello@techstartup.com',
    contactPhone: '+1 (555) 987-6543',
    contactDescription: 'Ready to disrupt your industry? Let\'s build the future together!',
    showAdvancedFeatures: true,
    showContactSection: true,
    showFooterLinks: true
  }
};

// Create a settings connector that uses the same LocalStorage as the identity system
export class SettingsLocalStorageConnector {
  async getPublicSettings(appId: string, tenantId: string): Promise<any> {
    // First check localStorage for any updates
    const key = `settings_${tenantId}_public`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Fall through to default
      }
    }
    
    // Return tenant-specific defaults
    return tenantSettings[tenantId] || defaultSettings;
  }

  async getPrivateSettings(appId: string, tenantId: string): Promise<any> {
    // First check localStorage for any updates
    const key = `settings_${tenantId}_private`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Fall through to default
      }
    }
    
    // Return tenant-specific defaults
    return tenantSettings[tenantId] || defaultSettings;
  }

  async updateSettings(appId: string, tenantId: string, settings: any): Promise<void> {
    const publicKey = `settings_${tenantId}_public`;
    const privateKey = `settings_${tenantId}_private`;
    
    // Store all settings as both public and private for demo purposes
    localStorage.setItem(publicKey, JSON.stringify(settings));
    localStorage.setItem(privateKey, JSON.stringify(settings));
  }

  async getSchema(appId: string, tenantId: string): Promise<any> {
    return settingsSchema;
  }

  async updateSchema(appId: string, tenantId: string, schema: any, version: string): Promise<void> {
    // Not implemented for demo
  }
}

export const settingsConnector = new SettingsLocalStorageConnector();
