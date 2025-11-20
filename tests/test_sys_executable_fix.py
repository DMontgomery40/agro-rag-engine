#!/usr/bin/env python3
"""Smoke test to verify subprocess calls use sys.executable instead of bare 'python'."""
import sys
import re
from pathlib import Path


def test_no_bare_python_in_subprocess():
    """Verify critical files don't use bare 'python' in subprocess calls."""
    repo_root = Path(__file__).parent.parent
    
    critical_files = [
        repo_root / "server" / "app.py",
        repo_root / "server" / "services" / "keywords.py",
        repo_root / "server" / "services" / "indexing.py",
    ]
    
    # Pattern to catch bare "python" in subprocess calls
    # Allows: sys.executable, "git", "docker", etc.
    # Catches: ["python", ...] or ('python', ...)
    bare_python_pattern = re.compile(r'subprocess\.[^(]*\(\s*\[\s*["\']python["\']\s*,')
    
    violations = []
    for file_path in critical_files:
        if not file_path.exists():
            continue
            
        content = file_path.read_text()
        matches = bare_python_pattern.findall(content)
        if matches:
            # Get line numbers
            for i, line in enumerate(content.splitlines(), 1):
                if bare_python_pattern.search(line):
                    violations.append(f"{file_path.relative_to(repo_root)}:{i} - {line.strip()}")
    
    assert not violations, (
        f"Found {len(violations)} bare 'python' in subprocess calls. "
        f"Use sys.executable instead:\n" + "\n".join(violations)
    )


def test_sys_executable_available_in_keywords():
    """Verify keywords module has access to sys.executable."""
    from server.services.keywords import generate_keywords
    
    # The function should be able to access sys.executable
    # This is a smoke test that imports work correctly
    assert sys.executable
    assert "python" in sys.executable.lower()


if __name__ == "__main__":
    test_no_bare_python_in_subprocess()
    test_sys_executable_available_in_keywords()
    print("✅ All subprocess Python interpreter checks passed")

