# Agent Tests

This directory contains unit tests for all AI agents in the system.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI
npm run test:ci
```

## Test Coverage

Current test coverage:

- PerplexityAgent: 8 tests
- ClaudeAgent: 12 tests

Target coverage: **70%+** for all files

## Writing New Tests

When adding new agent functionality:

1. Create test file in `__tests__/` directory
2. Name it `{agent-name}.test.ts`
3. Mock external API calls using `jest.fn()`
4. Test both success and error scenarios
5. Ensure coverage meets threshold

## Test Structure

```typescript
import { describe, expect, it, jest, beforeEach } from '@jest/globals';

describe('AgentName', () => {
  beforeEach(() => {
    // Setup mock
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Test implementation
    });

    it('should handle error case', async () => {
      // Error testing
    });
  });
});
```

## Mock API Responses

All tests mock `global.fetch` to avoid real API calls. Example:

```typescript
mockFetch.mockResolvedValueOnce({
  ok: true,
  json: async () => ({
    /* mock response */
  }),
} as Response);
```
