# Examples

Real-world implementation examples for React Identity Access.

## Table of Contents

- [Basic Setup](#basic-setup)
- [E-commerce Application](#e-commerce-application)
- [Multi-Tenant SaaS](#multi-tenant-saas)
- [Admin Dashboard](#admin-dashboard)
- [Content Management System](#content-management-system)
- [Healthcare Application](#healthcare-application)
- [Financial Dashboard](#financial-dashboard)

## Basic Setup

### Simple Blog Application

```tsx
// App.tsx
import { AppProvider, AuthProvider } from 'react-identity-access';
import { BrowserRouter as Router, Routes, Route } from 'react-router';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';

function App() {
  return (
    <AppProvider
      config={{
        baseUrl: 'https://api.myblog.com',
        appId: 'blog-app-001',
        tenantMode: 'subdomain',
        selectorParam: 'tenant',
      }}
    >
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </Router>
      </AuthProvider>
    </AppProvider>
  );
}

// pages/Dashboard.tsx
import { useAuth, Protected } from 'react-identity-access';

function Dashboard() {
  const { sessionManager } = useAuth();
  const user = sessionManager.getUser();

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      
      <Protected requiredPermissions={['posts:write']}>
        <button>Create New Post</button>
      </Protected>
      
      <Protected requiredPermissions={['posts:read']}>
        <PostList />
      </Protected>
    </div>
  );
}
```

## E-commerce Application

### Product Management with Role-Based Access

```tsx
// components/ProductManagement.tsx
import { useAuth, Protected } from 'react-identity-access';
import { useState, useEffect } from 'react';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
}

function ProductManagement() {
  const { hasPermission, userRole } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);

  const canViewProducts = hasPermission('products:read');
  const canEditProducts = hasPermission('products:write');
  const canDeleteProducts = hasPermission('products:delete');
  const canManageInventory = hasPermission('inventory:manage');

  return (
    <div className="product-management">
      <h2>Product Management</h2>
      
      {/* Product List - Available to all authenticated users */}
      <Protected 
        requiredPermissions={['products:read']}
        fallback={<div>You need permission to view products</div>}
      >
        <ProductList products={products} />
      </Protected>

      {/* Create Product - Only for managers and admins */}
      <Protected requiredPermissions={['products:write']}>
        <div className="actions">
          <button onClick={() => setShowCreateForm(true)}>
            Add New Product
          </button>
        </div>
      </Protected>

      {/* Inventory Management - Only for inventory managers */}
      <Protected 
        requiredPermissions={['inventory:manage']}
        fallback={<div>Contact inventory manager for stock updates</div>}
      >
        <InventoryPanel products={products} />
      </Protected>

      {/* Admin Actions - Only for admins */}
      <Protected requiredRole="admin">
        <AdminActions />
      </Protected>
    </div>
  );
}

// components/ProductCard.tsx
function ProductCard({ product }: { product: Product }) {
  const { hasPermission } = useAuth();

  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <p>Category: {product.category}</p>
      
      <div className="actions">
        <Protected requiredPermissions={['products:write']}>
          <button>Edit</button>
        </Protected>
        
        <Protected requiredPermissions={['products:delete']}>
          <button className="danger">Delete</button>
        </Protected>
        
        <Protected requiredPermissions={['inventory:manage']}>
          <button>Update Stock</button>
        </Protected>
      </div>
    </div>
  );
}
```

### Order Management System

```tsx
// components/OrderManagement.tsx
import { useAuth, Protected } from 'react-identity-access';
import { useSubscription } from 'react-identity-access';

function OrderManagement() {
  const { hasPermission, userRole } = useAuth();
  const { hasFeature } = useSubscription();

  return (
    <div>
      <h2>Order Management</h2>
      
      {/* Basic order viewing - all sales staff */}
      <Protected requiredPermissions={['orders:read']}>
        <OrderList />
      </Protected>

      {/* Order processing - senior staff only */}
      <Protected requiredPermissions={['orders:process']}>
        <OrderProcessingPanel />
      </Protected>

      {/* Refund processing - managers only */}
      <Protected requiredPermissions={['orders:refund']}>
        <RefundPanel />
      </Protected>

      {/* Advanced analytics - premium feature */}
      <Protected requiredPermissions={['analytics:read']}>
        {hasFeature('advanced-analytics') ? (
          <AdvancedAnalytics />
        ) : (
          <div>
            <p>Advanced analytics available in Pro plan</p>
            <button>Upgrade to Pro</button>
          </div>
        )}
      </Protected>
    </div>
  );
}
```

## Multi-Tenant SaaS

### Tenant-Aware Components

```tsx
// App.tsx - Multi-tenant setup
function App() {
  return (
    <AppProvider
      config={{
        baseUrl: 'https://api.saasapp.com',
        appId: 'saas-platform',
        tenantMode: 'subdomain', // tenant1.saasapp.com
        selectorParam: 'tenant',
      }}
    >
      <AuthProvider>
        <FeatureFlagProvider>
          <SubscriptionProvider>
            <TenantRouter />
          </SubscriptionProvider>
        </FeatureFlagProvider>
      </AuthProvider>
    </AppProvider>
  );
}

// components/TenantDashboard.tsx
function TenantDashboard() {
  const { sessionManager, userRole } = useAuth();
  const { subscription, hasFeature, getLimit } = useSubscription();
  const { tenantSlug } = useApp();
  
  const user = sessionManager.getUser();
  const userLimit = getLimit('max-users', 5);
  const storageLimit = getLimit('storage-gb', 1);

  return (
    <div>
      <header>
        <h1>{tenantSlug} Dashboard</h1>
        <p>Welcome, {user?.name} ({userRole})</p>
      </header>

      <div className="subscription-info">
        <p>Plan: {subscription?.plan}</p>
        <p>Users: {currentUserCount}/{userLimit}</p>
        <p>Storage: {currentStorage}GB/{storageLimit}GB</p>
      </div>

      {/* Tenant Admin Features */}
      <Protected requiredRole="tenant-admin">
        <TenantSettings />
        <UserManagement maxUsers={userLimit} />
        <BillingManagement />
      </Protected>

      {/* Premium Features */}
      {hasFeature('custom-branding') && (
        <Protected requiredPermissions={['branding:manage']}>
          <BrandingSettings />
        </Protected>
      )}

      {hasFeature('api-access') && (
        <Protected requiredPermissions={['api:manage']}>
          <ApiKeyManagement />
        </Protected>
      )}
    </div>
  );
}

// components/UserManagement.tsx
function UserManagement({ maxUsers }: { maxUsers: number }) {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState([]);

  const canInviteUsers = hasPermission('users:invite') && users.length < maxUsers;

  return (
    <div>
      <h3>Team Members ({users.length}/{maxUsers})</h3>
      
      <Protected requiredPermissions={['users:read']}>
        <UserList users={users} />
      </Protected>

      <Protected requiredPermissions={['users:invite']}>
        {canInviteUsers ? (
          <InviteUserForm />
        ) : (
          <div>
            <p>User limit reached. Upgrade your plan to add more users.</p>
            <button>Upgrade Plan</button>
          </div>
        )}
      </Protected>
    </div>
  );
}
```

## Admin Dashboard

### Comprehensive Admin Interface

```tsx
// pages/AdminDashboard.tsx
import { useAuth, Protected } from 'react-identity-access';
import { useFeatureFlag } from 'react-identity-access';

function AdminDashboard() {
  const { userPermissions, hasPermission } = useAuth();
  const { isEnabled } = useFeatureFlag();

  const adminSections = [
    {
      title: 'User Management',
      permission: 'users:manage',
      component: UserManagementSection,
      icon: '👥'
    },
    {
      title: 'System Settings',
      permission: 'system:configure',
      component: SystemSettingsSection,
      icon: '⚙️'
    },
    {
      title: 'Analytics',
      permission: 'analytics:view',
      component: AnalyticsSection,
      icon: '📊'
    },
    {
      title: 'Audit Logs',
      permission: 'audit:read',
      component: AuditLogsSection,
      icon: '📋'
    },
    {
      title: 'Feature Flags',
      permission: 'features:manage',
      component: FeatureFlagSection,
      icon: '🚩'
    }
  ];

  return (
    <div className="admin-dashboard">
      <header>
        <h1>Admin Dashboard</h1>
        <p>Permissions: {userPermissions.length}</p>
      </header>

      <div className="admin-grid">
        {adminSections.map(section => (
          <Protected 
            key={section.title}
            requiredPermissions={[section.permission]}
            fallback={
              <div className="section-card disabled">
                <span>{section.icon}</span>
                <h3>{section.title}</h3>
                <p>Access Denied</p>
              </div>
            }
          >
            <div className="section-card">
              <span>{section.icon}</span>
              <h3>{section.title}</h3>
              <section.component />
            </div>
          </Protected>
        ))}
      </div>

      {/* Beta Features */}
      {isEnabled('admin-beta-features') && (
        <Protected requiredPermissions={['beta:access']}>
          <BetaFeaturesPanel />
        </Protected>
      )}
    </div>
  );
}

// components/UserManagementSection.tsx
function UserManagementSection() {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState([]);

  return (
    <div>
      <div className="actions">
        <Protected requiredPermissions={['users:create']}>
          <button>Create User</button>
        </Protected>
        
        <Protected requiredPermissions={['users:import']}>
          <button>Import Users</button>
        </Protected>
        
        <Protected requiredPermissions={['users:export']}>
          <button>Export Users</button>
        </Protected>
      </div>

      <UserTable 
        users={users}
        canEdit={hasPermission('users:edit')}
        canDelete={hasPermission('users:delete')}
        canResetPassword={hasPermission('users:reset-password')}
      />
    </div>
  );
}
```

## Content Management System

### Editorial Workflow

```tsx
// components/ContentEditor.tsx
import { useAuth, Protected } from 'react-identity-access';

interface Article {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'review' | 'published';
  author: string;
  publishedAt?: string;
}

function ContentEditor({ article }: { article: Article }) {
  const { hasPermission, userRole, sessionManager } = useAuth();
  const user = sessionManager.getUser();
  
  const isAuthor = article.author === user?.id;
  const canEdit = hasPermission('content:edit') || (isAuthor && hasPermission('content:edit-own'));
  const canPublish = hasPermission('content:publish');
  const canDelete = hasPermission('content:delete') || (isAuthor && hasPermission('content:delete-own'));

  return (
    <div className="content-editor">
      <header>
        <h2>{article.title}</h2>
        <div className="status-badge status-{article.status}">
          {article.status}
        </div>
      </header>

      {/* Editor - Authors and Editors */}
      <Protected 
        requiredPermissions={['content:edit', 'content:edit-own']}
        requireAll={false}
      >
        {canEdit ? (
          <ArticleEditor article={article} />
        ) : (
          <ArticleViewer article={article} />
        )}
      </Protected>

      <div className="actions">
        {/* Save Draft - Authors */}
        <Protected requiredPermissions={['content:edit', 'content:edit-own']} requireAll={false}>
          {canEdit && (
            <button onClick={saveDraft}>Save Draft</button>
          )}
        </Protected>

        {/* Submit for Review - Authors */}
        <Protected requiredPermissions={['content:submit']}>
          {article.status === 'draft' && isAuthor && (
            <button onClick={submitForReview}>Submit for Review</button>
          )}
        </Protected>

        {/* Approve/Reject - Editors */}
        <Protected requiredPermissions={['content:review']}>
          {article.status === 'review' && (
            <>
              <button onClick={approveArticle}>Approve</button>
              <button onClick={rejectArticle}>Request Changes</button>
            </>
          )}
        </Protected>

        {/* Publish - Publishers */}
        <Protected requiredPermissions={['content:publish']}>
          {article.status === 'review' && canPublish && (
            <button onClick={publishArticle}>Publish</button>
          )}
        </Protected>

        {/* Delete - Admins or Authors (own content) */}
        <Protected requiredPermissions={['content:delete', 'content:delete-own']} requireAll={false}>
          {canDelete && (
            <button className="danger" onClick={deleteArticle}>Delete</button>
          )}
        </Protected>
      </div>
    </div>
  );
}

// components/EditorialDashboard.tsx
function EditorialDashboard() {
  const { userRole, hasPermission } = useAuth();
  const [articles, setArticles] = useState([]);

  const dashboardSections = useMemo(() => {
    const sections = [];

    if (hasPermission('content:edit-own') || hasPermission('content:edit')) {
      sections.push({
        title: 'My Articles',
        component: <MyArticlesList />,
        permission: 'content:edit-own'
      });
    }

    if (hasPermission('content:review')) {
      sections.push({
        title: 'Pending Review',
        component: <PendingReviewList />,
        permission: 'content:review'
      });
    }

    if (hasPermission('content:publish')) {
      sections.push({
        title: 'Ready to Publish',
        component: <ReadyToPublishList />,
        permission: 'content:publish'
      });
    }

    if (hasPermission('analytics:content')) {
      sections.push({
        title: 'Content Analytics',
        component: <ContentAnalytics />,
        permission: 'analytics:content'
      });
    }

    return sections;
  }, [hasPermission]);

  return (
    <div className="editorial-dashboard">
      <h1>Editorial Dashboard</h1>
      <p>Role: {userRole}</p>

      <div className="dashboard-grid">
        {dashboardSections.map(section => (
          <Protected key={section.title} requiredPermissions={[section.permission]}>
            <div className="dashboard-section">
              <h3>{section.title}</h3>
              {section.component}
            </div>
          </Protected>
        ))}
      </div>
    </div>
  );
}
```

## Healthcare Application

### HIPAA-Compliant Patient Management

```tsx
// components/PatientDashboard.tsx
import { useAuth, Protected } from 'react-identity-access';

interface Patient {
  id: string;
  name: string;
  dateOfBirth: string;
  medicalRecordNumber: string;
  assignedPhysician: string;
}

function PatientDashboard({ patientId }: { patientId: string }) {
  const { hasPermission, userRole, sessionManager } = useAuth();
  const user = sessionManager.getUser();
  const [patient, setPatient] = useState<Patient | null>(null);

  // Check if user is assigned to this patient
  const isAssignedProvider = patient?.assignedPhysician === user?.id;
  const canViewPatient = hasPermission('patients:read') || 
    (hasPermission('patients:read-assigned') && isAssignedProvider);

  return (
    <div className="patient-dashboard">
      <Protected 
        requiredPermissions={['patients:read', 'patients:read-assigned']}
        requireAll={false}
        fallback={<div>You don't have permission to view this patient</div>}
      >
        {canViewPatient ? (
          <>
            <PatientHeader patient={patient} />
            
            {/* Basic Patient Info - All authorized staff */}
            <PatientBasicInfo patient={patient} />

            {/* Medical History - Physicians and Nurses */}
            <Protected requiredPermissions={['medical-records:read']}>
              <MedicalHistory patientId={patientId} />
            </Protected>

            {/* Prescriptions - Physicians only */}
            <Protected requiredPermissions={['prescriptions:read']}>
              <PrescriptionHistory patientId={patientId} />
            </Protected>

            {/* Lab Results - Physicians and Lab Technicians */}
            <Protected requiredPermissions={['lab-results:read']}>
              <LabResults patientId={patientId} />
            </Protected>

            {/* Billing Information - Billing Staff and Physicians */}
            <Protected requiredPermissions={['billing:read']}>
              <BillingInformation patientId={patientId} />
            </Protected>

            {/* Administrative Actions */}
            <div className="actions">
              <Protected requiredPermissions={['patients:edit']}>
                {(isAssignedProvider || hasPermission('patients:edit-all')) && (
                  <button>Edit Patient Info</button>
                )}
              </Protected>

              <Protected requiredPermissions={['prescriptions:write']}>
                <button>New Prescription</button>
              </Protected>

              <Protected requiredPermissions={['appointments:schedule']}>
                <button>Schedule Appointment</button>
              </Protected>
            </div>
          </>
        ) : (
          <div>Access denied: Patient not assigned to you</div>
        )}
      </Protected>
    </div>
  );
}

// components/MedicalRecordForm.tsx
function MedicalRecordForm({ patientId }: { patientId: string }) {
  const { hasPermission, userRole } = useAuth();

  return (
    <form className="medical-record-form">
      <h3>Medical Record Entry</h3>

      {/* Basic notes - All medical staff */}
      <Protected requiredPermissions={['medical-records:write']}>
        <textarea placeholder="Clinical notes..." />
      </Protected>

      {/* Diagnosis - Physicians only */}
      <Protected requiredPermissions={['diagnosis:write']}>
        <div>
          <label>Diagnosis</label>
          <input type="text" placeholder="ICD-10 code and description" />
        </div>
      </Protected>

      {/* Prescription - Physicians only */}
      <Protected requiredPermissions={['prescriptions:write']}>
        <div>
          <label>New Prescription</label>
          <PrescriptionForm />
        </div>
      </Protected>

      {/* Lab Orders - Physicians and Nurse Practitioners */}
      <Protected requiredPermissions={['lab-orders:create']}>
        <div>
          <label>Lab Orders</label>
          <LabOrderForm />
        </div>
      </Protected>

      <div className="form-actions">
        <button type="submit">Save Record</button>
        
        <Protected requiredPermissions={['medical-records:sign']}>
          <button type="button">Sign and Lock</button>
        </Protected>
      </div>
    </form>
  );
}
```

## Financial Dashboard

### Investment Portfolio Management

```tsx
// components/PortfolioDashboard.tsx
import { useAuth, Protected } from 'react-identity-access';
import { useSubscription } from 'react-identity-access';

function PortfolioDashboard() {
  const { hasPermission, userRole } = useAuth();
  const { hasFeature, getLimit } = useSubscription();
  
  const portfolioLimit = getLimit('max-portfolios', 1);
  const canAccessPremiumData = hasFeature('real-time-data');

  return (
    <div className="portfolio-dashboard">
      <header>
        <h1>Investment Portfolio</h1>
        <div className="account-tier">
          {hasFeature('premium-support') ? 'Premium' : 'Basic'} Account
        </div>
      </header>

      {/* Portfolio Overview - All users */}
      <PortfolioOverview />

      {/* Real-time Data - Premium feature */}
      {canAccessPremiumData ? (
        <RealTimeMarketData />
      ) : (
        <div className="upgrade-prompt">
          <p>Real-time data available with Premium subscription</p>
          <button>Upgrade to Premium</button>
        </div>
      )}

      {/* Trading Actions - Based on permissions */}
      <div className="trading-panel">
        <Protected requiredPermissions={['trading:buy']}>
          <button className="buy-button">Buy</button>
        </Protected>

        <Protected requiredPermissions={['trading:sell']}>
          <button className="sell-button">Sell</button>
        </Protected>

        <Protected requiredPermissions={['trading:options']}>
          <button>Options Trading</button>
        </Protected>

        <Protected requiredPermissions={['trading:margin']}>
          <button>Margin Trading</button>
        </Protected>
      </div>

      {/* Advanced Analytics - Professional tier */}
      <Protected requiredPermissions={['analytics:advanced']}>
        {hasFeature('advanced-analytics') ? (
          <AdvancedAnalytics />
        ) : (
          <div>Advanced analytics require Professional subscription</div>
        )}
      </Protected>

      {/* Portfolio Management - Advisors */}
      <Protected requiredPermissions={['portfolio:manage-others']}>
        <ClientPortfolioManagement />
      </Protected>

      {/* Compliance Reporting - Compliance Officers */}
      <Protected requiredPermissions={['compliance:reports']}>
        <ComplianceReporting />
      </Protected>
    </div>
  );
}

// components/TradingInterface.tsx
function TradingInterface() {
  const { hasPermission } = useAuth();
  const { hasFeature, getLimit } = useSubscription();
  
  const dailyTradeLimit = getLimit('daily-trades', 10);
  const [tradesUsed, setTradesUsed] = useState(0);

  return (
    <div className="trading-interface">
      <div className="trade-limits">
        <p>Daily Trades: {tradesUsed}/{dailyTradeLimit}</p>
      </div>

      <Protected 
        requiredPermissions={['trading:execute']}
        fallback={<div>Trading permissions required</div>}
      >
        <div className="trade-form">
          <select>
            <option>Buy</option>
            <Protected requiredPermissions={['trading:sell']}>
              <option>Sell</option>
            </Protected>
            <Protected requiredPermissions={['trading:short']}>
              <option>Short Sell</option>
            </Protected>
          </select>

          <input type="text" placeholder="Symbol" />
          <input type="number" placeholder="Quantity" />
          
          <Protected requiredPermissions={['trading:limit-orders']}>
            <input type="number" placeholder="Limit Price" />
          </Protected>

          <button 
            disabled={tradesUsed >= dailyTradeLimit}
            onClick={executeTrade}
          >
            {tradesUsed >= dailyTradeLimit ? 'Daily Limit Reached' : 'Execute Trade'}
          </button>
        </div>
      </Protected>

      {/* Advanced Order Types - Premium feature */}
      {hasFeature('advanced-orders') && (
        <Protected requiredPermissions={['trading:advanced-orders']}>
          <AdvancedOrderTypes />
        </Protected>
      )}
    </div>
  );
}
```

These examples demonstrate real-world usage patterns for React Identity Access across different industries and use cases. Each example shows how to combine permissions, roles, feature flags, and subscription limits to create secure, scalable applications.
