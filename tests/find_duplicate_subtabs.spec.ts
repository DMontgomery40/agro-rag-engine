import { test } from '@playwright/test';

test('Find which subtabs have duplicates', async ({ page }) => {
  await page.goto('http://localhost:5173/rag');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const expectedSubtabs = [
    'tab-rag-data-quality',
    'tab-rag-retrieval',
    'tab-rag-external-rerankers',
    'tab-rag-learning-ranker',
    'tab-rag-indexing',
    'tab-rag-evaluate',
  ];

  for (const subtabId of expectedSubtabs) {
    const subtab = page.locator(`#${subtabId}.rag-subtab-content`);
    const count = await subtab.count();
    console.log(`${subtabId}: found ${count} elements`);

    if (count > 1) {
      // Get all matching elements
      const all = await subtab.all();
      for (let i = 0; i < all.length; i++) {
        const html = await all[i].evaluate(el => el.outerHTML.substring(0, 150));
        console.log(`  Element ${i + 1}: ${html}...`);
      }
    }
  }
});
