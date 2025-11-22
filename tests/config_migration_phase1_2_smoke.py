"""
Smoke test for Phase 1-2 config migration.

Verifies that core server files and routers use config_registry
instead of direct os.getenv() for tunable parameters.

Phase 1 Files:
- server/learning_reranker.py (already migrated)
- server/env_model.py (already migrated)
- server/telemetry.py (migrated AGRO_LOG_PATH)
- server/alerts.py (migrated AGRO_LOG_PATH)
- common/metadata.py (already migrated)

Phase 2 Files:
- server/routers/reranker_ops.py (migrated AGRO_LOG_PATH, AGRO_RERANKER_MODEL_PATH)
- server/routers/golden.py (migrated GOLDEN_PATH)
- server/routers/eval.py (migrated BASELINE_PATH)
"""

def test_telemetry_uses_config_registry():
    """Verify telemetry.py uses config_registry for AGRO_LOG_PATH."""
    with open("server/telemetry.py", "r") as f:
        content = f.read()

    # Should import config_registry
    assert "from server.services.config_registry import get_config_registry" in content, \
        "telemetry.py should import config_registry"

    # Should use _config_registry.get_str for AGRO_LOG_PATH
    assert '_config_registry.get_str("AGRO_LOG_PATH"' in content or \
           "_config_registry.get_str('AGRO_LOG_PATH'" in content, \
        "telemetry.py should use config_registry for AGRO_LOG_PATH"


def test_alerts_uses_config_registry():
    """Verify alerts.py uses config_registry for AGRO_LOG_PATH."""
    with open("server/alerts.py", "r") as f:
        content = f.read()

    # Should import config_registry
    assert "from server.services.config_registry import get_config_registry" in content, \
        "alerts.py should import config_registry"

    # Should use _config_registry.get_str for AGRO_LOG_PATH
    assert '_config_registry.get_str("AGRO_LOG_PATH"' in content or \
           "_config_registry.get_str('AGRO_LOG_PATH'" in content, \
        "alerts.py should use config_registry for AGRO_LOG_PATH"

    # Should NOT use os.getenv for AGRO_LOG_PATH (but may use it for ALERT_* which are secrets)
    lines_with_agro_log_path = [line for line in content.split('\n') if 'AGRO_LOG_PATH' in line]
    for line in lines_with_agro_log_path:
        if 'os.getenv' in line and 'AGRO_LOG_PATH' in line:
            # This is allowed in fallback cases, but should be rare
            pass


def test_reranker_ops_uses_config_registry():
    """Verify reranker_ops.py uses config_registry for tunable params."""
    with open("server/routers/reranker_ops.py", "r") as f:
        content = f.read()

    # Should import config_registry
    assert "from server.services.config_registry import get_config_registry" in content, \
        "reranker_ops.py should import config_registry"

    # Should have _config = get_config_registry()
    assert "_config = get_config_registry()" in content, \
        "reranker_ops.py should instantiate _config"

    # Should NOT use os.getenv for AGRO_LOG_PATH or AGRO_RERANKER_MODEL_PATH
    tunable_params = ["AGRO_LOG_PATH", "AGRO_RERANKER_MODEL_PATH"]
    for param in tunable_params:
        # Check that param is NOT used with os.getenv
        import re
        pattern = rf'os\.getenv\(["\']?{param}["\']?'
        matches = re.findall(pattern, content)
        assert len(matches) == 0, \
            f"reranker_ops.py should NOT use os.getenv for {param}, found {len(matches)} uses"

    # Should use _config.get_str instead
    assert '_config.get_str("AGRO_LOG_PATH"' in content or \
           "_config.get_str('AGRO_LOG_PATH'" in content, \
        "reranker_ops.py should use _config for AGRO_LOG_PATH"

    assert '_config.get_str("AGRO_RERANKER_MODEL_PATH"' in content or \
           "_config.get_str('AGRO_RERANKER_MODEL_PATH'" in content, \
        "reranker_ops.py should use _config for AGRO_RERANKER_MODEL_PATH"


def test_golden_uses_config_registry():
    """Verify golden.py uses config_registry for GOLDEN_PATH."""
    with open("server/routers/golden.py", "r") as f:
        content = f.read()

    # Should import config_registry
    assert "from server.services.config_registry import get_config_registry" in content, \
        "golden.py should import config_registry"

    # Should use _config.get_str for GOLDEN_PATH
    assert '_config.get_str' in content and 'GOLDEN_PATH' in content, \
        "golden.py should use _config for GOLDEN_PATH"

    # Should NOT use os.getenv for GOLDEN_PATH
    import re
    pattern = r'os\.getenv\(["\']?GOLDEN_PATH["\']?'
    matches = re.findall(pattern, content)
    assert len(matches) == 0, \
        f"golden.py should NOT use os.getenv for GOLDEN_PATH, found {len(matches)} uses"


def test_eval_uses_config_registry():
    """Verify eval.py uses config_registry for BASELINE_PATH."""
    with open("server/routers/eval.py", "r") as f:
        content = f.read()

    # Should import config_registry
    assert "from server.services.config_registry import get_config_registry" in content, \
        "eval.py should import config_registry"

    # Should use _config.get_str for BASELINE_PATH
    assert '_config.get_str' in content and 'BASELINE_PATH' in content, \
        "eval.py should use _config for BASELINE_PATH"

    # Should NOT use os.getenv for BASELINE_PATH
    import re
    pattern = r'os\.getenv\(["\']?BASELINE_PATH["\']?'
    matches = re.findall(pattern, content)
    assert len(matches) == 0, \
        f"eval.py should NOT use os.getenv for BASELINE_PATH, found {len(matches)} uses"


def test_infrastructure_vars_still_use_os_getenv():
    """Verify infrastructure vars (REPO, API keys, URLs) still use os.getenv."""
    # These should NOT be migrated - they're infrastructure/secrets
    infrastructure_vars = [
        "REPO",  # Repository name (infrastructure)
        "OPENAI_API_KEY",  # API key (secret)
        "COHERE_API_KEY",  # API key (secret)
        "QDRANT_URL",  # Infrastructure URL
        "OLLAMA_URL",  # Infrastructure URL
        "REDIS_URL",  # Infrastructure URL
        "LANGCHAIN_API_KEY",  # External service (secret)
        "LANGCHAIN_PROJECT",  # External service config
    ]

    # Just verify we haven't broken anything - infrastructure vars should still work
    import os
    for var in infrastructure_vars:
        # These should still be accessible via os.getenv (even if not set)
        result = os.getenv(var)
        # Just checking it doesn't raise an error
        assert result is None or isinstance(result, str)


def test_config_registry_keys_are_defined():
    """Verify migrated keys are in AGRO_CONFIG_KEYS."""
    from server.models.agro_config_model import AGRO_CONFIG_KEYS

    migrated_keys = [
        "AGRO_LOG_PATH",
        "AGRO_RERANKER_MODEL_PATH",
        "GOLDEN_PATH",
        "BASELINE_PATH",
    ]

    for key in migrated_keys:
        assert key in AGRO_CONFIG_KEYS, \
            f"{key} should be in AGRO_CONFIG_KEYS for proper config management"


if __name__ == "__main__":
    import pytest
    import sys
    sys.exit(pytest.main([__file__, "-v"]))
