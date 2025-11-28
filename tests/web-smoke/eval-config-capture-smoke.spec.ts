/**
 * AGRO - Eval Config Capture Smoke Test
 *
 * Verifies that eval runs capture and display config keys:
 * - Backend API returns config with keys
 * - UI displays config section with key count
 */

import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8012';

test.describe('Eval Config Capture', () => {
  test('Backend API returns eval runs with has_config flag', async ({ request }) => {
    // Get list of eval runs
    const response = await request.get(`${API_BASE}/api/eval/runs`);
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.runs).toBeInstanceOf(Array);

    // Find runs with has_config = true
    const runsWithConfig = data.runs.filter((r: any) => r.has_config);
    console.log('[Test] Runs with config:', runsWithConfig.length);
    console.log('[Test] Sample runs:', data.runs.slice(0, 5).map((r: any) => ({
      run_id: r.run_id,
      has_config: r.has_config
    })));

    // At least one run should have config
    expect(runsWithConfig.length).toBeGreaterThan(0);
  });

  test('Eval results endpoint returns config keys', async ({ request }) => {
    // Get a run that has config
    const listResponse = await request.get(`${API_BASE}/api/eval/runs`);
    const listData = await listResponse.json();

    const runWithConfig = listData.runs.find((r: any) => r.has_config);
    if (!runWithConfig) {
      test.skip(true, 'No eval runs with config found');
      return;
    }

    // Fetch full results
    const resultsResponse = await request.get(`${API_BASE}/api/eval/results/${runWithConfig.run_id}`);
    expect(resultsResponse.ok()).toBe(true);

    const resultsData = await resultsResponse.json();
    console.log('[Test] Run ID:', resultsData.run_id);
    console.log('[Test] Config keys count:', Object.keys(resultsData.config || {}).length);
    console.log('[Test] Sample config keys:', Object.keys(resultsData.config || {}).slice(0, 10));

    // Config should have keys
    expect(resultsData.config).toBeDefined();
    expect(Object.keys(resultsData.config).length).toBeGreaterThan(0);
  });

  test('UI displays config key count in Eval Analysis tab', async ({ page }) => {
    // Navigate to Eval Analysis tab (using baseURL from playwright config)
    await page.goto('/web/?tab=rag&subtab=evaluate');
    await page.waitForTimeout(3000);

    // Look for "Run Configuration" section header
    const configSection = page.locator('text=/Run Configuration/');
    await expect(configSection.first()).toBeVisible({ timeout: 10000 });

    // Look for "keys" badge showing config count
    const keysBadge = page.locator('text=/\\d+ keys/');
    await expect(keysBadge.first()).toBeVisible({ timeout: 5000 });

    // Get the text to verify it shows a positive number
    const badgeText = await keysBadge.first().textContent();
    console.log('[Test] Config keys badge text:', badgeText);

    // Extract number and verify it's positive
    const match = badgeText?.match(/(\d+) keys/);
    if (match) {
      const keyCount = parseInt(match[1], 10);
      console.log('[Test] Config key count from UI:', keyCount);
      expect(keyCount).toBeGreaterThan(0);
    }

    // Take screenshot for verification
    await page.screenshot({ path: '/tmp/eval-config-capture-smoke.png', fullPage: true });
  });

  test('Clicking Expand shows config values', async ({ page }) => {
    // Navigate to Eval Analysis tab (using baseURL from playwright config)
    await page.goto('/web/?tab=rag&subtab=evaluate');
    await page.waitForTimeout(3000);

    // Find and click expand button
    const expandButton = page.locator('text=/▶ Expand/');
    if (await expandButton.count() > 0) {
      await expandButton.first().click();
      await page.waitForTimeout(1000);

      // After expanding, check for config category headers like "Retrieval" or "Weighting"
      const categoryHeader = page.locator('text=/RETRIEVAL|Retrieval|WEIGHTING|Weighting/i');
      await expect(categoryHeader.first()).toBeVisible({ timeout: 5000 });
      console.log('[Test] Config category headers visible');

      // Take screenshot of expanded config
      await page.screenshot({ path: '/tmp/eval-config-expanded.png', fullPage: true });
    } else {
      console.log('[Test] No expand button found - config may already be expanded or empty');
    }
  });
});
