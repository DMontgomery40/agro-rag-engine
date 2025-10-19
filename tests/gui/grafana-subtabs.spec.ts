import { test, expect } from '@playwright/test';

test('Grafana subtabs switch correctly', async ({ page }) => {
  await page.goto('http://localhost:8012');

  // Click on Grafana tab
  await page.click('button[data-tab="grafana"]');
  await page.waitForTimeout(500);

  // Initially, Dashboard subtab should be active
  const dashboardSubtab = page.locator('#tab-grafana-dashboard');
  const configSubtab = page.locator('#tab-grafana-config');

  await expect(dashboardSubtab).toHaveClass(/active/);
  await expect(dashboardSubtab).toBeVisible();

  // Take screenshot of dashboard
  await page.screenshot({
    path: 'grafana-dashboard-subtab.png',
    fullPage: false
  });

  // Click on Config subtab
  await page.click('#grafana-subtabs button[data-subtab="config"]');
  await page.waitForTimeout(500);

  // Config should now be active, dashboard should not be visible
  await expect(configSubtab).toHaveClass(/active/);
  await expect(configSubtab).toBeVisible();
  await expect(dashboardSubtab).not.toHaveClass(/active/);

  // Take screenshot of config
  await page.screenshot({
    path: 'grafana-config-subtab.png',
    fullPage: false
  });

  // Verify config content is visible (check for a specific input)
  const grafanaUrlInput = page.locator('input[name="GRAFANA_BASE_URL"]');
  await expect(grafanaUrlInput).toBeVisible();

  console.log('✓ Config subtab visible with form fields');

  // Switch back to Dashboard
  await page.click('#grafana-subtabs button[data-subtab="dashboard"]');
  await page.waitForTimeout(500);

  await expect(dashboardSubtab).toHaveClass(/active/);
  await expect(dashboardSubtab).toBeVisible();
  await expect(configSubtab).not.toHaveClass(/active/);

  console.log('✓ Subtab switching works correctly');
});