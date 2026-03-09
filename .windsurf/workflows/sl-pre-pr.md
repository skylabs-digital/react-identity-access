---
description: Pre-PR checks, iterative fixes, and PR analysis for library project
---

# Pre-PR

Comprehensive pre-PR workflow adapted for this **library project** (npm package).

## Steps

// turbo
1. **Identify what changed**:
```bash
git diff --name-only HEAD~1
```

// turbo
2. **Run full check suite**:
```bash
yarn ci
```

3. **Iterative fix loop** — while there are errors:
   a. **ESLint fixes**:
   ```bash
   yarn lint:fix
   ```
   b. **TypeScript fixes**: resolve type errors, eliminate unjustified `any`
   c. **Test fixes**: fix broken tests, add missing tests for new code

// turbo
4. **Verify after each iteration**:
```bash
yarn ci
```

5. **Deep analysis**:
   - **Types**: No unjustified `any` — use `unknown` if truly unknown
   - **Exports**: All public API properly exported from `src/index.ts`
   - **Breaking changes**: Check if public API signatures changed
   - **Bundle size**: Run `yarn build` and check dist/ output
   - **Peer deps**: Verify peerDependencies are correct

6. **Generate PR analysis**:
```markdown
## 📊 Change Analysis

### 🎯 Objective
[Description]

### 📁 Modified Files
- Source: X files
- Tests: Y files
- Docs: Z files

### ✅ Checks
- [ ] ESLint: 0 errors, 0 warnings
- [ ] TypeScript: 0 errors
- [ ] Tests: All passing
- [ ] Build: Successful (ESM + CJS)

### 🔍 Quality Analysis
- **Typing**: ✅ Strict, no unjustified `any`
- **Testing**: ✅ Adequate coverage
- **Exports**: ✅ Public API intact
- **Bundle**: ✅ Size within bounds

### 💡 Improvement Suggestions
[Based on analysis]

### ⚠️ Considerations
[Breaking changes, migration notes]
```

// turbo
7. **Final verification**:
```bash
yarn ci
```
