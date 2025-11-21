import { test, expect } from '@playwright/test';

test('GUI renders without blank screen and shows topbar/tab-bar', async ({ page }) => {
  await page.goto('/gui/');
  await page.waitForLoadState('domcontentloaded');

  // Ensure body has content and non-trivial height
  const body = page.locator('body');
  await expect(body).toBeVisible();
  const height = await body.evaluate((el) => el.getBoundingClientRect().height);
  expect(height).toBeGreaterThan(200); // guard against blank canvas

  // Check topbar and tab bar exist and are visible
  await expect(page.locator('.topbar')).toBeVisible();
  await expect(page.locator('.tab-bar')).toBeVisible();

  // Capture a screenshot artifact for human verification
  await page.screenshot({ path: 'test-results/gui-smoke.png', fullPage: false });
});
