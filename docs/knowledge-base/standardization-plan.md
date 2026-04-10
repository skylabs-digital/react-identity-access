# Standardization Plan — react-identity-access

> **Status: historical reference.** This document was generated as a one-time standardization audit. Some items have been completed; others remain as low-priority follow-ups. It lives under `docs/knowledge-base/` so it stays out of the top-level project surface while remaining searchable.
>
> Originally generated via Skylabs MCP rules (`project-standardization`, `coding-style`, `testing`), adapted for an **npm library project** (not a full-stack monolith).

---

## Resumen del Análisis

### Tipo de Proyecto

- **Librería React** publicada como `@skylabs-digital/react-identity-access`
- Build: Vite (ESM + CJS)
- CI: GitHub Actions → semantic-release → npm publish
- Package manager: **yarn** ✅

### Estado Actual — Cumplimiento

| Área                  | Estado           | Detalle                                                                                           |
| --------------------- | ---------------- | ------------------------------------------------------------------------------------------------- |
| TypeScript strict     | ✅ OK            | `strict: true` en tsconfig.json                                                                   |
| ESLint                | ⚠️ Parcial       | `no-explicit-any: off` — debe ser `warn` mínimo                                                   |
| Prettier              | ✅ OK            | Configurado correctamente                                                                         |
| Husky + lint-staged   | ✅ OK            | pre-commit (lint-staged), commit-msg (commitlint)                                                 |
| Commitlint            | ✅ OK            | Conventional commits configurado                                                                  |
| Semantic Release      | ✅ OK            | Pipeline completo con changelog                                                                   |
| Vitest                | ✅ OK            | Configurado con jsdom, coverage 80% threshold                                                     |
| Estructura src/       | ✅ OK            | components, hooks, providers, services, types, utils, errors                                      |
| Tests                 | ⚠️ Parcial       | 10 test files, pero falta coverage de componentes UI (RTL)                                        |
| docs/rfcs/            | ⚠️ Parcial       | Existe `docs/RFC/` (mayúsculas), falta `_template.md`                                             |
| docs/knowledge-base/  | ❌ Falta         | No existe                                                                                         |
| .windsurf/            | ❌ Falta         | No existe — sin workflows ni config MCP                                                           |
| Archivos sueltos raíz | ⚠️ Limpiar       | `E-commerce Platform-config.json`, `dev-setup.md`, `DEV_WORKFLOW.md`, `open-api.json` redundantes |
| prepublishOnly        | ⚠️ Inconsistente | Usa `npm run build` en vez de `yarn build`                                                        |

---

## Plan de Implementación

### Phase 1: Foundation (Crítico)

#### 1.1 Crear `.windsurf/` con config MCP

- Crear `.windsurf/workflows/` para slash commands
- Workflows mínimos: `sl-design-feature.md`, `sl-pre-pr.md`, `sl-add-test.md`

#### 1.2 Normalizar `docs/rfcs/`

- Renombrar `docs/RFC/` → `docs/rfcs/` (kebab-case estándar Skylabs)
- Crear `docs/rfcs/_template.md` con template RFC estándar

#### 1.3 Crear `docs/knowledge-base/`

- Crear directorio con `README.md` inicial
- Mover documentación funcional relevante aquí

### Phase 2: Code Quality

#### 2.1 ESLint — Endurecer reglas

- Cambiar `@typescript-eslint/no-explicit-any` de `off` a `warn`
- Esto no rompe build, pero comienza a señalar deuda técnica

#### 2.2 Corregir `prepublishOnly`

- Cambiar `npm run build` → `yarn build` (consistencia con coding-style)

#### 2.3 Limpiar archivos raíz

- Mover `DEV_WORKFLOW.md` → `docs/knowledge-base/dev-workflow.md`
- Mover `dev-setup.md` → `docs/knowledge-base/dev-setup.md`
- Mover `E-commerce Platform-config.json` → `docs/knowledge-base/` o eliminar si es temporal
- Mover `open-api.json` → `docs/knowledge-base/` o eliminar si no se usa activamente
- Mover `MAGIC_LINK_USAGE.md` → `docs/magic-link-usage.md`

#### 2.4 Husky pre-commit — Agregar type-check

- Actualizar `.husky/pre-commit` para correr `yarn type-check` además de lint-staged
- Alinea con regla: "Pre-commit hook (Husky): typecheck + lint automático"

### Phase 3: Testing

#### 3.1 Estructura de tests

- Los tests están en `src/test/` — es aceptable para librería
- Agregar `.gitkeep` o nota indicando convención

#### 3.2 Component tests con RTL (pendiente futuro)

- Priorizar tests RTL para componentes UI: `LoginForm`, `MagicLinkForm`, `Protected`, `FeatureFlag`
- Ya tienen `@testing-library/react` instalado, solo faltan los tests

### Phase 4: Workflows (.windsurf/)

#### 4.1 Crear slash commands como wrappers MCP

- `/sl-design-feature` → Wrapper a `mcp4_get_workflow('sl-design-feature')`
- `/sl-pre-pr` → Wrapper a `mcp4_get_workflow('sl-pre-pr')`
- `/sl-add-test` → Wrapper a `mcp4_get_workflow('sl-add-test')`
- `/sl-ci` → Ejecutar `yarn ci` localmente

### Phase 5: Documentation

#### 5.1 Actualizar README con badges y contributing

- Asegurar que README refleja estructura estandarizada
- Apuntar a `docs/contributing.md` existente

---

## Items NO Aplicables (Proyecto Librería)

Los siguientes items de la regla `project-standardization` NO aplican a este proyecto:

| Item                                                   | Razón                            |
| ------------------------------------------------------ | -------------------------------- |
| Backend structure (domain/infrastructure/api/usecases) | No es backend                    |
| Frontend structure (pages/components)                  | Es librería, no app              |
| E2E tests (Playwright)                                 | No hay UI deployada              |
| Bruno smoke tests                                      | No hay endpoints HTTP propios    |
| Docker / Deploy infra                                  | Solo npm publish                 |
| Monorepo workspaces                                    | Single package                   |
| DDD / Clean Architecture                               | No aplica a librería React       |
| react-proto-kit usage                                  | Esta librería ES una lib similar |

---

## Checklist de Validación

### ✅ Estructura

- [ ] `.windsurf/workflows/` creado
- [ ] `docs/rfcs/` normalizado (kebab-case) con `_template.md`
- [ ] `docs/knowledge-base/` creado
- [ ] Archivos raíz limpiados/movidos

### ✅ Calidad de Código

- [ ] ESLint `no-explicit-any` → `warn`
- [ ] `prepublishOnly` usa `yarn build`
- [ ] Husky pre-commit incluye type-check

### ✅ Testing

- [ ] Vitest configurado ✅ (ya cumple)
- [ ] Tests unitarios existentes ✅ (10 archivos)
- [ ] Coverage thresholds configurados ✅ (80%)

### ✅ MCP Integration

- [ ] Slash commands creados en `.windsurf/workflows/`
- [ ] `sl-design-feature` disponible
- [ ] `sl-pre-pr` disponible

### ✅ Feature Design Process

- [ ] `docs/rfcs/_template.md` creado
- [ ] `docs/knowledge-base/` creado
- [ ] Workflow `/sl-design-feature` disponible

---

## Orden de Ejecución

1. **Crear `.windsurf/workflows/`** con slash commands
2. **Normalizar `docs/rfcs/`** y crear template
3. **Crear `docs/knowledge-base/`**
4. **Limpiar archivos raíz** (mover a docs/)
5. **Endurecer ESLint** (`no-explicit-any: warn`)
6. **Fix `prepublishOnly`** → `yarn build`
7. **Actualizar Husky pre-commit** (+ type-check)
8. **Validar** con `yarn ci`
