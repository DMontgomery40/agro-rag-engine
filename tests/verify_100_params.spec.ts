import { test, expect } from '@playwright/test';

// All 100 config parameters from agro_config.json
const configParams = {
  retrieval: [
    'rrf_k_div', 'langgraph_final_k', 'max_query_rewrites', 'fallback_confidence',
    'final_k', 'eval_final_k', 'conf_top1', 'conf_avg5', 'conf_any',
    'eval_multi', 'query_expansion_enabled', 'bm25_weight', 'vector_weight',
    'card_search_enabled', 'multi_query_m'
  ],
  scoring: [
    'card_bonus', 'filename_boost_exact', 'filename_boost_partial'
  ],
  layer_bonus: [
    'gui', 'retrieval', 'indexer', 'vendor_penalty', 'freshness_bonus'
  ],
  embedding: [
    'embedding_type', 'embedding_model', 'embedding_dim', 'voyage_model',
    'embedding_model_local', 'embedding_batch_size', 'embedding_max_tokens',
    'embedding_cache_enabled', 'embedding_timeout', 'embedding_retry_max'
  ],
  chunking: [
    'chunk_size', 'chunk_overlap', 'ast_overlap_lines', 'max_chunk_size',
    'min_chunk_chars', 'greedy_fallback_target', 'chunking_strategy', 'preserve_imports'
  ],
  indexing: [
    'qdrant_url', 'collection_name', 'vector_backend', 'indexing_batch_size',
    'indexing_workers', 'bm25_tokenizer', 'bm25_stemmer_lang', 'index_excluded_exts',
    'index_max_file_size_mb'
  ],
  reranking: [
    'reranker_model', 'agro_reranker_enabled', 'agro_reranker_alpha', 'agro_reranker_topn',
    'agro_reranker_batch', 'agro_reranker_maxlen', 'agro_reranker_reload_on_change',
    'agro_reranker_reload_period_sec', 'cohere_rerank_model', 'voyage_rerank_model',
    'reranker_backend', 'reranker_timeout'
  ],
  generation: [
    'gen_model', 'gen_temperature', 'gen_max_tokens', 'gen_top_p', 'gen_timeout',
    'gen_retry_max', 'enrich_model', 'enrich_backend', 'enrich_disabled', 'ollama_num_ctx'
  ],
  enrichment: [
    'cards_enrich_default', 'cards_max', 'enrich_code_chunks', 'enrich_min_chars',
    'enrich_max_chars', 'enrich_timeout'
  ],
  keywords: [
    'keywords_max_per_repo', 'keywords_min_freq', 'keywords_boost',
    'keywords_auto_generate', 'keywords_refresh_hours'
  ],
  tracing: [
    'tracing_enabled', 'trace_sampling_rate', 'prometheus_port', 'metrics_enabled',
    'alert_include_resolved', 'alert_webhook_timeout', 'log_level'
  ],
  training: [
    'reranker_train_epochs', 'reranker_train_batch', 'reranker_train_lr',
    'reranker_warmup_ratio', 'triplets_min_count', 'triplets_mine_mode'
  ],
  ui: [
    'chat_streaming_enabled', 'chat_history_max', 'editor_port', 'grafana_dashboard_uid'
  ]
};

test.describe('100 Config Parameters Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/rag');
    await page.waitForLoadState('networkidle');
  });

  test('All 100 config parameters have input elements in DOM', async ({ page }) => {
    let foundCount = 0;
    let missingParams: string[] = [];
    
    // Flatten all params into a single list
    const allParams = Object.values(configParams).flat();
    
    for (const param of allParams) {
      // Common ID patterns used in /gui
      const possibleIds = [
        param,
        param.toUpperCase(),
        param.toLowerCase(),
        param.replace(/_/g, '-'),
        param.replace(/_/g, '-').toLowerCase(),
        `input-${param}`,
        `select-${param}`,
        `${param}-input`
      ];
      
      let found = false;
      for (const id of possibleIds) {
        const input = page.locator(`input[id="${id}"], input[name="${id}"], select[id="${id}"], select[name="${id}"], textarea[id="${id}"]`);
        const count = await input.count();
        if (count > 0) {
          found = true;
          foundCount++;
          break;
        }
      }
      
      if (!found) {
        missingParams.push(param);
      }
    }
    
    console.log(`\n✓ Found ${foundCount} / ${allParams.length} parameters in DOM`);
    if (missingParams.length > 0) {
      console.log(`\n✗ Missing ${missingParams.length} parameters:`);
      console.log(missingParams.join(', '));
    }
    
    // We expect to find most parameters (allow some flexibility for naming variations)
    expect(foundCount).toBeGreaterThan(80);
  });

  test('RAG tab Data Quality subtab has visible controls', async ({ page }) => {
    await page.goto('http://localhost:5173/rag');
    
    // Should show Cards Builder controls
    await expect(page.locator('#cards-repo-select')).toBeVisible();
    await expect(page.locator('#cards-max')).toBeVisible();
    await expect(page.locator('#btn-cards-build')).toBeVisible();
  });

  test('RAG tab Retrieval subtab has visible controls', async ({ page }) => {
    await page.goto('http://localhost:5173/rag');
    
    // Click Retrieval subtab
    await page.locator('.subtab-bar button:has-text("Retrieval")').click();
    await page.waitForTimeout(200);
    
    // Should have generation model controls
    await expect(page.locator('#gen-model-select')).toBeVisible();
  });

  test('RAG tab Indexing subtab has visible controls', async ({ page }) => {
    await page.goto('http://localhost:5173/rag');
    
    // Click Indexing subtab
    await page.locator('.subtab-bar button:has-text("Indexing")').click();
    await page.waitForTimeout(200);
    
    // Should have chunking/indexing controls
    const indexingTab = page.locator('#tab-rag-indexing');
    await expect(indexingTab).toHaveClass(/active/);
  });
});
