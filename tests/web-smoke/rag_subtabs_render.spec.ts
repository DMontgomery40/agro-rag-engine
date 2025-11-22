import { test, expect } from '@playwright/test';

test.describe('RAG Subtabs Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');

    // Wait for app to load
    await page.waitForSelector('#root', { timeout: 10000 });

    // Navigate to RAG Settings
    await page.click('text=RAG Settings');
    await page.waitForSelector('.tab-header', { timeout: 5000 });
  });

  test('All RAG subtabs should render without errors', async ({ page }) => {
    const subtabs = [
      { name: 'Retrieval', selector: '#tab-rag-retrieval' },
      { name: 'Indexing', selector: '#tab-rag-indexing' },
      { name: 'Data Quality', selector: '#tab-rag-data-quality' },
      { name: 'External Rerankers', selector: '#tab-rag-ext-rerankers' },
      { name: 'Learning Reranker', selector: '#tab-rag-learning-reranker' },
      { name: 'Evaluate', selector: '#tab-rag-evaluate' }
    ];

    for (const subtab of subtabs) {
      console.log(`Testing ${subtab.name} subtab...`);

      // Click on the subtab
      await page.click(`text=${subtab.name}`);

      // Wait for subtab content to render
      await page.waitForTimeout(500);

      // Check that the subtab content is visible
      const content = await page.locator('.rag-subtab-content').first();

      // Verify no double-wrapping (should only be one rag-subtab-content)
      const contentCount = await page.locator('.rag-subtab-content').count();
      expect(contentCount).toBeLessThanOrEqual(1);

      // Check for any error messages
      const errorElements = await page.locator('text=/error|failed/i').count();
      if (errorElements > 0) {
        const errors = await page.locator('text=/error|failed/i').allTextContents();
        console.log(`Found potential errors in ${subtab.name}:`, errors);
      }

      // Verify some content is rendered
      const hasContent = await content.isVisible().catch(() => false);
      console.log(`${subtab.name} has visible content: ${hasContent}`);

      // Check for key elements based on subtab
      if (subtab.name === 'Retrieval') {
        await expect(page.locator('text=Generation Models')).toBeVisible({ timeout: 5000 });
      } else if (subtab.name === 'Indexing') {
        await expect(page.locator('text=Current Repo:')).toBeVisible({ timeout: 5000 });
      } else if (subtab.name === 'Data Quality') {
        await expect(page.locator('text=/Exclude Keywords|Embedding Model/i').first()).toBeVisible({ timeout: 5000 });
      } else if (subtab.name === 'External Rerankers') {
        await expect(page.locator('text=Rerank Backend')).toBeVisible({ timeout: 5000 });
      } else if (subtab.name === 'Learning Reranker') {
        await expect(page.locator('text=/Training|Baseline/i').first()).toBeVisible({ timeout: 5000 });
      } else if (subtab.name === 'Evaluate') {
        await expect(page.locator('text=Golden Questions')).toBeVisible({ timeout: 5000 });
      }

      console.log(`✓ ${subtab.name} subtab renders correctly`);
    }
  });
});