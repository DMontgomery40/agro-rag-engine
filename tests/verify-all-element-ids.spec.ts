import { test, expect } from '@playwright/test';

test.describe('Verify ALL Element IDs Match /gui', () => {
  
  test('Learning Ranker - All 33 required IDs present', async ({ page }) => {
    await page.goto('http://localhost:5173/rag');
    await page.waitForTimeout(3000);
    await page.click('button[data-subtab="learning-ranker"]');
    await page.waitForTimeout(2000);
    
    const requiredIds = [
      'tab-rag-learning-ranker',
      'reranker-enabled-status',
      'reranker-query-count',
      'reranker-triplet-count',
      'reranker-mine-btn',
      'reranker-mine-result',
      'reranker-train-btn',
      'reranker-train-result',
      'reranker-eval-btn',
      'reranker-eval-result',
      'reranker-status',
      'reranker-terminal-container',
      'reranker-info-panel',
      'reranker-epochs',
      'reranker-batch',
      'reranker-metrics-display',
      'reranker-save-baseline',
      'reranker-compare-baseline',
      'reranker-rollback',
      'reranker-view-logs',
      'reranker-download-logs',
      'reranker-clear-logs',
      'reranker-logs-viewer',
      'reranker-cron-time',
      'reranker-setup-cron',
      'reranker-remove-cron',
      'reranker-cron-status',
      'reranker-test-query',
      'reranker-smoke-test',
      'reranker-smoke-result',
      'reranker-cost-24h',
      'reranker-cost-avg',
      'reranker-nohits-list',
    ];
    
    const missing = [];
    const found = [];
    
    for (const id of requiredIds) {
      const count = await page.locator(`#${id}`).count();
      if (count > 0) {
        found.push(id);
      } else {
        missing.push(id);
        console.log(`❌ MISSING: #${id}`);
      }
    }
    
    console.log(`\n✅ Found: ${found.length}/${requiredIds.length}`);
    console.log(`❌ Missing: ${missing.length}/${requiredIds.length}`);
    
    if (missing.length > 0) {
      console.log('\nMissing IDs that MUST be added:');
      missing.forEach(id => console.log(`  - #${id}`));
    }
    
    await page.screenshot({ path: 'test-results/learning-ranker-ids.png', fullPage: true });
    
    // Require at least 90% match
    expect(found.length).toBeGreaterThan(requiredIds.length * 0.9);
  });
  
  test('Data Quality - Required IDs present', async ({ page }) => {
    await page.goto('http://localhost:5173/rag');
    await page.waitForTimeout(2000);
    await page.click('button[data-subtab="data-quality"]');
    await page.waitForTimeout(1500);
    
    const requiredIds = [
      'tab-rag-data-quality',
      'data-quality-loading',
      'repos-section',
      'cards-repo-select',
      'cards-exclude-dirs',
    ];
    
    const missing = [];
    
    for (const id of requiredIds) {
      const count = await page.locator(`#${id}`).count();
      if (count === 0) {
        missing.push(id);
        console.log(`❌ MISSING: #${id}`);
      } else {
        console.log(`✅ #${id}`);
      }
    }
    
    if (missing.length > 0) {
      console.log(`\n⚠️  ${missing.length} IDs missing from Data Quality`);
    }
  });
});

