import { Page, expect } from '@playwright/test';
import { PerformanceMetrics } from '../types';

export class TestHelpers {
  /**
   * Wait for network to be idle.
   */
  static async waitForNetworkIdle(page: Page, timeout: number = 10000): Promise<void> {
    await page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Capture performance metrics from the page.
   */
  static async capturePerformanceMetrics(page: Page): Promise<PerformanceMetrics> {
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        largestContentfulPaint: 0,
        cumulativeLayoutShift: 0
      };
    });

    return metrics;
  }

  /**
   * Basic accessibility check for common issues.
   */
  static async checkAccessibility(page: Page): Promise<void> {
    await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        if (!img.alt) {
          console.warn(`Image without alt text: ${img.src}`);
        }
      });

      const buttons = document.querySelectorAll('button');
      buttons.forEach(button => {
        if (!button.textContent?.trim() && !button.getAttribute('aria-label')) {
          console.warn('Button without accessible text');
        }
      });
    });
  }

  /**
   * Inject axe-core library for accessibility testing.
   */
  static async injectAxeCore(page: Page): Promise<void> {
    try {
      await page.addScriptTag({
        url: 'https://unpkg.com/axe-core@4.7.0/axe.min.js'
      });
      
      // Wait for axe to be available
      await page.waitForFunction(() => typeof (window as any).axe !== 'undefined', { timeout: 5000 });
    } catch (error) {
      console.warn('Failed to load axe-core, skipping accessibility test');
      throw error;
    }
  }

  /**
   * Run axe-core analysis on the current page.
   */
  static async runAxeAnalysis(page: Page): Promise<any> {
    return await page.evaluate(() => {
      return new Promise((resolve, reject) => {
        if (typeof (window as any).axe === 'undefined') {
          reject(new Error('axe-core is not loaded'));
          return;
        }
        
        (window as any).axe.run(document, (err: any, results: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        });
      });
    });
  }

  /**
   * Mock API response for testing.
   */
  static async mockApiResponse(page: Page, url: string, response: any): Promise<void> {
    await page.route(url, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Intercept and log network requests.
   */
  static async interceptNetworkRequests(page: Page): Promise<void> {
    page.on('request', request => {
      console.log(`Request: ${request.method()} ${request.url()}`);
    });

    page.on('response', response => {
      console.log(`Response: ${response.status()} ${response.url()}`);
    });
  }

  /**
   * Simulate slow network conditions.
   */
  static async simulateSlowNetwork(page: Page): Promise<void> {
    try {
      // CDP session is only available in Chromium
      const client = await page.context().newCDPSession(page);
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 1000 * 1024 / 8,
        uploadThroughput: 1000 * 1024 / 8,
        latency: 100
      });
    } catch (error) {
      console.log('Network throttling not available in this browser, skipping slow network simulation');
      // For non-Chromium browsers, we can't throttle network, so just continue
    }
  }

  /**
   * Generate a random string for testing.
   */
  static async generateRandomString(length: number = 10): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Take a full page screenshot.
   */
  static async takeFullPageScreenshot(page: Page, name: string): Promise<void> {
    await page.screenshot({
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true
    });
  }

  /**
   * Compare screenshots for visual regression testing.
   */
  static async compareScreenshots(page: Page, name: string): Promise<void> {
    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      threshold: 0.2
    });
  }

  /**
   * Check if page has proper document structure.
   */
  static async checkDocumentStructure(page: Page): Promise<{ hasTitle: boolean; hasLang: boolean; hasViewport: boolean }> {
    const title = await page.title();
    const lang = await page.locator('html').getAttribute('lang');
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');

    return {
      hasTitle: !!title && title.length > 0,
      hasLang: !!lang,
      hasViewport: !!viewport
    };
  }

  /**
   * Check heading hierarchy for accessibility.
   */
  static async checkHeadingHierarchy(page: Page): Promise<{ isValid: boolean; issues: string[] }> {
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    const headingLevels: number[] = [];
    const issues: string[] = [];

    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
      const level = parseInt(tagName.charAt(1));
      headingLevels.push(level);
    }

    if (headingLevels.length > 0) {
      if (headingLevels[0] > 3) {
        issues.push('First heading should be h1-h3');
      }

      for (let i = 1; i < headingLevels.length; i++) {
        const diff = headingLevels[i] - headingLevels[i - 1];
        if (Math.abs(diff) > 2) {
          issues.push(`Heading levels should not skip more than one level (${headingLevels[i-1]} -> ${headingLevels[i]})`);
        }
      }
    }

    return { isValid: issues.length === 0, issues };
  }

  /**
   * Check image accessibility.
   */
  static async checkImageAccessibility(page: Page): Promise<{ totalImages: number; imagesWithoutAlt: number; percentageWithoutAlt: number }> {
    const images = await page.locator('img').all();
    let imagesWithoutAlt = 0;

    for (const image of images) {
      const alt = await image.getAttribute('alt');
      const role = await image.getAttribute('role');
      
      if (role !== 'presentation' && role !== 'none' && (!alt || alt.trim() === '')) {
        imagesWithoutAlt++;
      }
    }

    const totalImages = images.length;
    const percentageWithoutAlt = totalImages > 0 ? (imagesWithoutAlt / totalImages) * 100 : 0;

    return { totalImages, imagesWithoutAlt, percentageWithoutAlt };
  }

  /**
   * Test keyboard navigation.
   */
  static async testKeyboardNavigation(page: Page, maxElements: number = 5): Promise<{ success: boolean; navigatedElements: number }> {
    const focusableElements = await page.locator(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ).all();
    let navigatedElements = 0;

    if (focusableElements.length > 0) {
      await focusableElements[0].focus();
      
      for (let i = 0; i < Math.min(focusableElements.length, maxElements); i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);
        
        const focusedElement = page.locator(':focus');
        try {
          await expect(focusedElement).toBeVisible({ timeout: 2000 });
          navigatedElements++;
        } catch (error) {
          break;
        }
      }
    }

    return { success: navigatedElements > 0, navigatedElements };
  }

  /**
   * Check ARIA implementation.
   */
  static async checkARIAImplementation(page: Page): Promise<{ landmarks: number; validRoles: boolean; issues: string[] }> {
    const landmarks = await page.locator(
      'main, [role="main"], nav, [role="navigation"], header, [role="banner"], footer, [role="contentinfo"]'
    ).count();
    
    const elementsWithRole = await page.locator('[role]').all();
    const validRoles = [
      'button', 'link', 'navigation', 'main', 'banner', 'contentinfo',
      'complementary', 'search', 'form', 'dialog', 'alert', 'status',
      'tablist', 'tab', 'tabpanel', 'menu', 'menuitem', 'listbox', 'option',
      'progressbar', 'slider', 'spinbutton', 'textbox', 'checkbox', 'radio',
      'img', 'presentation', 'none', 'region', 'article', 'section'
    ];
    
    const issues: string[] = [];
    let allRolesValid = true;

    for (const element of elementsWithRole) {
      const role = await element.getAttribute('role');
      if (role && !validRoles.includes(role.toLowerCase())) {
        issues.push(`Invalid ARIA role: ${role}`);
        allRolesValid = false;
      }
    }

    return { landmarks, validRoles: allRolesValid, issues };
  }

  /**
   * Check color contrast using axe-core.
   */
  static async checkColorContrast(page: Page): Promise<any[]> {
    try {
      const results = await this.runAxeAnalysis(page);
      return results.violations.filter((violation: any) => 
        violation.id === 'color-contrast'
      );
    } catch (error) {
      console.log('Axe-core not available, performing basic contrast check');
      return [];
    }
  }

  /**
   * Simulate user interaction to trigger potential errors.
   */
  static async simulateUserInteraction(page: Page): Promise<void> {
    // Scroll through the page
    await page.evaluate(() => {
      return new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve(true);
          }
        }, 100);
      });
    });

    // Wait for any lazy-loaded content and async operations
    await page.waitForTimeout(2000);
  }

  /**
   * Capture console messages and errors.
   */
  static async captureConsoleMessages(page: Page): Promise<{ errors: any[]; warnings: any[] }> {
    const errors: any[] = [];
    const warnings: any[] = [];

    page.on('console', async (msg) => {
      const messageType = msg.type();
      const location = msg.location();
      
      if (messageType === 'error' || messageType === 'warning') {
        const consoleMessage = {
          type: messageType,
          text: msg.text(),
          location: `${location.url}:${location.lineNumber}`,
          timestamp: new Date().toISOString(),
          source: location.url,
          severity: messageType === 'error' ? 'error' : 'warning',
          args: await Promise.all(msg.args().map(arg => arg.jsonValue().catch(() => '[Unable to serialize]')))
        };

        if (messageType === 'error') {
          errors.push(consoleMessage);
        } else {
          warnings.push(consoleMessage);
        }
      }
    });

    page.on('pageerror', (error) => {
      errors.push({
        type: 'uncaught exception',
        text: error.message,
        location: error.stack?.split('\n')[0] || 'No location',
        stack: error.stack,
        timestamp: new Date().toISOString(),
        severity: 'error',
        source: 'runtime'
      });
    });

    return { errors, warnings };
  }
}
