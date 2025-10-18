# Learning Reranker System

**AGRO's learning reranker** continuously improves search quality by collecting user feedback and training a cross-encoder model to better rank code chunks.

---

## Overview

The learning reranker system enables AGRO to:

1. **Collect implicit feedback** - Track which code chunks users click on
2. **Collect explicit feedback** - Thumbs up/down buttons on search results
3. **Mine training data** - Extract triplets (query, good_doc, bad_doc) from feedback logs
4. **Train cross-encoder** - Fine-tune a reranking model on your codebase
5. **Evaluate improvements** - Measure ranking quality with MRR and Hit@K metrics
6. **Promote models** - Deploy better models to production automatically

This creates a **feedback loop** where AGRO gets better at finding the code you actually need over time.

---

## Architecture

### Where Reranking Happens

In the retrieval flow, reranking happens at **retrieval/hybrid_search.py:170**:

```
User Query
   ↓
BM25 Search (sparse matching)
   ↓
Vector Search (semantic similarity)
   ↓
Fusion (combine BM25 + Vector scores)
   ↓
Cross-Encoder Rerank ← YOU ARE HERE (line 170)
   ↓
Top K Results
```

The cross-encoder takes each `(query, document)` pair and outputs a relevance score from 0.0 to 1.0. This rescores the initial BM25+Vector candidates to produce the final ranking.

### Training Data Format

Training uses **triplets**:

```json
{
  "query": "How is OAuth token validated?",
  "positive_text": "function validateToken(token) { ... }",
  "positive_doc_id": "auth/oauth.ts:45-67",
  "negative_texts": ["import axios from 'axios'", "export default config"],
  "negative_doc_ids": ["utils/http.ts:1-3", "config/index.ts:10-12"],
  "source": "golden.json"
}
```

The model learns: **positive_text** is more relevant to **query** than **negative_texts**.

---

## GUI Features

### Feedback Buttons (gui/js/reranker.js)

The reranker GUI (28KB of epic features) adds:

- **Click tracking** - Automatically logs when you click a code chunk (implicit positive signal)
- **Thumbs up/down buttons** - Explicitly mark results as helpful or not helpful
- **Real-time feedback** - Sends events to `/api/telemetry/event` immediately

![Reranker Feedback UI](../assets/reranker_screenshot.png)

Example event:

```json
{
  "event_id": "abc-123-def",
  "query": "where is auth validated",
  "doc_id": "auth/oauth.ts:45-67",
  "rating": 5,
  "source": "click",
  "timestamp": "2025-10-15T14:32:10.123Z"
}
```

Ratings:
- `5` = thumbs up or clicked result
- `1` = thumbs down

### How to Use

1. Search for something in AGRO
2. Click on a helpful result → automatically logged as positive feedback
3. Click thumbs up on great results → explicitly marked as excellent
4. Click thumbs down on bad results → explicitly marked as not relevant

All feedback goes to `data/logs/queries.jsonl` for mining.

---

## Training Workflow

### 1. Mine Triplets

Generate training data from feedback logs or golden test questions.

#### From Logged Queries

```bash
# Mines triplets from data/logs/queries.jsonl
python scripts/mine_triplets.py
```

This looks for queries where users rated results (clicks or thumbs up/down), then creates triplets with:
- **Positives**: Results rated 4+ stars
- **Negatives**: Results rated 1-2 stars or unclicked

Output: `data/training/triplets.jsonl`

#### From Golden Questions

```bash
# Mines triplets from golden.json test questions
python scripts/mine_from_golden.py
```

This runs each golden question through retrieval and creates triplets by matching results against `expect_paths`:

```json
{
  "q": "How is OAuth validated?",
  "repo": "",
  "expect_paths": ["auth", "oauth", "token"]
}
```

- **Positives**: Docs where `file_path` contains any `expect_paths` substring
- **Negatives**: Docs that don't match

This is great for bootstrapping training data when you don't have enough logged queries yet.

### 2. Train Model

```bash
# Train cross-encoder on triplets.jsonl
python scripts/train_reranker.py
```

This:
1. Loads `data/training/triplets.jsonl`
2. Fine-tunes a cross-encoder (default: BAAI/bge-reranker-v2-m3)
3. Saves model to `models/cross-encoder-agro-YYYYMMDD-HHMMSS/`

Training uses **triplet loss**: pushes positive docs closer to query, negative docs farther away.

### 3. Evaluate

```bash
# Test the trained model on golden.json questions
python scripts/eval_reranker.py \
  --model models/cross-encoder-agro-20251015-143210
```

Metrics:
- **MRR (Mean Reciprocal Rank)**: Average of `1/rank` where rank is position of first correct result
  - 1.0 = perfect (correct result always #1)
  - 0.5 = typically rank #2
  - 0.33 = typically rank #3
- **Hit@K**: Percentage of queries where any correct result appears in top K
  - Hit@1 = 80% means 80% of queries have correct answer in #1 position
  - Hit@5 = 95% means 95% have correct answer in top 5

Example output:

```
MRR: 0.847
Hit@1: 76.2%
Hit@3: 90.5%
Hit@5: 95.2%
Hit@10: 98.1%
```

Results are saved to `data/evals/latest.json` with human-readable timestamps.

### 4. Promote to Production

```bash
# Deploy if eval scores are good enough
python scripts/promote_reranker.py \
  --model models/cross-encoder-agro-20251015-143210
```

This:
1. Checks you have at least 30 triplets (can override with `--min N`)
2. Verifies eval metrics exist
3. Copies model to `models/cross-encoder-agro/` (production path)

The server will auto-reload the new model within 60 seconds.

---

## API Endpoints

All reranker management is available via HTTP API:

### Get Model Info

```bash
curl http://localhost:8012/api/reranker/info
```

Returns:

```json
{
  "model_path": "models/cross-encoder-agro",
  "backend": "sentence-transformers",
  "loaded": true,
  "last_check": "Oct 15, 2025 2:32 PM"
}
```

### Mine Triplets

```bash
curl -X POST http://localhost:8012/api/reranker/mine
```

Runs `mine_triplets.py` in background. Check status:

```bash
curl http://localhost:8012/api/reranker/status
```

### Train Model

```bash
curl -X POST http://localhost:8012/api/reranker/train
```

Runs `train_reranker.py` in background.

### Evaluate Model

```bash
curl -X POST http://localhost:8012/api/reranker/evaluate \
  -H "Content-Type: application/json" \
  -d '{"model_path": "models/cross-encoder-agro-20251015-143210"}'
```

Or evaluate current production model:

```bash
curl -X POST http://localhost:8012/api/reranker/evaluate
```

Get latest eval results:

```bash
curl http://localhost:8012/api/reranker/eval/latest
```

Returns:

```json
{
  "timestamp": "Oct 15, 2025 2:45 PM",
  "model_path": "models/cross-encoder-agro",
  "metrics": {
    "mrr": 0.847,
    "hit_at_1": 0.762,
    "hit_at_3": 0.905,
    "hit_at_5": 0.952,
    "hit_at_10": 0.981
  },
  "raw_output": "..."
}
```

### View Logs

```bash
curl http://localhost:8012/api/reranker/logs
```

Returns last 100 lines of background job output (mine/train/eval).

---

## Configuration

### Environment Variables

```bash
# Model path (default: models/cross-encoder-agro)
export AGRO_RERANKER_MODEL_PATH=models/my-custom-reranker

# Backend (default: sentence-transformers, options: sentence-transformers, openai)
export AGRO_RERANKER_BACKEND=sentence-transformers

# Log path for feedback events
export AGRO_LOG_PATH=data/logs/queries.jsonl

# Hot-reload interval (default: 60 seconds)
export AGRO_RERANKER_RELOAD_INTERVAL=30
```

### Model Hot-Reloading

The server checks every 60 seconds if `models/cross-encoder-agro/` has been updated (via mtime). When it detects changes, it automatically reloads the new model without restarting.

This means:
1. Train a new model → saves to `models/cross-encoder-agro-TIMESTAMP/`
2. Evaluate it → `python scripts/eval_reranker.py --model models/cross-encoder-agro-TIMESTAMP`
3. Promote it → `python scripts/promote_reranker.py --model models/cross-encoder-agro-TIMESTAMP`
4. **Wait ~60 seconds** → server auto-reloads
5. New searches use new model

---

## Usage Examples

### Complete Training Cycle

```bash
# 1. Mine training data from golden.json (great for bootstrapping)
python scripts/mine_from_golden.py
# Output: Mined 79 triplets from 79 golden questions

# 2. Train cross-encoder
python scripts/train_reranker.py
# Output: Trained model saved to models/cross-encoder-agro-20251015-143210/

# 3. Evaluate on golden questions
python scripts/eval_reranker.py --model models/cross-encoder-agro-20251015-143210
# Output: MRR: 0.847, Hit@1: 76.2%, Hit@5: 95.2%

# 4. Promote to production
python scripts/promote_reranker.py --model models/cross-encoder-agro-20251015-143210
# Output: ✓ Promoted to models/cross-encoder-agro/

# 5. Wait for hot-reload (or restart server)
# Server will auto-load new model within 60 seconds
```

### Continuous Improvement Loop

```bash
# Weekly or after collecting more feedback:

# 1. Mine new triplets from usage logs
curl -X POST http://localhost:8012/api/reranker/mine

# 2. Train new model
curl -X POST http://localhost:8012/api/reranker/train

# 3. Check logs
curl http://localhost:8012/api/reranker/logs

# 4. Evaluate (once training completes)
curl -X POST http://localhost:8012/api/reranker/evaluate

# 5. Check metrics
curl http://localhost:8012/api/reranker/eval/latest

# 6. If metrics improved, find the new model in models/ and promote it
python scripts/promote_reranker.py --model models/cross-encoder-agro-20251015-143210
```

---

## Troubleshooting

### "Only 1 triplets (< 30); abort"

You need at least 30 training examples. Options:

1. **Mine from golden.json**: `python scripts/mine_from_golden.py` (generates ~1 triplet per question with expect_paths)
2. **Collect more feedback**: Use AGRO more, click on results, use thumbs up/down buttons
3. **Lower threshold temporarily**: `python scripts/promote_reranker.py --min 1` (not recommended for production)

### "No feedback events logged"

Check:
- Is reranker.js loaded in GUI? (look for feedback buttons)
- Are events being sent? (check browser console for POST to `/api/telemetry/event`)
- Is telemetry enabled? (check `data/logs/queries.jsonl` exists)

### "Model not reloading"

- Wait 60 seconds after promoting (hot-reload interval)
- Or restart server: `pkill -f "uvicorn.*app:app"`
- Check logs for reload message: `tail -f /tmp/agro-server.log`

### "Eval metrics not improving"

- Expand golden.json with more diverse questions
- Check if expect_paths are accurate (too broad or too narrow?)
- Verify training triplets are high quality (`head data/training/triplets.jsonl`)
- Increase training epochs or adjust learning rate in train_reranker.py

---

## Advanced Topics

### Custom Reranker Backends

AGRO supports multiple reranker backends:

1. **sentence-transformers** (default)
   - Local cross-encoder model
   - Fast, no API calls
   - Models: BAAI/bge-reranker-v2-m3, ms-marco-MiniLM, etc.

2. **openai** (experimental)
   - Uses OpenAI embeddings + similarity scoring
   - Requires OPENAI_API_KEY
   - Slower, costs per query

Set via `AGRO_RERANKER_BACKEND=openai`.

### Triplet Mining Strategies

**Golden Questions** (scripts/mine_from_golden.py):
- Pros: Clean, controlled test set
- Cons: Limited diversity, needs manual curation
- Best for: Bootstrapping, regression testing

**User Logs** (scripts/mine_triplets.py):
- Pros: Real usage patterns, diverse queries
- Cons: Noisy, needs rating thresholds tuning
- Best for: Continuous improvement, production models

**Hybrid Approach** (recommended):
- Bootstrap with golden questions (get to 30+ triplets)
- Continuously mine from logs as users provide feedback
- Periodically expand golden.json with new common queries

### Integration with Other Components

The reranker integrates with:

- **Hybrid Search** (retrieval/hybrid_search.py:170) - Rescores BM25+Vector results
- **Telemetry** (server/telemetry.py) - Logs feedback events to queries.jsonl
- **Golden Tests** (golden.json) - Provides eval questions and training data
- **GUI** (gui/js/reranker.js) - Collects user feedback via clicks and buttons

---

## Files Reference

| File | Purpose |
|------|---------|
| `gui/js/reranker.js` | Feedback collection UI (click tracking, thumbs buttons) |
| `server/telemetry.py` | Logs feedback events to queries.jsonl |
| `server/reranker.py` | Model loading, hot-reload, inference |
| `server/reranker_info.py` | `/api/reranker/info` endpoint |
| `retrieval/hybrid_search.py` | Calls `ce_rerank()` at line 170 |
| `scripts/mine_triplets.py` | Mines triplets from queries.jsonl |
| `scripts/mine_from_golden.py` | Mines triplets from golden.json |
| `scripts/train_reranker.py` | Trains cross-encoder on triplets.jsonl |
| `scripts/eval_reranker.py` | Evaluates model on golden.json |
| `scripts/promote_reranker.py` | Promotes model to production path |
| `data/logs/queries.jsonl` | Feedback event log |
| `data/training/triplets.jsonl` | Training data |
| `data/evals/latest.json` | Most recent eval metrics |
| `models/cross-encoder-agro/` | Production model (hot-reloaded) |

---

## See Also

- [Main README](../README.md) - Full AGRO setup
- [Retrieval](RETRIEVAL.md) - How hybrid search works
- [Evaluation](EVALUATION.md) - Golden tests and metrics
- [API Reference](API.md) - All HTTP endpoints
