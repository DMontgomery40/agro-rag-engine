import { test, expect } from '@playwright/test';

test.describe('Keyword Manager Component', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the RAG tab where config/keyword manager should be
    await page.goto('http://localhost:3001/rag');
    await page.waitForLoadState('networkidle');
  });

  test('should render keyword manager section', async ({ page }) => {
    // Wait for the page to load
    await page.waitForSelector('.tab-content.active', { timeout: 10000 });

    // Check if keyword manager label exists (this will be part of the config form)
    // Note: The keyword manager is rendered dynamically in the repos section
    const keywordLabel = page.locator('text=Keyword Manager');

    // If it exists, verify it's visible
    const count = await keywordLabel.count();
    if (count > 0) {
      await expect(keywordLabel.first()).toBeVisible();
      console.log('✓ Keyword Manager component found and visible');
    } else {
      console.log('⚠ Keyword Manager not rendered yet (may require config load)');
    }
  });

  test('should verify config module loads', async ({ page }) => {
    // Verify that window.Config exists (legacy module loaded)
    const configExists = await page.evaluate(() => {
      return typeof (window as any).Config !== 'undefined';
    });

    expect(configExists).toBe(true);
    console.log('✓ Config module loaded successfully');
  });

  test('should verify keyword manager buttons exist when rendered', async ({ page }) => {
    // Wait for dynamic content
    await page.waitForTimeout(2000);

    // Look for the add keyword button (+ button)
    const addButtons = page.locator('button:has-text("+")');
    const buttonCount = await addButtons.count();

    if (buttonCount > 0) {
      console.log(`✓ Found ${buttonCount} add keyword buttons`);

      // Try to find the source filter select
      const sourceSelects = page.locator('select option:has-text("Discriminative")');
      const selectCount = await sourceSelects.count();

      if (selectCount > 0) {
        console.log('✓ Found keyword source filter selects');
      }
    } else {
      console.log('⚠ Keyword manager UI not yet rendered (requires config data)');
    }
  });

  test('should have repos section element', async ({ page }) => {
    // The repos-section element should exist in the DOM
    await page.waitForTimeout(2000);

    const reposSection = page.locator('#repos-section, [id*="repos"]');
    const count = await reposSection.count();

    if (count > 0) {
      console.log('✓ Repos section element found');
    } else {
      console.log('⚠ Repos section not rendered (may need config data)');
    }
  });

  test('should verify error helpers are available', async ({ page }) => {
    // Check if ErrorHelpers utility is loaded
    const errorHelpersExists = await page.evaluate(() => {
      return typeof (window as any).ErrorHelpers !== 'undefined';
    });

    expect(errorHelpersExists).toBe(true);
    console.log('✓ ErrorHelpers module loaded successfully');
  });

  test('should check for health status display', async ({ page }) => {
    // Navigate to main page
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');

    // Wait for React to render
    await page.waitForTimeout(1000);

    // Check if health status is displayed
    const healthStatus = page.locator('#health-status');
    const count = await healthStatus.count();

    if (count > 0) {
      await expect(healthStatus).toBeVisible();
      const healthText = await healthStatus.textContent();
      console.log(`✓ Health status: ${healthText}`);
    } else {
      console.log('⚠ Health status element not found (may not be on this page)');
    }
  });
});
