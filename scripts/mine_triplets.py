#!/usr/bin/env python3
"""Mine training triplets from query logs.

Reads data/logs/queries.jsonl and extracts positive/negative examples
for reranker training based on clicks, feedback, and ground truth.
"""
import json
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional

LOG = Path("data/logs/queries.jsonl")
OUT = Path("data/training/triplets.jsonl")

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

def main():
    n_in, n_out = 0, 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    
    with OUT.open("w", encoding="utf-8") as out:
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

            # Positive selection priority:
            # 1) Explicit click signal matched by doc_id
            pos = None
            ev_id = evt.get("event_id")
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
            n_out += 1
    
    print(f"mined {n_out} triplets from {n_in} query events")
    return 0

if __name__ == "__main__":
    sys.exit(main())

