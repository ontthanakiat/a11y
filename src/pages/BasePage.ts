import { Page, test } from '@playwright/test';

/**
 * Base page object encapsulating shared navigation helpers.
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
    await test.step(`navigate: ${url}`, async () => {
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    });
  }
}
