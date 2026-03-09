# Workflow de Desarrollo - React Identity Access

## Problema
El template no ve los cambios de tipos de la librería en tiempo real durante el desarrollo.

## Solución

### 1. Workflow Recomendado (Opción A - Más Estable)

```bash
# Terminal 1: Compilar librería en modo watch
cd /Users/fer/Development/skylabs/react-identity-access
pnpm run dev:types

# Terminal 2: Ejecutar template
cd template
pnpm start
```

### 2. Workflow Alternativo (Opción B - Todo en uno)

```bash
# Desde la raíz del proyecto
pnpm run dev:template
```

### 3. Forzar Actualización de Tipos

Si los tipos no se actualizan:

```bash
# Limpiar cache y rebuild
rm -rf node_modules/.cache dist
pnpm build
cd template
rm -rf node_modules/.cache
pnpm install
```

### 4. Reiniciar TypeScript Server en IDE

- VS Code: `Cmd+Shift+P` → "TypeScript: Restart TS Server"
- Cursor: `Cmd+Shift+P` → "TypeScript: Restart TS Server"

## Scripts Disponibles

- `pnpm run dev:types` - Compila tipos en modo watch
- `pnpm run dev:template` - Ejecuta tipos + template
- `pnpm build` - Build completo de la librería
- `pnpm run demo` - Solo ejecuta el template

## Configuración Aplicada

1. **TypeScript paths** en template/tsconfig.json
2. **Webpack alias** en template/craco.config.js  
3. **Workspace dependency** en template/package.json

El template ahora debería ver los tipos actualizados de `authenticatedHttpService` correctamente.
