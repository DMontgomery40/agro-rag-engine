from __future__ import annotations

import os
from pathlib import Path


def _as_dir(p: str | Path | None) -> Path:
    if not p:
        return Path("")
    pp = Path(str(p)).expanduser()
    return pp if pp.is_absolute() else (Path(__file__).resolve().parents[1] / pp)


def repo_root() -> Path:
    env = os.getenv("REPO_ROOT")
    if env:
        candidate = _as_dir(env)
        # Only use REPO_ROOT if the path actually exists
        # (handles .env having Docker paths like /app when running locally)
        if candidate.exists():
            return candidate
    return Path(__file__).resolve().parents[1]


def files_root() -> Path:
    return _as_dir(os.getenv("FILES_ROOT")) or repo_root()


def gui_dir() -> Path:
    env = os.getenv("GUI_DIR")
    if env:
        candidate = _as_dir(env)
        if candidate.exists():
            return candidate
    # Default to the React web public assets (shared models/profiles)
    return repo_root() / "web" / "public"


def docs_dir() -> Path:
    env = os.getenv("DOCS_DIR")
    return _as_dir(env) if env else (repo_root() / "docs")


def data_dir() -> Path:
    env = os.getenv("DATA_DIR")
    return _as_dir(env) if env else (repo_root() / "data")
