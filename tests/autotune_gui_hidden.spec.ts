import { test, expect } from '@playwright/test';

/**
 * Verify Autotune GUI controls are hidden/removed
 * Backend endpoint /api/autotune/status should still exist for future implementation
 */

test.describe('Autotune GUI Controls Hidden', () => {
  test('Dashboard does not display autotune controls', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5175');

    // Wait for the app to load
    await page.waitForTimeout(2000);

    // Navigate to Dashboard tab
    const dashboardTab = page.locator('[data-tab="dashboard"]');
    if (await dashboardTab.isVisible()) {
      await dashboardTab.click();
      await page.waitForTimeout(500);
    }

    // Verify the #dash-autotune element does not exist
    const autotuneElement = page.locator('#dash-autotune');
    await expect(autotuneElement).toHaveCount(0);

    // Verify no visible "Auto-Tune" labels in status sections
    const autotuneLabels = page.locator('text=/Auto-Tune/i').filter({ hasText: /Auto-Tune/i });
    await expect(autotuneLabels).toHaveCount(0);
  });

  test('DevTools Integrations does not show autotune webhook events', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5175');

    // Wait for the app to load
    await page.waitForTimeout(2000);

    // Navigate to DevTools tab
    const devToolsTab = page.locator('[data-tab="devtools"]');
    if (await devToolsTab.isVisible()) {
      await devToolsTab.click();
      await page.waitForTimeout(500);

      // Navigate to Integrations subtab
      const integrationsSubtab = page.locator('[data-subtab="integrations"]');
      if (await integrationsSubtab.isVisible()) {
        await integrationsSubtab.click();
        await page.waitForTimeout(500);

        // Get all webhook event text
        const eventLabels = await page.locator('input[type="checkbox"]').count();

        // Get page text to verify no autotune events
        const pageText = await page.locator('body').textContent();

        // Verify no "Auto-Tune Started" or "Auto-Tune Completed" events
        expect(pageText).not.toContain('Auto-Tune Started');
        expect(pageText).not.toContain('Auto-Tune Completed');
      }
    }
  });

  test('Backend autotune endpoint still exists', async ({ page, request }) => {
    // Verify the backend endpoint is still available
    const response = await request.get('http://localhost:8012/api/autotune/status');

    // Should return 200 OK
    expect(response.ok()).toBe(true);

    // Should return JSON with expected structure
    const data = await response.json();
    expect(data).toHaveProperty('enabled');
    expect(data).toHaveProperty('current_mode');
  });
});
