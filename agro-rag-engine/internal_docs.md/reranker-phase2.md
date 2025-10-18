Here’s the feature-gate + canary promotion add-on, packaged as a Codex-CLI runbook. It adds:

Top-N rerank gate (speed control).

Hot-reload on model change (no server restart needed).

Click-aware triplet miner (uses /api/feedback clicks).

Canary promotion (promote only if ≥ 2% MRR gain).

Paste each block as-is.

1) Update reranker: Top-N gate + hot-reload
REPO="$HOME/agro" && \
cd "$REPO" && \
cat > server/reranker.py <<'PY'
import os, math, time
from typing import List, Dict, Any
from pathlib import Path
from sentence_transformers import CrossEncoder

_RERANKER = None
_RERANKER_PATH = None
_RERANKER_MTIME = 0.0
_LAST_CHECK = 0.0

def _latest_mtime(p: str) -> float:
    try:
        base = Path(p)
        if not base.exists():
            return 0.0
        latest = base.stat().st_mtime
        if base.is_file():
            return latest
        for root, dirs, files in os.walk(base):
            for name in files:
                try:
                    t = Path(root, name).stat().st_mtime
                    if t > latest:
                        latest = t
                except Exception:
                    pass
        return latest
    except Exception:
        return 0.0

def get_reranker() -> CrossEncoder:
    """
    Loads a CrossEncoder and supports:
      - AGRO_RERANKER_MODEL_PATH (dir or HF id)
      - AGRO_RERANKER_RELOAD_ON_CHANGE=1 (watch for model dir mtime changes)
      - AGRO_RERANKER_RELOAD_PERIOD_SEC (default 60)
      - AGRO_RERANKER_MAXLEN (default 512)
    """
    global _RERANKER, _RERANKER_PATH, _RERANKER_MTIME, _LAST_CHECK
    path = os.getenv("AGRO_RERANKER_MODEL_PATH", "cross-encoder/ms-marco-MiniLM-L-6-v2")
    need_reload = False

    if _RERANKER is None or path != _RERANKER_PATH:
        need_reload = True
    elif os.getenv("AGRO_RERANKER_RELOAD_ON_CHANGE", "0") == "1":
        period = int(os.getenv("AGRO_RERANKER_RELOAD_PERIOD_SEC", "60"))
        now = time.monotonic()
        if now - _LAST_CHECK >= period:
            _LAST_CHECK = now
            mtime = _latest_mtime(path)
            if mtime > _RERANKER_MTIME:
                need_reload = True

    if need_reload:
        _RERANKER = CrossEncoder(path, max_length=int(os.getenv("AGRO_RERANKER_MAXLEN", "512")))
        _RERANKER_PATH = path
        _RERANKER_MTIME = _latest_mtime(path)
    return _RERANKER

def _minmax(scores: List[float]) -> List[float]:
    if not scores: return []
    mn, mx = min(scores), max(scores)
    if math.isclose(mn, mx):
        return [0.5 for _ in scores]
    return [(s - mn) / (mx - mn) for s in scores]

def rerank_candidates(
    query: str,
    candidates: List[Dict[str, Any]],
    blend_alpha: float = float(os.getenv("AGRO_RERANKER_ALPHA", "0.7"))
) -> List[Dict[str, Any]]:
    """
    Feature gate:
      - AGRO_RERANKER_TOPN = N (default 50). 0 = rerank ALL.
    """
    if not candidates or "text" not in candidates[0]:
        return candidates

    # Base order by retriever score (desc) to pick top-N head
    base_sorted = sorted(candidates, key=lambda c: float(c.get("score", 0.0)), reverse=True)
    topn = max(0, int(os.getenv("AGRO_RERANKER_TOPN", "50")))
    head = base_sorted if topn == 0 else base_sorted[:topn]
    tail = [] if topn == 0 else base_sorted[topn:]

    model = get_reranker()
    pairs = [(query, c.get("text", "")) for c in head]
    ce_scores = model.predict(pairs, batch_size=int(os.getenv("AGRO_RERANKER_BATCH", "16")))
    base_scores = [float(c.get("score", 0.0)) for c in head]
    base_norm = _minmax(base_scores)

    reranked_head = []
    for c, ce, bn in zip(head, ce_scores, base_norm):
        blended = (blend_alpha * float(ce)) + ((1.0 - blend_alpha) * float(bn))
        item = dict(c)
        item["rerank_score"] = blended
        item["cross_encoder_score"] = float(ce)
        item["base_score_norm"] = float(bn)
        reranked_head.append(item)
    reranked_head.sort(key=lambda x: x["rerank_score"], reverse=True)

    # Tail remains in base order (fast path, no CE scoring)
    return reranked_head + tail
PY


Set AGRO_RERANKER_TOPN=50 (fast) or 0 (best quality).

2) Make miner click-aware (uses /api/feedback)
cd "$REPO" && \
cat > scripts/mine_triplets.py <<'PY'
import json, sys
from pathlib import Path
from collections import defaultdict
from typing import List, Dict, Any

LOG = Path("data/logs/queries.jsonl")
OUT = Path("data/training/triplets.jsonl")

def iter_events():
    if not LOG.exists():
        return
    with LOG.open("r", encoding="utf-8") as f:
        for line in f:
            line=line.strip()
            if not line: continue
            try:
                yield json.loads(line)
            except Exception:
                continue

def main():
    n_in, n_out = 0, 0
    OUT.parent.mkdir(parents=True, exist_ok=True)

    # Pass 1: collect feedback
    thumbs = {}
    clicks = defaultdict(set)
    for evt in iter_events():
        if evt.get("type") != "feedback":
            continue
        fb = evt.get("feedback", {})
        sig = fb.get("signal")
        if sig in {"thumbsup", "thumbsdown"}:
            thumbs[evt["event_id"]] = sig
        elif sig == "click" and fb.get("doc_id"):
            clicks[evt["event_id"]].add(fb["doc_id"])

    # Pass 2: mine triplets from queries
    with OUT.open("w", encoding="utf-8") as out:
        for evt in iter_events():
            if evt.get("type") != "query":
                continue
            n_in += 1
            retrieval = evt.get("retrieval") or []
            if not retrieval:
                continue

            # Choose positive
            pos = None
            # a) any clicked doc gets priority
            for r in retrieval:
                if r.get("doc_id") in clicks.get(evt.get("event_id"), set()):
                    pos = r; break
            # b) ground truth refs
            if not pos and evt.get("ground_truth_refs"):
                gt = set(evt["ground_truth_refs"])
                for r in retrieval:
                    if r.get("doc_id") in gt:
                        pos = r; break
            # c) if thumbs up, take top-1 as weak positive
            if not pos and thumbs.get(evt.get("event_id")) == "thumbsup":
                pos = retrieval[0] if retrieval else None

            if not pos or not pos.get("text"):
                continue

            # Negatives: top other retrieved with text
            negs = [r for r in retrieval if r is not pos and r.get("text")]
            negs = negs[:4]
            if not negs:
                continue

            item = {
                "query": evt.get("query_rewritten") or evt.get("query_raw", ""),
                "positive_text": pos["text"],
                "positive_doc_id": pos.get("doc_id",""),
                "negative_texts": [n["text"] for n in negs],
                "negative_doc_ids": [n.get("doc_id","") for n in negs],
                "source_event_id": evt.get("event_id","")
            }
            out.write(json.dumps(item, ensure_ascii=False) + "\n")
            n_out += 1

    print(f"mined {n_out} triplets from {n_in} query events")

if __name__ == "__main__":
    sys.exit(main())
PY

3) Canary promotion script (promote only if ≥ 2% MRR gain)
cd "$REPO" && \
cat > scripts/promote_reranker.py <<'PY'
import os, json, time, shutil, argparse
from pathlib import Path
from typing import List, Dict, Any, Tuple
import numpy as np
from sentence_transformers import CrossEncoder

TRIPLETS = Path("data/training/triplets.jsonl")
RELEASES = Path("models/releases")
LOGFILE = Path("data/logs/model_promotions.log")

def load_triplets(p: Path) -> List[Dict[str, Any]]:
    items=[]
    with p.open("r", encoding="utf-8") as f:
        for line in f:
            items.append(json.loads(line))
    return items

def eval_mrr(model: CrossEncoder, triplets: List[Dict[str, Any]]) -> Tuple[float, int]:
    ranks=[]
    for it in triplets:
        q = it["query"]
        pos = it["positive_text"]
        cands = [pos] + it["negative_texts"]
        scores = model.predict([(q, t) for t in cands], batch_size=16)
        order = np.argsort(-scores)  # desc
        rank = int(np.where(order==0)[0][0]) + 1
        ranks.append(rank)
    mrr = float(np.mean([1.0/r for r in ranks])) if ranks else 0.0
    return mrr, len(ranks)

def safe_symlink(target: Path, link: Path):
    if link.exists() or link.is_symlink():
        try:
            link.unlink()
        except Exception:
            # fallback: rename
            link.rename(link.with_suffix(".old"))
    link.parent.mkdir(parents=True, exist_ok=True)
    link.symlink_to(target, target_is_directory=True)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--candidate", default="models/cross-encoder-agro")
    ap.add_argument("--current",   default="models/cross-encoder-current")
    ap.add_argument("--triplets",  default=str(TRIPLETS))
    ap.add_argument("--delta",     type=float, default=0.02, help="relative improvement threshold (e.g., 0.02 = +2%)")
    ap.add_argument("--min",       type=int,   default=30,   help="min eval items to consider")
    args = ap.parse_args()

    tpath = Path(args.triplets)
    if not tpath.exists():
        print("no triplets; abort")
        return 2

    triplets = load_triplets(tpath)
    if len(triplets) < args.min:
        print(f"only {len(triplets)} triplets (< {args.min}); abort")
        return 3

    cand_path = Path(args.candidate)
    if not cand_path.exists():
        print("candidate model missing; abort")
        return 4

    # Evaluate candidate
    cand = CrossEncoder(str(cand_path))
    cand_mrr, n = eval_mrr(cand, triplets)

    # Evaluate current (if present)
    cur_path = Path(args.current)
    if cur_path.exists():
        cur = CrossEncoder(str(cur_path.resolve()))
        cur_mrr, _ = eval_mrr(cur, triplets)
    else:
        cur_mrr = 0.0

    improved = (cand_mrr >= cur_mrr * (1.0 + args.delta))
    ts = time.strftime("%Y%m%d-%H%M%S", time.gmtime())

    with LOGFILE.open("a", encoding="utf-8") as lf:
        lf.write(json.dumps({
            "ts": ts, "n": n,
            "candidate": str(cand_path),
            "current": str(cur_path),
            "current_mrr": cur_mrr,
            "candidate_mrr": cand_mrr,
            "delta_rel": (cand_mrr - cur_mrr) / (cur_mrr if cur_mrr > 0 else 1.0),
            "promoted": bool(improved)
        }) + "\n")

    if not improved:
        print(f"no promotion: cand MRR {cand_mrr:.4f} vs current {cur_mrr:.4f}")
        return 0

    # Copy to releases and update 'current' symlink atomically
    RELEASES.mkdir(parents=True, exist_ok=True)
    dest = RELEASES / f"cross-encoder-{ts}"
    shutil.copytree(cand_path, dest, dirs_exist_ok=True)
    safe_symlink(dest, cur_path)
    print(f"PROMOTED: {cand_mrr:.4f} (cand) vs {cur_mrr:.4f} (current) → {cur_path} -> {dest}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
PY

// before 4 and 5
`pip install datasets`

// Where do I put this
4) Re-run the loop once (mine → train → eval → canary)
cd "$REPO" && \
. .venv/bin/activate && \
python scripts/mine_triplets.py && \
python scripts/train_reranker.py --epochs 2 --batch 16 --base cross-encoder/ms-marco-MiniLM-L-6-v2 --out models/cross-encoder-agro && \
python scripts/eval_reranker.py --model models/cross-encoder-agro && \
python scripts/promote_reranker.py --candidate models/cross-encoder-agro --current models/cross-encoder-current --triplets data/training/triplets.jsonl --delta 0.02 --min 30


Promotion creates/updates models/cross-encoder-current (symlink).
// and where do i put this?
5) Enable hot-reload + top-N in the running API
cd "$REPO" && \
export AGRO_LOG_PATH="$REPO/data/logs/queries.jsonl" && \
export AGRO_RERANKER_ENABLED=1 && \
export AGRO_RERANKER_MODEL_PATH="$REPO/models/cross-encoder-current" && \
export AGRO_RERANKER_ALPHA=0.7 && \
export AGRO_RERANKER_TOPN=50 && \
export AGRO_RERANKER_RELOAD_ON_CHANGE=1 && \
export AGRO_RERANKER_RELOAD_PERIOD_SEC=60 && \
. .venv/bin/activate && \
uvicorn server.app:app --host 0.0.0.0 --port 8000


No restart needed after promotion: the reranker will auto-reload within ~60s when the symlink target changes.

6) Nightly job (learn → eval → promote)
cd "$REPO" && \
( crontab -l 2>/dev/null; echo '15 2 * * * cd '"$REPO"' && . .venv/bin/activate && python scripts/mine_triplets.py && python scripts/train_reranker.py --epochs 1 --batch 16 --out models/cross-encoder-agro && python scripts/promote_reranker.py --candidate models/cross-encoder-agro --current models/cross-encoder-current --triplets data/training/triplets.jsonl --delta 0.02 --min 30 >> data/logs/nightly_reranker.log 2>&1' ) | crontab -

Quick sanity checklist

Frontend sends clicks and votes to POST /api/feedback (already added).

Your ask handler passes passage text into retrieved_cands[*].text.

You see new lines in data/logs/queries.jsonl after each ask and feedback.

After a few sessions, mine_triplets.py reports non-zero triplets.

Canary script promotes only when MRR improves by ≥ 2%.

API picks up the new model within a minute (hot-reload).

Want me to add a tiny /api/reranker/info endpoint that returns current model path, mtime, and top-N for quick health checks?

You said:
yes
ChatGPT said:
Thought for 1m 6s

alright david — here’s a tiny, drop-in /api/reranker/info health endpoint (plus a small helper in server/reranker.py). fully bundled commands, no placeholders.

1) Update server/reranker.py to expose get_reranker_info()
REPO="$HOME/agro" && \
cd "$REPO" && \
mkdir -p server && touch server/__init__.py && \
cat > server/reranker.py <<'PY'
import os, math, time
from typing import List, Dict, Any, Optional
from pathlib import Path
from sentence_transformers import CrossEncoder

_RERANKER: Optional[CrossEncoder] = None
_RERANKER_PATH: Optional[str] = None
_RERANKER_MTIME: float = 0.0
_LAST_CHECK: float = 0.0

def _latest_mtime(p: str) -> float:
    try:
        base = Path(p)
        if not base.exists():
            return 0.0
        latest = base.stat().st_mtime
        if base.is_file():
            return latest
        for root, _, files in os.walk(base):
            for name in files:
                try:
                    t = Path(root, name).stat().st_mtime
                    if t > latest:
                        latest = t
                except Exception:
                    pass
        return latest
    except Exception:
        return 0.0

def get_reranker() -> CrossEncoder:
    """
    Loads and (optionally) hot-reloads the CrossEncoder model.
    Env:
      AGRO_RERANKER_MODEL_PATH   (dir or HF id; default MiniLM)
      AGRO_RERANKER_RELOAD_ON_CHANGE=1
      AGRO_RERANKER_RELOAD_PERIOD_SEC (default 60)
      AGRO_RERANKER_MAXLEN (default 512)
    """
    global _RERANKER, _RERANKER_PATH, _RERANKER_MTIME, _LAST_CHECK
    path = os.getenv("AGRO_RERANKER_MODEL_PATH", "cross-encoder/ms-marco-MiniLM-L-6-v2")
    need_reload = False

    if _RERANKER is None or path != _RERANKER_PATH:
        need_reload = True
    elif os.getenv("AGRO_RERANKER_RELOAD_ON_CHANGE", "0") == "1":
        period = int(os.getenv("AGRO_RERANKER_RELOAD_PERIOD_SEC", "60"))
        now = time.monotonic()
        if now - _LAST_CHECK >= period:
            _LAST_CHECK = now
            mtime = _latest_mtime(path)
            if mtime > _RERANKER_MTIME:
                need_reload = True

    if need_reload:
        _RERANKER = CrossEncoder(path, max_length=int(os.getenv("AGRO_RERANKER_MAXLEN", "512")))
        _RERANKER_PATH = path
        _RERANKER_MTIME = _latest_mtime(path)
    return _RERANKER

def _minmax(scores: List[float]) -> List[float]:
    if not scores: return []
    mn, mx = min(scores), max(scores)
    if math.isclose(mn, mx):
        return [0.5 for _ in scores]
    return [(s - mn) / (mx - mn) for s in scores]

def rerank_candidates(
    query: str,
    candidates: List[Dict[str, Any]],
    blend_alpha: float = float(os.getenv("AGRO_RERANKER_ALPHA", "0.7"))
) -> List[Dict[str, Any]]:
    """
    Feature gate:
      AGRO_RERANKER_TOPN=N (default 50). 0 = rerank ALL.
    candidates: [{"doc_id": str, "score": float, "text": str, "clicked": bool}, ...]
    """
    if not candidates or "text" not in candidates[0]:
        return candidates

    base_sorted = sorted(candidates, key=lambda c: float(c.get("score", 0.0)), reverse=True)
    topn = max(0, int(os.getenv("AGRO_RERANKER_TOPN", "50")))
    head = base_sorted if topn == 0 else base_sorted[:topn]
    tail = [] if topn == 0 else base_sorted[topn:]

    model = get_reranker()
    pairs = [(query, c.get("text", "")) for c in head]
    ce_scores = model.predict(pairs, batch_size=int(os.getenv("AGRO_RERANKER_BATCH", "16")))
    base_scores = [float(c.get("score", 0.0)) for c in head]
    base_norm = _minmax(base_scores)

    reranked_head = []
    for c, ce, bn in zip(head, ce_scores, base_norm):
        blended = (blend_alpha * float(ce)) + ((1.0 - blend_alpha) * float(bn))
        item = dict(c)
        item["rerank_score"] = blended
        item["cross_encoder_score"] = float(ce)
        item["base_score_norm"] = float(bn)
        reranked_head.append(item)
    reranked_head.sort(key=lambda x: x["rerank_score"], reverse=True)
    return reranked_head + tail

def get_reranker_info() -> Dict[str, Any]:
    """
    Returns current reranker config/state without mutating env.
    """
    global _RERANKER, _RERANKER_PATH, _RERANKER_MTIME, _LAST_CHECK
    path = os.getenv("AGRO_RERANKER_MODEL_PATH", "cross-encoder/ms-marco-MiniLM-L-6-v2")
    try:
        resolved = str(Path(path).resolve())
    except Exception:
        resolved = path
    info: Dict[str, Any] = {
        "enabled": os.getenv("AGRO_RERANKER_ENABLED", "1") == "1",
        "path": path,
        "resolved_path": resolved,
        "model_loaded": _RERANKER is not None,
        "device": None,
        "alpha": float(os.getenv("AGRO_RERANKER_ALPHA", "0.7")),
        "topn": int(os.getenv("AGRO_RERANKER_TOPN", "50")),
        "batch": int(os.getenv("AGRO_RERANKER_BATCH", "16")),
        "maxlen": int(os.getenv("AGRO_RERANKER_MAXLEN", "512")),
        "reload_on_change": os.getenv("AGRO_RERANKER_RELOAD_ON_CHANGE", "0") == "1",
        "reload_period_sec": int(os.getenv("AGRO_RERANKER_RELOAD_PERIOD_SEC", "60")),
        "model_dir_mtime": _RERANKER_MTIME,
        "last_check_monotonic": _LAST_CHECK,
    }
    if _RERANKER is not None:
        try:
            info["device"] = str(_RERANKER.model.device)
        except Exception:
            pass
    return info
PY

2) Add a router: GET /api/reranker/info
cd "$REPO" && \
cat > server/reranker_info.py <<'PY'
from fastapi import APIRouter
from .reranker import get_reranker, get_reranker_info

router = APIRouter()

@router.get("/api/reranker/info")
def reranker_info():
    # trigger lazy load / hot-reload check if needed
    get_reranker()
    return get_reranker_info()
PY

3) Mount the router in server/app.py (safe patch)
cd "$REPO" && \
python - <<'PY'
from pathlib import Path
p = Path("server/app.py")
s = p.read_text(encoding="utf-8")

imp = "from server.reranker_info import router as reranker_info_router"
inc = "app.include_router(reranker_info_router)"

changed = False
if imp not in s:
    if "from server.feedback import router as feedback_router" in s:
        s = s.replace("from server.feedback import router as feedback_router",
                      "from server.feedback import router as feedback_router\n" + imp)
    elif "from fastapi" in s:
        i = s.find("\n", s.find("from fastapi"))
        s = s[:i+1] + imp + "\n" + s[i+1:]
    else:
        s = imp + "\n" + s
    changed = True

if inc not in s:
    if "app.include_router(feedback_router)" in s:
        s = s.replace("app.include_router(feedback_router)",
                      "app.include_router(feedback_router)\n" + inc)
    elif "app = FastAPI" in s:
        i = s.find("\n", s.find("app = FastAPI"))
        s = s[:i+1] + inc + "\n" + s[i+1:]
    else:
        s = s + "\n" + inc + "\n"
    changed = True

if changed:
    p.write_text(s, encoding="utf-8")
print("patched" if changed else "no changes needed")
PY

4) Quick test
cd "$REPO" && \
export AGRO_RERANKER_ENABLED=1 && \
export AGRO_RERANKER_MODEL_PATH="$REPO/models/cross-encoder-current" && \
export AGRO_RERANKER_ALPHA=0.7 && \
export AGRO_RERANKER_TOPN=50 && \
export AGRO_RERANKER_RELOAD_ON_CHANGE=1 && \
export AGRO_RERANKER_RELOAD_PERIOD_SEC=60 && \
. .venv/bin/activate && \
uvicorn server.app:app --host 0.0.0.0 --port 8000 &

sleep 1 && \
curl -sS http://127.0.0.1:8000/api/reranker/info | jq .


Expected shape:

{
  "enabled": true,
  "path": "/home/you/agro/models/cross-encoder-current",
  "resolved_path": "/home/you/agro/models/releases/cross-encoder-2025.../...",
  "model_loaded": true,
  "device": "cpu",
  "alpha": 0.7,
  "topn": 50,
  "batch": 16,
  "maxlen": 512,
  "reload_on_change": true,
  "reload_period_sec": 60,
  "model_dir_mtime": 1699999999.0,
  "last_check_monotonic": 12345.67
}
