---
description: Run the full CI pipeline locally (type-check + test + build)
---

# CI Pipeline

Run the complete CI pipeline locally before pushing.

## Steps

// turbo
1. **Run full CI**:
```bash
yarn ci
```

2. **If failures**, fix iteratively:
   - Type errors → fix types
   - Lint errors → `yarn lint:fix`
   - Test failures → fix tests
   - Build errors → fix source

// turbo
3. **Re-run after fixes**:
```bash
yarn ci
```

4. **Verify build output**:
```bash
ls -la dist/
```
   Expected: `index.js` (CJS), `index.es.js` (ESM), `index.d.ts` (types)
