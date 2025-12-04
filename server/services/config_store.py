import json
import logging
import os
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import ValidationError

from common.config_loader import load_repos
from common.paths import repo_root, gui_dir
from server.services.config_registry import get_config_registry
from server.models.agro_config_model import AGRO_CONFIG_KEYS

logger = logging.getLogger("agro.api")


SECRET_FIELDS = {
    'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY',
    'COHERE_API_KEY', 'VOYAGE_API_KEY', 'LANGSMITH_API_KEY',
    'LANGCHAIN_API_KEY', 'LANGTRACE_API_KEY', 'NETLIFY_API_KEY',
    'OAUTH_TOKEN', 'GRAFANA_API_KEY', 'GRAFANA_AUTH_TOKEN',
    'MCP_API_KEY', 'JINA_API_KEY', 'DEEPSEEK_API_KEY', 'MISTRAL_API_KEY',
    'XAI_API_KEY', 'GROQ_API_KEY', 'FIREWORKS_API_KEY'
}


def _atomic_write_text(path: Path, content: str, max_retries: int = 3) -> None:
    """Atomically write text to a file with fallback for Docker volume mounts.
    
    Docker Desktop on macOS can fail with 'Device or resource busy' on os.replace()
    when the file is being watched. We try atomic first, then fall back to direct write.
    """
    import time
    
    path.parent.mkdir(parents=True, exist_ok=True)
    
    # Try atomic write first (safe against corruption on crash)
    fd, tmp_path_str = tempfile.mkstemp(dir=path.parent, prefix=path.name, suffix=".tmp")
    tmp_path = Path(tmp_path_str)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as fh:
            fh.write(content)
            fh.flush()
            os.fsync(fh.fileno())
        
        # Try os.replace with retries
        for attempt in range(max_retries):
            try:
                os.replace(tmp_path, path)
                return  # Success
            except OSError as e:
                if e.errno == 16:  # EBUSY - Device or resource busy
                    time.sleep(0.05 * (attempt + 1))
                else:
                    raise
        
        # Atomic failed - fall back to direct write (less safe but works on Docker)
        # This can cause brief inconsistency if read during write, but won't corrupt
        logger.warning(f"Atomic write failed for {path}, falling back to direct write")
        with open(path, 'w', encoding='utf-8') as fh:
            fh.write(content)
            fh.flush()
            os.fsync(fh.fileno())
            
    finally:
        if tmp_path.exists():
            try:
                tmp_path.unlink()
            except (FileNotFoundError, OSError):
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
    """Ingest secrets from uploaded text - RUNTIME ONLY, NEVER writes to .env.
    
    User must manually edit .env file to persist secrets.
    This only applies them to os.environ for the current session.
    """
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

    # NEVER write to .env - user must manually edit it
    # The persist parameter is ignored - we never persist secrets programmatically
    if persist:
        logger.warning("secrets_ingest: persist=True ignored - .env is NEVER written programmatically")

    return {
        "ok": True, 
        "applied": sorted(applied.keys()), 
        "persisted": False,  # Always false - we never write to .env
        "message": "Secrets applied to runtime only. To persist, manually edit .env file."
    }


def save_mcp_key(key: str) -> Dict[str, Any]:
    """Apply MCP API key to runtime - NEVER writes to .env.
    
    User must manually add MCP_API_KEY to .env file to persist.
    This only applies it to os.environ for the current session.

    Args:
        key: MCP API key value

    Returns:
        Success status
    """
    try:
        # NEVER write to .env - only apply to os.environ for runtime
        key_name = "MCP_API_KEY"
        os.environ[key_name] = key

        logger.info("MCP API key applied to runtime (NOT persisted to .env)")
        return {
            "status": "success", 
            "message": "MCP API key applied to runtime. To persist, manually add to .env file."
        }

    except Exception as e:
        logger.error(f"Failed to apply MCP key: {e}")
        return {"status": "error", "message": "Failed to apply API key"}


def _effective_rerank_mode() -> Dict[str, Any]:
    try:
        from server.learning_reranker import get_reranker_info
    except Exception:
        def get_reranker_info():
            return {}
    import time
    registry = get_config_registry()
    
    mode_raw = registry.get_str("RERANKER_MODE", "").strip().lower()
    provider_raw = registry.get_str("RERANKER_CLOUD_PROVIDER", "").strip().lower()
    cloud_model = registry.get_str("RERANKER_CLOUD_MODEL", "").strip()
    
    def _norm_mode(val: str) -> str:
        if not val:
            return ""
        if val in {"off", "disabled"}:
            return "none"
        return val

    mode = _norm_mode(mode_raw)
    now = time.time()
    try:
        info = get_reranker_info()
    except Exception:
        info = {}
    explicit = bool(mode)
    mtime = float(info.get("model_dir_mtime") or 0.0)
    recent = (now - mtime) <= (7 * 24 * 3600) if mtime > 0 else False
    
    cloud_key_present = False
    if provider_raw:
        api_key_env = f"{provider_raw.upper()}_API_KEY"
        cloud_key_present = bool((os.getenv(api_key_env, "") or "").strip())
    
    path = info.get("resolved_path") or info.get("path") or registry.get_str("RERANKER_LOCAL_MODEL", "models/cross-encoder-agro")
    local_present = bool(str(path)) and os.path.exists(str(path))
    
    if explicit:
        return {"reranker_mode": mode, "reranker_cloud_provider": provider_raw if mode == "cloud" else "", "reranker_cloud_model": cloud_model, "reason": "explicit_env"}
    if recent:
        return {"reranker_mode": "learning", "reranker_cloud_provider": "", "reranker_cloud_model": "", "reason": "recent_local_model"}
    if cloud_key_present and provider_raw:
        return {"reranker_mode": "cloud", "reranker_cloud_provider": provider_raw, "reranker_cloud_model": cloud_model, "reason": "cloud_key_present"}
    if local_present:
        return {"reranker_mode": "local", "reranker_cloud_provider": "", "reranker_cloud_model": "", "reason": "local_model_present"}
    return {"reranker_mode": "none", "reranker_cloud_provider": "", "reranker_cloud_model": "", "reason": "no_reranker_available"}


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

    # Add infrastructure path defaults from common/paths.py if not in env
    try:
        from common.paths import files_root, docs_dir, data_dir
        if 'REPO_ROOT' not in env:
            env['REPO_ROOT'] = str(repo_root())
        if 'FILES_ROOT' not in env:
            env['FILES_ROOT'] = str(files_root())
        if 'GUI_DIR' not in env:
            env['GUI_DIR'] = str(gui_dir())
        if 'DOCS_DIR' not in env:
            env['DOCS_DIR'] = str(docs_dir())
        if 'DATA_DIR' not in env:
            env['DATA_DIR'] = str(data_dir())
    except Exception as e:
        logger.warning(f"Failed to add infrastructure path defaults: {e}")

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
        hints["reranker_mode"] = _effective_rerank_mode()
    except Exception:
        hints["reranker_mode"] = {"reranker_mode": "none", "reranker_cloud_provider": "", "reranker_cloud_model": "", "reason": "probe_failed"}

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

    # ALL config updates go to agro_config.json - NEVER write to .env
    # .env is for secrets ONLY and must be manually edited by user
    agro_config_updates = {k: v for k, v in env_updates.items() if k in AGRO_CONFIG_KEYS}
    # Non-AGRO keys go to os.environ for runtime only, NOT persisted to .env
    runtime_only_updates = {k: v for k, v in env_updates.items() if k not in AGRO_CONFIG_KEYS}
    validation_error: Optional[str] = None

    # Update agro_config.json if there are relevant updates
    if agro_config_updates:
        try:
            registry = get_config_registry()
            registry.update_agro_config(agro_config_updates)
            logger.info(f"Updated agro_config.json with keys: {sorted(agro_config_updates.keys())}")
        except ValidationError as e:
            logger.error(f"Failed to update agro_config.json: {e}")
            validation_error = str(e)
        except Exception as e:
            logger.error(f"Failed to update agro_config.json: {e}")
            validation_error = str(e)

    if validation_error:
        return {
            "status": "error",
            "error": validation_error,
            "applied_env_keys": [],
            "applied_agro_config_keys": [],
            "repos_count": 0
        }

    # NEVER WRITE TO .env - it is for secrets only and must be manually edited
    # Apply runtime-only updates to os.environ (NOT persisted)
    for k, v in runtime_only_updates.items():
        # Skip masked values entirely
        if v == '••••••••••••••••' or str(v).startswith('••••'):
            continue
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = str(v)
    
    # Log what we did NOT persist
    if runtime_only_updates:
        logger.info(f"Applied {len(runtime_only_updates)} runtime-only updates (NOT persisted to .env)")

    # Upsert repos.json
    repos_path = root / "repos.json"
    cfg = _read_json(repos_path, {"default_repo": None, "repos": []})
    default_repo = runtime_only_updates.get("REPO") or cfg.get("default_repo")
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
        "applied_runtime_keys": sorted(runtime_only_updates.keys()),  # NOT persisted to .env
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


def _normalize_models(data: Dict[str, Any]) -> Dict[str, Any]:
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
        return _default_models()


def models_get() -> Dict[str, Any]:
    raw = _read_json(gui_dir() / "models.json", {"models": []})
    data = raw if (raw and isinstance(raw, dict) and raw.get("models")) else _default_models()
    return _normalize_models(data)


def models_upsert(item: Dict[str, Any]) -> Dict[str, Any]:
    models_path = gui_dir() / "models.json"
    data = _read_json(models_path, {"models": []})
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
    _write_json(models_path, data)
    return {"ok": True, "count": len(models)}


def _default_models() -> Dict[str, Any]:
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
                    "RERANKER_MODE": {"type": "string", "enum": ["cloud", "local", "learning", "none"], "title": "Mode"},
                    "RERANKER_CLOUD_PROVIDER": {"type": "string", "enum": ["", "cohere", "voyage", "jina"], "title": "Cloud Provider"},
                    "RERANKER_CLOUD_MODEL": {"type": "string", "title": "Cloud Model"},
                    "RERANKER_LOCAL_MODEL": {"type": "string", "title": "Local Model"},
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
            "docker": {
                "type": "object",
                "properties": {
                    "DOCKER_STATUS_TIMEOUT": {"type": "integer", "title": "Status Check Timeout (s)", "minimum": 1, "maximum": 30},
                    "DOCKER_CONTAINER_LIST_TIMEOUT": {"type": "integer", "title": "Container List Timeout (s)", "minimum": 1, "maximum": 60},
                    "DOCKER_CONTAINER_ACTION_TIMEOUT": {"type": "integer", "title": "Container Action Timeout (s)", "minimum": 5, "maximum": 120},
                    "DOCKER_INFRA_UP_TIMEOUT": {"type": "integer", "title": "Infra Up Timeout (s)", "minimum": 30, "maximum": 300},
                    "DOCKER_INFRA_DOWN_TIMEOUT": {"type": "integer", "title": "Infra Down Timeout (s)", "minimum": 10, "maximum": 120},
                    "DOCKER_LOGS_TAIL": {"type": "integer", "title": "Log Lines to Tail", "minimum": 10, "maximum": 1000},
                    "DOCKER_LOGS_TIMESTAMPS": {"type": "integer", "title": "Include Log Timestamps (0/1)", "minimum": 0, "maximum": 1},
                },
            },
        },
    }

    ui: Dict[str, Any] = {
        "order": ["generation", "retrieval", "reranker", "enrichment", "repo", "vscode", "grafana", "docker"],
        "titles": {
            "generation": {"title": "Generation"},
            "retrieval": {"title": "Retrieval"},
            "reranker": {"title": "Reranker"},
            "enrichment": {"title": "Enrichment"},
            "repo": {"title": "Repository"},
            "vscode": {"title": "VSCode"},
            "grafana": {"title": "Grafana"},
            "docker": {"title": "Docker"},
        },
    }

    # Use global SECRET_FIELDS (defined at module top)

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
            "RERANKER_MODE": registry.get_str("RERANKER_MODE", "none"),
            "RERANKER_CLOUD_PROVIDER": registry.get_str("RERANKER_CLOUD_PROVIDER", ""),
            "RERANKER_CLOUD_MODEL": registry.get_str("RERANKER_CLOUD_MODEL", ""),
            "RERANKER_LOCAL_MODEL": registry.get_str("RERANKER_LOCAL_MODEL", ""),
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
        "docker": {
            "DOCKER_STATUS_TIMEOUT": registry.get_int("DOCKER_STATUS_TIMEOUT", 5),
            "DOCKER_CONTAINER_LIST_TIMEOUT": registry.get_int("DOCKER_CONTAINER_LIST_TIMEOUT", 10),
            "DOCKER_CONTAINER_ACTION_TIMEOUT": registry.get_int("DOCKER_CONTAINER_ACTION_TIMEOUT", 30),
            "DOCKER_INFRA_UP_TIMEOUT": registry.get_int("DOCKER_INFRA_UP_TIMEOUT", 60),
            "DOCKER_INFRA_DOWN_TIMEOUT": registry.get_int("DOCKER_INFRA_DOWN_TIMEOUT", 30),
            "DOCKER_LOGS_TAIL": registry.get_int("DOCKER_LOGS_TAIL", 100),
            "DOCKER_LOGS_TIMESTAMPS": registry.get_int("DOCKER_LOGS_TIMESTAMPS", 1),
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
