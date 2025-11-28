// AGRO - Dashboard Manual Check
// Simple visual test to verify Dashboard is rendering

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8012';

test.describe('Dashboard - Manual Visual Check', () => {
  test('Dashboard page should load and render', async ({ page }) => {
    // Navigate directly to dashboard
    await page.goto(`${BASE_URL}/#/dashboard`, { waitUntil: 'load' });
    await page.waitForTimeout(3000); // Give React time to mount

    // Take screenshot
    await page.screenshot({ path: 'test-results/dashboard-loaded.png', fullPage: true });

    // Check if main dashboard container exists
    const dashboardContainer = page.locator('#tab-dashboard');
    await expect(dashboardContainer).toBeAttached();

    console.log('✓ Dashboard container exists');

    // Check for any subtab buttons
    const subtabButtons = page.locator('.subtab-btn');
    const count = await subtabButtons.count();
    console.log(`Found ${count} subtab buttons`);

    // If subtabs exist, list them
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const btn = subtabButtons.nth(i);
        const text = await btn.textContent();
        const dataSubtab = await btn.getAttribute('data-subtab');
        console.log(`  - Subtab ${i}: "${text}" (data-subtab="${dataSubtab}")`);
      }
    }

    // Check if React components are mounted
    const systemStatus = page.locator('#tab-dashboard-system');
    const systemExists = await systemStatus.count() > 0;
    console.log(`System Status subtab exists: ${systemExists}`);

    const monitoring = page.locator('#tab-dashboard-monitoring');
    const monitoringExists = await monitoring.count() > 0;
    console.log(`Monitoring subtab exists: ${monitoringExists}`);

    const storage = page.locator('#tab-dashboard-storage');
    const storageExists = await storage.count() > 0;
    console.log(`Storage subtab exists: ${storageExists}`);

    // Print page title
    const title = await page.title();
    console.log(`Page title: ${title}`);

    // Print current URL
    console.log(`Current URL: ${page.url()}`);

    // Success if dashboard container exists
    expect(count).toBeGreaterThan(0);
  });
});
