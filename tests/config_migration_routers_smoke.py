"""
Smoke test for router config migration to config_registry.

Verifies that routers correctly import and use config_registry
for tunable parameters instead of hardcoded os.getenv calls.
"""

import pytest
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))


def test_reranker_ops_imports_config():
    """Verify reranker_ops.py imports config_registry."""
    from server.routers import reranker_ops

    # Should have imported get_config_registry
    assert hasattr(reranker_ops, '_config'), "reranker_ops should have _config instance"

    # Should be a ConfigRegistry instance
    from server.services.config_registry import ConfigRegistry
    assert isinstance(reranker_ops._config, ConfigRegistry), "_config should be ConfigRegistry instance"


def test_golden_imports_config():
    """Verify golden.py imports config_registry."""
    from server.routers import golden

    # Should have imported get_config_registry
    assert hasattr(golden, '_config'), "golden should have _config instance"

    # Should be a ConfigRegistry instance
    from server.services.config_registry import ConfigRegistry
    assert isinstance(golden._config, ConfigRegistry), "_config should be ConfigRegistry instance"


def test_config_registry_has_required_keys():
    """Verify config_registry contains the keys used by routers."""
    from server.services.config_registry import get_config_registry
    from server.models.agro_config_model import AGRO_CONFIG_KEYS

    registry = get_config_registry()
    registry.load()  # Ensure loaded

    # Keys that routers now use from config
    required_keys = [
        'AGRO_RERANKER_ENABLED',
        'EVAL_FINAL_K',
        'EVAL_MULTI',
    ]

    for key in required_keys:
        assert key in AGRO_CONFIG_KEYS, f"{key} should be in AGRO_CONFIG_KEYS"


def test_reranker_ops_uses_config_for_enabled():
    """Verify reranker_ops uses config.get_bool for AGRO_RERANKER_ENABLED."""
    # Read the source file to verify it uses _config.get_bool
    reranker_ops_path = Path(__file__).parent.parent / "server" / "routers" / "reranker_ops.py"
    content = reranker_ops_path.read_text()

    # Should use _config.get_bool for AGRO_RERANKER_ENABLED
    assert '_config.get_bool("AGRO_RERANKER_ENABLED"' in content, \
        "reranker_ops should use _config.get_bool for AGRO_RERANKER_ENABLED"

    # Should NOT use os.getenv for AGRO_RERANKER_ENABLED in the smoketest function
    # (it's ok if it appears in comments or other contexts)
    lines = content.split('\n')
    in_smoketest = False
    for line in lines:
        if 'def reranker_smoketest' in line:
            in_smoketest = True
        elif in_smoketest and 'def ' in line and 'reranker_smoketest' not in line:
            in_smoketest = False

        if in_smoketest and 'os.getenv("AGRO_RERANKER_ENABLED"' in line:
            pytest.fail("reranker_ops should not use os.getenv for AGRO_RERANKER_ENABLED in smoketest")


def test_golden_uses_config_for_eval_params():
    """Verify golden.py uses config for EVAL_FINAL_K and EVAL_MULTI."""
    golden_path = Path(__file__).parent.parent / "server" / "routers" / "golden.py"
    content = golden_path.read_text()

    # Should use _config.get_int for EVAL_FINAL_K
    assert '_config.get_int("EVAL_FINAL_K"' in content, \
        "golden should use _config.get_int for EVAL_FINAL_K"

    # Should use _config.get_bool for EVAL_MULTI
    assert '_config.get_bool("EVAL_MULTI"' in content, \
        "golden should use _config.get_bool for EVAL_MULTI"

    # Should NOT use os.getenv for these in golden_test function
    lines = content.split('\n')
    in_test = False
    for line in lines:
        if 'def golden_test' in line:
            in_test = True
        elif in_test and 'def ' in line and 'golden_test' not in line:
            in_test = False

        if in_test:
            if 'os.getenv("EVAL_FINAL_K"' in line:
                pytest.fail("golden should not use os.getenv for EVAL_FINAL_K in golden_test")
            if 'os.getenv("EVAL_MULTI"' in line:
                pytest.fail("golden should not use os.getenv for EVAL_MULTI in golden_test")


def test_infrastructure_env_vars_still_use_getenv():
    """Verify infrastructure/secret env vars still use os.getenv (not migrated)."""
    # These should NOT be in config - they're infrastructure/secrets

    # Check that REPO, GOLDEN_PATH, etc. still use os.getenv
    golden_path = Path(__file__).parent.parent / "server" / "routers" / "golden.py"
    content = golden_path.read_text()

    # REPO should still use os.getenv (it's infrastructure)
    assert 'os.getenv("REPO"' in content or "os.getenv('REPO'" in content, \
        "REPO should still use os.getenv (infrastructure)"

    # GOLDEN_PATH has been migrated to config_registry - verify it's using config
    assert '_config.get_str(\'GOLDEN_PATH\'' in content or '_config.get_str("GOLDEN_PATH"' in content, \
        "GOLDEN_PATH should use config_registry (migrated from .env)"


def test_config_values_are_readable():
    """Verify that config values can be read at runtime."""
    from server.services.config_registry import get_config_registry

    registry = get_config_registry()
    registry.load()

    # Should be able to read values (will use defaults if not in agro_config.json)
    reranker_enabled = registry.get_bool('AGRO_RERANKER_ENABLED', False)
    eval_final_k = registry.get_int('EVAL_FINAL_K', 5)
    eval_multi = registry.get_bool('EVAL_MULTI', True)

    # Values should be valid types
    assert isinstance(reranker_enabled, bool), "AGRO_RERANKER_ENABLED should be bool"
    assert isinstance(eval_final_k, int), "EVAL_FINAL_K should be int"
    assert isinstance(eval_multi, bool), "EVAL_MULTI should be bool"

    # Values should be in reasonable ranges
    assert 1 <= eval_final_k <= 100, "EVAL_FINAL_K should be in range 1-100"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
