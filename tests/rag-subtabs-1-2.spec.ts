// AGRO - Playwright Test: RAG Subtabs 1-2 (Data Quality + Retrieval)
// Verification test for Agent B1 React refactor

import { test, expect } from '@playwright/test';

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8012';
const WEB_BASE = process.env.WEB_BASE || 'http://localhost:5173';

test.describe('RAG Subtabs 1-2: Data Quality and Retrieval', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to RAG tab
    await page.goto(WEB_BASE);
    await page.waitForLoadState('networkidle');

    // Wait for app to initialize
    await page.waitForSelector('.tab-bar', { timeout: 10000 });

    // Click RAG tab
    const ragTab = page.locator('.tab-btn').filter({ hasText: 'RAG' });
    await ragTab.click();

    // Wait for subtabs to appear
    await page.waitForSelector('.subtab-bar', { timeout: 5000 });
  });

  test('Data Quality subtab renders correctly', async ({ page }) => {
    // Click Data Quality subtab
    const dataQualitySubtab = page.locator('.subtab-btn').filter({ hasText: 'Data Quality' });
    await dataQualitySubtab.click();

    // Wait for content to load
    await page.waitForSelector('#tab-rag-data-quality', { timeout: 5000 });

    // Verify Repository Configuration section exists
    const repoSection = page.locator('h3').filter({ hasText: 'Repository Configuration' });
    await expect(repoSection).toBeVisible();

    // Verify Code Cards Builder section exists
    const cardsSection = page.locator('h3').filter({ hasText: 'Code Cards Builder & Viewer' });
    await expect(cardsSection).toBeVisible();

    // Verify cards repo select exists
    const cardsRepoSelect = page.locator('#cards-repo-select');
    await expect(cardsRepoSelect).toBeVisible();

    // Verify Semantic Synonyms section exists
    const synonymsSection = page.locator('h3').filter({ hasText: 'Semantic Synonyms' });
    await expect(synonymsSection).toBeVisible();

    console.log('✓ Data Quality subtab renders correctly');
  });

  test('Retrieval subtab renders correctly', async ({ page }) => {
    // Click Retrieval subtab
    const retrievalSubtab = page.locator('.subtab-btn').filter({ hasText: 'Retrieval' });
    await retrievalSubtab.click();

    // Wait for content to load
    await page.waitForSelector('#tab-rag-retrieval', { timeout: 5000 });

    // Verify Generation Models section exists
    const genModelsSection = page.locator('h3').filter({ hasText: 'Generation Models' });
    await expect(genModelsSection).toBeVisible();

    // Verify Retrieval Parameters section exists
    const retrievalParamsSection = page.locator('h3').filter({ hasText: 'Retrieval Parameters' });
    await expect(retrievalParamsSection).toBeVisible();

    console.log('✓ Retrieval subtab renders correctly');
  });

  test('Retrieval subtab form inputs are controllable', async ({ page }) => {
    // Navigate to Retrieval subtab
    const retrievalSubtab = page.locator('.subtab-btn').filter({ hasText: 'Retrieval' });
    await retrievalSubtab.click();
    await page.waitForSelector('#tab-rag-retrieval', { timeout: 5000 });

    // Test GEN_MODEL input
    const genModelInput = page.locator('input[name="GEN_MODEL"]');
    await expect(genModelInput).toBeVisible();
    await genModelInput.fill('gpt-4o-mini');
    await expect(genModelInput).toHaveValue('gpt-4o-mini');

    // Test GEN_TEMPERATURE input
    const tempInput = page.locator('input[name="GEN_TEMPERATURE"]');
    await expect(tempInput).toBeVisible();
    await tempInput.fill('0.2');
    await expect(tempInput).toHaveValue('0.2');

    // Test MQ_REWRITES input
    const mqRewritesInput = page.locator('input[name="MQ_REWRITES"]');
    await expect(mqRewritesInput).toBeVisible();
    await mqRewritesInput.fill('3');
    await expect(mqRewritesInput).toHaveValue('3');

    // Test FINAL_K input
    const finalKInput = page.locator('input[name="FINAL_K"]');
    await expect(finalKInput).toBeVisible();
    await finalKInput.fill('15');
    await expect(finalKInput).toHaveValue('15');

    // Test TOPK_DENSE input
    const topkDenseInput = page.locator('input[name="TOPK_DENSE"]');
    await expect(topkDenseInput).toBeVisible();
    await topkDenseInput.fill('100');
    await expect(topkDenseInput).toHaveValue('100');

    // Test TOPK_SPARSE input
    const topkSparseInput = page.locator('input[name="TOPK_SPARSE"]');
    await expect(topkSparseInput).toBeVisible();
    await topkSparseInput.fill('100');
    await expect(topkSparseInput).toHaveValue('100');

    // Test HYDRATION_MODE select
    const hydrationModeSelect = page.locator('select[name="HYDRATION_MODE"]');
    await expect(hydrationModeSelect).toBeVisible();
    await hydrationModeSelect.selectOption('none');
    await expect(hydrationModeSelect).toHaveValue('none');

    // Test USE_SEMANTIC_SYNONYMS select
    const synonymsSelect = page.locator('select[name="USE_SEMANTIC_SYNONYMS"]');
    await expect(synonymsSelect).toBeVisible();
    await synonymsSelect.selectOption('0');
    await expect(synonymsSelect).toHaveValue('0');

    console.log('✓ All form inputs are controllable');
  });

  test('Data Quality cards builder UI exists', async ({ page }) => {
    // Navigate to Data Quality subtab
    const dataQualitySubtab = page.locator('.subtab-btn').filter({ hasText: 'Data Quality' });
    await dataQualitySubtab.click();
    await page.waitForSelector('#tab-rag-data-quality', { timeout: 5000 });

    // Verify cards exclude inputs exist
    const excludeDirsInput = page.locator('#cards-exclude-dirs');
    await expect(excludeDirsInput).toBeVisible();

    const excludePatternsInput = page.locator('#cards-exclude-patterns');
    await expect(excludePatternsInput).toBeVisible();

    const excludeKeywordsInput = page.locator('#cards-exclude-keywords');
    await expect(excludeKeywordsInput).toBeVisible();

    // Verify cards max input exists
    const cardsMaxInput = page.locator('#cards-max');
    await expect(cardsMaxInput).toBeVisible();

    // Verify enrich checkbox exists
    const enrichCheckbox = page.locator('#cards-enrich-gui');
    await expect(enrichCheckbox).toBeVisible();

    // Verify action buttons exist
    const buildButton = page.locator('#btn-cards-build');
    await expect(buildButton).toBeVisible();

    const refreshButton = page.locator('#btn-cards-refresh');
    await expect(refreshButton).toBeVisible();

    const viewAllButton = page.locator('#btn-cards-view-all');
    await expect(viewAllButton).toBeVisible();

    // Verify cards viewer container exists
    const cardsViewerContainer = page.locator('#cards-viewer-container');
    await expect(cardsViewerContainer).toBeVisible();

    console.log('✓ Cards builder UI elements are present');
  });

  test('Subtab navigation works correctly', async ({ page }) => {
    // Start on Data Quality
    const dataQualitySubtab = page.locator('.subtab-btn').filter({ hasText: 'Data Quality' });
    await dataQualitySubtab.click();
    await page.waitForSelector('#tab-rag-data-quality', { timeout: 5000 });
    await expect(dataQualitySubtab).toHaveClass(/active/);

    // Switch to Retrieval
    const retrievalSubtab = page.locator('.subtab-btn').filter({ hasText: 'Retrieval' });
    await retrievalSubtab.click();
    await page.waitForSelector('#tab-rag-retrieval', { timeout: 5000 });
    await expect(retrievalSubtab).toHaveClass(/active/);

    // Switch back to Data Quality
    await dataQualitySubtab.click();
    await page.waitForSelector('#tab-rag-data-quality', { timeout: 5000 });
    await expect(dataQualitySubtab).toHaveClass(/active/);

    console.log('✓ Subtab navigation works correctly');
  });

  test('Tooltips render correctly', async ({ page }) => {
    // Navigate to Retrieval subtab
    const retrievalSubtab = page.locator('.subtab-btn').filter({ hasText: 'Retrieval' });
    await retrievalSubtab.click();
    await page.waitForSelector('#tab-rag-retrieval', { timeout: 5000 });

    // Verify tooltip icons exist
    const tooltipIcons = page.locator('.help-icon');
    const count = await tooltipIcons.count();
    expect(count).toBeGreaterThan(0);

    console.log(`✓ Found ${count} tooltip help icons`);
  });
});
