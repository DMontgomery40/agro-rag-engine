import { test, expect } from '@playwright/test';

test('Learning Ranker training controls have help icons', async ({ page }) => {
  await page.goto('/gui/');
  await page.waitForLoadState('domcontentloaded');

  // Navigate to RAG → Learning Ranker if tabs are lazy; best-effort clicks
  const ragTab = page.locator(".tab-bar button[data-tab='rag']").first();
  if (await ragTab.count()) await ragTab.click().catch(()=>{});
  const lrBtn = page.locator("#rag-subtabs .subtab-btn[data-subtab='learning-ranker']").first();
  if (await lrBtn.count()) await lrBtn.click().catch(()=>{});

  // Verify help icons exist alongside training inputs (structural only)
  for (const id of ['reranker-epochs','reranker-batch','reranker-maxlen']) {
    const ig = page.locator(`#${id}`).locator('xpath=ancestor::*[@class="input-group"]');
    await expect(ig).toBeVisible();
    await expect(ig.locator('.help-icon')).toHaveCount(1);
  }
});
