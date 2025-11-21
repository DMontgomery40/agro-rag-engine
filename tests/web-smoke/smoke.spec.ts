import { test, expect } from '@playwright/test';

test.describe('Web App Smoke', () => {
  test('renders root and top navigation', async ({ page }) => {
    await page.goto('/');

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

