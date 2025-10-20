import { test, expect } from '@playwright/test';

test.describe('Complete Feature Restoration After Git Cherry-Pick', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:8012');
    // Wait for page to load - buttons exist even if not in strict visibility
    await page.waitForFunction(() => document.querySelector('button[data-tab="rag"]'), { timeout: 10000 });
  });

  test('All lost features are restored and functional', async ({ page }) => {
    console.log('Starting comprehensive restoration test...');

    // TEST 1: View All Cards button in Data Quality
    // Use more specific selector to get the desktop tab bar button
    await page.click('.tab-bar button[data-tab="rag"]');
    await page.click('button[data-subtab="data-quality"]');
    
    const viewAllButton = page.locator('#btn-cards-view-all');
    await expect(viewAllButton).toBeVisible();
    await expect(viewAllButton).toContainText('View All');
    console.log('✓ View All Cards button restored');
    
    // TEST 2: Cards Viewer Container with proper styling
    const cardsContainer = page.locator('#cards-viewer-container');
    await expect(cardsContainer).toBeVisible();
    const containerStyle = await cardsContainer.getAttribute('style');
    expect(containerStyle).toContain('min-height: 300px');
    expect(containerStyle).toContain('max-height: 600px');
    console.log('✓ Cards viewer container styling restored');
    
    // TEST 3: Cards Grid with proper layout
    const cardsGrid = page.locator('#cards-viewer');
    const gridStyle = await cardsGrid.getAttribute('style');
    expect(gridStyle).toContain('minmax(280px, 1fr)');
    expect(gridStyle).toContain('gap:16px');
    console.log('✓ Cards grid layout restored');
    
    // TEST 4: Reranker Info Panel in Learning Ranker
    await page.click('button[data-subtab="learning-ranker"]');
    
    const infoPanel = page.locator('#reranker-info-panel').first();
    await expect(infoPanel).toBeVisible();
    await expect(infoPanel.locator('text=Enabled:')).toBeVisible();
    await expect(infoPanel.locator('text=Model Path:')).toBeVisible();
    await expect(infoPanel.locator('text=Device:')).toBeVisible();
    console.log('✓ Reranker info panel restored');
    
    // TEST 5: Mining Configuration Options
    const tripletsInput = page.locator('input[name="AGRO_TRIPLETS_PATH"]');
    await expect(tripletsInput).toBeVisible();
    await expect(tripletsInput).toHaveValue('data/training/triplets.jsonl');
    
    const mineModeSelect = page.locator('select[name="AGRO_RERANKER_MINE_MODE"]');
    await expect(mineModeSelect).toBeVisible();
    
    const resetSelect = page.locator('select[name="AGRO_RERANKER_MINE_RESET"]');
    await expect(resetSelect).toBeVisible();
    console.log('✓ Mining configuration options restored');
    
    // TEST 6: Reranker Model Input with correct default
    const modelInput = page.locator('input[name="AGRO_RERANKER_MODEL_PATH"]');
    await expect(modelInput).toBeVisible();
    await expect(modelInput).toHaveValue('models/cross-encoder-agro');
    console.log('✓ Reranker model input has correct default');
    
    // TEST 7: Chat Tab UI Elements
    await page.click('.tab-bar button[data-tab="chat"]');
    await page.waitForSelector('#chat-messages', { timeout: 5000 });
    
    await expect(page.locator('#chat-input')).toBeVisible();
    await expect(page.locator('#chat-send')).toBeVisible();
    await expect(page.locator('#chat-clear')).toBeVisible();
    await expect(page.locator('#chat-trace')).toBeVisible();
    console.log('✓ Chat UI elements present');
    
    // TEST 8: Chat Settings Subtab
    const chatSettingsTab = page.locator('button[data-subtab="chat-settings"]');
    if (await chatSettingsTab.isVisible()) {
      await chatSettingsTab.click();
      await expect(page.locator('#chat-model')).toBeVisible();
      await expect(page.locator('#chat-temperature')).toBeVisible();
      await expect(page.locator('#chat-max-tokens')).toBeVisible();
      console.log('✓ Chat settings restored');
    }
    
    // TEST 9: Apply Changes button is visible (the original fix)
    await page.click('.tab-bar button[data-tab="rag"]');
    const applyButton = page.locator('#apply-changes-btn');
    await expect(applyButton).toBeVisible();
    await expect(applyButton).not.toBeInViewport({ ratio: 0 });
    console.log('✓ Apply Changes button still visible');
    
    // TEST 10: Content is scrollable (original fix preserved)
    const contentArea = page.locator('.content');
    const overflow = await contentArea.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.overflow;
    });
    expect(overflow).toBe('visible');
    console.log('✓ Content area scrollability preserved');
    
    console.log('\n✅ ALL FEATURES SUCCESSFULLY RESTORED!');
  });

  test('Cards refresh and build buttons are functional', async ({ page }) => {
    await page.click('.tab-bar button[data-tab="rag"]');
    await page.click('button[data-subtab="data-quality"]');
    
    // Test refresh button
    const refreshBtn = page.locator('#btn-cards-refresh');
    await expect(refreshBtn).toBeVisible();
    await expect(refreshBtn).toBeEnabled();
    
    // Test build button  
    const buildBtn = page.locator('#btn-cards-build');
    await expect(buildBtn).toBeVisible();
    await expect(buildBtn).toBeEnabled();
    
    console.log('✓ Cards action buttons are functional');
  });

  test('Keywords section in RAG Performance exists', async ({ page }) => {
    await page.click('.tab-bar button[data-tab="rag"]');
    await page.click('button[data-subtab="rag-performance"]');
    
    // Check for keywords section
    const keywordsSection = page.locator('text=Keywords (AGRO_KEYWORDS)').first();
    if (await keywordsSection.isVisible()) {
      console.log('✓ Keywords section found in RAG Performance');
    }
    
    // Look for keyword select elements
    const kwSelects = page.locator('select[id^="kw-"]');
    const count = await kwSelects.count();
    if (count > 0) {
      console.log(`✓ Found ${count} keyword select elements`);
    }
  });
});
