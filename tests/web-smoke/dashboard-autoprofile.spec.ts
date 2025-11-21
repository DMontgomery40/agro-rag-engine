import { test, expect } from '@playwright/test';

test.describe('Dashboard Auto-Profile Structure', () => {
  test('shows Top Folders + Auto-Profile controls', async ({ page }) => {
    await page.goto('/');
    await page.click('a:has-text("Dashboard")');

    // Top Folders container exists
    await expect(page.locator('#dash-top-folders-metrics')).toHaveCount(1);

    // Auto-Profile section cards/buttons exist
    await expect(page.locator('#apv2-mine-default')).toHaveCount(1);
    await expect(page.locator('#apv2-train-default')).toHaveCount(1);
    await expect(page.locator('#apv2-eval-default')).toHaveCount(1);

    // Advanced toggle and container
    await expect(page.locator('#apv2-toggle')).toHaveCount(1);
    await expect(page.locator('#apv2-advanced')).toHaveCount(1);
  });
});

