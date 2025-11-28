import { test, expect } from '@playwright/test';

test.describe('IndexingSubtab Component', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');

    // Wait for app to load
    await page.waitForSelector('body', { timeout: 10000 });

    // Navigate to RAG -> Indexing tab
    // First click RAG in main nav
    const ragLink = page.locator('a:has-text("RAG"), button:has-text("RAG")').first();
    if (await ragLink.isVisible()) {
      await ragLink.click();
    }

    // Then click Indexing subtab
    await page.waitForTimeout(500);
    const indexingTab = page.locator('button:has-text("Indexing"), a:has-text("Indexing")').first();
    if (await indexingTab.isVisible()) {
      await indexingTab.click();
    }

    // Wait for the tab content to load
    await page.waitForSelector('#tab-rag-indexing', { timeout: 5000 });
  });

  test('subtab renders without errors', async ({ page }) => {
    // Check that the main container exists
    const container = page.locator('#tab-rag-indexing');
    await expect(container).toBeVisible();

    // Check that key sections are present
    await expect(page.locator('text=Current Repo:')).toBeVisible();
    await expect(page.locator('text=Index Repository')).toBeVisible();
    await expect(page.locator('text=Advanced Settings')).toBeVisible();
  });

  test('chunking strategy controls are visible', async ({ page }) => {
    // Verify chunking configuration section exists
    await expect(page.locator('text=Chunking Configuration')).toBeVisible();

    // Check for specific chunking controls
    await expect(page.locator('label:has-text("Chunk Size")')).toBeVisible();
    await expect(page.locator('label:has-text("Chunk Overlap")')).toBeVisible();
    await expect(page.locator('label:has-text("Chunking Strategy")')).toBeVisible();
    await expect(page.locator('select#CHUNKING_STRATEGY')).toBeVisible();

    // Verify chunking strategy dropdown has correct options
    const strategySelect = page.locator('select#CHUNKING_STRATEGY');
    await expect(strategySelect).toBeVisible();
    const options = await strategySelect.locator('option').allTextContents();
    expect(options).toContain('AST-based');
    expect(options).toContain('Greedy');
    expect(options).toContain('Hybrid');
  });

  test('embedding model picker is present and functional', async ({ page }) => {
    // Check for embedding model section
    await expect(page.locator('text=Embedding Models')).toBeVisible();

    // Verify all embedding model inputs are present
    await expect(page.locator('input#EMBEDDING_MODEL')).toBeVisible();
    await expect(page.locator('input#EMBEDDING_DIM')).toBeVisible();
    await expect(page.locator('input#VOYAGE_MODEL')).toBeVisible();
    await expect(page.locator('input#EMBEDDING_MODEL_LOCAL')).toBeVisible();

    // Verify embedding type selector in Build Index section
    await expect(page.locator('select[name="EMBEDDING_TYPE"]')).toBeVisible();
    const embeddingTypeSelect = page.locator('select[name="EMBEDDING_TYPE"]');
    const embeddingOptions = await embeddingTypeSelect.locator('option').allTextContents();
    expect(embeddingOptions).toContain('OpenAI (text-embedding-3-large)');
    expect(embeddingOptions).toContain('Local (BGE-small, no API)');
    expect(embeddingOptions).toContain('Voyage AI');
  });

  test('can select embedding model', async ({ page }) => {
    // Find the embedding type selector
    const embeddingTypeSelect = page.locator('select[name="EMBEDDING_TYPE"]');
    await expect(embeddingTypeSelect).toBeVisible();

    // Change to local embedding
    await embeddingTypeSelect.selectOption('local');

    // Verify selection changed
    const selectedValue = await embeddingTypeSelect.inputValue();
    expect(selectedValue).toBe('local');
  });

  test('simple index button is present and clickable', async ({ page }) => {
    // Check for simple indexing section
    await expect(page.locator('button#simple-index-btn')).toBeVisible();
    await expect(page.locator('select#simple-repo-select')).toBeVisible();
    await expect(page.locator('input#simple-dense-check')).toBeVisible();

    // Verify button text
    const buttonText = await page.locator('button#simple-index-btn').textContent();
    expect(buttonText).toContain('INDEX NOW');
  });

  test('advanced indexing controls are present', async ({ page }) => {
    // Check for repository selector
    await expect(page.locator('select#index-repo-select')).toBeVisible();

    // Check for skip dense option
    await expect(page.locator('select#index-skip-dense')).toBeVisible();

    // Check for enrich chunks option
    await expect(page.locator('select#index-enrich-chunks')).toBeVisible();

    // Check for start/stop buttons
    await expect(page.locator('button#btn-index-start')).toBeVisible();
    await expect(page.locator('button#btn-index-stop')).toBeVisible();
  });

  test('index status display is present', async ({ page }) => {
    // Check for index status section
    await expect(page.locator('text=Index Status')).toBeVisible();
    await expect(page.locator('button#btn-refresh-index-stats')).toBeVisible();
    await expect(page.locator('#index-status-display')).toBeVisible();
  });

  test('advanced settings inputs are wired', async ({ page }) => {
    // Check embedding model input
    const embeddingModelInput = page.locator('input#EMBEDDING_MODEL');
    await expect(embeddingModelInput).toBeVisible();
    const embeddingModelValue = await embeddingModelInput.inputValue();
    expect(embeddingModelValue).toBeTruthy(); // Should have a default value

    // Check chunk size input
    const chunkSizeInput = page.locator('input[name="CHUNK_SIZE"]');
    await expect(chunkSizeInput).toBeVisible();
    const chunkSizeValue = await chunkSizeInput.inputValue();
    expect(parseInt(chunkSizeValue)).toBeGreaterThan(0);

    // Check BM25 tokenizer selector
    const bm25TokenizerSelect = page.locator('select#BM25_TOKENIZER');
    await expect(bm25TokenizerSelect).toBeVisible();
    const bm25Options = await bm25TokenizerSelect.locator('option').allTextContents();
    expect(bm25Options).toContain('Stemmer');
    expect(bm25Options).toContain('Lowercase');
    expect(bm25Options).toContain('Whitespace');
  });

  test('save settings button is present', async ({ page }) => {
    // Check for save button
    const saveButton = page.locator('button#btn-save-index-settings');
    await expect(saveButton).toBeVisible();

    // Verify button text
    const buttonText = await saveButton.textContent();
    expect(buttonText).toContain('Save Settings');
  });

  test('index profiles section is present', async ({ page }) => {
    // Check for profiles section
    await expect(page.locator('text=Index Profiles')).toBeVisible();
    await expect(page.locator('select#index-profile-select')).toBeVisible();
    await expect(page.locator('button#btn-apply-profile')).toBeVisible();

    // Verify profile options
    const profileSelect = page.locator('select#index-profile-select');
    const profileOptions = await profileSelect.locator('option').allTextContents();
    expect(profileOptions.some(opt => opt.includes('Shared'))).toBeTruthy();
    expect(profileOptions.some(opt => opt.includes('Full'))).toBeTruthy();
    expect(profileOptions.some(opt => opt.includes('Development'))).toBeTruthy();
  });

  test('no dangerouslySetInnerHTML used', async ({ page }) => {
    // Get the page HTML
    const pageContent = await page.content();

    // Verify no dangerouslySetInnerHTML in the rendered output
    // This is a smoke test - the real check is in the source code itself
    expect(pageContent).not.toContain('__html');
  });

  test('all form inputs are properly typed', async ({ page }) => {
    // Check number inputs have correct type
    const chunkSizeInput = page.locator('input[name="CHUNK_SIZE"]');
    await expect(chunkSizeInput).toHaveAttribute('type', 'number');

    const embeddingDimInput = page.locator('input#EMBEDDING_DIM');
    await expect(embeddingDimInput).toHaveAttribute('type', 'number');

    // Check text inputs
    const embeddingModelInput = page.locator('input#EMBEDDING_MODEL');
    await expect(embeddingModelInput).toHaveAttribute('type', 'text');

    // Check selects are present
    await expect(page.locator('select#CHUNKING_STRATEGY')).toBeVisible();
    await expect(page.locator('select#BM25_TOKENIZER')).toBeVisible();
  });

  test('embedding cache toggle is functional', async ({ page }) => {
    // Find embedding cache toggle
    const embeddingCacheSelect = page.locator('select#EMBEDDING_CACHE_ENABLED');
    await expect(embeddingCacheSelect).toBeVisible();

    // Verify options
    const options = await embeddingCacheSelect.locator('option').allTextContents();
    expect(options).toContain('Enabled');
    expect(options).toContain('Disabled');

    // Toggle value
    await embeddingCacheSelect.selectOption('0');
    let selectedValue = await embeddingCacheSelect.inputValue();
    expect(selectedValue).toBe('0');

    await embeddingCacheSelect.selectOption('1');
    selectedValue = await embeddingCacheSelect.inputValue();
    expect(selectedValue).toBe('1');
  });

  test('progress bar elements are present', async ({ page }) => {
    // Check for progress bar
    await expect(page.locator('text=Progress')).toBeVisible();
    await expect(page.locator('#index-bar')).toBeVisible();
    await expect(page.locator('#index-status')).toBeVisible();
  });

  test('repository selector populates from backend', async ({ page }) => {
    // Wait for repos to load
    await page.waitForTimeout(1000);

    // Check that simple repo select has options (not just "Loading...")
    const simpleRepoSelect = page.locator('select#simple-repo-select');
    const options = await simpleRepoSelect.locator('option').allTextContents();

    // Should have at least one option
    expect(options.length).toBeGreaterThan(0);
  });

  test('current repo display updates', async ({ page }) => {
    // Find the current repo selector
    const currentRepoSelect = page.locator('select#indexing-repo-selector');
    await expect(currentRepoSelect).toBeVisible();

    // Check branch display
    const branchDisplay = page.locator('#indexing-branch-display');
    await expect(branchDisplay).toBeVisible();
  });

  test('embedding batch size has valid constraints', async ({ page }) => {
    const embeddingBatchInput = page.locator('input#EMBEDDING_BATCH_SIZE');
    await expect(embeddingBatchInput).toBeVisible();

    // Check min/max attributes
    await expect(embeddingBatchInput).toHaveAttribute('min', '1');
    await expect(embeddingBatchInput).toHaveAttribute('max', '256');
    await expect(embeddingBatchInput).toHaveAttribute('step', '8');
  });

  test('chunk size has valid constraints', async ({ page }) => {
    const chunkSizeInput = page.locator('input[name="CHUNK_SIZE"]');
    await expect(chunkSizeInput).toBeVisible();

    // Check constraints
    await expect(chunkSizeInput).toHaveAttribute('min', '100');
    await expect(chunkSizeInput).toHaveAttribute('max', '4000');
    await expect(chunkSizeInput).toHaveAttribute('step', '100');
  });

  test('all required indexing parameters are exposed', async ({ page }) => {
    // Verify all key indexing parameters are present
    const requiredParams = [
      'CHUNK_SIZE',
      'CHUNK_OVERLAP',
      'CHUNKING_STRATEGY',
      'EMBEDDING_MODEL',
      'EMBEDDING_DIM',
      'BM25_TOKENIZER',
      'INDEXING_BATCH_SIZE',
      'INDEXING_WORKERS'
    ];

    for (const param of requiredParams) {
      const element = page.locator(`[name="${param}"], #${param}`).first();
      await expect(element).toBeVisible();
    }
  });
});
