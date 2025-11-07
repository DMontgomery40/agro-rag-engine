// Playwright Test - React Router Navigation
// Verifies that navigation system has been successfully converted from DOM manipulation to React Router

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3002';

test.describe('React Router Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Wait for React to hydrate
    await page.waitForSelector('.tab-bar', { timeout: 10000 });
  });

  test('should render tab bar with all navigation items', async ({ page }) => {
    const tabBar = page.locator('.tab-bar');
    await expect(tabBar).toBeVisible();

    // Check for key tabs
    await expect(tabBar.locator('text=Dashboard')).toBeVisible();
    await expect(tabBar.locator('text=Chat')).toBeVisible();
    await expect(tabBar.locator('text=VS Code')).toBeVisible();
    await expect(tabBar.locator('text=RAG')).toBeVisible();
    await expect(tabBar.locator('text=Admin')).toBeVisible();
  });

  test('should navigate to dashboard by default', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);

    // Check that Dashboard tab is active
    const dashboardLink = page.locator('.tab-bar a[href="/dashboard"]');
    await expect(dashboardLink).toHaveClass(/active/);
  });

  test('should navigate between tabs using React Router', async ({ page }) => {
    // Navigate to Chat tab
    await page.click('.tab-bar a[href="/chat"]');
    await expect(page).toHaveURL(/\/chat/);
    await expect(page.locator('.tab-bar a[href="/chat"]')).toHaveClass(/active/);

    // Navigate to RAG tab
    await page.click('.tab-bar a[href="/rag"]');
    await expect(page).toHaveURL(/\/rag/);
    await expect(page.locator('.tab-bar a[href="/rag"]')).toHaveClass(/active/);

    // Navigate to Admin tab
    await page.click('.tab-bar a[href="/admin"]');
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('.tab-bar a[href="/admin"]')).toHaveClass(/active/);
  });

  test('should support browser back/forward navigation', async ({ page }) => {
    // Navigate through tabs
    await page.click('.tab-bar a[href="/chat"]');
    await expect(page).toHaveURL(/\/chat/);

    await page.click('.tab-bar a[href="/rag"]');
    await expect(page).toHaveURL(/\/rag/);

    // Use browser back button
    await page.goBack();
    await expect(page).toHaveURL(/\/chat/);
    await expect(page.locator('.tab-bar a[href="/chat"]')).toHaveClass(/active/);

    // Use browser forward button
    await page.goForward();
    await expect(page).toHaveURL(/\/rag/);
    await expect(page.locator('.tab-bar a[href="/rag"]')).toHaveClass(/active/);
  });

  test('should display RAG subtabs when on RAG tab', async ({ page }) => {
    await page.click('.tab-bar a[href="/rag"]');
    await expect(page).toHaveURL(/\/rag/);

    // Check for RAG subtabs
    const ragSubtabs = page.locator('#rag-subtabs');
    await expect(ragSubtabs).toBeVisible();

    // Verify subtab buttons exist
    await expect(ragSubtabs.locator('button[data-subtab="data-quality"]')).toBeVisible();
    await expect(ragSubtabs.locator('button[data-subtab="retrieval"]')).toBeVisible();
    await expect(ragSubtabs.locator('button[data-subtab="learning-ranker"]')).toBeVisible();
    await expect(ragSubtabs.locator('button[data-subtab="indexing"]')).toBeVisible();
  });

  test('should persist navigation state in localStorage', async ({ page }) => {
    // Navigate to a specific tab
    await page.click('.tab-bar a[href="/infrastructure"]');
    await expect(page).toHaveURL(/\/infrastructure/);

    // Check localStorage
    const savedTab = await page.evaluate(() => localStorage.getItem('nav_current_tab'));
    expect(savedTab).toBe('infrastructure');
  });

  test('should NOT use legacy navigation.js or tabs.js', async ({ page }) => {
    // Verify that legacy navigation functions are not being called
    const logs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      logs.push(text);
    });

    await page.click('.tab-bar a[href="/chat"]');
    await page.waitForTimeout(500);

    // Check that legacy navigation logs are not present
    const hasLegacyNavLog = logs.some(log =>
      log.includes('[tabs.js] switchTab called') ||
      log.includes('[navigation.js] updateDOMCompatibility')
    );

    expect(hasLegacyNavLog).toBe(false);
  });

  test('should render tab content for each route', async ({ page }) => {
    const tabs = [
      { path: '/dashboard', expectedContent: '.tab-content' },
      { path: '/chat', expectedContent: '.tab-content' },
      { path: '/rag', expectedContent: '.tab-content' },
      { path: '/admin', expectedContent: '.tab-content' }
    ];

    for (const tab of tabs) {
      await page.goto(`${BASE_URL}${tab.path}`);
      await expect(page.locator(tab.expectedContent)).toBeVisible();
    }
  });
});
