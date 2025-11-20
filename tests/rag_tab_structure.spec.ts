import { test, expect } from '@playwright/test';

test.describe('RAG Tab HTML Structure', () => {
  test('RAG tab has correct wrapper div with id and className', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Check that the wrapper div exists with correct id and className
    const ragTabWrapper = page.locator('#tab-rag.tab-content');
    await expect(ragTabWrapper).toBeVisible();
  });

  test('All 6 RAG subtab containers exist with proper IDs', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    const subtabIds = [
      'tab-rag-data-quality',
      'tab-rag-retrieval',
      'tab-rag-external-rerankers',
      'tab-rag-learning-ranker',
      'tab-rag-indexing',
      'tab-rag-evaluate',
    ];

    for (const subtabId of subtabIds) {
      const subtabDiv = page.locator(`#${subtabId}.rag-subtab-content`);
      await expect(subtabDiv).toBeInTheDocument();
    }
  });

  test('Active subtab has active class, inactive ones do not', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Click on RAG tab first (if not already active)
    const ragTabButton = page.locator('[data-tab="rag"]');
    if (ragTabButton.isVisible()) {
      await ragTabButton.click();
    }

    // data-quality should be active by default
    const activeSubtab = page.locator('#tab-rag-data-quality.rag-subtab-content.active');
    await expect(activeSubtab).toBeVisible();

    // Other subtabs should not have active class
    const retrievalSubtab = page.locator('#tab-rag-retrieval.rag-subtab-content:not(.active)');
    const inactiveCount = await page.locator('#tab-rag-retrieval.rag-subtab-content').evaluate((el) => {
      return el.classList.contains('active') ? 0 : 1;
    });
    expect(inactiveCount).toBe(1);
  });

  test('RAG subtab navigation updates active class correctly', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Click on RAG tab if needed
    const ragTabButton = page.locator('[data-tab="rag"]');
    if (ragTabButton.isVisible()) {
      await ragTabButton.click();
    }

    // Click on a different subtab (e.g., Retrieval)
    const retrievalSubtabBtn = page.locator('.subtab-bar button', { hasText: /Retrieval|retrieval/ }).first();
    if (await retrievalSubtabBtn.isVisible()) {
      await retrievalSubtabBtn.click();
      await page.waitForTimeout(100);

      // Verify data-quality is no longer active
      const dataQualityDiv = page.locator('#tab-rag-data-quality.rag-subtab-content');
      const hasActiveClass = await dataQualityDiv.evaluate((el) => {
        return el.classList.contains('active');
      });
      expect(hasActiveClass).toBe(false);

      // Verify retrieval is now active
      const retrievalDiv = page.locator('#tab-rag-retrieval.rag-subtab-content');
      const isActive = await retrievalDiv.evaluate((el) => {
        return el.classList.contains('active');
      });
      expect(isActive).toBe(true);
    }
  });
});
