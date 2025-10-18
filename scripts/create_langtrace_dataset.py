#!/usr/bin/env python3
"""Create LangTrace dataset from golden questions.

Runs each golden question through retrieval and creates a dataset
with input/output/expected_output for LangTrace evaluation.
"""
import json
import csv
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from retrieval.hybrid_search import search_routed_multi

GOLDEN = Path("data/golden.json")
OUTPUT_CSV = Path("data/langtrace_dataset.csv")

def main():
    if not GOLDEN.exists():
        print(f"❌ {GOLDEN} not found")
        return 1
    
    with GOLDEN.open() as f:
        questions = json.load(f)
    
    # Filter to actual questions
    questions = [q for q in questions if 'q' in q]
    
    rows = []
    print(f"\n📊 Creating LangTrace dataset from {len(questions)} golden questions...\n")
    
    for i, item in enumerate(questions, 1):
        query = item['q']
        repo = item.get('repo', 'agro')
        expect_paths = item.get('expect_paths', [])
        
        print(f"[{i}/{len(questions)}] {query[:60]}...")
        
        # Run retrieval
        try:
            results = search_routed_multi(query, repo_override=repo, m=2, final_k=5)
        except Exception as e:
            print(f"  ⚠ Error: {e}")
            continue
        
        # Format output (top 5 file paths)
        output_paths = [r['file_path'] for r in results[:5]]
        output = "\n".join(f"{i+1}. {p}" for i, p in enumerate(output_paths))
        
        # Format expected output
        expected = "Expected files:\n" + "\n".join(f"  - {p}" for p in expect_paths)
        
        # Check if we got it right
        got_it = any(any(exp in r['file_path'] for r in results[:5]) for exp in expect_paths)
        status = "✓" if got_it else "✗"
        print(f"  {status} {'HIT' if got_it else 'MISS'}")
        
        rows.append({
            "id": f"golden_{i}",
            "input": query,
            "output": output,
            "expected_output": expected,
            "repo": repo,
            "hit": "true" if got_it else "false"
        })
    
    # Write CSV for LangTrace upload
    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_CSV.open('w', newline='', encoding='utf-8') as f:
        if rows:
            writer = csv.DictWriter(f, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
    
    hits = sum(1 for r in rows if r['hit'] == 'true')
    print(f"\n✓ Dataset created: {OUTPUT_CSV}")
    print(f"  {len(rows)} examples")
    print(f"  {hits}/{len(rows)} hits ({100*hits//len(rows)}%)")
    print(f"\n📤 Upload to LangTrace:")
    print(f"  1. Go to https://app.langtrace.ai/project/cmgwowueo00018ejeup2fyegm/datasets")
    print(f"  2. Click 'Upload csv'")
    print(f"  3. Select {OUTPUT_CSV}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())

