import json
import logging
import os
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

from common.config_loader import load_repos
from common.paths import repo_root, gui_dir
from server.services.config_registry import get_config_registry
from server.models.agro_config_model import AGRO_CONFIG_KEYS

logger = logging.getLogger("agro.api")


SECRET_FIELDS = {
    'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY',
    'COHERE_API_KEY', 'VOYAGE_API_KEY', 'LANGSMITH_API_KEY',
    'LANGCHAIN_API_KEY', 'LANGTRACE_API_KEY', 'NETLIFY_API_KEY',
    'OAUTH_TOKEN', 'GRAFANA_API_KEY', 'GRAFANA_AUTH_TOKEN'
}


def _atomic_write_text(path: Path, content: str) -> None:
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


def _write_json(path: Path, data: Any) -> None:
    _atomic_write_text(path, json.dumps(data, indent=2))


def env_reload() -> Dict[str, Any]:
    try:
        from dotenv import load_dotenv as _ld
        _ld(override=False)
        from common.config_loader import clear_cache
        clear_cache()
        # Also reload the config registry to pick up agro_config.json changes
        registry = get_config_registry()
        registry.reload()
    except Exception as e:
        logger.warning("env_reload error: %s", e)
    return {"ok": True}


def secrets_ingest(text: str, persist: bool) -> Dict[str, Any]:
    applied: Dict[str, str] = {}
    for line in text.splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        k, v = s.split("=", 1)
        k = k.strip()
        v = v.strip()
        if not k:
            continue
        os.environ[k] = v
        applied[k] = v

    saved = False
    if persist:
        env_path = repo_root() / ".env"
        existing: Dict[str, str] = {}
        if env_path.exists():
            for ln in env_path.read_text().splitlines():
                if not ln.strip() or ln.strip().startswith("#") or "=" not in ln:
                    continue
                kk, vv = ln.split("=", 1)
                existing[kk.strip()] = vv.strip()
        existing.update(applied)
        _atomic_write_text(env_path, "\n".join(f"{k}={existing[k]}" for k in sorted(existing.keys())) + "\n")
        saved = True

    return {"ok": True, "applied": sorted(applied.keys()), "persisted": saved}


def _effective_rerank_backend() -> Dict[str, Any]:
    try:
        from server.learning_reranker import get_reranker_info
    except Exception:
        def get_reranker_info():
            return {}
    import time
    registry = get_config_registry()
    backend_env = (registry.get_str("RERANK_BACKEND", "").strip().lower() or "")
    now = time.time()
    try:
        info = get_reranker_info()
    except Exception:
        info = {}
    explicit = backend_env in {"cohere", "local", "hf", "none"}
    mtime = float(info.get("model_dir_mtime") or 0.0)
    recent = (now - mtime) <= (7 * 24 * 3600) if mtime > 0 else False
    # COHERE_API_KEY is a secret, keep os.getenv
    cohere = bool((os.getenv("COHERE_API_KEY", "") or "").strip())
    path = info.get("resolved_path") or info.get("path") or registry.get_str("AGRO_RERANKER_MODEL_PATH", "models/cross-encoder-agro")
    local_present = bool(str(path)) and os.path.exists(str(path))
    if explicit:
        return {"backend": backend_env, "reason": "explicit_env"}
    if recent:
        return {"backend": "local", "reason": "recent_local_model"}
    if cohere:
        return {"backend": "cohere", "reason": "cohere_key_present"}
    if local_present:
        return {"backend": "local", "reason": "local_model_present"}
    return {"backend": "none", "reason": "no_reranker_available"}


def get_config(unmask: bool = False) -> Dict[str, Any]:
    """Return configuration snapshot safe for JSON serialization.

    Extra defensive guards ensure this never raises in constrained or unusual
    container environments. If any step fails, returns a minimal but valid
    payload so the API does not 500.
    """
    try:
        cfg = load_repos() or {}
    except Exception:
        cfg = {"default_repo": None, "repos": []}

    env: Dict[str, Any] = {}
    try:
        for k, v in os.environ.items():
            try:
                vv = str(v) if v is not None else ""
            except Exception:
                vv = ""
            if (not unmask) and (k in SECRET_FIELDS) and vv:
                env[k] = '••••••••••••••••'
            else:
                env[k] = vv
    except Exception:
        # Fallback if os.environ iteration fails (should not happen)
        env = {}

    # Merge in agro_config.json values from registry
    # Only if not already in env (env takes precedence)
    try:
        registry = get_config_registry()
        config_with_sources = registry.get_all_with_sources()
        for key in AGRO_CONFIG_KEYS:
            if key not in env and key in config_with_sources:
                config_entry = config_with_sources[key]
                value = config_entry['value']
                # Don't mask AGRO config values (they're not secrets)
                env[key] = value
    except Exception as e:
        logger.warning(f"Failed to merge agro_config.json: {e}")

    hints: Dict[str, Any] = {}
    try:
        hints["rerank_backend"] = _effective_rerank_backend()
    except Exception:
        hints["rerank_backend"] = {"backend": "none", "reason": "probe_failed"}

    # Add config source metadata for debugging/UI
    try:
        registry = get_config_registry()
        sources = {}
        for key in AGRO_CONFIG_KEYS:
            source = registry.get_source(key)
            if source:
                sources[key] = source
        hints["config_sources"] = sources
    except Exception as e:
        logger.warning(f"Failed to get config sources: {e}")

    try:
        return {
            "env": env,
            "default_repo": cfg.get("default_repo"),
            "repos": cfg.get("repos", []),
            "hints": hints,
        }
    except Exception:
        # Absolute last-resort fallback (never raise)
        return {"env": {}, "default_repo": None, "repos": [], "hints": hints}


def set_config(payload: Dict[str, Any]) -> Dict[str, Any]:
    root = repo_root()
    env_updates: Dict[str, Any] = dict(payload.get("env") or {})
    repos_updates: List[Dict[str, Any]] = list(payload.get("repos") or [])

    # Split env_updates into agro_config and .env based on AGRO_CONFIG_KEYS
    agro_config_updates = {k: v for k, v in env_updates.items() if k in AGRO_CONFIG_KEYS}
    env_file_updates = {k: v for k, v in env_updates.items() if k not in AGRO_CONFIG_KEYS}

    # Update agro_config.json if there are relevant updates
    if agro_config_updates:
        try:
            registry = get_config_registry()
            registry.update_agro_config(agro_config_updates)
            logger.info(f"Updated agro_config.json with keys: {sorted(agro_config_updates.keys())}")
        except Exception as e:
            logger.error(f"Failed to update agro_config.json: {e}")
            # Don't fail the whole operation, continue with .env updates

    # Backup .env
    env_path = root / ".env"
    if env_path.exists() and env_file_updates:
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup_path = root / f".env.backup-{timestamp}"
        try:
            import shutil
            shutil.copy2(env_path, backup_path)
        except Exception as e:
            logger.warning(".env backup failed: %s", e)

    # Upsert .env in memory copy (only for non-AGRO keys)
    existing: Dict[str, str] = {}
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if not line.strip() or line.strip().startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            existing[k.strip()] = v.strip()
    for k, v in env_file_updates.items():
        if v is None:
            existing.pop(k, None)
        else:
            existing[k] = str(v)
        # also apply to process env
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = str(v)

    # Write .env if there were updates
    if env_file_updates:
        _atomic_write_text(env_path, "\n".join(f"{k}={existing[k]}" for k in sorted(existing.keys())) + "\n")

    # Upsert repos.json
    repos_path = root / "repos.json"
    cfg = _read_json(repos_path, {"default_repo": None, "repos": []})
    default_repo = env_file_updates.get("REPO") or cfg.get("default_repo")
    by_name: Dict[str, Dict[str, Any]] = {str(r.get("name")): r for r in cfg.get("repos", []) if r.get("name")}
    for r in repos_updates:
        name = str(r.get("name") or "").strip()
        if not name:
            continue
        cur = by_name.get(name, {"name": name})
        if "path" in r:
            cur["path"] = r["path"]
        if "keywords" in r and isinstance(r["keywords"], list):
            cur["keywords"] = [str(x) for x in r["keywords"]]
        if "path_boosts" in r and isinstance(r["path_boosts"], list):
            cur["path_boosts"] = [str(x) for x in r["path_boosts"]]
        if "layer_bonuses" in r and isinstance(r["layer_bonuses"], dict):
            cur["layer_bonuses"] = r["layer_bonuses"]
        if "exclude_paths" in r and isinstance(r["exclude_paths"] , list):
            cur["exclude_paths"] = [str(x) for x in r["exclude_paths"]]
        by_name[name] = cur
    new_cfg = {
        "default_repo": default_repo,
        "repos": sorted(by_name.values(), key=lambda x: str(x.get("name")))
    }
    _write_json(repos_path, new_cfg)

    return {
        "status": "success",
        "applied_env_keys": sorted(existing.keys()),
        "applied_agro_config_keys": sorted(agro_config_updates.keys()),
        "repos_count": len(new_cfg.get("repos", []))
    }


def repos_all() -> Dict[str, Any]:
    try:
        cfg = load_repos()
        return {"default_repo": cfg.get("default_repo"), "repos": cfg.get("repos", [])}
    except Exception:
        return {"default_repo": None, "repos": []}


def repos_get(repo_name: str) -> Optional[Dict[str, Any]]:
    cfg = load_repos()
    for repo in cfg.get("repos", []):
        if str(repo.get("name", "")).lower() == repo_name.lower():
            return repo
    return None


def repos_patch(repo_name: str, payload: Dict[str, Any]) -> bool:
    """Update repository configuration in repos.json (not Pydantic - repos.json is separate from agro_config.json)."""
    repos_path = repo_root() / "repos.json"
    cfg = _read_json(repos_path, {"default_repo": None, "repos": []})
    for repo in cfg.get("repos", []):
        if str(repo.get("name", "")).lower() == repo_name.lower():
            if "path" in payload:
                repo["path"] = str(payload["path"])
            if "keywords" in payload and isinstance(payload["keywords"], list):
                repo["keywords"] = [str(x) for x in payload["keywords"]]
            if "path_boosts" in payload and isinstance(payload["path_boosts"], list):
                repo["path_boosts"] = [str(x) for x in payload["path_boosts"]]
            if "layer_bonuses" in payload and isinstance(payload["layer_bonuses"], dict):
                repo["layer_bonuses"] = payload["layer_bonuses"]
            if "exclude_paths" in payload and isinstance(payload["exclude_paths"], list):
                repo["exclude_paths"] = [str(x) for x in payload["exclude_paths"]]
            _write_json(repos_path, cfg)
            return True
    return False


def validate_repo_path(path_str: str) -> Dict[str, Any]:
    from common.config_loader import _expand_env_vars
    if not path_str:
        return {"ok": False, "error": "No path provided", "valid": False}
    try:
        expanded = _expand_env_vars(path_str)
        resolved = Path(expanded).expanduser().resolve()
        if not resolved.exists():
            return {"ok": True, "valid": False, "error": "Path does not exist", "raw": path_str, "resolved": str(resolved)}
        if not os.access(resolved, os.R_OK):
            return {"ok": True, "valid": False, "error": "Path exists but is not readable", "raw": path_str, "resolved": str(resolved)}
        return {"ok": True, "valid": True, "raw": path_str, "resolved": str(resolved), "exists": True, "readable": True}
    except Exception as e:
        return {"ok": True, "valid": False, "error": str(e), "raw": path_str}


def _read_json(path: Path, default: Any) -> Any:
    if path.exists():
        try:
            return json.loads(path.read_text())
        except Exception as exc:
            logger.warning("Failed to parse JSON from %s: %s", path, exc)
            return default
    return default


def _classify_components(m: Dict[str, Any]) -> list[str]:
    comps: list[str] = []
    name = (str(m.get("family") or "") + " " + str(m.get("model") or "")).lower()
    unit = str(m.get("unit") or "").lower()

    # Rerank if explicit field present or name hints contain rerank
    if ("rerank_per_1k" in m) or ("rerank" in name):
        comps.append("RERANK")

    # Embedding if explicit field or dimensions present and no token pricing
    has_embed_cost = ("embed_per_1k" in m) or ("dimensions" in m)
    has_gen_pricing = ("input_per_1k" in m) or ("output_per_1k" in m) or (unit in {"1k_tokens", "request"}) or ("per_request" in m)
    if has_embed_cost and ("rerank_per_1k" not in m):
        comps.append("EMB")

    # Generative if token pricing present or marked as request based, and not a pure embed-only entry
    if has_gen_pricing and not ("embed_per_1k" in m and "input_per_1k" not in m and "output_per_1k" not in m):
        comps.append("GEN")

    if not comps:
        comps = ["GEN"]
    return sorted(list(set(comps)))


def _normalize_prices(data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        models = list(data.get("models", [])) if isinstance(data, dict) else []
        out: list[Dict[str, Any]] = []
        for m in models:
            if not isinstance(m, dict):
                continue
            mm = dict(m)
            if "provider" in mm and isinstance(mm["provider"], str):
                mm["provider"] = mm["provider"].strip().lower()
            if "model" in mm and isinstance(mm["model"], str):
                mm["model"] = mm["model"].strip()
            if not isinstance(mm.get("components"), list) or not mm.get("components"):
                mm["components"] = _classify_components(mm)
            out.append(mm)
        new = dict(data)
        new["models"] = out
        return new
    except Exception:
        return _default_prices()


def prices_get() -> Dict[str, Any]:
    raw = _read_json(gui_dir() / "prices.json", {"models": []})
    data = raw if (raw and isinstance(raw, dict) and raw.get("models")) else _default_prices()
    return _normalize_prices(data)


def prices_upsert(item: Dict[str, Any]) -> Dict[str, Any]:
    prices_path = gui_dir() / "prices.json"
    data = _read_json(prices_path, {"models": []})
    models: List[Dict[str, Any]] = list(data.get("models", []))
    key = (str(item.get("provider")), str(item.get("model")))
    idx = next((i for i, m in enumerate(models) if (str(m.get("provider")), str(m.get("model"))) == key), None)
    if idx is None:
        models.append(item)
    else:
        models[idx].update(item)
    # Normalize components on write so subsequent reads are fast
    for i in range(len(models)):
        if not isinstance(models[i].get("components"), list):
            models[i]["components"] = _classify_components(models[i])
    data["models"] = models
    data["last_updated"] = __import__('datetime').datetime.now().strftime('%Y-%m-%d')
    _write_json(prices_path, data)
    return {"ok": True, "count": len(models)}


def _default_prices() -> Dict[str, Any]:
    return {
        "last_updated": "2025-10-10",
        "currency": "USD",
        "models": [
            {"provider": "openai", "family": "gpt-4o-mini", "model": "gpt-4o-mini",
             "unit": "1k_tokens", "input_per_1k": 0.005, "output_per_1k": 0.015,
             "embed_per_1k": 0.0001, "rerank_per_1k": 0.0, "notes": "EXAMPLE"},
            {"provider": "cohere", "family": "rerank-english-v3.0", "model": "rerank-english-v3.0",
             "unit": "1k_tokens", "input_per_1k": 0.0, "output_per_1k": 0.0,
             "embed_per_1k": 0.0, "rerank_per_1k": 0.30, "notes": "EXAMPLE"},
            {"provider": "voyage", "family": "voyage-3-large", "model": "voyage-3-large",
             "unit": "1k_tokens", "input_per_1k": 0.0, "output_per_1k": 0.0,
             "embed_per_1k": 0.12, "rerank_per_1k": 0.0, "notes": "EXAMPLE"},
            {"provider": "local", "family": "qwen3-coder", "model": "qwen3-coder:14b",
             "unit": "request", "per_request": 0.0, "notes": "Local inference assumed $0; electricity optional"}
        ]
    }


def config_schema() -> Dict[str, Any]:
    import os
    from pathlib import Path

    def _read_editor_settings() -> Dict[str, Any]:
        """Prefer registry-backed editor settings, with legacy file fallback for host."""
        reg = get_config_registry()
        data = {
            "port": reg.get_int("EDITOR_PORT", 4440),
            "enabled": reg.get_bool("EDITOR_ENABLED", True),
            "embed_enabled": reg.get_bool("EDITOR_EMBED_ENABLED", True),
            "bind": reg.get_str("EDITOR_BIND", "local"),
            "image": reg.get_str("EDITOR_IMAGE", "agro-vscode:latest"),
            "host": "127.0.0.1",
        }
        try:
            p = Path(__file__).parent.parent / "out" / "editor" / "settings.json"
            if p.exists():
                file_data = json.loads(p.read_text())
                if isinstance(file_data, dict):
                    data.update({k: v for k, v in file_data.items() if v is not None})
        except Exception:
            pass
        return data

    repos_cfg = load_repos()
    default_repo = repos_cfg.get("default_repo")

    schema: Dict[str, Any] = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "AGRO Settings",
        "type": "object",
        "properties": {
            "generation": {
                "type": "object",
                "properties": {
                    "GEN_MODEL": {"type": "string", "title": "Generative Model"},
                    "GEN_TEMPERATURE": {"type": "number", "title": "Temperature", "minimum": 0, "maximum": 2},
                    "GEN_MAX_TOKENS": {"type": "integer", "title": "Max Tokens", "minimum": 1},
                    "GEN_TIMEOUT": {"type": "integer", "title": "Generation Timeout (s)", "minimum": 10},
                    "GEN_RETRY_MAX": {"type": "integer", "title": "Generation Retries", "minimum": 0, "maximum": 10},
                    "OLLAMA_REQUEST_TIMEOUT": {"type": "integer", "title": "Local Request Timeout (s)", "minimum": 30},
                    "OLLAMA_STREAM_IDLE_TIMEOUT": {"type": "integer", "title": "Local Stream Idle Timeout (s)", "minimum": 5},
                },
            },
            "retrieval": {
                "type": "object",
                "properties": {
                    "FINAL_K": {"type": "integer", "title": "Top-K", "minimum": 1},
                    "LANGGRAPH_FINAL_K": {"type": "integer", "title": "LangGraph Top-K", "minimum": 1},
                    "MQ_REWRITES": {"type": "integer", "title": "Multi-Query Rewrites", "minimum": 1, "maximum": 10},
                    "SKIP_DENSE": {"type": "boolean", "title": "Skip Dense Embeddings"},
                },
            },
            "reranker": {
                "type": "object",
                "properties": {
                    "AGRO_RERANKER_ENABLED": {"type": "boolean", "title": "Enable Reranker"},
                    "RERANK_BACKEND": {"type": "string", "enum": ["", "cloud", "hf", "local", "learning"], "title": "Backend"},
                    "RERANK_MODEL": {"type": "string", "title": "Local HF Model (when hf/local)"},
                    "COHERE_RERANK_MODEL": {"type": "string", "title": "Cohere Model (when cloud)"},
                    "VOYAGE_RERANK_MODEL": {"type": "string", "title": "Voyage Model (when cloud)"},
                    "RERANK_TOP_K": {"type": "integer", "title": "Rerank Top-K", "minimum": 1},
                },
            },
            "enrichment": {
                "type": "object",
                "properties": {
                    "ENRICH_CODE_CHUNKS": {"type": "boolean", "title": "Enable Enrichment"},
                    "ENRICH_BACKEND": {"type": "string", "enum": ["", "mlx", "ollama", "openai"], "title": "Backend"},
                    "ENRICH_MODEL": {"type": "string", "title": "Model (cloud)"},
                    "ENRICH_MODEL_OLLAMA": {"type": "string", "title": "Model (local)"},
                },
            },
            "vscode": {
                "type": "object",
                "properties": {
                    "ENABLED": {"type": "boolean", "title": "Enable Inline VSCode"},
                    "EDITOR_EMBED_ENABLED": {"type": "boolean", "title": "Show VSCode iframe"},
                    "HOST": {"type": "string", "title": "Host"},
                    "PORT": {"type": "integer", "title": "Port", "minimum": 1},
                },
            },
            "grafana": {
                "type": "object",
                "properties": {
                    "GRAFANA_BASE_URL": {"type": "string", "title": "Base URL"},
                    "GRAFANA_DASHBOARD_UID": {"type": "string", "title": "Dashboard UID"},
                    "GRAFANA_DASHBOARD_SLUG": {"type": "string", "title": "Dashboard Slug"},
                    "GRAFANA_REFRESH": {"type": "string", "title": "Refresh Interval"},
                    "GRAFANA_KIOSK": {"type": "string", "title": "Kiosk Mode"},
                    "GRAFANA_AUTH_MODE": {"type": "string", "title": "Auth Mode"},
                    "GRAFANA_ORG_ID": {"type": "integer", "title": "Org ID", "minimum": 1},
                    "GRAFANA_EMBED_ENABLED": {"type": "boolean", "title": "Enable Embed"},
                },
            },
            "repo": {
                "type": "object",
                "properties": {
                    "REPO": {"type": "string", "title": "Active Repo"},
                    "GIT_BRANCH": {"type": "string", "title": "Git Branch (hint)"},
                    "default_repo": {"type": "string", "title": "Default Repo"},
                },
            },
        },
    }

    ui: Dict[str, Any] = {
        "order": ["generation", "retrieval", "reranker", "enrichment", "repo", "vscode", "grafana"],
        "titles": {
            "generation": {"title": "Generation"},
            "retrieval": {"title": "Retrieval"},
            "reranker": {"title": "Reranker"},
            "enrichment": {"title": "Enrichment"},
            "repo": {"title": "Repository"},
            "vscode": {"title": "VSCode"},
            "grafana": {"title": "Grafana"},
        },
    }

    SECRET_FIELDS = {
        'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY',
        'COHERE_API_KEY', 'VOYAGE_API_KEY', 'LANGSMITH_API_KEY',
        'LANGCHAIN_API_KEY', 'LANGTRACE_API_KEY', 'NETLIFY_API_KEY',
        'OAUTH_TOKEN', 'GRAFANA_API_KEY'
    }

    ed = _read_editor_settings()
    registry = get_config_registry()
    values: Dict[str, Any] = {
        "generation": {
            "GEN_MODEL": registry.get_str("GEN_MODEL", ""),
            "GEN_TEMPERATURE": registry.get_float("GEN_TEMPERATURE", 0.2),
            "GEN_MAX_TOKENS": registry.get_int("GEN_MAX_TOKENS", 2048),
            "GEN_TIMEOUT": registry.get_int("GEN_TIMEOUT", 60),
            "GEN_RETRY_MAX": registry.get_int("GEN_RETRY_MAX", 2),
            "OLLAMA_REQUEST_TIMEOUT": registry.get_int("OLLAMA_REQUEST_TIMEOUT", 300),
            "OLLAMA_STREAM_IDLE_TIMEOUT": registry.get_int("OLLAMA_STREAM_IDLE_TIMEOUT", 60),
        },
        "retrieval": {
            "FINAL_K": registry.get_int("FINAL_K", registry.get_int("LANGGRAPH_FINAL_K", 10)),
            "LANGGRAPH_FINAL_K": registry.get_int("LANGGRAPH_FINAL_K", registry.get_int("FINAL_K", 10)),
            "MQ_REWRITES": registry.get_int("MQ_REWRITES", 2),
            "SKIP_DENSE": registry.get_bool("SKIP_DENSE", False),
        },
        "reranker": {
            "AGRO_RERANKER_ENABLED": registry.get_bool("AGRO_RERANKER_ENABLED", False),
            "RERANK_BACKEND": registry.get_str("RERANK_BACKEND", ""),
            "RERANK_MODEL": registry.get_str("RERANK_MODEL", ""),
            "COHERE_RERANK_MODEL": registry.get_str("COHERE_RERANK_MODEL", ""),
            "VOYAGE_RERANK_MODEL": registry.get_str("VOYAGE_RERANK_MODEL", ""),
            "RERANK_TOP_K": registry.get_int("RERANK_TOP_K", 0) or None,
        },
        "enrichment": {
            "ENRICH_CODE_CHUNKS": registry.get_bool("ENRICH_CODE_CHUNKS", False),
            "ENRICH_BACKEND": registry.get_str("ENRICH_BACKEND", ""),
            "ENRICH_MODEL": registry.get_str("ENRICH_MODEL", ""),
            "ENRICH_MODEL_OLLAMA": registry.get_str("ENRICH_MODEL_OLLAMA", ""),
        },
        "vscode": {
            "ENABLED": bool(ed.get("enabled", True)),
            "EDITOR_EMBED_ENABLED": bool(ed.get("embed_enabled", True)),
            "HOST": ed.get("host", "127.0.0.1"),
            "PORT": int(ed.get("port", 4440)),
        },
        "grafana": {
            "GRAFANA_BASE_URL": registry.get_str("GRAFANA_BASE_URL", "http://127.0.0.1:3000"),
            "GRAFANA_DASHBOARD_UID": registry.get_str("GRAFANA_DASHBOARD_UID", "agro-overview"),
            "GRAFANA_DASHBOARD_SLUG": registry.get_str("GRAFANA_DASHBOARD_SLUG", registry.get_str("GRAFANA_DASHBOARD_UID", "agro-overview")),
            "GRAFANA_REFRESH": registry.get_str("GRAFANA_REFRESH", "10s"),
            "GRAFANA_KIOSK": registry.get_str("GRAFANA_KIOSK", "tv"),
            "GRAFANA_AUTH_MODE": registry.get_str("GRAFANA_AUTH_MODE", "anonymous"),
            "GRAFANA_ORG_ID": registry.get_int("GRAFANA_ORG_ID", 1),
            "GRAFANA_EMBED_ENABLED": registry.get_bool("GRAFANA_EMBED_ENABLED", True),
        },
        "repo": {
            "REPO": registry.get_str("REPO", default_repo or "agro"),
            "GIT_BRANCH": registry.get_str("GIT_BRANCH", ""),
            "default_repo": default_repo,
        },
    }

    for k in list(os.environ.keys()):
        if k in SECRET_FIELDS and os.environ.get(k):
            values.setdefault("secrets", {})[k] = "••••••••••••••••"

    for th in ("CONF_TOP1", "CONF_AVG5", "CONF_ANY"):
        val = registry.get(th)
        if val is not None:
            try:
                values.setdefault("retrieval", {})[th] = float(val)
            except Exception:
                pass

    return {"schema": schema, "ui": ui, "values": values}
