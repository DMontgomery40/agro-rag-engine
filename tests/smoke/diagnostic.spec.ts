import { test } from '@playwright/test';

test('Diagnostic - Check panel visibility', async ({ page }) => {
  await page.goto('http://127.0.0.1:8012');
  
  await page.waitForFunction(() => document.querySelector('.tab-bar button[data-tab="rag"]'));
  await page.click('.tab-bar button[data-tab="rag"]');
  
  await page.waitForFunction(() => document.querySelector('button[data-subtab="learning-ranker"]'));
  await page.click('button[data-subtab="learning-ranker"]');
  
  await page.waitForTimeout(2000);
  
  const panelCount = await page.locator('#reranker-info-panel').count();
  console.log(`Found ${panelCount} reranker-info-panel elements`);
  
  const panels = await page.locator('#reranker-info-panel').all();
  for (let i = 0; i < panels.length; i++) {
    const isVisible = await panels[i].isVisible();
    console.log(`Panel ${i}: visible=${isVisible}`);
  }
});
