#!/usr/bin/env python3
"""Train cross-encoder reranker on mined triplets.

Loads triplets from data/training/triplets.jsonl and fine-tunes
a cross-encoder model for improved retrieval ranking.
"""
import json
import random
import argparse
import sys
from pathlib import Path
from typing import List, Dict, Any
from sentence_transformers import CrossEncoder, InputExample
from torch.utils.data import DataLoader

def load_triplets(path: Path) -> List[Dict[str, Any]]:
    """Load all triplets from JSONL file."""
    items = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            items.append(json.loads(line))
    return items

def to_pairs(items: List[Dict[str, Any]]):
    """Convert triplets to (query, text, label) pairs for training."""
    pairs = []
    for it in items:
        q = it["query"]
        pt = it["positive_text"]
        pairs.append(InputExample(texts=[q, pt], label=1.0))
        for nt in it["negative_texts"]:
            pairs.append(InputExample(texts=[q, nt], label=0.0))
    return pairs

def main():
    ap = argparse.ArgumentParser(description="Train cross-encoder reranker")
    ap.add_argument("--triplets", default="data/training/triplets.jsonl",
                    help="Path to triplets JSONL file")
    ap.add_argument("--base", default="cross-encoder/ms-marco-MiniLM-L-12-v2",
                    help="Base model to fine-tune")
    ap.add_argument("--out", default="models/cross-encoder-agro",
                    help="Output directory for trained model")
    ap.add_argument("--epochs", type=int, default=2,
                    help="Number of training epochs")
    ap.add_argument("--batch", type=int, default=16,
                    help="Batch size for training")
    args = ap.parse_args()

    triplets = load_triplets(Path(args.triplets))
    if not triplets:
        print("no triplets found.")
        return 1
    
    random.shuffle(triplets)

    # 90/10 split, but ensure at least 1 triplet for training if we have any
    cut = int(0.9 * len(triplets))
    if cut == 0 and len(triplets) > 0:
        cut = 1  # Use all triplets for training if we have very few
    train_tr, dev_tr = triplets[:cut], triplets[cut:]

    train_pairs = to_pairs(train_tr)
    dev_pairs = to_pairs(dev_tr)

    print(f"Training on {len(train_pairs)} pairs ({len(train_tr)} triplets)")
    print(f"Dev set: {len(dev_pairs)} pairs ({len(dev_tr)} triplets)")

    model = CrossEncoder(args.base, num_labels=1, max_length=512)

    train_dl = DataLoader(train_pairs, shuffle=True, batch_size=args.batch)
    dev_dl = DataLoader(dev_pairs, shuffle=False, batch_size=args.batch)

    # Train with built-in BCE loss; simple accuracy eval on dev pairs
    def eval_acc():
        total, correct = 0, 0
        scores = model.predict(
            [[ex.texts[0], ex.texts[1]] for ex in dev_pairs],
            batch_size=args.batch
        )
        for s, ex in zip(scores, dev_pairs):
            total += 1
            if (s >= 0.5 and ex.label >= 0.5) or (s < 0.5 and ex.label < 0.5):
                correct += 1
        return correct / max(1, total)

    warmup_steps = int(len(train_pairs) / args.batch * args.epochs * 0.1)
    
    print(f"Starting training ({args.epochs} epochs, {warmup_steps} warmup steps)...")
    
    # Train epoch by epoch to show progress
    for epoch in range(args.epochs):
        print(f"[EPOCH {epoch+1}/{args.epochs}] Training...")
        sys.stdout.flush()
        
        # Skip evaluation if no dev set
        if len(dev_pairs) == 0:
            model.fit(
                train_dataloader=train_dl,
                epochs=1,
                warmup_steps=warmup_steps if epoch == 0 else 0,
                output_path=args.out,
                use_amp=False,
                show_progress_bar=False
            )
            print(f"[EPOCH {epoch+1}/{args.epochs}] Training completed (no dev set for evaluation)")
        else:
            model.fit(
                train_dataloader=train_dl,
                epochs=1,
                warmup_steps=warmup_steps if epoch == 0 else 0,
                output_path=args.out,
                use_amp=False,
                show_progress_bar=False
            )
            # Eval after each epoch
            acc = eval_acc()
            print(f"[EPOCH {epoch+1}/{args.epochs}] Dev accuracy: {acc:.4f}")
        sys.stdout.flush()

    if len(dev_pairs) > 0:
        acc = eval_acc()
        print(f"dev pairwise accuracy: {acc:.4f}")
    else:
        print("Training completed (no dev set for final evaluation)")
    
    # Explicitly save the model
    model.save(args.out)
    print(f"saved model to: {args.out}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
