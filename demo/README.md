# React Identity Access - Demo Project

This demo showcases the complete functionality of the React Identity Access library, demonstrating multi-tenant authentication, subscription management, feature flags, and administrative controls.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation & Setup
```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The demo will be available at `http://localhost:5173` (or next available port).

## 🌐 Navigation Guide

### Initial Access
The demo automatically redirects to `?tenant=acme-corp` if no tenant is specified. This simulates a multi-tenant environment where each organization has its own isolated space.

### Available Views

#### 1. **Public Landing** (`/`)
- **Access**: No authentication required
- **Features**: 
  - Company branding and information
  - Login/Signup forms
  - Feature flag controlled content
  - Subscription plan information

#### 2. **User Dashboard** (`/#dashboard`)
- **Access**: Requires authentication
- **Features**:
  - Personal user information
  - Feature-gated content based on subscription
  - Usage limits and warnings
  - Settings management

#### 3. **Admin Panel** (`/#admin`)
- **Access**: Requires admin role or `manage_tenant` permission
- **Features**:
  - System overview with metrics
  - User management
  - Feature flags control
  - Subscription management
  - System settings

## 🔐 Authentication Flow

### Demo Users
The demo includes pre-configured users for testing:

**Admin User:**
- Email: `admin@acme-corp.com`
- Password: `admin123`
- Roles: `admin`
- Permissions: `manage_tenant`, `view_analytics`

**Regular User:**
- Email: `user@acme-corp.com` 
- Password: `user123`
- Roles: `user`
- Permissions: `view_dashboard`

### Login Process
1. Visit the public landing page
2. Click "Sign In" 
3. Enter credentials above
4. Automatically redirected to appropriate dashboard

## 🏢 Multi-Tenant Features

### Tenant Switching
- Use the tenant switcher in the header to change organizations
- Each tenant has isolated data and settings
- Supports both subdomain and query parameter strategies

### Tenant Configuration
```typescript
// Current demo configuration
<TenantProvider config={{
  strategy: 'query-param',
  queryParam: {
    paramName: 'tenant',
    storageKey: 'demo-tenant',
  },
}}>
```

## 💳 Subscription System

### Available Plans
- **Free Plan**: Basic features, limited users
- **Pro Plan**: Advanced features, more users
- **Enterprise Plan**: All features, unlimited users

### Subscription Features
- Plan-based feature gating
- Usage limit enforcement
- Billing history
- Plan upgrades/downgrades
- Trial period support

### Testing Subscriptions
1. Login as admin
2. Navigate to Admin Panel → Subscription
3. Try different plans to see feature changes
4. Check dashboard to see gated content

## 🚩 Feature Flags

### Available Flags
- `advanced_dashboard`: Advanced dashboard features
- `beta_features`: Beta functionality access
- `advanced_public_features`: Enhanced public content
- `beta_public_content`: Beta public features

### Managing Feature Flags
1. Login as admin
2. Go to Admin Panel → Feature Flags
3. Toggle flags on/off
4. See immediate changes in user experience

## ⚙️ Settings Management

### System Settings
- Site name and branding
- Theme preferences (light/dark)
- User limits
- Admin contact information
- Feature toggles

### Settings Persistence
- Auto-save functionality
- Version control
- Validation with Zod schemas
- Real-time updates

## 👥 User Management

### User Roles
- **Admin**: Full system access
- **User**: Standard user access
- **Guest**: Limited public access

### Permissions System
- Granular permission control
- Role-based access control (RBAC)
- Dynamic permission checking
- Guard components for protection

## 🛠️ Development Features

### Mock Data System
The demo uses localStorage-based connectors for rapid prototyping:
- Pre-populated users and tenants
- Sample subscription data
- Mock payment history
- Feature flag configurations

### Hot Reloading
- Instant updates during development
- State preservation across reloads
- Error boundary protection

## 📱 Responsive Design

The demo is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile devices
- Various screen sizes

## 🔧 Customization

### Styling
- Inline styles for simplicity
- Easy color scheme modifications
- Component-level customization
- Theme system integration

### Configuration
- Environment-based settings
- Tenant-specific configurations
- Feature flag driven behavior
- Subscription plan customization

## 🚦 Testing Different Scenarios

### User Flows
1. **New User Registration**:
   - Go to public landing
   - Click "Sign Up"
   - Complete registration
   - Verify email flow

2. **Subscription Upgrade**:
   - Login as regular user
   - Try accessing premium features
   - See upgrade prompts
   - Switch to admin to change plan

3. **Feature Flag Testing**:
   - Login as admin
   - Toggle feature flags
   - Switch to user view
   - Observe content changes

4. **Multi-tenant Testing**:
   - Change tenant parameter
   - See isolated data
   - Test cross-tenant security

## 📊 Monitoring & Analytics

### System Status
The admin panel shows real-time status for:
- Authentication service
- Database connections
- Payment gateways
- Email services

### Usage Metrics
- Total users count
- Active users
- Feature flag usage
- Subscription statistics

## 🔍 Troubleshooting

### Common Issues
1. **Port conflicts**: Demo will auto-select next available port
2. **Authentication errors**: Clear localStorage and retry
3. **Feature not visible**: Check feature flags and subscription plan
4. **Admin access denied**: Verify user has admin role

### Debug Mode
Enable debug logging by adding `?debug=true` to the URL.

## 🎯 Next Steps

After exploring the demo:
1. Check the main library documentation
2. Review the API reference
3. Explore the source code structure
4. Try integrating with your own backend
5. Customize the UI components

## 📚 Additional Resources

- [API Documentation](../docs/API_REFERENCE.md)
- [Architecture Guide](../docs/ARCHITECTURE.md)
- [Component Structure](../docs/COMPONENT_STRUCTURE.md)
- [Integration Examples](../docs/INTEGRATION_EXAMPLES.md)

---

**Happy exploring! 🎉**

For questions or issues, please check the main project documentation or create an issue in the repository.
