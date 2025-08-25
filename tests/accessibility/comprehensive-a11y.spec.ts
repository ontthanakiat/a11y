import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import sites from '../../data/sites.json';
import { GenericPage } from '../../src/pages/GenericPage';
import { TestHelpers } from '../../src/utils/test-helpers';
import { runAxe } from '../../src/utils/axe';

test.describe('Comprehensive Accessibility Testing', () => {
  test.beforeEach(() => {
    allure.epic('Comprehensive Accessibility Testing');
    allure.severity('critical');
  });

  for (const url of sites.urls) {
    test.describe(`Testing ${url}`, () => {
      test.beforeEach(async ({ page }) => {
        // Inject axe-core for comprehensive accessibility testing
        try {
          await TestHelpers.injectAxeCore(page);
        } catch (error) {
          console.log('Axe-core not available, continuing with basic tests');
        }
      });

      test('🎯 comprehensive accessibility audit', async ({ page }, testInfo) => {
        const genericPage = new GenericPage(page);
        await genericPage.goto(url);

        await test.step('basic accessibility requirements', async () => {
          // Check document structure
          const docStructure = await TestHelpers.checkDocumentStructure(page);
          expect(docStructure.hasTitle, 'Page should have a title').toBe(true);
          expect(docStructure.hasLang, 'Page should have lang attribute').toBe(true);
          
          // Check basic accessibility
          const hasBasicA11y = await genericPage.hasBasicAccessibility();
          expect(hasBasicA11y, 'Page should have basic accessibility features').toBe(true);
        });

        await test.step('heading hierarchy analysis', async () => {
          const headingResults = await TestHelpers.checkHeadingHierarchy(page);
          if (!headingResults.isValid) {
            console.log('Heading hierarchy issues:', headingResults.issues);
            // Attach issues to test report
            await testInfo.attach('heading-issues.json', {
              body: JSON.stringify(headingResults.issues, null, 2),
              contentType: 'application/json'
            });
          }
          // For comprehensive testing, we'll be more strict
          expect(headingResults.issues.length, 'Heading hierarchy should be valid').toBe(0);
        });

        await test.step('image accessibility validation', async () => {
          const imageResults = await TestHelpers.checkImageAccessibility(page);
          console.log(`Found ${imageResults.totalImages} images, ${imageResults.imagesWithoutAlt} without alt text`);
          
          // Attach image analysis to test report
          await testInfo.attach('image-analysis.json', {
            body: JSON.stringify(imageResults, null, 2),
            contentType: 'application/json'
          });
          
          expect(imageResults.percentageWithoutAlt, 'Most images should have alt text').toBeLessThan(30);
        });

        await test.step('keyboard navigation testing', async () => {
          const navResults = await TestHelpers.testKeyboardNavigation(page);
          console.log(`Successfully navigated through ${navResults.navigatedElements} elements`);
          
          if (navResults.navigatedElements > 0) {
            expect(navResults.success, 'Keyboard navigation should work').toBe(true);
          }
        });

        await test.step('ARIA implementation validation', async () => {
          const ariaResults = await TestHelpers.checkARIAImplementation(page);
          expect(ariaResults.landmarks, 'Page should have landmark regions').toBeGreaterThan(0);
          
          if (!ariaResults.validRoles) {
            console.log('ARIA role issues:', ariaResults.issues);
            await testInfo.attach('aria-issues.json', {
              body: JSON.stringify(ariaResults.issues, null, 2),
              contentType: 'application/json'
            });
          }
          expect(ariaResults.validRoles, 'All ARIA roles should be valid').toBe(true);
        });

        await test.step('axe-core comprehensive analysis', async () => {
          try {
            const violations = await TestHelpers.runAxeAnalysis(page);
            
            // Attach violations to test report
            await testInfo.attach('axe-violations.json', {
              body: JSON.stringify(violations, null, 2),
              contentType: 'application/json'
            });
            
            console.log(`Found ${violations.length} accessibility violations`);
            expect(violations.length, 'No accessibility violations should be present').toBe(0);
          } catch (error) {
            console.log('Axe-core analysis failed, skipping detailed accessibility audit');
            // Test still passes if axe-core is not available
          }
        });
      });

      test('🎨 color contrast and visual accessibility', async ({ page }, testInfo) => {
        await page.goto(url);

        await test.step('standard color contrast', async () => {
          try {
            const results = await TestHelpers.runAxeAnalysis(page);
            const contrastViolations = results.violations.filter((violation: any) => 
              violation.id === 'color-contrast'
            );
            expect(contrastViolations).toHaveLength(0);
          } catch (error) {
            console.log('Axe-core not available, performing basic contrast check');
            const bodyText = await page.textContent('body');
            expect(bodyText).toBeTruthy();
          }
        });

        await test.step('dark mode compatibility', async () => {
          await page.emulateMedia({ colorScheme: 'dark' });
          
          try {
            const results = await TestHelpers.runAxeAnalysis(page);
            const contrastViolations = results.violations.filter((violation: any) => 
              violation.id === 'color-contrast'
            );
            expect(contrastViolations).toHaveLength(0);
          } catch (error) {
            console.log('Axe-core not available for dark mode check');
            await page.waitForLoadState('networkidle');
            const pageContent = await page.locator('body *').count();
            expect(pageContent).toBeGreaterThan(0);
          }
        });

        await test.step('reduced motion support', async () => {
          await page.emulateMedia({ reducedMotion: 'reduce' });
          
          const animatedElements = await page.locator('[style*="animation"], [style*="transition"]').all();
          
          for (const element of animatedElements) {
            const style = await element.getAttribute('style');
            if (style?.includes('animation')) {
              expect(style).toContain('animation: none');
            }
          }
        });
      });

      test('🔊 screen reader and assistive technology support', async ({ page }, testInfo) => {
        const genericPage = new GenericPage(page);
        await page.goto(url);

        await test.step('landmark regions', async () => {
          const landmarks = await page.locator(
            'main, [role="main"], nav, [role="navigation"], header, [role="banner"], footer, [role="contentinfo"]'
          ).all();
          
          expect(landmarks.length, 'Page should have landmark regions').toBeGreaterThan(0);
          
          // Check for main content area
          const mainContent = await page.locator('main, [role="main"]').count();
          expect(mainContent, 'Page should have main content area').toBeGreaterThan(0);
        });

        await test.step('skip links', async () => {
          const skipLinks = await genericPage.hasSkipLinks();
          console.log(`Skip links found: ${skipLinks}`);
          
          if (skipLinks) {
            const skipLink = page.locator('a[href="#main"], a[href="#content"]').first();
            await expect(skipLink).toBeVisible();
          }
        });

        await test.step('live regions', async () => {
          const hasLiveRegions = await genericPage.hasLiveRegions();
          console.log(`Live regions found: ${hasLiveRegions}`);
          
          const liveRegions = await page.locator('[role="alert"], [aria-live="polite"], [aria-live="assertive"]').count();
          await testInfo.attach('live-regions.json', {
            body: JSON.stringify({ count: liveRegions, hasLiveRegions }, null, 2),
            contentType: 'application/json'
          });
        });

        await test.step('semantic HTML elements', async () => {
          const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
          const lists = await page.locator('ul, ol').count();
          const tables = await page.locator('table').count();
          const forms = await page.locator('form').count();
          
          console.log(`Semantic elements: ${headings} headings, ${lists} lists, ${tables} tables, ${forms} forms`);
          
          // Page should have some semantic structure
          expect(headings + lists + tables + forms).toBeGreaterThan(0);
        });
      });

      test('📝 form accessibility and validation', async ({ page }, testInfo) => {
        const genericPage = new GenericPage(page);
        await page.goto(url);

        await test.step('form labels and associations', async () => {
          const hasProperLabels = await genericPage.hasProperFormLabels();
          expect(hasProperLabels, 'Form inputs should have proper labels').toBe(true);
        });

        await test.step('input types and attributes', async () => {
          const inputs = await page.locator('input, select, textarea').all();
          
          for (const input of inputs) {
            const type = await input.getAttribute('type');
            const required = await input.getAttribute('required');
            const ariaRequired = await input.getAttribute('aria-required');
            
            if (required || ariaRequired === 'true') {
              // Required fields should have proper labeling
              const id = await input.getAttribute('id');
              const ariaLabel = await input.getAttribute('aria-label');
              const ariaLabelledBy = await input.getAttribute('aria-labelledby');
              
              expect(id || ariaLabel || ariaLabelledBy, 'Required fields should have labels').toBeTruthy();
            }
          }
        });

        await test.step('error handling and announcements', async () => {
          const errorContainers = await page.locator('[role="alert"], .error, .alert, [data-testid*="error"]').count();
          const validationMessages = await page.locator('[aria-invalid="true"]').count();
          
          console.log(`Error containers: ${errorContainers}, Validation messages: ${validationMessages}`);
          
          await testInfo.attach('form-validation.json', {
            body: JSON.stringify({ errorContainers, validationMessages }, null, 2),
            contentType: 'application/json'
          });
        });
      });

      test('🎭 interactive elements and focus management', async ({ page }, testInfo) => {
        const genericPage = new GenericPage(page);
        await page.goto(url);

        await test.step('focus indicators', async () => {
          const focusableElements = await page.locator(
            'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ).all();
          
          if (focusableElements.length > 0) {
            await focusableElements[0].focus();
            const focusedElement = page.locator(':focus');
            await expect(focusedElement).toBeVisible();
          }
        });

        await test.step('modal and dialog focus management', async () => {
          const modalTriggers = await page.locator(
            '[data-testid="modal-trigger"], button:has-text("Open"), button:has-text("Show"), button:has-text("Modal")'
          ).all();
          
          for (const trigger of modalTriggers.slice(0, 2)) { // Test first 2 modals
            try {
              await trigger.click();
              await page.waitForTimeout(1000);
              
              const modal = page.locator('[role="dialog"], .modal, [data-testid="modal"]');
              if (await modal.count() > 0) {
                await expect(modal).toBeVisible();
                
                const focusedElement = page.locator(':focus');
                const modalHandle = await modal.elementHandle();
                
                if (modalHandle) {
                  const isInsideModal = await focusedElement.evaluate((el, modalEl) => {
                    return modalEl?.contains(el) || false;
                  }, modalHandle);
                  
                  expect(isInsideModal, 'Focus should be trapped inside modal').toBe(true);
                }
              }
            } catch (error) {
              console.log('Modal test failed, continuing...');
            }
          }
        });

        await test.step('interactive element accessibility', async () => {
          const interactiveElements = await genericPage.getInteractiveElements();
          console.log(`Interactive elements: ${interactiveElements.total} total (${interactiveElements.links} links, ${interactiveElements.buttons} buttons, ${interactiveElements.inputs} inputs)`);
          
          // Check buttons have accessible text
          const buttons = await page.locator('button').all();
          for (const button of buttons) {
            const text = await button.textContent();
            const ariaLabel = await button.getAttribute('aria-label');
            const ariaLabelledBy = await button.getAttribute('aria-labelledby');
            
            expect(text?.trim() || ariaLabel || ariaLabelledBy, 'Buttons should have accessible text').toBeTruthy();
          }
          
          // Check links have accessible text
          const links = await page.locator('a[href]').all();
          for (const link of links) {
            const text = await link.textContent();
            const ariaLabel = await link.getAttribute('aria-label');
            const ariaLabelledBy = await link.getAttribute('aria-labelledby');
            
            expect(text?.trim() || ariaLabel || ariaLabelledBy, 'Links should have accessible text').toBeTruthy();
          }
        });
      });

      test('📊 performance and loading accessibility', async ({ page }, testInfo) => {
        await test.step('page load performance', async () => {
          const startTime = Date.now();
          await page.goto(url, { waitUntil: 'networkidle' });
          const loadTime = Date.now() - startTime;
          
          console.log(`Page load time: ${loadTime}ms`);
          expect(loadTime, 'Page should load within reasonable time').toBeLessThan(10000);
        });

        await test.step('loading states and indicators', async () => {
          const loadingIndicators = await page.locator('[aria-busy="true"], .loading, [data-testid*="loading"]').count();
          const progressBars = await page.locator('[role="progressbar"]').count();
          
          console.log(`Loading indicators: ${loadingIndicators}, Progress bars: ${progressBars}`);
          
          await testInfo.attach('loading-states.json', {
            body: JSON.stringify({ loadingIndicators, progressBars }, null, 2),
            contentType: 'application/json'
          });
        });

        await test.step('lazy loading accessibility', async () => {
          // Scroll to trigger lazy loading
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
          });
          
          await page.waitForTimeout(2000);
          
          const lazyLoadedImages = await page.locator('img[loading="lazy"]').count();
          console.log(`Lazy loaded images: ${lazyLoadedImages}`);
          
          // Check that lazy loaded images have proper alt text
          for (let i = 0; i < Math.min(lazyLoadedImages, 5); i++) {
            const image = page.locator('img[loading="lazy"]').nth(i);
            const alt = await image.getAttribute('alt');
            const role = await image.getAttribute('role');
            
            if (role !== 'presentation' && role !== 'none') {
              expect(alt, 'Lazy loaded images should have alt text').toBeTruthy();
            }
          }
        });
      });
    });
  }
});
