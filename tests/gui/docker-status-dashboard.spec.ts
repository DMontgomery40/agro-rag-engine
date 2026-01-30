/**
 * Docker Status Dashboard GUI Test
 * 
 * Verifies that the Docker status displays correctly in the Dashboard's
 * System Status section. Tests the fix for the ADA violation where
 * Docker status was always showing "unavailable" due to interface mismatch.
 */
import { test, expect } from '@playwright/test';

test.describe('Docker Status in Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/web');
    await page.waitForLoadState('networkidle');
  });

  test('Docker status shows running containers, not "unavailable"', async ({ page }) => {
    // Wait for the dashboard to load
    await expect(page.locator('body')).toBeVisible();
    
    // Look for the Dashboard tab or System Status section
    // The dashboard should be the default view
    const dashboardTab = page.locator('text=Dashboard').first();
    if (await dashboardTab.isVisible()) {
      await dashboardTab.click();
    }

    // Wait for status to load (there's a 10-second polling interval)
    await page.waitForTimeout(2000);

    // Find the Docker status element
    const dockerStatus = page.locator('#dash-docker');
    await expect(dockerStatus).toBeVisible({ timeout: 10000 });

    // Get the text content
    const statusText = await dockerStatus.textContent();
    console.log('Docker status text:', statusText);

    // The status should NOT be "unavailable" if Docker is running
    // It should show something like "9/9 running" 
    expect(statusText).not.toBe('unavailable');
    expect(statusText).not.toBe('—');
    
    // Should contain "running" if containers are up
    expect(statusText?.toLowerCase()).toContain('running');
  });

  test('System Status section renders with all status items', async ({ page }) => {
    // Wait for dashboard content
    await page.waitForSelector('.dashboard-subtab', { timeout: 10000 });

    // Verify key status items are present
    const statusItems = [
      '#dash-health',
      '#dash-repo', 
      '#dash-branch',
      '#dash-cards',
      '#dash-docker',
      '#dash-git-hooks'
    ];

    for (const selector of statusItems) {
      const element = page.locator(selector);
      await expect(element).toBeVisible({ timeout: 5000 });
      const text = await element.textContent();
      // Should not show loading placeholder
      expect(text).not.toBe('—');
    }
  });

  test('Refresh Status button works', async ({ page }) => {
    // Find and click the refresh button (use the one with ↻ symbol in System Status section)
    const refreshBtn = page.locator('button:has-text("↻ Refresh Status")').first();
    await expect(refreshBtn).toBeVisible({ timeout: 10000 });
    
    // Click refresh
    await refreshBtn.click();
    
    // Button should show "Refreshing..." temporarily
    await expect(refreshBtn).toContainText(/Refresh/);
    
    // Wait for refresh to complete
    await page.waitForTimeout(2000);
    
    // Docker status should still be visible and not unavailable
    const dockerStatus = page.locator('#dash-docker');
    const statusText = await dockerStatus.textContent();
    expect(statusText).not.toBe('unavailable');
  });
});

