#!/usr/bin/env python3
"""
Compare token usage across three approaches:
1. Claude alone (no RAG) - reads full files
2. RAG via direct Python calls (hybrid_search.py)
3. RAG via MCP tools (what Claude Code uses)

This shows actual token savings from using RAG.
"""

import sys
import os
import json
from pathlib import Path

# Try tiktoken for precise counts
try:
    import tiktoken
    HAS_TIKTOKEN = True
    print("✓ Using tiktoken for precise token counts\n")
except ImportError:
    HAS_TIKTOKEN = False
    print("⚠️  tiktoken not installed - using estimates (1 token ≈ 4 chars)")
    print("   Install: pip install tiktoken\n")


def count_tokens(text: str, model: str = "gpt-4o") -> int:
    """Count tokens precisely or estimate"""
    if HAS_TIKTOKEN:
        try:
            encoding = tiktoken.encoding_for_model(model)
            return len(encoding.encode(text))
        except:
            pass
    return len(text) // 4


# ============================================================
# Approach 1: Claude Alone (Traditional - NO RAG)
# ============================================================

def measure_claude_alone(question: str, repo: str):
    """
    Simulate what Claude would do WITHOUT RAG:
    - Extract keywords from question
    - Grep files for those keywords
    - Read 5-10 full files
    """
    repo_paths = {
        'project': os.getenv('PROJECT_PATH', '/abs/path/to/project'),
        'faxbot': os.getenv('FAXBOT_PATH', '/abs/path/to/faxbot')
    }

    repo_path = repo_paths.get(repo)
    if not repo_path or not os.path.exists(repo_path):
        return {'error': f'Repo not found: {repo}'}

    # Extract keywords (what Claude would search for)
    keywords = [w.lower() for w in question.split() if len(w) > 3][:5]

    # Find matching files
    matched_files = []
    combined_text = ""

    for py_file in Path(repo_path).rglob('*.py'):
        # Skip vendor/node_modules
        if any(skip in str(py_file) for skip in ['node_modules', '.venv', 'vendor', '.git']):
            continue

        try:
            content = py_file.read_text(errors='ignore')

            # If keywords match, Claude would read this ENTIRE file
            if any(kw in content.lower() for kw in keywords):
                matched_files.append(str(py_file))
                combined_text += f"\n{'='*70}\n{py_file}\n{'='*70}\n{content}\n"

                if len(matched_files) >= 10:  # Limit to 10 files
                    break
        except:
            pass

    tokens = count_tokens(combined_text)

    return {
        'approach': 'Claude Alone (no RAG)',
        'files_read': len(matched_files),
        'chars': len(combined_text),
        'tokens': tokens,
        'files': matched_files[:5]  # Show first 5
    }


# ============================================================
# Approach 2: RAG via Direct Python
# ============================================================

def measure_rag_python(question: str, repo: str, top_k: int = 10):
    """Use hybrid_search.py directly (local Python calls)"""
    try:
        from retrieval.hybrid_search import search_routed_multi

        results = search_routed_multi(question, repo_override=repo, final_k=top_k)

        # Combine retrieved chunks
        combined_text = ""
        for r in results:
            combined_text += f"{r['file_path']}:{r['start_line']}-{r['end_line']}\n"
            combined_text += r.get('code', '') + "\n\n"

        tokens = count_tokens(combined_text)

        return {
            'approach': 'RAG (direct Python)',
            'chunks': len(results),
            'chars': len(combined_text),
            'tokens': tokens,
            'files_touched': len(set(r['file_path'] for r in results)),
            'top_scores': [r['rerank_score'] for r in results[:3]]
        }
    except Exception as e:
        return {'error': str(e)}


# ============================================================
# Approach 3: RAG via MCP (What Claude Code Uses)
# ============================================================

def measure_rag_mcp(question: str, repo: str, top_k: int = 10):
    """
    Simulate MCP tool call (what Claude Code actually uses).
    This calls the same backend as direct Python but through MCP layer.
    """
    try:
        from server.mcp.server import MCPServer

        # Call rag_search tool
        req = {
            'jsonrpc': '2.0',
            'id': 1,
            'method': 'tools/call',
            'params': {
                'name': 'rag_search',
                'arguments': {
                    'repo': repo,
                    'question': question,
                    'top_k': top_k
                }
            }
        }

        server = MCPServer()
        resp = server.handle_request(req)

        # Extract results
        result_text = resp['result']['content'][0]['text']
        result_data = json.loads(result_text)

        # MCP returns file paths + line ranges (no full code in the response)
        # But we need to count what gets sent to Claude
        combined_text = result_text  # This is what Claude receives

        tokens = count_tokens(combined_text)

        return {
            'approach': 'RAG (via MCP tools)',
            'chunks': result_data.get('count', 0),
            'chars': len(combined_text),
            'tokens': tokens,
            'mcp_result_size': len(result_text)
        }
    except Exception as e:
        return {'error': str(e)}


# ============================================================
# Run Comparison
# ============================================================

def run_test(question: str, repo: str):
    """Run all three approaches and compare"""
    print(f"\n{'='*70}")
    print(f"TEST: {question}")
    print(f"REPO: {repo}")
    print(f"{'='*70}\n")

    # Method 1: Claude alone
    print("⏳ Measuring: Claude Alone (traditional grep + read files)...")
    claude_alone = measure_claude_alone(question, repo)

    # Method 2: RAG Python
    print("⏳ Measuring: RAG via Direct Python...")
    rag_python = measure_rag_python(question, repo, top_k=10)

    # Method 3: RAG MCP
    print("⏳ Measuring: RAG via MCP tools...")
    rag_mcp = measure_rag_mcp(question, repo, top_k=10)

    # Print results
    print(f"\n{'='*70}")
    print("RESULTS:")
    print(f"{'='*70}\n")

    # Claude Alone
    if 'error' not in claude_alone:
        print(f"1️⃣  CLAUDE ALONE (no RAG):")
        print(f"   Files read: {claude_alone['files_read']}")
        print(f"   Total tokens: {claude_alone['tokens']:,}")
        print(f"   Characters: {claude_alone['chars']:,}")

    # RAG Python
    if 'error' not in rag_python:
        print(f"\n2️⃣  RAG (Direct Python):")
        print(f"   Chunks retrieved: {rag_python['chunks']}")
        print(f"   Files touched: {rag_python['files_touched']}")
        print(f"   Total tokens: {rag_python['tokens']:,}")
        print(f"   Top scores: {[f'{s:.3f}' for s in rag_python.get('top_scores', [])]}")

    # RAG MCP
    if 'error' not in rag_mcp:
        print(f"\n3️⃣  RAG (via MCP - what Claude Code uses):")
        print(f"   Chunks retrieved: {rag_mcp['chunks']}")
        print(f"   Total tokens: {rag_mcp['tokens']:,}")

    # Calculate savings
    if all('error' not in r for r in [claude_alone, rag_python, rag_mcp]):
        alone_tokens = claude_alone['tokens']
        python_tokens = rag_python['tokens']
        mcp_tokens = rag_mcp['tokens']

        print(f"\n{'='*70}")
        print("💰 TOKEN SAVINGS:")
        print(f"{'='*70}")

        # Python vs Alone
        saved_python = alone_tokens - python_tokens
        pct_python = (saved_python / alone_tokens * 100) if alone_tokens > 0 else 0

        print(f"\nRAG Python vs Claude Alone:")
        print(f"   Tokens saved: {saved_python:,}")
        print(f"   Percentage: {pct_python:.1f}%")
        print(f"   Reduction: {alone_tokens / max(python_tokens, 1):.1f}x smaller")

        # MCP vs Alone
        saved_mcp = alone_tokens - mcp_tokens
        pct_mcp = (saved_mcp / alone_tokens * 100) if alone_tokens > 0 else 0

        print(f"\nRAG MCP vs Claude Alone:")
        print(f"   Tokens saved: {saved_mcp:,}")
        print(f"   Percentage: {pct_mcp:.1f}%")
        print(f"   Reduction: {alone_tokens / max(mcp_tokens, 1):.1f}x smaller")

        # Cost estimate (gpt-4o: $2.50/1M input tokens)
        cost_per_token = 2.50 / 1_000_000

        print(f"\n💵 COST SAVINGS (gpt-4o @ $2.50/1M input tokens):")
        print(f"   Per query (Python): ${saved_python * cost_per_token:.6f}")
        print(f"   Per 1000 queries (Python): ${saved_python * cost_per_token * 1000:.2f}")
        print(f"   Per query (MCP): ${saved_mcp * cost_per_token:.6f}")
        print(f"   Per 1000 queries (MCP): ${saved_mcp * cost_per_token * 1000:.2f}")

    return {
        'question': question,
        'repo': repo,
        'claude_alone': claude_alone.get('tokens', 0),
        'rag_python': rag_python.get('tokens', 0),
        'rag_mcp': rag_mcp.get('tokens', 0)
    }


if __name__ == '__main__':
    # Test cases
    tests = [
        ("Where is OAuth token validated", "project"),
        ("How are fax jobs created and dispatched", "project"),
        ("EventStream component event types in dropdown", "project"),
    ]

    results = []

    for question, repo in tests:
        try:
            result = run_test(question, repo)
            results.append(result)
        except Exception as e:
            print(f"\n❌ Error: {e}")

    # Overall summary
    if results:
        print(f"\n\n{'='*70}")
        print("📊 OVERALL SUMMARY")
        print(f"{'='*70}\n")

        total_alone = sum(r['claude_alone'] for r in results)
        total_python = sum(r['rag_python'] for r in results)
        total_mcp = sum(r['rag_mcp'] for r in results)

        print(f"Total queries: {len(results)}")
        print(f"\nClaude Alone: {total_alone:,} tokens")
        print(f"RAG Python: {total_python:,} tokens")
        print(f"RAG MCP: {total_mcp:,} tokens")

        if total_alone > 0:
            print(f"\nAverage reduction (Python): {total_alone / max(total_python, 1):.1f}x")
            print(f"Average reduction (MCP): {total_alone / max(total_mcp, 1):.1f}x")

            saved_python = total_alone - total_python
            saved_mcp = total_alone - total_mcp

            print(f"\nTotal saved (Python): {saved_python:,} tokens ({saved_python/total_alone*100:.1f}%)")
            print(f"Total saved (MCP): {saved_mcp:,} tokens ({saved_mcp/total_alone*100:.1f}%)")
