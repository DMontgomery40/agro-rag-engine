/**
 * AGRO - RAG Subtabs 3-4 Verification Test
 * Tests External Rerankers and Learning Ranker subtabs conversion
 * Agent B2 Emergency Task
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.AGRO_WEB_URL || 'http://localhost:5173';

test.describe('RAG Subtabs 3-4 (External Rerankers + Learning Ranker)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to RAG tab
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Wait for app to initialize
    await page.waitForSelector('[data-tab="rag"]', { timeout: 10000 });

    // Click RAG tab
    await page.click('[data-tab="rag"]');
    await page.waitForTimeout(500);
  });

  test('External Rerankers subtab renders', async ({ page }) => {
    // Click External Rerankers subtab
    const externalRerankersBtn = page.locator('[data-subtab="external-rerankers"]');
    await expect(externalRerankersBtn).toBeVisible({ timeout: 5000 });
    await externalRerankersBtn.click();
    await page.waitForTimeout(300);

    // Verify subtab is active
    await expect(externalRerankersBtn).toHaveClass(/active/);

    // Verify core elements are present
    await expect(page.locator('text=Reranking')).toBeVisible();
    await expect(page.locator('select[name="RERANK_BACKEND"]')).toBeVisible();
    await expect(page.locator('input[name="RERANKER_MODEL"]')).toBeVisible();
    await expect(page.locator('select[name="COHERE_RERANK_MODEL"]')).toBeVisible();
    await expect(page.locator('input[name="COHERE_API_KEY"]')).toBeVisible();
  });

  test('Learning Ranker subtab renders', async ({ page }) => {
    // Click Learning Ranker subtab
    const learningRankerBtn = page.locator('[data-subtab="learning-ranker"]');
    await expect(learningRankerBtn).toBeVisible({ timeout: 5000 });
    await learningRankerBtn.click();
    await page.waitForTimeout(300);

    // Verify subtab is active
    await expect(learningRankerBtn).toHaveClass(/active/);

    // Verify core elements are present
    await expect(page.locator('text=Learning Reranker System')).toBeVisible();
    await expect(page.locator('text=System Status')).toBeVisible();
    await expect(page.locator('text=Training Workflow')).toBeVisible();

    // Verify training buttons
    await expect(page.locator('button:has-text("Mine Triplets")')).toBeVisible();
    await expect(page.locator('button:has-text("Train Model")')).toBeVisible();
    await expect(page.locator('button:has-text("Evaluate")')).toBeVisible();
  });

  test('External Rerankers backend selection works', async ({ page }) => {
    // Navigate to External Rerankers
    await page.click('[data-subtab="external-rerankers"]');
    await page.waitForTimeout(300);

    const backendSelect = page.locator('select[name="RERANK_BACKEND"]');

    // Test selecting different backends
    await backendSelect.selectOption('cohere');
    await expect(backendSelect).toHaveValue('cohere');

    await backendSelect.selectOption('local');
    await expect(backendSelect).toHaveValue('local');

    await backendSelect.selectOption('hf');
    await expect(backendSelect).toHaveValue('hf');

    await backendSelect.selectOption('none');
    await expect(backendSelect).toHaveValue('none');
  });

  test('Learning Ranker configuration controls work', async ({ page }) => {
    // Navigate to Learning Ranker
    await page.click('[data-subtab="learning-ranker"]');
    await page.waitForTimeout(300);

    // Test enable/disable toggle
    const enabledSelect = page.locator('select[name="AGRO_RERANKER_ENABLED"]');
    await expect(enabledSelect).toBeVisible();

    await enabledSelect.selectOption('1');
    await expect(enabledSelect).toHaveValue('1');

    await enabledSelect.selectOption('0');
    await expect(enabledSelect).toHaveValue('0');

    // Test model path input
    const modelPathInput = page.locator('input[name="AGRO_RERANKER_MODEL_PATH"]');
    await expect(modelPathInput).toBeVisible();
    await modelPathInput.fill('models/test-encoder');
    await expect(modelPathInput).toHaveValue('models/test-encoder');
  });

  test('Reranker info panel displays on External Rerankers', async ({ page }) => {
    await page.click('[data-subtab="external-rerankers"]');
    await page.waitForTimeout(300);

    // Verify reranker info panel exists
    await expect(page.locator('text=Current Reranker (Server)')).toBeVisible();
    await expect(page.locator('text=Enabled:')).toBeVisible();
    await expect(page.locator('text=Model Path:')).toBeVisible();
    await expect(page.locator('text=Device:')).toBeVisible();
  });

  test('Reranker info panel displays on Learning Ranker', async ({ page }) => {
    await page.click('[data-subtab="learning-ranker"]');
    await page.waitForTimeout(300);

    // Verify reranker info panel exists
    await expect(page.locator('text=Current Reranker (Server)').first()).toBeVisible();

    // Verify status displays
    await expect(page.locator('text=Reranker Status')).toBeVisible();
    await expect(page.locator('text=Logged Queries')).toBeVisible();
    await expect(page.locator('text=Training Triplets')).toBeVisible();
  });

  test('Learning Ranker sections are all present', async ({ page }) => {
    await page.click('[data-subtab="learning-ranker"]');
    await page.waitForTimeout(300);

    // Verify all major sections exist
    await expect(page.locator('text=System Status')).toBeVisible();
    await expect(page.locator('text=Training Workflow')).toBeVisible();
    await expect(page.locator('text=Reranker Configuration')).toBeVisible();
    await expect(page.locator('text=Evaluation Metrics')).toBeVisible();
    await expect(page.locator('text=Query Logs')).toBeVisible();
    await expect(page.locator('text=Automation')).toBeVisible();
    await expect(page.locator('text=Smoke Test')).toBeVisible();
    await expect(page.locator('text=Cost Tracking')).toBeVisible();
    await expect(page.locator('text=No-Hit Queries')).toBeVisible();
  });

  test('External Rerankers Cohere model options are correct', async ({ page }) => {
    await page.click('[data-subtab="external-rerankers"]');
    await page.waitForTimeout(300);

    const cohereSelect = page.locator('select[name="COHERE_RERANK_MODEL"]');

    // Verify all Cohere model options exist
    const options = await cohereSelect.locator('option').allTextContents();
    expect(options).toContain('(select model)');
    expect(options).toContain('rerank-3.5');
    expect(options).toContain('rerank-english-v3.0');
    expect(options).toContain('rerank-multilingual-v3.0');
    expect(options).toContain('rerank-english-lite-v3.0');
  });

  test('Subtab navigation works correctly', async ({ page }) => {
    // Start on External Rerankers
    await page.click('[data-subtab="external-rerankers"]');
    await page.waitForTimeout(300);
    await expect(page.locator('[data-subtab="external-rerankers"]')).toHaveClass(/active/);
    await expect(page.locator('text=Reranking')).toBeVisible();

    // Switch to Learning Ranker
    await page.click('[data-subtab="learning-ranker"]');
    await page.waitForTimeout(300);
    await expect(page.locator('[data-subtab="learning-ranker"]')).toHaveClass(/active/);
    await expect(page.locator('[data-subtab="external-rerankers"]')).not.toHaveClass(/active/);
    await expect(page.locator('text=Learning Reranker System')).toBeVisible();

    // Switch back to External Rerankers
    await page.click('[data-subtab="external-rerankers"]');
    await page.waitForTimeout(300);
    await expect(page.locator('[data-subtab="external-rerankers"]')).toHaveClass(/active/);
    await expect(page.locator('[data-subtab="learning-ranker"]')).not.toHaveClass(/active/);
  });
});
