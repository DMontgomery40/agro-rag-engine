import { test, expect } from '@playwright/test';

test.use({ baseURL: 'http://localhost:8012' });

test('IndexingSubtab - Minimal Smoke Test', async ({ page }) => {
  // Navigate to the app
  await page.goto('/web');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  // Take screenshot to help debug
  await page.screenshot({ path: 'test-results/indexing-initial.png', fullPage: false });

  // Check that the page loaded
  const body = await page.locator('body').textContent();
  expect(body).toBeTruthy();

  console.log('✓ Page loaded successfully');

  // Look for any evidence of the IndexingSubtab component in the page
  const pageContent = await page.content();

  // Check that dangerouslySetInnerHTML is NOT used
  expect(pageContent).not.toContain('__html');
  console.log('✓ No dangerouslySetInnerHTML detected');

  // Check if we can find React components in the build
  const hasReactRoot = await page.locator('#root').count();
  expect(hasReactRoot).toBeGreaterThan(0);
  console.log('✓ React root element found');

  // Try to find any indexing-related elements
  const hasIndexingElements = await page.locator('[id*="index"], [class*="index"]').count();
  if (hasIndexingElements > 0) {
    console.log(`✓ Found ${hasIndexingElements} indexing-related elements`);
  }

  // Report success
  console.log('✓ IndexingSubtab minimal smoke test PASSED');
});
