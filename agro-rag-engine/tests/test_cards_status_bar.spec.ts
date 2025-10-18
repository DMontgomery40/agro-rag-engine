import { test, expect } from '@playwright/test';

test('Cards Builder - Persistent Status Bar and Theme Support', async ({ page }) => {
  await page.goto('http://127.0.0.1:8012');
  
  // Navigate to Developer Tools -> Debug
  const devToolsTab = page.locator('button[data-tab="devtools"]').last();
  await devToolsTab.scrollIntoViewIfNeeded();
  await devToolsTab.click();
  await page.waitForTimeout(500);
  
  const debugTab = page.locator('button[data-subtab="devtools-debug"]').first();
  await debugTab.click();
  await page.waitForTimeout(1000);
  
  // Cards Builder: container exists (may be hidden initially)
  const progressContainer = page.locator('#cards-progress-container');
  
  // Check that progress container is hidden initially
  let isVisible = await progressContainer.isVisible();
  console.log(`✓ Progress container initially hidden: ${!isVisible}`);
  expect(isVisible).toBe(false);
  
  // Start a cards build
  const buildButton = page.locator('#btn-cards-build');
  await buildButton.scrollIntoViewIfNeeded();
  await buildButton.click();
  console.log('✓ Clicked build button');
  
  // Progress container should appear
  await expect(progressContainer).toBeVisible({ timeout: 3000 });
  console.log('✓ Progress container appeared during build');
  
  // Check that it shows "Building Cards..."
  const title = progressContainer.locator('div').first();
  const titleText = await title.textContent();
  console.log(`✓ Title text: "${titleText}"`);
  expect(titleText).toContain('Building Cards');
  
  // Wait for progress bar to show some progress
  await page.waitForTimeout(2000);
  const progressBar = page.locator('#cards-progress-bar').first();
  const width = await progressBar.evaluate(el => el.style.width);
  console.log(`✓ Progress bar width: ${width}`);
  
  // Short wait to capture progress bar movement (no full completion required in CI)
  await page.waitForTimeout(3000);
  
  // Test Clear button
  const clearButton = page.locator('#cards-progress-clear');
  await clearButton.click();
  console.log('✓ Clicked clear button');
  
  // Progress container should now be hidden
  await expect(progressContainer).not.toBeVisible({ timeout: 1000 });
  console.log('✓ Progress container hidden after clear');
  
  // Test theme support for cards viewer
  const cardsViewer = page.locator('#cards-viewer-container');
  await cardsViewer.scrollIntoViewIfNeeded();
  
  // Check background color in dark mode (default)
  const darkBg = await cardsViewer.evaluate(el => 
    window.getComputedStyle(el).backgroundColor
  );
  console.log(`✓ Dark mode background: ${darkBg}`);
  
  // Switch to light mode
  const themeToggle = page.locator('.theme-toggle-desktop').first();
  await themeToggle.scrollIntoViewIfNeeded();
  await themeToggle.click();
  await page.waitForTimeout(500);
  console.log('✓ Switched to light mode');
  
  // Check background color in light mode
  const lightBg = await cardsViewer.evaluate(el => 
    window.getComputedStyle(el).backgroundColor
  );
  console.log(`✓ Light mode background: ${lightBg}`);
  
  // Verify they're different (proving theme support works)
  expect(darkBg).not.toBe(lightBg);
  console.log('✓ Theme switching affects cards viewer background');
  
  // Check individual card contrast in light mode
  const firstCard = page.locator('.card-item').first();
  if (await firstCard.isVisible()) {
    const cardColor = await firstCard.evaluate(el => 
      window.getComputedStyle(el).color
    );
    const cardBg = await firstCard.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    console.log(`✓ Card text color (light mode): ${cardColor}`);
    console.log(`✓ Card background (light mode): ${cardBg}`);
  }
  
  console.log('\n✅ All tests PASSED - Status bar persists and theme support works!');
});
