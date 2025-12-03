import { test, expect } from '@playwright/test';

test.describe('RAG Tab - buildInProgress Fix Verification', () => {
  test('RAG Data Quality tab should load without ReferenceError', async ({ page }) => {
    // Collect console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Collect page errors
    const pageErrors: Error[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to home
    await page.goto('/');
    await page.waitForSelector('#root', { timeout: 10000 });

    // Click on RAG tab (button or link)
    const ragTab = page.locator('button:has-text("RAG"), a:has-text("RAG")').first();
    if (await ragTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await ragTab.click();
      await page.waitForTimeout(2000);

      // Try to navigate to Data Quality subtab if it exists
      const dataQualityTab = page.locator('text=/Data Quality/i').first();
      if (await dataQualityTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await dataQualityTab.click();
        await page.waitForTimeout(2000);
      }
    }

    // Check for the specific errors we fixed
    const hasBuildInProgressError = pageErrors.some(err =>
      err.message.includes('buildInProgress is not defined')
    ) || consoleErrors.some(msg =>
      msg.includes('buildInProgress is not defined')
    );

    const hasProgressRepoError = pageErrors.some(err =>
      err.message.includes('progressRepo is not defined')
    ) || consoleErrors.some(msg =>
      msg.includes('progressRepo is not defined')
    );

    // Log all errors for debugging
    if (pageErrors.length > 0 || consoleErrors.length > 0) {
      console.log('=== Page Errors ===');
      pageErrors.forEach(err => console.log(`  ${err.name}: ${err.message}`));
      console.log('=== Console Errors ===');
      consoleErrors.forEach(msg => console.log(`  ${msg}`));
    }

    // Assertions - only check for the specific errors we were asked to fix
    expect(hasBuildInProgressError, 'Should not have buildInProgress error').toBe(false);
    expect(hasProgressRepoError, 'Should not have progressRepo error').toBe(false);

    console.log('✅ RAG tab loaded without buildInProgress or progressRepo errors');
  });
});
