import { test, expect } from '@playwright/test';
import sites from '../data/sites.json';

/**
 * Minimal shape of a captured console/page error for reporting.
 */
type ConsoleMessage = {
  type: string;
  text: string;
  location: string;
  timestamp: string;
};

test.describe('Console Message Tracking', () => {
  const messages: ConsoleMessage[] = [];

  test.beforeEach(async ({ page }) => {
    // Reset messages for isolation between tests
    messages.length = 0;

    // Capture console errors only (avoid noise from logs/warns)
    page.on('console', async (msg) => {
      if (msg.type() === 'error') {
        const location = msg.location();
        messages.push({
          type: msg.type(),
          text: msg.text(),
          location: `${location.url}:${location.lineNumber}`,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Capture uncaught exceptions from the page context
    page.on('pageerror', (error) => {
      messages.push({
        type: 'uncaught exception',
        text: error.message,
        location: error.stack || 'No stack trace',
        timestamp: new Date().toISOString()
      });
    });
  });

  for (const url of sites.urls) {
    test(`checking console errors for ${url}`, async ({ page }) => {
      await test.step('navigate to page', async () => {
        await page.goto(url, { waitUntil: 'networkidle' });
      });

      await test.step('interact with page', async () => {
        // Scroll to trigger potential lazy-loaded content and related errors
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(2000); // Allow async operations to settle
      });

      await test.step('verify no errors', async () => {
        if (messages.length > 0) {
          // Attach captured errors to the test report for triage
          const report = {
            url,
            timestamp: new Date().toISOString(),
            errors: messages
          };

          await test.info().attach('console-errors.json', {
            body: JSON.stringify(report, null, 2),
            contentType: 'application/json'
          });

          // Echo to stdout for quick local visibility
          console.log('\\nConsole Errors found:');
          messages.forEach(msg => {
            console.log(`[${msg.type}] ${msg.text}\\n  at ${msg.location}\\n  time: ${msg.timestamp}\\n`);
          });
        }

        // Fail test if there are any errors
        expect(messages, 'No console errors should be present').toHaveLength(0);
      });
    });
  }

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      // Take a screenshot if the test failed
      await page.screenshot({
        path: `./test-results/console-errors-${Date.now()}.png`,
        fullPage: true
      });
    }
  });
});
