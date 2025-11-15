import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Testing Configuration
 *
 * For this backend/API-focused application, E2E tests focus on:
 * - API endpoint testing
 * - Workflow automation scenarios
 * - Integration with external services (mocked)
 *
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Maximum time one test can run
  timeout: 30 * 1000,

  // Test execution settings
  fullyParallel: false, // Run tests sequentially for API tests
  forbidOnly: !!process.env['CI'], // Fail if test.only in CI
  retries: process.env['CI'] ? 2 : 0, // Retry failed tests in CI
  workers: process.env['CI'] ? 1 : undefined, // Single worker in CI

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list'], // Console output
  ],

  // Global test settings
  use: {
    // Base URL for API tests
    baseURL: process.env['E2E_BASE_URL'] || 'http://localhost:3000',

    // Collect trace for failed tests
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Extra HTTP headers
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },
  },

  // Projects for different test scenarios
  projects: [
    {
      name: 'API Tests',
      testMatch: /.*\.api\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'Workflow Tests',
      testMatch: /.*\.workflow\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  // Local development server (if needed)
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env['CI'],
  //   timeout: 120 * 1000,
  // },
});
