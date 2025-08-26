# Feature Flags System

## Filosofía: Control Jerárquico + One-Liner

El sistema de feature flags permite control granular con dos niveles:
1. **Empresa/Server**: Controla qué features están disponibles para cada tenant
2. **Tenant Admin**: Controla qué features están visibles en su sección (solo si la empresa lo permite)

## Setup Ultra-Simple

### 1. Automático con createApp

```tsx
import { createApp } from 'react-identity-access';

// Feature flags incluidos automáticamente
const App = createApp({
  featureFlags: {
    source: 'auto', // localStorage en dev, API en prod
    seedData: {
      'premium-analytics': {
        adminEditable: true,
        defaultState: true
      },
      'system-maintenance': {
        adminEditable: false,
        defaultState: false
      }
    }
  }
});
```

### 2. Configuración Manual

```tsx
import { FeatureFlagsProvider } from 'react-identity-access';

<FeatureFlagsProvider
  source="api" // 'api' | 'localStorage' | 'static'
  endpoint="/api/feature-flags"
  refreshInterval={300000} // 5 minutos
>
  <App />
</FeatureFlagsProvider>
```

## Componentes One-Liner

### 1. FeatureFlag - Componente Simple

```tsx
import { FeatureFlag } from 'react-identity-access';

// Mostrar contenido solo si el flag está activo
<FeatureFlag flag="new-dashboard">
  <NewDashboardComponent />
</FeatureFlag>

// Con fallback
<FeatureFlag flag="premium-features" fallback={<UpgradePrompt />}>
  <PremiumFeatures />
</FeatureFlag>

// Con múltiples flags (AND logic)
<FeatureFlag flags={['beta-ui', 'advanced-analytics']}>
  <BetaAnalytics />
</FeatureFlag>

// Con múltiples flags (OR logic)
<FeatureFlag flags={['mobile-app', 'pwa-support']} requireAll={false}>
  <MobileFeatures />
</FeatureFlag>

// El scope se define por dónde se usa, no por props
// En sección admin:
<FeatureFlag flag="admin-analytics">
  <AdminAnalytics />
</FeatureFlag>

// En sección cliente:
<FeatureFlag flag="client-dashboard">
  <ClientDashboard />
</FeatureFlag>
```

### 2. withFeatureFlag - HOC

```tsx
import { withFeatureFlag } from 'react-identity-access';

// Envolver componente con flag
const EnhancedDashboard = withFeatureFlag('new-dashboard')(Dashboard);

// Con opciones
const PremiumDashboard = withFeatureFlag('premium-features', {
  fallback: UpgradePrompt,
  loading: <Spinner />
})(Dashboard);

// Múltiples flags
const BetaComponent = withFeatureFlag(['beta-ui', 'user-testing'])(MyComponent);
```

### 3. FeatureToggle - Switch Component

```tsx
import { FeatureToggle } from 'react-identity-access';

// Alternar entre componentes según flag
<FeatureToggle
  flag="new-ui"
  enabled={<NewUI />}
  disabled={<OldUI />}
/>

// Con loading state
<FeatureToggle
  flag="experimental-feature"
  enabled={<ExperimentalFeature />}
  disabled={<StandardFeature />}
  loading={<FeatureLoadingSpinner />}
/>
```

## Hooks Ultra-Simples

### 1. useFeatureFlag

```tsx
import { useFeatureFlag } from 'react-identity-access';

function MyComponent() {
  const isNewUIEnabled = useFeatureFlag('new-ui');
  const hasAdvancedFeatures = useFeatureFlag(['premium', 'advanced']);
  
  return (
    <div>
      {isNewUIEnabled ? <NewUI /> : <OldUI />}
      {hasAdvancedFeatures && <AdvancedPanel />}
    </div>
  );
}
```

### 2. useFeatureFlags

```tsx
import { useFeatureFlags } from 'react-identity-access';

function Dashboard() {
  const { 
    flags,           // Todos los flags disponibles
    isEnabled,       // Función para verificar flags
    serverFlags,     // Flags del servidor
    adminOverrides,  // Overrides del admin
    refresh          // Refrescar flags del servidor
  } = useFeatureFlags();
  
  const showBeta = isEnabled('beta-features');
  const showAnalytics = isEnabled(['analytics', 'reporting'], { requireAll: false });
  
  return (
    <div>
      {showBeta && <BetaSection />}
      {showAnalytics && <AnalyticsPanel />}
    </div>
  );
}
```

### 3. useAdminFeatureControl

```tsx
import { useAdminFeatureControl } from 'react-identity-access';

function AdminFeaturePanel() {
  const { 
    availableFlags,
    toggleFlag,
    resetFlag,
    bulkToggle,
    hasOverride
  } = useAdminFeatureControl();
  
  return (
    <div>
      {availableFlags.map(flag => (
        <div key={flag.key}>
          <span>{flag.name}</span>
          <span>Server: {flag.serverEnabled ? '✅' : '❌'}</span>
          <span>Local: {flag.localEnabled ? '✅' : '❌'}</span>
          <button onClick={() => toggleFlag(flag.key)}>
            {hasOverride(flag.key) ? 'Remove Override' : 'Override'}
          </button>
        </div>
      ))}
    </div>
  );
}
```

## Arquitectura del Sistema

### Tipos de Feature Flags

```typescript
interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  category: 'ui' | 'feature' | 'experiment' | 'rollout';
  
  // Control del servidor (empresa)
  serverEnabled: boolean;
  tenantId?: string;
  userSegment?: string[];
  rolloutPercentage?: number;
  
  // Configuración de control
  adminEditable: boolean;  // Si el tenant admin puede editarlo
  defaultState: boolean;   // Estado por defecto cuando está habilitado
  
  // Control del tenant admin (solo si adminEditable = true)
  tenantOverride?: boolean;
  overrideReason?: string;
  overrideBy?: string;
  overrideAt?: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

interface FeatureFlagsState {
  flags: Record<string, FeatureFlag>;
  serverFlags: Record<string, boolean>;
  tenantOverrides: Record<string, boolean>;
  editableFlags: string[]; // Solo flags que el tenant admin puede editar
  isLoading: boolean;
  lastSync: Date | null;
  error: string | null;
}
```

### Lógica de Resolución

```typescript
// Orden de prioridad para determinar si un flag está activo:
// 1. Si la empresa deshabilitó el flag → false (ni aparece al tenant admin)
// 2. Si hay tenant override → usar ese valor
// 3. Usar defaultState del flag

function resolveFlag(flagKey: string): boolean {
  const flag = flags[flagKey];
  if (!flag) return false;
  
  // Si la empresa deshabilitó el flag, no está disponible
  if (!flag.serverEnabled) return false;
  
  // Si el tenant admin puede editarlo y tiene override
  if (flag.adminEditable && flag.tenantOverride !== undefined) {
    return flag.tenantOverride;
  }
  
  // Usar el estado por defecto
  return flag.defaultState;
}
```

## Configuraciones Avanzadas

### 1. Configuración Global de Flags

```tsx
import { createApp } from 'react-identity-access';

const App = createApp({
  featureFlags: {
    endpoint: '/api/tenants/{tenantId}/feature-flags',
    seedData: {
      'basic-features': {
        adminEditable: false,  // Solo empresa controla
        defaultState: true
      },
      'premium-features': {
        adminEditable: true,   // Tenant admin puede controlar
        defaultState: false
      },
      'custom-branding': {
        adminEditable: true,
        defaultState: true
      }
    }
  }
});
```

### 2. Flags con Validación de Roles

```tsx
<FeatureFlag 
  flag="admin-analytics" 
  requiredRoles={['admin']}
  requiredPermissions={['view:analytics']}
>
  <AdminAnalytics />
</FeatureFlag>
```

### 3. Flags con Rollout Gradual

```tsx
<FeatureFlag 
  flag="new-feature"
  rolloutPercentage={25} // Solo para 25% de usuarios
  userSegment={['beta-testers']}
>
  <NewFeature />
</FeatureFlag>
```

## Admin Panel Integration

### Componentes Opcionales para Tenant Admin

```tsx
import { TenantFeatureFlagsPanel } from 'react-identity-access';

// Componente opcional para que tenant admin controle sus flags
<TenantFeatureFlagsPanel 
  showDescriptions={true}
  allowBulkOperations={true}
  categories={['ui', 'features']}
/>
```

El panel incluye:
- Lista de flags editables por el tenant admin
- Estado actual vs default
- Toggle para overrides
- Descripción de cada feature
- Búsqueda y filtros por categoría

### Componente Simple

```tsx
import { FeatureFlagsList } from 'react-identity-access';

// Lista simple de flags editables
<FeatureFlagsList 
  compact={true}
  showToggles={true}
/>
```

## Development Tools

### 1. Feature Flags Debug Panel

```tsx
import { DevTools } from 'react-identity-access';

// DevTools incluye automáticamente panel de feature flags
<DevTools showFeatureFlags={true} />
```

### 2. Mock Feature Flags

```tsx
import { withMockData } from 'react-identity-access';

const App = withMockData(MyApp, {
  featureFlags: {
    'new-ui': true,
    'beta-features': false,
    'premium-analytics': true
  }
});
```

### 3. Feature Flag Testing

```tsx
import { useDevMode } from 'react-identity-access';

function TestComponent() {
  const { enableFlag, disableFlag, resetFlags } = useDevMode();
  
  return (
    <div>
      <button onClick={() => enableFlag('beta-ui')}>Enable Beta UI</button>
      <button onClick={() => disableFlag('beta-ui')}>Disable Beta UI</button>
      <button onClick={resetFlags}>Reset All Flags</button>
    </div>
  );
}
```

## Ejemplos de Uso

### 1. UI Experiments (Tenant Admin Controlable)

```tsx
function Dashboard() {
  return (
    <div>
      {/* Flag que tenant admin puede controlar */}
      <FeatureToggle
        flag="new-dashboard-layout"  // adminEditable: true en seed
        enabled={<NewDashboardLayout />}
        disabled={<ClassicDashboardLayout />}
      />
      
      {/* Flag que solo empresa controla */}
      <FeatureFlag flag="system-sidebar">  {/* adminEditable: false */}
        <SystemSidebar />
      </FeatureFlag>
    </div>
  );
}
```

### 2. Premium Features (Control Mixto)

```tsx
function UserProfile() {
  const isPremium = useFeatureFlag('premium-features');  // Solo empresa
  const showCustomization = useFeatureFlag('profile-customization');  // Tenant admin puede controlar
  
  return (
    <div>
      <BasicProfile />
      
      {/* Feature que solo la empresa controla */}
      {isPremium && <PremiumBadge />}
      
      {/* Feature que tenant admin puede mostrar/ocultar */}
      <FeatureFlag flag="profile-customization" fallback={<BasicProfile />}>
        <ProfileCustomizer />
      </FeatureFlag>
    </div>
  );
}
```

### 3. Gradual Rollouts

```tsx
function NewFeatureRollout() {
  return (
    <FeatureFlag 
      flag="new-chat-system"
      rolloutPercentage={50}
      userSegment={['active-users']}
      fallback={<OldChatSystem />}
    >
      <NewChatSystem />
    </FeatureFlag>
  );
}
```

### 4. A/B Testing

```tsx
function ABTestComponent() {
  const variant = useFeatureFlag('checkout-ab-test'); // 'A' | 'B' | false
  
  if (variant === 'A') return <CheckoutVariantA />;
  if (variant === 'B') return <CheckoutVariantB />;
  return <DefaultCheckout />;
}
```

## Integración con Backend

### API Endpoints Esperados

```typescript
// GET /api/feature-flags
// GET /api/tenants/{tenantId}/feature-flags
// POST /api/feature-flags/{flagKey}/toggle
// PUT /api/feature-flags/{flagKey}/override
```

### Formato de Respuesta

```json
{
  "flags": {
    "new-ui": {
      "key": "new-ui",
      "name": "New UI Design",
      "description": "Enable the new user interface",
      "category": "ui",
      "serverEnabled": true,
      "adminEditable": true,
      "defaultState": true,
      "tenantId": "tenant-123"
    },
    "system-maintenance": {
      "key": "system-maintenance",
      "name": "System Maintenance Mode",
      "description": "Show maintenance banner",
      "category": "system",
      "serverEnabled": false,
      "adminEditable": false,
      "defaultState": false,
      "tenantId": "tenant-123"
    }
  },
  "lastUpdated": "2024-01-01T00:00:00Z"
}
```

## Configuración por Environment

```bash
# .env
REACT_APP_FEATURE_FLAGS_SOURCE=api
REACT_APP_FEATURE_FLAGS_ENDPOINT=/api/feature-flags
REACT_APP_FEATURE_FLAGS_REFRESH_INTERVAL=300000

# Development overrides (simula servidor)
REACT_APP_FF_NEW_UI=true
REACT_APP_FF_BETA_FEATURES=false
REACT_APP_FF_SYSTEM_MAINTENANCE=false
```

## Beneficios del Sistema

1. **Control Jerárquico**: Empresa controla disponibilidad, tenant admin controla visibilidad
2. **Zero Config**: Funciona automáticamente con createApp
3. **Componentes Simples**: FeatureFlag, FeatureToggle, withFeatureFlag
4. **Configuración Flexible**: adminEditable define qué puede controlar cada nivel
5. **Dev Tools**: Debug panel y testing utilities
6. **Tenant Isolation**: Solo ve flags que puede editar
7. **Gradual Rollouts**: Porcentajes y segmentos de usuarios
8. **Type Safe**: Completamente tipado con TypeScript
