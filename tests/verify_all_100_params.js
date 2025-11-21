/**
 * Verify all 100 parameters from Pydantic model are in validator
 * Cross-reference with server/models/agro_config_model.py
 */

// Load the validator (simulate browser environment)
global.window = {};
const fs = require('fs');
const path = require('path');

// Load the validator code
const validatorCode = fs.readFileSync(
  path.join(__dirname, '../gui/js/parameter-validator.js'),
  'utf8'
);
eval(validatorCode);

const ParameterValidator = global.window.ParameterValidator;

// Expected parameters from Pydantic model (from to_flat_dict method)
const expectedParams = [
  // Retrieval (15)
  'RRF_K_DIV', 'LANGGRAPH_FINAL_K', 'MAX_QUERY_REWRITES', 'FALLBACK_CONFIDENCE',
  'FINAL_K', 'EVAL_FINAL_K', 'CONF_TOP1', 'CONF_AVG5', 'CONF_ANY',
  'EVAL_MULTI', 'QUERY_EXPANSION_ENABLED', 'BM25_WEIGHT', 'VECTOR_WEIGHT',
  'CARD_SEARCH_ENABLED', 'MULTI_QUERY_M',

  // Scoring (3)
  'CARD_BONUS', 'FILENAME_BOOST_EXACT', 'FILENAME_BOOST_PARTIAL',

  // Layer Bonus (5)
  'LAYER_BONUS_GUI', 'LAYER_BONUS_RETRIEVAL', 'LAYER_BONUS_INDEXER',
  'VENDOR_PENALTY', 'FRESHNESS_BONUS',

  // Embedding (10)
  'EMBEDDING_TYPE', 'EMBEDDING_MODEL', 'EMBEDDING_DIM', 'VOYAGE_MODEL',
  'EMBEDDING_MODEL_LOCAL', 'EMBEDDING_BATCH_SIZE', 'EMBEDDING_MAX_TOKENS',
  'EMBEDDING_CACHE_ENABLED', 'EMBEDDING_TIMEOUT', 'EMBEDDING_RETRY_MAX',

  // Chunking (8)
  'CHUNK_SIZE', 'CHUNK_OVERLAP', 'AST_OVERLAP_LINES', 'MAX_CHUNK_SIZE',
  'MIN_CHUNK_CHARS', 'GREEDY_FALLBACK_TARGET', 'CHUNKING_STRATEGY',
  'PRESERVE_IMPORTS',

  // Indexing (9)
  'QDRANT_URL', 'COLLECTION_NAME', 'VECTOR_BACKEND', 'INDEXING_BATCH_SIZE',
  'INDEXING_WORKERS', 'BM25_TOKENIZER', 'BM25_STEMMER_LANG',
  'INDEX_EXCLUDED_EXTS', 'INDEX_MAX_FILE_SIZE_MB',

  // Reranking (12)
  'RERANKER_MODEL', 'AGRO_RERANKER_ENABLED', 'AGRO_RERANKER_ALPHA',
  'AGRO_RERANKER_TOPN', 'AGRO_RERANKER_BATCH', 'AGRO_RERANKER_MAXLEN',
  'AGRO_RERANKER_RELOAD_ON_CHANGE', 'AGRO_RERANKER_RELOAD_PERIOD_SEC',
  'COHERE_RERANK_MODEL', 'VOYAGE_RERANK_MODEL', 'RERANKER_BACKEND',
  'RERANKER_TIMEOUT',

  // Generation (10)
  'GEN_MODEL', 'GEN_TEMPERATURE', 'GEN_MAX_TOKENS', 'GEN_TOP_P',
  'GEN_TIMEOUT', 'GEN_RETRY_MAX', 'ENRICH_MODEL', 'ENRICH_BACKEND',
  'ENRICH_DISABLED', 'OLLAMA_NUM_CTX',

  // Enrichment (6)
  'CARDS_ENRICH_DEFAULT', 'CARDS_MAX', 'ENRICH_CODE_CHUNKS',
  'ENRICH_MIN_CHARS', 'ENRICH_MAX_CHARS', 'ENRICH_TIMEOUT',

  // Keywords (5)
  'KEYWORDS_MAX_PER_REPO', 'KEYWORDS_MIN_FREQ', 'KEYWORDS_BOOST',
  'KEYWORDS_AUTO_GENERATE', 'KEYWORDS_REFRESH_HOURS',

  // Tracing (7)
  'TRACING_ENABLED', 'TRACE_SAMPLING_RATE', 'PROMETHEUS_PORT',
  'METRICS_ENABLED', 'ALERT_INCLUDE_RESOLVED', 'ALERT_WEBHOOK_TIMEOUT',
  'LOG_LEVEL',

  // Training (6)
  'RERANKER_TRAIN_EPOCHS', 'RERANKER_TRAIN_BATCH', 'RERANKER_TRAIN_LR',
  'RERANKER_WARMUP_RATIO', 'TRIPLETS_MIN_COUNT', 'TRIPLETS_MINE_MODE',

  // UI (4)
  'CHAT_STREAMING_ENABLED', 'CHAT_HISTORY_MAX', 'EDITOR_PORT',
  'GRAFANA_DASHBOARD_UID'
];

console.log('Verifying Parameter Validator Coverage...\n');
console.log(`Expected parameters from Pydantic model: ${expectedParams.length}`);
console.log(`Parameters in validator: ${ParameterValidator.getParamCount()}\n`);

// Check for missing parameters
const missing = [];
expectedParams.forEach(param => {
  if (!ParameterValidator.getParamDef(param)) {
    missing.push(param);
  }
});

// Check for extra parameters
const allNames = ParameterValidator.getAllParamNames();
const extra = [];
allNames.forEach(param => {
  if (!expectedParams.includes(param)) {
    extra.push(param);
  }
});

// Report by category
const categories = [
  { name: 'retrieval', expected: 15 },
  { name: 'scoring', expected: 3 },
  { name: 'layer_bonus', expected: 5 },
  { name: 'embedding', expected: 10 },
  { name: 'chunking', expected: 8 },
  { name: 'indexing', expected: 9 },
  { name: 'reranking', expected: 12 },
  { name: 'generation', expected: 10 },
  { name: 'enrichment', expected: 6 },
  { name: 'keywords', expected: 5 },
  { name: 'tracing', expected: 7 },
  { name: 'training', expected: 6 },
  { name: 'ui', expected: 4 }
];

console.log('Category Breakdown:');
console.log('='.repeat(60));
let totalFound = 0;
categories.forEach(cat => {
  const params = ParameterValidator.getParamsByCategory(cat.name);
  const count = Object.keys(params).length;
  totalFound += count;
  const status = count === cat.expected ? '✓' : '✗';
  console.log(`${status} ${cat.name.padEnd(15)} Expected: ${cat.expected.toString().padStart(2)}, Found: ${count.toString().padStart(2)}`);
});
console.log('='.repeat(60));
console.log(`Total: ${totalFound} / 100\n`);

// Report results
if (missing.length > 0) {
  console.error('✗ MISSING PARAMETERS:');
  missing.forEach(p => console.error(`  - ${p}`));
  console.error('');
}

if (extra.length > 0) {
  console.error('✗ EXTRA PARAMETERS (not in Pydantic model):');
  extra.forEach(p => console.error(`  - ${p}`));
  console.error('');
}

if (missing.length === 0 && extra.length === 0) {
  console.log('✓ SUCCESS: All 100 parameters match the Pydantic model!');
  console.log('✓ No missing parameters');
  console.log('✓ No extra parameters');
  process.exit(0);
} else {
  console.error(`✗ FAILED: Found ${missing.length} missing and ${extra.length} extra parameters`);
  process.exit(1);
}
