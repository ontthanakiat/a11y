import { test as base, expect, Page } from '@playwright/test';

/**
 * Buckets used to collect different kinds of client-side errors/events
 * while a test runs. This helps assert that a page is not throwing errors
 * even if the UI appears functional.
 */
type ErrorBuckets = {
  consoleErrors: string[];
  pageErrors: string[];
  requestFailures: string[];
};

/**
 * Extend Playwright's `test` with fixtures that capture runtime issues:
 * - consoleErrors: messages from `console.error`
 * - pageErrors: uncaught exceptions surfaced as `pageerror`
 * - requestFailures: failed network requests
 *
 * Each fixture provides a shared array for a single test run
 * and ensures the listeners are torn down after use.
 */
export const test = base.extend<ErrorBuckets>({
  consoleErrors: async ({ page }, use) => {
    const bucket: string[] = [];
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error') bucket.push(`[console.${type}] ${msg.text()}`);
    });
    await use(bucket);
  },

  pageErrors: async ({ page }, use) => {
    const bucket: string[] = [];
    page.on('pageerror', err => bucket.push(`[pageerror] ${err.message}`));
    await use(bucket);
  },

  requestFailures: async ({ page }, use) => {
    const bucket: string[] = [];
    page.on('requestfailed', req => {
      // ignore 3rd‑party beacons/noise if desired
      bucket.push(`[requestfailed ${req.failure()?.errorText}] ${req.url()}`);
    });
    await use(bucket);
  }
});

/**
 * Convenience assertion that no client-side errors were captured.
 * Uses soft assertions so multiple categories are reported together.
 */
export const expectNoClientErrors = async (page: Page, buckets: ErrorBuckets) => {
  // Optional wait to let errors flush after navigation
  await page.waitForLoadState('networkidle');
  expect.soft(buckets.consoleErrors, `Console errors: \n${buckets.consoleErrors.join('\n')}`).toEqual([]);
  expect.soft(buckets.pageErrors, `Page errors: \n${buckets.pageErrors.join('\n')}`).toEqual([]);
  expect.soft(buckets.requestFailures, `Request failures: \n${buckets.requestFailures.join('\n')}`).toEqual([]);
};
