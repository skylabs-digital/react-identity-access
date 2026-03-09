---
description: Review code changes for quality, architecture compliance, and best practices
---

# Code Review

Review code changes against library conventions and best practices.

## Steps

// turbo
1. **Identify changed files**:
```bash
git diff --name-only main...HEAD
```

// turbo
2. **Read the changed files** to understand context.

3. **Verify library conventions**:
   - [ ] TypeScript strict — no `any` without justification
   - [ ] Props typed with interfaces, destructured
   - [ ] Hooks follow React conventions (`use` prefix)
   - [ ] Providers follow context pattern correctly
   - [ ] Services are properly typed and testable
   - [ ] Exports are correct in `src/index.ts`

4. **Verify code quality**:
   - [ ] No `console.log` or `debugger` in library code
   - [ ] No hardcoded values (URLs, IDs)
   - [ ] No TODO without issue tracking
   - [ ] Imports at top of file, ordered (external → internal → relative → types)
   - [ ] Naming: files kebab-case, classes PascalCase, variables camelCase
   - [ ] Components: PascalCase filename and export

5. **Verify tests**:
   - [ ] Changes have corresponding tests
   - [ ] Tests follow AAA pattern
   - [ ] Tests are independent
   - [ ] Cleanup in `afterEach` where needed

// turbo
6. **Run verification**:
```bash
yarn ci
```

7. **Generate summary**:
   - ✅ What's correct
   - ⚠️ Improvement suggestions
   - ❌ Issues to resolve before merge
