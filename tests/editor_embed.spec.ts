import { test, expect } from '@playwright/test';

test.describe('Editor embed (DevTools → Editor)', () => {
  test('panel present; buttons visible; iframe gated in CI', async ({ page, request }) => {
    // Health endpoint should respond
    const r = await request.get('http://127.0.0.1:8012/health/editor');
    expect(r.ok()).toBeTruthy();

    await page.goto('/gui/');
    await page.locator('.tab-bar button[data-tab="vscode"]').first().click();
    await expect(page.locator('#tab-vscode')).toBeVisible();

    await expect(page.locator('#editor-health-badge')).toBeVisible();
    await expect(page.locator('#btn-editor-open-window')).toBeVisible();
    await expect(page.locator('#btn-editor-copy-url')).toBeVisible();

    const wrap = page.locator('#editor-iframe-container');
    expect(await wrap.count()).toBeGreaterThan(0);
    // In CI the embed may be disabled; just assert iframe element exists
    expect(await page.locator('#editor-iframe').count()).toBeGreaterThan(0);
  });

  test('health check includes readiness stages', async ({ request }) => {
    // Verify enhanced health check response includes readiness_stage
    const r = await request.get('http://127.0.0.1:8012/health/editor');
    expect(r.ok()).toBeTruthy();
    const data = await r.json();

    // Response should include readiness_stage for debugging
    if (data.ok) {
      expect(data.readiness_stage).toMatch(/ready|startup_delay|timeout|connection_failed/);
    }
  });

  test('settings persistence API available', async ({ request }) => {
    // Verify new settings endpoints exist
    const getResp = await request.get('http://127.0.0.1:8012/api/editor/settings');
    expect(getResp.ok()).toBeTruthy();
    const settings = await getResp.json();

    // Should have default values
    expect(settings.ok).toBeTruthy();
    expect(settings.port).toBe(4440);
    expect(typeof settings.enabled).toBe('boolean');
  });

  test('onboarding state persistence API available', async ({ request }) => {
    // Verify new onboarding endpoints exist
    const stateResp = await request.get('http://127.0.0.1:8012/api/onboarding/state');
    expect(stateResp.ok()).toBeTruthy();
    const state = await stateResp.json();

    // Should return state object
    expect(state.ok).toBeTruthy();
    expect(typeof state.completed).toBe('boolean');
  });
});
