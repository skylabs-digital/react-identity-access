# 27 — Publicacion de Paquetes npm

Guia para publicar paquetes npm con versionado automatico en Skylabs. Cubre el pipeline completo: conventional commits, semantic-release, GitHub Actions, dual publish (npmjs.org + GitHub Packages), y consumo desde proyectos internos.

> **Diferencia con guias 16-17:** Las guias de CI/CD cubren apps deployadas con Docker a DigitalOcean. Esta guia cubre **librerias** publicadas como paquetes npm que otros proyectos consumen via `yarn add`.

---

## 1. Estrategia de Registries: Dual Publish

Skylabs usa dos registries de npm:

| Registry | Paquetes | Consumidores |
|----------|----------|-------------|
| **npmjs.org** | Solo publicos | Cualquiera (open source) |
| **GitHub Packages** | Publicos + privados | Proyectos internos Skylabs |

```
@skylabs-digital/react-identity-access  → npmjs.org + GitHub Packages (publico)
@skylabs-digital/react-proto-kit        → npmjs.org + GitHub Packages (publico)
@skylabs-digital/internal-utils         → solo GitHub Packages (privado)
```

### Por que dual publish

npm no soporta "buscar en privado, fallback a publico" para el mismo scope. Un `.npmrc` apunta `@skylabs-digital` a UN solo registry. Si apunta a GitHub Packages para resolver paquetes privados, los publicos tambien deben estar ahi.

### Configuracion en proyectos consumidores internos

Cada proyecto Skylabs que consume paquetes `@skylabs-digital/*` debe tener:

```ini
# .npmrc (en la raiz del proyecto)
@skylabs-digital:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Esto resuelve TODO el scope `@skylabs-digital/` desde GitHub Packages — tanto publicos como privados — con un solo token.

**En CI (GitHub Actions):** El `GITHUB_TOKEN` automatico del workflow tiene acceso de lectura a packages de la org. No se necesita configuracion extra.

**En desarrollo local:** Usar un Personal Access Token (classic) con scope `read:packages`:

```bash
# Configurar token local (una sola vez)
npm config set //npm.pkg.github.com/:_authToken ghp_TU_TOKEN_AQUI
```

O crear un `.npmrc` local (no commitear):

```ini
# .npmrc (gitignored)
@skylabs-digital:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=ghp_TU_TOKEN_AQUI
```

---

## 2. Modelo de Publicacion

```
push to main → test job (typecheck + lint + test + build)
                         ↓ (solo si pasa)
               release job → semantic-release → npm publish (npmjs.org) + GitHub Release
                         ↓ (solo si hubo nuevo release)
               publish-gpr job → npm publish (GitHub Packages)
                                                     ↓
                              chore(release): X.Y.Z [skip ci]  ← commit automatico
```

- **Un solo branch (`main`)** — todo commit con prefijo semantico dispara un release
- **Versionado automatico** — semantic-release analiza commits y decide MAJOR/MINOR/PATCH
- **Dual publish** — automatico a npmjs.org y GitHub Packages
- **CHANGELOG auto-generado** — cada release documenta los cambios

---

## 3. Estructura de un Paquete Skylabs

### package.json — campos obligatorios

```json
{
  "name": "@skylabs-digital/<nombre-paquete>",
  "version": "0.0.0",
  "type": "module",
  "publishConfig": {
    "access": "public"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/skylabs-digital/<nombre-repo>.git"
  },
  "main": "dist/index.js",
  "module": "dist/index.es.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.es.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsc && vite build",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "format:check": "prettier --check \"src/**/*.{ts,tsx}\"",
    "ci": "yarn type-check && yarn test && yarn build",
    "prepublishOnly": "yarn build",
    "prepare": "husky install",
    "release": "semantic-release"
  }
}
```

| Campo | Proposito |
|-------|-----------|
| `name` | Scope `@skylabs-digital/`, nombre kebab-case |
| `version` | Iniciar en `0.0.0` — semantic-release la maneja |
| `publishConfig.access` | `"public"` para publicos. Omitir para privados (default: restricted) |
| `repository` | **Obligatorio** para GitHub Packages — asocia el paquete al repo |
| `files` | Solo `dist/` y `README.md` — nunca publicar `src/`, tests, configs |
| `main` / `module` / `types` | Triple entry point: CJS, ESM, y TypeScript declarations |

---

## 4. Semantic Release

### Configuracion (.releaserc.json)

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/npm",
    "@semantic-release/github",
    [
      "@semantic-release/git",
      {
        "assets": ["CHANGELOG.md", "package.json"],
        "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      }
    ]
  ]
}
```

### Versionado segun commits

| Commit | Version Bump | Ejemplo |
|--------|--------------|---------|
| `fix: corregir bug` | PATCH | 2.28.0 → 2.28.1 |
| `feat: nueva funcionalidad` | MINOR | 2.28.0 → 2.29.0 |
| `feat!: breaking change` | MAJOR | 2.28.0 → 3.0.0 |
| `BREAKING CHANGE:` en body | MAJOR | 2.28.0 → 3.0.0 |
| `chore:`, `docs:`, `style:` | Sin release | No se publica |

---

## 5. GitHub Actions Workflow

### release.yml completo (con dual publish)

```yaml
name: Release and Publish

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'yarn'
      - run: yarn install --frozen-lockfile
      - run: yarn type-check
      - run: yarn format:check
      - run: yarn test:coverage
      - run: yarn build

  release:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    permissions:
      contents: write
      issues: write
      pull-requests: write
      id-token: write
    outputs:
      new-release: ${{ steps.release.outputs.new-release-published }}
      version: ${{ steps.release.outputs.new-release-version }}
    steps:
      - name: Generate GitHub App Token
        id: app-token
        uses: actions/create-github-app-token@v1
        with:
          app-id: ${{ secrets.SEMANTIC_RELEASE_APP_ID }}
          private-key: ${{ secrets.SEMANTIC_RELEASE_PRIVATE_KEY }}

      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ steps.app-token.outputs.token }}

      - uses: actions/setup-node@v4
        with:
          node-version: '22.14.0'
          cache: 'yarn'
          registry-url: 'https://registry.npmjs.org'

      - run: npm install -g npm@latest
      - run: yarn install --frozen-lockfile
      - run: yarn build

      - name: Remove local semantic-release packages
        run: |
          rm -rf node_modules/semantic-release
          rm -rf node_modules/@semantic-release

      - name: Release to npmjs.org
        id: release
        env:
          GITHUB_TOKEN: ${{ steps.app-token.outputs.token }}
          NPM_CONFIG_PROVENANCE: 'true'
        run: |
          npx --yes \
            -p semantic-release@25.0.2 \
            -p @semantic-release/changelog@6.0.3 \
            -p @semantic-release/commit-analyzer@13.0.1 \
            -p @semantic-release/git@10.0.1 \
            -p @semantic-release/github@12.0.0 \
            -p @semantic-release/npm@13.1.3 \
            -p @semantic-release/release-notes-generator@14.1.0 \
            semantic-release

          LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "none")
          if [ "$LATEST_TAG" != "none" ]; then
            echo "new-release-published=true" >> "$GITHUB_OUTPUT"
            echo "new-release-version=${LATEST_TAG#v}" >> "$GITHUB_OUTPUT"
          fi

  # Dual publish: GitHub Packages for internal consumption
  publish-gpr:
    needs: release
    if: needs.release.outputs.new-release == 'true'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
        with:
          ref: main

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://npm.pkg.github.com'

      - run: yarn install --frozen-lockfile
      - run: yarn build

      - name: Publish to GitHub Packages
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Diferencias clave entre los jobs

| Aspecto | release (npmjs.org) | publish-gpr (GitHub Packages) |
|---------|-------------------|-------------------------------|
| **Trigger** | Push a main | Solo si release creo nueva version |
| **Auth** | GitHub App Token + npm OIDC | `GITHUB_TOKEN` automatico |
| **Registry** | `registry.npmjs.org` | `npm.pkg.github.com` |
| **Permisos** | `contents: write`, `id-token: write` | `packages: write` |
| **Version** | semantic-release la determina | Usa la version ya bumpeada en package.json |

---

## 6. Para Paquetes Privados

Los paquetes privados son mas simples — no publican a npmjs.org, solo a GitHub Packages.

### package.json (privado)

```json
{
  "name": "@skylabs-digital/mi-paquete-privado",
  "private": false,
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

> **Sin `"access": "public"`** — GitHub Packages usa la visibilidad del repo. Repo privado = paquete privado.

### Workflow simplificado (solo GitHub Packages)

El workflow es igual al de arriba pero sin el step de `publish-gpr` separado. En vez, semantic-release publica directo a GitHub Packages configurando `NPM_CONFIG_REGISTRY`:

```yaml
- name: Release
  env:
    GITHUB_TOKEN: ${{ steps.app-token.outputs.token }}
    NPM_CONFIG_REGISTRY: 'https://npm.pkg.github.com'
  run: npx semantic-release
```

---

## 7. Commit Conventions

### Commitlint (.commitlintrc.json)

```json
{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "type-enum": [2, "always", [
      "feat", "fix", "docs", "style", "refactor",
      "perf", "test", "chore", "ci", "build", "revert"
    ]],
    "subject-case": [2, "never", ["sentence-case", "start-case", "pascal-case", "upper-case"]],
    "subject-empty": [2, "never"],
    "subject-full-stop": [2, "never", "."]
  }
}
```

### Husky Hooks

```bash
# .husky/pre-commit
yarn type-check
npx lint-staged

# .husky/commit-msg
npx --no -- commitlint --edit ${1}
```

---

## 8. Flujo Completo: De Commit a npm + GitHub Packages

```
1. Developer: git commit -m "feat: nueva funcionalidad"
   ↓ Husky: type-check + lint-staged + commitlint
2. git push origin main
   ↓ GitHub Actions: test job
   ↓  → type-check → format:check → test:coverage → build
3. release job (si test pasa)
   ↓  → semantic-release → npm publish @skylabs-digital/paquete@2.29.0
   ↓  → GitHub Release v2.29.0
   ↓  → Commit: "chore(release): 2.29.0 [skip ci]"
4. publish-gpr job (si hubo release)
   ↓  → npm publish a GitHub Packages
5. Proyectos internos: yarn upgrade @skylabs-digital/paquete
   (resuelve desde GitHub Packages via .npmrc)
```

---

## 9. Troubleshooting

| Problema | Causa | Solucion |
|----------|-------|----------|
| "No new release published" | Commit sin `feat:` o `fix:` | Solo esos prefijos disparan release |
| publish-gpr no corre | release no emitio output | Verificar que `id: release` y los `echo >> GITHUB_OUTPUT` esten presentes |
| 403 en GitHub Packages | Falta `packages: write` | Agregar permiso al job |
| "Package not found" en proyecto interno | `.npmrc` no configurado | Agregar `@skylabs-digital:registry=https://npm.pkg.github.com` |
| Token local expirado | PAT classic expirado | Regenerar en GitHub Settings → Developer Settings |
| Version mismatch entre registries | publish-gpr corrio antes del commit de version | El job usa `ref: main` que ya tiene el commit de version |

---

## 10. Paquetes Skylabs Publicados

| Paquete | Tipo | npmjs.org | GitHub Packages |
|---------|------|-----------|-----------------|
| `@skylabs-digital/react-identity-access` | Publico | Si | Si |
| `@skylabs-digital/react-proto-kit` | Publico | Si | Si |

---

## 11. Checklist

### Setup para paquete publico (dual publish)
- [ ] `publishConfig.access: "public"` en package.json
- [ ] `repository.url` apuntando al repo de GitHub
- [ ] `.releaserc.json` con plugins de npm + github + changelog + git
- [ ] `release.yml` con jobs: test → release → publish-gpr
- [ ] Verificar org secrets: `SEMANTIC_RELEASE_APP_ID`, `SEMANTIC_RELEASE_PRIVATE_KEY`
- [ ] Repo settings → Actions → "Read and write permissions"

### Setup para paquete privado
- [ ] `publishConfig.registry: "https://npm.pkg.github.com"` en package.json
- [ ] NO incluir `publishConfig.access`
- [ ] Repo debe ser privado en GitHub
- [ ] Workflow usa `NPM_CONFIG_REGISTRY` para semantic-release

### Proyectos consumidores
- [ ] `.npmrc` con `@skylabs-digital:registry=https://npm.pkg.github.com`
- [ ] Token configurado (CI: automatico, local: PAT con `read:packages`)

| DO | DON'T |
|----|-------|
| Dejar que semantic-release maneje la version | Editar `version` en package.json manualmente |
| Usar `feat:` y `fix:` para commits que publican | Usar `feat:` para cambios triviales |
| Publicar publicos en ambos registries | Publicar privados en npmjs.org |
| Configurar `.npmrc` en cada proyecto consumidor | Asumir que npm resuelve magicamente entre registries |
| Usar PAT con scope minimo (`read:packages`) | Compartir tokens con write access |
