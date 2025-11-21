# RAG Parameter Tooltips - Addition Summary

**Date:** 2025-11-20
**Task:** Add 15 medium-complexity tooltips for RAG parameters to `/gui/js/tooltips.js`

## Added Tooltips

Successfully added detailed, medium-complexity tooltips for the following RAG parameters:

1. **CARD_SEARCH_ENABLED** - Card-based retrieval boosting
2. **EMBEDDING_MODEL** - OpenAI embedding model selection
3. **VOYAGE_MODEL** - Voyage AI embedding model for code
4. **EMBEDDING_MODEL_LOCAL** - HuggingFace local embedding models
5. **EMBEDDING_BATCH_SIZE** - Batch size for embedding API calls
6. **EMBEDDING_MAX_TOKENS** - Token limit for embedding input
7. **INDEXING_BATCH_SIZE** - Parallel chunk processing during indexing
8. **INDEXING_WORKERS** - CPU worker threads for indexing
9. **BM25_STEMMER_LANG** - Language for BM25 keyword stemming
10. **VOYAGE_RERANK_MODEL** - Voyage AI reranker model
11. **AGRO_RERANKER_RELOAD_ON_CHANGE** - Auto-reload reranker on model change
12. **ENRICH_DISABLED** - Disable code enrichment for faster indexing
13. **KEYWORDS_MAX_PER_REPO** - Max keywords for multi-repo routing
14. **KEYWORDS_AUTO_GENERATE** - Auto-extract routing keywords
15. **TRACE_SAMPLING_RATE** - LangSmith trace sampling rate

## Tooltip Format

Each tooltip includes:

- **Display Title:** Clear, user-friendly parameter name
- **Detailed Description:** 3-4 sentences explaining:
  - What the parameter does
  - When to change it
  - Impact of different values
- **Recommended Values:** Specific guidance with ranges (e.g., "100-150 for API providers, 16-32 for local GPU")
- **Quality Links:** 2-3 links to official documentation:
  - OpenAI: https://platform.openai.com/docs/
  - Voyage AI: https://docs.voyageai.com/
  - HuggingFace: https://huggingface.co/docs/
  - BM25S: https://github.com/xhluca/bm25s
  - Wikipedia technical concepts
- **Badges:** Optional info/warn badges for important notes

## Verification

All tooltips verified with automated tests:

### Test 1: Source Code Verification (`test_tooltips_simple.py`)
- ✅ All 15 tooltips found in source code
- ✅ Average length: ~950 characters per tooltip
- ✅ All include "Recommended:" guidance
- ✅ Links present where applicable

### Test 2: Browser Rendering (`test_tooltip_rendering.py`)
- ✅ Tooltips.js loads successfully
- ✅ buildTooltipMap() function works
- ✅ All 15 tooltips in tooltip map
- ✅ HTML rendering correct (title, links, content)

## Example Tooltip

```javascript
EMBEDDING_MODEL: L(
  'Embedding Model (OpenAI)',
  'OpenAI embedding model name when EMBEDDING_TYPE=openai. Current options: "text-embedding-3-small" (512-3072 dims, $0.02/1M tokens, fast), "text-embedding-3-large" (256-3072 dims, $0.13/1M tokens, highest quality), "text-embedding-ada-002" (legacy, 1536 dims, $0.10/1M tokens). Larger models improve semantic search quality but cost more and require more storage. Changing this requires full reindexing as embeddings are incompatible across models.\n\nRecommended: text-embedding-3-small for most use cases, text-embedding-3-large for production systems demanding highest quality.',
  [
    ['OpenAI Embeddings Guide', 'https://platform.openai.com/docs/guides/embeddings'],
    ['Embedding Models', 'https://platform.openai.com/docs/models/embeddings'],
    ['Pricing Calculator', 'https://openai.com/api/pricing/']
  ],
  [['Requires reindex', 'reindex'], ['Costs API calls', 'warn']]
)
```

## File Modified

- `/Users/davidmontgomery/agro-rag-engine/gui/js/tooltips.js`
  - Added 15 new tooltip definitions (lines 820-970)
  - Total tooltip map now contains 122 entries
  - All tooltips follow existing L() helper function pattern

## Testing Files Created

1. `/tests/test_tooltips_simple.py` - Source code verification
2. `/tests/test_tooltip_rendering.py` - Browser rendering verification
3. `/tests/test_new_rag_tooltips.py` - Comprehensive Playwright test (WIP)

## Link Quality

All links use current 2025 documentation:
- OpenAI Platform docs (official)
- Voyage AI docs (official)
- HuggingFace Transformers docs (official)
- Wikipedia for technical concepts
- Internal docs (/docs/*.md) for project-specific features

No deprecated or outdated links included.

## Accessibility Compliance

These tooltips are part of the ADA compliance requirement that all configurable parameters must have GUI tooltips. This addition ensures users with dyslexia or other reading difficulties have accessible, clear guidance for all RAG configuration options.

## Status

✅ **COMPLETE** - All 15 tooltips added, tested, and verified working.
