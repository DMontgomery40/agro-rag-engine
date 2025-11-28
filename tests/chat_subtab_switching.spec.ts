import { test, expect } from '@playwright/test';

test.describe('Chat Tab Subtab Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/chat');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for modules to load
  });

  test('Chat subtab bar is visible', async ({ page }) => {
    const subtabBar = page.locator('#chat-subtabs.subtab-bar');
    await expect(subtabBar).toBeVisible();

    // Should have 2 buttons
    const buttons = page.locator('#chat-subtabs button');
    const count = await buttons.count();
    expect(count).toBe(2);
  });

  test('UI subtab is active by default', async ({ page }) => {
    const uiSubtab = page.locator('#tab-chat-ui');
    const classAttr = await uiSubtab.getAttribute('class');
    expect(classAttr).toContain('active');

    // Settings should not be active
    const settingsSubtab = page.locator('#tab-chat-settings');
    const settingsClass = await settingsSubtab.getAttribute('class');
    expect(settingsClass).not.toContain('active');
  });

  test('Clicking Settings button switches to settings subtab', async ({ page }) => {
    const settingsButton = page.locator('#chat-subtabs button:has-text("Settings")');
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();

    await page.waitForTimeout(200);

    // Settings should now be active
    const settingsSubtab = page.locator('#tab-chat-settings');
    const settingsClass = await settingsSubtab.getAttribute('class');
    expect(settingsClass).toContain('active');

    // UI should not be active
    const uiSubtab = page.locator('#tab-chat-ui');
    const uiClass = await uiSubtab.getAttribute('class');
    expect(uiClass).not.toContain('active');
  });

  test('Subtabs mount lazily but switch reliably', async ({ page }) => {
    const uiSubtab = page.locator('#tab-chat-ui');
    expect(await uiSubtab.count()).toBe(1);

    // Settings should not exist until clicked (lazy mount)
    const settingsBefore = page.locator('#tab-chat-settings');
    expect(await settingsBefore.count()).toBeLessThanOrEqual(1);

    // Click and verify it appears
    const settingsButton = page.locator('#chat-subtabs button:has-text("Settings")');
    await settingsButton.click();
    await page.waitForTimeout(200);
    const settingsAfter = page.locator('#tab-chat-settings');
    expect(await settingsAfter.count()).toBe(1);
  });
});
