import { test, expect } from '@playwright/test';

test('RAG subtabs bar is visible below top tab bar', async ({ page }) => {
  await page.goto('/gui/');
  await page.waitForLoadState('domcontentloaded');

  // Click RAG tab
  const ragBtn = page.locator('.tab-bar button[data-tab="rag"]');
  await expect(ragBtn).toBeVisible();
  await ragBtn.click();

  const topbar = page.locator('.topbar');
  const tabbar = page.locator('.tab-bar');
  const subtabs = page.locator('#rag-subtabs');

  await expect(topbar).toBeVisible();
  await expect(tabbar).toBeVisible();
  await expect(subtabs).toBeVisible();

  const topbarBox = await topbar.boundingBox();
  const tabbarBox = await tabbar.boundingBox();
  const subtabsBox = await subtabs.boundingBox();

  // Sanity: topbar should be at y ~0
  expect(topbarBox && topbarBox.y).toBeGreaterThanOrEqual(0);

  // Subtabs should be below the tab bar, within a reasonable offset
  // Guard against being dropped deep in the page (e.g., > 300px below)
  if (tabbarBox && subtabsBox) {
    const delta = subtabsBox.y - (tabbarBox.y + tabbarBox.height);
    expect(delta).toBeGreaterThanOrEqual(-2); // sticky overlaps may be slightly negative
    expect(subtabsBox.y).toBeLessThan(300);   // should be near the top of the viewport
  }

  await page.screenshot({ path: 'test-results/rag-subtabs-placement.png' });
});

