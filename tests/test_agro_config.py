"""Comprehensive tests for agro_config.json functionality.

This module tests:
1. Pydantic validation (type safety, ranges)
2. ConfigRegistry load/merge/precedence
3. File routing in set_config()
4. Module-level cache updates on reload
5. Backward compatibility (.env precedence)
"""

import json
import os
import tempfile
from pathlib import Path
import pytest
from pydantic import ValidationError

from server.models.agro_config_model import (
    AgroConfigRoot,
    RetrievalConfig,
    ScoringConfig,
    AGRO_CONFIG_KEYS
)
from server.services.config_registry import ConfigRegistry


class TestPydanticValidation:
    """Test Pydantic model validation."""

    def test_default_values(self):
        """Test that defaults match current hardcoded values."""
        config = AgroConfigRoot()
        assert config.retrieval.rrf_k_div == 60
        assert config.retrieval.langgraph_final_k == 20
        assert config.retrieval.max_query_rewrites == 2
        assert config.retrieval.fallback_confidence == 0.55
        assert config.scoring.card_bonus == 0.08
        assert config.scoring.filename_boost_exact == 1.5
        assert config.scoring.filename_boost_partial == 1.2

    def test_rrf_k_div_validation(self):
        """Test RRF k_div range validation."""
        # Valid values
        config = AgroConfigRoot(retrieval=RetrievalConfig(rrf_k_div=60))
        assert config.retrieval.rrf_k_div == 60

        # Out of range - too low
        with pytest.raises(ValidationError):
            AgroConfigRoot(retrieval=RetrievalConfig(rrf_k_div=0))

        # Out of range - too high
        with pytest.raises(ValidationError):
            AgroConfigRoot(retrieval=RetrievalConfig(rrf_k_div=300))

        # Minimum validator (should fail for values < 10)
        with pytest.raises(ValidationError) as exc_info:
            AgroConfigRoot(retrieval=RetrievalConfig(rrf_k_div=5))
        assert "rrf_k_div should be at least 10" in str(exc_info.value)

    def test_filename_boost_validation(self):
        """Test filename boost exact > partial validation."""
        # Valid: exact > partial
        config = AgroConfigRoot(
            scoring=ScoringConfig(
                filename_boost_exact=1.5,
                filename_boost_partial=1.2
            )
        )
        assert config.scoring.filename_boost_exact > config.scoring.filename_boost_partial

        # Invalid: exact <= partial
        with pytest.raises(ValidationError) as exc_info:
            AgroConfigRoot(
                scoring=ScoringConfig(
                    filename_boost_exact=1.2,
                    filename_boost_partial=1.5
                )
            )
        assert "filename_boost_exact should be greater than filename_boost_partial" in str(exc_info.value)

    def test_invalid_types(self):
        """Test type validation."""
        with pytest.raises(ValidationError):
            AgroConfigRoot(retrieval=RetrievalConfig(rrf_k_div="sixty"))  # String instead of int

        with pytest.raises(ValidationError):
            AgroConfigRoot(scoring=ScoringConfig(card_bonus="high"))  # String instead of float

    def test_to_flat_dict(self):
        """Test conversion to flat env-style dict."""
        config = AgroConfigRoot()
        flat = config.to_flat_dict()

        assert 'RRF_K_DIV' in flat
        assert 'CARD_BONUS' in flat
        assert 'FILENAME_BOOST_EXACT' in flat
        assert flat['RRF_K_DIV'] == 60
        assert flat['CARD_BONUS'] == 0.08

    def test_from_flat_dict(self):
        """Test creation from flat env-style dict."""
        flat = {
            'RRF_K_DIV': 80,
            'CARD_BONUS': 0.10,
            'LANGGRAPH_FINAL_K': 15
        }
        config = AgroConfigRoot.from_flat_dict(flat)

        assert config.retrieval.rrf_k_div == 80
        assert config.scoring.card_bonus == 0.10
        assert config.retrieval.langgraph_final_k == 15


class TestConfigRegistry:
    """Test ConfigRegistry functionality."""

    @pytest.fixture
    def temp_config_dir(self, tmp_path, monkeypatch):
        """Create temporary directory for config files."""
        # Mock repo_root to return temp directory
        import common.paths
        monkeypatch.setattr(common.paths, 'repo_root', lambda: tmp_path)
        # Also update server.services.config_registry since it imports repo_root
        import server.services.config_registry
        monkeypatch.setattr(server.services.config_registry, 'repo_root', lambda: tmp_path)
        return tmp_path

    def test_registry_load_defaults(self, temp_config_dir):
        """Test loading with no agro_config.json (uses defaults)."""
        registry = ConfigRegistry()
        registry.load()

        assert registry.get_int('RRF_K_DIV', 999) == 60  # Should use Pydantic default, not fallback
        assert registry.get_float('CARD_BONUS', 999.0) == 0.08

    def test_registry_load_from_file(self, temp_config_dir):
        """Test loading from agro_config.json."""
        config_file = temp_config_dir / "agro_config.json"
        config_file.write_text(json.dumps({
            "retrieval": {"rrf_k_div": 80, "langgraph_final_k": 25},
            "scoring": {"card_bonus": 0.10}
        }))

        registry = ConfigRegistry()
        registry.load()

        assert registry.get_int('RRF_K_DIV', 60) == 80
        assert registry.get_int('LANGGRAPH_FINAL_K', 20) == 25
        assert registry.get_float('CARD_BONUS', 0.08) == 0.10

    def test_env_precedence_over_file(self, temp_config_dir, monkeypatch):
        """Test that .env values take precedence over agro_config.json."""
        # Create agro_config.json
        config_file = temp_config_dir / "agro_config.json"
        config_file.write_text(json.dumps({
            "retrieval": {"rrf_k_div": 80}
        }))

        # Set env var (takes precedence)
        monkeypatch.setenv('RRF_K_DIV', '100')

        registry = ConfigRegistry()
        registry.load()

        # Should use env value, not file value
        assert registry.get_int('RRF_K_DIV', 60) == 100

        # Check source tracking
        assert registry.get_source('RRF_K_DIV') == '.env'

    def test_update_agro_config(self, temp_config_dir):
        """Test updating agro_config.json via registry."""
        registry = ConfigRegistry()
        registry.load()

        # Update values
        registry.update_agro_config({'RRF_K_DIV': 90, 'CARD_BONUS': 0.12})

        # Verify file was written
        config_file = temp_config_dir / "agro_config.json"
        assert config_file.exists()

        data = json.loads(config_file.read_text())
        assert data['retrieval']['rrf_k_div'] == 90
        assert data['scoring']['card_bonus'] == 0.12

        # Verify registry reloaded
        assert registry.get_int('RRF_K_DIV', 60) == 90

    def test_invalid_json_fallback_to_defaults(self, temp_config_dir):
        """Test graceful handling of invalid JSON."""
        config_file = temp_config_dir / "agro_config.json"
        config_file.write_text("{ invalid json }")

        registry = ConfigRegistry()
        registry.load()  # Should not raise, should use defaults

        assert registry.get_int('RRF_K_DIV', 999) == 60  # Uses Pydantic defaults

    def test_validation_error_fallback(self, temp_config_dir):
        """Test graceful handling of validation errors."""
        config_file = temp_config_dir / "agro_config.json"
        config_file.write_text(json.dumps({
            "retrieval": {"rrf_k_div": 500}  # Out of range
        }))

        registry = ConfigRegistry()
        registry.load()  # Should not raise, should use defaults

        # Should fall back to defaults on validation error
        assert registry.get_int('RRF_K_DIV', 999) == 60

    def test_typed_accessors(self, temp_config_dir):
        """Test typed accessor methods."""
        config_file = temp_config_dir / "agro_config.json"
        config_file.write_text(json.dumps({
            "retrieval": {"rrf_k_div": "80"}  # String value (from env)
        }))

        registry = ConfigRegistry()
        registry.load()

        # get_int should convert string to int
        assert registry.get_int('RRF_K_DIV', 60) == 80
        assert isinstance(registry.get_int('RRF_K_DIV', 60), int)

    def test_config_sources_tracking(self, temp_config_dir, monkeypatch):
        """Test that config sources are tracked correctly."""
        config_file = temp_config_dir / "agro_config.json"
        config_file.write_text(json.dumps({
            "retrieval": {"rrf_k_div": 80}
        }))

        monkeypatch.setenv('CARD_BONUS', '0.12')

        registry = ConfigRegistry()
        registry.load()

        # RRF_K_DIV from file
        assert registry.get_source('RRF_K_DIV') == 'agro_config.json'

        # CARD_BONUS from env (takes precedence)
        assert registry.get_source('CARD_BONUS') == '.env'


class TestAgroConfigKeys:
    """Test AGRO_CONFIG_KEYS set."""

    def test_keys_complete(self):
        """Ensure all expected keys are in AGRO_CONFIG_KEYS."""
        expected_keys = {
            'RRF_K_DIV',
            'LANGGRAPH_FINAL_K',
            'MAX_QUERY_REWRITES',
            'FALLBACK_CONFIDENCE',
            'CARD_BONUS',
            'FILENAME_BOOST_EXACT',
            'FILENAME_BOOST_PARTIAL',
        }
        assert AGRO_CONFIG_KEYS == expected_keys

    def test_no_secret_keys(self):
        """Ensure no secret/API keys in AGRO_CONFIG_KEYS."""
        secret_keywords = ['API_KEY', 'TOKEN', 'SECRET', 'PASSWORD']
        for key in AGRO_CONFIG_KEYS:
            for secret_kw in secret_keywords:
                assert secret_kw not in key, f"Secret keyword '{secret_kw}' found in AGRO_CONFIG_KEYS: {key}"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
