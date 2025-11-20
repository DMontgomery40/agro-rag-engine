import os
import tempfile
import json
from pathlib import Path
from typing import Any

def atomic_write_text(path: Path, content: str) -> None:
    """Write text to a file atomically to prevent corruption."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path_str = tempfile.mkstemp(dir=path.parent, prefix=path.name, suffix=".tmp")
    tmp_path = Path(tmp_path_str)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as fh:
            fh.write(content)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp_path, path)
    finally:
        if tmp_path.exists():
            try:
                tmp_path.unlink()
            except FileNotFoundError:
                pass

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
