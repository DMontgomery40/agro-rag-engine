import { test, expect } from '@playwright/test';

test.describe('Dashboard Structure Smoke', () => {
  test('renders dashboard key elements', async ({ page }) => {
    await page.goto('/');
    // Navigate via top-level nav to avoid static server 404s on deep links
    await page.click('a:has-text("Dashboard")');

    // Root container
    const root = page.locator('#tab-dashboard');
    await expect(root).toBeVisible();

    // System status fields
    await expect(page.locator('#dash-health')).toBeVisible();
    await expect(page.locator('#dash-repo')).toBeVisible();
    await expect(page.locator('#dash-branch')).toBeVisible();
    await expect(page.locator('#dash-cards')).toBeVisible();

    // Quick action buttons
    await expect(page.locator('#btn-generate-keywords')).toBeVisible();
    await expect(page.locator('#dash-index-start')).toBeVisible();
    await expect(page.locator('#dash-reload-config')).toBeVisible();
    await expect(page.locator('#dash-eval-trigger')).toBeVisible();
    await expect(page.locator('#dash-refresh-status')).toBeVisible();

    // Index status + progress bar
    await expect(page.locator('#dash-index-status')).toHaveCount(1);
    await expect(page.locator('#dash-index-bar')).toHaveCount(1);
  });
});
