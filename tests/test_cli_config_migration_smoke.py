"""Smoke test to verify CLI config_registry migration works correctly."""
import os
import sys
from pathlib import Path

# Add project root to path
repo_root = Path(__file__).parent.parent
sys.path.insert(0, str(repo_root))


def test_cli_chat_cli_imports():
    """Test that cli/chat_cli.py imports without errors."""
    from cli.chat_cli import ChatCLI
    assert ChatCLI is not None


def test_cli_commands_chat_imports():
    """Test that cli/commands/chat.py imports without errors."""
    from cli.commands.chat import chat
    assert chat is not None


def test_cli_commands_config_imports():
    """Test that cli/commands/config.py imports without errors."""
    from cli.commands.config import wizard, show, set, profiles, apply_profile
    assert wizard is not None
    assert show is not None
    assert set is not None
    assert profiles is not None
    assert apply_profile is not None


def test_cli_commands_index_imports():
    """Test that cli/commands/index.py imports without errors."""
    from cli.commands.index import index, status
    assert index is not None
    assert status is not None


def test_cli_commands_reranker_imports():
    """Test that cli/commands/reranker.py imports without errors."""
    from cli.commands.reranker import train, mine, mine_golden, evaluate, status, costs
    assert train is not None
    assert mine is not None
    assert mine_golden is not None
    assert evaluate is not None
    assert status is not None
    assert costs is not None


def test_cli_commands_utils_imports():
    """Test that cli/commands/utils.py imports without errors."""
    from cli.commands.utils import get, post, print_help
    assert get is not None
    assert post is not None
    assert print_help is not None


def test_config_registry_singleton():
    """Test that config_registry is properly initialized."""
    from server.services.config_registry import get_config_registry

    registry = get_config_registry()
    assert registry is not None

    # Verify singleton behavior
    registry2 = get_config_registry()
    assert registry is registry2


def test_config_registry_get_methods():
    """Test that config_registry getter methods work correctly."""
    from server.services.config_registry import get_config_registry

    registry = get_config_registry()
    registry.load()

    # Test get_str
    repo = registry.get_str('REPO', 'agro')
    assert isinstance(repo, str)
    assert repo in ['agro', 'default']

    # Test get_int
    port = registry.get_int('PORT', 8012)
    assert isinstance(port, int)
    assert port > 0

    # Test get_bool
    reranker_enabled = registry.get_bool('AGRO_RERANKER_ENABLED', False)
    assert isinstance(reranker_enabled, bool)

    # Test get_float
    alpha = registry.get_float('AGRO_RERANKER_ALPHA', 0.7)
    assert isinstance(alpha, float)
    assert 0.0 <= alpha <= 1.0


def test_no_tunable_os_getenv_in_cli():
    """Verify that no tunable params remain as os.getenv() in CLI files."""
    cli_files = [
        repo_root / "cli" / "chat_cli.py",
        repo_root / "cli" / "commands" / "chat.py",
        repo_root / "cli" / "commands" / "config.py",
        repo_root / "cli" / "commands" / "index.py",
        repo_root / "cli" / "commands" / "reranker.py",
        repo_root / "cli" / "commands" / "utils.py",
    ]

    # List of tunable params that should NOT be in os.getenv()
    tunable_params = [
        'REPO', 'THREAD_ID', 'PORT',
        'GEN_MODEL', 'FINAL_K',
        'AGRO_RERANKER_ENABLED',
        'RERANKER_TRAIN_EPOCHS', 'RERANKER_TRAIN_BATCH',
        'AGRO_RERANKER_MAXLEN',
        'AGRO_TRIPLETS_PATH', 'AGRO_RERANKER_MODEL_PATH',
        'AGRO_LOG_PATH',
        'AGRO_RERANKER_MINE_MODE', 'AGRO_RERANKER_MINE_RESET'
    ]

    for cli_file in cli_files:
        if cli_file.exists():
            content = cli_file.read_text()
            for param in tunable_params:
                # Check that os.getenv(param) doesn't appear in the file
                assert f'os.getenv("{param}"' not in content, \
                    f"Found tunable param {param} using os.getenv() in {cli_file}"
                assert f"os.getenv('{param}'" not in content, \
                    f"Found tunable param {param} using os.getenv() in {cli_file}"


if __name__ == '__main__':
    print("Running CLI config migration smoke tests...")

    test_cli_chat_cli_imports()
    print("✓ cli/chat_cli.py imports OK")

    test_cli_commands_chat_imports()
    print("✓ cli/commands/chat.py imports OK")

    test_cli_commands_config_imports()
    print("✓ cli/commands/config.py imports OK")

    test_cli_commands_index_imports()
    print("✓ cli/commands/index.py imports OK")

    test_cli_commands_reranker_imports()
    print("✓ cli/commands/reranker.py imports OK")

    test_cli_commands_utils_imports()
    print("✓ cli/commands/utils.py imports OK")

    test_config_registry_singleton()
    print("✓ config_registry singleton works")

    test_config_registry_get_methods()
    print("✓ config_registry getter methods work")

    test_no_tunable_os_getenv_in_cli()
    print("✓ No tunable params remain as os.getenv()")

    print("\n✓ All CLI config migration smoke tests passed!")
