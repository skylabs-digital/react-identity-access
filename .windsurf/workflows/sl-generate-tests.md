---
description: Generate unit and component tests for recent changes using Vitest + RTL
---

# Generate Tests

Workflow to generate tests for recent changes in this **library project**.

## Steps

// turbo
1. **Identify what changed**:
```bash
git diff --name-only HEAD~1
```
   Classify changes:
   - **Hooks/Providers** → Unit tests (mock context, test state)
   - **Components** → Component tests (RTL: render, interaction, states)
   - **Services/Utils** → Unit tests (pure function tests)
   - **Types** → No tests needed (compile-time only)

// turbo
2. **Read the changed code** to understand logic to test.

3. **Generate Unit Tests** (hooks, services, utils):
   - Location: `src/test/<name>.test.ts`
   - Pattern AAA: Arrange → Act → Assert
   - Test:
     - Happy path with valid data
     - Edge cases (empty, null, boundary values)
     - Error cases (invalid input, thrown errors)
   - Example:
     ```typescript
     describe('tenantDetection', () => {
       it('should detect tenant from subdomain', () => {
         // Arrange
         const hostname = 'tenant1.myapp.com';
         // Act
         const result = detectTenantSlug(hostname, 'myapp.com');
         // Assert
         expect(result).toBe('tenant1');
       });
     });
     ```

4. **Generate Component Tests** (React components with RTL):
   - Location: `src/test/<ComponentName>.test.tsx`
   - Use `@testing-library/react` + `@testing-library/user-event`
   - Test:
     - Renders correctly with required props
     - Form validation and submission
     - Loading, error, and success states
     - User interactions (click, type, submit)
   - Example:
     ```typescript
     describe('LoginForm', () => {
       it('should render email and password fields', () => {
         render(<LoginForm />);
         expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
         expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
       });
     });
     ```

// turbo
5. **Run tests**:
```bash
yarn test
```

// turbo
6. **Verify everything still passes**:
```bash
yarn ci
```
