import logging
from typing import Any, Dict

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from server.services import config_store as cfg

logger = logging.getLogger("agro.api")

router = APIRouter()


@router.get("/api/repos")
def get_repos() -> Dict[str, Any]:
    return cfg.repos_all()


@router.get("/api/repos/{repo_name}")
def get_repo(repo_name: str):
    repo = cfg.repos_get(repo_name)
    if repo is None:
        return JSONResponse({"ok": False, "error": f"Repo '{repo_name}' not found"}, status_code=404)
    return {"ok": True, "repo": repo}


@router.patch("/api/repos/{repo_name}")
def patch_repo(repo_name: str, payload: Dict[str, Any]):
    ok = cfg.repos_patch(repo_name, payload)
    if not ok:
        return JSONResponse({"ok": False, "error": f"Repo '{repo_name}' not found"}, status_code=404)
    return {"ok": True, "message": f"Updated repo '{repo_name}'"}


@router.post("/api/repos/{repo_name}/validate-path")
def validate_repo_path(repo_name: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    path_str = str(payload.get("path", ""))
    return cfg.validate_repo_path(path_str)
