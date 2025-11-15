# End-to-End Testing with Playwright

This directory contains E2E (End-to-End) tests for the Social Media Orchestrator application using [Playwright](https://playwright.dev/).

## Overview

E2E tests verify complete workflows and integrations across the application. Since this is primarily a backend/API-focused application, our E2E tests focus on:

- **API endpoint testing**: Verifying REST API functionality
- **Workflow automation**: Testing multi-step orchestration flows
- **Integration testing**: Verifying interactions between components and external services

## Test Structure

```
e2e/
├── README.md                          # This file
├── health-check.api.spec.ts           # Basic API health check tests
└── orchestrator.workflow.spec.ts      # Workflow orchestration tests
```

## Running Tests

### Prerequisites

1. **Install Playwright browsers** (one-time setup):
   ```bash
   npx playwright install
   ```

2. **Set up environment variables**:
   - Copy `.env.example` to `.env.test`
   - Configure test API keys and endpoints
   - Or use mock/test credentials

3. **Start the application server** (if testing against local server):
   ```bash
   npm run dev
   ```

### Test Commands

```bash
# Run all E2E tests
npm run e2e

# Run tests with browser UI visible
npm run e2e:headed

# Run tests in interactive UI mode
npm run e2e:ui

# Run tests in debug mode
npm run e2e:debug

# View test report
npm run e2e:report

# Generate test code (record actions)
npm run e2e:codegen
```

### Test Filtering

```bash
# Run only API tests
npm run e2e -- --grep "API"

# Run only workflow tests
npm run e2e -- --grep "Workflow"

# Run specific test file
npm run e2e -- health-check.api.spec.ts

# Run tests matching a pattern
npm run e2e -- --grep "should.*post"
```

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ request }) => {
    const response = await request.get('/api/endpoint');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('key');
  });
});
```

### API Testing Example

```typescript
test('should create and retrieve resource', async ({ request }) => {
  // Create resource
  const createResponse = await request.post('/api/resources', {
    data: {
      name: 'Test Resource',
      type: 'test',
    },
  });

  expect(createResponse.ok()).toBeTruthy();
  const created = await createResponse.json();
  const resourceId = created.id;

  // Retrieve resource
  const getResponse = await request.get(`/api/resources/${resourceId}`);
  expect(getResponse.ok()).toBeTruthy();

  const retrieved = await getResponse.json();
  expect(retrieved.name).toBe('Test Resource');
  expect(retrieved.type).toBe('test');
});
```

### Workflow Testing Example

```typescript
test('should complete multi-step workflow', async ({ request }) => {
  // Step 1: Research
  const research = await request.post('/api/research/query', {
    data: { query: 'AI trends' },
  });
  const researchData = await research.json();

  // Step 2: Generate content using research
  const content = await request.post('/api/content/generate', {
    data: {
      prompt: 'Write about AI trends',
      contextId: researchData.vectorId,
    },
  });

  // Step 3: Post to platforms
  const post = await request.post('/api/platforms/post', {
    data: {
      content: (await content.json()).content,
      platforms: ['twitter', 'linkedin'],
    },
  });

  expect(post.ok()).toBeTruthy();
});
```

## Test Configuration

Configuration is managed in `playwright.config.ts` in the project root.

### Key Configuration Options

- **Base URL**: `E2E_BASE_URL` environment variable (default: `http://localhost:3000`)
- **Timeout**: 30 seconds per test
- **Retries**: 2 retries in CI, 0 locally
- **Parallel**: Disabled for API tests (sequential execution)
- **Reporters**: HTML, JSON, and console

### Environment Variables

```bash
# Base URL for API tests
E2E_BASE_URL=http://localhost:3000

# Test API keys (use test/mock keys, never production!)
TEST_API_KEY=test-key-here
TEST_AUTH_TOKEN=test-token-here
```

## Current Test Status

### Implemented Tests (Skipped - Waiting for API Implementation)

All tests are currently marked as `.skip()` because they require:
1. API server implementation
2. API endpoint definitions
3. Mock external services (Twitter, LinkedIn, etc.)

### Test Categories

- ✅ **Test Framework**: Configured and ready
- ⏭️  **Health Checks**: Tests defined, waiting for API
- ⏭️  **Workflow Tests**: Tests defined, waiting for API
- ⏭️  **Platform Integration**: Tests defined, waiting for implementation

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Clean Up**: Remove test data after test completion
3. **Meaningful Names**: Use descriptive test names (should...when...then)
4. **DRY**: Extract common test utilities to helper functions
5. **Assertions**: Use specific assertions over generic ones
6. **Error Handling**: Test both success and failure scenarios
7. **Timeouts**: Set appropriate timeouts for async operations
8. **Mocking**: Mock external services to avoid dependencies

## Debugging Tests

### Visual Debugging

```bash
# Run with browser visible
npm run e2e:headed

# Run in UI mode (best for debugging)
npm run e2e:ui

# Run in debug mode (step through)
npm run e2e:debug
```

### Trace Viewer

Traces are automatically captured on first retry. View them with:

```bash
npx playwright show-trace test-results/path-to-trace.zip
```

### Screenshots and Videos

- Screenshots: Captured on failure
- Videos: Can be enabled in config
- Location: `test-results/` directory

## CI/CD Integration

Tests are configured for CI/CD with:
- Automatic retries (2x)
- Single worker (sequential execution)
- Coverage reports
- Fail on `.only()` tests

Example GitHub Actions workflow:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run e2e
  env:
    CI: true
    E2E_BASE_URL: ${{ secrets.E2E_BASE_URL }}

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Next Steps

1. **Implement API Endpoints**: Create REST API for the orchestrator
2. **Un-skip Tests**: Remove `.skip()` from tests as APIs become available
3. **Add Test Data**: Create test fixtures and seed data
4. **Mock External Services**: Set up mocks for Twitter, LinkedIn, etc.
5. **Add More Tests**: Expand test coverage for edge cases
6. **Performance Tests**: Add load/performance testing with Playwright

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright API Testing](https://playwright.dev/docs/api-testing)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [CI/CD Integration](https://playwright.dev/docs/ci)

## Support

For questions or issues with E2E tests:
1. Check the [Playwright documentation](https://playwright.dev/)
2. Review test examples in this directory
3. Open an issue in the project repository
