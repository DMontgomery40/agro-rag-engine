import os
import subprocess
import json
from pathlib import Path
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from common.paths import repo_root

router = APIRouter()

# ---------------- Git hooks helpers ----------------
def _git_hooks_dir() -> Path:
    root = repo_root()
    return root / ".git" / "hooks"

_HOOK_POST_CHECKOUT = """#!/usr/bin/env bash
# Auto-index on branch changes when AUTO_INDEX=1
[ "${AUTO_INDEX:-0}" != "1" ] && exit 0
repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root" || exit 0
if [ -d .venv ]; then . .venv/bin/activate; fi
export REPO=agro EMBEDDING_TYPE=local SKIP_DENSE=1
export OUT_DIR_BASE="./out.noindex-shared"
python index_repo.py >/dev/null 2>&1 || true
"""

_HOOK_POST_COMMIT = """#!/usr/bin/env bash
# Auto-index on commit when AUTO_INDEX=1
[ "${AUTO_INDEX:-0}" != "1" ] && exit 0
repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root" || exit 0
if [ -d .venv ]; then . .venv/bin/activate; fi
export REPO=agro EMBEDDING_TYPE=local SKIP_DENSE=1
export OUT_DIR_BASE="./out.noindex-shared"
python index_repo.py >/dev/null 2>&1 || true
"""

@router.get("/api/git/hooks/status")
def git_hooks_status() -> Dict[str, Any]:
    d = _git_hooks_dir()
    pc = d / "post-checkout"
    pm = d / "post-commit"
    return {
        "dir": str(d),
        "post_checkout": pc.exists(),
        "post_commit": pm.exists(),
        "enabled_hint": "export AUTO_INDEX=1"
    }

@router.post("/api/git/hooks/install")
def git_hooks_install() -> Dict[str, Any]:
    d = _git_hooks_dir()
    try:
        d.mkdir(parents=True, exist_ok=True)
        pc = d / "post-checkout"
        pm = d / "post-commit"
        pc.write_text(_HOOK_POST_CHECKOUT)
        pm.write_text(_HOOK_POST_COMMIT)
        os.chmod(pc, 0o755)
        os.chmod(pm, 0o755)
        return {"ok": True, "message": "Installed git hooks. Enable with: export AUTO_INDEX=1"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------- Git commit metadata ----------------
def _git_dir() -> Path:
    return repo_root() / ".git"

def _commit_meta_path() -> Path:
    return _git_dir() / "agent_commit_meta.json"

def _git_message_template_path() -> Path:
    return _git_dir() / ".gitmessage.agro"

def _prepare_commit_msg_hook_path() -> Path:
    return _git_dir() / "hooks" / "prepare-commit-msg"

def _read_json(p: Path, default: Any) -> Any:
    try:
        return json.loads(p.read_text())
    except Exception:
        return default

@router.get("/api/git/commit-meta")
def git_commit_meta_get() -> Dict[str, Any]:
    """Return current commit metadata settings and git user config."""
    meta = _read_json(_commit_meta_path(), {
        "agent_name": "",
        "agent_email": "",
        "chat_session_id": "",
        "trailer_key": "Chat-Session",
        "append_trailer": True,
        "set_git_user": False,
        "enable_template": False,
        "install_hook": True,
    })
    # Read current git config
    def _git_cfg(key: str) -> Optional[str]:
        try:
            out = subprocess.check_output(["git", "config", "--get", key], cwd=str(repo_root()))
            return out.decode().strip()
        except Exception:
            return None
    return {
        "meta": meta,
        "git_user": {
            "name": _git_cfg("user.name") or "",
            "email": _git_cfg("user.email") or "",
        },
        "template_path": str(_git_message_template_path()),
        "hook_path": str(_prepare_commit_msg_hook_path()),
    }

@router.post("/api/git/commit-meta")
def git_commit_meta_set(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Persist commit metadata settings and optionally configure git."""
    root = repo_root()
    gd = _git_dir()
    gd.mkdir(parents=True, exist_ok=True)
    meta = {
        "agent_name": str(payload.get("agent_name", "")),
        "agent_email": str(payload.get("agent_email", "")),
        "chat_session_id": str(payload.get("chat_session_id", "")),
        "trailer_key": str(payload.get("trailer_key", "Chat-Session")) or "Chat-Session",
        "append_trailer": bool(payload.get("append_trailer", True)),
        "set_git_user": bool(payload.get("set_git_user", False)),
        "enable_template": bool(payload.get("enable_template", False)),
        "install_hook": bool(payload.get("install_hook", True)),
    }
    try:
        _commit_meta_path().write_text(json.dumps(meta, indent=2))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write meta: {e}")

    # Optionally set git user.name/email
    if meta["set_git_user"]:
        try:
            if meta["agent_name"]:
                subprocess.check_call(["git", "config", "user.name", meta["agent_name"]], cwd=str(root))
            if meta["agent_email"]:
                subprocess.check_call(["git", "config", "user.email", meta["agent_email"]], cwd=str(root))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to set git user: {e}")
            
    return {"ok": True}

