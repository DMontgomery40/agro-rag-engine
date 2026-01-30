#!/usr/bin/env python3
"""Smoke test for CLI functionality.

Verifies:
- CLI can be imported and run from any directory
- No duplicate commands in help output
- Subcommands are accessible
"""
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
CLI_PATH = PROJECT_ROOT / "cli" / "agro.py"


def test_cli_help_from_project_root():
    """Test CLI help works when run from project root."""
    result = subprocess.run(
        [sys.executable, str(CLI_PATH), "--help"],
        capture_output=True,
        text=True,
        cwd=str(PROJECT_ROOT),
    )
    assert result.returncode == 0, f"CLI failed: {result.stderr}"
    assert "AGRO RAG Engine CLI" in result.stdout
    assert "chat" in result.stdout
    assert "config" in result.stdout
    assert "eval" in result.stdout


def test_cli_help_from_cli_directory():
    """Test CLI help works when run from within cli/ directory."""
    result = subprocess.run(
        [sys.executable, "agro.py", "--help"],
        capture_output=True,
        text=True,
        cwd=str(PROJECT_ROOT / "cli"),
    )
    assert result.returncode == 0, f"CLI failed: {result.stderr}"
    assert "AGRO RAG Engine CLI" in result.stdout


def test_cli_has_all_commands_and_aliases():
    """Verify all commands and their aliases are present."""
    result = subprocess.run(
        [sys.executable, str(CLI_PATH), "--help"],
        capture_output=True,
        text=True,
        cwd=str(PROJECT_ROOT),
    )
    assert result.returncode == 0

    # Extract command lines (lines starting with two spaces followed by command name)
    lines = result.stdout.split("\n")
    command_lines = [line.strip().split()[0] for line in lines if line.startswith("  ") and line.strip()]

    # Verify short names are present
    assert "config" in command_lines, "'config' command missing"
    assert "eval" in command_lines, "'eval' command missing"
    assert "reranker" in command_lines, "'reranker' command missing"
    assert "ops" in command_lines, "'ops' command missing"
    assert "mcp" in command_lines, "'mcp' command missing"
    assert "golden" in command_lines, "'golden' command missing"

    # Verify long-name aliases are also present
    assert "configuration" in command_lines, "'configuration' alias missing"
    assert "evaluation" in command_lines, "'evaluation' alias missing"
    assert "reranking" in command_lines, "'reranking' alias missing"
    assert "operations" in command_lines, "'operations' alias missing"
    assert "model-context" in command_lines, "'model-context' alias missing"
    assert "gold" in command_lines, "'gold' alias missing"


def test_cli_no_spurious_output():
    """Verify no debug/warning messages leak to stdout."""
    result = subprocess.run(
        [sys.executable, str(CLI_PATH), "--help"],
        capture_output=True,
        text=True,
        cwd=str(PROJECT_ROOT),
    )
    assert result.returncode == 0
    assert "Config registry accessed before load" not in result.stdout
    assert "Config registry accessed before load" not in result.stderr


def test_cli_subcommand_config():
    """Test config subcommand help."""
    result = subprocess.run(
        [sys.executable, str(CLI_PATH), "config", "--help"],
        capture_output=True,
        text=True,
        cwd=str(PROJECT_ROOT),
    )
    assert result.returncode == 0, f"config subcommand failed: {result.stderr}"
    assert "Configuration management" in result.stdout
    assert "show" in result.stdout
    assert "set" in result.stdout


def test_cli_subcommand_eval():
    """Test eval subcommand help."""
    result = subprocess.run(
        [sys.executable, str(CLI_PATH), "eval", "--help"],
        capture_output=True,
        text=True,
        cwd=str(PROJECT_ROOT),
    )
    assert result.returncode == 0, f"eval subcommand failed: {result.stderr}"
    assert "Evaluation suite" in result.stdout
    assert "run" in result.stdout


def test_cli_subcommand_ops():
    """Test ops subcommand help."""
    result = subprocess.run(
        [sys.executable, str(CLI_PATH), "ops", "--help"],
        capture_output=True,
        text=True,
        cwd=str(PROJECT_ROOT),
    )
    assert result.returncode == 0, f"ops subcommand failed: {result.stderr}"
    assert "System operations" in result.stdout
    assert "status" in result.stdout


if __name__ == "__main__":
    # Run all tests
    test_cli_help_from_project_root()
    print("✓ test_cli_help_from_project_root")

    test_cli_help_from_cli_directory()
    print("✓ test_cli_help_from_cli_directory")

    test_cli_no_duplicate_commands()
    print("✓ test_cli_no_duplicate_commands")

    test_cli_no_spurious_output()
    print("✓ test_cli_no_spurious_output")

    test_cli_subcommand_config()
    print("✓ test_cli_subcommand_config")

    test_cli_subcommand_eval()
    print("✓ test_cli_subcommand_eval")

    test_cli_subcommand_ops()
    print("✓ test_cli_subcommand_ops")

    print("\n✅ All CLI smoke tests passed!")

