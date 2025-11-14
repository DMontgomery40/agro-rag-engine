// Minimal JS-based Playwright smoke to avoid TS toolchain issues
// Verifies the GUI is not a blank screen and top-level nav renders
const { test, expect } = require('@playwright/test');

test('GUI renders and shows top nav', async ({ page }) => {
  await page.goto('/gui/');
  await page.waitForLoadState('domcontentloaded');

  const body = page.locator('body');
  await expect(body).toBeVisible();
  const height = await body.evaluate((el) => el.getBoundingClientRect().height);
  expect(height).toBeGreaterThan(200);

  // These selectors are part of legacy gui layout
  await expect(page.locator('.topbar')).toBeVisible();
  await expect(page.locator('.tab-bar')).toBeVisible();
});

