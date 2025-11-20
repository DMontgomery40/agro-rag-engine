#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path

# Add repo root to path
sys.path.append(str(Path(__file__).resolve().parents[1]))

from retrieval.hybrid_search import search_routed_multi

def main():
    gp = Path(os.getenv("GOLDEN_PATH", "data/golden.json"))
    out = Path(os.getenv("AGRO_TRIPLETS_PATH", "data/training/triplets.jsonl"))
    
    if not gp.exists():
        print("No golden dataset found")
        return
    
    try:
        questions = json.loads(gp.read_text())
    except Exception as e:
        print(f"Failed to read golden json: {e}")
        return

    count = 0
    
    # Ensure out dir exists
    out.parent.mkdir(parents=True, exist_ok=True)
    
    with out.open("a", encoding="utf-8") as f:
        for q in questions:
            if not isinstance(q, dict): continue
            query = q.get("q")
            expects = q.get("expect_paths", [])
            if not query or not expects: continue
            
            print(f"Processing: {query}")
            
            # Run retrieval
            # Note: This runs in-process, so it requires the environment to be set up (env vars, etc)
            # Ideally this script runs in the same environment as the API
            try:
                docs = search_routed_multi(query, m=2, final_k=10)
            except Exception as e:
                print(f"  Error searching: {e}")
                continue
            
            # Find positives (docs that match expected paths)
            positives = []
            negatives = []
            
            for d in docs:
                path = d.get("file_path", "")
                # Loose match: expected path is substring of actual path
                if any(exp in path for exp in expects):
                    positives.append(d)
                else:
                    negatives.append(d)
            
            if not positives:
                print("  No positives found (recall failure)")
                continue

            # Create triplet for each positive
            for pos in positives:
                # Use up to 5 negatives
                negs = negatives[:5]
                if not negs: continue
                
                item = {
                    "query": query,
                    "positive_text": (pos.get("code") or "")[:2000],
                    "positive_doc_id": f"{pos.get('file_path')}:{pos.get('start_line')}",
                    "negative_texts": [(n.get("code") or "")[:2000] for n in negs],
                    "negative_doc_ids": [f"{n.get('file_path')}:{n.get('start_line')}" for n in negs],
                    "source": "golden_mining"
                }
                f.write(json.dumps(item) + "\n")
                count += 1
                
    print(f"Mined {count} triplets from golden questions.")

if __name__ == "__main__":
    main()

