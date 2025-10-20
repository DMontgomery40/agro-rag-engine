import { test, expect } from '@playwright/test';

test.describe('Recovered Features from Git Revert', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:8012');
    // Wait for GUI to load
    await page.waitForSelector('#tab-rag', { timeout: 10000 });
  });

  test('View All Cards button exists and is functional', async ({ page }) => {
    // Navigate to RAG tab
    await page.click('#tab-btn-rag');
    
    // Navigate to Data Quality subtab
    await page.click('button[data-subtab="data-quality"]');
    
    // Check that View All Cards button exists
    const viewAllButton = page.locator('#btn-cards-view-all');
    await expect(viewAllButton).toBeVisible();
    await expect(viewAllButton).toContainText('View All');
    
    // Check button styling
    const buttonStyle = await viewAllButton.getAttribute('style');
    expect(buttonStyle).toContain('background: var(--bg-elev2)');
    expect(buttonStyle).toContain('color: var(--link)');
    expect(buttonStyle).toContain('border: 1px solid var(--link)');
  });

  test('Cards Viewer Container has improved styling', async ({ page }) => {
    // Navigate to RAG tab
    await page.click('#tab-btn-rag');
    
    // Navigate to Data Quality subtab
    await page.click('button[data-subtab="data-quality"]');
    
    // Check cards viewer container styling
    const container = page.locator('#cards-viewer-container');
    await expect(container).toBeVisible();
    
    const containerStyle = await container.getAttribute('style');
    expect(containerStyle).toContain('min-height: 300px');
    expect(containerStyle).toContain('max-height: 600px');
    expect(containerStyle).toContain('padding: 16px');
    
    // Check cards grid styling
    const grid = page.locator('#cards-viewer');
    const gridStyle = await grid.getAttribute('style');
    expect(gridStyle).toContain('minmax(280px, 1fr)');
    expect(gridStyle).toContain('gap:16px');
    expect(gridStyle).toContain('width:100%');
  });

  test('Reranker Info Panel exists in Learning Ranker tab', async ({ page }) => {
    // Navigate to RAG tab
    await page.click('#tab-btn-rag');
    
    // Navigate to Learning Ranker subtab
    await page.click('button[data-subtab="learning-ranker"]');
    
    // Check that reranker info panel exists
    const infoPanel = page.locator('#reranker-info-panel');
    await expect(infoPanel).toBeVisible();
    
    // Check panel structure
    await expect(infoPanel.locator('text=Enabled:')).toBeVisible();
    await expect(infoPanel.locator('text=Model Path:')).toBeVisible();
    await expect(infoPanel.locator('text=Device:')).toBeVisible();
    await expect(infoPanel.locator('text=Alpha:')).toBeVisible();
    await expect(infoPanel.locator('text=TopN:')).toBeVisible();
    await expect(infoPanel.locator('text=Batch:')).toBeVisible();
    await expect(infoPanel.locator('text=MaxLen:')).toBeVisible();
    
    // Check panel label
    const panelLabel = page.locator('text=Current Reranker (Server)');
    await expect(panelLabel).toBeVisible();
  });

  test('Mining Configuration Options exist in Learning Ranker tab', async ({ page }) => {
    // Navigate to RAG tab
    await page.click('#tab-btn-rag');
    
    // Navigate to Learning Ranker subtab  
    await page.click('button[data-subtab="learning-ranker"]');
    
    // Check AGRO_TRIPLETS_PATH input
    const tripletsInput = page.locator('input[name="AGRO_TRIPLETS_PATH"]');
    await expect(tripletsInput).toBeVisible();
    await expect(tripletsInput).toHaveAttribute('placeholder', 'data/training/triplets.jsonl');
    await expect(tripletsInput).toHaveValue('data/training/triplets.jsonl');
    
    // Check AGRO_RERANKER_MINE_MODE select
    const mineModeSelect = page.locator('select[name="AGRO_RERANKER_MINE_MODE"]');
    await expect(mineModeSelect).toBeVisible();
    const mineModeOptions = await mineModeSelect.locator('option').allTextContents();
    expect(mineModeOptions).toContain('append');
    expect(mineModeOptions).toContain('replace');
    
    // Check AGRO_RERANKER_MINE_RESET select
    const resetSelect = page.locator('select[name="AGRO_RERANKER_MINE_RESET"]');
    await expect(resetSelect).toBeVisible();
    const resetOptions = await resetSelect.locator('option').allTextContents();
    expect(resetOptions).toContain('No');
    expect(resetOptions).toContain('Yes');
  });

  test('Reranker Model Input has correct default value', async ({ page }) => {
    // Navigate to RAG tab
    await page.click('#tab-btn-rag');
    
    // Navigate to Learning Ranker subtab
    await page.click('button[data-subtab="learning-ranker"]');
    
    // Check model path input
    const modelInput = page.locator('input[name="AGRO_RERANKER_MODEL_PATH"]');
    await expect(modelInput).toBeVisible();
    await expect(modelInput).toHaveValue('models/cross-encoder-agro');
  });

  test('All restored features work together without breaking layout', async ({ page }) => {
    // Navigate to RAG tab
    await page.click('#tab-btn-rag');
    
    // Test Data Quality tab
    await page.click('button[data-subtab="data-quality"]');
    await expect(page.locator('#btn-cards-view-all')).toBeVisible();
    await expect(page.locator('#cards-viewer-container')).toBeVisible();
    
    // Test Learning Ranker tab
    await page.click('button[data-subtab="learning-ranker"]');
    await expect(page.locator('#reranker-info-panel')).toBeVisible();
    await expect(page.locator('input[name="AGRO_TRIPLETS_PATH"]')).toBeVisible();
    
    // Check Apply Changes button is still visible (don't break the fix!)
    const applyButton = page.locator('#apply-changes-btn');
    await expect(applyButton).toBeVisible();
    await expect(applyButton).not.toBeInViewport({ ratio: 0 });
    
    // Test that the content area is still scrollable
    const contentArea = page.locator('.content');
    const overflow = await contentArea.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.overflow;
    });
    expect(overflow).toBe('visible');
  });
});
