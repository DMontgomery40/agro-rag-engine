/**
 * Docker Settings Page Smoke Test
 *
 * Verifies the DockerSubtab renders with proper sections:
 * - Docker Settings (collapsible) with 7 config settings
 * - Infrastructure Services section
 * - Docker Status section
 * - All Containers section
 * - TooltipIcons on all sections
 *
 * Location: Infrastructure > Docker subtab
 */
import { test, expect } from '@playwright/test';

test.describe('Docker Settings Page', () => {
  test('Docker services page renders without errors', async ({ page }) => {
    // Navigate directly to Infrastructure > Docker subtab
    await page.goto('http://localhost:5173/web/infrastructure?subtab=docker');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify the page is not blank
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Check for Docker Settings collapsible section header (h3 inside button)
    // Use nth(1) to get the Docker subtab version, not the hidden Services subtab
    const settingsHeader = page.locator('text=Docker Settings').nth(0);
    await expect(settingsHeader).toBeVisible({ timeout: 10000 });

    // Check for Infrastructure Services section
    const infraSection = page.locator('text=Infrastructure Services').nth(0);
    await expect(infraSection).toBeVisible({ timeout: 5000 });

    // Check for Docker Status section
    const statusSection = page.locator('text=Docker Status').nth(0);
    await expect(statusSection).toBeVisible({ timeout: 5000 });

    // Check for All Containers section
    const containersSection = page.locator('text=All Containers').nth(0);
    await expect(containersSection).toBeVisible({ timeout: 5000 });

    console.log('Docker services page renders correctly');
  });

  test('Docker Settings section is collapsible with config inputs', async ({ page }) => {
    await page.goto('http://localhost:5173/web/infrastructure?subtab=docker');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Find the Docker Settings header (button)
    const settingsHeader = page.locator('.settings-section-header').filter({ hasText: 'Docker Settings' });
    await expect(settingsHeader).toBeVisible({ timeout: 5000 });

    // Click to expand
    await settingsHeader.click();
    await page.waitForTimeout(300);

    // Check for config inputs inside expanded section
    const statusTimeoutInput = page.locator('label:has-text("Status Timeout")').locator('..').locator('input');
    await expect(statusTimeoutInput).toBeVisible({ timeout: 3000 });

    // Check for save button (may show "Save Settings" or "No Changes" depending on state)
    const saveBtn = page.locator('button:has-text("Save Settings"), button:has-text("No Changes")').first();
    await expect(saveBtn).toBeVisible();

    console.log('Docker Settings collapsible section works');
  });

  test('Docker status displays container info', async ({ page }) => {
    await page.goto('http://localhost:5173/web/infrastructure?subtab=docker');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for Docker status display - look for visible status text
    const statusRunning = page.locator('text=Running').nth(0);
    await expect(statusRunning).toBeVisible({ timeout: 10000 });

    // Should show Docker Status header
    await expect(page.locator('text=Docker Status').nth(0)).toBeVisible();

    // Check for refresh button
    const refreshBtn = page.locator('#btn-docker-refresh');
    await expect(refreshBtn).toBeVisible();

    console.log('Docker status displays correctly');
  });

  test('Tooltip icons are present on sections', async ({ page }) => {
    await page.goto('http://localhost:5173/web/infrastructure?subtab=docker');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for tooltip icons (? elements with class help-icon)
    const tooltipIcons = page.locator('.help-icon');
    const count = await tooltipIcons.count();

    // Should have at least 4 tooltip icons (for section headers)
    expect(count).toBeGreaterThanOrEqual(4);
    console.log(`Found ${count} tooltip icons`);
  });

  test('Infrastructure service cards display', async ({ page }) => {
    await page.goto('http://localhost:5173/web/infrastructure?subtab=docker');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for known infrastructure services (use div specifically to avoid tooltip conflicts)
    await expect(page.locator('div:has-text("Qdrant")').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('div:has-text("Redis")').first()).toBeVisible();
    await expect(page.locator('div:has-text("Prometheus")').first()).toBeVisible();
    await expect(page.locator('div:has-text("Grafana")').first()).toBeVisible();

    // Check for START/STOP ALL buttons (text includes unicode symbols ▶ and ⏹)
    await expect(page.locator('text=START ALL INFRASTRUCTURE').nth(0)).toBeVisible();
    await expect(page.locator('text=STOP ALL INFRASTRUCTURE').nth(0)).toBeVisible();

    console.log('Infrastructure service cards display correctly');
  });
});
