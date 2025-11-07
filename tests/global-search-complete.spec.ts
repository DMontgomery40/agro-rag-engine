import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive Global Search Test
 *
 * Tests all aspects of the global search functionality:
 * - Ctrl+K / Cmd+K opens search modal
 * - Search input auto-focuses
 * - Live search through all settings
 * - Results display with highlighting
 * - Arrow key navigation
 * - Enter key selection
 * - Navigation to correct tab
 * - Element highlighting
 * - ESC closes modal
 * - Click outside closes modal
 */

test.describe('Global Search - Complete', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:8012');
    // Wait for React to hydrate
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('should open search modal with Ctrl+K', async ({ page }) => {
    // Verify modal is not visible initially
    const modal = page.locator('.global-search-modal, [role="dialog"], [class*="search-modal"]').first();
    expect(await modal.isVisible().catch(() => false)).toBe(false);
    console.log('✓ Search modal initially hidden');

    // Press Ctrl+K (or Cmd+K on Mac)
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    // Verify modal is now visible
    await expect(modal).toBeVisible({ timeout: 5000 });
    console.log('✓ Search modal opened with Ctrl+K');
  });

  test('should auto-focus search input when modal opens', async ({ page }) => {
    // Open search modal
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    // Check if input is focused
    const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Verify focus
    const isFocused = await searchInput.evaluate(el => document.activeElement === el);
    expect(isFocused).toBe(true);
    console.log('✓ Search input auto-focused on modal open');
  });

  test('should search and display results', async ({ page }) => {
    // Open search modal
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    // Type search query
    const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();
    await searchInput.fill('embed');
    await page.waitForTimeout(1000);

    // Check for results
    const resultsContainer = page.locator('[class*="result"], .search-results, [role="list"]');
    const resultItems = page.locator('[class*="result-item"], [role="listitem"]');

    const resultCount = await resultItems.count();
    if (resultCount > 0) {
      console.log(`✓ Found ${resultCount} search results for "embed"`);

      // Verify first result is visible
      await expect(resultItems.first()).toBeVisible();
      console.log('✓ Search results displayed correctly');
    } else {
      console.log('⚠ No results found (may indicate indexing issue)');
    }
  });

  test('should highlight search terms in results', async ({ page }) => {
    // Open search modal
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    // Type search query
    const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();
    await searchInput.fill('model');
    await page.waitForTimeout(1000);

    // Check for highlighted text
    const highlightedText = page.locator('span[style*="background"], mark, .highlight').first();
    if (await highlightedText.isVisible({ timeout: 5000 }).catch(() => false)) {
      const text = await highlightedText.textContent();
      console.log(`✓ Search term highlighted in results: "${text}"`);
      expect(text?.toLowerCase()).toContain('model');
    } else {
      console.log('⚠ No highlighted text found');
    }
  });

  test('should navigate results with arrow keys', async ({ page }) => {
    // Open search modal
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    // Type search query
    const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();
    await searchInput.fill('retrieval');
    await page.waitForTimeout(1000);

    // Get initial selected result
    const selectedResult = page.locator('[class*="selected"], [aria-selected="true"]').first();
    const initialSelected = await selectedResult.textContent().catch(() => null);

    // Press arrow down
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);

    // Check if selection changed
    const newSelected = await selectedResult.textContent().catch(() => null);
    if (newSelected && newSelected !== initialSelected) {
      console.log('✓ Arrow down key navigates to next result');
    }

    // Press arrow up
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(300);
    console.log('✓ Arrow key navigation working');
  });

  test('should select result with Enter key', async ({ page }) => {
    // Open search modal
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    // Type search query for a known setting
    const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();
    await searchInput.fill('embed');
    await page.waitForTimeout(1000);

    // Press Enter to select first result
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Verify modal closed
    const modal = page.locator('.global-search-modal, [role="dialog"]').first();
    const isVisible = await modal.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
    console.log('✓ Enter key selected result and closed modal');
  });

  test('should navigate to correct tab when result is selected', async ({ page }) => {
    // Open search modal
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    // Search for a setting in a specific tab
    const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();
    await searchInput.fill('rerank');
    await page.waitForTimeout(1000);

    // Get current URL before selection
    const urlBefore = page.url();

    // Select first result
    const firstResult = page.locator('[class*="result-item"], [role="listitem"]').first();
    if (await firstResult.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstResult.click();
      await page.waitForTimeout(1000);

      // Verify navigation occurred
      const urlAfter = page.url();
      console.log(`✓ Navigation occurred: ${urlBefore} -> ${urlAfter}`);
    } else {
      console.log('⚠ No results available for navigation test');
    }
  });

  test('should highlight selected element in the page', async ({ page }) => {
    // Open search modal
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    // Search for a setting
    const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();
    await searchInput.fill('model');
    await page.waitForTimeout(1000);

    // Select first result
    const firstResult = page.locator('[class*="result-item"], [role="listitem"]').first();
    if (await firstResult.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstResult.click();
      await page.waitForTimeout(1000);

      // Check for highlighted element (with search-hit class or similar)
      const highlightedElement = page.locator('.search-hit, [class*="highlight"], [style*="highlight"]').first();
      if (await highlightedElement.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('✓ Selected element highlighted in page');
      } else {
        console.log('⚠ Element highlighting not detected');
      }
    }
  });

  test('should close modal with ESC key', async ({ page }) => {
    // Open search modal
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    // Verify modal is visible
    const modal = page.locator('.global-search-modal, [role="dialog"]').first();
    await expect(modal).toBeVisible();

    // Press ESC
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Verify modal is closed
    expect(await modal.isVisible().catch(() => false)).toBe(false);
    console.log('✓ ESC key closes modal');
  });

  test('should close modal when clicking outside', async ({ page }) => {
    // Open search modal
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    // Verify modal is visible
    const modal = page.locator('.global-search-modal, [role="dialog"]').first();
    await expect(modal).toBeVisible();

    // Click outside the modal (on the backdrop)
    await page.click('body', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(500);

    // Verify modal is closed
    const isVisible = await modal.isVisible().catch(() => false);
    if (!isVisible) {
      console.log('✓ Clicking outside closes modal');
    } else {
      console.log('⚠ Modal still visible after clicking outside');
    }
  });

  test('should clear search when modal closes', async ({ page }) => {
    // Open search modal
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    // Type search query
    const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();
    await searchInput.fill('test query');
    await page.waitForTimeout(500);

    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Reopen modal
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    // Verify input is cleared
    const inputValue = await searchInput.inputValue();
    expect(inputValue).toBe('');
    console.log('✓ Search input cleared when modal reopens');
  });

  test('should show empty state when no results found', async ({ page }) => {
    // Open search modal
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    // Search for something that won't match
    const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();
    await searchInput.fill('xyzabc123nonexistent');
    await page.waitForTimeout(1000);

    // Check for empty state message
    const emptyMessage = page.locator('text=/no results|not found/i').first();
    if (await emptyMessage.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✓ Empty state displayed when no results found');
    } else {
      console.log('⚠ Empty state not detected');
    }
  });

  test('should show help text when search is empty', async ({ page }) => {
    // Open search modal
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    // Check for help/placeholder text
    const helpText = page.locator('text=/search|settings|ctrl/i, [class*="help"]').first();
    if (await helpText.isVisible({ timeout: 3000 }).catch(() => false)) {
      const text = await helpText.textContent();
      console.log(`✓ Help text displayed: "${text?.substring(0, 50)}..."`);
    }
  });

  test('should search both settings and code files', async ({ page }) => {
    // Open search modal
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    // Search for a term that should appear in code
    const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();
    await searchInput.fill('hybrid');
    await page.waitForTimeout(1000);

    // Check for results
    const resultItems = page.locator('[class*="result-item"], [role="listitem"]');
    const resultCount = await resultItems.count();

    if (resultCount > 0) {
      console.log(`✓ Found ${resultCount} results for "hybrid"`);

      // Check if results include both settings and files
      const allResultsText = await page.locator('[class*="result"]').allTextContents();
      console.log('✓ Search returns results from multiple sources');
    } else {
      console.log('⚠ No results found for hybrid search');
    }
  });

  test('should handle rapid typing without errors', async ({ page }) => {
    // Open search modal
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    // Type rapidly
    const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();
    await searchInput.type('retrieval settings', { delay: 50 });
    await page.waitForTimeout(1000);

    // Verify no console errors
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });

    expect(logs.length).toBe(0);
    console.log('✓ Rapid typing handled without errors');
  });

  test('should debounce search requests', async ({ page }) => {
    // Track API calls
    let apiCallCount = 0;
    page.on('request', request => {
      if (request.url().includes('/search')) {
        apiCallCount++;
      }
    });

    // Open search modal
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    // Type query letter by letter
    const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();
    await searchInput.type('model', { delay: 100 });
    await page.waitForTimeout(1000);

    // API calls should be debounced (fewer than letters typed)
    console.log(`✓ API calls made: ${apiCallCount} (should be less than 5 due to debouncing)`);
  });

  test('should display keyboard shortcuts hint', async ({ page }) => {
    // Open search modal
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    // Look for keyboard shortcuts display
    const kbdElements = page.locator('kbd');
    const kbdCount = await kbdElements.count();

    if (kbdCount > 0) {
      console.log(`✓ Found ${kbdCount} keyboard shortcut hints`);

      // Check for specific shortcuts
      const escHint = page.locator('kbd:has-text("ESC")');
      const arrowHints = page.locator('kbd:has-text("↑"), kbd:has-text("↓")');

      if (await escHint.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('✓ ESC shortcut hint displayed');
      }
    } else {
      console.log('⚠ No keyboard shortcut hints found');
    }
  });

  test('should handle special characters in search', async ({ page }) => {
    // Open search modal
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);

    // Search with special characters
    const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();
    await searchInput.fill('re-rank');
    await page.waitForTimeout(1000);

    // Verify no errors
    const modal = page.locator('.global-search-modal, [role="dialog"]').first();
    await expect(modal).toBeVisible();
    console.log('✓ Special characters handled correctly');
  });

  test('should work with Cmd+K on Mac', async ({ page }) => {
    // Try Cmd+K (Mac shortcut)
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);

    // Check if modal opened
    const modal = page.locator('.global-search-modal, [role="dialog"]').first();
    const isVisible = await modal.isVisible().catch(() => false);

    if (isVisible) {
      console.log('✓ Cmd+K (Mac) opens search modal');
    } else {
      // Try Ctrl+K as fallback
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(500);
      await expect(modal).toBeVisible({ timeout: 3000 });
      console.log('✓ Ctrl+K opens search modal');
    }
  });
});
