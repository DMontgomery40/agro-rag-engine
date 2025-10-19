#!/usr/bin/env python3
"""Mine training triplets from query logs.

Reads data/logs/queries.jsonl and extracts positive/negative examples
for reranker training based on clicks, feedback, and ground truth.
"""
import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional, Set

# Resolve repo root (parent of this scripts/ directory)
BASE = Path(__file__).resolve().parents[1]

# Respect AGRO_LOG_PATH if provided (absolute or relative to repo root)
_log_env = os.getenv("AGRO_LOG_PATH", "data/logs/queries.jsonl")
LOG = Path(_log_env)
if not LOG.is_absolute():
    LOG = BASE / LOG

# Output always under repo root (unless overridden via env)
_out_env = os.getenv("AGRO_TRIPLETS_PATH", "data/training/triplets.jsonl")
OUT = Path(_out_env)
if not OUT.is_absolute():
    OUT = BASE / OUT

def iter_events():
    """Yield all events from the query log."""
    if not LOG.exists():
        return
    with LOG.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except Exception:
                continue

def _already_mined_event_ids(path: Path) -> Set[str]:
    seen: Set[str] = set()
    if not path.exists():
        return seen
    try:
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                try:
                    obj = json.loads(line)
                    eid = str(obj.get("source_event_id", ""))
                    if eid:
                        seen.add(eid)
                except Exception:
                    continue
    except Exception:
        pass
    return seen

def main():
    n_in, n_out = 0, 0
    OUT.parent.mkdir(parents=True, exist_ok=True)

    # Mode: append (default) or replace if AGRO_RERANKER_MINE_MODE=replace or AGRO_RERANKER_MINE_RESET=1
    mode = os.getenv("AGRO_RERANKER_MINE_MODE", "append").lower()
    reset = str(os.getenv("AGRO_RERANKER_MINE_RESET", "0")).strip().lower() in {"1","true","on","yes"}
    file_mode = "w" if (mode == "replace" or reset) else "a"

    # Build de-dup set of already mined event IDs
    seen_eids = set() if file_mode == "w" else _already_mined_event_ids(OUT)

    # Open output
    with OUT.open(file_mode, encoding="utf-8") as out:
        # First pass: collect feedback by event_id
        thumbs = {}
        clicks = {}
        for evt in iter_events():
            if evt.get("type") == "feedback":
                fb = evt.get("feedback", {})
                signal = fb.get("signal", "")
                if signal in {"thumbsup", "thumbsdown"}:
                    thumbs.setdefault(evt["event_id"], signal)
                elif signal in {"star1", "star2", "star3", "star4", "star5"}:
                    # Convert star ratings to thumbs: star3+ = thumbsup, star1-2 = thumbsdown
                    rating = int(signal.replace("star", ""))
                    thumbs.setdefault(evt["event_id"], "thumbsup" if rating >= 3 else "thumbsdown")
                elif signal == "click":
                    did = fb.get("doc_id")
                    if did:
                        clicks.setdefault(evt["event_id"], [])
                        # keep first 3 clicks per event (order matters)
                        if len(clicks[evt["event_id"]]) < 3:
                            clicks[evt["event_id"]].append(str(did))

        # Second pass: mine triplets from queries
        for evt in iter_events():
            if evt.get("type") != "query":
                continue
            n_in += 1
            retrieval = evt.get("retrieval") or []
            if not retrieval:
                continue
            ev_id = evt.get("event_id")
            # Skip if we already mined this event in a previous run
            if ev_id and ev_id in seen_eids:
                continue

            # Positive selection priority:
            # 1) Explicit click signal matched by doc_id
            pos = None
            if ev_id and ev_id in clicks:
                # try to match first clicked doc_id with retrieval list
                wanted = set(clicks[ev_id])
                for r in retrieval:
                    if str(r.get("doc_id","")) in wanted:
                        pos = r
                        break
            # 2) Retrieved already marked as clicked (legacy)
            if not pos:
                clicked = [r for r in retrieval if r.get("clicked")]
                pos = clicked[0] if clicked else None
            
            if not pos and evt.get("ground_truth_refs"):
                gt = set(evt["ground_truth_refs"])
                for r in retrieval:
                    if r.get("doc_id") in gt:
                        pos = r
                        break
            
            if not pos:
                # Weak heuristic if thumbs up: take top-1 as positive
                if thumbs.get(ev_id) == "thumbsup":
                    pos = retrieval[0]

            if not pos or not pos.get("text"):
                continue

            # Negatives = other retrieved with text
            negs = [r for r in retrieval if r is not pos and r.get("text")]
            # Keep up to 4 hard negatives (top-scoring non-clicked)
            negs = negs[:4]
            if not negs:
                continue

            item = {
                "query": evt.get("query_rewritten") or evt.get("query_raw", ""),
                "positive_text": pos["text"],
                "positive_doc_id": pos.get("doc_id", ""),
                "negative_texts": [n["text"] for n in negs],
                "negative_doc_ids": [n.get("doc_id", "") for n in negs],
                "source_event_id": evt.get("event_id", "")
            }
            out.write(json.dumps(item, ensure_ascii=False) + "\n")
            if ev_id:
                seen_eids.add(ev_id)
            n_out += 1

    print(f"mined {n_out} triplets from {n_in} query events")
    print(f"log_path={LOG}")
    print(f"out_path={OUT}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
