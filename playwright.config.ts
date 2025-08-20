import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Use a simple list reporter locally and an HTML report artifact
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    // Collect a trace when a test is retried to aid debugging
    trace: 'on-first-retry',
    actionTimeout: 0,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  fullyParallel: true,
  retries: 1,
  projects: [
    { name: 'Chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'WebKit',   use: { ...devices['Desktop Safari'] } }
  ]
});
