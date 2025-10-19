import { test, expect } from '@playwright/test';

/**
 * Test: Tooltip hover/click functionality
 * Verifies that tooltips stay visible when hovering over them to click links
 * This is critical for accessibility - users with dyslexia need time to read and click
 */
test.describe('Tooltip Hover and Click Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the GUI
    await page.goto('http://127.0.0.1:8012');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Navigate to RAG tab (use :visible to get the desktop tab, not mobile)
    const ragTab = page.locator('.tab-bar button[data-tab="rag"]:visible').first();
    await ragTab.click();
    await page.waitForTimeout(1000);

    // Navigate to Retrieval subtab which has tooltips
    const retrievalSubtab = page.locator('button[data-subtab="retrieval"]:visible').first();
    await retrievalSubtab.click();
    await page.waitForTimeout(500);
  });

  test('tooltip appears on help icon hover', async ({ page }) => {
    // Find a help icon (using QDRANT_URL as test case)
    const helpIcon = page.locator('label:has-text("Qdrant URL") .help-icon').first();

    // Hover over help icon
    await helpIcon.hover();

    // Wait a bit for tooltip to appear
    await page.waitForTimeout(200);

    // Check tooltip is visible
    const tooltip = page.locator('.tooltip-bubble.tooltip-visible').first();
    await expect(tooltip).toBeVisible();

    // Verify tooltip content
    await expect(tooltip).toContainText('Qdrant URL');
  });

  test('tooltip stays visible when hovering over tooltip content', async ({ page }) => {
    // Find a help icon
    const helpIcon = page.locator('label:has-text("Qdrant URL") .help-icon').first();

    // Hover over help icon to show tooltip
    await helpIcon.hover();
    await page.waitForTimeout(200);

    // Get tooltip element
    const tooltip = page.locator('.tooltip-bubble.tooltip-visible').first();
    await expect(tooltip).toBeVisible();

    // Move mouse to tooltip content (this is the critical test!)
    await tooltip.hover();

    // Wait to ensure 150ms delay doesn't hide it
    await page.waitForTimeout(300);

    // Tooltip should STILL be visible
    await expect(tooltip).toBeVisible();
  });

  test('tooltip link is clickable', async ({ page }) => {
    // Find a tooltip with links (QDRANT_URL has Qdrant docs link)
    const helpIcon = page.locator('label:has-text("Qdrant URL") .help-icon').first();

    // Hover to show tooltip
    await helpIcon.hover();
    await page.waitForTimeout(200);

    const tooltip = page.locator('.tooltip-bubble.tooltip-visible').first();
    await expect(tooltip).toBeVisible();

    // Move to tooltip
    await tooltip.hover();
    await page.waitForTimeout(100);

    // Find link in tooltip
    const link = tooltip.locator('a').first();
    await expect(link).toBeVisible();

    // Verify link has correct attributes
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener');

    // Verify link is clickable (don't actually click to avoid navigation)
    const href = await link.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).toContain('qdrant.tech');
  });

  test('tooltip hides when clicking outside', async ({ page }) => {
    // Show tooltip
    const helpIcon = page.locator('label:has-text("Qdrant URL") .help-icon').first();
    await helpIcon.hover();
    await page.waitForTimeout(200);

    const tooltip = page.locator('.tooltip-bubble.tooltip-visible').first();
    await expect(tooltip).toBeVisible();

    // Click somewhere else on page
    await page.click('body', { position: { x: 10, y: 10 } });

    // Tooltip should be hidden
    await expect(tooltip).not.toBeVisible();
  });

  test('tooltip stays visible on click and hides on subsequent outside click', async ({ page }) => {
    // Find help icon
    const helpIcon = page.locator('label:has-text("Qdrant URL") .help-icon').first();

    // Click to toggle tooltip
    await helpIcon.click();
    await page.waitForTimeout(200);

    const tooltip = page.locator('.tooltip-bubble.tooltip-visible').first();
    await expect(tooltip).toBeVisible();

    // Move mouse away - tooltip should stay visible (it was clicked, not just hovered)
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);

    // Tooltip still visible after mouse moved away
    await expect(tooltip).toBeVisible();

    // Click outside to close
    await page.click('body', { position: { x: 10, y: 10 } });
    await expect(tooltip).not.toBeVisible();
  });

  test('multiple tooltips can be shown by clicking different help icons', async ({ page }) => {
    // Click first help icon
    const helpIcon1 = page.locator('label:has-text("Qdrant URL") .help-icon').first();
    await helpIcon1.click();
    await page.waitForTimeout(200);

    const tooltip1 = page.locator('.tooltip-bubble.tooltip-visible').first();
    await expect(tooltip1).toBeVisible();

    // Click another help icon
    const helpIcon2 = page.locator('label:has-text("Redis URL") .help-icon').first();
    await helpIcon2.click();
    await page.waitForTimeout(200);

    // Second tooltip should be visible
    const tooltip2 = page.locator('.tooltip-bubble.tooltip-visible').nth(1);
    await expect(tooltip2).toBeVisible();

    // First tooltip should be hidden (clicked outside)
    await expect(tooltip1).not.toBeVisible();
  });

  test('tooltip has proper accessibility attributes', async ({ page }) => {
    const helpIcon = page.locator('label:has-text("Qdrant URL") .help-icon').first();

    // Check help icon has tabindex (keyboard accessible)
    await expect(helpIcon).toHaveAttribute('tabindex', '0');

    // Check help icon has aria-label
    const ariaLabel = await helpIcon.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel).toContain('Help');

    // Hover to show tooltip
    await helpIcon.hover();
    await page.waitForTimeout(200);

    const tooltip = page.locator('.tooltip-bubble.tooltip-visible').first();

    // Check tooltip has role
    await expect(tooltip).toHaveAttribute('role', 'tooltip');
  });

  test('tooltip keyboard navigation works', async ({ page }) => {
    // Tab to help icon
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Keep tabbing until we find a help icon
    let attempts = 0;
    while (attempts < 50) {
      const focused = await page.evaluate(() => document.activeElement?.className);
      if (focused?.includes('help-icon')) {
        break;
      }
      await page.keyboard.press('Tab');
      attempts++;
    }

    // Verify we found a help icon
    expect(attempts).toBeLessThan(50);

    // Wait for tooltip to appear on focus
    await page.waitForTimeout(200);

    // Tooltip should be visible
    const tooltip = page.locator('.tooltip-bubble.tooltip-visible').first();
    await expect(tooltip).toBeVisible();

    // Tab away
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);

    // Tooltip should hide on blur
    await expect(tooltip).not.toBeVisible();
  });
});
