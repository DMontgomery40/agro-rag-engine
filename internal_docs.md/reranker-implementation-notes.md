# AGRO Reranker v1 - Implementation Complete ✓

**Status:** PRODUCTION READY  
**Date:** 2025-10-15  
**Implementation:** Full end-to-end learning reranker system

## 🎉 What Was Built

A complete production-ready learning reranker system that:
1. **Logs** every query, retrieval results, and user feedback
2. **Mines** training triplets from logs (positive/negative examples)
3. **Trains** a cross-encoder reranker that learns from clicks and thumbs-up/down
4. **Evaluates** with MRR and Hit@K metrics
5. **Deploys** automatically via environment variables (all configurable in GUI)

## ✅ Completed Components

### 1. Telemetry System (server/telemetry.py) ✓
- **Purpose:** Log queries and feedback for training
- **File:** `/Users/davidmontgomery/agro/server/telemetry.py`
- **Functions:**
  - `log_query_event()` - Logs query, retrieved docs, answer, latency, cost
  - `log_feedback_event()` - Logs thumbs up/down, clicks, notes
- **Output:** `data/logs/queries.jsonl` (JSONL format for streaming)
- **Features:**
  - Event correlation via `event_id`
  - Timestamp tracking
  - Separate query and feedback events for append-only logging

### 2. Feedback API (server/feedback.py) ✓
- **Purpose:** REST endpoint to record user feedback
- **File:** `/Users/davidmontgomery/agro/server/feedback.py`
- **Endpoint:** `POST /api/feedback`
- **Payload:**
  ```json
  {
    "event_id": "uuid-from-query",
    "signal": "thumbsup|thumbsdown|click|noclick",
    "doc_id": "optional-document-id",
    "note": "optional-user-note"
  }
  ```
- **Integration:** Auto-mounted in FastAPI app

### 3. Cross-Encoder Reranker (server/reranker.py) ✓
- **Purpose:** Runtime reranking with trained model
- **File:** `/Users/davidmontgomery/agro/server/reranker.py`
- **Functions:**
  - `get_reranker()` - Lazy-load model (singleton pattern)
  - `rerank_candidates()` - Blend original + cross-encoder scores
- **Model:** sentence-transformers CrossEncoder
- **Default Model:** `cross-encoder/ms-marco-MiniLM-L-6-v2` (fast CPU inference)
- **Blending:** Alpha parameter controls original vs cross-encoder weight
- **Features:**
  - Min-max normalization of scores
  - Configurable blend alpha (default 0.7)
  - Batch inference for efficiency

### 4. Training Scripts ✓

#### Mine Triplets (scripts/mine_triplets.py)
- **Purpose:** Extract positive/negative examples from logs
- **Input:** `data/logs/queries.jsonl`
- **Output:** `data/training/triplets.jsonl`
- **Logic:**
  - Positive = clicked doc OR ground truth match OR top-1 if thumbs-up
  - Negatives = other retrieved docs (up to 4 hard negatives)
  - Uses both query_raw and query_rewritten
- **Usage:** `python scripts/mine_triplets.py`

#### Train Reranker (scripts/train_reranker.py)
- **Purpose:** Fine-tune cross-encoder on triplets
- **Input:** `data/training/triplets.jsonl`
- **Output:** `models/cross-encoder-agro/` (trained model)
- **Features:**
  - 90/10 train/dev split
  - Binary cross-entropy loss (positive=1.0, negative=0.0)
  - Warmup steps (10% of training)
  - Mixed precision (AMP) for faster training
  - Dev accuracy evaluation
- **Usage:**
  ```bash
  python scripts/train_reranker.py \
    --triplets data/training/triplets.jsonl \
    --base cross-encoder/ms-marco-MiniLM-L-6-v2 \
    --out models/cross-encoder-agro \
    --epochs 2 \
    --batch 16
  ```

#### Evaluate Reranker (scripts/eval_reranker.py)
- **Purpose:** Compute ranking metrics
- **Input:** `data/training/triplets.jsonl` (last 10% as test)
- **Metrics:** MRR (Mean Reciprocal Rank), Hit@1, Hit@3, Hit@5, Hit@10
- **Usage:** `python scripts/eval_reranker.py --model models/cross-encoder-agro`

### 5. Server Integration ✓

#### Modified Files:
- **server/app.py:**
  - Imports: telemetry, feedback router, reranker
  - Mounted feedback router
  - Added logging to `/search` endpoint
  - Added logging to `/answer` endpoint
  - Optional reranking when `AGRO_RERANKER_ENABLED=1`

### 6. GUI Configuration ✓
**File:** `gui/index.html`  
**Location:** Configuration → Retrieval → "Learning Reranker (Cross-Encoder)" section

**Settings Added:**
1. **AGRO_RERANKER_ENABLED** - Enable/disable reranker (default: OFF)
2. **AGRO_RERANKER_MODEL_PATH** - Path to trained model (default: `models/cross-encoder-agro`)
3. **AGRO_RERANKER_ALPHA** - Blend weight (default: 0.7, range: 0.0-1.0)
4. **AGRO_RERANKER_MAXLEN** - Max sequence length (default: 512, range: 128-1024)
5. **AGRO_RERANKER_BATCH** - Batch size (default: 16, range: 1-64)
6. **AGRO_LOG_PATH** - Telemetry log path (default: `data/logs/queries.jsonl`)

**Training Workflow UI:**
- Step-by-step guide visible in GUI
- Code snippets for each training step
- Clear explanation of the learning loop

### 7. Dependencies ✓
**File:** `requirements-rag.txt` (already contains all needed deps)

**Required Packages:**
- `sentence-transformers==5.1.1` ✓ (already present)
- `transformers==4.57.0` ✓ (already present)
- `accelerate==1.10.1` ✓ (already present)
- `torch==2.8.0` ✓ (already present)

**No changes needed** - all dependencies already in place!

### 8. Directory Structure ✓
Created directories:
- `data/logs/` - Telemetry logs
- `data/training/` - Training triplets
- `models/` - Trained models

## 🚀 Quick Start Guide

### Step 1: Enable Telemetry (GUI)
1. Open GUI at `http://localhost:8000/`
2. Navigate to **Configuration → Retrieval**
3. Scroll to **"Learning Reranker"** section
4. Settings are already at good defaults
5. Click **"Apply All Changes"** at bottom
6. Telemetry logging is now active!

### Step 2: Accumulate Training Data
- Use your RAG system normally
- Queries are automatically logged
- Optional: Add feedback buttons to your UI that POST to `/api/feedback`

### Step 3: Train the Reranker

```bash
cd /Users/davidmontgomery/agro
. .venv/bin/activate

# Mine triplets from logs
python scripts/mine_triplets.py
# Output: "mined X triplets from Y query events"

# Train the model (takes 5-15 minutes on CPU)
python scripts/train_reranker.py --epochs 2 --batch 16
# Output: "saved model to: models/cross-encoder-agro"

# Evaluate performance
python scripts/eval_reranker.py --model models/cross-encoder-agro
# Output: MRR and Hit@K metrics
```

### Step 4: Deploy the Reranker (GUI)
1. Go back to GUI → Configuration → Retrieval
2. Set **"Enable Learning Reranker"** to **ON**
3. Click **"Apply All Changes"**
4. Reranker is now active!

### Step 5: Iterate (Optional Nightly Job)
Add to crontab for automatic retraining:
```bash
# Edit crontab
crontab -e

# Add this line (runs at 2:15 AM daily)
15 2 * * * cd /Users/davidmontgomery/agro && . .venv/bin/activate && python scripts/mine_triplets.py && python scripts/train_reranker.py --epochs 1 --batch 16 && python scripts/eval_reranker.py --model models/cross-encoder-agro >> data/logs/nightly_reranker.log 2>&1
```

## 🔍 How It Works

### Telemetry Flow:
```
User Query → Retrieval → Rerank → Answer
     ↓            ↓         ↓        ↓
  Logged      Logged    Logged   Logged
     ↓____________↓_________↓________↓
            data/logs/queries.jsonl
```

### Training Flow:
```
queries.jsonl → mine_triplets.py → triplets.jsonl
                                          ↓
                                    train_reranker.py
                                          ↓
                                 models/cross-encoder-agro
                                          ↓
                                    eval_reranker.py
                                          ↓
                                    MRR / Hit@K metrics
```

### Inference Flow:
```
Query → Hybrid Search → [candidates]
                            ↓
                    rerank_candidates()
                    (blend original + CE scores)
                            ↓
                     [reranked results]
```

## 📊 Metrics Explained

### MRR (Mean Reciprocal Rank)
- **Formula:** Average of `1/rank` where rank is position of first correct result
- **Range:** 0.0-1.0 (higher is better)
- **Interpretation:** 
  - 1.0 = perfect (correct result always at position 1)
  - 0.5 = correct result typically at position 2
  - 0.33 = correct result typically at position 3

### Hit@K
- **Formula:** Percentage of queries where correct result appears in top K
- **Range:** 0.0-1.0 (higher is better)
- **Interpretation:**
  - Hit@1 = 0.80 means 80% of queries have correct result at position 1
  - Hit@5 = 0.95 means 95% of queries have correct result in top 5

## 🎯 Tuning Tips

### For Better Precision (fewer false positives):
- Increase `AGRO_RERANKER_ALPHA` (e.g., 0.8-0.9)
- Train with more epochs (--epochs 3-4)
- Increase `AGRO_RERANKER_MAXLEN` for longer context

### For Better Recall (catch more relevant docs):
- Decrease `AGRO_RERANKER_ALPHA` (e.g., 0.5-0.6)
- Keep base retrieval settings broad (high TOPK_DENSE/SPARSE)

### For Faster Inference:
- Decrease `AGRO_RERANKER_MAXLEN` (e.g., 256)
- Increase `AGRO_RERANKER_BATCH` (e.g., 32)
- Use a smaller base model (e.g., `ms-marco-MiniLM-L-2-v2`)

## 🚨 Troubleshooting

### No triplets mined?
**Problem:** `mined 0 triplets from X query events`
**Solutions:**
1. Check logs exist: `ls -lh data/logs/queries.jsonl`
2. Verify logs have retrieval data: `head -n 5 data/logs/queries.jsonl`
3. Add ground truth refs or use feedback (thumbs up/down)
4. Ensure retrieval results include `text` field

### Model won't load?
**Problem:** `FileNotFoundError: models/cross-encoder-agro`
**Solutions:**
1. Check model exists: `ls -lh models/cross-encoder-agro/`
2. Train first: `python scripts/train_reranker.py`
3. Update `AGRO_RERANKER_MODEL_PATH` in GUI if using custom location

### Reranker not improving results?
**Problem:** Similar results with reranker ON/OFF
**Solutions:**
1. Check `AGRO_RERANKER_ENABLED=1` in env
2. Verify model trained on enough data (>50 triplets minimum)
3. Run evals: `python scripts/eval_reranker.py`
4. Try different alpha values in GUI

### Training too slow?
**Problem:** Training takes >1 hour
**Solutions:**
1. Reduce batch size: `--batch 8`
2. Use fewer epochs: `--epochs 1`
3. Use GPU if available (auto-detected by PyTorch)
4. Use smaller base model

## 🔐 Privacy & Security

- **No external API calls** - Everything runs locally
- **No chat model fine-tuning** - Only reranker learns
- **PHI-safe** - Logs are local, can be redacted before training
- **Audit trail** - Every query logged with timestamp

## 📁 File Manifest

### New Files Created:
1. `server/telemetry.py` - Logging module
2. `server/feedback.py` - Feedback API router
3. `server/reranker.py` - Runtime reranker
4. `scripts/mine_triplets.py` - Triplet mining
5. `scripts/train_reranker.py` - Model training
6. `scripts/eval_reranker.py` - Metrics evaluation
7. `internal_docs.md/reranker-implementation-notes.md` - This document

### Modified Files:
1. `server/app.py` - Added telemetry + reranker integration
2. `gui/index.html` - Added Learning Reranker config section

### New Directories:
1. `data/logs/` - Query logs
2. `data/training/` - Training data
3. `models/` - Trained models

## 🎓 Learning Resources

- **Sentence Transformers Docs:** https://www.sbert.net/
- **Cross-Encoder Guide:** https://www.sbert.net/examples/applications/cross-encoder/README.html
- **RAG Improvement Paper:** https://arxiv.org/abs/2305.14283
- **Hard Negative Mining:** https://www.pinecone.io/learn/hard-negative-mining/

## ✅ Production Checklist

- [x] All settings in GUI (accessibility requirement)
- [x] Telemetry logging implemented
- [x] Feedback API endpoint created
- [x] Reranker inference working
- [x] Training scripts complete
- [x] Evaluation metrics implemented
- [x] Dependencies satisfied
- [x] Directories created
- [x] Documentation complete
- [x] Error handling in place
- [x] Privacy-safe (local only)

## 🎉 You're Ready to Go!

The reranker system is **PRODUCTION READY**. Start using your RAG system, and when you have ~50+ queries logged, run the training workflow. The system will learn from real usage and continuously improve!

**Next Steps:**
1. Use your RAG system normally
2. Wait for ~50-100 logged queries
3. Run training workflow (15 minutes)
4. Enable reranker in GUI
5. Watch retrieval quality improve!

**Questions?** Check the runbook at `internal_docs.md/reranks-runbook.md`


