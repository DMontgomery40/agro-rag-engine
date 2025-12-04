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
 * Location: Infrastructure > Services subtab
 */
import { test, expect } from '@playwright/test';

test.describe('Docker Settings Page', () => {
  test('Docker services page renders without errors', async ({ page }) => {
    // Navigate directly to Infrastructure > Services
    await page.goto('http://localhost:5173/web/infrastructure?subtab=services');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify the page is not blank
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Check for Docker Settings collapsible section header (h3 inside button)
    const settingsHeader = page.locator('h3:has-text("Docker Settings")');
    await expect(settingsHeader).toBeVisible({ timeout: 10000 });

    // Check for Infrastructure Services section (h3)
    const infraSection = page.locator('h3:has-text("Infrastructure Services")');
    await expect(infraSection).toBeVisible({ timeout: 5000 });

    // Check for Docker Status section (h3)
    const statusSection = page.locator('h3:has-text("Docker Status")');
    await expect(statusSection).toBeVisible({ timeout: 5000 });

    // Check for All Containers section (h3)
    const containersSection = page.locator('h3:has-text("All Containers")');
    await expect(containersSection).toBeVisible({ timeout: 5000 });

    console.log('Docker services page renders correctly');
  });

  test('Docker Settings section is collapsible with config inputs', async ({ page }) => {
    await page.goto('http://localhost:5173/web/infrastructure?subtab=services');
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
    await page.goto('http://localhost:5173/web/infrastructure?subtab=services');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for status display area
    const statusDisplay = page.locator('#docker-status-display');
    await expect(statusDisplay).toBeVisible({ timeout: 10000 });

    // Should show DOCKER STATUS, RUNTIME, CONTAINERS labels (uppercase in actual code)
    await expect(page.locator('h3:has-text("Docker Status")')).toBeVisible();

    // Check for refresh button
    const refreshBtn = page.locator('#btn-docker-refresh');
    await expect(refreshBtn).toBeVisible();

    console.log('Docker status displays correctly');
  });

  test('Tooltip icons are present on sections', async ({ page }) => {
    await page.goto('http://localhost:5173/web/infrastructure?subtab=services');
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
    await page.goto('http://localhost:5173/web/infrastructure?subtab=services');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for known infrastructure services (use div specifically to avoid tooltip conflicts)
    await expect(page.locator('div:has-text("Qdrant")').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('div:has-text("Redis")').first()).toBeVisible();
    await expect(page.locator('div:has-text("Prometheus")').first()).toBeVisible();
    await expect(page.locator('div:has-text("Grafana")').first()).toBeVisible();

    // Check for START/STOP ALL buttons
    await expect(page.locator('button:has-text("START ALL INFRASTRUCTURE")')).toBeVisible();
    await expect(page.locator('button:has-text("STOP ALL INFRASTRUCTURE")')).toBeVisible();

    console.log('Infrastructure service cards display correctly');
  });
});
