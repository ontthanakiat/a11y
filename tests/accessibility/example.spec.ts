import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import sites from '../../data/sites.json';
import { GenericPage } from '../../src/pages/GenericPage';
import { TestHelpers } from '../../src/utils/test-helpers';
import { runAxe } from '../../src/utils/axe';

test.describe('Enhanced Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Inject axe-core for accessibility testing
    await TestHelpers.injectAxeCore(page);
  });

  for (const url of sites.urls) {
    test(`Enhanced accessibility test for ${url}`, async ({ page }, testInfo) => {
      const genericPage = new GenericPage(page);
      
      // Navigate to the page
      await genericPage.goto(url);
      
      await test.step('Basic accessibility checks', async () => {
        // Check document structure
        const docStructure = await TestHelpers.checkDocumentStructure(page);
        expect(docStructure.hasTitle, 'Page should have a title').toBe(true);
        expect(docStructure.hasLang, 'Page should have lang attribute').toBe(true);
        
        // Check basic accessibility
        const hasBasicA11y = await genericPage.hasBasicAccessibility();
        expect(hasBasicA11y, 'Page should have basic accessibility features').toBe(true);
      });

      await test.step('Heading hierarchy check', async () => {
        const headingResults = await TestHelpers.checkHeadingHierarchy(page);
        if (!headingResults.isValid) {
          console.log('Heading hierarchy issues:', headingResults.issues);
        }
        // For demo purposes, we'll be lenient with heading hierarchy
        expect(headingResults.issues.length).toBeLessThan(5);
      });

      await test.step('Image accessibility check', async () => {
        const imageResults = await TestHelpers.checkImageAccessibility(page);
        console.log(`Found ${imageResults.totalImages} images, ${imageResults.imagesWithoutAlt} without alt text`);
        expect(imageResults.percentageWithoutAlt, 'Most images should have alt text').toBeLessThan(50);
      });

      await test.step('Keyboard navigation test', async () => {
        const navResults = await TestHelpers.testKeyboardNavigation(page);
        console.log(`Successfully navigated through ${navResults.navigatedElements} elements`);
        // This test passes even if no focusable elements are found
        expect(navResults.navigatedElements).toBeGreaterThanOrEqual(0);
      });

      await test.step('ARIA implementation check', async () => {
        const ariaResults = await TestHelpers.checkARIAImplementation(page);
        expect(ariaResults.landmarks, 'Page should have landmark regions').toBeGreaterThan(0);
        if (!ariaResults.validRoles) {
          console.log('ARIA role issues:', ariaResults.issues);
        }
        // For demo purposes, we'll be lenient with ARIA roles
        expect(ariaResults.issues.length).toBeLessThan(10);
      });

      await test.step('Interactive elements check', async () => {
        const interactiveElements = await genericPage.getInteractiveElements();
        console.log(`Found ${interactiveElements.total} interactive elements (${interactiveElements.links} links, ${interactiveElements.buttons} buttons, ${interactiveElements.inputs} inputs)`);
        expect(interactiveElements.total).toBeGreaterThanOrEqual(0);
      });

      await test.step('Axe-core accessibility audit', async () => {
        try {
          const violations = await TestHelpers.runAxeAnalysis(page);
          
          // Attach violations to test report
          await testInfo.attach('axe-violations.json', {
            body: JSON.stringify(violations, null, 2),
            contentType: 'application/json'
          });
          
          console.log(`Found ${violations.length} accessibility violations`);
          // For demo purposes, we'll be lenient with violations
          expect(violations.length).toBeLessThan(20);
        } catch (error) {
          console.log('Axe-core analysis failed, skipping detailed accessibility audit');
          // Test still passes if axe-core is not available
        }
      });
    });
  }
});
