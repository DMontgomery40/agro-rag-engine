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

Models are loaded via `sentence-transformers` CrossEncoder. Path resolution:
```python
# Relative paths resolved from repo root
if not candidate.is_absolute():
    candidate = repo_root() / candidate
```

### `learning` - AGRO Self-Learning Cross-Encoder
Specialized mode using AGRO's continuously-trained model at `models/cross-encoder-agro`.

**Difference from `local`:**
- Model path hardcoded to `models/cross-encoder-agro`
- Supports online learning via feedback signals
- Training endpoints: `/api/reranker/learning/*`
- Baseline comparison: `models/cross-encoder-agro.baseline`

### `cloud` - Cloud Provider APIs
External reranking services requiring API keys.

**Providers:**
- `cohere` - Cohere Rerank (COHERE_API_KEY)
- `voyage` - Voyage AI (VOYAGE_API_KEY)
- `jina` - Jina AI (JINA_API_KEY)

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
GET  /api/reranker/info          # Current mode, model, settings
POST /api/reranker/reload        # Force config reload
GET  /api/reranker/status        # Health check

# Learning mode only
POST /api/reranker/learning/train    # Trigger training
GET  /api/reranker/learning/status   # Training progress
POST /api/reranker/learning/feedback # Submit relevance feedback
```

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
