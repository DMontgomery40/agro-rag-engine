"""Path configuration for AGRO RAG Engine."""
from pathlib import Path
import os


def repo_root() -> Path:
    """Return the root directory of the repository."""
    return Path(__file__).resolve().parent


def data_dir() -> Path:
    """Return the data directory for storing index artifacts."""
    root = repo_root()
    data = root / "data"
    data.mkdir(exist_ok=True)
    return data
