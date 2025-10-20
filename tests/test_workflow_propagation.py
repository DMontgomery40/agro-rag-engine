from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
WF = REPO_ROOT / ".github/workflows/propagate-global-files.yml"


def test_workflow_file_exists():
    assert WF.exists(), ".github/workflows/propagate-global-files.yml is missing"


def test_workflow_contains_required_paths():
    text = WF.read_text()
    assert "CLAUDE.md" in text
    assert "AGENTS.md" in text
    assert "README.md" in text
    assert "docs/**" in text
    assert "assets/**" in text


def test_workflow_has_recursion_guard():
    text = WF.read_text()
    assert "[auto-propagate]" in text, "Recursion guard tag missing"



