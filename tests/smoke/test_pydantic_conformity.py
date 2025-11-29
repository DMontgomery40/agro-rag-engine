"""
Pydantic conformity smoke tests.

Validates that key JSON configs match their Pydantic schemas and that
layer bonus settings are not defined in multiple sources.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, List

import pytest


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _read_json(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _norm(val: Any) -> str:
    return str(val or "").strip()


def _prices_candidates() -> List[Path]:
    root = repo_root()
    env_gui = os.getenv("GUI_DIR")
    cands: List[Path] = []
    if env_gui:
        cands.append(Path(env_gui) / "prices.json")
    cands.append(root / "web" / "public" / "prices.json")
    return cands


def test_agro_config_pydantic_valid():
    from server.models.agro_config_model import AgroConfigRoot

    cfg_path = repo_root() / "agro_config.json"
    assert cfg_path.exists(), "agro_config.json missing"
    raw = _read_json(cfg_path)
    AgroConfigRoot(**raw)  # will raise ValidationError on failure


def test_prices_pydantic_valid():
    from server.models.prices_config import PricesConfig
    from server.services.config_store import _classify_components

    prices_path = next((p for p in _prices_candidates() if p.exists()), None)
    assert prices_path, "prices.json not found in expected locations"
    data_raw = _read_json(prices_path)
    # Explicitly normalize components to mirror runtime behavior
    normalized_models: list[dict[str, Any]] = []
    for m in data_raw.get("models", []):
        mm = dict(m)
        comps = mm.get("components") or _classify_components(mm)
        mm["components"] = comps
        normalized_models.append(mm)
    data_raw["models"] = normalized_models

    cfg = PricesConfig.model_validate(data_raw)
    assert cfg.models, "prices.json has no models"
    # Ensure components are present after normalization
    comps_flat = set()
    has_embed = False
    for m in cfg.models:
        comps = list(m.components or [])
        if not comps:
            comps = _classify_components(m.model_dump())
        assert comps, f"prices entry missing components: {m.model}"
        comps_flat.update(comps)
        if "EMB" in comps:
            has_embed = True
        # Required fields present and non-empty
        assert _norm(m.provider), f"prices entry missing provider: {m}"
        assert _norm(m.model), f"prices entry missing model: {m}"
        assert _norm(m.unit), f"prices entry missing unit: {m}"
    assert _norm(cfg.currency), "prices currency missing"

    # Ensure we have at least one model per component type to keep pickers alive
    assert "GEN" in comps_flat, "prices.json missing any generative models"
    assert has_embed, "prices.json missing any embedding models"
    assert "RERANK" in comps_flat, "prices.json missing any rerank models"


def test_layer_bonus_not_double_sourced():
    """Ensure layer bonuses are not defined in both agro_config and repos.json."""
    cfg = _read_json(repo_root() / "agro_config.json")
    repos = _read_json(repo_root() / "repos.json")

    has_layer_bonus_cfg = any(k.startswith("LAYER_BONUS_") for k in cfg.keys())
    has_layer_bonus_repos = any(r.get("layer_bonuses") for r in repos.get("repos", []))

    assert not (has_layer_bonus_cfg and has_layer_bonus_repos), (
        "Layer bonus settings found in both agro_config.json and repos.json. "
        "Use a single source of truth."
    )


def test_agro_config_keys_are_known():
    """Ensure agro_config.json does not contain unknown keys (schema drift)."""
    from server.models.agro_config_model import AgroConfigRoot

    cfg = _read_json(repo_root() / "agro_config.json")
    known = set(AgroConfigRoot.model_fields.keys())
    unknown = [k for k in cfg.keys() if k not in known]
    assert not unknown, f"Unknown keys in agro_config.json: {unknown}"


def test_agro_config_required_model_provider_fields():
    """Ensure model/provider-related env keys exist when set (keeps pickers/api sane)."""
    cfg = _read_json(repo_root() / "agro_config.json")
    # Hard-required keys must exist if present
    required_if_present = [
        "GEN_MODEL",
        "EMBEDDING_MODEL",
        "RERANK_BACKEND",
        "RERANK_MODEL",
        "COHERE_RERANK_MODEL",
        "VOYAGE_RERANK_MODEL",
    ]
    for key in required_if_present:
        if key in cfg:
            assert _norm(cfg[key]), f"{key} is empty in agro_config.json"
