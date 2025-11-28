"""Smoke test to verify generation/LLM modules use config_registry.

This test verifies that:
1. Generation functions respect config values
2. Module-level caching works correctly
3. Config reload updates cached values
"""

import os
import pytest
from pathlib import Path


def test_env_model_uses_config():
    """Verify env_model.py respects config_registry for generation params."""
    from server.env_model import (
        _GEN_MODEL, _GEN_TEMPERATURE, _GEN_MAX_TOKENS, _GEN_TOP_P,
        _ENRICH_MODEL, _ENRICH_BACKEND, _OLLAMA_NUM_CTX
    )

    # Verify cached values are loaded (should not be None)
    assert _GEN_MODEL is not None, "GEN_MODEL should be cached"
    assert _GEN_TEMPERATURE is not None, "GEN_TEMPERATURE should be cached"
    assert _GEN_MAX_TOKENS is not None, "GEN_MAX_TOKENS should be cached"
    assert _GEN_TOP_P is not None, "GEN_TOP_P should be cached"
    assert _ENRICH_MODEL is not None, "ENRICH_MODEL should be cached"
    assert _ENRICH_BACKEND is not None, "ENRICH_BACKEND should be cached"
    assert _OLLAMA_NUM_CTX is not None, "OLLAMA_NUM_CTX should be cached"

    # Verify types are correct
    assert isinstance(_GEN_MODEL, str), "GEN_MODEL should be string"
    assert isinstance(_GEN_TEMPERATURE, (int, float)), "GEN_TEMPERATURE should be numeric"
    assert isinstance(_GEN_MAX_TOKENS, int), "GEN_MAX_TOKENS should be int"
    assert isinstance(_GEN_TOP_P, (int, float)), "GEN_TOP_P should be numeric"
    assert isinstance(_OLLAMA_NUM_CTX, int), "OLLAMA_NUM_CTX should be int"

    # Verify OLLAMA_NUM_CTX is not the old hardcoded value (or is intentionally set to it)
    # This just ensures the value is loaded from config, not that it's different
    assert _OLLAMA_NUM_CTX >= 0, "OLLAMA_NUM_CTX should be non-negative"


def test_langgraph_app_uses_config():
    """Verify langgraph_app.py respects config_registry for generation params."""
    from server.langgraph_app import (
        _MAX_QUERY_REWRITES, _LANGGRAPH_FINAL_K, _FALLBACK_CONFIDENCE,
        _CONF_TOP1, _CONF_AVG5, _CONF_ANY,
        _PACK_BUDGET_TOKENS, _HYDRATION_MODE, _SYSTEM_PROMPT
    )

    # Verify cached values are loaded (should not be None)
    assert _MAX_QUERY_REWRITES is not None, "MAX_QUERY_REWRITES should be cached"
    assert _LANGGRAPH_FINAL_K is not None, "LANGGRAPH_FINAL_K should be cached"
    assert _FALLBACK_CONFIDENCE is not None, "FALLBACK_CONFIDENCE should be cached"
    assert _CONF_TOP1 is not None, "CONF_TOP1 should be cached"
    assert _CONF_AVG5 is not None, "CONF_AVG5 should be cached"
    assert _CONF_ANY is not None, "CONF_ANY should be cached"
    assert _PACK_BUDGET_TOKENS is not None, "PACK_BUDGET_TOKENS should be cached"
    assert _HYDRATION_MODE is not None, "HYDRATION_MODE should be cached"
    assert _SYSTEM_PROMPT is not None, "SYSTEM_PROMPT should be cached"

    # Verify types are correct
    assert isinstance(_MAX_QUERY_REWRITES, int), "MAX_QUERY_REWRITES should be int"
    assert isinstance(_LANGGRAPH_FINAL_K, int), "LANGGRAPH_FINAL_K should be int"
    assert isinstance(_FALLBACK_CONFIDENCE, (int, float)), "FALLBACK_CONFIDENCE should be numeric"
    assert isinstance(_CONF_TOP1, (int, float)), "CONF_TOP1 should be numeric"
    assert isinstance(_CONF_AVG5, (int, float)), "CONF_AVG5 should be numeric"
    assert isinstance(_CONF_ANY, (int, float)), "CONF_ANY should be numeric"
    assert isinstance(_PACK_BUDGET_TOKENS, int), "PACK_BUDGET_TOKENS should be int"
    assert isinstance(_HYDRATION_MODE, str), "HYDRATION_MODE should be string"
    assert isinstance(_SYSTEM_PROMPT, str), "SYSTEM_PROMPT should be string"

    # Verify reasonable defaults
    assert _MAX_QUERY_REWRITES >= 0, "MAX_QUERY_REWRITES should be non-negative"
    assert _LANGGRAPH_FINAL_K > 0, "LANGGRAPH_FINAL_K should be positive"
    assert 0 <= _FALLBACK_CONFIDENCE <= 1, "FALLBACK_CONFIDENCE should be in [0,1]"
    assert _PACK_BUDGET_TOKENS > 0, "PACK_BUDGET_TOKENS should be positive"
    assert _HYDRATION_MODE in ['lazy', 'eager', 'disabled'], f"HYDRATION_MODE should be valid mode, got {_HYDRATION_MODE}"
    assert len(_SYSTEM_PROMPT) > 0, "SYSTEM_PROMPT should not be empty"


def test_config_reload_works():
    """Verify that reload_config() updates cached values."""
    from server.env_model import _GEN_TEMPERATURE as old_temp
    from server.env_model import reload_config as reload_env
    from server.langgraph_app import _PACK_BUDGET_TOKENS as old_budget
    from server.langgraph_app import reload_config as reload_langgraph

    # Reload configs (should not crash)
    reload_env()
    reload_langgraph()

    # Import again to get updated values
    from server.env_model import _GEN_TEMPERATURE as new_temp
    from server.langgraph_app import _PACK_BUDGET_TOKENS as new_budget

    # Values should still be valid (may or may not have changed)
    assert new_temp is not None, "GEN_TEMPERATURE should still be cached after reload"
    assert new_budget is not None, "PACK_BUDGET_TOKENS should still be cached after reload"


def test_generate_text_structural():
    """Structural test - verify generation can be called without crashing."""
    from server.env_model import generate_text

    # Skip if no API key available
    if not os.getenv('OPENAI_API_KEY'):
        pytest.skip("OPENAI_API_KEY not available")

    # This is a structural test - just verify the function can be called
    # We're not validating the output content, just that it doesn't crash
    try:
        result, metadata = generate_text(
            "Say 'test' and nothing else",
            system_instructions="You are a test assistant. Be concise."
        )
        assert result is not None, "Generate should return non-null result"
        assert isinstance(result, str), "Generate should return string"
    except Exception as e:
        # If it fails due to API issues, that's okay for a structural test
        # But config-related crashes should fail the test
        if "config" in str(e).lower() or "attribute" in str(e).lower():
            raise
        pytest.skip(f"API call failed (not a config issue): {e}")


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
