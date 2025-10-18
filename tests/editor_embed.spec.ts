import { test, expect } from '@playwright/test';

test.describe('Editor embed (DevTools → Editor)', () => {
  test('panel present; buttons visible; iframe gated in CI', async ({ page, request }) => {
    // Health endpoint should respond
    const r = await request.get('http://127.0.0.1:8012/health/editor');
    expect(r.ok()).toBeTruthy();

    await page.goto('/gui/');
    await page.locator('.tab-bar button[data-tab="devtools"]').first().click();
    await expect(page.locator('#tab-devtools-editor')).toBeVisible();

    await expect(page.locator('#editor-health-badge')).toBeVisible();
    await expect(page.locator('#btn-editor-open-window')).toBeVisible();
    await expect(page.locator('#btn-editor-copy-url')).toBeVisible();

    const wrap = page.locator('#editor-iframe-container');
    expect(await wrap.count()).toBeGreaterThan(0);
    // In CI the embed may be disabled; just assert iframe element exists
    expect(await page.locator('#editor-iframe').count()).toBeGreaterThan(0);
  });
});
