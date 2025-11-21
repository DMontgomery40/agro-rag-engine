#!/usr/bin/env python3
"""Test that repo path resolution works correctly in both Docker and local environments."""

import os
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from common.config_loader import get_repo_paths, _expand_env_vars


def test_env_var_expansion():
    """Test environment variable expansion with various syntaxes."""

    # Test ${VAR:-default} syntax (bash-style default)
    os.environ['TEST_VAR'] = '/test/path'
    assert _expand_env_vars('${TEST_VAR:-/default}') == '/test/path'

    # Test default value when var not set
    if 'NONEXISTENT_VAR' in os.environ:
        del os.environ['NONEXISTENT_VAR']
    assert _expand_env_vars('${NONEXISTENT_VAR:-/default}') == '/default'

    # Test ${VAR} syntax
    assert _expand_env_vars('${TEST_VAR}') == '/test/path'

    # Test $VAR syntax
    assert _expand_env_vars('$TEST_VAR') == '/test/path'

    print("✓ Environment variable expansion tests passed")


def test_repo_path_resolution():
    """Test that repo path resolves correctly based on environment."""

    # Simulate Docker environment (REPO_ROOT not set, should use /app default)
    if 'REPO_ROOT' in os.environ:
        original_repo_root = os.environ['REPO_ROOT']
        del os.environ['REPO_ROOT']
    else:
        original_repo_root = None

    # Clear cache to force reload
    from common.config_loader import clear_cache
    clear_cache()

    paths = get_repo_paths('agro')
    print(f"Docker mode (REPO_ROOT unset): {paths[0]}")
    assert paths[0] == '/app', f"Expected /app in Docker mode, got {paths[0]}"

    # Simulate local environment (REPO_ROOT set)
    local_path = '/Users/davidmontgomery/agro-rag-engine'
    os.environ['REPO_ROOT'] = local_path
    clear_cache()

    paths = get_repo_paths('agro')
    print(f"Local mode (REPO_ROOT={local_path}): {paths[0]}")
    assert paths[0] == local_path, f"Expected {local_path} in local mode, got {paths[0]}"

    # Restore original state
    if original_repo_root:
        os.environ['REPO_ROOT'] = original_repo_root
    elif 'REPO_ROOT' in os.environ:
        del os.environ['REPO_ROOT']

    clear_cache()
    print("✓ Repo path resolution tests passed")


if __name__ == '__main__':
    test_env_var_expansion()
    test_repo_path_resolution()
    print("\n✅ All tests passed!")
