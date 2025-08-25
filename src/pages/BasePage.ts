import { Page, Locator, expect } from '@playwright/test';

/**
 * Base page object encapsulating shared navigation helpers and accessibility utilities.
 * Extend this for concrete pages to keep tests readable and consistent.
 */
export abstract class BasePage {
  protected readonly page: Page;

  /**
   * Wire the Playwright page into the page object.
   */
  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a URL with a named step for richer reporting.
   * Uses 'domcontentloaded' for speed while ensuring basic DOM is ready.
   */
  async goto(url: string) {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  /**
   * Wait for page to fully load including network idle state.
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get the page title.
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Get the current URL.
   */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Take a screenshot of the current page.
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}.png`,
      fullPage: true 
    });
  }

  /**
   * Wait for an element to be present and visible.
   */
  async waitForElement(locator: Locator, timeout: number = 5000): Promise<void> {
    await locator.waitFor({ timeout });
  }

  /**
   * Click an element with proper waiting.
   */
  async clickElement(locator: Locator): Promise<void> {
    await this.waitForElement(locator);
    await locator.click();
  }

  /**
   * Fill an input field with text.
   */
  async fillInput(locator: Locator, text: string): Promise<void> {
    await this.waitForElement(locator);
    await locator.fill(text);
  }

  /**
   * Get text content from an element.
   */
  async getText(locator: Locator): Promise<string> {
    await this.waitForElement(locator);
    return await locator.textContent() || '';
  }

  /**
   * Check if an element is visible.
   */
  async isVisible(locator: Locator): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Scroll to an element.
   */
  async scrollToElement(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
  }

  /**
   * Wait for URL to match a pattern.
   */
  async waitForUrl(urlPattern: string | RegExp, timeout: number = 10000): Promise<void> {
    await this.page.waitForURL(urlPattern, { timeout });
  }

  /**
   * Verify element text matches expected value.
   */
  async verifyElementText(locator: Locator, expectedText: string): Promise<void> {
    await expect(locator).toHaveText(expectedText);
  }

  /**
   * Verify element is visible.
   */
  async verifyElementVisible(locator: Locator): Promise<void> {
    await expect(locator).toBeVisible();
  }

  /**
   * Verify element is hidden.
   */
  async verifyElementHidden(locator: Locator): Promise<void> {
    await expect(locator).toBeHidden();
  }

  /**
   * Get all headings on the page.
   */
  async getHeadings(): Promise<Locator[]> {
    return await this.page.locator('h1, h2, h3, h4, h5, h6').all();
  }

  /**
   * Get all images on the page.
   */
  async getImages(): Promise<Locator[]> {
    return await this.page.locator('img').all();
  }

  /**
   * Get all focusable elements on the page.
   */
  async getFocusableElements(): Promise<Locator[]> {
    return await this.page.locator(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ).all();
  }

  /**
   * Get all landmark elements on the page.
   */
  async getLandmarks(): Promise<Locator[]> {
    return await this.page.locator(
      'main, [role="main"], nav, [role="navigation"], header, [role="banner"], footer, [role="contentinfo"]'
    ).all();
  }

  /**
   * Get all elements with ARIA roles.
   */
  async getElementsWithRole(): Promise<Locator[]> {
    return await this.page.locator('[role]').all();
  }

  /**
   * Check if page has proper document structure.
   */
  async hasProperDocumentStructure(): Promise<boolean> {
    const title = await this.getTitle();
    const lang = await this.page.locator('html').getAttribute('lang');
    const viewport = await this.page.locator('meta[name="viewport"]').getAttribute('content');
    
    return !!(title && lang && viewport);
  }

  /**
   * Check heading hierarchy for accessibility.
   */
  async checkHeadingHierarchy(): Promise<{ isValid: boolean; issues: string[] }> {
    const headings = await this.getHeadings();
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
  async checkImageAccessibility(): Promise<{ totalImages: number; imagesWithoutAlt: number; percentageWithoutAlt: number }> {
    const images = await this.getImages();
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
  async testKeyboardNavigation(maxElements: number = 5): Promise<{ success: boolean; navigatedElements: number }> {
    const focusableElements = await this.getFocusableElements();
    let navigatedElements = 0;

    if (focusableElements.length > 0) {
      await focusableElements[0].focus();
      
      for (let i = 0; i < Math.min(focusableElements.length, maxElements); i++) {
        await this.page.keyboard.press('Tab');
        await this.page.waitForTimeout(100);
        
        const focusedElement = this.page.locator(':focus');
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
}
