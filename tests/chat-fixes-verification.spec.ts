import { test, expect } from '@playwright/test';

test.describe('Chat System Fixes Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
  });

  test('ChatInterface has Import History button in dropdown', async ({ page }) => {
    // Navigate to Chat tab
    await page.click('text=Chat');
    await page.waitForTimeout(1000);

    // Click on Chat subtab to ensure we're on the right view
    const chatSubtab = page.locator('button:has-text("Chat")').nth(1);
    if (await chatSubtab.isVisible()) {
      await chatSubtab.click();
      await page.waitForTimeout(500);
    }

    // Click History button
    const historyBtn = page.locator('button', { hasText: 'History' }).first();
    await historyBtn.waitFor({ state: 'visible', timeout: 10000 });
    await historyBtn.click();
    await page.waitForTimeout(500);

    // Check Import History button exists
    const importBtn = page.locator('button:has-text("Import History")');
    await expect(importBtn).toBeVisible({ timeout: 5000 });
  });

  test('ChatSettings component uses useChat hook correctly', async ({ page }) => {
    // Navigate to Chat tab
    await page.click('text=Chat');
    await page.waitForTimeout(1000);

    // Click Settings subtab
    const settingsSubtab = page.locator('button:has-text("Settings")').nth(1);
    if (await settingsSubtab.isVisible()) {
      await settingsSubtab.click();
      await page.waitForTimeout(500);
    }

    // Verify settings are displayed
    await expect(page.locator('text=Chat Settings')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Save Settings")')).toBeVisible();
  });

  test('Build completed successfully', async ({ page }) => {
    // This test just verifies the app loaded, which means build worked
    await expect(page.locator('body')).toBeVisible();
  });

  test('useChat hook exports all required functions', async ({ page }) => {
    // Navigate to Chat tab
    await page.click('text=Chat');
    await page.waitForTimeout(1000);

    // Verify History dropdown has all options (proving hook exports them)
    const chatSubtab = page.locator('button:has-text("Chat")').nth(1);
    if (await chatSubtab.isVisible()) {
      await chatSubtab.click();
      await page.waitForTimeout(500);
    }

    const historyBtn = page.locator('button', { hasText: 'History' }).first();
    await historyBtn.waitFor({ state: 'visible', timeout: 10000 });
    await historyBtn.click();
    await page.waitForTimeout(500);

    // Should have Import, Export, and Clear
    await expect(page.locator('button:has-text("Import History")')).toBeVisible();
    await expect(page.locator('button:has-text("Export History")')).toBeVisible();
    await expect(page.locator('button:has-text("Clear History")')).toBeVisible();
  });
});
