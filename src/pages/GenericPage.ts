import { BasePage } from './BasePage';

/**
 * A page object that inherits navigation and accessibility utilities from BasePage.
 * Provides reusable accessibility-centric helpers for testing.
 */
export class GenericPage extends BasePage {
  /**
   * Navigate to a URL and wait for page load.
   */
  async goto(url: string): Promise<void> {
    await super.goto(url);
    await this.waitForPageLoad();
  }

  /**
   * Check if the page has basic accessibility requirements.
   */
  async hasBasicAccessibility(): Promise<boolean> {
    const title = await this.getTitle();
    const lang = await this.page.locator('html').getAttribute('lang');
    const bodyText = await this.page.textContent('body');
    
    return !!(title && lang && bodyText);
  }

  /**
   * Get all interactive elements for accessibility testing.
   */
  async getInteractiveElements(): Promise<{ links: number; buttons: number; inputs: number; total: number }> {
    const links = await this.page.locator('a').count();
    const buttons = await this.page.locator('button').count();
    const inputs = await this.page.locator('input, select, textarea').count();
    
    return {
      links,
      buttons,
      inputs,
      total: links + buttons + inputs
    };
  }

  /**
   * Check for skip links (accessibility feature).
   */
  async hasSkipLinks(): Promise<boolean> {
    const skipLinks = await this.page.locator('a[href="#main"], a[href="#content"]').count();
    return skipLinks > 0;
  }

  /**
   * Check for ARIA live regions.
   */
  async hasLiveRegions(): Promise<boolean> {
    const liveRegions = await this.page.locator('[role="alert"], [aria-live="polite"], [aria-live="assertive"]').count();
    return liveRegions > 0;
  }

  /**
   * Check for proper form labels.
   */
  async hasProperFormLabels(): Promise<boolean> {
    const inputs = await this.page.locator('input[type="text"], input[type="email"], input[type="password"], textarea, select').all();
    
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      
      if (id) {
        const label = this.page.locator(`label[for="${id}"]`);
        const hasLabel = await label.count() > 0;
        
        if (!hasLabel && !ariaLabel && !ariaLabelledBy) {
          return false;
        }
      } else if (!ariaLabel && !ariaLabelledBy) {
        return false;
      }
    }
    
    return true;
  }
}
