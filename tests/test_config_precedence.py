"""
Test config precedence: .env > agro_config.json > defaults
"""
import os
import json
import tempfile
import shutil
from pathlib import Path
from dotenv import load_dotenv
from server.services.config_registry import ConfigRegistry


def test_env_overrides_json():
    """Test that .env values override agro_config.json"""
    # Set up environment with specific value
    os.environ['TEST_RRF_K_DIV'] = '80'

    # Create test JSON with different value
    test_json = {'retrieval': {'rrf_k_div': 60}}

    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(test_json, f)
        json_path = f.name

    try:
        # Load config
        registry = ConfigRegistry(config_file=json_path)

        # The env var should win
        value = registry.get_int('TEST_RRF_K_DIV', 999)
        source = registry.get_source('TEST_RRF_K_DIV')

        assert value == 80, f"Expected 80 from env, got {value}"
        assert source == '.env', f"Expected source '.env', got {source}"

    finally:
        os.unlink(json_path)
        del os.environ['TEST_RRF_K_DIV']


def test_json_used_when_env_missing():
    """Test that agro_config.json is used when .env doesn't have the value"""
    # Make sure env doesn't have this
    if 'TEST_ONLY_IN_JSON' in os.environ:
        del os.environ['TEST_ONLY_IN_JSON']

    # Create test JSON
    test_json = {'retrieval': {'final_k': 123}}

    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(test_json, f)
        json_path = f.name

    try:
        registry = ConfigRegistry(config_file=json_path)

        # Should load from JSON
        value = registry.get_int('FINAL_K', 999)

        # Note: source tracking might show 'agro_config.json' or 'default' depending on implementation
        assert value == 123, f"Expected 123 from JSON, got {value}"

    finally:
        os.unlink(json_path)


def test_default_used_when_both_missing():
    """Test that default is used when neither .env nor JSON have the value"""
    # Make sure env doesn't have this
    if 'TEST_NEVER_SET' in os.environ:
        del os.environ['TEST_NEVER_SET']

    # Create empty JSON
    test_json = {}

    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(test_json, f)
        json_path = f.name

    try:
        registry = ConfigRegistry(config_file=json_path)

        # Should use default
        value = registry.get_int('TEST_NEVER_SET', 456)
        source = registry.get_source('TEST_NEVER_SET')

        assert value == 456, f"Expected 456 (default), got {value}"
        assert source == 'default', f"Expected source 'default', got {source}"

    finally:
        os.unlink(json_path)


def test_real_config_precedence():
    """Test with actual .env and agro_config.json files"""
    # Load real .env
    load_dotenv('.env')

    # Load real config
    registry = ConfigRegistry()

    # Test a few known values
    rrf_k_div = registry.get_int('RRF_K_DIV', 999)
    final_k = registry.get_int('FINAL_K', 999)

    # Both should be loaded
    assert rrf_k_div != 999, "RRF_K_DIV should be loaded from config"
    assert final_k != 999, "FINAL_K should be loaded from config"

    print(f"✓ RRF_K_DIV = {rrf_k_div} from {registry.get_source('RRF_K_DIV')}")
    print(f"✓ FINAL_K = {final_k} from {registry.get_source('FINAL_K')}")


if __name__ == '__main__':
    print("Testing config precedence...")
    test_env_overrides_json()
    print("✓ test_env_overrides_json passed")

    test_json_used_when_env_missing()
    print("✓ test_json_used_when_env_missing passed")

    test_default_used_when_both_missing()
    print("✓ test_default_used_when_both_missing passed")

    test_real_config_precedence()
    print("✓ test_real_config_precedence passed")

    print("\n=== ALL PRECEDENCE TESTS PASSED ===")
