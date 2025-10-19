#!/usr/bin/env python3
"""Smoke test for RAG system - verifies all components before evaluation.

Per CLAUDE.md: Must verify server, docker, qdrant before RAG tests.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_docker_running():
    """Verify Docker is running."""
    import subprocess
    try:
        result = subprocess.run(['docker', 'ps'], capture_output=True, timeout=5)
        assert result.returncode == 0, "Docker not responding"
        print("✅ Docker is running")
        return True
    except Exception as e:
        print(f"❌ Docker check failed: {e}")
        return False

def _detect_expected_collection(collections: list[str]) -> str | None:
    """Pick the expected collection name based on env or available collections.

    Prefers env var COLLECTION_NAME, otherwise any collection that starts with
    'code_chunks_agro' (handles shared/gui/devclean profiles).
    """
    env_name = os.getenv('COLLECTION_NAME')
    if env_name and env_name in collections:
        return env_name
    # Fallback: find a matching prefix
    for name in collections:
        if name.startswith('code_chunks_agro'):
            return name
    return None


def test_qdrant_accessible():
    """Verify Qdrant is accessible and has the expected collection."""
    try:
        import requests
        r = requests.get('http://127.0.0.1:6333/collections', timeout=5)
        assert r.status_code == 200, f"Qdrant returned {r.status_code}"
        data = r.json()
        collections = [c['name'] for c in data.get('result', {}).get('collections', [])]
        chosen = _detect_expected_collection(collections)
        assert chosen is not None, f"No code_chunks_agro* collection found (have: {collections})"
        # Set env for downstream tests in this process
        os.environ['COLLECTION_NAME'] = chosen
        print(f"✅ Qdrant accessible with collection: {chosen}")
        return True
    except Exception as e:
        print(f"❌ Qdrant check failed: {e}")
        return False

def test_server_running():
    """Verify FastAPI server is running."""
    try:
        import requests
        r = requests.get('http://127.0.0.1:8012/health', timeout=5)
        assert r.status_code == 200, f"Server returned {r.status_code}"
        print("✅ Server is running")
        return True
    except Exception as e:
        print(f"❌ Server check failed: {e}")
        return False

def test_keywords_loaded():
    """Verify keywords are generated and accessible."""
    try:
        import requests
        r = requests.get('http://127.0.0.1:8012/api/keywords', timeout=5)
        data = r.json()
        total = len(data.get('keywords', []))
        discr = len(data.get('discriminative', []))
        sema = len(data.get('semantic', []))
        assert total > 0, "No keywords loaded"
        print(f"✅ Keywords loaded: {total} total ({discr} discriminative, {sema} semantic)")
        return True
    except Exception as e:
        print(f"❌ Keywords check failed: {e}")
        return False

def test_retrieval_works():
    """Verify basic retrieval returns results."""
    try:
        os.environ['RERANK_BACKEND'] = 'cohere'
        # Ensure COLLECTION_NAME aligns with available Qdrant collections
        import requests
        r = requests.get('http://127.0.0.1:6333/collections', timeout=5)
        names = [c['name'] for c in r.json().get('result', {}).get('collections', [])]
        chosen = _detect_expected_collection(names)
        if chosen:
            os.environ['COLLECTION_NAME'] = chosen
        from retrieval.hybrid_search import search_routed_multi
        results = search_routed_multi("test query", repo_override="agro", m=2, final_k=5)
        assert len(results) > 0, "No results returned"
        assert all('file_path' in r for r in results), "Results missing file_path"
        print(f"✅ Retrieval works: returned {len(results)} results")
        return True
    except Exception as e:
        print(f"❌ Retrieval check failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("\n" + "="*80)
    print("RAG SYSTEM SMOKE TEST")
    print("="*80 + "\n")
    
    tests = [
        ("Docker", test_docker_running),
        ("Qdrant", test_qdrant_accessible),
        ("Server", test_server_running),
        ("Keywords", test_keywords_loaded),
        ("Retrieval", test_retrieval_works),
    ]
    
    results = {}
    for name, test_func in tests:
        print(f"\nTesting {name}...")
        results[name] = test_func()
    
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for name, passed_test in results.items():
        status = "✅ PASS" if passed_test else "❌ FAIL"
        print(f"{status} {name}")
    
    print(f"\n{passed}/{total} checks passed")
    
    if passed == total:
        print("\n✅ ALL CHECKS PASSED - Safe to run evaluations")
        return 0
    else:
        print("\n❌ SOME CHECKS FAILED - Fix issues before running evaluations")
        return 1

if __name__ == "__main__":
    sys.exit(main())
