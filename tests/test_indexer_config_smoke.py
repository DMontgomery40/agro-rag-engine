"""
Smoke test: Verify indexer/index_repo.py config loading works correctly.
Tests that tunable parameters load from config_registry while infrastructure uses os.getenv.
"""
import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

def test_indexer_config_import():
    """Verify indexer can import and initialize config registry."""
    try:
        # This should work without errors
        import indexer.index_repo as idx
        assert hasattr(idx, '_config'), "Config registry not initialized"
        print("✓ Config registry initialized successfully")
        return True
    except Exception as e:
        print(f"✗ Config registry initialization failed: {e}")
        return False

def test_infrastructure_env_vars():
    """Verify infrastructure env vars are accessible via os.getenv."""
    import indexer.index_repo as idx

    # These should be set from environment (with defaults)
    qdrant_url = idx.QDRANT_URL
    repo = idx.REPO
    collection = idx.COLLECTION

    assert qdrant_url is not None, "QDRANT_URL should have default"
    assert repo is not None, "REPO should have default"
    assert collection is not None, "COLLECTION should be set"

    print(f"✓ Infrastructure vars loaded: QDRANT_URL={qdrant_url}, REPO={repo}, COLLECTION={collection}")
    return True

def test_tunable_params_from_registry():
    """Verify tunable parameters load from config_registry."""
    import indexer.index_repo as idx

    # Test that config_registry methods are available
    embedding_type = idx._config.get_str('EMBEDDING_TYPE', 'openai')
    skip_dense = idx._config.get_bool('SKIP_DENSE', False)
    enrich = idx._config.get_bool('ENRICH_CODE_CHUNKS', False)

    assert isinstance(embedding_type, str), "EMBEDDING_TYPE should be string"
    assert isinstance(skip_dense, bool), "SKIP_DENSE should be bool"
    assert isinstance(enrich, bool), "ENRICH_CODE_CHUNKS should be bool"

    print(f"✓ Tunable params loaded: EMBEDDING_TYPE={embedding_type}, SKIP_DENSE={skip_dense}, ENRICH_CODE_CHUNKS={enrich}")
    return True

def test_config_registry_methods():
    """Verify config_registry has all required methods."""
    import indexer.index_repo as idx

    assert hasattr(idx._config, 'get_str'), "Config missing get_str method"
    assert hasattr(idx._config, 'get_bool'), "Config missing get_bool method"
    assert hasattr(idx._config, 'get_int'), "Config missing get_int method"

    # Test each method works
    str_val = idx._config.get_str('EMBEDDING_MODEL', 'text-embedding-3-large')
    bool_val = idx._config.get_bool('SKIP_DENSE', False)
    int_val = idx._config.get_int('EMBEDDING_DIM', 512)

    assert isinstance(str_val, str), "get_str should return string"
    assert isinstance(bool_val, bool), "get_bool should return bool"
    assert isinstance(int_val, int), "get_int should return int"

    print(f"✓ Config methods work: get_str={str_val}, get_bool={bool_val}, get_int={int_val}")
    return True

def main():
    """Run all smoke tests."""
    print("\n=== Indexer Config Migration Smoke Test ===\n")

    tests = [
        ("Config Import", test_indexer_config_import),
        ("Infrastructure Env Vars", test_infrastructure_env_vars),
        ("Tunable Params from Registry", test_tunable_params_from_registry),
        ("Config Registry Methods", test_config_registry_methods),
    ]

    results = []
    for name, test_fn in tests:
        print(f"\nTest: {name}")
        try:
            result = test_fn()
            results.append((name, result))
        except Exception as e:
            print(f"✗ {name} failed with exception: {e}")
            results.append((name, False))

    print("\n=== Results ===")
    passed = sum(1 for _, r in results if r)
    total = len(results)

    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {name}")

    print(f"\n{passed}/{total} tests passed")

    if passed == total:
        print("\n✅ All indexer config tests passed!")
        return 0
    else:
        print(f"\n❌ {total - passed} test(s) failed")
        return 1

if __name__ == '__main__':
    sys.exit(main())
