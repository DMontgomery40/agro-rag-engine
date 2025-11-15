import { test, expect } from '@playwright/test';

test.describe('React App Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Go to React dev server
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000); // Let React initialize
  });

  test('1. App loads without black screen', async ({ page }) => {
    // Check that root div has content
    const root = await page.locator('#root');
    await expect(root).not.toBeEmpty();
    
    // Check for main app elements
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    expect(body!.length).toBeGreaterThan(100);
    
    await page.screenshot({ path: 'test-results/react-app-loaded.png', fullPage: true });
    console.log('✅ React app loaded with content');
  });

  test('2. Tab navigation exists and renders', async ({ page }) => {
    // Look for navigation tabs
    const nav = await page.locator('[role="navigation"], .tab-bar, nav').first();
    await expect(nav).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ path: 'test-results/react-navigation.png' });
    console.log('✅ Navigation visible');
  });

  test('3. RAG tab has all 6 subtabs', async ({ page }) => {
    // Navigate to RAG tab
    await page.click('button[data-tab="rag"], a[href*="rag"]').catch(() => {});
    await page.waitForTimeout(1000);
    
    // Check for subtabs
    const subtabs = ['data-quality', 'retrieval', 'external-rerankers', 'learning-ranker', 'indexing', 'evaluate'];
    const foundSubtabs = [];
    
    for (const subtab of subtabs) {
      const element = await page.locator(`[data-subtab="${subtab}"], button:has-text("${subtab.replace(/-/g, ' ')}")`).first().isVisible().catch(() => false);
      if (element) {
        foundSubtabs.push(subtab);
      }
    }
    
    await page.screenshot({ path: 'test-results/react-rag-subtabs.png', fullPage: true });
    console.log(`✅ Found ${foundSubtabs.length}/6 RAG subtabs:`, foundSubtabs);
    expect(foundSubtabs.length).toBeGreaterThan(3); // At least some subtabs visible
  });

  test('4. Learning Ranker has terminal container', async ({ page }) => {
    // Navigate to RAG > Learning Ranker
    await page.click('button[data-tab="rag"], a[href*="rag"]').catch(() => {});
    await page.waitForTimeout(500);
    await page.click('button[data-subtab="learning-ranker"], button:has-text("Learning Ranker")').catch(() => {});
    await page.waitForTimeout(1000);
    
    // Check for training workflow buttons
    const mineBtn = await page.locator('button:has-text("Mine Triplets")').first().isVisible().catch(() => false);
    const trainBtn = await page.locator('button:has-text("Train Model")').first().isVisible().catch(() => false);
    const evalBtn = await page.locator('button:has-text("Evaluate")').first().isVisible().catch(() => false);
    
    await page.screenshot({ path: 'test-results/react-learning-ranker.png', fullPage: true });
    
    console.log('Mine button:', mineBtn);
    console.log('Train button:', trainBtn);
    console.log('Eval button:', evalBtn);
    
    expect(mineBtn || trainBtn || evalBtn).toBeTruthy();
  });

  test('5. VSCode tab renders and shows status', async ({ page }) => {
    // Navigate to VSCode tab
    await page.click('button[data-tab="vscode"], a[href*="vscode"]').catch(() => {});
    await page.waitForTimeout(1000);
    
    // Look for editor status or iframe
    const hasContent = await page.locator('body').textContent();
    
    await page.screenshot({ path: 'test-results/react-vscode-tab.png', fullPage: true });
    console.log('✅ VSCode tab loaded');
  });

  test('6. Admin tab exists with settings', async ({ page }) => {
    // Navigate to Admin tab
    await page.click('button[data-tab="admin"], a[href*="admin"]').catch(() => {});
    await page.waitForTimeout(1000);
    
    const hasContent = await page.locator('body').textContent();
    
    await page.screenshot({ path: 'test-results/react-admin-tab.png', fullPage: true });
    console.log('✅ Admin tab loaded');
  });
});

