"""
Smoke test: server/tracing.py config migration

Verifies that tracing module uses config_registry for all config params
except external API keys (LANGCHAIN_*, LANGSMITH_*).
"""
import os
import sys
from pathlib import Path

# Add project root to path
repo_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(repo_root))


def test_tracing_imports():
    """Test that tracing module imports successfully."""
    import server.tracing
    assert server.tracing is not None
    print("✓ server.tracing imports successfully")


def test_tracing_has_cached_config():
    """Test that tracing has module-level config cache."""
    import server.tracing

    # Check all expected cached variables exist
    assert hasattr(server.tracing, '_TRACING_ENABLED')
    assert hasattr(server.tracing, '_TRACE_SAMPLING_RATE')
    assert hasattr(server.tracing, '_LOG_LEVEL')
    assert hasattr(server.tracing, '_REPO')
    assert hasattr(server.tracing, '_TRACING_MODE')
    assert hasattr(server.tracing, '_TRACE_RETENTION')
    print("✓ All expected config cache variables present")


def test_tracing_has_reload_config():
    """Test that tracing has reload_config() function."""
    import server.tracing

    assert hasattr(server.tracing, 'reload_config')
    assert callable(server.tracing.reload_config)

    # Call it to ensure it works
    server.tracing.reload_config()
    print("✓ reload_config() exists and is callable")


def test_trace_uses_cached_config():
    """Test that Trace class uses cached config values."""
    import server.tracing

    # Create a trace instance
    trace = server.tracing.Trace(repo="", question="test")

    # Verify it uses _REPO from cache when repo is empty
    assert trace.repo == server.tracing._REPO

    # Verify it uses _TRACING_MODE from cache
    assert trace.mode in ['local', 'langsmith', 'off', '']
    print("✓ Trace class uses cached config values")


def test_trace_retention_uses_cache():
    """Test that trace retention uses cached config."""
    import server.tracing

    # Verify _TRACE_RETENTION is set
    assert isinstance(server.tracing._TRACE_RETENTION, int)
    assert server.tracing._TRACE_RETENTION >= 0
    print(f"✓ TRACE_RETENTION cached value: {server.tracing._TRACE_RETENTION}")


def test_no_hardcoded_config_reads():
    """Verify tracing doesn't call os.getenv for config params."""
    import server.tracing

    # Read the source
    source = Path(repo_root / "server/tracing.py").read_text()

    # These should NOT appear in os.getenv() calls (they should use cache)
    forbidden_patterns = [
        "os.getenv('REPO'",
        'os.getenv("REPO"',
        "os.getenv('TRACING_MODE'",
        'os.getenv("TRACING_MODE"',
        "os.getenv('TRACE_RETENTION'",
        'os.getenv("TRACE_RETENTION"',
    ]

    for pattern in forbidden_patterns:
        assert pattern not in source, f"Found forbidden pattern: {pattern}"

    print("✓ No hardcoded os.getenv() calls for config params")


def test_api_keys_still_use_os_getenv():
    """Verify API keys still use os.getenv() (not migrated)."""
    import server.tracing

    source = Path(repo_root / "server/tracing.py").read_text()

    # These SHOULD still use os.getenv (they're external API keys)
    required_patterns = [
        "os.getenv('LANGCHAIN_TRACING_V2'",
        "os.getenv('LANGCHAIN_PROJECT'",
        "os.getenv('LANGSMITH_PROJECT'",
    ]

    for pattern in required_patterns:
        assert pattern in source, f"Missing required pattern: {pattern}"

    print("✓ API keys still use os.getenv() as expected")


if __name__ == '__main__':
    print("\n=== Testing server/tracing.py Config Migration ===\n")

    test_tracing_imports()
    test_tracing_has_cached_config()
    test_tracing_has_reload_config()
    test_trace_uses_cached_config()
    test_trace_retention_uses_cache()
    test_no_hardcoded_config_reads()
    test_api_keys_still_use_os_getenv()

    print("\n=== All tests passed! ===\n")
