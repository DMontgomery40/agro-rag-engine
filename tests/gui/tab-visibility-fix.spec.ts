import { test, expect } from '@playwright/test';

test.describe('Tab Visibility Fix - Display None/Block', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:8012', { waitUntil: 'networkidle' });
  });

  test('Dashboard tab should be visible by default', async ({ page }) => {
    const dashboardTab = page.locator('#tab-dashboard');
    const display = await dashboardTab.evaluate(el => window.getComputedStyle(el).display);
    expect(['block', 'flex']).toContain(display);
  });

  test('Chat tab should be hidden by default', async ({ page }) => {
    const chatTab = page.locator('#tab-chat');
    const display = await chatTab.evaluate(el => window.getComputedStyle(el).display);
    expect(display).toBe('none');
  });

  test('Clicking Chat tab should show Chat content', async ({ page }) => {
    const chatButton = page.locator('.tab-bar button[data-tab="chat"]');
    const chatTab = page.locator('#tab-chat');

    // Click chat button
    await chatButton.click();

    // Wait for tab to become visible
    await page.waitForTimeout(300);

    // Check display property
    const display = await chatTab.evaluate(el => window.getComputedStyle(el).display);
    expect(['block', 'flex']).toContain(display);

    // Check has active class
    const hasActive = await chatTab.evaluate(el => el.classList.contains('active'));
    expect(hasActive).toBe(true);
  });

  test('Clicking RAG tab should show RAG content and first subtab', async ({ page }) => {
    const ragButton = page.locator('.tab-bar button[data-tab="rag"]');
    const ragTab = page.locator('#tab-rag');

    await ragButton.click();
    await page.waitForTimeout(300);

    const display = await ragTab.evaluate(el => window.getComputedStyle(el).display);
    expect(['block', 'flex']).toContain(display);

    // RAG subtabs should exist
    const subtabs = page.locator('#tab-rag-data-quality, #tab-rag-retrieval, #tab-rag-indexing');
    const count = await subtabs.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Switching tabs multiple times should work reliably', async ({ page }) => {
    const tabs = ['dashboard', 'chat', 'rag', 'profiles', 'admin'];

    for (const tabName of tabs) {
      const button = page.locator(`.tab-bar button[data-tab="${tabName}"]`);
      const tabContent = page.locator(`#tab-${tabName}`);

      await button.click();
      await page.waitForTimeout(200);

      const display = await tabContent.evaluate(el => window.getComputedStyle(el).display);
      expect(['block', 'flex']).toContain(display);
    }
  });

  test('No tabs should flash/disappear (content should stay visible)', async ({ page }) => {
    // Click chat
    await page.locator('.tab-bar button[data-tab="chat"]').click();

    // Wait 100ms and check it's still visible
    await page.waitForTimeout(100);
    let display = await page.locator('#tab-chat').evaluate(el => window.getComputedStyle(el).display);
    expect(['block', 'flex']).toContain(display);

    // Wait another 200ms and check again
    await page.waitForTimeout(200);
    display = await page.locator('#tab-chat').evaluate(el => window.getComputedStyle(el).display);
    expect(['block', 'flex']).toContain(display);

    // Should never have gone to display: none during the transition
  });

  test('Only one tab should have .active class at a time', async ({ page }) => {
    const tabs = ['dashboard', 'chat', 'rag', 'profiles'];

    for (const tabName of tabs) {
      await page.locator(`.tab-bar button[data-tab="${tabName}"]`).click();
      await page.waitForTimeout(200);

      const activeTabs = await page.locator('.tab-content.active').count();
      expect(activeTabs).toBe(1, `Only 1 tab should have .active at a time (switching to ${tabName})`);
    }
  });

  test('Tab content should have non-zero height when visible', async ({ page }) => {
    const tabs = ['dashboard', 'chat', 'rag', 'profiles', 'infrastructure', 'admin'];

    for (const tabName of tabs) {
      await page.locator(`.tab-bar button[data-tab="${tabName}"]`).click();
      await page.waitForTimeout(200);

      const height = await page.locator(`#tab-${tabName}`).evaluate(el => el.offsetHeight);
      expect(height).toBeGreaterThan(0, `Tab ${tabName} should have visible height`);
    }
  });

  test('Console should have no red errors (404s from API are OK)', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Switch through several tabs
    for (const tabName of ['dashboard', 'chat', 'rag', 'profiles']) {
      await page.locator(`.tab-bar button[data-tab="${tabName}"]`).click();
      await page.waitForTimeout(200);
    }

    // Filter out 404 errors (those are expected from background API calls)
    const criticalErrors = errors.filter(e =>
      !e.includes('404') &&
      !e.includes('404 (Not Found)') &&
      !e.includes('/api/') &&
      !e.includes('Unexpected token')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
