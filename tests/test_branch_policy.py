import subprocess
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


def run_command(command: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        command,
        shell=True,
        cwd=str(REPO_ROOT),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )


def test_current_branch_is_development():
    result = run_command("git rev-parse --abbrev-ref HEAD")
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "development"


def test_required_local_branches_exist():
    for branch_name in ("main", "development", "staging"):
        result = run_command(f"git show-ref --verify --quiet refs/heads/{branch_name}")
        assert result.returncode == 0, f"Missing local branch: {branch_name}"



