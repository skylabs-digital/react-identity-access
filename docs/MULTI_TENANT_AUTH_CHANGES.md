# Cambios en Autenticación Multi-Tenant - Identity Access Hub

## Resumen Ejecutivo

Se ha implementado una nueva estrategia de tokens para autenticación multi-tenant con **dos modos de operación**:

### Modo 1: Login en dos fases (Multi-tenant)
1. **Login Global**: `POST /auth/login` sin `tenantId` → Token global + lista de tenants
2. **Switch Tenant**: `POST /auth/switch-tenant` → Token específico con contexto de tenant

### Modo 2: Login directo (Single-tenant / Atajo)
1. **Login con Tenant**: `POST /auth/login` con `tenantId` → Token específico directamente

Esta arquitectura permite:
- Usuarios multi-tenant: navegar entre tenants sin re-autenticarse
- Apps single-tenant: login directo con contexto de tenant en un solo paso

---

## Motivación del Cambio

### Problema Anterior
- El login requería seleccionar un tenant específico o se generaba un token temporal para selección
- Los usuarios con múltiples tenants debían re-autenticarse para cambiar entre ellos
- El `accessToken` siempre tenía contexto de tenant, limitando operaciones globales

### Solución Actual
- Login retorna tokens **globales** (sin tenant) + lista de tenants disponibles
- El usuario puede operar sin tenant (ver perfil, listar tenants)
- Para operaciones específicas de tenant, usa `switch-tenant` para obtener token con contexto
- El mismo `refreshToken` permite cambiar entre cualquier tenant del usuario

---

## Diagrama del Flujo

### Flujo 1: Login en dos fases (sin tenantId)
```
┌──────────┐                                                    
│  Usuario │                                                    
└────┬─────┘                                                    
     │ 1. POST /auth/login                                      
     │    { username, password, appId }    ← SIN tenantId                  
     ▼                                                          
┌──────────┐     ┌─────────────────────────────────────────────┐
│  IDACHU  │────▶│ Response:                                   │
└──────────┘     │   • accessToken  (GLOBAL, sin tenant)       │
     │           │   • refreshToken                             │
     │           │   • user { tenantId: null, role: null }     │
     │           │   • tenants [{ id, name, role }]            │
     │           └─────────────────────────────────────────────┘
     │                                                          
     │ 2. Usuario selecciona tenant de la lista                 
     │                                                          
     │ 3. POST /auth/switch-tenant                              
     │    { refreshToken, tenantId }                            
     ▼                                                          
┌──────────┐     ┌─────────────────────────────────────────────┐
│  IDACHU  │────▶│ Response:                                   │
└──────────┘     │   • accessToken  (CON tenant + role)        │
                 │   • user { tenantId: "...", role: "..." }   │
                 └─────────────────────────────────────────────┘
```

### Flujo 2: Login directo (con tenantId)
```
┌──────────┐                                                    
│  Usuario │                                                    
└────┬─────┘                                                    
     │ 1. POST /auth/login                                      
     │    { username, password, appId, tenantId }   ← CON tenantId                  
     ▼                                                          
┌──────────┐     ┌─────────────────────────────────────────────┐
│  IDACHU  │────▶│ Response:                                   │
└──────────┘     │   • accessToken  (CON tenant + role)        │
                 │   • refreshToken                             │
                 │   • user { tenantId: "...", role: "..." }   │
                 │   • tenants [{ id, name, role }]            │
                 └─────────────────────────────────────────────┘

✅ Un solo request - ideal para apps single-tenant
```

---

## Cambios en Endpoints

### 1. `POST /auth/login` (Modificado)

#### Request
```typescript
interface LoginRequest {
  username: string;    // Email o número de teléfono
  password: string;
  appId: string;       // UUID de la aplicación
  tenantId?: string;   // OPCIONAL: Si se pasa, genera token con contexto de tenant directamente
}
```

> 💡 **Comportamiento dual**:
> - **Sin `tenantId`**: Retorna token global + lista de tenants (requiere `switch-tenant` después)
> - **Con `tenantId`**: Retorna token específico de tenant directamente (atajo para apps single-tenant)

#### Response (200 OK)
```typescript
interface LoginResponse {
  accessToken: string;      // JWT global O con tenant (según request)
  refreshToken: string;     // Para usar en switch-tenant
  user: {
    id: string;
    email: string | null;
    phoneNumber: string | null;
    name: string;
    lastName: string | null;
    userType: 'USER' | 'SUPERADMIN';
    isActive: boolean;
    appId: string;
    tenantId: string | null;  // null si login sin tenantId, presente si login con tenantId
    role: string | null;      // null si login sin tenantId, presente si login con tenantId
  };
  tenants: Array<{          // Lista de tenants disponibles (siempre incluida)
    id: string;
    name: string;
    subdomain: string;
    role: string | null;    // Rol del usuario en ese tenant
  }>;
  expiresIn: number;        // Segundos hasta expiración (3600)
}
```

#### Payload del JWT (accessToken global)
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "phoneNumber": null,
  "userType": "USER",
  "role": null,           // ← Siempre null
  "tenantId": null,       // ← Siempre null
  "appId": "uuid",
  "iat": 1767030023,
  "exp": 1767033623
}
```

---

### 2. `POST /auth/switch-tenant` (Nuevo - reemplaza a `/auth/select-tenant`)

Este endpoint permite obtener un token con contexto de tenant específico.

#### Request
```typescript
interface SwitchTenantRequest {
  refreshToken: string;   // El refreshToken obtenido en login
  tenantId: string;       // UUID del tenant al que se quiere cambiar
}
```

> ⚠️ **Importante**: No requiere `Authorization` header. El `refreshToken` en el body es suficiente.

#### Response (200 OK)
```typescript
interface SwitchTenantResponse {
  accessToken: string;      // JWT con contexto de tenant
  user: {
    id: string;
    email: string | null;
    phoneNumber: string | null;
    name: string;
    lastName: string | null;
    userType: 'USER' | 'SUPERADMIN';
    isActive: boolean;
    tenantId: string;       // ← El tenant seleccionado
    appId: string;
    role: string | null;    // ← Rol en ese tenant
  };
  expiresIn: number;
}
```

> ⚠️ **Nota**: Este endpoint NO retorna un nuevo `refreshToken`. El `refreshToken` original del login sigue siendo válido para futuros switch-tenant.

#### Payload del JWT (accessToken con tenant)
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "phoneNumber": null,
  "userType": "USER",
  "role": "manager",                    // ← Rol en el tenant
  "tenantId": "tenant-uuid",            // ← Tenant seleccionado
  "appId": "uuid",
  "iat": 1767030041,
  "exp": 1767033641
}
```

#### Errores Posibles

| Status | Código | Descripción |
|--------|--------|-------------|
| 401 | `UNAUTHORIZED` | RefreshToken inválido o expirado |
| 400 | `BAD_REQUEST` | TenantId con formato inválido |
| 403 | `FORBIDDEN` | Usuario no tiene membresía en ese tenant |
| 404 | `NOT_FOUND` | Tenant no existe |

---

### 3. Endpoint Deprecado

| Endpoint Anterior | Reemplazo |
|-------------------|-----------|
| `POST /auth/select-tenant` | `POST /auth/switch-tenant` |

El endpoint anterior usaba `userId` del token en header. El nuevo usa `refreshToken` en el body.

---

## Casos de Uso

### Caso 1: App single-tenant (login directo) ⭐ RECOMENDADO
```
1. Login CON tenantId → Recibe token con contexto de tenant directamente
2. Usar accessToken (ya tiene tenantId y role)
```
**Ideal para**: Apps que ya conocen el tenant del usuario (ej: subdominio)

### Caso 2: Usuario con un solo tenant (auto-switch)
```
1. Login SIN tenantId → Recibe tokens + tenants (1 elemento)
2. Automáticamente hacer switch-tenant al único tenant
3. Usar accessToken con contexto de tenant
```

### Caso 3: Usuario con múltiples tenants (selector)
```
1. Login SIN tenantId → Recibe tokens + tenants (N elementos)
2. Mostrar selector de tenant al usuario
3. Usuario selecciona → switch-tenant
4. Usar accessToken con contexto de tenant
5. Para cambiar: switch-tenant con otro tenantId (mismo refreshToken)
```

### Caso 4: Operaciones globales (sin tenant)
```
1. Login SIN tenantId → Recibe tokens
2. Usar accessToken global para:
   - GET /auth/me (ver perfil)
   - GET /auth/tenants (listar tenants disponibles)
   - Otras operaciones que no requieran contexto de tenant
```

---

## Ejemplo de Implementación en Cliente

### Login directo con tenant (Recomendado para single-tenant)
```typescript
async function loginWithTenant(username: string, password: string, appId: string, tenantId: string) {
  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, appId, tenantId })  // ← Incluye tenantId
  });
  
  const data = await response.json();
  
  // Token ya tiene contexto de tenant - listo para usar
  storage.setAccessToken(data.accessToken);  // Ya tiene tenantId y role
  storage.setRefreshToken(data.refreshToken);
  storage.setCurrentTenant(tenantId);
  
  return data;
}
```

### Login global (para multi-tenant con selector)
```typescript
async function login(username: string, password: string, appId: string) {
  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, appId })  // ← Sin tenantId
  });
  
  const data = await response.json();
  
  // Guardar tokens
  storage.setGlobalAccessToken(data.accessToken);
  storage.setRefreshToken(data.refreshToken);
  
  // Si tiene un solo tenant, hacer switch automático
  if (data.tenants.length === 1) {
    await switchTenant(data.refreshToken, data.tenants[0].id);
  } else {
    // Mostrar selector de tenant
    showTenantSelector(data.tenants);
  }
  
  return data;
}
```

### Switch Tenant
```typescript
async function switchTenant(refreshToken: string, tenantId: string) {
  const response = await fetch('/auth/switch-tenant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken, tenantId })
  });
  
  const data = await response.json();
  
  // Reemplazar accessToken con el nuevo (con contexto de tenant)
  storage.setTenantAccessToken(data.accessToken);
  storage.setCurrentTenant(tenantId);
  
  return data;
}
```

### Cambiar de Tenant (sin re-login)
```typescript
async function changeTenant(newTenantId: string) {
  const refreshToken = storage.getRefreshToken();
  
  // Usar el mismo refreshToken para cambiar a otro tenant
  const data = await switchTenant(refreshToken, newTenantId);
  
  return data;
}
```

---

## Tokens: Cuándo usar cada uno

| Token | Uso | Duración |
|-------|-----|----------|
| `accessToken` (global) | Operaciones sin contexto de tenant | 1 hora |
| `accessToken` (tenant) | Operaciones específicas de tenant | 1 hora |
| `refreshToken` | Obtener nuevos accessTokens via switch-tenant | 7 días |

### Estrategia de Storage Recomendada

```typescript
interface TokenStorage {
  // Token global (del login)
  globalAccessToken: string;
  
  // Token con contexto de tenant (del switch-tenant)
  tenantAccessToken: string | null;
  
  // Refresh token (del login, no cambia)
  refreshToken: string;
  
  // Tenant actualmente seleccionado
  currentTenantId: string | null;
}
```

### Qué token usar en requests

```typescript
function getAuthHeader(requiresTenant: boolean): string {
  if (requiresTenant) {
    // Para operaciones de tenant (crear recursos, etc.)
    return `Bearer ${storage.tenantAccessToken}`;
  } else {
    // Para operaciones globales (perfil, listar tenants)
    return `Bearer ${storage.globalAccessToken}`;
  }
}
```

---

## Validación de JWT en el Payload

Para verificar si un token tiene contexto de tenant:

```typescript
function decodeToken(token: string): JwtPayload {
  const payload = token.split('.')[1];
  return JSON.parse(atob(payload));
}

function hasTenantContext(token: string): boolean {
  const payload = decodeToken(token);
  return payload.tenantId !== null;
}

function getCurrentRole(token: string): string | null {
  const payload = decodeToken(token);
  return payload.role;
}
```

---

## Resumen de Cambios para Migración

### Antes (Deprecado)
```typescript
// Login con tenant
POST /auth/login
{ email, password, tenantId?, appId }

// Seleccionar tenant (requería Authorization header)
POST /auth/select-tenant
Authorization: Bearer <accessToken>
{ tenantId }
```

### Ahora (Actual)
```typescript
// Login sin tenant
POST /auth/login
{ username, password, appId }

// Switch tenant (NO requiere Authorization header)
POST /auth/switch-tenant
{ refreshToken, tenantId }
```

### Checklist de Migración

- [ ] Cambiar `email` por `username` en login request
- [ ] Remover `tenantId` del login request
- [ ] Manejar lista de `tenants` en respuesta de login
- [ ] Implementar llamada a `/auth/switch-tenant` después de login
- [ ] Almacenar `refreshToken` para cambios de tenant
- [ ] Actualizar lógica de selector de tenant para usar switch-tenant
- [ ] No enviar Authorization header en switch-tenant
- [ ] Manejar dos tipos de accessToken (global y tenant-specific)

---

## Preguntas Frecuentes

### ¿El refreshToken cambia al hacer switch-tenant?
No. El refreshToken obtenido en login es válido durante 7 días y sirve para hacer switch-tenant a cualquier tenant del usuario.

### ¿Puedo usar el accessToken global para operaciones de tenant?
No. Las operaciones que requieren contexto de tenant validarán que el token tenga `tenantId` en su payload.

### ¿Qué pasa si el refreshToken expira?
El usuario debe volver a hacer login. El refreshToken tiene duración de 7 días.

### ¿Cómo sé qué rol tiene el usuario en cada tenant?
La respuesta del login incluye la lista de tenants con el rol del usuario en cada uno:
```json
{
  "tenants": [
    { "id": "...", "name": "Tenant A", "role": "admin" },
    { "id": "...", "name": "Tenant B", "role": "viewer" }
  ]
}
```

### ¿El endpoint /auth/select-tenant sigue funcionando?
No. Fue reemplazado por `/auth/switch-tenant` con diferente interfaz.

---

## Contacto

Para dudas sobre la implementación, consultar con el equipo de backend de Identity Access Hub.
