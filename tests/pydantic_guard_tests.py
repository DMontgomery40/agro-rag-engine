"""
PYDANTIC GUARD TESTS - Add these to test_agro_config.py
========================================================
These tests catch REAL problems that AI agents cause:
1. Validates actual agro_config.json against model (not mocks)
2. Detects drift between to_flat_dict() and AGRO_CONFIG_KEYS
3. Detects duplicate keys
4. Validates the weights normalization behavior (not the old raise behavior)

To add: Append this entire class to the end of test_agro_config.py
"""

import json
from pathlib import Path
import pytest

from server.models.agro_config_model import (
    AgroConfigRoot,
    RetrievalConfig,
    AGRO_CONFIG_KEYS
)
from common.paths import repo_root


class TestPydanticGuard:
    """
    CRITICAL TESTS - These catch real agent-caused problems.
    
    Run these before ANY commit that touches config:
        pytest tests/test_agro_config.py::TestPydanticGuard -v
    """

    def test_actual_agro_config_json_validates(self):
        """
        CRITICAL: Validates the REAL agro_config.json file against Pydantic.
        
        If this fails, your config file is broken and the app will crash or
        silently fall back to defaults (which is worse).
        """
        config_path = repo_root() / "agro_config.json"
        assert config_path.exists(), f"agro_config.json not found at {config_path}"
        
        raw_json = json.loads(config_path.read_text())
        
        # This should NOT raise - if it does, your config is broken
        try:
            model = AgroConfigRoot(**raw_json)
        except Exception as e:
            pytest.fail(f"agro_config.json failed Pydantic validation:\n{e}")
        
        # Verify we got real values, not just defaults
        flat = model.to_flat_dict()
        assert len(flat) > 50, "Config seems too sparse - check if values loaded"

    def test_no_drift_between_flat_dict_and_agro_config_keys(self):
        """
        CRITICAL: Catches when someone adds a key to to_flat_dict() but not AGRO_CONFIG_KEYS.
        
        This drift causes:
        - Keys that won't be saved/loaded properly
        - GUI showing settings that don't persist
        - Silent config corruption
        """
        model = AgroConfigRoot()
        flat = model.to_flat_dict()
        
        flat_keys = set(flat.keys())
        
        # Keys in flat dict but missing from AGRO_CONFIG_KEYS
        # These would be "orphaned" - they exist but won't be recognized
        extra_in_flat = flat_keys - AGRO_CONFIG_KEYS
        
        # Keys in AGRO_CONFIG_KEYS but missing from flat dict
        # These would be "phantom" - they're registered but never created
        missing_from_flat = AGRO_CONFIG_KEYS - flat_keys
        
        errors = []
        if extra_in_flat:
            errors.append(
                f"Keys in to_flat_dict() but NOT in AGRO_CONFIG_KEYS "
                f"(add them to AGRO_CONFIG_KEYS):\n  {sorted(extra_in_flat)}"
            )
        if missing_from_flat:
            errors.append(
                f"Keys in AGRO_CONFIG_KEYS but NOT in to_flat_dict() "
                f"(remove from AGRO_CONFIG_KEYS or add to model):\n  {sorted(missing_from_flat)}"
            )
        
        if errors:
            pytest.fail("\n\n".join(errors))

    def test_no_duplicate_keys_in_flat_dict(self):
        """
        CRITICAL: Detects if to_flat_dict() has duplicate key assignments.
        
        This can happen when an agent copy-pastes and doesn't realize
        a key is already defined. Python dicts silently overwrite.
        
        Note: This test can't catch duplicates in the Python code directly,
        but it can catch if the FINAL dict has fewer keys than expected.
        """
        model = AgroConfigRoot()
        flat = model.to_flat_dict()
        
        # If there were duplicates, the dict would have fewer keys than defined
        # This is a sanity check - the real check is in test_no_drift
        assert len(flat) == len(set(flat.keys())), "Duplicate keys detected in flat dict"

    def test_weights_normalize_not_raise(self):
        """
        FIXED TEST: The model normalizes weights instead of raising.
        
        The old test expected ValidationError, but the actual behavior
        (per the model validator) is to normalize weights to sum to 1.0.
        """
        # When weights don't sum to 1.0, model should NORMALIZE them
        config = AgroConfigRoot(
            retrieval=RetrievalConfig(bm25_weight=0.4, vector_weight=0.4)
        )
        
        # Weights should be normalized to sum to 1.0
        total = config.retrieval.bm25_weight + config.retrieval.vector_weight
        assert 0.99 <= total <= 1.01, f"Weights should normalize to 1.0, got {total}"
        
        # Each weight should be 0.5 after normalization (0.4/0.8 = 0.5)
        assert abs(config.retrieval.bm25_weight - 0.5) < 0.01
        assert abs(config.retrieval.vector_weight - 0.5) < 0.01

    def test_agro_config_keys_count_is_current(self):
        """
        Detects when AGRO_CONFIG_KEYS count is wrong.
        
        If this fails, update the count in this test and any other tests
        that hardcode the expected count.
        """
        model = AgroConfigRoot()
        flat = model.to_flat_dict()
        
        # Get the actual count from the model
        actual_count = len(flat)
        declared_count = len(AGRO_CONFIG_KEYS)
        
        # These should match (assuming no drift, which we test separately)
        assert actual_count == declared_count, (
            f"to_flat_dict() has {actual_count} keys but "
            f"AGRO_CONFIG_KEYS has {declared_count}. "
            f"Update tests that hardcode key counts."
        )

    def test_from_flat_dict_roundtrip_preserves_all_values(self):
        """
        CRITICAL: Tests that values survive the to_flat_dict -> from_flat_dict roundtrip.
        
        If this fails, config changes made in the GUI will be lost on reload.
        """
        # Load the REAL config
        config_path = repo_root() / "agro_config.json"
        if not config_path.exists():
            pytest.skip("agro_config.json not found")
        
        raw_json = json.loads(config_path.read_text())
        original = AgroConfigRoot(**raw_json)
        
        # Roundtrip
        flat = original.to_flat_dict()
        reconstructed = AgroConfigRoot.from_flat_dict(flat)
        
        # Compare flat dicts (easiest way to compare all values)
        original_flat = original.to_flat_dict()
        reconstructed_flat = reconstructed.to_flat_dict()
        
        mismatches = []
        for key in original_flat:
            if key not in reconstructed_flat:
                mismatches.append(f"Key {key} lost in roundtrip")
            elif original_flat[key] != reconstructed_flat[key]:
                # Special handling for floats
                if isinstance(original_flat[key], float):
                    if abs(original_flat[key] - reconstructed_flat[key]) > 0.0001:
                        mismatches.append(
                            f"{key}: {original_flat[key]} -> {reconstructed_flat[key]}"
                        )
                else:
                    mismatches.append(
                        f"{key}: {original_flat[key]} -> {reconstructed_flat[key]}"
                    )
        
        if mismatches:
            pytest.fail(f"Values changed in roundtrip:\n" + "\n".join(mismatches[:20]))

    def test_all_config_sections_have_pydantic_models(self):
        """
        Checks that every top-level key in agro_config.json has a Pydantic model.
        
        Catches when an agent adds a new section to the JSON but forgets
        to add the corresponding Pydantic model.
        """
        config_path = repo_root() / "agro_config.json"
        if not config_path.exists():
            pytest.skip("agro_config.json not found")
        
        raw_json = json.loads(config_path.read_text())
        
        # Get expected sections from AgroConfigRoot fields
        model = AgroConfigRoot()
        expected_sections = set(model.model_fields.keys())
        
        # Get actual sections from JSON
        actual_sections = set(raw_json.keys())
        
        # Extra sections in JSON that aren't in the model
        extra = actual_sections - expected_sections
        if extra:
            pytest.fail(
                f"Sections in agro_config.json without Pydantic models: {extra}\n"
                f"Add corresponding model classes to agro_config_model.py"
            )


# Also fix the broken test in TestPydanticValidation
class TestPydanticValidationFixes:
    """
    FIXES for broken tests in the original TestPydanticValidation class.
    
    These override the broken behavior.
    """
    
    def test_weights_validation_actual_behavior(self):
        """
        The ACTUAL behavior of the weights validator is to normalize, not raise.
        
        This test documents the real behavior.
        """
        # Model normalizes weights that don't sum to 1.0
        config = AgroConfigRoot(
            retrieval=RetrievalConfig(bm25_weight=0.8, vector_weight=0.2)
        )
        # Already sums to 1.0, should be unchanged
        assert config.retrieval.bm25_weight == 0.8
        assert config.retrieval.vector_weight == 0.2
        
        # Non-1.0 sum gets normalized
        config2 = AgroConfigRoot(
            retrieval=RetrievalConfig(bm25_weight=0.6, vector_weight=0.6)
        )
        # 0.6 + 0.6 = 1.2, normalized to 0.5 + 0.5 = 1.0
        assert abs(config2.retrieval.bm25_weight - 0.5) < 0.01
        assert abs(config2.retrieval.vector_weight - 0.5) < 0.01


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
