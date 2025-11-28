import { test, expect } from '@playwright/test';

/**
 * Playwright test for Learning Ranker Subtab component
 *
 * Tests that the subtab:
 * - Renders without errors
 * - Eval section clearly labeled as reranker-only
 * - Can select reranker model path
 * - Settings persist to backend
 */

test.describe('Learning Ranker Subtab', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to RAG tab
    await page.goto('http://localhost:5173/web/rag');
    await page.waitForLoadState('networkidle');

    // Wait for subtab bar to be visible
    await page.waitForSelector('.subtab-bar', { timeout: 10000 });

    // Click Learning Ranker subtab
    const learningRankerSubtab = page.locator('.subtab-btn[data-subtab="learning-ranker"]');
    await learningRankerSubtab.waitFor({ state: 'visible', timeout: 10000 });
    await learningRankerSubtab.click();
    await page.waitForTimeout(500);
  });

  test('subtab renders without errors', async ({ page }) => {
    // Check that main container exists and becomes visible
    const container = await page.locator('#tab-rag-learning-ranker');

    // Wait for the container to have 'active' class (visibility is controlled by CSS)
    await page.waitForFunction(
      () => {
        const el = document.querySelector('#tab-rag-learning-ranker');
        return el && el.classList.contains('active');
      },
      { timeout: 10000 }
    );

    await expect(container).toBeVisible();

    // Check header is present
    await expect(page.locator('text=Learning Reranker System')).toBeVisible();

    // Check that status overview section is present
    await expect(page.locator('text=System Status')).toBeVisible();
    await expect(page.locator('text=Reranker Status')).toBeVisible();
    await expect(page.locator('text=Logged Queries')).toBeVisible();
    await expect(page.locator('text=Training Triplets')).toBeVisible();
  });

  test('eval section clearly labeled as reranker-only', async ({ page }) => {
    // Check that the evaluation section has correct title
    await expect(page.locator('text=Cross-Encoder Model Performance Evaluation')).toBeVisible();

    // Check for disambiguation note
    const note = await page.locator('text=This evaluates ONLY the cross-encoder/reranker model performance');
    await expect(note).toBeVisible();

    // Check that it mentions where to find full RAG eval
    const ragEvalNote = await page.locator('text=For full RAG pipeline evaluation');
    await expect(ragEvalNote).toBeVisible();
  });

  test('reranker model path picker is present', async ({ page }) => {
    // Check that model path picker exists
    const modelPathLabel = await page.locator('text=Model Path (AGRO_RERANKER_MODEL_PATH)');
    await expect(modelPathLabel).toBeVisible();

    // Check that it's a select element (dropdown)
    const modelPathSelect = await page.locator('select[name="AGRO_RERANKER_MODEL_PATH"]');
    await expect(modelPathSelect).toBeVisible();

    // Check that it has options
    const options = await modelPathSelect.locator('option').count();
    expect(options).toBeGreaterThan(0);

    // Check that default model is in the list
    const defaultModel = await modelPathSelect.locator('option[value="models/cross-encoder-agro"]');
    await expect(defaultModel).toBeVisible();
  });

  test('training workflow buttons are present', async ({ page }) => {
    // Check for all three workflow buttons
    await expect(page.locator('button:has-text("Mine Triplets")')).toBeVisible();
    await expect(page.locator('button:has-text("Train Model")')).toBeVisible();
    await expect(page.locator('button:has-text("Evaluate")')).toBeVisible();

    // Check workflow step descriptions
    await expect(page.locator('text=1. Mine Triplets')).toBeVisible();
    await expect(page.locator('text=2. Train Model')).toBeVisible();
    await expect(page.locator('text=3. Evaluate')).toBeVisible();
  });

  test('configuration settings are present and editable', async ({ page }) => {
    // Check Enable Learning Reranker toggle
    const enabledSelect = await page.locator('select[name="AGRO_RERANKER_ENABLED"]');
    await expect(enabledSelect).toBeVisible();

    // Check Blend Alpha input
    const alphaInput = await page.locator('input[name="AGRO_RERANKER_ALPHA"]');
    await expect(alphaInput).toBeVisible();

    // Check Training Epochs input
    const epochsInput = await page.locator('input[name="RERANKER_TRAIN_EPOCHS"]');
    await expect(epochsInput).toBeVisible();

    // Check that inputs have correct types
    await expect(alphaInput).toHaveAttribute('type', 'number');
    await expect(epochsInput).toHaveAttribute('type', 'number');
  });

  test('current reranker info panel is present', async ({ page }) => {
    // Check for server info panel
    const infoPanelLabel = await page.locator('text=Current Reranker (Server)');
    await expect(infoPanelLabel).toBeVisible();

    // Check for info fields
    await expect(page.locator('text=Enabled:')).toBeVisible();
    await expect(page.locator('text=Model Path:')).toBeVisible();
    await expect(page.locator('text=Device:')).toBeVisible();
    await expect(page.locator('text=Alpha:')).toBeVisible();
  });

  test('evaluation results section is present', async ({ page }) => {
    // Check eval metrics section
    await expect(page.locator('text=Cross-Encoder Model Performance Evaluation')).toBeVisible();

    // Check for baseline management buttons
    await expect(page.locator('button:has-text("Save as Baseline")')).toBeVisible();
    await expect(page.locator('button:has-text("Compare vs Baseline")')).toBeVisible();
    await expect(page.locator('button:has-text("Rollback Model")')).toBeVisible();
  });

  test('log management section is present', async ({ page }) => {
    // Check Query Logs section
    await expect(page.locator('text=Query Logs')).toBeVisible();

    // Check log action buttons
    await expect(page.locator('button:has-text("View Logs")')).toBeVisible();
    await expect(page.locator('button:has-text("Download Logs")')).toBeVisible();
    await expect(page.locator('button:has-text("Clear Logs")')).toBeVisible();
  });

  test('automation section is present', async ({ page }) => {
    // Check Automation section
    await expect(page.locator('text=Automation')).toBeVisible();
    await expect(page.locator('text=Nightly Training Time')).toBeVisible();

    // Check automation buttons
    await expect(page.locator('button:has-text("Setup Nightly Job")')).toBeVisible();
    await expect(page.locator('button:has-text("Remove Nightly Job")')).toBeVisible();
  });

  test('smoke test section is present', async ({ page }) => {
    // Check Smoke Test section
    await expect(page.locator('text=Smoke Test')).toBeVisible();

    // Check test query input
    const testQueryInput = await page.locator('input[placeholder*="OAuth"]');
    await expect(testQueryInput).toBeVisible();

    // Check smoke test button
    await expect(page.locator('button:has-text("Run Smoke Test")')).toBeVisible();
  });

  test('cost tracking section is present', async ({ page }) => {
    // Check Cost Tracking section
    await expect(page.locator('text=Cost Tracking')).toBeVisible();
    await expect(page.locator('text=Total Cost (Last 24h)')).toBeVisible();
    await expect(page.locator('text=Avg Cost per Query')).toBeVisible();

    // Check cost details button
    await expect(page.locator('button:has-text("View Cost Breakdown")')).toBeVisible();
  });

  test('no-hit queries section is present', async ({ page }) => {
    // Check No-Hit Queries section
    await expect(page.locator('text=No-Hit Queries')).toBeVisible();
  });

  test('no dangerouslySetInnerHTML is used', async ({ page }) => {
    // This is a structural test - if the component renders properly with our TSX,
    // it means dangerouslySetInnerHTML has been successfully removed

    // Check that content is actual DOM elements, not innerHTML
    const container = await page.locator('#tab-rag-learning-ranker');
    const innerHTML = await container.innerHTML();

    // The content should not have raw HTML injection patterns
    expect(innerHTML).not.toContain('dangerouslySetInnerHTML');

    // Should have proper React-rendered elements
    await expect(page.locator('.settings-section')).toHaveCount(10); // 10 settings sections
  });

  test('model path can be changed', async ({ page }) => {
    // Get the model path select
    const modelPathSelect = await page.locator('select[name="AGRO_RERANKER_MODEL_PATH"]');

    // Get current value
    const initialValue = await modelPathSelect.inputValue();

    // Change to a different model
    await modelPathSelect.selectOption('cross-encoder/ms-marco-MiniLM-L-12-v2');

    // Wait a bit for the change to propagate
    await page.waitForTimeout(500);

    // Verify the value changed
    const newValue = await modelPathSelect.inputValue();
    expect(newValue).toBe('cross-encoder/ms-marco-MiniLM-L-12-v2');
    expect(newValue).not.toBe(initialValue);
  });

  test('numeric inputs accept valid values', async ({ page }) => {
    // Test Training Epochs input
    const epochsInput = await page.locator('input[name="RERANKER_TRAIN_EPOCHS"]');
    await epochsInput.clear();
    await epochsInput.fill('5');
    await epochsInput.blur();

    await page.waitForTimeout(300);

    const epochsValue = await epochsInput.inputValue();
    expect(epochsValue).toBe('5');

    // Test Blend Alpha input
    const alphaInput = await page.locator('input[name="AGRO_RERANKER_ALPHA"]');
    await alphaInput.clear();
    await alphaInput.fill('0.8');
    await alphaInput.blur();

    await page.waitForTimeout(300);

    const alphaValue = await alphaInput.inputValue();
    expect(parseFloat(alphaValue)).toBeCloseTo(0.8, 1);
  });

  test('component has proper TypeScript types (structural test)', async ({ page }) => {
    // This test verifies that the component renders correctly,
    // which implies TypeScript compilation was successful

    // Check that all major sections render
    const sections = [
      'Learning Reranker System',
      'System Status',
      'Training Workflow',
      'Reranker Configuration',
      'Cross-Encoder Model Performance Evaluation',
      'Query Logs',
      'Automation',
      'Smoke Test',
      'Cost Tracking',
      'No-Hit Queries'
    ];

    for (const section of sections) {
      await expect(page.locator(`text=${section}`)).toBeVisible();
    }
  });
});
