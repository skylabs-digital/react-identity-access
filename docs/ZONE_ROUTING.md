# Zone-Based Routing System

> **RFC-005 Implementation** - Sistema unificado de protección de rutas basado en zonas.

## Índice

1. [Resumen](#resumen)
2. [Conceptos Clave](#conceptos-clave)
3. [Instalación y Setup](#instalación-y-setup)
4. [Configuración Global (RoutingProvider)](#configuración-global-con-routingprovider)
5. [Componentes Disponibles](#componentes-disponibles)
6. [Uso Básico](#uso-básico)
7. [Uso Avanzado](#uso-avanzado)
8. [Presets](#presets)
9. [Smart Redirects](#smart-redirects)
10. [Return URL Pattern](#return-url-pattern)
11. [Migración desde Componentes Legacy](#migración-desde-componentes-legacy)
12. [API Reference](#api-reference)
13. [Troubleshooting](#troubleshooting)

---

## Resumen

El sistema de Zone-Based Routing reemplaza los componentes legacy (`TenantRoute`, `LandingRoute`, `ProtectedRoute`) con un sistema unificado y flexible basado en "zonas" de acceso.

### Beneficios

- **Menos repetición**: Configuración centralizada de redirects y fallbacks
- **Smart Redirects**: Redirección automática basada en el estado del usuario
- **AccessMode flexible**: Soporte para zonas exclusivas y no-exclusivas
- **Type-safe**: Tipado completo con TypeScript
- **Presets**: Configuraciones predefinidas para casos comunes

---

## Conceptos Clave

### Zonas

Una "zona" es una combinación de:

| Dimensión | Valores | Descripción |
|-----------|---------|-------------|
| **Tenant** | `required` / `forbidden` / `optional` | Contexto de tenant |
| **Auth** | `required` / `forbidden` / `optional` | Estado de autenticación |
| **UserType** | `USER` / `TENANT_ADMIN` / array | Tipo de usuario requerido |

### AccessMode

```typescript
type AccessMode = 'required' | 'forbidden' | 'optional';
```

| Modo | Comportamiento |
|------|----------------|
| `required` | DEBE cumplir la condición, sino redirect |
| `forbidden` | NO DEBE cumplir la condición, sino redirect |
| `optional` | No importa si cumple o no |

### Matriz de Zonas

```
                    Sin Tenant              Con Tenant
                ┌─────────────────┬─────────────────────┐
   Guest        │ publicGuest (/) │ tenantGuest (/login)│
                ├─────────────────┼─────────────────────┤
   User         │ publicUser      │ tenantUser          │
                │ (/account)      │ (/dashboard)        │
                ├─────────────────┼─────────────────────┤
   Admin        │ publicAdmin     │ tenantAdmin         │
                │ (/admin)        │ (/admin/dashboard)  │
                └─────────────────┴─────────────────────┘
```

---

## Instalación y Setup

### Imports

```typescript
import {
  // Provider de configuración global
  RoutingProvider,
  useRouting,
  
  // Componente base
  ZoneRoute,
  
  // Convenience components
  TenantZone,
  PublicZone,
  AuthenticatedZone,
  GuestZone,
  AdminZone,
  UserZone,
  OpenZone,
  TenantAuthenticatedZone,
  TenantOpenZone,
  TenantGuestZone,
  
  // Hook de navegación
  useZoneNavigation,
  
  // Types
  ZoneRouteProps,
  RoutingConfig,
  AccessMode,
  ZoneRoots,
  
  // Constants
  DEFAULT_ZONE_ROOTS,
  DEFAULT_ZONE_PRESETS,
} from '@skylabs-digital/react-identity-access';
```

### Providers Requeridos

```tsx
// Los ZoneRoute components requieren estos providers:
<TenantProvider config={tenantConfig}>
  <AuthProvider config={authConfig}>
    <RoutingProvider config={routingConfig}>
      <RouterProvider router={router} />
    </RoutingProvider>
  </AuthProvider>
</TenantProvider>
```

### Configuración Global con RoutingProvider

El `RoutingProvider` permite configurar los redirects y fallbacks globalmente para todas las zonas:

```tsx
import { RoutingProvider } from 'react-identity-access';

const routingConfig = {
  // Rutas de redirect por contexto/tipo de usuario
  zoneRoots: {
    publicGuest: '/',              // Landing sin auth
    publicUser: '/account',        // Usuario sin tenant
    publicAdmin: '/admin',         // Admin sin tenant
    tenantGuest: '/login',         // Login page del tenant
    tenantUser: '/dashboard',      // Dashboard de usuario
    tenantAdmin: '/admin/dashboard', // Dashboard de admin
    default: '/',                  // Fallback general
  },
  
  // Fallbacks globales
  loadingFallback: <Spinner />,
  accessDeniedFallback: <AccessDeniedPage />,
  
  // Callback global para access denied
  onAccessDenied: (reason) => {
    analytics.track('access_denied', reason);
  },
  
  // Return URL config
  returnToParam: 'returnTo',      // Query param name
  returnToStorage: 'url',         // 'url' | 'session' | 'local'
};

function App() {
  return (
    <RoutingProvider config={routingConfig}>
      <RouterProvider router={router} />
    </RoutingProvider>
  );
}
```

### ZoneRoots: Matriz de Redirects

Los `zoneRoots` determinan a dónde redirigir según el contexto actual:

| Contexto | Sin Auth | Con Auth (User) | Con Auth (Admin) |
|----------|----------|-----------------|------------------|
| **Sin Tenant** | `publicGuest` | `publicUser` | `publicAdmin` |
| **Con Tenant** | `tenantGuest` | `tenantUser` | `tenantAdmin` |

**Ejemplo de uso:**

```tsx
// Usuario NO logueado intenta acceder a /dashboard
// → Redirect a tenantGuest (/login)

// Usuario logueado (User) intenta acceder a /login
// → Redirect a tenantUser (/dashboard)

// Admin logueado intenta acceder a página de User
// → Redirect a tenantAdmin (/admin/dashboard)
```

### Override Local vs Global

Los props locales siempre tienen precedencia sobre la config global:

```tsx
// Config global: loadingFallback = <Spinner />

// Este usa el global <Spinner />
<TenantAuthenticatedZone>
  <Dashboard />
</TenantAuthenticatedZone>

// Este usa su propio <CustomLoader />
<TenantAuthenticatedZone loadingFallback={<CustomLoader />}>
  <Dashboard />
</TenantAuthenticatedZone>
```

### Sin RoutingProvider (Opcional)

El `RoutingProvider` es **opcional**. Sin él, se usan los defaults:

```tsx
// Funciona sin RoutingProvider, usa DEFAULT_ZONE_ROOTS
<TenantAuthenticatedZone>
  <Dashboard />
</TenantAuthenticatedZone>
```

---

## Componentes Disponibles

### Tabla de Componentes

| Componente | tenant | auth | userType | Caso de Uso |
|------------|--------|------|----------|-------------|
| `ZoneRoute` | configurable | configurable | configurable | Base component |
| `TenantZone` | required | - | - | Páginas que requieren tenant |
| `PublicZone` | forbidden | - | - | Landing page sin tenant |
| `AuthenticatedZone` | - | required | - | Solo usuarios logueados |
| `GuestZone` | - | forbidden | - | Solo usuarios no logueados |
| `AdminZone` | - | required | TENANT_ADMIN | Solo admins |
| `UserZone` | - | required | USER | Solo users regulares |
| `OpenZone` | optional | optional | - | Acceso libre |
| `TenantAuthenticatedZone` | required | required | - | Tenant + logged in |
| `TenantOpenZone` | required | optional | - | Tenant, login opcional |
| `TenantGuestZone` | required | forbidden | - | Login/signup pages |

---

## Uso Básico

### Ejemplo 1: Página de Dashboard (requiere tenant + auth)

```tsx
import { TenantAuthenticatedZone } from 'react-identity-access';

function App() {
  return (
    <Routes>
      <Route
        path="/dashboard"
        element={
          <TenantAuthenticatedZone>
            <Dashboard />
          </TenantAuthenticatedZone>
        }
      />
    </Routes>
  );
}
```

### Ejemplo 2: Página de Login (requiere tenant, prohibe auth)

```tsx
import { TenantGuestZone } from 'react-identity-access';

<Route
  path="/login"
  element={
    <TenantGuestZone redirectTo="/dashboard">
      <LoginPage />
    </TenantGuestZone>
  }
/>
```

### Ejemplo 3: Landing Page (prohibe tenant)

```tsx
import { PublicZone } from 'react-identity-access';

<Route
  path="/"
  element={
    <PublicZone redirectTo="/dashboard">
      <LandingPage />
    </PublicZone>
  }
/>
```

### Ejemplo 4: Panel de Admin

```tsx
import { AdminZone } from 'react-identity-access';

<Route
  path="/admin/*"
  element={
    <AdminZone redirectTo="/dashboard">
      <AdminPanel />
    </AdminZone>
  }
/>
```

---

## Uso Avanzado

### Usando ZoneRoute Directamente

Para casos que no cubren los convenience components:

```tsx
import { ZoneRoute, UserType } from 'react-identity-access';

// Zona que acepta USER o TENANT_ADMIN
<ZoneRoute
  tenant="required"
  auth="required"
  userType={[UserType.USER, UserType.TENANT_ADMIN]}
>
  <SharedPage />
</ZoneRoute>

// Zona con permisos específicos
<ZoneRoute
  tenant="required"
  auth="required"
  requiredPermissions={['billing:read', 'billing:write']}
  requireAllPermissions={true}
>
  <BillingPage />
</ZoneRoute>

// Zona con cualquier permiso (OR)
<ZoneRoute
  auth="required"
  requiredPermissions={['reports:view', 'admin:all']}
  requireAllPermissions={false}
>
  <ReportsPage />
</ZoneRoute>
```

### Usando Presets

```tsx
import { ZoneRoute } from 'react-identity-access';

// Preset "login": tenant=required, auth=forbidden
<ZoneRoute preset="login">
  <LoginPage />
</ZoneRoute>

// Preset "admin": tenant=required, auth=required, userType=TENANT_ADMIN
<ZoneRoute preset="admin">
  <AdminDashboard />
</ZoneRoute>

// Preset con override
<ZoneRoute preset="tenantAuth" userType={UserType.TENANT_ADMIN}>
  <AdminOnly />
</ZoneRoute>
```

### Callbacks y Fallbacks

```tsx
<ZoneRoute
  tenant="required"
  auth="required"
  onAccessDenied={(reason) => {
    // Analytics, logging, etc.
    analytics.track('access_denied', {
      type: reason.type,
      redirectTo: reason.redirectTo,
    });
  }}
  loadingFallback={<Skeleton />}
  accessDeniedFallback={<AccessDeniedMessage />}
>
  <ProtectedContent />
</ZoneRoute>
```

### Return URL Pattern

Guarda la URL actual para redirect post-login:

```tsx
// En la zona protegida
<ZoneRoute
  auth="required"
  returnTo={true} // Guarda current path
>
  <ProtectedPage />
</ZoneRoute>

// Con path custom
<ZoneRoute
  auth="required"
  returnTo="/custom-return-path"
>
  <ProtectedPage />
</ZoneRoute>
```

Uso del hook para manejar return URL:

```tsx
import { useZoneNavigation } from 'react-identity-access';

function LoginPage() {
  const { returnToUrl, clearReturnTo } = useZoneNavigation();
  const navigate = useNavigate();
  
  const handleLoginSuccess = async () => {
    await login(credentials);
    
    // Redirect a returnTo o default
    const redirectPath = returnToUrl || '/dashboard';
    clearReturnTo();
    navigate(redirectPath);
  };
  
  return <LoginForm onSuccess={handleLoginSuccess} />;
}
```

### Smart Redirects

El hook `useZoneNavigation` provee `getSmartRedirect()`:

```tsx
import { useZoneNavigation } from 'react-identity-access';

function SomeComponent() {
  const { getSmartRedirect, navigateToZone } = useZoneNavigation();
  
  // Obtiene redirect basado en estado actual
  const smartPath = getSmartRedirect();
  // Si no hay tenant y no está logueado → "/"
  // Si hay tenant y está logueado como admin → "/admin/dashboard"
  // etc.
  
  // Navegar a una zona específica
  navigateToZone('tenantUser'); // → "/dashboard"
  navigateToZone('publicGuest'); // → "/"
}
```

---

## Presets

### Presets Disponibles

```typescript
const DEFAULT_ZONE_PRESETS = {
  // Landing/Public
  landing: { tenant: 'forbidden', auth: 'optional' },
  publicOnly: { tenant: 'forbidden', auth: 'forbidden' },
  
  // Auth flows
  login: { tenant: 'required', auth: 'forbidden' },
  guest: { auth: 'forbidden' },
  authenticated: { auth: 'required' },
  
  // Tenant zones
  tenant: { tenant: 'required' },
  tenantOpen: { tenant: 'required', auth: 'optional' },
  tenantAuth: { tenant: 'required', auth: 'required' },
  
  // User types
  user: { tenant: 'required', auth: 'required', userType: UserType.USER },
  admin: { tenant: 'required', auth: 'required', userType: UserType.TENANT_ADMIN },
  
  // Open
  open: { tenant: 'optional', auth: 'optional' },
};
```

### Uso de Presets

```tsx
// Equivalentes:
<ZoneRoute preset="admin" />
<AdminZone />
<ZoneRoute tenant="required" auth="required" userType={UserType.TENANT_ADMIN} />

// Override de preset
<ZoneRoute 
  preset="tenantAuth" 
  requiredPermissions={['special:access']}
/>
```

---

## Smart Redirects

### Zone Roots por Defecto

```typescript
const DEFAULT_ZONE_ROOTS = {
  publicGuest: '/',
  publicUser: '/account',
  publicAdmin: '/admin',
  tenantGuest: '/login',
  tenantUser: '/dashboard',
  tenantAdmin: '/admin/dashboard',
  default: '/',
};
```

### Lógica de Smart Redirect

```
┌─────────────────┬──────────────────┬─────────────────────┐
│ Tiene Tenant?   │ Autenticado?     │ Redirect            │
├─────────────────┼──────────────────┼─────────────────────┤
│ No              │ No               │ publicGuest (/)     │
│ No              │ Sí (User)        │ publicUser          │
│ No              │ Sí (Admin)       │ publicAdmin         │
│ Sí              │ No               │ tenantGuest         │
│ Sí              │ Sí (User)        │ tenantUser          │
│ Sí              │ Sí (Admin)       │ tenantAdmin         │
└─────────────────┴──────────────────┴─────────────────────┘
```

---

## Return URL Pattern

### Flujo Completo

```
1. Usuario intenta acceder a /settings (protegida)
2. ZoneRoute detecta que no está autenticado
3. returnTo=true guarda "/settings" en URL
4. Redirect a /login?returnTo=%2Fsettings
5. Usuario hace login
6. LoginPage lee returnToUrl del hook
7. Redirect a /settings
```

### Storage Options

```typescript
type ReturnToStorage = 'url' | 'session' | 'local';

// URL (default): ?returnTo=/path
// Session: sessionStorage.setItem('zone_return_to', '/path')
// Local: localStorage.setItem('zone_return_to', '/path')
```

---

## Migración desde Componentes Legacy

### TenantRoute → TenantZone

```tsx
// ❌ Antes (deprecated)
<TenantRoute redirectTo="/" fallback={<Loading />}>
  <Page />
</TenantRoute>

// ✅ Después
<TenantZone redirectTo="/" loadingFallback={<Loading />}>
  <Page />
</TenantZone>
```

### LandingRoute → PublicZone

```tsx
// ❌ Antes (deprecated)
<LandingRoute redirectTo="/dashboard">
  <LandingPage />
</LandingRoute>

// ✅ Después
<PublicZone redirectTo="/dashboard">
  <LandingPage />
</PublicZone>
```

### ProtectedRoute → AuthenticatedZone / AdminZone

```tsx
// ❌ Antes (deprecated)
<ProtectedRoute redirectTo="/login">
  <Dashboard />
</ProtectedRoute>

// ✅ Después
<AuthenticatedZone redirectTo="/login">
  <Dashboard />
</AuthenticatedZone>

// ❌ Antes con userType
<ProtectedRoute requiredUserType={UserType.TENANT_ADMIN}>
  <AdminPanel />
</ProtectedRoute>

// ✅ Después
<AdminZone>
  <AdminPanel />
</AdminZone>
```

---

## API Reference

### ZoneRouteProps

```typescript
interface ZoneRouteProps {
  children: ReactNode;
  
  // Preset (shorthand)
  preset?: keyof ZonePresets | string;
  
  // Zone requirements
  tenant?: AccessMode;      // 'required' | 'forbidden' | 'optional'
  auth?: AccessMode;        // 'required' | 'forbidden' | 'optional'
  
  // User type (solo cuando auth='required')
  userType?: UserType | UserType[];
  
  // Permissions
  requiredPermissions?: string[];
  requireAllPermissions?: boolean; // default: true
  
  // Return URL
  returnTo?: boolean | string;
  
  // Callbacks
  onAccessDenied?: (reason: AccessDeniedReason) => void;
  
  // Fallbacks
  redirectTo?: string;
  loadingFallback?: ReactNode;
  accessDeniedFallback?: ReactNode;
}
```

### AccessDeniedReason

```typescript
interface AccessDeniedReason {
  type: AccessDeniedType;
  // 'no_tenant' | 'has_tenant' | 'not_authenticated' | 
  // 'already_authenticated' | 'wrong_user_type' | 'missing_permissions'
  
  required?: {
    tenant?: AccessMode;
    auth?: AccessMode;
    userType?: UserType | UserType[];
    permissions?: string[];
  };
  
  current?: {
    hasTenant: boolean;
    isAuthenticated: boolean;
    userType?: UserType;
    permissions?: string[];
  };
  
  redirectTo: string;
}
```

### useZoneNavigation

```typescript
function useZoneNavigation(options?: {
  zoneRoots?: ZoneRoots;
  returnToParam?: string;
  returnToStorage?: ReturnToStorage;
}): {
  returnToUrl: string | null;
  clearReturnTo: () => void;
  setReturnTo: (url: string) => void;
  navigateToZone: (zone: keyof ZoneRoots) => void;
  getSmartRedirect: () => string;
};
```

---

## Troubleshooting

### Error: "useTenant must be used within a TenantProvider"

```tsx
// ❌ Mal: ZoneRoute fuera de TenantProvider
<ZoneRoute tenant="required">...</ZoneRoute>

// ✅ Bien: Dentro de providers
<TenantProvider config={config}>
  <ZoneRoute tenant="required">...</ZoneRoute>
</TenantProvider>
```

### El redirect no funciona

1. Verificar que `redirectTo` está definido o que `DEFAULT_ZONE_ROOTS` es correcto
2. Verificar que React Router está configurado con las rutas correspondientes

### returnTo no persiste

```tsx
// Verificar que returnTo está habilitado
<ZoneRoute auth="required" returnTo={true}>
  ...
</ZoneRoute>

// Y que se consume en login
const { returnToUrl } = useZoneNavigation();
```

### Usuario siempre es redirigido

Verificar el estado de autenticación y tenant:

```tsx
const { isAuthenticated, currentUser } = useAuth();
const { tenant } = useTenant();

console.log({
  isAuthenticated,
  userType: currentUser?.userType,
  hasTenant: Boolean(tenant),
});
```

---

## Ejemplos Completos

### App con Routing Completo

```tsx
import {
  TenantZone,
  PublicZone,
  TenantGuestZone,
  TenantAuthenticatedZone,
  AdminZone,
} from 'react-identity-access';

function AppRoutes() {
  return (
    <Routes>
      {/* Landing - sin tenant */}
      <Route
        path="/"
        element={
          <PublicZone>
            <LandingPage />
          </PublicZone>
        }
      />
      
      {/* Login - con tenant, sin auth */}
      <Route
        path="/login"
        element={
          <TenantGuestZone redirectTo="/dashboard">
            <LoginPage />
          </TenantGuestZone>
        }
      />
      
      {/* Signup */}
      <Route
        path="/signup"
        element={
          <TenantGuestZone redirectTo="/dashboard">
            <SignupPage />
          </TenantGuestZone>
        }
      />
      
      {/* Dashboard - con tenant, con auth */}
      <Route
        path="/dashboard"
        element={
          <TenantAuthenticatedZone returnTo={true}>
            <DashboardPage />
          </TenantAuthenticatedZone>
        }
      />
      
      {/* Settings */}
      <Route
        path="/settings/*"
        element={
          <TenantAuthenticatedZone returnTo={true}>
            <SettingsPage />
          </TenantAuthenticatedZone>
        }
      />
      
      {/* Admin Panel */}
      <Route
        path="/admin/*"
        element={
          <AdminZone>
            <AdminPanel />
          </AdminZone>
        }
      />
      
      {/* Página pública dentro de tenant (ej: términos) */}
      <Route
        path="/terms"
        element={
          <TenantZone>
            <TermsPage />
          </TenantZone>
        }
      />
    </Routes>
  );
}
```

### Login con Return URL

```tsx
import { useZoneNavigation } from 'react-identity-access';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'react-identity-access';

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { returnToUrl, clearReturnTo } = useZoneNavigation();
  
  const handleSubmit = async (credentials: LoginCredentials) => {
    try {
      await login(credentials);
      
      // Redirect a donde intentaba ir, o dashboard
      const redirectPath = returnToUrl || '/dashboard';
      clearReturnTo();
      navigate(redirectPath, { replace: true });
    } catch (error) {
      // Handle error
    }
  };
  
  return (
    <div>
      {returnToUrl && (
        <p>Después del login serás redirigido a: {returnToUrl}</p>
      )}
      <LoginForm onSubmit={handleSubmit} />
    </div>
  );
}
```

---

## Para Agentes de IA

### Reglas de Uso

1. **Siempre usar convenience components cuando sea posible** - Son más legibles
2. **Usar `ZoneRoute` directo solo para casos especiales** - userType array, permisos específicos
3. **Agregar `returnTo={true}` en rutas protegidas** - Mejora UX
4. **No mezclar componentes legacy con nuevos** - Migrar todo o nada

### Patrones Comunes

```tsx
// ✅ Landing page
<PublicZone><Landing /></PublicZone>

// ✅ Login/Signup
<TenantGuestZone><Login /></TenantGuestZone>

// ✅ Dashboard/App pages
<TenantAuthenticatedZone returnTo><Dashboard /></TenantAuthenticatedZone>

// ✅ Admin pages
<AdminZone><AdminPanel /></AdminZone>

// ✅ Páginas que cualquiera puede ver dentro de tenant
<TenantZone><PublicTenantPage /></TenantZone>

// ✅ Permisos específicos
<ZoneRoute auth="required" requiredPermissions={['billing:manage']}>
  <BillingPage />
</ZoneRoute>
```

### Anti-Patrones

```tsx
// ❌ No usar componentes legacy
<TenantRoute>...</TenantRoute>
<LandingRoute>...</LandingRoute>
<ProtectedRoute>...</ProtectedRoute>

// ❌ No duplicar lógica de auth
<ZoneRoute auth="required">
  {isAuthenticated ? <Page /> : <Redirect />} // Redundante
</ZoneRoute>

// ❌ No olvidar returnTo en páginas protegidas importantes
<TenantAuthenticatedZone> // Debería tener returnTo={true}
  <ImportantPage />
</TenantAuthenticatedZone>
```
