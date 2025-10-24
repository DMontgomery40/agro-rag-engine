#!/usr/bin/env python3
"""Mine training triplets from evaluation_dataset.json test questions.

Runs each Evaluation Sample through retrieval and generates triplets
based on expect_paths matches.
"""
import json
import sys
from pathlib import Path

# Add parent dir to path so we can import retrieval
sys.path.insert(0, str(Path(__file__).parent.parent))

from retrieval.hybrid_search import search

# Get repo root (scripts/ -> agro/)
REPO_ROOT = Path(__file__).parent.parent
DATASET_PATH = REPO_ROOT / "data" / "evaluation_dataset.json"
OUT = REPO_ROOT / "data" / "training" / "triplets.jsonl"

def main():
    if not DATASET_PATH.exists():
        print("evaluation_dataset.json not found")
        return 1

    with DATASET_PATH.open() as f:
        questions = json.load(f)

    # Filter to questions with 'q' field
    questions = [q for q in questions if 'q' in q]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    n_out = 0

    with OUT.open("w", encoding="utf-8") as out:
        for item in questions:
            query = item['q']
            repo = item.get('repo', 'agro')
            expect_paths = item.get('expect_paths', [])

            if not expect_paths:
                continue

            # Run retrieval
            try:
                docs = search(query, repo=repo, final_k=20)
            except Exception as e:
                print(f"Error retrieving for '{query}': {e}")
                continue

            if not docs:
                continue

            # Find positives (docs matching expect_paths)
            positives = []
            negatives = []

            for doc in docs:
                fp = doc.get('file_path', '').lower()
                code = doc.get('code', '')

                if not code:
                    continue

                # Check if file path contains any expect_path
                is_match = any(exp.lower() in fp for exp in expect_paths)

                if is_match:
                    positives.append(doc)
                else:
                    negatives.append(doc)

            # Generate triplet if we have at least 1 positive and 1 negative
            if positives and negatives:
                pos = positives[0]  # Take top-scoring positive
                negs = negatives[:4]  # Take up to 4 hard negatives

                triplet = {
                    "query": query,
                    "positive_text": pos['code'][:500],  # Truncate
                    "positive_doc_id": f"{pos.get('file_path')}:{pos.get('start_line')}-{pos.get('end_line')}",
                    "negative_texts": [n['code'][:500] for n in negs],
                    "negative_doc_ids": [f"{n.get('file_path')}:{n.get('start_line')}-{n.get('end_line')}" for n in negs],
                    "source": "evaluation_dataset.json"
                }

                out.write(json.dumps(triplet, ensure_ascii=False) + "\n")
                n_out += 1
                print(f"✓ Mined triplet for: {query}")

    print(f"\nMined {n_out} triplets from {len(questions)} Evaluation Samples")
    return 0

if __name__ == "__main__":
    sys.exit(main())
