#!/usr/bin/env python3
"""Evaluate reranker performance using MRR and Hit@K metrics.

Loads triplets and computes ranking metrics for the trained model.
"""
import json
import argparse
from pathlib import Path
from typing import List, Dict, Any
from sentence_transformers import CrossEncoder
import numpy as np

def load_triplets(path: Path) -> List[Dict[str, Any]]:
    """Load all triplets from JSONL file."""
    items = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            items.append(json.loads(line))
    return items

def mrr_and_hits(model: CrossEncoder, triplets: List[Dict[str, Any]], 
                 k_values=(1, 3, 5, 10)):
    """Compute MRR and Hit@K metrics.
    
    For each triplet, the positive should be ranked first among candidates.
    """
    ranks = []
    hits = {k: 0 for k in k_values}
    
    for it in triplets:
        q = it["query"]
        pos = it["positive_text"]
        cands = [pos] + it["negative_texts"]
        
        scores = model.predict([(q, t) for t in cands], batch_size=16)
        order = np.argsort(-scores)  # descending
        
        # Find rank of the positive (index 0 in cands)
        rank = int(np.where(order == 0)[0][0]) + 1
        ranks.append(rank)
        
        for k in k_values:
            if rank <= k:
                hits[k] += 1
    
    mrr = float(np.mean([1.0 / r for r in ranks])) if ranks else 0.0
    n = len(ranks)
    hitk = {k: (hits[k] / n if n else 0.0) for k in k_values}
    return mrr, hitk, n

def main():
    ap = argparse.ArgumentParser(description="Evaluate reranker performance")
    ap.add_argument("--triplets", default="data/training/triplets.jsonl",
                    help="Path to triplets JSONL file")
    ap.add_argument("--model", default="models/cross-encoder-agro",
                    help="Path to trained model")
    args = ap.parse_args()

    triplets = load_triplets(Path(args.triplets))
    
    # Use last 10% as test set
    cut = max(1, int(0.1 * len(triplets)))
    test = triplets[-cut:] if len(triplets) > 10 else triplets
    
    print(f"Loading model from {args.model}...")
    model = CrossEncoder(args.model)
    
    print(f"Evaluating on {len(test)} triplets...")
    mrr, hitk, n = mrr_and_hits(model, test)
    
    print(f"\nEvaluated on {n} items")
    print(f"MRR@all: {mrr:.4f}")
    for k, v in hitk.items():
        print(f"Hit@{k}: {v:.4f}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())


