import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import sites from '../../data/sites.json';
import { GenericPage } from '../../src/pages/GenericPage';
import { TestHelpers } from '../../src/utils/test-helpers';

/**
 * Enhanced shape of a captured console/page error for reporting.
 */
type ConsoleMessage = {
  type: string;
  text: string;
  location: string;
  timestamp: string;
  stack?: string;
  args?: string[];
  source?: string;
  severity?: 'error' | 'warning' | 'info';
};

test.describe('Console Error Detection', () => {
  const messages: ConsoleMessage[] = [];
  const warnings: ConsoleMessage[] = [];
  const infoMessages: ConsoleMessage[] = [];

  test.beforeEach(() => {
    allure.epic('Console Error Testing');
    allure.severity('critical');
  });

  test.beforeEach(async ({ page }) => {
    // Reset messages for isolation between tests
    messages.length = 0;
    warnings.length = 0;
    infoMessages.length = 0;

    // Enhanced console message capture
    page.on('console', async (msg) => {
      const messageType = msg.type();
      const location = msg.location();
      
      // Capture errors, warnings, and info messages
      if (messageType === 'error' || messageType === 'warning' || messageType === 'info') {
        const consoleMessage: ConsoleMessage = {
          type: messageType,
          text: msg.text(),
          location: `${location.url}:${location.lineNumber}`,
          timestamp: new Date().toISOString(),
          source: location.url,
          severity: messageType as 'error' | 'warning' | 'info',
          args: await Promise.all(msg.args().map(arg => arg.jsonValue().catch(() => '[Unable to serialize]')))
        };

        if (messageType === 'error') {
          messages.push(consoleMessage);
        } else if (messageType === 'warning') {
          warnings.push(consoleMessage);
        } else if (messageType === 'info') {
          infoMessages.push(consoleMessage);
        }
      }
    });

    // Enhanced error capture with detailed stack traces
    page.on('pageerror', (error) => {
      messages.push({
        type: 'uncaught exception',
        text: error.message,
        location: error.stack?.split('\n')[0] || 'No location',
        stack: error.stack,
        timestamp: new Date().toISOString(),
        severity: 'error',
        source: 'runtime'
      });
    });

    // Capture request failures
    page.on('requestfailed', (request) => {
      const failure = request.failure();
      if (failure) {
        messages.push({
          type: 'request failed',
          text: `${request.method()} ${request.url()} - ${failure.errorText}`,
          location: request.url(),
          timestamp: new Date().toISOString(),
          severity: 'error',
          source: 'network'
        });
      }
    });

    // Capture response errors (4xx, 5xx status codes)
    page.on('response', (response) => {
      const status = response.status();
      if (status >= 400) {
        warnings.push({
          type: 'http error',
          text: `${response.request().method()} ${response.url()} - ${status} ${response.statusText()}`,
          location: response.url(),
          timestamp: new Date().toISOString(),
          severity: 'warning',
          source: 'network'
        });
      }
    });
  });

  for (const url of sites.urls) {
    test(`🚨 comprehensive error detection : ${url}`, async ({ page }, testInfo) => {
      await test.step('navigate and interact with page', async () => {
        // Navigate with extended timeout and wait states
        await page.goto(url, { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });

        // Interact with page to trigger potential errors
        await test.step('simulate user interaction', async () => {
          // Use TestHelpers for user interaction simulation
          await TestHelpers.simulateUserInteraction(page);
        });

        // Additional interaction patterns
        await test.step('additional interaction patterns', async () => {
          // Try to click on common interactive elements
          const clickableElements = await page.locator('button, a, [role="button"], input[type="submit"]').all();
          
          for (let i = 0; i < Math.min(clickableElements.length, 3); i++) {
            try {
              await clickableElements[i].click({ timeout: 2000 });
              await page.waitForTimeout(500);
            } catch (error) {
              // Ignore click errors, they might be expected
            }
          }

          // Try to fill forms if they exist
          const inputs = await page.locator('input[type="text"], input[type="email"], textarea').all();
          for (let i = 0; i < Math.min(inputs.length, 2); i++) {
            try {
              await inputs[i].fill('test input');
              await page.waitForTimeout(200);
            } catch (error) {
              // Ignore fill errors
            }
          }
        });
      });

      await test.step('analyze console messages', async () => {
        // Prepare detailed report
        const report = {
          url,
          timestamp: new Date().toISOString(),
          errors: messages,
          warnings: warnings,
          infoMessages: infoMessages,
          summary: {
            totalErrors: messages.length,
            totalWarnings: warnings.length,
            totalInfo: infoMessages.length,
            errorTypes: messages.reduce((acc, msg) => {
              acc[msg.type] = (acc[msg.type] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
            warningTypes: warnings.reduce((acc, msg) => {
              acc[msg.type] = (acc[msg.type] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          }
        };

        // Attach report to test results
        await testInfo.attach('console-report.json', {
          body: JSON.stringify(report, null, 2),
          contentType: 'application/json'
        });

        // Log findings for immediate visibility
        if (messages.length > 0 || warnings.length > 0 || infoMessages.length > 0) {
          console.log(`\nFindings for ${url}:`);
          
          if (messages.length > 0) {
            console.log('\n🚨 Errors:');
            messages.forEach(msg => {
              console.log(`[${msg.type}] ${msg.text}`);
              console.log(`  at: ${msg.location}`);
              if (msg.stack) console.log(`  stack: ${msg.stack}`);
              console.log(`  time: ${msg.timestamp}\n`);
            });
          }

          if (warnings.length > 0) {
            console.log('\n⚠️ Warnings:');
            warnings.forEach(msg => {
              console.log(`[${msg.type}] ${msg.text}`);
              console.log(`  at: ${msg.location}\n`);
            });
          }

          if (infoMessages.length > 0) {
            console.log('\nℹ️ Info Messages:');
            infoMessages.forEach(msg => {
              console.log(`[${msg.type}] ${msg.text}`);
              console.log(`  at: ${msg.location}\n`);
            });
          }
        } else {
          console.log(`\n✅ No console messages found for ${url}`);
        }

        // Fail test on errors, but allow warnings and info messages
        expect(messages, 'No console errors should be present').toHaveLength(0);
      });
    });

    test(`🔍 performance and accessibility errors : ${url}`, async ({ page }, testInfo) => {
      await test.step('navigate and capture performance metrics', async () => {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        
        // Capture performance metrics
        try {
          const metrics = await TestHelpers.capturePerformanceMetrics(page);
          await testInfo.attach('performance-metrics.json', {
            body: JSON.stringify(metrics, null, 2),
            contentType: 'application/json'
          });
          
          console.log(`Performance metrics for ${url}:`, metrics);
        } catch (error) {
          console.log('Performance metrics capture failed');
        }
      });

      await test.step('check for accessibility-related errors', async () => {
        // Look for common accessibility-related console errors
        const a11yErrors = messages.filter(msg => 
          msg.text.toLowerCase().includes('aria') ||
          msg.text.toLowerCase().includes('accessibility') ||
          msg.text.toLowerCase().includes('focus') ||
          msg.text.toLowerCase().includes('keyboard') ||
          msg.text.toLowerCase().includes('screen reader')
        );

        if (a11yErrors.length > 0) {
          console.log('\n🔍 Accessibility-related errors found:');
          a11yErrors.forEach(error => {
            console.log(`[${error.type}] ${error.text}`);
          });
        }

        // Check for JavaScript framework errors
        const frameworkErrors = messages.filter(msg => 
          msg.text.toLowerCase().includes('react') ||
          msg.text.toLowerCase().includes('vue') ||
          msg.text.toLowerCase().includes('angular') ||
          msg.text.toLowerCase().includes('jquery') ||
          msg.text.toLowerCase().includes('bootstrap')
        );

        if (frameworkErrors.length > 0) {
          console.log('\n🔧 Framework-related errors found:');
          frameworkErrors.forEach(error => {
            console.log(`[${error.type}] ${error.text}`);
          });
        }

        // Attach accessibility error report
        await testInfo.attach('accessibility-errors.json', {
          body: JSON.stringify({ a11yErrors, frameworkErrors }, null, 2),
          contentType: 'application/json'
        });
      });
    });
  }

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      // Take full page screenshot with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await TestHelpers.takeFullPageScreenshot(page, `console-errors-${timestamp}`);

      // Capture DOM snapshot for debugging
      await testInfo.attach('dom-snapshot.html', {
        body: await page.content(),
        contentType: 'text/html'
      });

      // Capture network activity
      const networkRequests = await page.evaluate(() => {
        return performance.getEntriesByType('resource').map(entry => ({
          name: entry.name,
          duration: entry.duration,
          transferSize: (entry as any).transferSize,
          initiatorType: (entry as any).initiatorType
        }));
      });

      await testInfo.attach('network-activity.json', {
        body: JSON.stringify(networkRequests, null, 2),
        contentType: 'application/json'
      });
    }
  });
});
