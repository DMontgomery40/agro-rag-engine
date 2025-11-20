import { test, expect } from '@playwright/test';

test.describe('Grafana Tab Subtab Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/grafana');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test('Grafana subtabs navigation bar is visible', async ({ page }) => {
    const subtabsBar = page.locator('#grafana-subtabs.subtab-bar');
    await expect(subtabsBar).toBeVisible();

    // Verify it contains 2 buttons
    const buttons = page.locator('#grafana-subtabs button');
    const count = await buttons.count();
    expect(count).toBe(2);
  });

  test('Dashboard subtab is active by default', async ({ page }) => {
    const dashboardButton = page.locator('#grafana-subtabs button:has-text("Dashboard")');
    const classAttr = await dashboardButton.getAttribute('class');
    expect(classAttr).toContain('active');

    // Dashboard subtab content should be active
    const dashboardSubtab = page.locator('#tab-grafana-dashboard');
    const dashboardClass = await dashboardSubtab.getAttribute('class');
    expect(dashboardClass).toContain('active');

    // Config subtab should not be active
    const configSubtab = page.locator('#tab-grafana-config');
    const configClass = await configSubtab.getAttribute('class');
    expect(configClass).not.toContain('active');
  });

  test('Clicking Config button switches to config subtab', async ({ page }) => {
    const configButton = page.locator('#grafana-subtabs button:has-text("Config")');
    await expect(configButton).toBeVisible();

    await configButton.click();
    await page.waitForTimeout(200);

    // Config button should be active
    const configButtonClass = await configButton.getAttribute('class');
    expect(configButtonClass).toContain('active');

    // Config subtab should be active
    const configSubtab = page.locator('#tab-grafana-config');
    const configClass = await configSubtab.getAttribute('class');
    expect(configClass).toContain('active');

    // Dashboard subtab should not be active
    const dashboardSubtab = page.locator('#tab-grafana-dashboard');
    const dashboardClass = await dashboardSubtab.getAttribute('class');
    expect(dashboardClass).not.toContain('active');
  });

  test('Both subtabs remain in DOM regardless of active state', async ({ page }) => {
    // Both subtabs should exist in DOM
    const dashboardSubtab = page.locator('#tab-grafana-dashboard');
    const configSubtab = page.locator('#tab-grafana-config');

    await expect(dashboardSubtab).toHaveCount(1);
    await expect(configSubtab).toHaveCount(1);

    // Click config to switch
    await page.locator('#grafana-subtabs button:has-text("Config")').click();
    await page.waitForTimeout(200);

    // Both should still exist in DOM
    await expect(dashboardSubtab).toHaveCount(1);
    await expect(configSubtab).toHaveCount(1);
  });

  test('Switching between subtabs multiple times works correctly', async ({ page }) => {
    // Start: Dashboard active
    let dashboardClass = await page.locator('#tab-grafana-dashboard').getAttribute('class');
    expect(dashboardClass).toContain('active');

    // Switch to Config
    await page.locator('#grafana-subtabs button:has-text("Config")').click();
    await page.waitForTimeout(100);
    let configClass = await page.locator('#tab-grafana-config').getAttribute('class');
    expect(configClass).toContain('active');

    // Switch back to Dashboard
    await page.locator('#grafana-subtabs button:has-text("Dashboard")').click();
    await page.waitForTimeout(100);
    dashboardClass = await page.locator('#tab-grafana-dashboard').getAttribute('class');
    expect(dashboardClass).toContain('active');

    // Switch to Config again
    await page.locator('#grafana-subtabs button:has-text("Config")').click();
    await page.waitForTimeout(100);
    configClass = await page.locator('#tab-grafana-config').getAttribute('class');
    expect(configClass).toContain('active');
  });
});
