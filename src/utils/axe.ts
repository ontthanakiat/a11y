import { AxeBuilder } from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';

// Load defaults once (keeps tests DRY and centralized)
import sites from '../../data/sites.json';
import axeRules from '../../data/axe.lighthouse.rules.json';

/**
 * Optional configuration to fine-tune an axe-core scan.
 * - tags: axe rule tags to include (e.g., WCAG levels)
 * - includeRules: explicit rule IDs to enable
 * - excludeRules: rule IDs to disable (takes precedence over includeRules)
 */
type AxeScanOptions = {
  tags?: string[];
  includeRules?: string[];
  excludeRules?: string[];
};

/**
 * Run an accessibility scan on the current page using axe-core.
 *
 * The function applies sensible defaults based on `data/sites.json` and
 * `data/axe.lighthouse.rules.json`, but allows callers to override via `options`.
 * Raw violations are attached to the test report for debugging.
 *
 * @param page - Playwright page under test
 * @param testInfo - Playwright test metadata (used to attach artifacts)
 * @param options - Optional overrides for tags / rules
 * @returns List of axe violations found on the page
 */
export async function runAxe(page: Page, testInfo: TestInfo, options?: AxeScanOptions) {
  const tags = options?.tags ?? sites.wcagTags;
  const includeRules = options?.includeRules ?? axeRules;
  const excludeRules = new Set(options?.excludeRules ?? sites.excludeRules);

  // Configure the axe builder with tags and the filtered set of rules
  const builder = new AxeBuilder({ page })
    .withTags(tags)
    .withRules(includeRules.filter((r: string) => !excludeRules.has(r)));

  // Execute axe analysis against the current DOM
  const results = await builder.analyze();

  // Make raw JSON handy in the HTML report
  await testInfo.attach('axe-violations.json', {
    body: JSON.stringify(results.violations, null, 2),
    contentType: 'application/json'
  });

  return results.violations;
}
