import { expect } from '@playwright/test';
import sites from '../data/sites.json';
import { test, expectNoClientErrors } from '../src/fixtures/test-fixtures';
import { GenericPage } from '../src/pages/GenericPage';
import { runAxe } from '../src/utils/axe';

// Iterate through each site URL defined in data/sites.json
for (const url of sites.urls) {
  test.describe(`Accessibility: ${url}`, () => {
    test(`meets WCAG 2 A/AA (Lighthouse-like)`, async ({ page, consoleErrors, pageErrors, requestFailures }, testInfo) => {
      const generic = new GenericPage(page);
      await generic.goto(url);

      await test.step('check a11y (axe)', async () => {
        // Run axe against the current page, attaching raw violations to the report
        const violations = await runAxe(page, testInfo /* uses defaults */);

        // New teams may want to start by observing counts and reduce over time.
        // Use env/config to relax or tighten thresholds as you mature.
        expect.soft(violations, JSON.stringify(violations, null, 2)).toHaveLength(0);
      });

      // Sanity check: ensure no client-side errors slipped through
      await expectNoClientErrors(page, { consoleErrors, pageErrors, requestFailures });
    });
  });
}
