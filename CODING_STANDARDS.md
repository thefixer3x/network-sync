# Coding Standards

This document outlines the coding standards for the network-sync project.

## Tools

- **ESLint**: Linting and code quality
- **Prettier**: Code formatting
- **TypeScript**: Type safety
- **Jest**: Testing framework

## Running Quality Checks

```bash
# Format code
npm run format

# Check formatting
npm run format:check

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type check
npm run type-check

# Run all checks (format, lint, type-check, tests)
npm run validate
```

## Code Style

### Formatting (Prettier)

- **Semicolons**: Required
- **Quotes**: Single quotes for strings
- **Indentation**: 2 spaces (no tabs)
- **Line Length**: 100 characters max
- **Trailing Commas**: ES5 compatible
- **Arrow Functions**: Parentheses always required

### Linting (ESLint)

#### Key Rules

1. **No unused variables** - Variables starting with `_` are allowed
2. **Prefer const** - Use `const` over `let` when possible
3. **No var** - Always use `const` or `let`
4. **Equality**: Always use `===` instead of `==`
5. **Curly braces**: Required for all control statements
6. **Console**: Only `console.warn` and `console.error` allowed
7. **Promises**: Must be properly awaited or handled

#### TypeScript-Specific

1. **Explicit any**: Warned but not forbidden (use sparingly)
2. **Floating promises**: Must await or handle async operations
3. **Nullish coalescing**: Prefer `??` over `||` for null checks
4. **Optional chaining**: Use `?.` for optional property access
5. **Type imports**: Use `import type` for type-only imports

## File Organization

### Imports

Organize imports in this order:

1. Built-in Node modules
2. External dependencies
3. Internal modules
4. Parent directory imports
5. Sibling imports
6. Index imports

Example:

```typescript
import { readFile } from 'node:fs/promises';

import axios from 'axios';
import OpenAI from 'openai';

import { Logger } from '@/utils/Logger';

import type { AgentConfig } from '../types';

import { helper } from './helper';
```

### File Structure

```typescript
// 1. Type imports
import type { SomeType } from './types';

// 2. Regular imports
import { dependency } from 'package';

// 3. Type definitions
interface MyInterface {
  // ...
}

// 4. Constants
const CONSTANT_VALUE = 'value';

// 5. Class or function definitions
export class MyClass {
  // ...
}

// 6. Exports
export { something };
```

## Naming Conventions

- **Classes**: PascalCase (`UserService`, `AgentOrchestrator`)
- **Functions/Methods**: camelCase (`getUserData`, `processRequest`)
- **Constants**: UPPER_SNAKE_CASE (`API_KEY`, `MAX_RETRIES`)
- **Interfaces/Types**: PascalCase (`UserData`, `ApiResponse`)
- **Files**: kebab-case (`user-service.ts`, `agent-orchestrator.ts`)
- **Test Files**: `*.test.ts` or `*.spec.ts`

## Best Practices

### Error Handling

```typescript
// ✅ Good: Specific error handling
try {
  await riskyOperation();
} catch (error) {
  if (error instanceof ApiError) {
    logger.error('API failed:', error.message);
  }
  throw error;
}

// ❌ Bad: Silent failures
try {
  await riskyOperation();
} catch {
  // Swallowing errors
}
```

### Async/Await

```typescript
// ✅ Good: Properly awaited
const result = await fetchData();

// ✅ Good: Explicit promise handling
fetchData().catch((err) => logger.error(err));

// ❌ Bad: Floating promise
fetchData(); // ESLint error
```

### Type Safety

```typescript
// ✅ Good: Specific types
interface User {
  id: string;
  name: string;
}

function getUser(id: string): Promise<User> {
  // ...
}

// ⚠️ Acceptable with justification
function legacyFunction(data: any) {
  // TODO: Add proper types
}

// ❌ Bad: Unnecessary any
function processData(input: any): any {
  return input;
}
```

### Testing

```typescript
// ✅ Good: Descriptive test names
describe('UserService', () => {
  describe('getUser', () => {
    it('should return user when ID exists', async () => {
      // Test implementation
    });

    it('should throw error when ID does not exist', async () => {
      // Test implementation
    });
  });
});
```

## Pre-commit Checklist

Before committing code:

1. ✅ Run `npm run format` to format code
2. ✅ Run `npm run lint:fix` to auto-fix linting issues
3. ✅ Run `npm test` to ensure tests pass
4. ✅ Add tests for new functionality
5. ✅ Update documentation if needed

## CI/CD

The following checks run on every pull request:

- ESLint (must pass with 0 warnings)
- Prettier (must be formatted)
- TypeScript compilation (must pass)
- Tests (must pass with >70% coverage)

Use `npm run validate` to run all checks locally before pushing.

## Exceptions

If you need to disable a rule:

```typescript
// Disable for one line
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = legacyFunction();

// Disable for a block
/* eslint-disable @typescript-eslint/no-explicit-any */
function legacyCode() {
  // Legacy code here
}
/* eslint-enable @typescript-eslint/no-explicit-any */
```

**Note**: Disabled rules should include a comment explaining why.

## Questions?

For questions about coding standards, please refer to:

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [ESLint Rules](https://eslint.org/docs/latest/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)
