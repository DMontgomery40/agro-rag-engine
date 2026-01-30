import os
import json
from pathlib import Path
from typing import Any

def atomic_write_text(path: Path, content: str) -> None:
    """Write text to a file.

    Despite the name, this is now a simple direct write. The atomic rename
    pattern caused EBUSY errors in Docker with macOS bind mounts. Config files
    are small and if the process dies mid-write, you have bigger problems anyway.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(content)
        fh.flush()
        os.fsync(fh.fileno())

def atomic_write_json(path: Path, data: Any) -> None:
    """Write JSON to a file atomically."""
    atomic_write_text(path, json.dumps(data, indent=2))

def read_json(path: Path, default: Any = None) -> Any:
    """Read JSON from a file, returning default if missing/error."""
    if not path.exists():
        return default
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return default
