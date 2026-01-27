---
paths: reranker/**/*.py
---

# Reranker System

Cross-encoder reranking with 4 operational modes.

## Architecture

```
Initial Results → Snippet Extraction → Cross-Encoder Scoring → Re-sorted Results
```

## Key Files

| File | Purpose |
|------|---------|
| `reranker/config.py` | Unified settings loader (`RerankerSettings` dataclass) |
| `retrieval/rerank.py` | Main reranking pipeline (633 lines) |
| `server/reranker_info.py` | Mode/model info for API/GUI |
| `server/routers/reranker_ops.py` | Reranker status/control endpoints |
| `server/routers/reranker_learning.py` | Learning mode training endpoints |
| `cli/commands/reranker.py` | CLI commands for reranker operations |

## Reranker Modes

### `none` - Disabled
No reranking. Results returned in initial retrieval order.

### `local` - Any Local Cross-Encoder
Uses any cross-encoder model loaded locally.

**RERANKER_LOCAL_MODEL accepts:**
- HuggingFace model ID: `cross-encoder/ms-marco-MiniLM-L-12-v2`
- Local path (relative): `models/my-custom-model`
- Local path (absolute): `/path/to/model`

Models are loaded via `rerankers.Reranker` / `sentence-transformers` cross-encoders. Path resolution:
```python
# Relative paths resolved from repo root
if not candidate.is_absolute():
    candidate = repo_root() / candidate
```

### `learning` - AGRO Self-Learning Cross-Encoder
Specialized mode using AGRO's continuously-trained model (default `models/cross-encoder-agro`).

**Difference from `local`:**
- Model path configurable via `AGRO_RERANKER_MODEL_PATH` (defaults to `models/cross-encoder-agro`)
- Supports online learning via feedback signals
- Training/mining endpoints: `/api/reranker/mine`, `/api/reranker/train`, `/api/reranker/evaluate`, `/api/reranker/mine_golden`
- Baseline comparison: `models/cross-encoder-agro.baseline`

### `cloud` - Cloud Provider APIs
External reranking services requiring API keys.

**Providers implemented in `retrieval/rerank.py`:**
- `cohere` - Cohere Rerank (COHERE_API_KEY)
- `voyage` - Voyage AI (VOYAGE_API_KEY)

`jina` is exposed in config/GUI but is not currently supported in the cloud rerank path.

API keys stored in `.env` only, checked via `/api/secrets/check`.

## Configuration Keys

### Mode Selection
```python
RERANKER_MODE          # 'none' | 'local' | 'learning' | 'cloud'
RERANKER_CLOUD_PROVIDER # 'cohere' | 'voyage' | 'jina' (when mode='cloud')
RERANKER_CLOUD_MODEL   # Model name for cloud provider
RERANKER_LOCAL_MODEL   # Path or HF identifier (when mode='local')
```

### Scoring Parameters
```python
AGRO_RERANKER_ALPHA    # 0.7 (score interpolation weight)
AGRO_RERANKER_TOPN     # 50 (max docs to rerank)
RERANKER_CLOUD_TOP_N   # 50 (max docs sent to cloud reranker)
AGRO_RERANKER_BATCH    # 16 (batch size for inference)
AGRO_RERANKER_MAXLEN   # 512 (max sequence length)
RERANK_INPUT_SNIPPET_CHARS # 700 (chars per doc snippet)
```

### Hot Reload (Learning Mode)
```python
AGRO_RERANKER_RELOAD_ON_CHANGE  # 0/1 (enable hot reload)
AGRO_RERANKER_RELOAD_PERIOD_SEC # 60 (check interval)
```

## API Endpoints

```python
GET  /api/reranker/info              # Current mode, model, settings
GET  /api/reranker/available         # Options for GUI
GET  /api/reranker/status            # Mining/training/eval status
POST /api/reranker/mine              # Mine triplets
POST /api/reranker/train             # Train learning model
POST /api/reranker/evaluate          # Evaluate learning model
POST /api/reranker/mine_golden       # Mine golden triplets

# Ops/monitoring
GET  /api/reranker/logs              # Recent query logs
POST /api/reranker/click             # Submit click feedback
GET  /api/reranker/costs             # Cloud cost summary
POST /api/reranker/baseline/save     # Save baseline + backup model
GET  /api/reranker/baseline/compare  # Compare to baseline
POST /api/reranker/rollback          # Restore backup model
POST /api/reranker/smoketest         # End-to-end rerank smoke test
```

Other endpoints in `server/routers/reranker_ops.py`: cron setup/remove, logs download/clear/count, triplets count, no-hits scan, latest eval snapshot.

## GUI Component

`web/src/components/RAG/RerankerConfigSubtab.tsx` (997 lines):
- Mode selector with provider/model dropdowns
- API key status (boolean only, never exposed)
- Local model path input with validation
- Real-time parameter sliders

## Config Loading

Uses `RerankerSettings` dataclass loaded via `load_settings()`:

```python
from reranker.config import load_settings, resolve_model_target

settings = load_settings()
if settings.enabled:
    model_path = resolve_model_target(settings)
    # Load model from model_path
```

## Module Reload

```python
# retrieval/rerank.py implements reload_config()
from retrieval.rerank import reload_config
reload_config()  # Refreshes all cached parameters
```
