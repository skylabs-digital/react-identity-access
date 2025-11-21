# Development Workflow

## Configuración Inicial (Solo una vez)

### 1. Setup del Link
Desde la raíz del proyecto, ejecuta:

```bash
yarn link:example
```

Esto creará un enlace simbólico entre la librería y el ejemplo.

### 2. Build Inicial
```bash
yarn build
```

## Workflow de Desarrollo Diario

### Opción 1: Desarrollo con Auto-rebuild (Recomendado)

Abre **2 terminales**:

**Terminal 1 - Librería (auto-rebuild):**
```bash
yarn dev
```
Este comando observa cambios en `src/` y recompila automáticamente TypeScript y Vite.

**Terminal 2 - Ejemplo:**
```bash
cd example
yarn start
```

Con este setup:
- ✅ Cambios en la librería se recompilan automáticamente
- ✅ El ejemplo ve los cambios inmediatamente (hot reload)
- ✅ No necesitas ejecutar comandos manualmente

### Opción 2: Build Manual

Si prefieres controlar cuándo se recompila:

```bash
# Hacer cambios en src/
yarn build

# El ejemplo verá los cambios automáticamente
```

## Deshacer el Link

Si necesitas volver a usar la versión publicada:

```bash
yarn unlink:example
```

Esto desvincula el enlace simbólico y reinstala la versión del npm registry.

## Comandos Útiles

```bash
# Ver el estado del link
cd example/node_modules/@skylabs-digital/react-identity-access
ls -la  # Si ves -> apuntando a ../../../ entonces está linkeado

# Rebuild rápido
yarn build

# Limpiar y rebuild
rm -rf dist && yarn build

# Ver errores de TypeScript sin build
yarn type-check
```

## Troubleshooting

### El ejemplo no ve mis cambios
1. Verifica que `yarn dev` está corriendo
2. Verifica que el ejemplo está usando el link: `ls -la example/node_modules/@skylabs-digital/react-identity-access`
3. Reinicia el dev server del ejemplo (Ctrl+C y `yarn start` de nuevo)

### Errores de tipos
1. Para con Ctrl+C el `yarn dev`
2. Ejecuta `yarn build`
3. Reinicia `yarn dev`

### Quiero volver a la versión publicada
```bash
yarn unlink:example
cd example
yarn install --force
```

## Best Practices

1. **Siempre usa `yarn dev`** durante desarrollo activo
2. **Commit con `yarn build`** antes de commit para verificar que compila
3. **Desactiva el link** antes de hacer testing de la versión publicada
4. **No hagas commit del dist/** mientras trabajas con link (gitignore lo maneja)
