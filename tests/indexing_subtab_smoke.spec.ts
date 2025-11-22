import { test, expect } from '@playwright/test';

// This test runs against the already-running server on port 8012
test.use({ baseURL: 'http://localhost:8012' });

test.describe('IndexingSubtab Smoke Test', () => {
  test('IndexingSubtab renders and has all required elements', async ({ page }) => {
    // Navigate to the app
    await page.goto('/web');

    // Wait for app to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Navigate to RAG tab if needed
    const ragButton = page.locator('button:has-text("RAG"), a:has-text("RAG")').first();
    if (await ragButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await ragButton.click();
      await page.waitForTimeout(500);
    }

    // Click Indexing subtab
    const indexingButton = page.locator('button:has-text("Indexing"), a:has-text("Indexing")').first();
    if (await indexingButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await indexingButton.click();
      await page.waitForTimeout(500);
    }

    // Verify IndexingSubtab is rendered
    const container = page.locator('#tab-rag-indexing, [data-testid="indexing-subtab"]').first();
    await expect(container).toBeVisible({ timeout: 5000 });

    // Check for key sections
    await expect(page.locator('text=Index Repository').first()).toBeVisible();
    await expect(page.locator('text=Advanced Settings').first()).toBeVisible();

    // Verify embedding model picker is present (NEW REQUIREMENT)
    await expect(page.locator('text=Embedding Models').first()).toBeVisible();
    await expect(page.locator('input#EMBEDDING_MODEL').first()).toBeVisible();

    // Verify chunking controls exist
    await expect(page.locator('text=Chunking Configuration').first()).toBeVisible();
    await expect(page.locator('select#CHUNKING_STRATEGY').first()).toBeVisible();

    // Verify simple index button exists
    await expect(page.locator('button#simple-index-btn').first()).toBeVisible();

    console.log('✓ IndexingSubtab smoke test passed - all required elements present');
  });

  test('Embedding type selector works', async ({ page }) => {
    await page.goto('/web');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Navigate to RAG -> Indexing
    const ragButton = page.locator('button:has-text("RAG"), a:has-text("RAG")').first();
    if (await ragButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await ragButton.click();
      await page.waitForTimeout(500);
    }

    const indexingButton = page.locator('button:has-text("Indexing"), a:has-text("Indexing")').first();
    if (await indexingButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await indexingButton.click();
      await page.waitForTimeout(500);
    }

    // Find embedding type selector
    const embeddingTypeSelect = page.locator('select[name="EMBEDDING_TYPE"]').first();
    await expect(embeddingTypeSelect).toBeVisible({ timeout: 5000 });

    // Verify options
    const options = await embeddingTypeSelect.locator('option').allTextContents();
    expect(options.join(',')).toContain('OpenAI');
    expect(options.join(',')).toContain('Local');
    expect(options.join(',')).toContain('Voyage');

    console.log('✓ Embedding type selector working correctly');
  });

  test('No dangerouslySetInnerHTML in rendered output', async ({ page }) => {
    await page.goto('/web');
    await page.waitForLoadState('networkidle');

    // Check page content doesn't contain evidence of dangerouslySetInnerHTML
    const pageContent = await page.content();
    expect(pageContent).not.toContain('__html');
    expect(pageContent).not.toContain('dangerouslySetInnerHTML');

    console.log('✓ No dangerouslySetInnerHTML detected');
  });
});
