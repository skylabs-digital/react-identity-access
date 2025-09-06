# Contributing Guide

Thank you for your interest in contributing to React Identity Access! This guide will help you get started with contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to support@skylabs.com.

### Our Standards

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 16+ (recommended: use nvm)
- pnpm (recommended package manager)
- Git
- TypeScript knowledge
- React experience

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/react-identity-access.git
cd react-identity-access
```

3. Add the upstream remote:

```bash
git remote add upstream https://github.com/skylabs/react-identity-access.git
```

## Development Setup

### Install Dependencies

```bash
# Install root dependencies
pnpm install

# Install template dependencies
cd template
pnpm install
cd ..
```

### Build the Library

```bash
# Build the library
pnpm build

# Build in watch mode for development
pnpm dev
```

### Run the Demo

```bash
cd template
pnpm start
```

## Project Structure

```
react-identity-access/
├── src/                    # Library source code
│   ├── components/         # React components
│   │   ├── FeatureFlag.tsx
│   │   ├── LoginForm.tsx
│   │   ├── PasswordRecoveryForm.tsx
│   │   └── Protected.tsx
│   ├── providers/          # Context providers
│   │   ├── AppProvider.tsx
│   │   ├── AuthProvider.tsx
│   │   ├── FeatureFlagProvider.tsx
│   │   └── SubscriptionProvider.tsx
│   ├── services/           # API and utility services
│   │   ├── AppApiService.ts
│   │   ├── AuthApiService.ts
│   │   ├── HttpService.ts
│   │   └── SessionManager.ts
│   ├── types/              # TypeScript definitions
│   │   └── api.ts
│   └── index.ts           # Main export file
├── template/               # Demo application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.tsx
│   └── package.json
├── docs/                   # Documentation
├── dist/                   # Built library (generated)
├── tests/                  # Test files
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Development Workflow

### Branch Naming

Use descriptive branch names:

```
feature/add-oauth-support
fix/token-refresh-bug
docs/update-api-reference
refactor/simplify-auth-flow
```

### Commit Messages

Follow conventional commits format:

```
type(scope): description

feat(auth): add OAuth 2.0 support
fix(session): resolve token refresh race condition
docs(readme): update installation instructions
refactor(providers): simplify provider hierarchy
test(auth): add unit tests for login flow
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Development Process

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the code style guidelines

3. **Write tests** for new functionality

4. **Update documentation** if needed

5. **Test your changes**:
   ```bash
   pnpm test
   pnpm build
   cd template && pnpm start
   ```

6. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat(auth): add new authentication method"
   ```

7. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

8. **Create a Pull Request** on GitHub

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test AuthProvider.test.tsx
```

### Writing Tests

#### Unit Tests

```tsx
// src/services/__tests__/SessionManager.test.ts
import { SessionManager } from '../SessionManager';

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager();
  });

  it('should store and retrieve user data', () => {
    const user = { id: '1', email: 'test@example.com', name: 'Test User' };
    sessionManager.setUser(user);
    
    expect(sessionManager.getUser()).toEqual(user);
  });

  it('should clear session data', () => {
    sessionManager.setUser({ id: '1', email: 'test@example.com' });
    sessionManager.clearSession();
    
    expect(sessionManager.getUser()).toBeNull();
  });
});
```

#### Component Tests

```tsx
// src/components/__tests__/Protected.test.tsx
import { render, screen } from '@testing-library/react';
import { Protected } from '../Protected';
import { AuthProvider } from '../../providers/AuthProvider';

const TestWrapper = ({ children, permissions = [] }) => (
  <AuthProvider>
    {children}
  </AuthProvider>
);

describe('Protected Component', () => {
  it('renders children when user has required permissions', () => {
    render(
      <TestWrapper permissions={['users:read']}>
        <Protected requiredPermissions={['users:read']}>
          <div>Protected Content</div>
        </Protected>
      </TestWrapper>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders fallback when user lacks permissions', () => {
    render(
      <TestWrapper permissions={[]}>
        <Protected 
          requiredPermissions={['admin:write']}
          fallback={<div>Access Denied</div>}
        >
          <div>Protected Content</div>
        </Protected>
      </TestWrapper>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
```

### Test Coverage

Maintain high test coverage:
- Aim for >90% code coverage
- Test all public APIs
- Include edge cases and error scenarios
- Test component rendering and user interactions

## Code Style

### TypeScript Guidelines

- Use strict TypeScript configuration
- Define interfaces for all data structures
- Use generic types where appropriate
- Avoid `any` type - use `unknown` if needed

```tsx
// Good
interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
}

// Bad
const user: any = getUserData();
```

### React Guidelines

- Use functional components with hooks
- Implement proper error boundaries
- Use React.memo for performance optimization when needed
- Follow hooks rules (don't call in loops, conditions, etc.)

```tsx
// Good
const UserProfile: React.FC<UserProfileProps> = React.memo(({ userId }) => {
  const { sessionManager } = useAuth();
  const user = sessionManager.getUser();

  if (!user) {
    return <div>Please log in</div>;
  }

  return <div>Welcome, {user.name}</div>;
});
```

### Formatting

We use Prettier for code formatting:

```bash
# Format code
pnpm format

# Check formatting
pnpm format:check
```

### Linting

We use ESLint for code linting:

```bash
# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix
```

## Submitting Changes

### Pull Request Process

1. **Update documentation** for any new features
2. **Add tests** for new functionality
3. **Ensure all tests pass**
4. **Update CHANGELOG.md** if applicable
5. **Create detailed PR description**

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
```

### Review Process

1. **Automated checks** must pass (tests, linting, build)
2. **Code review** by maintainers
3. **Manual testing** if needed
4. **Approval** from at least one maintainer
5. **Merge** to main branch

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Steps

1. **Update version** in package.json
2. **Update CHANGELOG.md**
3. **Create release tag**
4. **Publish to npm**
5. **Create GitHub release**

## Getting Help

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and general discussion
- **Discord**: Real-time chat with the community
- **Email**: support@skylabs.com for sensitive issues

### Documentation

- [Implementation Guide](./implementation.md)
- [API Reference](./api-reference.md)
- [Advanced Usage](./advanced-usage.md)
- [Examples](./examples.md)

### Issue Templates

When creating issues, use the appropriate template:

- **Bug Report**: For reporting bugs
- **Feature Request**: For suggesting new features
- **Documentation**: For documentation improvements
- **Question**: For asking questions

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- GitHub contributors section
- Release notes for significant contributions
- Annual contributor highlights

Thank you for contributing to React Identity Access! 🎉
