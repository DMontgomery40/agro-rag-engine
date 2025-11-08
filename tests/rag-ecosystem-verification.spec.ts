import { test, expect } from '@playwright/test';

const WEB_BASE = process.env.WEB_BASE || 'http://localhost:3003';

test.describe('RAG Ecosystem - Emergency Refactor Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto(WEB_BASE);
    await page.waitForLoadState('networkidle');

    // Wait for React to fully load
    await page.waitForSelector('.tab-bar', { timeout: 10000 });
  });

  test('RAG tab button exists and is clickable', async ({ page }) => {
    // Find RAG tab link (React Router NavLink)
    const ragTab = page.locator('.tab-bar a').filter({ hasText: 'RAG' });
    await expect(ragTab).toBeVisible();

    // Click RAG tab
    await ragTab.click();

    // Wait for RAG content to load
    await page.waitForTimeout(500);
  });

  test('All 6 RAG subtabs render correctly', async ({ page }) => {
    // Click RAG tab
    const ragTab = page.locator('.tab-bar a').filter({ hasText: 'RAG' });
    await ragTab.click();

    // Wait for subtab bar
    await page.waitForSelector('.subtab-bar', { timeout: 5000 });

    // Verify all 6 subtabs exist
    const expectedSubtabs = [
      'Data Quality',
      'Retrieval',
      'External Rerankers',
      'Learning Ranker',
      'Indexing',
      'Evaluate'
    ];

    for (const subtabName of expectedSubtabs) {
      const subtab = page.locator('.subtab-btn').filter({ hasText: subtabName });
      await expect(subtab).toBeVisible();
    }
  });

  test('Data Quality subtab renders with all sections', async ({ page }) => {
    // Navigate to RAG > Data Quality
    await page.locator('.tab-bar a').filter({ hasText: 'RAG' }).click();
    await page.waitForSelector('.subtab-bar');

    const dataQualitySubtab = page.locator('.subtab-btn').filter({ hasText: 'Data Quality' });
    await dataQualitySubtab.click();

    // Wait for content
    await page.waitForTimeout(500);

    // Verify sections exist
    await expect(page.getByText('Repository Configuration')).toBeVisible();
    await expect(page.getByText('Code Cards Builder & Viewer')).toBeVisible();
    await expect(page.getByText('Semantic Synonyms')).toBeVisible();
  });

  test('Retrieval subtab renders with form inputs', async ({ page }) => {
    // Navigate to RAG > Retrieval
    await page.locator('.tab-bar a').filter({ hasText: 'RAG' }).click();
    await page.waitForSelector('.subtab-bar');

    const retrievalSubtab = page.locator('.subtab-btn').filter({ hasText: 'Retrieval' });
    await retrievalSubtab.click();

    // Wait for content
    await page.waitForTimeout(500);

    // Verify generation models section exists
    await expect(page.getByText('Generation Models')).toBeVisible();
  });

  test('External Rerankers subtab is accessible', async ({ page }) => {
    // Navigate to RAG > External Rerankers
    await page.locator('.tab-bar a').filter({ hasText: 'RAG' }).click();
    await page.waitForSelector('.subtab-bar');

    const rerankersSubtab = page.locator('.subtab-btn').filter({ hasText: 'External Rerankers' });
    await rerankersSubtab.click();

    // Wait for content
    await page.waitForTimeout(500);

    // Verify content loaded (component should render)
    const content = page.locator('.rag-subtab-content');
    await expect(content).toBeVisible();
  });

  test('Learning Ranker subtab is accessible', async ({ page }) => {
    // Navigate to RAG > Learning Ranker
    await page.locator('.tab-bar a').filter({ hasText: 'RAG' }).click();
    await page.waitForSelector('.subtab-bar');

    const learningSubtab = page.locator('.subtab-btn').filter({ hasText: 'Learning Ranker' });
    await learningSubtab.click();

    // Wait for content
    await page.waitForTimeout(500);

    // Verify content loaded
    const content = page.locator('.rag-subtab-content');
    await expect(content).toBeVisible();
  });

  test('Indexing subtab is accessible', async ({ page }) => {
    // Navigate to RAG > Indexing
    await page.locator('.tab-bar a').filter({ hasText: 'RAG' }).click();
    await page.waitForSelector('.subtab-bar');

    const indexingSubtab = page.locator('.subtab-btn').filter({ hasText: 'Indexing' });
    await indexingSubtab.click();

    // Wait for content
    await page.waitForTimeout(500);

    // Verify content loaded
    const content = page.locator('.rag-subtab-content');
    await expect(content).toBeVisible();
  });

  test('Evaluate subtab is accessible', async ({ page }) => {
    // Navigate to RAG > Evaluate
    await page.locator('.tab-bar a').filter({ hasText: 'RAG' }).click();
    await page.waitForSelector('.subtab-bar');

    const evaluateSubtab = page.locator('.subtab-btn').filter({ hasText: 'Evaluate' });
    await evaluateSubtab.click();

    // Wait for content
    await page.waitForTimeout(500);

    // Verify content loaded
    const content = page.locator('.rag-subtab-content');
    await expect(content).toBeVisible();
  });

  test('Subtab navigation works - switching between subtabs', async ({ page }) => {
    // Navigate to RAG tab
    await page.locator('.tab-bar a').filter({ hasText: 'RAG' }).click();
    await page.waitForSelector('.subtab-bar');

    // Click Data Quality
    await page.locator('.subtab-btn').filter({ hasText: 'Data Quality' }).click();
    await page.waitForTimeout(300);

    // Verify Data Quality is active
    const dataQualityBtn = page.locator('.subtab-btn').filter({ hasText: 'Data Quality' });
    await expect(dataQualityBtn).toHaveClass(/active/);

    // Click Retrieval
    await page.locator('.subtab-btn').filter({ hasText: 'Retrieval' }).click();
    await page.waitForTimeout(300);

    // Verify Retrieval is now active
    const retrievalBtn = page.locator('.subtab-btn').filter({ hasText: 'Retrieval' });
    await expect(retrievalBtn).toHaveClass(/active/);
  });

  test('No console errors when navigating RAG tab', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to RAG and click through all subtabs
    await page.locator('.tab-bar a').filter({ hasText: 'RAG' }).click();
    await page.waitForSelector('.subtab-bar');

    const subtabs = ['Data Quality', 'Retrieval', 'External Rerankers', 'Learning Ranker', 'Indexing', 'Evaluate'];

    for (const subtab of subtabs) {
      await page.locator('.subtab-btn').filter({ hasText: subtab }).click();
      await page.waitForTimeout(300);
    }

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0);
  });
});
