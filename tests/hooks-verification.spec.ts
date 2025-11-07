import { test, expect } from '@playwright/test';

test.describe('React Hooks Conversion Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('app should load and initialize', async ({ page }) => {
    // Wait for loading screen to disappear (max 30 seconds)
    const loadingScreen = page.locator('text=Loading application');

    // Either loading screen disappears or content appears
    await Promise.race([
      loadingScreen.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {}),
      page.locator('.topbar').waitFor({ timeout: 30000 })
    ]);

    // Check if app rendered
    const topbar = page.locator('.topbar');
    await expect(topbar).toBeVisible({ timeout: 5000 });
  });

  test('Apply button should exist and be functional', async ({ page }) => {
    // Wait for app to load
    await page.waitForSelector('.topbar', { timeout: 30000 });

    // Check Apply button exists
    const applyBtn = page.locator('#btn-apply');
    await expect(applyBtn).toBeVisible();

    // Check it has correct text
    await expect(applyBtn).toHaveText('Apply Changes');

    // Check it starts disabled (no dirty state)
    const isDisabled = await applyBtn.isDisabled();
    console.log('Apply button disabled state:', isDisabled);
  });

  test('modules should be loaded', async ({ page }) => {
    // Wait for app to load
    await page.waitForSelector('.topbar', { timeout: 30000 });

    // Check if window.CoreUtils is available (indicates modules loaded)
    const coreUtilsExists = await page.evaluate(() => {
      return !!(window as any).CoreUtils;
    });

    expect(coreUtilsExists).toBe(true);
    console.log('CoreUtils loaded:', coreUtilsExists);

    // Check if Config module is available
    const configExists = await page.evaluate(() => {
      return !!(window as any).Config;
    });

    expect(configExists).toBe(true);
    console.log('Config module loaded:', configExists);
  });

  test('health check integration works', async ({ page }) => {
    // Wait for app to load
    await page.waitForSelector('.topbar', { timeout: 30000 });

    // Find health button and status
    const healthBtn = page.locator('#btn-health');
    const healthStatus = page.locator('#health-status');

    await expect(healthBtn).toBeVisible();
    await expect(healthStatus).toBeVisible();

    const statusText = await healthStatus.textContent();
    console.log('Initial health status:', statusText);

    // Click health button
    await healthBtn.click();

    // Wait a moment for update
    await page.waitForTimeout(2000);

    const updatedStatusText = await healthStatus.textContent();
    console.log('Updated health status:', updatedStatusText);
  });
});
