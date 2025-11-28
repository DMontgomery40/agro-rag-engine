import { test, expect } from '@playwright/test';

const baseUrl = process.env.AGRO_WEB_URL || '/web/';

test.describe('Web App Smoke', () => {
  test('renders root and top navigation', async ({ page }) => {
    await page.goto(baseUrl);

    // App root has content (non-black-screen)
    const root = page.locator('#root');
    await expect(root).toBeVisible();
    await expect(root).not.toBeEmpty();

    // Top-level navigation/topbar is visible
    const topbar = page.locator('.topbar');
    await expect(topbar).toBeVisible();

    // Basic structural checks
    await expect(page).toHaveTitle(/AGRO/i);
  });
});
