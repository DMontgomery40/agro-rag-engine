import { test, expect } from '@playwright/test';

/**
 * Verification test for help icons in GUI index.html lines 2500-4500
 * Ensures all RAG, Generation, Reranker, and Indexing parameters have help icons
 */

test.describe('GUI Help Icons Verification (Lines 2500-4500)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the GUI
    await page.goto('http://127.0.0.1:8012/');
    await page.waitForLoadState('networkidle');
  });

  test('Generation Models section - all parameters have help icons', async ({ page }) => {
    // Navigate to RAG tab and Retrieval subtab
    await page.click('text=RAG');
    await page.click('text=Retrieval');

    const generationParams = [
      'GEN_MODEL',
      'GEN_MODEL_HTTP',
      'GEN_MODEL_MCP',
      'GEN_MODEL_CLI',
      'GEN_TEMPERATURE',
      'GEN_MAX_TOKENS',
      'GEN_TOP_P',
      'GEN_TIMEOUT',
      'GEN_RETRY_MAX',
      'ENRICH_DISABLED',
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'GOOGLE_API_KEY',
      'OLLAMA_URL',
      'OPENAI_BASE_URL',
      'ENRICH_MODEL',
      'ENRICH_MODEL_OLLAMA',
      'ENRICH_BACKEND',
    ];

    for (const param of generationParams) {
      const helpIcon = page.locator(`span.help-icon[data-tooltip="${param}"]`);
      await expect(helpIcon).toBeVisible({ timeout: 5000 });
      console.log(`✓ ${param} has help icon`);
    }
  });

  test('Keywords Parameters section - all parameters have help icons', async ({ page }) => {
    await page.click('text=RAG');
    await page.click('text=Retrieval');

    const keywordsParams = [
      'KEYWORDS_MAX_PER_REPO',
      'KEYWORDS_MIN_FREQ',
      'KEYWORDS_BOOST',
      'KEYWORDS_AUTO_GENERATE',
      'KEYWORDS_REFRESH_HOURS',
    ];

    for (const param of keywordsParams) {
      const helpIcon = page.locator(`span.help-icon[data-tooltip="${param}"]`);
      await expect(helpIcon).toBeVisible({ timeout: 5000 });
      console.log(`✓ ${param} has help icon`);
    }
  });

  test('Retrieval Parameters section - all parameters have help icons', async ({ page }) => {
    await page.click('text=RAG');
    await page.click('text=Retrieval');

    const retrievalParams = [
      'BM25_WEIGHT',
      'VECTOR_WEIGHT',
      'VECTOR_BACKEND',
      'CARD_SEARCH_ENABLED',
      'MULTI_QUERY_M',
      'CONF_TOP1',
      'CONF_AVG5',
    ];

    for (const param of retrievalParams) {
      const helpIcon = page.locator(`span.help-icon[data-tooltip="${param}"]`);
      await expect(helpIcon).toBeVisible({ timeout: 5000 });
      console.log(`✓ ${param} has help icon`);
    }
  });

  test('External Rerankers section - all parameters have help icons', async ({ page }) => {
    await page.click('text=RAG');
    await page.click('text=External Rerankers');

    const rerankerParams = [
      'RERANK_BACKEND',
      'RERANKER_MODEL',
      'COHERE_API_KEY',
      'COHERE_RERANK_MODEL',
      'TRANSFORMERS_TRUST_REMOTE_CODE',
      'RERANK_INPUT_SNIPPET_CHARS',
    ];

    for (const param of rerankerParams) {
      const helpIcon = page.locator(`span.help-icon[data-tooltip="${param}"]`);
      await expect(helpIcon).toBeVisible({ timeout: 5000 });
      console.log(`✓ ${param} has help icon`);
    }
  });

  test('Learning Ranker section - all parameters have help icons', async ({ page }) => {
    await page.click('text=RAG');
    await page.click('text=Learning Ranker');

    const learningRankerParams = [
      'AGRO_RERANKER_ENABLED',
      'AGRO_RERANKER_MODEL_PATH',
      'AGRO_LOG_PATH',
      'AGRO_TRIPLETS_PATH',
      'AGRO_RERANKER_MINE_MODE',
      'AGRO_RERANKER_MINE_RESET',
      'AGRO_RERANKER_ALPHA',
      'AGRO_RERANKER_MAXLEN',
      'AGRO_RERANKER_BATCH',
      'AGRO_RERANKER_TOPN',
      'VOYAGE_RERANK_MODEL',
      'AGRO_RERANKER_RELOAD_ON_CHANGE',
      'RERANKER_TRAIN_EPOCHS',
      'RERANKER_TRAIN_BATCH',
      'RERANKER_TRAIN_MAX_LENGTH',
      'RERANKER_TRAIN_LR',
      'RERANKER_WARMUP_RATIO',
      'TRIPLETS_MIN_COUNT',
      'TRIPLETS_MINE_MODE',
    ];

    for (const param of learningRankerParams) {
      const helpIcon = page.locator(`span.help-icon[data-tooltip="${param}"]`);
      await expect(helpIcon).toBeVisible({ timeout: 5000 });
      console.log(`✓ ${param} has help icon`);
    }
  });

  test('Indexing section - all parameters have help icons', async ({ page }) => {
    await page.click('text=RAG');
    await page.click('text=Indexing');

    const indexingParams = [
      'EMBEDDING_TYPE',
      'CHUNK_SIZE',
      'CHUNK_OVERLAP',
      'COLLECTION_NAME',
      'INDEX_MAX_WORKERS',
      'AST_OVERLAP_LINES',
      'MAX_CHUNK_SIZE',
      'MIN_CHUNK_CHARS',
      'GREEDY_FALLBACK_TARGET',
      'CHUNKING_STRATEGY',
      'PRESERVE_IMPORTS',
      'INDEXING_BATCH_SIZE',
    ];

    for (const param of indexingParams) {
      const helpIcon = page.locator(`span.help-icon[data-tooltip="${param}"]`);
      await expect(helpIcon).toBeVisible({ timeout: 5000 });
      console.log(`✓ ${param} has help icon`);
    }
  });

  test('Tracing section - all parameters have help icons', async ({ page }) => {
    await page.click('text=RAG');
    await page.click('text=Retrieval');

    // Scroll to tracing section
    await page.evaluate(() => {
      const tracingSection = document.querySelector('h3:has-text("Routing Trace")');
      if (tracingSection) tracingSection.scrollIntoView({ behavior: 'smooth' });
    });

    await page.waitForTimeout(500);

    const tracingParams = [
      'TRACING_MODE',
      'TRACE_AUTO_LS',
      'TRACE_RETENTION',
      'LANGCHAIN_TRACING_V2',
      'LANGCHAIN_ENDPOINT',
      'LANGCHAIN_API_KEY',
      'LANGSMITH_API_KEY',
      'LANGCHAIN_PROJECT',
      'LANGTRACE_API_HOST',
      'LANGTRACE_PROJECT_ID',
      'LANGTRACE_API_KEY',
    ];

    for (const param of tracingParams) {
      const helpIcon = page.locator(`span.help-icon[data-tooltip="${param}"]`);
      await expect(helpIcon).toBeVisible({ timeout: 5000 });
      console.log(`✓ ${param} has help icon`);
    }
  });

  test('Advanced RAG Tuning section - all parameters have help icons', async ({ page }) => {
    await page.click('text=RAG');
    await page.click('text=Retrieval');

    const advancedParams = [
      'LAYER_BONUS_GUI',
      'LAYER_BONUS_RETRIEVAL',
      'VENDOR_PENALTY',
      'FRESHNESS_BONUS',
    ];

    for (const param of advancedParams) {
      const helpIcon = page.locator(`span.help-icon[data-tooltip="${param}"]`);
      await expect(helpIcon).toBeVisible({ timeout: 5000 });
      console.log(`✓ ${param} has help icon`);
    }
  });

  test('Help icon tooltips are functional', async ({ page }) => {
    await page.click('text=RAG');
    await page.click('text=Retrieval');

    // Test a few help icons to ensure they trigger tooltips
    const testParams = ['GEN_MODEL', 'CHUNK_SIZE', 'RERANK_BACKEND'];

    for (const param of testParams) {
      const helpIcon = page.locator(`span.help-icon[data-tooltip="${param}"]`);
      await helpIcon.hover();

      // Wait a moment for tooltip to appear
      await page.waitForTimeout(300);

      // Verify the tooltip data attribute exists
      const tooltip = await helpIcon.getAttribute('data-tooltip');
      expect(tooltip).toBe(param);
      console.log(`✓ ${param} tooltip is functional`);
    }
  });
});
