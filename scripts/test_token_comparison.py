#!/usr/bin/env python3
"""
Compare token usage across FOUR approaches:

1. Claude Alone (no RAG) - reads full files via grep
2. RAG CLI Standalone - RAG answers directly (no Claude)
3. Claude + RAG Direct - Claude gets full code chunks from RAG
4. Claude + RAG via MCP - Claude gets MCP metadata responses

Shows actual tokens sent to LLM in each scenario.
"""

import sys
import os
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, ROOT_DIR)
import json
from pathlib import Path

# Try tiktoken for precise counts
try:
    import tiktoken
    HAS_TIKTOKEN = True
except ImportError:
    HAS_TIKTOKEN = False
    print("⚠️  Install tiktoken for precise counts: pip install tiktoken\n")


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

def approach1_claude_alone(question: str, repo: str):
    """
    Claude without RAG:
    - Extract keywords
    - Grep files
    - Read 5-10 FULL files
    """
    # Resolve a local repo path for the naive grep-style scan
    # Prefer REPO_PATH, then <REPO>_PATH (legacy), then .
    env_key_generic = os.getenv('REPO_PATH')
    env_key_specific = os.getenv(f"{repo}_PATH")
    repo_path = env_key_specific or env_key_generic or os.getcwd()
    if not repo_path or not os.path.exists(repo_path):
        return {'error': f'Repo not found: {repo_path}'}

    # Keywords from question
    keywords = [w.lower() for w in question.split() if len(w) > 3][:5]

    # Find files
    matched_files = []
    full_content = ""

    for py_file in Path(repo_path).rglob('*.py'):
        if any(skip in str(py_file) for skip in ['node_modules', '.venv', 'vendor', '.git', '__pycache__']):
            continue

        try:
            content = py_file.read_text(errors='ignore')
            if any(kw in content.lower() for kw in keywords):
                matched_files.append(str(py_file))
                full_content += f"\n{'='*70}\nFile: {py_file}\n{'='*70}\n{content}\n"

                if len(matched_files) >= 10:
                    break
        except:
            pass

    tokens = count_tokens(full_content)

    return {
        'method': '1. Claude Alone (no RAG)',
        'description': 'Reads full files matching keywords',
        'files_read': len(matched_files),
        'tokens': tokens,
        'sample_files': [Path(f).name for f in matched_files[:3]]
    }


# ============================================================
# Approach 2: RAG CLI Standalone (no Claude)
# ============================================================

def approach2_rag_standalone(question: str, repo: str):
    """
    RAG CLI standalone - full answer generation without Claude.
    Counts the generated answer + citations.
    """
    try:
        from server.langgraph_app import build_graph

        # Build graph and run (with required thread_id config)
        graph = build_graph()
        result = graph.invoke(
            {
                "question": question,
                "repo": repo,
            },
            config={"configurable": {"thread_id": "test-comparison"}}
        )

        # What gets generated
        answer_text = result.get('answer', '')
        citations_text = '\n'.join([
            f"{c.get('file_path', '')}:{c.get('start_line', '')}-{c.get('end_line', '')}"
            for c in result.get('citations', [])
        ])

        full_output = f"Answer:\n{answer_text}\n\nCitations:\n{citations_text}"
        tokens = count_tokens(full_output)

        return {
            'method': '2. RAG CLI Standalone',
            'description': 'RAG generates answer directly (no Claude)',
            'tokens': tokens,
            'answer_length': len(answer_text),
            'citations_count': len(result.get('citations', []))
        }
    except Exception as e:
        return {'error': str(e)}


# ============================================================
# Approach 3: Claude + RAG Direct (full chunks)
# ============================================================

def approach3_claude_plus_rag_direct(question: str, repo: str, top_k: int = 10):
    """
    Claude gets full code chunks from RAG.
    This is what would happen if Claude called hybrid_search directly.
    """
    try:
        from retrieval.hybrid_search import search_routed_multi

        results = search_routed_multi(question, repo_override=repo, final_k=top_k)

        # Build what gets sent to Claude
        context = "Retrieved code chunks:\n\n"
        for r in results:
            context += f"File: {r['file_path']}:{r['start_line']}-{r['end_line']}\n"
            context += f"Score: {r['rerank_score']:.3f}\n"
            context += f"Code:\n{r.get('code', '')}\n\n"

        tokens = count_tokens(context)

        return {
            'method': '3. Claude + RAG Direct',
            'description': 'Claude gets full code chunks from RAG',
            'chunks': len(results),
            'tokens': tokens,
            'files_touched': len(set(r['file_path'] for r in results))
        }
    except Exception as e:
        return {'error': str(e)}


# ============================================================
# Approach 4: Claude + RAG via MCP (metadata only)
# ============================================================

def approach4_claude_plus_rag_mcp(question: str, repo: str, top_k: int = 10):
    """
    Claude gets MCP tool response (metadata, no full code).
    This is what I (Claude Code) actually receive.

    IMPORTANT: MCP tool schemas are sent with EVERY request!
    """
    try:
        from server.mcp.server import MCPServer

        server = MCPServer()

        # Get tool schemas (sent with every request)
        tools_req = {'jsonrpc': '2.0', 'id': 1, 'method': 'tools/list', 'params': {}}
        tools_resp = server.handle_request(tools_req)
        tools_json = json.dumps(tools_resp['result']['tools'])
        schema_tokens = count_tokens(tools_json)

        # Get the actual search response
        search_req = {
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

        search_resp = server.handle_request(search_req)

        # The MCP response is what Claude receives
        mcp_response = search_resp['result']['content'][0]['text']
        response_tokens = count_tokens(mcp_response)

        # Total = schemas + response
        total_tokens = schema_tokens + response_tokens

        # Parse to get metadata
        result_data = json.loads(mcp_response)

        return {
            'method': '4. Claude + RAG via MCP',
            'description': 'Claude gets MCP metadata (paths + scores only) + tool schemas',
            'chunks': result_data.get('count', 0),
            'tokens': total_tokens,
            'schema_tokens': schema_tokens,
            'response_tokens': response_tokens,
            'breakdown': f'{schema_tokens} (schemas) + {response_tokens} (response)'
        }
    except Exception as e:
        return {'error': str(e)}


# ============================================================
# Run Comparison
# ============================================================

def run_comparison(question: str, repo: str):
    """Run all four approaches and compare"""
    print(f"\n{'='*75}")
    print(f"QUESTION: {question}")
    print(f"REPO: {repo}")
    print(f"{'='*75}\n")

    results = []

    # Run each approach
    approaches = [
        ("Claude Alone", approach1_claude_alone),
        ("RAG CLI Standalone", approach2_rag_standalone),
        ("Claude + RAG Direct", approach3_claude_plus_rag_direct),
        ("Claude + RAG via MCP", approach4_claude_plus_rag_mcp),
    ]

    for name, func in approaches:
        print(f"⏳ Testing: {name}...")
        result = func(question, repo)
        results.append(result)

    # Print results
    print(f"\n{'='*75}")
    print("RESULTS (tokens sent to LLM):")
    print(f"{'='*75}\n")

    for i, result in enumerate(results, 1):
        if 'error' in result:
            print(f"{i}. {result.get('method', 'Unknown')}: ERROR - {result['error']}")
            continue

        print(f"{i}. {result['method']}")
        print(f"   {result['description']}")
        print(f"   Tokens: {result['tokens']:,}")

        # Show method-specific details
        if 'files_read' in result:
            print(f"   Files read: {result['files_read']}")
            if result.get('sample_files'):
                print(f"   Sample: {', '.join(result['sample_files'])}")

        if 'chunks' in result:
            print(f"   Chunks: {result['chunks']}")

        if 'files_touched' in result:
            print(f"   Files: {result['files_touched']}")

        if 'citations_count' in result:
            print(f"   Citations: {result['citations_count']}")

        if 'breakdown' in result:
            print(f"   Breakdown: {result['breakdown']}")

        print()

    # Calculate savings
    valid_results = [r for r in results if 'error' not in r and 'tokens' in r]

    if len(valid_results) >= 2:
        baseline = valid_results[0]['tokens']  # Claude alone

        print(f"{'='*75}")
        print("💰 SAVINGS vs Claude Alone:")
        print(f"{'='*75}\n")

        for result in valid_results[1:]:
            tokens = result['tokens']
            saved = baseline - tokens
            pct = (saved / baseline * 100) if baseline > 0 else 0
            reduction = baseline / tokens if tokens > 0 else 0

            print(f"{result['method']}:")
            print(f"   Tokens saved: {saved:,}")
            print(f"   Percentage: {pct:.1f}%")
            print(f"   Reduction: {reduction:.1f}x")

            # Cost (gpt-4o: $2.50/1M input)
            cost_saved = saved * (2.50 / 1_000_000)
            print(f"   $ saved/query: ${cost_saved:.6f}")
            print(f"   $ saved/1000: ${cost_saved * 1000:.2f}\n")

    return results


# ============================================================
# Main
# ============================================================

if __name__ == '__main__':
    if not HAS_TIKTOKEN:
        print("Installing tiktoken for accurate counts...")
        os.system("pip install -q tiktoken")
        try:
            import tiktoken
            HAS_TIKTOKEN = True
            print("✓ tiktoken installed\n")
        except:
            print("⚠️  Using estimates (1 token ≈ 4 chars)\n")

    # Test cases
    tests = [
        ("Where is OAuth token validated", "project"),
        ("How are fax jobs created and dispatched", "project"),
    ]

    all_results = []

    for question, repo in tests:
        try:
            results = run_comparison(question, repo)
            all_results.append({
                'question': question,
                'repo': repo,
                'results': results
            })
        except Exception as e:
            print(f"\n❌ Error: {e}\n")

    # Overall summary
    if all_results:
        print(f"\n{'='*75}")
        print("📊 SUMMARY")
        print(f"{'='*75}\n")

        print(f"Total queries tested: {len(all_results)}\n")

        # Average by method
        methods = ['Claude Alone', 'RAG CLI Standalone', 'Claude + RAG Direct', 'Claude + RAG via MCP']

        for method in methods:
            tokens = []
            for test in all_results:
                for r in test['results']:
                    if r.get('method', '').startswith(method.split()[0]) and 'tokens' in r:
                        tokens.append(r['tokens'])

            if tokens:
                avg = sum(tokens) / len(tokens)
                print(f"{method}: {avg:,.0f} avg tokens")

        print(f"\n🎯 Recommendation:")
        print(f"   Use MCP tools for maximum token efficiency")
        print(f"   Use RAG CLI for standalone Q&A without Claude")
        print(f"   Use Direct calls for custom integrations")
