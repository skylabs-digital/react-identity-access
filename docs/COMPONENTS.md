# Components Reference

Complete guide to React Identity Access components for rapid prototyping and production use.

## Guard Components

### FeatureFlag

Conditionally render content based on feature flags with zero configuration.

```tsx
import { FeatureFlag } from 'react-identity-access';

// Basic usage
<FeatureFlag flag="new_dashboard">
  <NewDashboard />
</FeatureFlag>

// With fallback
<FeatureFlag flag="premium_feature" fallback={<UpgradePrompt />}>
  <PremiumFeature />
</FeatureFlag>

// Nested flags
<FeatureFlag flag="beta_features">
  <FeatureFlag flag="advanced_analytics">
    <AdvancedAnalytics />
  </FeatureFlag>
</FeatureFlag>
```

**Props:**
- `flag: string` - Feature flag key
- `fallback?: ReactNode` - Content when flag is disabled
- `children: ReactNode` - Content when flag is enabled

### SubscriptionGuard

Protect content based on subscription plans with automatic upgrade prompts.

```tsx
import { SubscriptionGuard } from 'react-identity-access';

// Plan-based protection
<SubscriptionGuard requiredPlan="pro">
  <ProFeature />
</SubscriptionGuard>

// Status-based protection
<SubscriptionGuard 
  requiredStatus="active"
  fallback={<PaymentRequired />}
>
  <ActiveSubscriptionContent />
</SubscriptionGuard>

// Multiple requirements
<SubscriptionGuard 
  requiredPlan="enterprise"
  requiredStatus="active"
  fallback={<EnterpriseUpgrade />}
>
  <EnterpriseFeature />
</SubscriptionGuard>
```

**Props:**
- `requiredPlan?: string` - Minimum plan required
- `requiredStatus?: 'active' | 'trialing' | 'past_due'` - Required status
- `fallback?: ReactNode` - Content when requirements not met

### RoleGuard

Role-based access control with flexible permission checking.

```tsx
import { RoleGuard } from 'react-identity-access';

// Single role
<RoleGuard requiredRoles={['admin']}>
  <AdminPanel />
</RoleGuard>

// Multiple roles (any)
<RoleGuard requiredRoles={['admin', 'moderator']}>
  <ModerationTools />
</RoleGuard>

// Multiple roles (all required)
<RoleGuard 
  requiredRoles={['admin', 'billing']} 
  requireAll={true}
>
  <BillingAdminPanel />
</RoleGuard>

// With custom fallback
<RoleGuard 
  requiredRoles={['admin']}
  fallback={<div>Access denied - Admin required</div>}
>
  <AdminSettings />
</RoleGuard>
```

**Props:**
- `requiredRoles: string[]` - Required user roles
- `requireAll?: boolean` - Whether all roles required (default: false)
- `fallback?: ReactNode` - Content when access denied

### LimitGate

Usage limit enforcement with automatic warnings and upgrade prompts.

```tsx
import { LimitGate } from 'react-identity-access';

// Basic usage limit
<LimitGate 
  feature="api_calls"
  current={apiCallsUsed}
  limit={subscription?.limits.apiCalls || 100}
>
  <ApiCallButton />
</LimitGate>

// With warning threshold
<LimitGate
  feature="storage"
  current={storageUsed}
  limit={storageLimit}
  warningThreshold={0.8}
  fallback={<StorageUpgrade />}
>
  <FileUpload />
</LimitGate>

// Custom warning component
<LimitGate
  feature="users"
  current={userCount}
  limit={maxUsers}
  warningThreshold={0.9}
  warningComponent={({ remaining, limit }) => (
    <Alert>Only {remaining} users remaining of {limit}</Alert>
  )}
>
  <AddUserButton />
</LimitGate>
```

**Props:**
- `feature: string` - Feature being limited
- `current: number` - Current usage
- `limit: number` - Maximum allowed
- `warningThreshold?: number` - Warning threshold (0-1, default: 0.8)
- `fallback?: ReactNode` - Content when limit exceeded
- `warningComponent?: Component` - Custom warning display

### FeatureGate

Advanced feature gating with subscription and plan integration.

```tsx
import { FeatureGate } from 'react-identity-access';

// Feature with plan requirement
<FeatureGate 
  feature="advanced_analytics"
  requiredPlan="pro"
>
  <AdvancedAnalytics />
</FeatureGate>

// With custom upgrade prompt
<FeatureGate
  feature="white_labeling"
  requiredPlan="enterprise"
  fallback={
    <UpgradeCard 
      title="White Labeling"
      description="Customize branding with Enterprise plan"
      targetPlan="enterprise"
    />
  }
>
  <WhiteLabelingSettings />
</FeatureGate>
```

**Props:**
- `feature: string` - Feature key
- `requiredPlan?: string` - Required subscription plan
- `fallback?: ReactNode` - Content when access denied

## UI Components

### SubscriptionConfig

Complete subscription management interface with plan selection and billing.

```tsx
import { SubscriptionConfig } from 'react-identity-access';

// Full subscription management
<SubscriptionConfig />

// Customized appearance
<SubscriptionConfig
  showBillingHistory={true}
  showUsageMetrics={true}
  theme="dark"
  onPlanChange={(planId) => console.log('Changed to:', planId)}
/>

// Embedded in settings
<SettingsSection title="Subscription">
  <SubscriptionConfig compact={true} />
</SettingsSection>
```

**Props:**
- `showBillingHistory?: boolean` - Show billing history section
- `showUsageMetrics?: boolean` - Show usage tracking
- `compact?: boolean` - Compact layout mode
- `theme?: 'light' | 'dark'` - Visual theme
- `onPlanChange?: (planId: string) => void` - Plan change callback

### BillingHistory

Invoice and payment history display with export capabilities.

```tsx
import { BillingHistory } from 'react-identity-access';

// Basic billing history
<BillingHistory />

// With filters and export
<BillingHistory
  showFilters={true}
  allowExport={true}
  pageSize={20}
  onInvoiceClick={(invoice) => downloadInvoice(invoice)}
/>
```

**Props:**
- `showFilters?: boolean` - Show date/status filters
- `allowExport?: boolean` - Enable CSV/PDF export
- `pageSize?: number` - Items per page
- `onInvoiceClick?: (invoice: Invoice) => void` - Invoice click handler

### UsageMetrics

Real-time usage tracking and limit visualization.

```tsx
import { UsageMetrics } from 'react-identity-access';

// All metrics
<UsageMetrics />

// Specific metrics
<UsageMetrics 
  metrics={['api_calls', 'storage', 'users']}
  showProjections={true}
/>

// Custom styling
<UsageMetrics
  layout="grid"
  showPercentages={true}
  warningThreshold={0.8}
/>
```

**Props:**
- `metrics?: string[]` - Specific metrics to show
- `layout?: 'list' | 'grid' | 'compact'` - Display layout
- `showProjections?: boolean` - Show usage projections
- `showPercentages?: boolean` - Show percentage usage
- `warningThreshold?: number` - Warning threshold

## Authentication Components

### LoginForm

Customizable login form with validation and error handling.

```tsx
import { LoginForm } from 'react-identity-access';

// Default login form
<LoginForm onSuccess={() => navigate('/dashboard')} />

// Customized
<LoginForm
  title="Welcome Back"
  subtitle="Sign in to your account"
  showRememberMe={true}
  showForgotPassword={true}
  onSuccess={() => navigate('/dashboard')}
  onForgotPassword={() => navigate('/forgot-password')}
/>

// Custom styling
<LoginForm
  className="custom-login"
  buttonText="Sign In"
  loadingText="Signing in..."
  theme="dark"
/>
```

**Props:**
- `title?: string` - Form title
- `subtitle?: string` - Form subtitle
- `showRememberMe?: boolean` - Show remember me checkbox
- `showForgotPassword?: boolean` - Show forgot password link
- `buttonText?: string` - Submit button text
- `loadingText?: string` - Loading state text
- `theme?: 'light' | 'dark'` - Visual theme
- `onSuccess?: () => void` - Success callback
- `onForgotPassword?: () => void` - Forgot password callback

### SignupForm

User registration form with validation and tenant assignment.

```tsx
import { SignupForm } from 'react-identity-access';

// Basic signup
<SignupForm onSuccess={() => navigate('/welcome')} />

// With custom fields
<SignupForm
  fields={['name', 'email', 'password', 'company']}
  requireTerms={true}
  onSuccess={(user) => trackSignup(user)}
/>
```

**Props:**
- `fields?: string[]` - Form fields to include
- `requireTerms?: boolean` - Require terms acceptance
- `onSuccess?: (user: User) => void` - Success callback

### UserProfile

User profile management with avatar upload and settings.

```tsx
import { UserProfile } from 'react-identity-access';

// Full profile editor
<UserProfile />

// Read-only display
<UserProfile readOnly={true} />

// Custom sections
<UserProfile
  sections={['basic', 'security', 'preferences']}
  allowAvatarUpload={true}
/>
```

## Navigation Components

### TenantSwitcher

Multi-tenant navigation with search and recent tenants.

```tsx
import { TenantSwitcher } from 'react-identity-access';

// Dropdown switcher
<TenantSwitcher />

// With search
<TenantSwitcher 
  showSearch={true}
  showRecent={true}
  maxRecent={5}
/>

// Custom trigger
<TenantSwitcher
  trigger={<Button variant="ghost">{currentTenant.name}</Button>}
/>
```

**Props:**
- `showSearch?: boolean` - Enable tenant search
- `showRecent?: boolean` - Show recent tenants
- `maxRecent?: number` - Max recent tenants
- `trigger?: ReactNode` - Custom trigger element

### Breadcrumbs

Contextual navigation with tenant and role awareness.

```tsx
import { Breadcrumbs } from 'react-identity-access';

// Auto-generated from route
<Breadcrumbs />

// Custom items
<Breadcrumbs
  items={[
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Settings', href: '/settings' },
    { label: 'Billing', current: true }
  ]}
/>
```

## Notification Components

### FeatureFlagNotification

Notify users about feature changes and new capabilities.

```tsx
import { FeatureFlagNotification } from 'react-identity-access';

// Auto-detect new features
<FeatureFlagNotification />

// Custom notifications
<FeatureFlagNotification
  showNewFeatures={true}
  showDeprecated={true}
  position="top-right"
/>
```

### SubscriptionNotification

Billing and subscription status notifications.

```tsx
import { SubscriptionNotification } from 'react-identity-access';

// Payment and renewal alerts
<SubscriptionNotification />

// Custom thresholds
<SubscriptionNotification
  showTrialWarning={true}
  trialWarningDays={7}
  showUsageWarnings={true}
/>
```

## Layout Components

### AppShell

Complete application layout with navigation, sidebar, and content areas.

```tsx
import { AppShell } from 'react-identity-access';

<AppShell
  navigation={<MainNavigation />}
  sidebar={<Sidebar />}
  header={<AppHeader />}
>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/settings" element={<Settings />} />
  </Routes>
</AppShell>
```

### DashboardLayout

Pre-configured dashboard layout with common patterns.

```tsx
import { DashboardLayout } from 'react-identity-access';

<DashboardLayout
  title="Analytics Dashboard"
  actions={<RefreshButton />}
  sidebar={<AnalyticsSidebar />}
>
  <MetricsGrid />
  <ChartsSection />
</DashboardLayout>
```

## Styling and Theming

### CSS Variables

All components support CSS custom properties for theming:

```css
:root {
  --ria-primary: #3b82f6;
  --ria-secondary: #6b7280;
  --ria-success: #10b981;
  --ria-warning: #f59e0b;
  --ria-error: #ef4444;
  --ria-background: #ffffff;
  --ria-surface: #f9fafb;
  --ria-border: #e5e7eb;
  --ria-text: #111827;
  --ria-text-secondary: #6b7280;
}
```

### Component Classes

All components include CSS classes for styling:

```css
.ria-feature-flag { /* FeatureFlag wrapper */ }
.ria-subscription-guard { /* SubscriptionGuard wrapper */ }
.ria-role-guard { /* RoleGuard wrapper */ }
.ria-limit-gate { /* LimitGate wrapper */ }
.ria-login-form { /* LoginForm container */ }
.ria-subscription-config { /* SubscriptionConfig container */ }
```

### Theme Provider

Use the ThemeProvider for consistent styling:

```tsx
import { ThemeProvider } from 'react-identity-access';

<ThemeProvider theme="dark">
  <App />
</ThemeProvider>
```
