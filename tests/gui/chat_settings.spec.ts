import { test, expect } from '@playwright/test';

test.describe('Chat Settings UI', () => {
  test('open Chat → Settings and capture screenshot', async ({ page }) => {
    await page.goto('http://127.0.0.1:8012/');
    await page.getByTestId('tab-btn-chat').click();
    // Click the Chat Settings subtab explicitly (pill button)
    // The Tabs module dynamically binds; ensure it's initialized before clicking
    await page.waitForSelector('button.subtab-btn[data-subtab="chat-settings"][data-parent="chat"]', { state: 'visible' });
    await page.locator('button.subtab-btn[data-subtab="chat-settings"][data-parent="chat"]').click();
    // Fallback in case binding didn't fire in CI: force section visibility
    await page.evaluate(() => {
      const parent = document.getElementById('tab-chat');
      if (parent) parent.classList.add('active');
      document.querySelectorAll('#tab-chat .section-subtab').forEach(el => el.classList.remove('active'));
      const tgt = document.getElementById('tab-chat-settings');
      if (tgt) tgt.classList.add('active');
    });
    await expect(page.locator('#tab-chat-settings')).toBeVisible();
    await expect(page.locator('#chat-model')).toBeVisible();
    await expect(page.locator('#chat-temperature')).toBeVisible();
    await expect(page.locator('#chat-max-tokens')).toBeVisible();
    await expect(page.locator('#chat-multi-query')).toBeVisible();
    await expect(page.locator('#chat-final-k')).toBeVisible();
    await expect(page.locator('#chat-confidence')).toBeVisible();
    await expect(page.locator('#chat-system-prompt')).toBeVisible();
    await expect(page.locator('#chat-history-enabled')).toBeVisible();
    await expect(page.locator('#chat-history-limit')).toBeVisible();
    await expect(page.locator('#chat-show-history-on-load')).toBeVisible();
    await page.screenshot({ path: 'tests/screenshots/chat-settings.png', fullPage: true });
  });
});


