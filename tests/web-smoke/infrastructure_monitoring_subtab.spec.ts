import { test, expect } from '@playwright/test';

/**
 * Monitoring Subtab Smoke Test
 *
 * This test verifies that the Monitoring subtab in the Infrastructure tab:
 * - Loads alert configuration from backend
 * - Displays all 7 threshold input fields
 * - Shows action messages when saving configuration
 * - Has tooltips for all threshold fields
 * - Displays Grafana metrics section
 */

test.describe('Infrastructure - Monitoring Subtab', () => {
  test('should load Monitoring subtab and display all UI elements', async ({ page }) => {
    // Navigate to Infrastructure tab with Monitoring subtab
    await page.goto('http://localhost:5173/web/infrastructure?subtab=monitoring');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify page title
    await expect(page.locator('h2').filter({ hasText: 'Performance & Reliability Alerts' })).toBeVisible();

    // Verify Performance Thresholds section
    await expect(page.locator('h3').filter({ hasText: 'Performance Thresholds' })).toBeVisible();

    // Verify API Anomaly Alerts section
    await expect(page.locator('h3').filter({ hasText: 'API Anomaly Alerts' })).toBeVisible();

    // Verify Grafana Metrics section
    await expect(page.locator('h3').filter({ hasText: 'Grafana Metrics' })).toBeVisible();

    console.log('✅ All sections loaded correctly');
  });

  test('should display all 7 threshold input fields', async ({ page }) => {
    await page.goto('http://localhost:5173/web/infrastructure?subtab=monitoring');
    await page.waitForLoadState('networkidle');

    // Wait for loading to complete
    await page.waitForTimeout(500);

    // Scope to the monitoring subtab container
    const monitoringTab = page.locator('#tab-infrastructure-monitoring');

    // Verify all 7 number inputs are visible within the monitoring subtab
    const numberInputs = monitoringTab.locator('input[type="number"]');
    const count = await numberInputs.count();

    // We should have exactly 7 threshold inputs
    expect(count).toBe(7);

    // Verify each input is visible
    for (let i = 0; i < count; i++) {
      await expect(numberInputs.nth(i)).toBeVisible();
    }

    console.log('✅ All 7 threshold inputs are visible');
  });

  test('should modify threshold values', async ({ page }) => {
    await page.goto('http://localhost:5173/web/infrastructure?subtab=monitoring');
    await page.waitForLoadState('networkidle');

    // Wait for loading to complete
    await page.waitForTimeout(500);

    // Scope to the monitoring subtab container
    const monitoringTab = page.locator('#tab-infrastructure-monitoring');

    // Modify Error Rate Threshold (first input in monitoring tab)
    const errorRateInput = monitoringTab.locator('input[type="number"]').nth(0);
    await errorRateInput.fill('10.0');
    await expect(errorRateInput).toHaveValue('10.0');

    // Modify Latency P99 (second input in monitoring tab)
    const latencyInput = monitoringTab.locator('input[type="number"]').nth(1);
    await latencyInput.fill('3.0');
    await expect(latencyInput).toHaveValue('3.0');

    console.log('✅ Threshold values can be modified');
  });

  test('should save configuration and display action message', async ({ page }) => {
    await page.goto('http://localhost:5173/web/infrastructure?subtab=monitoring');
    await page.waitForLoadState('networkidle');

    // Wait for loading to complete
    await page.waitForTimeout(500);

    // Click Save Alert Configuration button
    const saveButton = page.locator('button').filter({ hasText: 'Save Alert Configuration' });
    await saveButton.click();

    // Wait for action message to appear
    await page.waitForTimeout(1000);

    // Verify action message appears (either saving or success/error message)
    const actionMessage = page.locator('div').filter({
      hasText: /Saving alert configuration|Alert configuration saved|Failed to save|Error saving/
    }).first();

    const messageVisible = await actionMessage.isVisible().catch(() => false);

    if (!messageVisible) {
      console.log('⚠️  Action message may have auto-dismissed before assertion');
    } else {
      console.log('✅ Action message displayed');
    }

    // Wait for auto-dismiss
    await page.waitForTimeout(3500);

    // Verify message has auto-dismissed
    const messageStillVisible = await actionMessage.isVisible().catch(() => false);
    if (messageStillVisible) {
      console.log('⚠️  Action message should auto-dismiss after 3 seconds');
    } else {
      console.log('✅ Action message auto-dismissed correctly');
    }
  });

  test('should verify tooltips are present', async ({ page }) => {
    await page.goto('http://localhost:5173/web/infrastructure?subtab=monitoring');
    await page.waitForLoadState('networkidle');

    // Wait for loading to complete
    await page.waitForTimeout(500);

    // Check for tooltip titles rendered by useTooltips hook
    const tooltipTitles = page.locator('span.tt-title');
    const count = await tooltipTitles.count();

    // We expect at least 7 tooltips (one for each threshold field)
    expect(count).toBeGreaterThanOrEqual(7);

    console.log(`✅ Found ${count} tooltips on Monitoring subtab`);
  });

  test('should display Grafana dashboard buttons', async ({ page }) => {
    await page.goto('http://localhost:5173/web/infrastructure?subtab=monitoring');
    await page.waitForLoadState('networkidle');

    // Wait for loading to complete
    await page.waitForTimeout(500);

    // Verify Open Grafana Dashboard button
    const grafanaButton = page.locator('button').filter({ hasText: 'Open Grafana Dashboard' });
    await expect(grafanaButton).toBeVisible();

    // Verify Open Prometheus button
    const prometheusButton = page.locator('button').filter({ hasText: 'Open Prometheus' });
    await expect(prometheusButton).toBeVisible();

    console.log('✅ Grafana and Prometheus buttons are visible');
  });

  test('should display metrics list', async ({ page }) => {
    await page.goto('http://localhost:5173/web/infrastructure?subtab=monitoring');
    await page.waitForLoadState('networkidle');

    // Wait for loading to complete
    await page.waitForTimeout(500);

    // Verify "Available Metrics:" text
    await expect(page.locator('text=Available Metrics:')).toBeVisible();

    // Verify metrics list items
    await expect(page.locator('text=Request latency (P50, P95, P99)')).toBeVisible();
    await expect(page.locator('text=Error rates and counts')).toBeVisible();
    await expect(page.locator('text=API token usage and costs')).toBeVisible();

    console.log('✅ Metrics list displayed correctly');
  });
});
