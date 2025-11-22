# RAG Retrieval Quality Investigation Checklist

## Crisis Summary
- **Baseline Accuracy**: 12.7% top-1, 17.6% top-5 on 102 questions
- **Expected Accuracy**: 80-90% top-5 minimum (given SOTA components)
- **Corpus Size**: Only 2,538 chunks from 463 files
- **Tech Stack**: BM25S + Vector (Qdrant) + RRF Fusion + Cohere 3.5 Reranker + Multi-Query
- **Example Failure**: Query "Where is hybrid search?" returns `requirements-rag.txt` instead of `retrieval/hybrid_search.py`

This is CATASTROPHIC and points to fundamental breakage in the pipeline.

---

## 1. BM25S (Sparse Retrieval) Investigation

### 1.1 Index Health
- [ ] Verify BM25S index exists and is loadable
  - File: `out/agro/bm25_index.pkl` or similar
  - Check file size is non-zero and recent
- [ ] Verify index contains all 2,538 chunks
  - Compare index document count vs. chunks.jsonl count
- [ ] Check index vocabulary size
  - Should be 5,000+ unique terms for code corpus
  - If vocabulary is tiny (<100), tokenization is broken

### 1.2 Tokenization & Preprocessing
- [ ] Verify stemmer is working correctly
  - Config: `bm25_tokenizer: "stemmer"`, `bm25_stemmer_lang: "english"`
  - Test: "indexing" → "index", "retrieval" → "retriev", "hybrid_search" → "hybrid_search"
  - Code: `retrieval/hybrid_search.py` lines 84, 297-300
- [ ] Check stop words are appropriate for code
  - Stop words should NOT include: "def", "class", "import", "return", "function"
  - Should remove: "the", "a", "an", "is", "are"
- [ ] Verify document text is being indexed correctly
  - Check that file paths are included in indexed text
  - Check that code symbols (function names, class names) are preserved
  - File: `indexer/index_repo.py` lines 200-250 (chunk text assembly)

### 1.3 BM25 Scoring Parameters
- [ ] Check BM25 k1 and b parameters
  - Default: k1=1.5, b=0.75
  - For code: Try k1=2.0, b=0.5 (less length normalization)
  - Code: `retrieval/hybrid_search.py` lines 295-310
- [ ] Verify document frequencies are calculated correctly
  - High-frequency terms (like "import") should be downweighted
  - Rare terms (like "hybrid_search") should be upweighted
- [ ] Check query preprocessing matches document preprocessing
  - Same stemmer, same stop words, same tokenization

### 1.4 BM25 Retrieval Behavior
- [ ] Test BM25-only retrieval (disable vector, disable rerank)
  - Set `topk_sparse: 20`, `disable_rerank: 1`, `skip_dense: 1`
  - Run eval: Should get 40-60% top-5 for code queries
  - If <20%, BM25 is fundamentally broken
- [ ] Check BM25 scores are reasonable
  - Typical range: 5-50 for good matches
  - If all scores <1.0, scoring is broken
- [ ] Verify top-k parameter is being respected
  - Config: `topk_sparse: 75`
  - Should return exactly 75 results from BM25
  - Code: `retrieval/hybrid_search.py` line 350

---

## 2. Vector Search (Dense Retrieval) Investigation

### 2.1 Embeddings Health
- [ ] Verify embeddings are being generated
  - Model: `all-MiniLM-L6-v2` (384 dimensions)
  - Config: `embedding_model_local: "all-MiniLM-L6-v2"`, `embedding_dim: 3072` (MISMATCH!)
  - **CRITICAL**: Config says 3072 dims but model produces 384!
  - File: `agro_config.json` line 42
- [ ] Check Qdrant collection exists and has vectors
  - Collection: `code_chunks_agro`
  - Should have 2,538 points with 384-dim vectors
  - Command: `curl http://127.0.0.1:6333/collections/code_chunks_agro`
- [ ] Verify vector search is actually being called
  - Check logs for "Qdrant search" or vector retrieval messages
  - If not called, vector search is being skipped

### 2.2 Query Embeddings
- [ ] Verify query embeddings match document embeddings
  - Same model: `all-MiniLM-L6-v2`
  - Same normalization (L2 normalized to unit vectors)
  - Code: `retrieval/embed_cache.py` lines 50-100
- [ ] Check query embedding cache
  - File: `out/agro/embed_cache.pkl`
  - If cache is stale, queries may use wrong embeddings
  - Try: Delete cache and re-run eval

### 2.3 Vector Similarity & Distance Metric
- [ ] Verify distance metric is correct
  - Should be: Cosine similarity (or dot product for normalized vectors)
  - Qdrant config: Check collection distance metric
  - Code: `common/qdrant_utils.py` lines 30-50
- [ ] Check vector search scores
  - Typical range: 0.3-0.9 for good matches
  - If all scores <0.1, vectors are not normalized or metric is wrong
- [ ] Test vector-only retrieval (disable BM25, disable rerank)
  - Set `bm25_weight: 0.0`, `vector_weight: 1.0`, `disable_rerank: 1`
  - Run eval: Should get 30-50% top-5 for semantic queries
  - If <10%, vector search is broken

### 2.4 Embedding Model Issues
- [ ] Check embedding model is loaded correctly
  - Model path: Should load from HuggingFace `sentence-transformers/all-MiniLM-L6-v2`
  - Verify model outputs 384 dimensions (not 3072!)
  - Code: `retrieval/embed_cache.py` lines 20-40
- [ ] Verify embedding pooling method
  - Should use: Mean pooling (average of token embeddings)
  - If using: CLS token only, embeddings may be poor
- [ ] Check for embedding truncation
  - Model max tokens: 256 for MiniLM
  - Long code chunks may be truncated
  - Solution: Use sliding window or longer-context model

---

## 3. Hybrid Search (RRF Fusion) Investigation

### 3.1 RRF Parameters
- [ ] Check RRF k parameter
  - Config: `rrf_k_div: 60`
  - RRF formula: `score = sum(1 / (k + rank))`
  - If k is too high, fusion is ineffective
  - Try: k=10, k=30, k=60, k=100 and compare results
  - Code: `retrieval/hybrid_search.py` lines 400-450

### 3.2 Modality Weights
- [ ] Check BM25 vs. Vector weight balance
  - Config: `bm25_weight: 0.3`, `vector_weight: 0.7`
  - This means vector dominates (70% weight)
  - If vector is broken, this will tank performance
  - Try: `bm25_weight: 0.7`, `vector_weight: 0.3` (BM25-heavy)
  - Try: `bm25_weight: 0.5`, `vector_weight: 0.5` (balanced)

### 3.3 Rank Fusion Logic
- [ ] Verify RRF is combining ranks correctly
  - BM25 ranks: 1, 2, 3, ... (lower is better)
  - Vector ranks: 1, 2, 3, ... (lower is better)
  - RRF should normalize and combine
  - Code: `retrieval/hybrid_search.py` lines 420-460
- [ ] Check for off-by-one errors in ranking
  - Python is 0-indexed, but ranks are 1-indexed
  - Verify: rank 1 = index 0, rank 2 = index 1, etc.
- [ ] Verify duplicate handling
  - Same document may appear in both BM25 and vector results
  - RRF should merge duplicates correctly (sum scores)

### 3.4 Top-K Retrieval Imbalance
- [ ] Check if one modality is drowning out the other
  - Config: `topk_sparse: 75`, `topk_dense: 75`
  - Total candidates: 150 (before fusion)
  - If BM25 returns all garbage, vector can't save it
  - Solution: Increase vector topk or decrease BM25 topk
  - Try: `topk_sparse: 30`, `topk_dense: 100`

---

## 4. Reranker Investigation

### 4.1 Reranker Availability
- [ ] Verify reranker is enabled
  - Config: `disable_rerank: 0`, `agro_reranker_enabled: 1`, `cohere_reranker_enabled: 1`
  - If disabled, no reranking happens
- [ ] Check which reranker is being used
  - AGRO local reranker: `models/cross-encoder-agro`
  - Cohere API reranker: Requires API key
  - Code: `retrieval/rerank.py` lines 50-100
- [ ] Verify reranker model is loaded correctly
  - Local model path: `models/cross-encoder-agro`
  - Should load TransformerRanker with cross-encoder weights
  - Code: `retrieval/rerank.py` lines 30-50

### 4.2 Reranker Input/Output
- [ ] Check reranker receives correct inputs
  - Query: Should be original user query (not expanded)
  - Candidates: Should be top-N from RRF fusion
  - Config: `agro_reranker_topn: 50` (rerank top 50)
- [ ] Verify reranker scores are being used
  - Reranker should output scores in [0, 1]
  - Final scores should be: `alpha * reranker + (1-alpha) * fusion`
  - Config: `agro_reranker_alpha: 0.7` (70% reranker, 30% fusion)
  - Code: `retrieval/rerank.py` lines 120-150
- [ ] Check reranker is not being bypassed
  - If reranker fails silently, fusion scores are used as-is
  - Look for error logs or fallback paths

### 4.3 Cohere Reranker
- [ ] Verify Cohere API key is valid
  - Env: `COHERE_API_KEY`
  - Test: `curl -H "Authorization: Bearer $COHERE_API_KEY" https://api.cohere.ai/v1/rerank`
- [ ] Check Cohere reranker model
  - Should be: `rerank-english-v3.0` or `rerank-multilingual-v3.0`
  - Config: `cohere_model` in reranker config
- [ ] Verify Cohere reranker is being called
  - Check logs for "Cohere rerank" or API call messages
  - If not called, check if local reranker is taking precedence

### 4.4 Reranker Training Quality
- [ ] Check if local reranker is undertrained
  - Model: `models/cross-encoder-agro`
  - Check training logs: Loss should converge <0.1
  - If loss is high (>0.5), model is undertrained
  - Solution: Retrain with more triplets or more epochs
- [ ] Verify reranker is not overfitting
  - Check eval set performance vs. train set
  - If train=95%, eval=30%, model is overfit
  - Solution: Add regularization, use more diverse triplets

---

## 5. Query Processing Investigation

### 5.1 Multi-Query Expansion
- [ ] Verify multi-query is enabled
  - Config: `query_expansion_enabled: 1`, `multi_query_m: 4`
  - Should generate 4 query variants (original + 3 expansions)
  - Code: `retrieval/hybrid_search.py` lines 200-250
- [ ] Check expanded query quality
  - Expanded queries should be semantically similar to original
  - If expansions are garbage, they dilute results
  - Example: "Where is hybrid search?" → "hybrid retrieval location", "search combination code", etc.
- [ ] Verify expanded queries are being fused correctly
  - Each expanded query should return top-K results
  - Results should be merged with RRF
  - If fusion is broken, expansion hurts performance

### 5.2 Synonym Expansion
- [ ] Verify synonym expansion is enabled
  - Config: `use_semantic_synonyms: 1`
  - File: `data/semantic_synonyms.json`
  - Should map terms like "search" → ["retrieval", "lookup", "query"]
- [ ] Check synonym dictionary quality
  - Synonyms should be relevant for code domain
  - If synonyms are too broad, precision drops
  - Example: "server" → ["backend", "api", "endpoint"] (good)
  - Example: "server" → ["computer", "machine", "host"] (too broad)
- [ ] Verify synonyms are being applied correctly
  - Synonyms should be added to query, not replace original terms
  - Code: `retrieval/synonym_expander.py` lines 30-80

---

## 6. Chunking & Indexing Investigation

### 6.1 Chunk Quality
- [ ] Check average chunk size
  - Config: `chunk_size: 1000`, `chunk_overlap: 200`
  - Chunks should be 500-1500 characters (not too small, not too large)
  - File: `out/agro/chunks.jsonl` (inspect random samples)
- [ ] Verify chunks contain meaningful code
  - Chunks should have full functions/classes, not fragments
  - If chunks are mid-function, context is lost
  - Code: `retrieval/ast_chunker.py` lines 100-200
- [ ] Check chunk overlap
  - Config: `chunk_overlap: 200`
  - Overlaps should preserve context across boundaries
  - If no overlap, related code is split apart

### 6.2 File Path Indexing
- [ ] Verify file paths are being indexed
  - Chunk text should include: `# File: path/to/file.py`
  - If paths are missing, file-specific queries fail
  - Code: `indexer/index_repo.py` lines 220-240
- [ ] Check file path is stored in metadata
  - Each chunk should have `file_path` field
  - Queries like "where is X?" rely on this
  - File: `out/agro/chunks.jsonl` (check `file_path` field exists)

### 6.3 Semantic Cards
- [ ] Verify semantic cards are being created
  - Config: `card_search_enabled: 1`
  - Cards should summarize file/module purpose
  - File: `out/agro/cards.jsonl`
- [ ] Check card bonus is being applied
  - Config: `card_bonus: 0.08`
  - Cards should boost scores by 8%
  - If cards are missing, this bonus is lost
- [ ] Verify cards are indexed in Qdrant/BM25S
  - Cards should be treated as special chunks
  - Should have higher weight than normal chunks

---

## 7. Scoring & Boosting Investigation

### 7.1 Filename Boosts
- [ ] Verify filename exact match boost
  - Config: `filename_boost_exact: 1.5` (50% boost)
  - Query: "hybrid_search.py" should boost `retrieval/hybrid_search.py`
  - Code: `retrieval/hybrid_search.py` lines 500-550
- [ ] Check filename partial match boost
  - Config: `filename_boost_partial: 1.2` (20% boost)
  - Query: "hybrid" should boost `retrieval/hybrid_search.py`
- [ ] Verify boost is being applied correctly
  - Boost should multiply score, not add
  - `final_score = base_score * boost_factor`

### 7.2 Layer Bonuses
- [ ] Check layer bonus configuration
  - Config: `layer_bonus_gui: 0.15`, `layer_bonus_retrieval: 0.15`, etc.
  - Files in `/gui`, `/retrieval`, `/indexer` should get +15% boost
  - Code: `retrieval/hybrid_search.py` lines 550-600
- [ ] Verify layer bonuses are being applied
  - Check if files in boosted directories rank higher
  - If not applied, priority files are buried

### 7.3 Vendor Penalty
- [ ] Check vendor mode
  - Config: `vendor_mode: "prefer_first_party"`
  - Files in `node_modules`, `venv`, `.git` should be penalized
  - Penalty: `vendor_penalty: -0.1` (-10%)
- [ ] Verify vendor files are being filtered correctly
  - Vendor files should rank lower than first-party code
  - If not filtered, vendor code pollutes results

---

## 8. Configuration Issues Investigation

### 8.1 Config Registry Loading
- [ ] Verify config registry is loading correctly
  - File: `agro_config.json`
  - Registry should load all parameters at startup
  - Code: `server/services/config_registry.py` lines 50-100
- [ ] Check for config override issues
  - Config registry may be overridden by environment variables
  - Priority: `.env` > `agro_config.json` > defaults
  - Verify: Print all config values at startup

### 8.2 Critical Config Mismatches
- [ ] **CRITICAL**: Embedding dimension mismatch
  - Config: `embedding_dim: 3072` (WRONG!)
  - Model: `all-MiniLM-L6-v2` produces 384 dims
  - This will cause vector search to fail silently
  - Fix: Change `embedding_dim: 384` in `agro_config.json` line 42
- [ ] Check skip_dense flag
  - Config: `skip_dense: 0` (vector enabled)
  - If `skip_dense: 1`, vector search is disabled
  - File: `agro_config.json` line 71

### 8.3 Collection Name Mismatch
- [ ] Verify collection name matches Qdrant
  - Config: `collection_name: "code_chunks_agro"`
  - Qdrant: Should have collection named exactly "code_chunks_agro"
  - If mismatch, vector search hits wrong/empty collection
  - Command: `curl http://127.0.0.1:6333/collections`

---

## 9. Pipeline Integration Issues

### 9.1 Search Function Call Chain
- [ ] Trace full call chain
  - Entry: `search_routed_multi()` or `search_routed()`
  - BM25: `bm25_retrieve()`
  - Vector: `qdrant_client.search()`
  - Fusion: `rrf_fusion()`
  - Rerank: `ce_rerank()`
  - Code: `retrieval/hybrid_search.py` lines 150-600

### 9.2 Error Handling & Fallbacks
- [ ] Check if errors are being silently caught
  - If Qdrant fails, does it fallback to BM25-only?
  - If reranker fails, does it use fusion scores?
  - Silent fallbacks may hide breakage
- [ ] Verify error logs are being written
  - Errors should be logged to console or file
  - Check logs for: "Qdrant error", "Rerank failed", "Embedding failed"

---

## 10. Quick Smoke Tests

Run these tests to isolate the problem fast:

### Test 1: BM25-Only
```bash
# Disable vector and rerank
export SKIP_DENSE=1
export DISABLE_RERANK=1
python -m eval.eval_rag_instrumented
# Expected: 40-60% top-5 accuracy
# If <20%: BM25 is broken
```

### Test 2: Vector-Only
```bash
# Disable BM25 and rerank
export BM25_WEIGHT=0.0
export VECTOR_WEIGHT=1.0
export DISABLE_RERANK=1
python -m eval.eval_rag_instrumented
# Expected: 30-50% top-5 accuracy
# If <10%: Vector search is broken
```

### Test 3: Hybrid-Only (No Rerank)
```bash
# Enable BM25 + Vector, disable rerank
export BM25_WEIGHT=0.5
export VECTOR_WEIGHT=0.5
export DISABLE_RERANK=1
python -m eval.eval_rag_instrumented
# Expected: 50-70% top-5 accuracy
# If <30%: Fusion is broken
```

### Test 4: Full Pipeline
```bash
# Enable everything
export DISABLE_RERANK=0
python -m eval.eval_rag_instrumented
# Expected: 80-90% top-5 accuracy
# If <50%: Reranker is broken or not being called
```

---

## 11. Grafana Dashboard Metrics to Watch

Use the new Grafana dashboard at http://localhost:3000 to monitor:

1. **Top-1 vs. Top-K Accuracy Trend**
   - If top-1 is low but top-5 is high: Reranker or scoring issue
   - If both are low: Retrieval is fundamentally broken

2. **Modality Contribution (Pie Chart)**
   - If BM25 ranks #1 most often: Vector is weak
   - If Vector ranks #1 most often: BM25 is weak
   - If Reranker never ranks #1: Reranker is not being used

3. **Score Distribution Histograms**
   - BM25 scores should be 5-50
   - Vector scores should be 0.3-0.9
   - Reranker scores should be 0.5-1.0
   - If all scores are <0.1: That modality is broken

4. **Per-Question Results Table**
   - Green rows: Hits (good)
   - Red rows: Misses (bad)
   - Sort by red rows to see worst-performing questions

5. **Configuration Snapshot Table**
   - Check for config mismatches (embedding_dim, skip_dense, etc.)

---

## Priority Investigation Order

Based on likelihood of being the root cause:

1. **CRITICAL**: Check embedding dimension mismatch (Config: 3072 vs. Model: 384)
2. **HIGH**: Verify BM25-only retrieval works (smoke test #1)
3. **HIGH**: Verify vector-only retrieval works (smoke test #2)
4. **MEDIUM**: Check RRF fusion logic and weights
5. **MEDIUM**: Verify reranker is being called (check logs)
6. **LOW**: Fine-tune scoring bonuses and boosts
7. **LOW**: Optimize chunking strategy

Start at the top and work down. Each test should take <5 minutes.

---

## Success Criteria

After fixes, we should see:

- **Top-1 Accuracy**: ≥60% (good), ≥75% (excellent)
- **Top-5 Accuracy**: ≥85% (good), ≥95% (excellent)
- **Query**: "Where is hybrid search?" → Top-1: `retrieval/hybrid_search.py` (100% confidence)

---

## Contact

If you're stuck, check:
- Grafana dashboard: http://localhost:3000
- Eval results: `data/evals/latest.json`
- Logs: `data/logs/queries.jsonl`, `data/logs/alerts.jsonl`
