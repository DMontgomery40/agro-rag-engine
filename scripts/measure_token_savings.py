#!/usr/bin/env python3
"""
Measure actual token savings from RAG vs traditional file reading.
Compares targeted RAG retrieval against reading full files.
"""

import sys
import os
from pathlib import Path
from retrieval.hybrid_search import search_routed_multi

try:
    import tiktoken
    HAS_TIKTOKEN = True
except ImportError:
    HAS_TIKTOKEN = False
    print("⚠️  tiktoken not installed - using rough estimates (1 token ≈ 4 chars)")
    print("   Install with: pip install tiktoken\n")


def count_tokens(text: str, model: str = "gpt-4o") -> int:
    """Count tokens precisely if tiktoken available, else estimate"""
    if HAS_TIKTOKEN:
        try:
            encoding = tiktoken.encoding_for_model(model)
            return len(encoding.encode(text))
        except:
            pass
    # Fallback: rough estimate
    return len(text) // 4


def measure_rag_tokens(question: str, repo: str, top_k: int = 10):
    """Measure tokens using RAG hybrid search"""
    results = search_routed_multi(question, repo_override=repo, final_k=top_k)

    # Combine all retrieved code
    combined_text = ""
    for r in results:
        combined_text += f"File: {r['file_path']}:{r['start_line']}-{r['end_line']}\n"
        combined_text += r.get('code', '') + "\n\n"

    tokens = count_tokens(combined_text)

    return {
        'approach': 'RAG (hybrid search)',
        'chunks': len(results),
        'text': combined_text,
        'tokens': tokens,
        'files_touched': len(set(r['file_path'] for r in results))
    }


def measure_traditional_tokens(question: str, repo: str, max_files: int = 10):
    """
    Simulate traditional approach: grep for keywords, read full files.
    This is what you'd do WITHOUT RAG.
    """
    repo_paths = {
        'project': os.getenv('PROJECT_PATH', '/abs/path/to/project'),
        'faxbot': os.getenv('FAXBOT_PATH', '/abs/path/to/faxbot')
    }

    repo_path = repo_paths.get(repo)
    if not repo_path or not os.path.exists(repo_path):
        return {'approach': 'Traditional', 'error': f'Repo not found: {repo_path}'}

    # Extract keywords from question (simulate what a human would grep for)
    keywords = [w.lower() for w in question.split() if len(w) > 3][:5]

    # Find files containing keywords
    combined_text = ""
    matched_files = []

    for py_file in Path(repo_path).rglob('*.py'):
        if 'node_modules' in str(py_file) or '.venv' in str(py_file):
            continue

        try:
            content = py_file.read_text(errors='ignore')

            # If any keyword appears, a human would likely read this whole file
            if any(kw in content.lower() for kw in keywords):
                matched_files.append(str(py_file))
                combined_text += f"\n{'='*60}\nFile: {py_file}\n{'='*60}\n"
                combined_text += content + "\n"

                if len(matched_files) >= max_files:
                    break
        except Exception as e:
            pass

    tokens = count_tokens(combined_text)

    return {
        'approach': 'Traditional (grep + read full files)',
        'files_read': len(matched_files),
        'text': combined_text,
        'tokens': tokens
    }


def run_comparison(question: str, repo: str):
    """Run both approaches and compare"""
    print(f"\n{'='*70}")
    print(f"Question: {question}")
    print(f"Repository: {repo}")
    print(f"{'='*70}\n")

    # Measure RAG
    print("⏳ Running RAG hybrid search...")
    rag = measure_rag_tokens(question, repo, top_k=10)

    # Measure traditional
    print("⏳ Simulating traditional grep + file reading...")
    trad = measure_traditional_tokens(question, repo, max_files=10)

    # Print results
    print(f"\n{'='*70}")
    print("📊 RESULTS:")
    print(f"{'='*70}")

    print(f"\n🔍 RAG Approach:")
    print(f"   Chunks retrieved: {rag['chunks']}")
    print(f"   Files touched: {rag['files_touched']}")
    print(f"   Total tokens: {rag['tokens']:,}")

    print(f"\n📁 Traditional Approach (grep + read full files):")
    print(f"   Files read: {trad['files_read']}")
    print(f"   Total tokens: {trad['tokens']:,}")

    # Calculate savings
    if trad['tokens'] > 0 and rag['tokens'] > 0:
        saved = trad['tokens'] - rag['tokens']
        saved_pct = (saved / trad['tokens']) * 100
        reduction = trad['tokens'] / rag['tokens']

        print(f"\n{'='*70}")
        print("💰 TOKEN SAVINGS:")
        print(f"{'='*70}")
        print(f"   Tokens saved: {saved:,} tokens")
        print(f"   Percentage saved: {saved_pct:.1f}%")
        print(f"   Reduction factor: {reduction:.1f}x smaller")

        # Cost estimate (rough: $15/1M input tokens for gpt-4o)
        cost_per_token = 15 / 1_000_000
        cost_saved = saved * cost_per_token
        print(f"   Cost saved per query: ${cost_saved:.6f}")
        print(f"   Cost saved per 1000 queries: ${cost_saved * 1000:.2f}")

    return rag, trad


if __name__ == '__main__':
    # Test queries
    test_cases = [
        ("Where is OAuth token validated", "project"),
        ("How are fax jobs created and dispatched", "project"),
        ("EventStream component event types", "project"),
        ("provider health status implementation", "project"),
    ]

    results = []

    for question, repo in test_cases:
        try:
            rag, trad = run_comparison(question, repo)
            results.append({
                'question': question,
                'repo': repo,
                'rag_tokens': rag['tokens'],
                'trad_tokens': trad['tokens'],
                'savings': trad['tokens'] - rag['tokens']
            })
        except Exception as e:
            print(f"\n❌ Error testing '{question}': {e}")

    # Summary
    if results:
        print(f"\n\n{'='*70}")
        print("📈 OVERALL SUMMARY")
        print(f"{'='*70}")

        total_rag = sum(r['rag_tokens'] for r in results)
        total_trad = sum(r['trad_tokens'] for r in results)
        total_saved = total_trad - total_rag

        print(f"\nTotal queries tested: {len(results)}")
        print(f"Total RAG tokens: {total_rag:,}")
        print(f"Total traditional tokens: {total_trad:,}")
        print(f"Total saved: {total_saved:,} tokens ({(total_saved/total_trad*100):.1f}%)")
        print(f"Average reduction: {total_trad/total_rag:.1f}x\n")
