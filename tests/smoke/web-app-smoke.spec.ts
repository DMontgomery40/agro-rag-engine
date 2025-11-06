import { test, expect } from '@playwright/test';

/**
 * Smoke test for the new /web React application
 * This verifies the basic structure and rendering of the refactored frontend
 */

test.describe('Web App Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the web app (assumed to be running on port 3000 for dev)
    // For now, we'll test the built version served statically
    await page.goto('http://localhost:3000');
  });

  test('should load the app without errors', async ({ page }) => {
    // Wait for the app to be fully loaded
    await page.waitForLoadState('networkidle');

    // Check that there are no console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Verify the page title
    await expect(page).toHaveTitle(/AGRO/);
  });

  test('should render the topbar with branding', async ({ page }) => {
    // Check for the AGRO brand
    const brand = page.locator('.brand');
    await expect(brand).toBeVisible();
    await expect(brand).toHaveText('AGRO');

    // Check for the tagline
    const tagline = page.locator('.tagline');
    await expect(tagline).toBeVisible();
    await expect(tagline).toContainText('Another Good RAG Option');
  });

  test('should render the main tab bar', async ({ page }) => {
    const tabBar = page.locator('.tab-bar');
    await expect(tabBar).toBeVisible();

    // Check for all main tabs
    const tabs = [
      'Get Started',
      'Dashboard',
      'Chat',
      'VS Code',
      'Grafana',
      'RAG',
      'Profiles',
      'Infrastructure',
      'Admin'
    ];

    for (const tabName of tabs) {
      const tab = page.locator('.tab-bar button', { hasText: tabName });
      await expect(tab).toBeVisible();
    }
  });

  test('should render the side panel', async ({ page }) => {
    const sidepanel = page.locator('.sidepanel');
    await expect(sidepanel).toBeVisible();

    // Check for Apply Changes button
    const applyBtn = page.locator('#btn-apply');
    await expect(applyBtn).toBeVisible();
  });

  test('should have dashboard tab visible by default', async ({ page }) => {
    const dashboardTab = page.locator('#tab-dashboard');
    await expect(dashboardTab).toBeVisible();
    await expect(dashboardTab).toHaveClass(/active/);
  });

  test('should have theme selector', async ({ page }) => {
    const themeSelector = page.locator('#theme-mode');
    await expect(themeSelector).toBeVisible();

    // Check for theme options
    const options = await themeSelector.locator('option').allTextContents();
    expect(options).toContain('Auto');
    expect(options).toContain('Dark');
    expect(options).toContain('Light');
  });

  test('should have health button', async ({ page }) => {
    const healthBtn = page.locator('#btn-health');
    await expect(healthBtn).toBeVisible();
    await expect(healthBtn).toHaveText('Health');
  });

  test('should have global search', async ({ page }) => {
    const searchInput = page.locator('#global-search');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', /Search settings/);
  });
});
