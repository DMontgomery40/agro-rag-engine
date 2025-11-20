import { test, expect } from '@playwright/test';

test.describe('All Tabs Parameter Verification', () => {
  
  test('Admin tab has CHAT_STREAMING_ENABLED visible', async ({ page }) => {
    await page.goto('http://localhost:5173/admin');
    await page.waitForLoadState('networkidle');
    
    const chatStreamingInput = page.locator('#CHAT_STREAMING_ENABLED, [name="CHAT_STREAMING_ENABLED"]');
    const count = await chatStreamingInput.count();
    console.log('CHAT_STREAMING_ENABLED count:', count);
    expect(count).toBeGreaterThan(0);
  });

  test('Infrastructure tab has infrastructure services', async ({ page }) => {
    await page.goto('http://localhost:5173/infrastructure');
    await page.waitForLoadState('networkidle');
    
    // Should have Qdrant, Redis, Prometheus, Grafana controls
    const qdrantStatus = page.locator('#qdrant-status');
    await expect(qdrantStatus).toBeVisible();
  });

  test('Scan all tabs for all 100 params', async ({ page }) => {
    const tabs = ['rag', 'admin', 'infrastructure'];
    let totalFound = 0;
    let foundParams: string[] = [];
    let missingParams: string[] = [];
    
    const allParams = [
      // Retrieval
      'rrf_k_div', 'langgraph_final_k', 'max_query_rewrites', 'fallback_confidence',
      'final_k', 'eval_final_k', 'conf_top1', 'conf_avg5', 'conf_any',
      'eval_multi', 'query_expansion_enabled', 'bm25_weight', 'vector_weight',
      'card_search_enabled', 'multi_query_m',
      // Scoring
      'card_bonus', 'filename_boost_exact', 'filename_boost_partial',
      // Layer bonus
      'gui', 'retrieval', 'indexer', 'vendor_penalty', 'freshness_bonus',
      // Embedding
      'embedding_type', 'embedding_model', 'embedding_dim', 'voyage_model',
      'embedding_model_local', 'embedding_batch_size', 'embedding_max_tokens',
      'embedding_cache_enabled', 'embedding_timeout', 'embedding_retry_max',
      // Chunking
      'chunk_size', 'chunk_overlap', 'ast_overlap_lines', 'max_chunk_size',
      'min_chunk_chars', 'greedy_fallback_target', 'chunking_strategy', 'preserve_imports',
      // Indexing
      'qdrant_url', 'collection_name', 'vector_backend', 'indexing_batch_size',
      'indexing_workers', 'bm25_tokenizer', 'bm25_stemmer_lang', 'index_excluded_exts',
      'index_max_file_size_mb',
      // Reranking
      'reranker_model', 'agro_reranker_enabled', 'agro_reranker_alpha', 'agro_reranker_topn',
      'agro_reranker_batch', 'agro_reranker_maxlen', 'agro_reranker_reload_on_change',
      'agro_reranker_reload_period_sec', 'cohere_rerank_model', 'voyage_rerank_model',
      'reranker_backend', 'reranker_timeout',
      // Generation
      'gen_model', 'gen_temperature', 'gen_max_tokens', 'gen_top_p', 'gen_timeout',
      'gen_retry_max', 'enrich_model', 'enrich_backend', 'enrich_disabled', 'ollama_num_ctx',
      // Enrichment
      'cards_enrich_default', 'cards_max', 'enrich_code_chunks', 'enrich_min_chars',
      'enrich_max_chars', 'enrich_timeout',
      // Keywords
      'keywords_max_per_repo', 'keywords_min_freq', 'keywords_boost',
      'keywords_auto_generate', 'keywords_refresh_hours',
      // Tracing
      'tracing_enabled', 'trace_sampling_rate', 'prometheus_port', 'metrics_enabled',
      'alert_include_resolved', 'alert_webhook_timeout', 'log_level',
      // Training
      'reranker_train_epochs', 'reranker_train_batch', 'reranker_train_lr',
      'reranker_warmup_ratio', 'triplets_min_count', 'triplets_mine_mode',
      // UI
      'chat_streaming_enabled', 'chat_history_max', 'editor_port', 'grafana_dashboard_uid'
    ];
    
    for (const tab of tabs) {
      await page.goto(`http://localhost:5173/${tab}`);
      await page.waitForLoadState('networkidle');
      console.log(`\nScanning ${tab} tab...`);
      
      for (const param of allParams) {
        if (foundParams.includes(param)) continue;
        
        const possibleIds = [
          param,
          param.toUpperCase(),
          param.toLowerCase(),
          param.replace(/_/g, '-'),
        ];
        
        for (const id of possibleIds) {
          const input = page.locator(`input[id="${id}"], input[name="${id}"], select[id="${id}"], select[name="${id}"]`);
          const count = await input.count();
          if (count > 0) {
            totalFound++;
            foundParams.push(param);
            console.log(`  ✓ Found: ${param}`);
            break;
          }
        }
      }
    }
    
    missingParams = allParams.filter(p => !foundParams.includes(p));
    
    console.log(`\n\n✓ Total found: ${totalFound} / ${allParams.length}`);
    if (missingParams.length > 0) {
      console.log(`\n✗ Missing ${missingParams.length} parameters:`);
      console.log(missingParams.join(', '));
    }
    
    expect(totalFound).toBeGreaterThanOrEqual(90);
  });
});
