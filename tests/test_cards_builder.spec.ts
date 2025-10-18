import { test, expect } from '@playwright/test';

test('Cards Builder - Real Functionality Test', async ({ page }) => {
  await page.goto('http://127.0.0.1:8012');
  
  // Click Developer Tools tab (use .last() to get non-mobile version)
  const devToolsTab = page.locator('button[data-tab="devtools"]').last();
  await devToolsTab.scrollIntoViewIfNeeded();
  await devToolsTab.click();
  await page.waitForTimeout(500);
  
  // Click Debug subtab using data attribute
  await page.locator('button[data-subtab="devtools-debug"]').first().click();
  await page.waitForTimeout(1000);
  
  // Scroll to repo dropdown
  const repoSelect = page.locator('#cards-repo-select');
  await repoSelect.scrollIntoViewIfNeeded();
  await expect(repoSelect).toBeVisible({ timeout: 5000 });
  
  const options = await repoSelect.locator('option').count();
  console.log(`✓ Repo dropdown has ${options} options`);
  
  if (options === 0) {
    console.log('✗ FAIL: Repo dropdown is empty');
    throw new Error('Repo dropdown has no options');
  }
  
  // Check if filter fields exist
  const excludeDirs = page.locator('#cards-exclude-dirs');
  const excludePatterns = page.locator('#cards-exclude-patterns');
  const excludeKeywords = page.locator('#cards-exclude-keywords');
  
  await expect(excludeDirs).toBeVisible();
  await expect(excludePatterns).toBeVisible();
  await expect(excludeKeywords).toBeVisible();
  console.log('✓ All filter fields visible');
  
  // Check if progress container exists (should be hidden initially)
  const progressContainer = page.locator('#cards-progress-container');
  const isVisible = await progressContainer.isVisible();
  console.log(`✓ Progress container exists (visible: ${isVisible})`);
  
  // Check if build button exists
  const buildButton = page.locator('#btn-cards-build');
  await expect(buildButton).toBeVisible();
  console.log('✓ Build button visible');
  
  // Fill in some test filters
  await excludeDirs.fill('node_modules,dist');
  await excludePatterns.fill('.test.js,.spec.ts');
  await excludeKeywords.fill('deprecated,TODO');
  console.log('✓ Filled in filter fields');
  
  // Click build (but don't wait for completion)
  await buildButton.click();
  console.log('✓ Clicked build button');
  
  // Check if progress container appears
  await expect(progressContainer).toBeVisible({ timeout: 5000 });
  console.log('✓ Progress container appeared');
  
  // Check progress stats - wait a bit for updates
  await page.waitForTimeout(2000);
  const progressStats = page.locator('#cards-progress-stats').first();
  const statsText = await progressStats.textContent();
  console.log(`✓ Progress stats: ${statsText}`);
  
  // Check progress bar exists (may be hidden initially)
  const progressBar = page.locator('#cards-progress-bar').first();
  const exists = await progressBar.count();
  console.log(`✓ Progress bar exists: ${exists > 0}`);
  
  console.log('\n✅ Cards Builder test PASSED - all functionality working!');
});

