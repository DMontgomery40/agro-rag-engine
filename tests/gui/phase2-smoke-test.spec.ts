import { test, expect } from '@playwright/test';

test.describe('Phase 2: Content Consolidation Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8012');
    await page.waitForLoadState('networkidle');
  });

  test('All 9 main tab buttons exist', async ({ page }) => {
    const tabNames = ['start', 'dashboard', 'chat', 'vscode', 'grafana', 'rag', 'profiles', 'infrastructure', 'admin'];

    for (const tab of tabNames) {
      const button = page.locator(`.tab-bar button[data-tab="${tab}"]`);
      await expect(button).toBeVisible();
    }
  });

  test('Tab switching works without errors', async ({ page }) => {
    const tabNames = ['dashboard', 'chat', 'vscode', 'grafana', 'rag', 'profiles', 'infrastructure', 'admin'];

    for (const tab of tabNames) {
      const button = page.locator(`.tab-bar button[data-tab="${tab}"]`);
      await button.click();
      await page.waitForTimeout(100);

      // Check that the button is now active
      await expect(button).toHaveClass(/active/);

      // Check that content exists and is visible
      const content = page.locator(`#tab-${tab}`);
      await expect(content).toHaveClass(/active/);
    }
  });

  test('RAG subtabs show when RAG tab is active', async ({ page }) => {
    const ragButton = page.locator('.tab-bar button[data-tab="rag"]');
    await ragButton.click();

    // RAG subtabs bar should be visible
    const ragSubtabs = page.locator('#rag-subtabs');
    await expect(ragSubtabs).toBeVisible();

    // Should have 6 subtab buttons
    const subtabButtons = page.locator('#rag-subtabs button');
    expect(await subtabButtons.count()).toBe(6);
  });

  test('RAG subtab switching works', async ({ page }) => {
    const ragButton = page.locator('.tab-bar button[data-tab="rag"]');
    await ragButton.click();

    const subtabIds = ['data-quality', 'retrieval', 'external-rerankers', 'learning-ranker', 'indexing', 'evaluate'];

    for (const subtabId of subtabIds) {
      const subtabButton = page.locator(`#rag-subtabs button[data-subtab="${subtabId}"]`);
      await subtabButton.click();

      // Check that the subtab button is active
      await expect(subtabButton).toHaveClass(/active/);

      // Check that the content is visible
      const content = page.locator(`#tab-rag-${subtabId}`);
      await expect(content).toHaveClass(/active/);
    }
  });

  test('Tab content does not have excessive blank space', async ({ page }) => {
    const tabNames = ['dashboard', 'chat', 'rag', 'profiles', 'infrastructure', 'admin'];

    for (const tab of tabNames) {
      const button = page.locator(`.tab-bar button[data-tab="${tab}"]`);
      await button.click();
      await page.waitForTimeout(100);

      const content = page.locator(`#tab-${tab}`);
      const boundingBox = await content.boundingBox();

      if (boundingBox) {
        // Content should have reasonable height (not collapsed)
        expect(boundingBox.height).toBeGreaterThan(50);
      }
    }
  });

  test('Sticky tab bar works when scrolling', async ({ page }) => {
    const tabBar = page.locator('.tab-bar');
    const initialPosition = await tabBar.boundingBox();

    // Click a tab with content that can scroll
    const dashboardButton = page.locator('.tab-bar button[data-tab="dashboard"]');
    await dashboardButton.click();

    // Scroll down
    await page.evaluate(() => {
      const content = document.querySelector('.content');
      if (content) {
        content.scrollTop = 500;
      }
    });

    // Tab bar should still be visible in roughly the same position
    const afterScroll = await tabBar.boundingBox();
    if (initialPosition && afterScroll) {
      expect(Math.abs(afterScroll.y - initialPosition.y)).toBeLessThan(10);
    }
  });

  test('No console errors on tab switches', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    const tabNames = ['dashboard', 'chat', 'rag', 'profiles', 'infrastructure', 'admin'];

    for (const tab of tabNames) {
      const button = page.locator(`.tab-bar button[data-tab="${tab}"]`);
      await button.click();
      await page.waitForTimeout(100);
    }

    expect(errors.length).toBe(0);
  });

  test('Sidepanel is visible on desktop', async ({ page }) => {
    const sidepanel = page.locator('.sidepanel');
    const boundingBox = await sidepanel.boundingBox();

    // Sidepanel should exist and be visible
    expect(boundingBox).toBeTruthy();
    if (boundingBox) {
      expect(boundingBox.width).toBeGreaterThan(0);
      expect(boundingBox.height).toBeGreaterThan(0);
    }
  });
});
