import { test } from '@playwright/test';

test('Check what sections exist in /gui Data Quality subtab', async ({ page }) => {
  await page.goto('http://localhost:5173/gui/index.html');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000); // Wait for modules to load

  // Click RAG tab
  await page.click('button:has-text("RAG")');
  await page.waitForTimeout(500);

  // Click Data Quality subtab (should already be active)
  const dataQualityButton = page.locator('#rag-subtabs button:has-text("Data Quality")');
  await dataQualityButton.click();
  await page.waitForTimeout(1000);

  // Get all h3 headings in Data Quality subtab
  const headings = await page.locator('#tab-rag-data-quality h3').allTextContents();
  console.log('\n=== Data Quality sections in /gui ===');
  headings.forEach((h, i) => console.log(`${i + 1}. ${h.trim()}`));

  // Check for Keywords-related elements
  const keywordsCheck = await page.locator('#tab-rag-data-quality').evaluate(el => {
    const html = el.innerHTML;
    return {
      hasKeywordsText: html.includes('Keywords') || html.includes('Discriminative'),
      hasKeywordsList: !!el.querySelector('#keywords-list'),
      hasKeywordsCount: !!el.querySelector('#keywords-count'),
      hasRepoKeywordsInput: !!el.querySelector('[name^="repo_keywords_"]'),
    };
  });

  console.log('\n=== Keywords elements check ===');
  console.log(JSON.stringify(keywordsCheck, null, 2));

  // Check for semantic cards settings
  const semanticCheck = await page.locator('#tab-rag-data-quality').evaluate(el => {
    const html = el.innerHTML;
    const inputs = el.querySelectorAll('input, select');
    const inputIds = Array.from(inputs).map((inp: any) => inp.id || inp.name).filter(Boolean);
    return {
      hasSemanticText: html.includes('Semantic'),
      totalInputs: inputs.length,
      sampleInputIds: inputIds.slice(0, 20),
    };
  });

  console.log('\n=== Semantic cards settings check ===');
  console.log(`Total inputs/selects: ${semanticCheck.totalInputs}`);
  console.log('Sample input IDs:', JSON.stringify(semanticCheck.sampleInputIds, null, 2));
});
