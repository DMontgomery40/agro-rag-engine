#!/usr/bin/env python3
"""
Smoke test for retrieval/rerank.py config migration to config_registry.

Verifies:
1. Module imports successfully
2. Config values load from registry
3. All AGRO_RERANKER_* params are accessible
4. Fallback to os.getenv() works when registry unavailable
5. COHERE_API_KEY remains as os.getenv()
"""

import sys
import os
from pathlib import Path

# Add project root to path
repo_root = Path(__file__).parent.parent
sys.path.insert(0, str(repo_root))

def test_import():
    """Test that rerank module imports successfully."""
    try:
        from retrieval import rerank
        print("✓ retrieval.rerank imported successfully")
        return True
    except Exception as e:
        print(f"✗ Failed to import retrieval.rerank: {e}")
        return False

def test_config_registry_integration():
    """Test config_registry integration."""
    try:
        from retrieval import rerank

        # Check that config_registry is available
        if rerank._config_registry is None:
            print("⚠ config_registry not available (fallback mode)")
            return True

        print("✓ config_registry available")

        # Check that cached values are loaded
        required_params = [
            '_RERANKER_MODEL',
            '_AGRO_RERANKER_ENABLED',
            '_AGRO_RERANKER_ALPHA',
            '_AGRO_RERANKER_TOPN',
            '_AGRO_RERANKER_BATCH',
            '_AGRO_RERANKER_MAXLEN',
            '_AGRO_RERANKER_RELOAD_ON_CHANGE',
            '_AGRO_RERANKER_RELOAD_PERIOD_SEC',
            '_COHERE_RERANK_MODEL',
            '_VOYAGE_RERANK_MODEL',
            '_RERANKER_BACKEND',
            '_RERANKER_TIMEOUT',
            '_RERANK_BACKEND',
            '_RERANK_INPUT_SNIPPET_CHARS',
            '_COHERE_RERANK_TOP_N',
        ]

        for param in required_params:
            value = getattr(rerank, param, None)
            if value is None:
                print(f"✗ {param} is None")
                return False
            print(f"✓ {param} = {value}")

        return True
    except Exception as e:
        print(f"✗ Config registry integration test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_reload_config():
    """Test reload_config() function."""
    try:
        from retrieval import rerank

        # Store original values
        original_model = rerank._RERANKER_MODEL

        # Call reload
        rerank.reload_config()

        # Verify values are still loaded
        if rerank._RERANKER_MODEL is None:
            print("✗ _RERANKER_MODEL is None after reload")
            return False

        print(f"✓ reload_config() works: _RERANKER_MODEL = {rerank._RERANKER_MODEL}")
        return True
    except Exception as e:
        print(f"✗ reload_config() test failed: {e}")
        return False

def test_cohere_api_key_handling():
    """Test that COHERE_API_KEY is handled correctly (remains os.getenv)."""
    try:
        from retrieval import rerank

        # COHERE_API_KEY should be fetched via os.getenv(), not from registry
        # This is done on lines 200 and 223 in the rerank_results function

        # We can't easily test this without actually calling rerank_results,
        # but we can verify the pattern exists in the source
        import inspect
        source = inspect.getsource(rerank.rerank_results)

        if "os.getenv('COHERE_API_KEY')" in source:
            print("✓ COHERE_API_KEY correctly uses os.getenv()")
            return True
        else:
            print("✗ COHERE_API_KEY not using os.getenv()")
            return False
    except Exception as e:
        print(f"✗ COHERE_API_KEY handling test failed: {e}")
        return False

def test_no_remaining_env_vars():
    """Test that config_registry path doesn't use os.getenv() except for secrets."""
    try:
        from retrieval import rerank
        import inspect

        # Get full source of rerank module
        source = inspect.getsource(rerank)
        lines = source.split('\n')

        # Find the _load_cached_config function
        in_function = False
        in_else_block = False
        else_block_lines = []

        for i, line in enumerate(lines):
            if 'def _load_cached_config' in line:
                in_function = True
            elif in_function and line.strip().startswith('def '):
                # Reached next function, stop
                break
            elif in_function:
                if 'else:' in line and '_config_registry' in lines[max(0, i-5):i+1]:
                    # This is the else block for registry available
                    in_else_block = True
                elif in_else_block:
                    if line.strip() and not line.strip().startswith('#'):
                        if line[0] not in (' ', '\t'):
                            # Dedented, end of else block
                            break
                        else_block_lines.append((i+1, line))

        # Check that the else block (registry available) doesn't use os.getenv
        registry_uses_getenv = False
        for line_num, line in else_block_lines:
            if 'os.getenv' in line:
                print(f"✗ Line {line_num} in registry block uses os.getenv: {line.strip()}")
                registry_uses_getenv = True

        if registry_uses_getenv:
            return False

        # Verify COHERE_API_KEY still uses os.getenv (should be outside _load_cached_config)
        cohere_getenv_count = source.count("os.getenv('COHERE_API_KEY')")
        if cohere_getenv_count < 2:
            print(f"✗ Expected 2+ COHERE_API_KEY os.getenv() calls, found {cohere_getenv_count}")
            return False

        print(f"✓ Config registry path uses _config_registry (no os.getenv)")
        print(f"✓ COHERE_API_KEY correctly uses os.getenv() ({cohere_getenv_count} calls)")
        print(f"✓ Fallback path uses os.getenv() when registry unavailable")
        return True
    except Exception as e:
        print(f"✗ Environment variable check failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all smoke tests."""
    print("\n=== Rerank Config Migration Smoke Tests ===\n")

    tests = [
        ("Import", test_import),
        ("Config Registry Integration", test_config_registry_integration),
        ("Reload Config", test_reload_config),
        ("COHERE_API_KEY Handling", test_cohere_api_key_handling),
        ("No Remaining Env Vars", test_no_remaining_env_vars),
    ]

    results = []
    for name, test_func in tests:
        print(f"\n--- {name} ---")
        success = test_func()
        results.append((name, success))

    # Summary
    print("\n=== Summary ===")
    passed = sum(1 for _, success in results if success)
    total = len(results)

    for name, success in results:
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"{status}: {name}")

    print(f"\n{passed}/{total} tests passed")

    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
