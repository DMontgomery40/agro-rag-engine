import { test, expect } from '@playwright/test';

test.describe('Reranker Info Panel', () => {
  const BASE_URL = 'http://127.0.0.1:8012/gui/index.html';

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('Learning Ranker shows current local CrossEncoder and L-12 defaults', async ({ page }) => {
    // Go to RAG tab
    await page.locator('[data-tab="rag"]').click();
    // Select Learning Ranker subtab
    const subtab = page.locator('[data-subtab="learning-ranker"]');
    await subtab.click();

    // Info panel appears in Learning Ranker
    const panel = page.locator('#reranker-info-panel');
    await expect(panel).toBeVisible();

    // Path is non-empty (server reports current model path)
    const pathText = await page.locator('#reranker-info-path').innerText();
    expect(pathText.trim().length).toBeGreaterThan(0);

    // Local CrossEncoder path placeholder shows new default
    const pathInput = page.locator('input[name="AGRO_RERANKER_MODEL_PATH"]');
    await expect(pathInput).toHaveAttribute('placeholder', 'cross-encoder/ms-marco-MiniLM-L-12-v2');
  });
});
