import { test, expect } from '@playwright/test';

test.describe('Apply All Changes Button Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give time for modules to load
  });

  test('Apply All Changes button exists and is visible', async ({ page }) => {
    // Check button exists
    const saveBtn = page.locator('#save-btn');
    await expect(saveBtn).toBeVisible({ timeout: 10000 });

    // Check button text
    const buttonText = await saveBtn.textContent();
    expect(buttonText).toContain('Apply All Changes');

    console.log('✓ Apply All Changes button is visible');
  });

  test('Apply All Changes button is at bottom of content area', async ({ page }) => {
    // Check button is in the action-buttons div
    const actionButtons = page.locator('.action-buttons');
    await expect(actionButtons).toBeVisible();

    // Check the save button is inside action-buttons
    const saveBtn = actionButtons.locator('#save-btn');
    await expect(saveBtn).toBeVisible();

    // Check it has the fixed footer styling
    const styles = await actionButtons.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        borderTop: computed.borderTop,
        padding: computed.padding,
        flexShrink: computed.flexShrink
      };
    });

    expect(styles.borderTop).toContain('1px');
    expect(styles.flexShrink).toBe('0');

    console.log('✓ Apply All Changes button is positioned at bottom');
  });
});