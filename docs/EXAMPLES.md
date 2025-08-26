# Usage Examples

## Basic Setup

### Simple App with Client/Admin Sections

```tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { 
  IdentityProvider, 
  useAuth, 
  ProtectedRoute,
  createLocalStorageConnector 
} from 'react-identity-access';

// Create connector for development
const connector = createLocalStorageConnector({
  simulateDelay: true,
  debugMode: true,
  errorRate: 0.05 // 5% error rate for testing
});

function App() {
  return (
    <IdentityProvider 
      connector={connector}
      config={{ 
        debugMode: true, 
        autoRefreshTokens: true,
        sessionTimeout: 30 * 60 * 1000 // 30 minutes
      }}
    >
      <Router>
        <AppRoutes />
      </Router>
    </IdentityProvider>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Client section - authenticated users */}
      <Route 
        path="/dashboard/*" 
        element={
          <ProtectedRoute redirectTo="/login">
            <ClientSection />
          </ProtectedRoute>
        } 
      />
      
      {/* Admin section - admin role required */}
      <Route 
        path="/admin/*" 
        element={
          <ProtectedRoute 
            requiredRoles={['admin']} 
            redirectTo="/dashboard"
            fallback={<AccessDenied />}
          >
            <AdminSection />
          </ProtectedRoute>
        } 
      />
      
      {/* Redirect authenticated users from login */}
      <Route 
        path="/login" 
        element={
          isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />
        } 
      />
    </Routes>
  );
}
```

## Client/Guest Section

### Public Homepage with Optional Authentication

```tsx
import { useAuth, RoleGuard } from 'react-identity-access';

function HomePage() {
  const { isAuthenticated, user } = useAuth();
  
  return (
    <div className="homepage">
      <header>
        <h1>Welcome to Our Platform</h1>
        {isAuthenticated ? (
          <div className="user-menu">
            <span>Hello, {user?.name}!</span>
            <UserMenu />
          </div>
        ) : (
          <div className="auth-buttons">
            <Link to="/login">Login</Link>
            <Link to="/register">Sign Up</Link>
          </div>
        )}
      </header>
      
      <main>
        <section className="hero">
          <h2>Powerful Features for Everyone</h2>
          <p>Get started with our platform today.</p>
          
          {!isAuthenticated && (
            <Link to="/register" className="cta-button">
              Get Started Free
            </Link>
          )}
        </section>
        
        <section className="features">
          <FeatureCard 
            title="Basic Features" 
            description="Available to all users"
          />
          
          <RoleGuard roles={['premium', 'admin']}>
            <FeatureCard 
              title="Premium Features" 
              description="Exclusive to premium members"
              badge="Premium"
            />
          </RoleGuard>
          
          <RoleGuard roles={['admin']}>
            <FeatureCard 
              title="Admin Tools" 
              description="Administrative capabilities"
              badge="Admin Only"
            />
          </RoleGuard>
        </section>
      </main>
    </div>
  );
}
```

### Client Dashboard

```tsx
import { useAuth, useRoles, useTenant } from 'react-identity-access';

function ClientSection() {
  return (
    <div className="client-section">
      <ClientHeader />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/settings" element={<UserSettings />} />
        <Route 
          path="/billing" 
          element={
            <ProtectedRoute requiredPermissions={['view:billing']}>
              <BillingPage />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const { hasPermission } = useRoles();
  const { currentTenant } = useTenant();
  
  return (
    <div className="dashboard">
      <h1>Welcome back, {user?.name}!</h1>
      
      <div className="dashboard-grid">
        <DashboardCard title="My Projects" />
        <DashboardCard title="Recent Activity" />
        
        {hasPermission('view:analytics') && (
          <DashboardCard title="Analytics" />
        )}
        
        {hasPermission('manage:team') && (
          <DashboardCard title="Team Management" />
        )}
      </div>
      
      <div className="tenant-info">
        <p>Organization: {currentTenant?.name}</p>
      </div>
    </div>
  );
}

function ClientHeader() {
  const { user, logout } = useAuth();
  const { currentTenant, availableTenants, switchTenant } = useTenant();
  
  return (
    <header className="client-header">
      <nav>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/dashboard/profile">Profile</Link>
        <Link to="/dashboard/settings">Settings</Link>
      </nav>
      
      <div className="header-actions">
        {availableTenants.length > 1 && (
          <TenantSwitch 
            onTenantChange={(tenant) => switchTenant(tenant.id)}
          />
        )}
        
        <UserMenu user={user} onLogout={logout} />
      </div>
    </header>
  );
}
```

## Admin Section

### Admin Dashboard with Role-Based Features

```tsx
import { useAuth, useRoles, ProtectedRoute, RoleGuard } from 'react-identity-access';

function AdminSection() {
  const { hasAnyRole } = useRoles();
  
  // Ensure user has admin privileges
  if (!hasAnyRole(['admin', 'super_admin'])) {
    return <Navigate to="/dashboard" />;
  }
  
  return (
    <div className="admin-section">
      <AdminSidebar />
      <main className="admin-main">
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          
          {/* User management */}
          <Route 
            path="/users/*" 
            element={
              <ProtectedRoute requiredPermissions={['manage:users']}>
                <UserManagement />
              </ProtectedRoute>
            } 
          />
          
          {/* Role management */}
          <Route 
            path="/roles/*" 
            element={
              <ProtectedRoute requiredPermissions={['manage:roles']}>
                <RoleManagement />
              </ProtectedRoute>
            } 
          />
          
          {/* Tenant management - super admin only */}
          <Route 
            path="/tenants/*" 
            element={
              <ProtectedRoute requiredRoles={['super_admin']}>
                <TenantManagement />
              </ProtectedRoute>
            } 
          />
          
          {/* System settings */}
          <Route 
            path="/settings/*" 
            element={
              <ProtectedRoute requiredPermissions={['manage:system']}>
                <SystemSettings />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </main>
    </div>
  );
}

function AdminDashboard() {
  const { user } = useAuth();
  const { hasPermission, hasRole } = useRoles();
  
  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      <p>Welcome, {user?.name}</p>
      
      <div className="admin-cards">
        <RoleGuard permissions={['view:users']}>
          <AdminCard 
            title="Users" 
            count="1,234" 
            link="/admin/users"
            icon="users"
          />
        </RoleGuard>
        
        <RoleGuard permissions={['view:roles']}>
          <AdminCard 
            title="Roles" 
            count="12" 
            link="/admin/roles"
            icon="shield"
          />
        </RoleGuard>
        
        <RoleGuard roles={['super_admin']}>
          <AdminCard 
            title="Tenants" 
            count="5" 
            link="/admin/tenants"
            icon="building"
          />
        </RoleGuard>
        
        <RoleGuard permissions={['view:analytics']}>
          <AdminCard 
            title="Analytics" 
            link="/admin/analytics"
            icon="chart"
          />
        </RoleGuard>
      </div>
      
      {hasRole('super_admin') && (
        <div className="super-admin-section">
          <h2>Super Admin Tools</h2>
          <SystemHealthMonitor />
          <GlobalSettings />
        </div>
      )}
    </div>
  );
}

function AdminSidebar() {
  const { hasPermission, hasRole } = useRoles();
  
  return (
    <aside className="admin-sidebar">
      <nav>
        <Link to="/admin">Dashboard</Link>
        
        <RoleGuard permissions={['manage:users']}>
          <Link to="/admin/users">Users</Link>
        </RoleGuard>
        
        <RoleGuard permissions={['manage:roles']}>
          <Link to="/admin/roles">Roles</Link>
        </RoleGuard>
        
        <RoleGuard roles={['super_admin']}>
          <Link to="/admin/tenants">Tenants</Link>
        </RoleGuard>
        
        <RoleGuard permissions={['manage:system']}>
          <Link to="/admin/settings">Settings</Link>
        </RoleGuard>
      </nav>
    </aside>
  );
}
```

### User Management Example

```tsx
import { useState, useEffect } from 'react';
import { useRoles, useAuth } from 'react-identity-access';

function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { hasPermission } = useRoles();
  const { user: currentUser } = useAuth();
  
  return (
    <div className="user-management">
      <header className="page-header">
        <h1>User Management</h1>
        
        <RoleGuard permissions={['create:users']}>
          <button onClick={() => setShowCreateModal(true)}>
            Add User
          </button>
        </RoleGuard>
      </header>
      
      <div className="user-list">
        <UserTable 
          users={users}
          onSelectUser={setSelectedUser}
          canEdit={hasPermission('edit:users')}
          canDelete={hasPermission('delete:users')}
        />
      </div>
      
      {selectedUser && (
        <UserDetailsPanel 
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          canEditRoles={hasPermission('assign:roles')}
        />
      )}
    </div>
  );
}

function UserDetailsPanel({ user, onClose, canEditRoles }: UserDetailsPanelProps) {
  const { assignRole, removeRole } = useRoles();
  
  const handleRoleChange = async (roleId: string, action: 'add' | 'remove') => {
    try {
      if (action === 'add') {
        await assignRole(user.id, roleId);
      } else {
        await removeRole(user.id, roleId);
      }
      // Refresh user data
    } catch (error) {
      console.error('Failed to update user roles:', error);
    }
  };
  
  return (
    <div className="user-details-panel">
      <header>
        <h2>{user.name}</h2>
        <button onClick={onClose}>×</button>
      </header>
      
      <div className="user-info">
        <p>Email: {user.email}</p>
        <p>Last Login: {user.lastLoginAt?.toLocaleDateString()}</p>
        <p>Status: {user.isActive ? 'Active' : 'Inactive'}</p>
      </div>
      
      {canEditRoles && (
        <div className="user-roles">
          <h3>Roles</h3>
          <RoleSelector 
            userRoles={user.roles}
            onRoleChange={handleRoleChange}
          />
        </div>
      )}
    </div>
  );
}
```

## Multi-Tenant Examples

### Tenant-Aware Components

```tsx
import { useTenant, useAuth } from 'react-identity-access';

function TenantAwareHeader() {
  const { currentTenant, availableTenants, switchTenant } = useTenant();
  const { user } = useAuth();
  
  return (
    <header className="tenant-header">
      <div className="tenant-info">
        <img 
          src={currentTenant?.settings.customBranding?.logo} 
          alt={currentTenant?.name}
          className="tenant-logo"
        />
        <h1>{currentTenant?.name}</h1>
      </div>
      
      {availableTenants.length > 1 && (
        <div className="tenant-switcher">
          <select 
            value={currentTenant?.id} 
            onChange={(e) => switchTenant(e.target.value)}
          >
            {availableTenants.map(tenant => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </div>
      )}
      
      <div className="user-info">
        <span>{user?.name}</span>
      </div>
    </header>
  );
}

function TenantSettings() {
  const { currentTenant, updateTenantSettings } = useTenant();
  const [settings, setSettings] = useState(currentTenant?.settings);
  
  const handleSave = async () => {
    try {
      await updateTenantSettings(settings);
      // Show success message
    } catch (error) {
      // Handle error
    }
  };
  
  return (
    <div className="tenant-settings">
      <h2>Organization Settings</h2>
      
      <form onSubmit={handleSave}>
        <div className="setting-group">
          <label>
            <input 
              type="checkbox"
              checked={settings?.allowSelfRegistration}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                allowSelfRegistration: e.target.checked
              }))}
            />
            Allow self-registration
          </label>
        </div>
        
        <div className="setting-group">
          <label>
            Session timeout (minutes):
            <input 
              type="number"
              value={settings?.sessionTimeout / (1000 * 60)}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                sessionTimeout: parseInt(e.target.value) * 1000 * 60
              }))}
            />
          </label>
        </div>
        
        <div className="branding-settings">
          <h3>Custom Branding</h3>
          <ColorPicker 
            label="Primary Color"
            value={settings?.customBranding?.primaryColor}
            onChange={(color) => setSettings(prev => ({
              ...prev,
              customBranding: {
                ...prev?.customBranding,
                primaryColor: color
              }
            }))}
          />
        </div>
        
        <button type="submit">Save Settings</button>
      </form>
    </div>
  );
}
```

## Development vs Production Setup

### Development with LocalStorage

```tsx
import { createLocalStorageConnector } from 'react-identity-access';

const developmentConnector = createLocalStorageConnector({
  simulateDelay: true,
  minDelay: 200,
  maxDelay: 800,
  errorRate: 0.1, // 10% error rate for testing
  debugMode: true,
  storagePrefix: 'myapp_dev_'
});

// Pre-populate with test data
developmentConnector.seedData({
  users: [
    {
      id: '1',
      email: 'admin@example.com',
      password: 'admin123',
      name: 'Admin User',
      roles: ['admin', 'user']
    },
    {
      id: '2',
      email: 'user@example.com',
      password: 'user123',
      name: 'Regular User',
      roles: ['user']
    }
  ],
  tenants: [
    {
      id: 'tenant1',
      name: 'Acme Corp',
      domain: 'acme.example.com'
    }
  ]
});
```

### Production with API

```tsx
import { createApiConnector } from 'react-identity-access';

const productionConnector = createApiConnector({
  baseUrl: process.env.REACT_APP_API_URL,
  timeout: 10000,
  retries: 3,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Version': '1.0'
  },
  interceptors: {
    request: (config) => {
      // Add CSRF token
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
      return config;
    },
    response: (response) => {
      // Handle global response patterns
      return response;
    },
    error: (error) => {
      // Global error handling
      if (error.status === 401) {
        // Redirect to login
        window.location.href = '/login';
      }
      return error;
    }
  }
});
```

### Environment-Based Connector Selection

```tsx
function createConnector() {
  if (process.env.NODE_ENV === 'development') {
    return createLocalStorageConnector({
      simulateDelay: true,
      debugMode: true
    });
  }
  
  return createApiConnector({
    baseUrl: process.env.REACT_APP_API_URL!,
    timeout: 10000
  });
}

const connector = createConnector();
```

## Debug Examples

### Debug Hook Usage

```tsx
import { useDebug } from 'react-identity-access';

function MyComponent() {
  const { log, error, exportLogs } = useDebug();
  
  const handleAction = async () => {
    log('component', 'Action started', { timestamp: Date.now() });
    
    try {
      await performAction();
      log('component', 'Action completed successfully');
    } catch (err) {
      error('component', 'Action failed', err);
    }
  };
  
  const handleExportLogs = () => {
    const logs = exportLogs();
    downloadFile('debug-logs.json', logs);
  };
  
  return (
    <div>
      <button onClick={handleAction}>Perform Action</button>
      <button onClick={handleExportLogs}>Export Debug Logs</button>
    </div>
  );
}
```

### Debug Configuration

```tsx
<IdentityProvider 
  connector={connector}
  config={{
    debugMode: process.env.NODE_ENV === 'development',
    debugLevel: DebugLevel.DEBUG,
    debugCategories: ['auth', 'roles', 'session'] // Only log these categories
  }}
>
  <App />
</IdentityProvider>
```
