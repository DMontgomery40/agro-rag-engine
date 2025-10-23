import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from reranker.config import (
    RerankerSettings,
    as_env,
    load_settings,
    resolve_model_target,
)


@pytest.fixture(autouse=True)
def _reset_env(monkeypatch):
    """Ensure tests start with clean env defaults."""
    keys = [
        "AGRO_RERANKER_ENABLED",
        "AGRO_RERANKER_MODEL_PATH",
        "AGRO_RERANKER_ALPHA",
        "AGRO_RERANKER_TOPN",
        "AGRO_RERANKER_BATCH",
        "AGRO_RERANKER_MAXLEN",
        "AGRO_RERANKER_RELOAD_ON_CHANGE",
        "AGRO_RERANKER_RELOAD_PERIOD_SEC",
        "RERANK_BACKEND",
        "RERANKER_MODEL",
        "RERANK_INPUT_SNIPPET_CHARS",
        "COHERE_API_KEY",
        "COHERE_RERANK_MODEL",
        "COHERE_RERANK_TOP_N",
        "REPO_ROOT",
    ]
    for key in keys:
        monkeypatch.delenv(key, raising=False)
    yield


def test_defaults_resolve_to_local_model(tmp_path, monkeypatch):
    # Create fake model directory so loader treats it as local
    repo = tmp_path / "repo"
    (repo / "models" / "cross-encoder-agro").mkdir(parents=True)
    monkeypatch.setenv("AGRO_RERANKER_MODEL_PATH", "models/cross-encoder-agro")
    monkeypatch.setenv("REPO_ROOT", str(repo))

    settings = load_settings()
    assert isinstance(settings, RerankerSettings)
    assert settings.enabled is True
    assert settings.backend == "local"
    assert settings.local_model_dir == repo / "models" / "cross-encoder-agro"
    assert settings.hf_model_id == "cross-encoder/ms-marco-MiniLM-L-12-v2"
    assert resolve_model_target(settings) == str(repo / "models" / "cross-encoder-agro")


def test_disabled_when_env_flag_off(monkeypatch):
    monkeypatch.setenv("AGRO_RERANKER_ENABLED", "0")
    settings = load_settings()
    assert settings.enabled is False
    assert settings.backend == "none"


def test_cohere_backend_requires_api_key(monkeypatch):
    monkeypatch.setenv("RERANK_BACKEND", "cohere")
    monkeypatch.setenv("COHERE_API_KEY", "")
    settings = load_settings()
    assert settings.backend == "local"
    assert settings.cohere_api_key_present is False


def test_remote_model_when_path_missing(monkeypatch, tmp_path):
    repo = tmp_path / "repo"
    repo.mkdir()
    monkeypatch.setenv("REPO_ROOT", str(repo))
    monkeypatch.setenv("AGRO_RERANKER_MODEL_PATH", "cross-encoder/some-model")
    monkeypatch.setenv("RERANKER_MODEL", "cross-encoder/fallback")

    settings = load_settings()
    assert settings.local_model_dir is None
    assert settings.hf_model_id == "cross-encoder/some-model"
    assert resolve_model_target(settings) == "cross-encoder/some-model"


def test_as_env_serialises_dataclass(monkeypatch):
    monkeypatch.setenv("AGRO_RERANKER_ALPHA", "0.55")
    settings = load_settings()
    env = as_env(settings)
    assert env["alpha"] == "0.55"
    assert env["enabled"] in {"0", "1"}
    assert "source_env" in env
