import { test, expect } from '@playwright/test';

test('Simple Index Button - REAL TEST', async ({ page }) => {
  await page.goto('http://127.0.0.1:8012');
  
  // Click Data & Indexing tab via JavaScript (UI is fucked)
  await page.evaluate(() => {
    const btn = document.querySelector('button[data-tab="data"]');
    if (btn) btn.click();
  });
  await page.waitForTimeout(2000);
  
  // Check if simple button exists
  const simpleBtn = page.locator('#simple-index-btn');
  await expect(simpleBtn).toBeVisible({ timeout: 5000 });
  console.log('✓ Simple index button is visible');
  
  // Check if repo dropdown exists and has options
  const repoSelect = page.locator('#simple-repo-select');
  await expect(repoSelect).toBeVisible();
  await page.waitForTimeout(1000);
  
  const options = await repoSelect.locator('option').count();
  console.log(`✓ Repo dropdown has ${options} options`);
  
  if (options === 0 || (options === 1 && await repoSelect.locator('option').first().textContent() === 'Loading...')) {
    console.log('✗ FAIL: Dropdown is empty or still showing "Loading..."');
    throw new Error('Repo dropdown not populated');
  }
  
  // Check dense checkbox
  const denseCheck = page.locator('#simple-dense-check');
  await expect(denseCheck).toBeVisible();
  await expect(denseCheck).toBeChecked();
  console.log('✓ Dense embeddings checkbox is visible and checked');
  
  // Check output element exists (should be hidden)
  const output = page.locator('#simple-output');
  const outputExists = await output.count();
  console.log(`✓ Output element exists: ${outputExists > 0}`);
  
  // Click the button to start indexing
  await simpleBtn.click();
  console.log('✓ Clicked index button');
  
  // Wait for button to change text
  await page.waitForTimeout(1000);
  const btnText = await simpleBtn.textContent();
  console.log(`Button text after click: "${btnText}"`);
  
  // Check if output appears
  await page.waitForTimeout(2000);
  const outputVisible = await output.isVisible();
  console.log(`✓ Output visible after 2s: ${outputVisible}`);
  
  if (outputVisible) {
    const outputText = await output.textContent();
    console.log(`Output content (first 200 chars): ${outputText?.substring(0, 200)}`);
  }
  
  console.log('\n✅ Simple Index Button test COMPLETE');
});

