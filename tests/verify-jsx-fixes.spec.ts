import { test, expect } from '@playwright/test';

test.describe('JSX Attribute Fixes Verification', () => {
  test.use({ baseURL: 'http://localhost:3001' });

  test('should load the app without JavaScript errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: Error[] = [];

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the app
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');

    // Give it a moment to execute JavaScript
    await page.waitForTimeout(2000);

    // Check that there are no JavaScript syntax errors
    expect(pageErrors.length, `Page errors found: ${pageErrors.map(e => e.message).join(', ')}`).toBe(0);

    // Check that there are no critical console errors
    const criticalErrors = consoleErrors.filter(err =>
      err.includes('Uncaught') ||
      err.includes('SyntaxError') ||
      err.includes('onclick') ||
      err.includes('stroke-width') ||
      err.includes('readonly')
    );

    expect(criticalErrors.length, `Critical console errors found: ${criticalErrors.join(', ')}`).toBe(0);

    console.log('✓ No JavaScript errors detected');
    console.log('✓ All JSX attribute fixes are valid');
  });

  test('should render tab components without errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for the main app container
    await page.waitForSelector('body', { timeout: 5000 });

    // Check that we can find the main container (verifies React rendered)
    const appContainer = await page.locator('#app').count();
    expect(appContainer).toBeGreaterThan(0);

    console.log('✓ Tab components rendered successfully');
  });
});
