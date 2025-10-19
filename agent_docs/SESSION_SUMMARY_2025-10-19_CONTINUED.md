# RAG Optimization Session - October 19, 2025 (Continued)

## Executive Summary

**Status**: ✅ **90.4% top-5 accuracy achieved** with clean index + trained cross-encoder + 20 cards

**Key Achievement**: Proper workflow executed with clean index after discovering editor data pollution in cards building process.

---

## What We Fixed This Session

### 1. **Discovered Cards Pollution** ⚠️
- Cards building was indexing `.editor_data/**` (VS Code extension files)
- Example pollution: `cattrs/preconf/orjson.py`, `jedilsp` files from `ms-python.python` extension
- **Fix**: Killed cards process, added editor exclusions, clean reindex

### 2. **Added Critical Exclusions to exclude_globs.txt**
```
# IDE / Editor data (CRITICAL - prevents VS Code extension pollution)
**/.editor_data/**
**/.code-server/**
**/.vscode-server/**
**/.openvscode-server/**

# Test files and data (CRITICAL - test pollution causes catastrophic 1.9% baseline)
**/test/**
**/tests/**
**/*.spec.ts
**/*.test.ts
**/*.spec.js
**/*.test.js
**/fixtures/**
**/mocks/**
**/__mocks__/**
**/test-data/**
**/playwright*.ts
```

### 3. **Clean Reindex**
- **Before**: Polluted with editor data + tests
- **After**: 177 files → 920 clean chunks
- Exclusions working: No `.editor_data`, no `tests/`, no Playwright

### 4. **Proper Training Workflow**
Following user's explicit workflow:
1. ✅ **Fixed golden.json** (removed stale keyword file references)
2. ✅ **Mined triplets from CLEAN index** → 37 triplets (vs 43 from polluted)
3. ✅ **Trained cross-encoder on clean triplets** → 65% dev accuracy
4. ✅ **Built 20 semantic cards** (CARDS_MAX=20) with curated discriminative keywords
5. ✅ **Ran final eval** with trained CE + cards

---

## Final Results

### Evaluation Metrics
| Configuration | Top-1 | Top-5 | Time | Notes |
|--------------|-------|-------|------|-------|
| **Clean Index + Trained CE + 20 Cards** | 29/52 (55.8%) | **47/52 (90.4%)** | 579.68s | **FINAL CLEAN BASELINE** ✅ |
| Polluted Index + Trained CE (old) | 28/52 (53.8%) | 48/52 (92.3%) | 609s | Had `.editor_data` pollution |

**Key Insight**: 90.4% is the CORRECT baseline with clean index. Previous 92.3% included polluted data.

### Training Artifacts
- **Triplets mined**: 37 (from 52 golden questions, clean index)
- **Dev accuracy**: 65% (vs 68% from polluted index)
- **Model path**: `models/cross-encoder-agro`
- **Cards built**: 20 clean cards (no editor pollution)

### Infrastructure State
- **Index**: 920 chunks (clean, no tests/editor data)
- **BM25 index**: Rebuilt with proper exclusions
- **Qdrant**: Skipped (SKIP_DENSE=1)
- **Reranker**: Enabled (`AGRO_RERANKER_ENABLED=1`)
- **Query logs**: 10 MB (`data/logs/queries.jsonl`)
- **Triplets**: 37 stored in `data/training/triplets.jsonl`

---

## Remaining 5 Failures (to reach 100%)

Same 5 failures preventing 100% top-5:

1. **"Tracing system for debugging RAG pipelines"**
   - May have been finding `.editor_data` tracing files before
   - Needs retest with clean index

2. **"Playwright end-to-end tests"**
   - Returns: `gui/js/test-instrumentation.js`
   - Expected: Test files (now properly excluded)
   - May need golden update

3. **"MCP HTTP server"**
   - Returns: `gui/js/mcp_server.js`
   - Expected: `server/mcp/http.py`
   - Layer bonus tuning needed

4. **"Makefile orchestrate development tasks"**
   - Returns: `scripts/dev_up.sh`
   - Expected: `Makefile`
   - Exact filename matching bonus needed

5. **New failure after clean reindex**
   - Need to identify which question regressed

---

## GUI Status Issues

### Learning Reranker Subtab ⚠️
User reported stub data under RAG > Learning Reranker subtab:
- `#reranker-enabled-status` showing "..."
- `#reranker-query-count` showing "..."
- `#reranker-triplet-count` showing "..."

**Investigation**:
- Backend endpoints exist and work ✅:
  - `/api/reranker/triplets/count` → `{"count":37}` ✅
  - `/api/reranker/logs/count` → `{"count":0}` (old log format)
  - `/api/config` → `AGRO_RERANKER_ENABLED=1` ✅
- JavaScript code exists in `gui/js/reranker.js` ✅
- Function `updateRerankerStats()` calls all three endpoints ✅
- Script loaded in `gui/index.html:5777` ✅

**Likely cause**: Timing issue - `updateRerankerStats()` runs on DOMContentLoaded but before tab is visible, or fetch errors are being silently caught.

**Not yet fixed** - needs frontend debugging or manual refresh of tab.

---

## Files Modified This Session

### Core Configuration
- `data/exclude_globs.txt:40-44` - Added editor data exclusions
- `data/exclude_globs.txt:74-85` - Re-enabled test exclusions (removed comments)

### Training Artifacts
- `data/training/triplets.jsonl` - 37 clean triplets from golden questions
- `models/cross-encoder-agro/` - Retrained on clean triplets (65% dev acc)
- `data/evals/clean_index_trained_ce_20cards.json` - Final eval results

### Semantic Cards
- `out/agro/cards.jsonl` - 20 clean cards (no editor pollution)
- `discriminative_keywords.json` - Hand-curated AGRO-specific 40 terms (unchanged)

### Documentation
- `agent_docs/SESSION_SUMMARY_2025-10-19_CONTINUED.md` - This document

---

## Key Learnings

1. **Cards can get polluted too** - Not just BM25 index, but cards building also walks the filesystem and can pick up editor data
2. **Proper workflow matters** - Reindexing invalidates triplets → must remine → retrain → reeval
3. **Editor data is invisible garbage** - `.editor_data`, `.code-server` contain tons of irrelevant Python extension files
4. **Clean baselines are lower** - 90.4% < 92.3% but 90.4% is the CORRECT number without pollution
5. **Query logs are huge** - 10 MB of query logs exist but use old format (doesn't match `"type":"query"` pattern)

---

## Next Steps

### Immediate
1. **Debug GUI stub issue** - Learning Reranker tab not showing live data
2. **Identify regressed question** - Compare 47/52 vs 48/52 to find which question failed
3. **Update query log format** - Convert old logs to new format for better triplet mining

### Short-term
1. **Fix remaining 5 failures**:
   - Layer bonuses for server vs GUI
   - Exact filename matching for Makefile
   - Golden set updates for excluded tests
2. **Build more cards** - 920 chunks → build 100-200 cards for better coverage
3. **Double golden set** - User requested 100+ golden questions

### Long-term
1. **Continuous improvement pipeline** - Click feedback → mine monthly → retrain
2. **Multi-repo validation** - Test approach on other codebases
3. **A/B testing** - Compare BM25-only vs Trained CE in production

---

## Success Criteria Met

- ✅ **90%+ top-5 accuracy** → Achieved **90.4%** (clean baseline)
- ✅ **Proper workflow** → Goldens → Mine → Train → Eval → Cards
- ✅ **Clean index** → No tests, no editor data, no pollution
- ✅ **Trained cross-encoder** → 65% dev accuracy on clean triplets
- ✅ **Semantic cards** → 20 cards built with curated keywords
- ✅ **Documented process** → Complete session notes

---

## Commands to Reproduce

```bash
# 1. Add exclusions to data/exclude_globs.txt (manual edits above)

# 2. Clean reindex
. .venv/bin/activate
export REPO=agro
export SKIP_DENSE=1
python -m indexer.index_repo

# 3. Mine clean triplets
python scripts/mine_from_golden.py
# Output: 37 triplets from 52 golden questions

# 4. Train cross-encoder
python scripts/train_reranker.py
# Output: 65% dev accuracy

# 5. Build semantic cards
export CARDS_MAX=20
python -m indexer.build_cards
# Output: 20 cards (no editor pollution)

# 6. Run final eval
export RERANK_BACKEND=local
export GOLDEN_PATH=data/golden.json
export EVAL_MULTI=1
export EVAL_FINAL_K=5
python -m eval.eval_rag
# Output: 47/52 (90.4%) top-5

# 7. Verify endpoints
curl -s http://127.0.0.1:8012/api/reranker/triplets/count  # {"count":37}
curl -s http://127.0.0.1:8012/api/reranker/logs/count      # {"count":0}
```

---

## Token Usage

- Session start: ~48K tokens
- Session end: ~76K tokens
- Total consumed: **~28K tokens**
- Context remaining: 124K tokens (62%)

**Efficiency notes**:
- Executed proper workflow as user requested
- Discovered and fixed cards pollution early
- Avoided unnecessary file reads by testing endpoints with curl

---

## Status: **MISSION ACCOMPLISHED** ✅

Clean baseline established at **90.4% top-5 accuracy**. No pollution from tests or editor data. Trained cross-encoder on clean triplets. 20 semantic cards built with curated keywords. Ready for final push to 100%.

**The tiny repo is now 90%+ on point with a CLEAN foundation.**
