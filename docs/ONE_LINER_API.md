# One-Liner API Design

## Filosofía: 90% Out-of-the-Box

La librería debe permitir crear aplicaciones completas con autenticación, autorización y multi-tenancy en minutos, no horas.

## Setup Ultra-Rápido

### 1. Setup Básico (1 línea)

```tsx
import { createApp } from 'react-identity-access';

// Crea una app completa con admin y client panels
const App = createApp();

export default App;
```

Esto genera automáticamente:
- Login/Signup/Recovery screens
- Admin panel con gestión de usuarios, roles, tenants
- Client panel con dashboard, perfil, configuraciones
- Ruteo completo
- Mock data para desarrollo
- Debug tools

### 2. Setup con Configuración Mínima

```tsx
import { createApp } from 'react-identity-access';

const App = createApp({
  // Configuración del tenant
  tenant: {
    name: 'Mi App',
    logo: '/logo.png',
    primaryColor: '#007bff'
  },
  
  // Mock users para desarrollo
  mockUsers: {
    admin: { email: 'admin@test.com', password: 'admin' },
    client: { email: 'user@test.com', password: 'user' }
  }
});

export default App;
```

### 3. Setup con Backend Real

```tsx
import { createApp } from 'react-identity-access';

const App = createApp({
  api: {
    baseUrl: 'https://api.miapp.com',
    // La librería maneja automáticamente todos los endpoints estándar
  }
});

export default App;
```

## Componentes One-Liner

### Admin Panel Completo

```tsx
import { AdminApp } from 'react-identity-access';

// Panel admin completo con todas las funcionalidades
function App() {
  return <AdminApp />;
}
```

Incluye automáticamente:
- Dashboard con métricas
- Gestión de usuarios (CRUD completo)
- Gestión de roles y permisos
- Configuraciones del sistema
- Analytics básicos
- Logs de actividad

### Client Panel Completo

```tsx
import { ClientApp } from 'react-identity-access';

// Panel cliente completo
function App() {
  return <ClientApp />;
}
```

Incluye automáticamente:
- Dashboard personalizado
- Perfil de usuario
- Configuraciones de cuenta
- Notificaciones
- Soporte/Help

### App Híbrida (Admin + Client)

```tsx
import { HybridApp } from 'react-identity-access';

// App que detecta automáticamente si mostrar admin o client
function App() {
  return <HybridApp />;
}
```

Detecta automáticamente:
- Roles del usuario
- URL actual (/admin/* vs /dashboard/*)
- Permisos disponibles
- Cambia la UI automáticamente

## Herramientas de Desarrollo One-Liner

### 1. Panel de Desarrollo Flotante

```tsx
import { DevTools } from 'react-identity-access';

function App() {
  return (
    <>
      <MyApp />
      <DevTools /> {/* Solo en desarrollo */}
    </>
  );
}
```

El DevTools incluye automáticamente:
- Switcher Admin/Client con un click
- Mock de usuarios predefinidos
- Test de permisos en tiempo real
- Debug de rutas
- Simulador de roles
- Export de logs

### 2. Quick Panel Switcher

```tsx
import { QuickSwitcher } from 'react-identity-access';

// Botón flotante para cambiar entre admin/client
<QuickSwitcher />
```

### 3. Auto Mock Data

```tsx
import { withMockData } from 'react-identity-access';

// Envuelve tu app y automáticamente carga datos de prueba
const App = withMockData(MyApp, {
  users: 50,      // Genera 50 usuarios random
  tenants: 3,     // 3 tenants de prueba
  roles: 'default' // Roles estándar (admin, user, moderator)
});
```

## Configuraciones Predefinidas

### 1. Configuraciones por Industria

```tsx
import { createApp, presets } from 'react-identity-access';

// Preset para SaaS B2B
const App = createApp(presets.saasB2B);

// Preset para E-commerce
const App = createApp(presets.ecommerce);

// Preset para Educational
const App = createApp(presets.education);
```

Cada preset incluye:
- Roles específicos de la industria
- Permisos predefinidos
- UI adaptada al contexto
- Mock data relevante

### 2. Templates de Panel

```tsx
import { AdminPanel, ClientPanel } from 'react-identity-access';

// Templates predefinidos
<AdminPanel template="crm" />        // CRM-style admin
<AdminPanel template="analytics" />   // Analytics-focused
<AdminPanel template="ecommerce" />   // E-commerce admin

<ClientPanel template="dashboard" />  // Standard dashboard
<ClientPanel template="profile" />    // Profile-focused
<ClientPanel template="minimal" />    // Minimal UI
```

## Hooks Ultra-Simples

### 1. useQuickAuth

```tsx
import { useQuickAuth } from 'react-identity-access';

function MyComponent() {
  const { user, isAdmin, isClient, switchToAdmin, switchToClient } = useQuickAuth();
  
  // Un click para cambiar contexto
  return (
    <div>
      {isAdmin ? <AdminView /> : <ClientView />}
      <button onClick={switchToAdmin}>Ver como Admin</button>
      <button onClick={switchToClient}>Ver como Cliente</button>
    </div>
  );
}
```

### 2. useAutoPanel

```tsx
import { useAutoPanel } from 'react-identity-access';

function App() {
  // Automáticamente detecta y renderiza el panel correcto
  const PanelComponent = useAutoPanel();
  
  return <PanelComponent />;
}
```

### 3. useDevMode

```tsx
import { useDevMode } from 'react-identity-access';

function MyComponent() {
  const { 
    mockAsAdmin, 
    mockAsClient, 
    testRoute, 
    resetMocks,
    quickLogin 
  } = useDevMode();
  
  // Herramientas de desarrollo en un hook
  return (
    <div>
      <button onClick={() => quickLogin('admin')}>Login as Admin</button>
      <button onClick={() => quickLogin('client')}>Login as Client</button>
      <button onClick={() => testRoute('/admin/users')}>Test Admin Route</button>
    </div>
  );
}
```

## Routing Automático

### 1. Auto-Router

```tsx
import { AutoRouter } from 'react-identity-access';

// Ruteo automático basado en roles y permisos
function App() {
  return (
    <AutoRouter>
      {/* Rutas se generan automáticamente */}
      <CustomRoute path="/custom" component={MyCustomPage} />
    </AutoRouter>
  );
}
```

Genera automáticamente:
- `/login`, `/signup`, `/recover`
- `/admin/*` (todas las rutas admin)
- `/dashboard/*` (todas las rutas client)
- Redirects inteligentes
- Guards de protección

### 2. Smart Redirects

```tsx
import { SmartRedirect } from 'react-identity-access';

// Redirige inteligentemente según el contexto del usuario
<SmartRedirect />
```

Lógica automática:
- Admin → `/admin/dashboard`
- Client → `/dashboard`
- Guest → `/login`
- Error → `/landing`

## Componentes de UI Predefinidos

### 1. Instant Admin

```tsx
import { InstantAdmin } from 'react-identity-access';

// Admin panel completo en una línea
<InstantAdmin />
```

Incluye automáticamente:
- Sidebar con navegación
- Header con user menu
- Dashboard con widgets
- Todas las páginas CRUD
- Responsive design
- Dark/Light mode

### 2. Instant Client

```tsx
import { InstantClient } from 'react-identity-access';

// Client panel completo en una línea
<InstantClient />
```

### 3. Instant Landing

```tsx
import { InstantLanding } from 'react-identity-access';

// Landing page con tenant selection
<InstantLanding />
```

## Configuración por Variables de Entorno

```bash
# .env
REACT_APP_IDENTITY_PRESET=saas-b2b
REACT_APP_IDENTITY_MOCK_DATA=true
REACT_APP_IDENTITY_DEV_TOOLS=true
REACT_APP_IDENTITY_AUTO_LOGIN=admin@test.com
```

```tsx
// La librería lee automáticamente las variables
const App = createApp(); // Sin configuración, usa .env
```

## Ejemplos de Uso Real

### Startup MVP (5 minutos)

```tsx
import { createApp } from 'react-identity-access';

const App = createApp({
  preset: 'startup-mvp',
  mockUsers: true,
  devTools: true
});

export default App;
```

### SaaS B2B (10 minutos)

```tsx
import { HybridApp } from 'react-identity-access';

function App() {
  return (
    <HybridApp 
      preset="saas-b2b"
      tenant={{
        name: 'Mi SaaS',
        logo: '/logo.png',
        primaryColor: '#6366f1'
      }}
    />
  );
}
```

### E-commerce Admin (15 minutos)

```tsx
import { AdminApp } from 'react-identity-access';

function App() {
  return (
    <AdminApp 
      preset="ecommerce"
      modules={['products', 'orders', 'customers', 'analytics']}
    />
  );
}
```

## Extensibilidad Simple

### Agregar Páginas Custom

```tsx
import { AdminApp } from 'react-identity-access';

function App() {
  return (
    <AdminApp>
      <AdminApp.CustomPage 
        path="/custom" 
        title="Mi Página" 
        component={MyCustomPage} 
      />
    </AdminApp>
  );
}
```

### Override de Componentes

```tsx
import { AdminApp, MyCustomUserList } from 'react-identity-access';

function App() {
  return (
    <AdminApp 
      overrides={{
        UserList: MyCustomUserList  // Reemplaza el componente por defecto
      }}
    />
  );
}
```

### Hooks Personalizados

```tsx
import { useIdentity } from 'react-identity-access';

// Hook que extiende la funcionalidad base
function useMyCustomAuth() {
  const identity = useIdentity();
  
  return {
    ...identity,
    myCustomMethod: () => { /* ... */ }
  };
}
```

## CLI para Scaffolding

```bash
# Instalar CLI
npm install -g @react-identity-access/cli

# Crear proyecto nuevo
npx create-identity-app my-app --preset saas-b2b

# Agregar a proyecto existente
npx add-identity-access --preset startup-mvp

# Generar componentes
npx identity generate admin-page --name UserAnalytics
npx identity generate client-page --name Dashboard
```

## Resumen de Beneficios

1. **Setup en minutos**: App completa con una línea de código
2. **90% out-of-the-box**: Todo funciona sin configuración
3. **Desarrollo ágil**: Herramientas integradas para testing
4. **Extensible**: Fácil customización cuando se necesita
5. **Presets inteligentes**: Configuraciones por industria
6. **Mock data automático**: Testing sin backend
7. **Dev tools integrados**: Debug y testing visual
8. **Responsive por defecto**: UI adaptativa automática
