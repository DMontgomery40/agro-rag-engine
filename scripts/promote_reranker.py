import os
import json
import time
import shutil
import argparse
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
