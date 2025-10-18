# AGRO GUI — Stubs & Scaffolding (Live Settings, Cost, Profiles, Secrets)

> Goal: deliver **fully defined stubs** (no ellipses) for a working skeleton that a junior dev can complete. Includes API routes, front‑end tabs, cost calc, profiles, and secrets ingest. Everything compiles/loads with predictable stub data; TODOs are comments, not code gaps.

---

## File: `serve_rag.py` (FastAPI app — routes fully stubbed)

```python
#!/usr/bin/env python3
"""
AGRO GUI backend (stubbed):
- Serves / (gui/index.html) and /gui static assets
- Live config GET/POST (/api/config)
- Prices (/api/prices)
- Cost estimator (/api/cost/estimate)
- Hardware scan (/api/scan-hw)
- Profiles list/apply/save (/api/profiles*)
- Secrets ingest (/api/secrets/ingest)

This file is intentionally complete as STUBS:
- Logic is basic but returns valid shapes
- Clear TODOs mark where to implement full behavior
"""
from __future__ import annotations
import os
import re
import json
import platform
import subprocess
import shutil
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# --------------------------- Constants & Paths ---------------------------
ROOT = Path(__file__).resolve().parent
GUI_DIR = ROOT / "gui"
PRICES_PATH = GUI_DIR / "prices.json"
PROFILES_DIR = GUI_DIR / "profiles"
DEFAULTS_PATH = PROFILES_DIR / "defaults.json"

ALLOWED_ENV_KEYS = [
    # Infrastructure
    "QDRANT_URL", "REDIS_URL", "HYDRRATION_MODE", "HYDRATION_MODE",
    # Repo/defaults
    "REPO",
    # Retrieval
    "MQ_REWRITES", "TOPK_SPARSE", "TOPK_DENSE", "FINAL_K", "VENDOR_MODE",
    "CONF_TOP1", "CONF_AVG5",
    # Reranker & Generation
    "RERANK_BACKEND", "RERANKER_MODEL", "COHERE_API_KEY", "COHERE_RERANK_MODEL",
    "OLLAMA_URL", "GEN_MODEL", "OPENAI_API_KEY",
    # Embeddings
    "EMBEDDING_TYPE", "VOYAGE_API_KEY",
    # Misc
    "NETLIFY_DOMAINS", "NETLIFY_API_KEY", "LANGCHAIN_TRACING_V2", "LANGCHAIN_agro",
]

# Canonical key normalization map for secrets ingest
CANONICAL_KEYS = {
    # OpenAI
    r"^(openai[_-]?(api[_-]?key|key|token))$": "OPENAI_API_KEY",
    # Cohere
    r"^(cohere[_-]?(api[_-]?key|key|token))$": "COHERE_API_KEY",
    # Voyage
    r"^(voyage[_-]?(api[_-]?key|key|token))$": "VOYAGE_API_KEY",
    # Netlify
    r"^(netlify[_-]?(api[_-]?key|key|token))$": "NETLIFY_API_KEY",
}

# --------------------------- Models ---------------------------
class LayerBonuses(BaseModel):
    __root__: Dict[str, Dict[str, float]] = Field(default_factory=dict)

class RepoConfig(BaseModel):
    name: str
    path: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    path_boosts: List[str] = Field(default_factory=list)
    layer_bonuses: Dict[str, Dict[str, float]] = Field(default_factory=dict)

class ConfigResponse(BaseModel):
    env: Dict[str, Any]
    default_repo: Optional[str]
    repos: List[RepoConfig]

class UpdateConfigRequest(BaseModel):
    env: Dict[str, Any] = Field(default_factory=dict)
    repos: List[RepoConfig] = Field(default_factory=list)

class CostEstimateRequest(BaseModel):
    provider: str
    model: str
    tokens_in: int = 0
    tokens_out: int = 0
    embeds: int = 0
    reranks: int = 0
    requests_per_day: int = 0
    # Optional electricity calc for local
    kwh_rate: Optional[float] = None  # $/kWh
    watts: Optional[int] = None        # average power draw when running
    hours_per_day: Optional[float] = None

class CostEstimateResponse(BaseModel):
    provider: str
    model: str
    daily: float
    monthly: float
    breakdown: Dict[str, float]
    notes: Optional[str] = None

class ProfileSaveRequest(BaseModel):
    name: str
    profile: Dict[str, Any]

class ProfileApplyRequest(BaseModel):
    profile: Dict[str, Any]

class SecretsIngestResult(BaseModel):
    normalized: Dict[str, str]
    ignored: List[str]
    persisted: bool

# --------------------------- App Setup ---------------------------
app = FastAPI(title="AGRO GUI (stubs)")
app.mount("/gui", StaticFiles(directory=str(GUI_DIR), html=True), name="gui")

@app.get("/", include_in_schema=False)
def serve_index() -> FileResponse:
    index = GUI_DIR / "index.html"
    if not index.exists():
        raise HTTPException(status_code=404, detail="gui/index.html not found")
    return FileResponse(str(index))

# --------------------------- Utilities ---------------------------

def _read_json(path: Path, default: Any) -> Any:
    if path.exists():
        try:
            return json.loads(path.read_text())
        except Exception:
            return default
    return default


def _write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2))


def _load_repos_file() -> Dict[str, Any]:
    return _read_json(ROOT / "repos.json", {"default_repo": None, "repos": []})


def _save_repos_file(data: Dict[str, Any]) -> None:
    _write_json(ROOT / "repos.json", data)


def _collect_env() -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for key in ALLOWED_ENV_KEYS:
        val = os.getenv(key)
        if val is not None:
            out[key] = val
    # Normalize common misspelling
    if "HYDRRATION_MODE" in out and "HYDRATION_MODE" not in out:
        out["HYDRATION_MODE"] = out.pop("HYDRRATION_MODE")
    return out


def _set_env_bulk(env_updates: Dict[str, Any]) -> None:
    for k, v in env_updates.items():
        if k not in ALLOWED_ENV_KEYS:
            # Skip unknown keys rather than erroring — UI can show ignored list if desired
            continue
        if isinstance(v, bool):
            os.environ[k] = "true" if v else "false"
        else:
            os.environ[k] = str(v)


def _parse_kv_lines(text: str) -> Dict[str, str]:
    """Parse .env or KEY=VALUE lines; also supports 'key: value'."""
    out: Dict[str, str] = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        m = re.match(r"^([A-Za-z0-9_\-\.]+)\s*[:=]\s*(.*)$", line)
        if not m:
            continue
        key, val = m.group(1).strip(), m.group(2).strip()
        # strip wrapping quotes if present
        if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
            val = val[1:-1]
        out[key] = val
    return out


def _canonicalize(d: Dict[str, str]) -> Dict[str, str]:
    norm: Dict[str, str] = {}
    ignored: List[str] = []
    for k, v in d.items():
        lk = k.lower()
        mapped = None
        for pattern, canon in CANONICAL_KEYS.items():
            if re.match(pattern, lk):
                mapped = canon
                break
        if mapped is None:
            # Pass through known env keys if exactly matched
            if k in ALLOWED_ENV_KEYS:
                mapped = k
        if mapped:
            norm[mapped] = v
        else:
            ignored.append(k)
    # Return both sets for UI; only the normalized will be applied to env
    norm["_IGNORED_KEYS"] = ",".join(ignored)
    return norm


def _mem_gb() -> int:
    try:
        if platform.system() == "Darwin":
            out = subprocess.check_output(["sysctl", "-n", "hw.memsize"]).decode().strip()
            return max(1, int(int(out) / (1024**3)))
        elif platform.system() == "Linux":
            pages = os.sysconf("SC_PHYS_PAGES")
            size = os.sysconf("SC_PAGE_SIZE")
            return max(1, int((pages * size) / (1024**3)))
    except Exception:
        pass
    return 8


def _cpu_cores() -> int:
    try:
        return os.cpu_count() or 4
    except Exception:
        return 4


def _detect_runtimes() -> Dict[str, Any]:
    return {
        "ollama": shutil.which("ollama") is not None,
        "lmstudio": shutil.which("lmstudio") is not None or shutil.which("lm-studio") is not None,
        "coreml": platform.system() == "Darwin",
        "cuda": shutil.which("nvidia-smi") is not None,
        "npu": "APPLE_NEURAL_ENGINE" if platform.system() == "Darwin" else False,
    }

# --------------------------- Routes ---------------------------
@app.get("/api/health")
def health() -> Dict[str, Any]:
    return {"ok": True, "ts": datetime.utcnow().isoformat() + "Z"}


@app.get("/api/config", response_model=ConfigResponse)
def get_config() -> ConfigResponse:
    env = _collect_env()
    repos_data = _load_repos_file()
    default_repo = repos_data.get("default_repo") or env.get("REPO")
    repos_list = [RepoConfig(**r) for r in repos_data.get("repos", [])]
    return ConfigResponse(env=env, default_repo=default_repo, repos=repos_list)


@app.post("/api/config")
def post_config(req: UpdateConfigRequest) -> Dict[str, Any]:
    # Update env in-memory (source of truth at runtime)
    _set_env_bulk(req.env)

    # Merge repos.json
    if req.repos:
        current = _load_repos_file()
        by_name = {r.get("name"): r for r in current.get("repos", []) if r.get("name")}
        for ru in req.repos:
            d = ru.dict()
            name = d.pop("name")
            existing = by_name.get(name, {"name": name})
            existing.update(d)
            by_name[name] = existing
        current["repos"] = list(by_name.values())
        # Persist default repo from REPO env if present
        if os.getenv("REPO"):
            current["default_repo"] = os.getenv("REPO")
        _save_repos_file(current)

    return {"status": "success"}


@app.get("/api/prices")
def get_prices() -> Any:
    """Return prices.json; if missing, create a minimal starter set."""
    default_prices = {
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
    data = _read_json(PRICES_PATH, default_prices)
    return JSONResponse(data)


@app.post("/api/cost/estimate", response_model=CostEstimateResponse)
def cost_estimate(req: CostEstimateRequest) -> CostEstimateResponse:
    prices = _read_json(PRICES_PATH, {"models": []})
    models = prices.get("models", [])

    # Find matching pricing row
    row = None
    for m in models:
        if (m.get("provider") == req.provider) and (m.get("model") == req.model):
            row = m
            break

    breakdown: Dict[str, float] = {"input": 0.0, "output": 0.0, "embeds": 0.0, "rerank": 0.0, "per_request": 0.0, "electricity": 0.0}
    if row is None:
        # Unknown model; return zeros with note
        daily = 0.0
        monthly = 0.0
        return CostEstimateResponse(provider=req.provider, model=req.model, daily=daily, monthly=monthly, breakdown=breakdown, notes="Model not found in prices.json")

    unit = row.get("unit", "1k_tokens")
    in_rate = float(row.get("input_per_1k", 0.0))
    out_rate = float(row.get("output_per_1k", 0.0))
    emb_rate = float(row.get("embed_per_1k", 0.0))
    rr_rate = float(row.get("rerank_per_1k", 0.0))
    per_req = float(row.get("per_request", 0.0))

    # Convert counts to thousands for token-priced resources
    if unit == "1k_tokens":
        breakdown["input"] = (req.tokens_in / 1000.0) * in_rate
        breakdown["output"] = (req.tokens_out / 1000.0) * out_rate
        breakdown["embeds"] = (req.embeds / 1000.0) * emb_rate
        breakdown["rerank"] = (req.reranks / 1000.0) * rr_rate
    # Per-request applies regardless of token unit
    breakdown["per_request"] = per_req

    daily = (breakdown["input"] + breakdown["output"] + breakdown["embeds"] + breakdown["rerank"] + breakdown["per_request"]) * max(0, req.requests_per_day)

    # Electricity estimate for local
    if req.provider == "local":
        kwh_rate = req.kwh_rate if req.kwh_rate is not None else 0.13  # EXAMPLE DEFAULT
        watts = req.watts if req.watts is not None else 45             # EXAMPLE Mac idle+light load
        hours = req.hours_per_day if req.hours_per_day is not None else 2.0
        kwh = (watts / 1000.0) * hours
        elec = kwh_rate * kwh
        breakdown["electricity"] = round(elec, 4)
        daily = breakdown["electricity"]  # local assumes model/API is $0

    monthly = daily * 30.0
    return CostEstimateResponse(
        provider=req.provider,
        model=req.model,
        daily=round(daily, 4),
        monthly=round(monthly, 4),
        breakdown={k: round(v, 4) for k, v in breakdown.items()},
        notes=None,
    )


@app.post("/api/scan-hw")
def scan_hw() -> Dict[str, Any]:
    runtimes = _detect_runtimes()
    info = {
        "os": platform.platform(),
        "cpu_cores": _cpu_cores(),
        "mem_gb": _mem_gb(),
        "gpu_desc": None,  # TODO: add nvidia-smi / Metal query if needed
    }
    return {"runtimes": runtimes, "info": info}


@app.get("/api/profiles")
def list_profiles() -> Dict[str, Any]:
    PROFILES_DIR.mkdir(parents=True, exist_ok=True)
    names: List[str] = []
    for p in PROFILES_DIR.glob("*.json"):
        names.append(p.stem)
    default_profile = _read_json(DEFAULTS_PATH, {"name": None, "profile": {}})
    return {"profiles": names, "default": default_profile}


@app.post("/api/profiles/apply")
def apply_profile(req: ProfileApplyRequest) -> Dict[str, Any]:
    # Apply env keys that are allowed
    env_updates = {k: v for k, v in req.profile.items() if k in ALLOWED_ENV_KEYS}
    _set_env_bulk(env_updates)
    # Persist as defaults.json so UI can reload selection
    _write_json(DEFAULTS_PATH, {"name": "_last_applied_", "profile": req.profile})
    return {"status": "applied", "applied_keys": sorted(env_updates.keys())}


@app.post("/api/profiles/save")
def save_profile(req: ProfileSaveRequest) -> Dict[str, Any]:
    if not req.name:
        raise HTTPException(status_code=400, detail="name is required")
    PROFILES_DIR.mkdir(parents=True, exist_ok=True)
    path = PROFILES_DIR / f"{req.name}.json"
    _write_json(path, req.profile)
    return {"status": "saved", "file": str(path)}


@app.post("/api/secrets/ingest", response_model=SecretsIngestResult)
async def secrets_ingest(file: UploadFile = File(...), persist: Optional[bool] = Form(False)) -> SecretsIngestResult:
    """Accept a file, parse env-like keys, canonicalize, set in-memory env. Optionally persist to defaults.json."""
    content = (await file.read()).decode(errors="replace")
    parsed = _parse_kv_lines(content)
    canonical = _canonicalize(parsed)

    ignored_list = canonical.pop("_IGNORED_KEYS", "").split(",") if canonical.get("_IGNORED_KEYS") else []

    # Apply canonical keys to env
    env_updates = {k: v for k, v in canonical.items() if k in ALLOWED_ENV_KEYS}
    _set_env_bulk(env_updates)

    if persist:
        defaults = _read_json(DEFAULTS_PATH, {"name": "_last_applied_", "profile": {}})
        defaults["profile"].update(env_updates)
        _write_json(DEFAULTS_PATH, defaults)

    return SecretsIngestResult(normalized=env_updates, ignored=[k for k in ignored_list if k], persisted=bool(persist))


# Optional: run for local dev
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("serve_rag:app", host="127.0.0.1", port=8012, reload=True)
```

---

## File: `gui/index.html` (2 tabs + right panel for Cost & Profiles)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AGRO Local GUI</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header class="topbar">
    <h1>AGRO — Local GUI</h1>
    <div class="top-actions">
      <button id="btn-health">Check Health</button>
      <span id="health-status">—</span>
    </div>
  </header>

  <main class="layout">
    <section class="content">
      <div class="tab-bar">
        <button id="tab-btn-1" class="active">Storage Calculator</button>
        <button id="tab-btn-2">Settings Panel</button>
      </div>

      <div id="tab-content-1" class="tab-content active">
        <iframe id="calc-frame" src="rag-calculator.html" title="Storage Calculator"></iframe>
      </div>

      <div id="tab-content-2" class="tab-content">
        <h2>AGRO Configuration</h2>
        <form id="config-form">
          <details open>
            <summary><strong>Infrastructure</strong></summary>
            <label>Qdrant URL <input type="text" name="QDRANT_URL" /></label>
            <label>Redis URL <input type="text" name="REDIS_URL" /></label>
            <label>Hydration Mode
              <select name="HYDRATION_MODE">
                <option value="lazy">lazy</option>
                <option value="none">none</option>
              </select>
            </label>
          </details>

          <details open>
            <summary><strong>Repository</strong></summary>
            <label>Active Repo
              <select name="REPO" id="repo-select"></select>
            </label>
            <div id="repos-section" class="repo-grid"></div>
          </details>

          <details>
            <summary><strong>Retrieval</strong></summary>
            <label>MQ_REWRITES <input type="number" name="MQ_REWRITES" min="1" value="4" /></label>
            <label>TOPK_SPARSE <input type="number" name="TOPK_SPARSE" min="1" value="75" /></label>
            <label>TOPK_DENSE <input type="number" name="TOPK_DENSE" min="1" value="75" /></label>
            <label>FINAL_K <input type="number" name="FINAL_K" min="1" value="10" /></label>
            <label>VENDOR_MODE
              <select name="VENDOR_MODE">
                <option value="prefer_first_party">prefer_first_party</option>
                <option value="prefer_vendor">prefer_vendor</option>
              </select>
            </label>
            <label>CONF_TOP1 <input type="number" step="0.01" min="0" max="1" name="CONF_TOP1" value="0.62" /></label>
            <label>CONF_AVG5 <input type="number" step="0.01" min="0" max="1" name="CONF_AVG5" value="0.55" /></label>
          </details>

          <details>
            <summary><strong>Reranker & Generation</strong></summary>
            <label>RERANK_BACKEND
              <select name="RERANK_BACKEND">
                <option value="local">local</option>
                <option value="hf">hf</option>
                <option value="cohere">cohere</option>
              </select>
            </label>
            <label>RERANKER_MODEL <input type="text" name="RERANKER_MODEL" placeholder="cross-encoder/ms-marco-MiniLM-L-6-v2" /></label>
            <label>COHERE_RERANK_MODEL <input type="text" name="COHERE_RERANK_MODEL" placeholder="rerank-english-v3.0" /></label>
            <label>COHERE_API_KEY <input type="password" name="COHERE_API_KEY" /></label>
            <label>OLLAMA_URL <input type="text" name="OLLAMA_URL" placeholder="http://127.0.0.1:11434" /></label>
            <label>GEN_MODEL <input type="text" name="GEN_MODEL" placeholder="gpt-4o-mini or qwen3-coder:14b" /></label>
            <label>OPENAI_API_KEY <input id="openai-key" type="password" name="OPENAI_API_KEY" /></label>
          </details>

          <details>
            <summary><strong>Embeddings & Misc</strong></summary>
            <label>EMBEDDING_TYPE
              <select name="EMBEDDING_TYPE">
                <option value="openai">openai</option>
                <option value="local">local</option>
                <option value="voyage">voyage</option>
              </select>
            </label>
            <label>VOYAGE_API_KEY <input type="password" name="VOYAGE_API_KEY" /></label>
            <label>NETLIFY_DOMAINS <input type="text" name="NETLIFY_DOMAINS" /></label>
            <label>NETLIFY_API_KEY <input type="password" name="NETLIFY_API_KEY" /></label>
            <label><input type="checkbox" name="LANGCHAIN_TRACING_V2" /> LANGCHAIN_TRACING_V2</label>
            <label>LANGCHAIN_agro <input type="text" name="LANGCHAIN_agro" /></label>
          </details>

          <div class="form-actions">
            <button type="button" id="save-btn">Apply Changes</button>
          </div>
        </form>
      </div>
    </section>

    <aside class="sidepanel" id="sidepanel">
      <details open>
        <summary><strong>Live Cost Calculator</strong></summary>
        <div class="cost-controls">
          <label>Provider <input type="text" id="cost-provider" value="openai" /></label>
          <label>Model <input type="text" id="cost-model" value="gpt-4o-mini" /></label>
          <label>Tokens In (per req) <input type="number" id="cost-in" value="500" /></label>
          <label>Tokens Out (per req) <input type="number" id="cost-out" value="800" /></label>
          <label>Embeds (per req) <input type="number" id="cost-embeds" value="0" /></label>
          <label>Rerank tokens (per req) <input type="number" id="cost-rerank" value="0" /></label>
          <label>Requests / day <input type="number" id="cost-rpd" value="100" /></label>
          <fieldset>
            <legend>Local electricity (optional)</legend>
            <label>kWh rate <input type="number" step="0.01" id="cost-kwh" /></label>
            <label>Watts <input type="number" id="cost-watts" /></label>
            <label>Hours/day <input type="number" step="0.1" id="cost-hours" /></label>
          </fieldset>
          <button id="btn-estimate">Estimate</button>
          <div class="cost-results">
            <div>Daily: <strong id="cost-daily">—</strong></div>
            <div>Monthly: <strong id="cost-monthly">—</strong></div>
            <pre id="cost-breakdown" class="mono small"></pre>
          </div>
        </div>
      </details>

      <details>
        <summary><strong>Profiles</strong></summary>
        <div class="profiles">
          <button id="btn-scan-hw">Scan Hardware</button>
          <pre id="scan-out" class="mono small"></pre>
          <label>Budget ($/mo) <input type="number" id="budget" value="0" /></label>
          <button id="btn-apply-profile">Apply Suggested Profile</button>
          <hr/>
          <label>Save As <input type="text" id="profile-name" placeholder="my-local-zero-cost" /></label>
          <button id="btn-save-profile">Save Profile</button>
          <div class="profile-list">
            <h4>Saved Profiles</h4>
            <ul id="profiles-ul"></ul>
          </div>
        </div>
      </details>

      <details>
        <summary><strong>Secrets Ingest</strong></summary>
        <div class="secrets">
          <div id="dropzone" class="dropzone" tabindex="0">Drop .env/.txt/.md here or click to upload</div>
          <label><input type="checkbox" id="persist-secrets" /> Persist to defaults.json</label>
          <pre id="ingest-out" class="mono small"></pre>
          <input type="file" id="file-input" accept=".env,.txt,.md" hidden />
        </div>
      </details>
    </aside>
  </main>

  <script src="app.js"></script>
</body>
</html>
```

---

## File: `gui/style.css` (minimal, dark, responsive)

```css
:root {
  --bg: #0b0d12; --fg: #e9eef6; --muted: #9fb1c7; --accent: #3C6DF0; --panel: #121624; --line: #1f2433;
}
* { box-sizing: border-box; }
html, body { height: 100%; }
body { margin: 0; background: var(--bg); color: var(--fg); font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }

.topbar { display:flex; align-items:center; justify-content:space-between; padding: 12px 16px; border-bottom:1px solid var(--line); background: var(--panel); }
.topbar h1 { font-size: 18px; margin: 0; }
.top-actions button { background: var(--accent); color:#fff; border:none; padding:6px 10px; border-radius:8px; cursor:pointer; }

.layout { display: grid; grid-template-columns: 1fr 360px; gap: 0; height: calc(100vh - 54px); }
.content { padding: 0; border-right: 1px solid var(--line); display:flex; flex-direction:column; }
.sidepanel { padding: 12px; overflow:auto; }

.tab-bar { background: var(--panel); padding: 8px; border-bottom:1px solid var(--line); }
.tab-bar button { background: #1a2032; color: var(--fg); border: 1px solid var(--line); padding: 8px 12px; border-radius: 8px; cursor: pointer; margin-right: 6px; }
.tab-bar button.active { background: var(--accent); }

.tab-content { display:none; padding: 12px; height: 100%; overflow: auto; }
.tab-content.active { display:block; }

#calc-frame { width: 100%; height: calc(100vh - 140px); border: none; background: #0a0a0a; }

form#config-form label { display:flex; gap:8px; align-items:center; margin: 8px 0; }
details { background:#0f1424; border:1px solid var(--line); border-radius:10px; padding: 8px 10px; margin: 10px 0; }
details summary { cursor:pointer; color: var(--muted); }

.repo-grid fieldset { border:1px dashed var(--line); border-radius:8px; padding:8px; margin:8px 0; }
.form-actions { margin-top: 10px; }
.form-actions button { background: var(--accent); color:#fff; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; }

.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
.small { font-size: 12px; color: var(--muted); }

.dropzone { border: 2px dashed var(--accent); padding: 12px; border-radius: 10px; text-align:center; cursor: pointer; margin-top: 8px; }
.cost-results { margin-top: 8px; }

@media (max-width: 1100px) {
  .layout { grid-template-columns: 1fr; }
  .sidepanel { border-top:1px solid var(--line); height: 52vh; }
  #calc-frame { height: 42vh; }
}
```

---

## File: `gui/app.js` (all handlers stubbed and wired)

```javascript
// AGRO GUI app.js (stubs fully defined)
(function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const state = {
    prices: null,
    config: null,
    profiles: [],
    defaultProfile: null,
  };

  // ---------------- Tabs ----------------
  function switchTab(n) {
    $$('#tab-content-1, #tab-content-2').forEach((el) => el.classList.remove('active'));
    $$('#tab-btn-1, #tab-btn-2').forEach((el) => el.classList.remove('active'));
    $(`#tab-content-${n}`).classList.add('active');
    $(`#tab-btn-${n}`).classList.add('active');
  }

  function bindTabs() {
    $('#tab-btn-1').addEventListener('click', () => switchTab(1));
    $('#tab-btn-2').addEventListener('click', () => switchTab(2));
  }

  // ---------------- Health ----------------
  async function checkHealth() {
    try {
      const r = await fetch('/api/health');
      const d = await r.json();
      $('#health-status').textContent = d.ok ? `OK @ ${d.ts}` : 'Not OK';
    } catch (e) {
      $('#health-status').textContent = 'Error';
    }
  }

  // ---------------- Config ----------------
  async function loadConfig() {
    const r = await fetch('/api/config');
    const d = await r.json();
    state.config = d;
    populateConfigForm(d);
  }

  function populateConfigForm(data) {
    const env = data.env || {};
    // Fill known fields
    Object.entries(env).forEach(([k, v]) => {
      const f = document.querySelector(`[name="${k}"]`);
      if (!f) return;
      if (f.type === 'checkbox') f.checked = String(v).toLowerCase() === 'true';
      else f.value = v;
    });

    // Repo select
    const sel = $('#repo-select');
    sel.innerHTML = '';
    (data.repos || []).forEach((r) => {
      const opt = document.createElement('option');
      opt.value = r.name;
      opt.textContent = r.name;
      sel.appendChild(opt);
    });
    if (env.REPO) sel.value = env.REPO; else if (data.default_repo) sel.value = data.default_repo;

    // Repos metadata editor
    const rs = $('#repos-section');
    rs.innerHTML = '';
    (data.repos || []).forEach((repo) => {
      const fs = document.createElement('fieldset');
      const legend = document.createElement('legend'); legend.textContent = `Repo: ${repo.name}`; fs.appendChild(legend);
      fs.insertAdjacentHTML('beforeend', `
        <label>Path <input type="text" name="repo_path_${repo.name}" value="${repo.path || ''}"></label>
        <label>Keywords <input type="text" name="repo_keywords_${repo.name}" value="${(repo.keywords||[]).join(',')}"></label>
        <label>Path Boosts <input type="text" name="repo_pathboosts_${repo.name}" value="${(repo.path_boosts||[]).join(',')}"></label>
        <label>Layer Bonuses (JSON)
          <textarea name="repo_layerbonuses_${repo.name}" rows="3">${repo.layer_bonuses ? JSON.stringify(repo.layer_bonuses) : ''}</textarea>
        </label>
      `);
      rs.appendChild(fs);
    });
  }

  function gatherConfigForm() {
    const form = $('#config-form');
    const fd = new FormData(form);
    const update = { env: {}, repos: [] };

    for (const [key, val] of fd.entries()) {
      if (key.startsWith('repo_')) {
        const parts = key.split('_');
        const field = parts[1];
        const name = parts.slice(2).join('_');
        let r = update.repos.find((x) => x.name === name);
        if (!r) { r = { name }; update.repos.push(r); }
        if (field === 'keywords' || field === 'pathboosts') {
          r[field === 'pathboosts' ? 'path_boosts' : 'keywords'] = String(val).split(',').map(s => s.trim()).filter(Boolean);
        } else if (field === 'layerbonuses') {
          try { r['layer_bonuses'] = val ? JSON.parse(val) : {}; } catch (e) { alert(`Invalid JSON for ${name} layer_bonuses`); return null; }
        } else if (field === 'path') {
          r['path'] = String(val);
        }
      } else if (key === 'LANGCHAIN_TRACING_V2') {
        update.env[key] = fd.get(key) ? true : false;
      } else {
        update.env[key] = String(val);
      }
    }
    return update;
  }

  async function saveConfig() {
    const body = gatherConfigForm();
    if (!body) return;
    const r = await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { alert('Save failed'); return; }
    alert('Configuration updated.');
  }

  // ---------------- Prices & Cost ----------------
  async function loadPrices() {
    const r = await fetch('/api/prices');
    state.prices = await r.json();
  }

  function buildCostPayload() {
    const payload = {
      provider: $('#cost-provider').value.trim(),
      model: $('#cost-model').value.trim(),
      tokens_in: parseInt($('#cost-in').value, 10) || 0,
      tokens_out: parseInt($('#cost-out').value, 10) || 0,
      embeds: parseInt($('#cost-embeds').value, 10) || 0,
      reranks: parseInt($('#cost-rerank').value, 10) || 0,
      requests_per_day: parseInt($('#cost-rpd').value, 10) || 0,
    };
    const kwh = $('#cost-kwh').value; const watts = $('#cost-watts').value; const hours = $('#cost-hours').value;
    if (kwh) payload.kwh_rate = parseFloat(kwh);
    if (watts) payload.watts = parseInt(watts, 10);
    if (hours) payload.hours_per_day = parseFloat(hours);
    return payload;
  }

  async function estimateCost() {
    const payload = buildCostPayload();
    const r = await fetch('/api/cost/estimate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const d = await r.json();
    $('#cost-daily').textContent = `$${d.daily.toFixed(4)}`;
    $('#cost-monthly').textContent = `$${d.monthly.toFixed(2)}`;
    $('#cost-breakdown').textContent = JSON.stringify(d.breakdown, null, 2);
  }

  // ---------------- Hardware Scan & Profiles ----------------
  async function scanHardware() {
    const r = await fetch('/api/scan-hw', { method: 'POST' });
    const d = await r.json();
    $('#scan-out').textContent = JSON.stringify(d, null, 2);
    return d;
  }

  function proposeProfile(scan, budget) {
    // Extremely simple starter policy; refine as needed.
    const hasLocal = scan?.runtimes?.ollama || scan?.runtimes?.coreml;
    const prof = {
      GEN_MODEL: hasLocal && budget === 0 ? 'qwen3-coder:14b' : 'gpt-4o-mini',
      EMBEDDING_TYPE: hasLocal && budget === 0 ? 'local' : 'openai',
      RERANK_BACKEND: hasLocal && budget === 0 ? 'local' : 'cohere',
      MQ_REWRITES: budget > 50 ? '6' : '3',
      TOPK_SPARSE: '75',
      TOPK_DENSE: '75',
      FINAL_K: budget > 50 ? '20' : '10',
      HYDRATION_MODE: 'lazy',
    };
    return prof;
  }

  async function applyProfile() {
    const scan = JSON.parse($('#scan-out').textContent || '{}');
    const budget = parseFloat($('#budget').value || '0');
    const prof = proposeProfile(scan, budget);
    const r = await fetch('/api/profiles/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile: prof }) });
    const d = await r.json();
    alert(`Profile applied: ${d.applied_keys.join(', ')}`);
    await loadConfig();
  }

  async function loadProfiles() {
    const r = await fetch('/api/profiles');
    const d = await r.json();
    state.profiles = d.profiles || [];
    state.defaultProfile = d.default || null;
    const ul = $('#profiles-ul');
    ul.innerHTML = '';
    state.profiles.forEach((name) => {
      const li = document.createElement('li');
      li.textContent = name;
      ul.appendChild(li);
    });
  }

  async function saveProfile() {
    const name = $('#profile-name').value.trim();
    if (!name) { alert('Enter a profile name'); return; }
    const scan = JSON.parse($('#scan-out').textContent || '{}');
    const budget = parseFloat($('#budget').value || '0');
    const prof = proposeProfile(scan, budget);
    const r = await fetch('/api/profiles/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, profile: prof }) });
    if (!r.ok) { alert('Save failed'); return; }
    await loadProfiles();
    alert(`Saved profile: ${name}`);
  }

  // ---------------- Secrets Ingest (DnD) ----------------
  function bindDropzone() {
    const dz = $('#dropzone');
    const fi = $('#file-input');

    function openPicker() { fi.click(); }
    dz.addEventListener('click', openPicker);
    dz.addEventListener('keypress', (e) => { if (e.key === 'Enter' || e.key === ' ') openPicker(); });

    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('drag'); });
    dz.addEventListener('dragleave', (e) => { dz.classList.remove('drag'); });
    dz.addEventListener('drop', async (e) => {
      e.preventDefault(); dz.classList.remove('drag');
      const file = e.dataTransfer.files?.[0]; if (file) await ingestFile(file);
    });

    fi.addEventListener('change', async (e) => {
      const file = e.target.files?.[0]; if (file) await ingestFile(file);
      fi.value = '';
    });
  }

  async function ingestFile(file) {
    const persist = $('#persist-secrets').checked;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('persist', String(persist));
    const r = await fetch('/api/secrets/ingest', { method: 'POST', body: fd });
    const d = await r.json();
    $('#ingest-out').textContent = JSON.stringify(d, null, 2);
    await loadConfig();
  }

  // ---------------- Bindings ----------------
  function bindActions() {
    $('#btn-health').addEventListener('click', checkHealth);
    $('#save-btn').addEventListener('click', saveConfig);
    $('#btn-estimate').addEventListener('click', estimateCost);
    $('#btn-scan-hw').addEventListener('click', scanHardware);
    $('#btn-apply-profile').addEventListener('click', applyProfile);
    $('#btn-save-profile').addEventListener('click', saveProfile);
  }

  // ---------------- Init ----------------
  async function init() {
    bindTabs();
    bindActions();
    bindDropzone();
    await Promise.all([loadPrices(), loadConfig(), loadProfiles()]);
    await checkHealth();
  }

  window.addEventListener('DOMContentLoaded', init);
})();
```

---

## File: `gui/prices.json` (example starter you can update weekly)

```json
{
  "last_updated": "2025-10-10",
  "currency": "USD",
  "models": [
    {
      "provider": "openai",
      "family": "gpt-4o-mini",
      "model": "gpt-4o-mini",
      "unit": "1k_tokens",
      "input_per_1k": 0.005,
      "output_per_1k": 0.015,
      "embed_per_1k": 0.0001,
      "rerank_per_1k": 0.0,
      "notes": "EXAMPLE"
    },
    {
      "provider": "cohere",
      "family": "rerank-english-v3.0",
      "model": "rerank-english-v3.0",
      "unit": "1k_tokens",
      "input_per_1k": 0.0,
      "output_per_1k": 0.0,
      "embed_per_1k": 0.0,
      "rerank_per_1k": 0.30,
      "notes": "EXAMPLE"
    },
    {
      "provider": "voyage",
      "family": "voyage-3-large",
      "model": "voyage-3-large",
      "unit": "1k_tokens",
      "input_per_1k": 0.0,
      "output_per_1k": 0.0,
      "embed_per_1k": 0.12,
      "rerank_per_1k": 0.0,
      "notes": "EXAMPLE"
    },
    {
      "provider": "local",
      "family": "qwen3-coder",
      "model": "qwen3-coder:14b",
      "unit": "request",
      "per_request": 0.0,
      "notes": "Local inference assumed $0; electricity optional"
    }
  ]
}
```

---

## Optional Sample: `gui/profiles/examples/min_local.json`

```json
{
  "name": "min_local",
  "profile": {
    "GEN_MODEL": "qwen3-coder:14b",
    "EMBEDDING_TYPE": "local",
    "RERANK_BACKEND": "local",
    "MQ_REWRITES": "3",
    "TOPK_SPARSE": "75",
    "TOPK_DENSE": "75",
    "FINAL_K": "10",
    "HYDRATION_MODE": "lazy"
  }
}
```

---

## Quick directory scaffold (bundled, safe to paste)

```bash
mkdir -p gui/profiles/examples && \
  [ -f gui/index.html ] || echo "<!-- paste canvas index.html here -->" > gui/index.html && \
  [ -f gui/style.css ] || echo "/* paste canvas style.css here */" > gui/style.css && \
  [ -f gui/app.js ] || echo "// paste canvas app.js here" > gui/app.js && \
  [ -f gui/prices.json ] || cat > gui/prices.json <<'JSON'
{
  "last_updated": "2025-10-10",
  "currency": "USD",
  "models": [
    {"provider": "openai", "family": "gpt-4o-mini", "model": "gpt-4o-mini", "unit": "1k_tokens", "input_per_1k": 0.005, "output_per_1k": 0.015, "embed_per_1k": 0.0001, "rerank_per_1k": 0.0, "notes": "EXAMPLE"},
    {"provider": "cohere", "family": "rerank-english-v3.0", "model": "rerank-english-v3.0", "unit": "1k_tokens", "input_per_1k": 0.0, "output_per_1k": 0.0, "embed_per_1k": 0.0, "rerank_per_1k": 0.30, "notes": "EXAMPLE"},
    {"provider": "voyage", "family": "voyage-3-large", "model": "voyage-3-large", "unit": "1k_tokens", "input_per_1k": 0.0, "output_per_1k": 0.0, "embed_per_1k": 0.12, "rerank_per_1k": 0.0, "notes": "EXAMPLE"},
    {"provider": "local", "family": "qwen3-coder", "model": "qwen3-coder:14b", "unit": "request", "per_request": 0.0, "notes": "Local inference assumed $0; electricity optional"}
  ]
}
JSON
```

---

### Notes for the junior dev
- All functions/handlers are **defined**; replace TODO comments with real logic.
- Keep `prices.json` fresh via your updater; these numbers are examples for testing math.
- `secrets/ingest` accepts `.env|.txt|.md`, canonicalizes with regex maps, and updates `os.environ` immediately.
- Profiles are plain JSON files in `gui/profiles/`. Use `apply` to set env, `save` to store.
- The UI is accessible: keyboard on dropzone, dark theme, and small monospace outputs.
```



---

# System-Aware Auto‑Tuning (Local) — Stubs You Can Fill In

> Purpose: adapt AGRO’s RAG knobs to **current machine load** and **time windows** (business hours vs off‑hours) without any cloud. Everything is local. No ellipses or missing functions; TODOs are comments only.

## Overview
- A small **autoscaler daemon** (`autoscaler.py`) samples CPU/RAM (and GPU if available), reads a local policy (`gui/autotune_policy.json`), decides a **mode** (ECO / BALANCED / TURBO), and **applies** it by calling the existing `/api/config`.
- New backend endpoints expose **autotune status** and accept **enable/disable** from the GUI.
- The GUI gets a tiny **Auto‑Tune** section (enable toggle, show current mode, edit time windows quickly).

---

## File: `autoscaler.py` (local daemon, no cloud)
```python
#!/usr/bin/env python3
"""
AGRO Local Auto‑Tuner (stub):
- Polls system metrics
- Chooses a mode based on policy + hysteresis
- Applies env deltas to AGRO via /api/config

Run:
  python autoscaler.py --host http://127.0.0.1:8012 --interval 15
Dependencies: psutil (pip install psutil)
"""
from __future__ import annotations
import time, json, argparse, platform, subprocess, shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Any, Optional

import psutil
import requests

GUI_DIR = Path(__file__).resolve().parent / "gui"
POLICY_PATH = GUI_DIR / "autotune_policy.json"

@dataclass
class Metrics:
    cpu_pct: float
    mem_free_pct: float
    gpu_busy_pct: Optional[float] = None

@dataclass
class Mode:
    name: str
    env: Dict[str, Any]

DEFAULT_POLICY = {
  "sample_interval_sec": 15,
  "cooldown_sec": 120,
  "business_hours": {"start": 9, "end": 18},  # local time, 24h clock
  "thresholds": {
    "cpu_high": 75,    # %
    "cpu_low": 55,     # % (for hysteresis)
    "mem_free_low": 20 # % free
  },
  "modes": {
    "ECO": {
      "env": {"HYDRATION_MODE": "none", "MQ_REWRITES": "2", "FINAL_K": "6", "TOPK_DENSE": "40", "TOPK_SPARSE": "40", "RERANK_BACKEND": "local"}
    },
    "BALANCED": {
      "env": {"HYDRATION_MODE": "lazy", "MQ_REWRITES": "4", "FINAL_K": "10", "TOPK_DENSE": "75", "TOPK_SPARSE": "75"}
    },
    "TURBO": {
      "env": {"HYDRATION_MODE": "lazy", "MQ_REWRITES": "6", "FINAL_K": "20", "TOPK_DENSE": "120", "TOPK_SPARSE": "120"}
    }
  },
  "off_hours_prefer": "TURBO"  # off-hours default when resources allow
}

class AutoTuner:
    def __init__(self, host: str):
        self.host = host.rstrip('/')
        self.policy = self._load_policy()
        self.last_mode: Optional[str] = None
        self.last_apply_ts: float = 0.0
        self.hi_latched = False  # hysteresis state

    def _load_policy(self) -> Dict[str, Any]:
        if POLICY_PATH.exists():
            try:
                return json.loads(POLICY_PATH.read_text())
            except Exception:
                pass
        return DEFAULT_POLICY

    def _gpu_busy_pct(self) -> Optional[float]:
        # Linux/NVIDIA: try nvidia-smi
        try:
            if shutil.which("nvidia-smi"):
                out = subprocess.check_output(["nvidia-smi", "--query-gpu=utilization.gpu", "--format=csv,noheader,nounits"]).decode().strip()
                vals = [int(x) for x in out.splitlines() if x.strip().isdigit()]
                if vals:
                    return float(sum(vals) / len(vals))
        except Exception:
            return None
        return None

    def sample_metrics(self) -> Metrics:
        cpu = psutil.cpu_percent(interval=None)
        mem = psutil.virtual_memory()
        gpu = self._gpu_busy_pct()
        return Metrics(cpu_pct=float(cpu), mem_free_pct=float(mem.available * 100.0 / mem.total), gpu_busy_pct=gpu)

    def _is_business_hours(self) -> bool:
        import datetime as _dt
        now = _dt.datetime.now()
        bh = self.policy.get("business_hours", {})
        start = int(bh.get("start", 9))
        end = int(bh.get("end", 18))
        return start <= now.hour < end

    def decide_mode(self, m: Metrics) -> str:
        t = self.policy.get("thresholds", {})
        cpu_hi = float(t.get("cpu_high", 75))
        cpu_lo = float(t.get("cpu_low", 55))
        mem_low = float(t.get("mem_free_low", 20))

        if m.mem_free_pct <= mem_low or m.cpu_pct >= cpu_hi:
            self.hi_latched = True
            return "ECO"
        # fall back to BALANCED once below the low threshold
        if self.hi_latched and (m.cpu_pct > cpu_lo):
            return "ECO"
        self.hi_latched = False

        # off-hours prefers TURBO if we have headroom
        if not self._is_business_hours():
            return self.policy.get("off_hours_prefer", "TURBO")
        return "BALANCED"

    def apply_mode(self, mode_name: str) -> bool:
        modes = self.policy.get("modes", {})
        if mode_name not in modes:
            return False
        env = modes[mode_name].get("env", {})
        body = {"env": env, "repos": []}
        try:
            r = requests.post(f"{self.host}/api/config", json=body, timeout=5)
            r.raise_for_status()
            self.last_mode = mode_name
            self.last_apply_ts = time.time()
            # Also update status for GUI
            try:
                requests.post(f"{self.host}/api/autotune/status", json={"enabled": True, "current_mode": mode_name}, timeout=3)
            except Exception:
                pass
            return True
        except Exception:
            return False

    def loop(self, interval: int) -> None:
        cooldown = int(self.policy.get("cooldown_sec", 120))
        while True:
            m = self.sample_metrics()
            mode = self.decide_mode(m)
            now = time.time()
            should_apply = (self.last_mode != mode) and (now - self.last_apply_ts >= cooldown)
            if should_apply:
                self.apply_mode(mode)
            time.sleep(max(1, interval))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--host', default='http://127.0.0.1:8012')
    ap.add_argument('--interval', type=int, default=15)
    args = ap.parse_args()

    tuner = AutoTuner(args.host)
    tuner.loop(args.interval)
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
```

---

## File: `gui/autotune_policy.json` (editable thresholds & modes)
```json
{
  "sample_interval_sec": 15,
  "cooldown_sec": 120,
  "business_hours": {"start": 9, "end": 18},
  "thresholds": {"cpu_high": 75, "cpu_low": 55, "mem_free_low": 20},
  "modes": {
    "ECO": {"env": {"HYDRATION_MODE": "none", "MQ_REWRITES": "2", "FINAL_K": "6", "TOPK_DENSE": "40", "TOPK_SPARSE": "40", "RERANK_BACKEND": "local"}},
    "BALANCED": {"env": {"HYDRATION_MODE": "lazy", "MQ_REWRITES": "4", "FINAL_K": "10", "TOPK_DENSE": "75", "TOPK_SPARSE": "75"}},
    "TURBO": {"env": {"HYDRATION_MODE": "lazy", "MQ_REWRITES": "6", "FINAL_K": "20", "TOPK_DENSE": "120", "TOPK_SPARSE": "120"}}
  },
  "off_hours_prefer": "TURBO"
}
```

---

## Backend additions (stubs): `serve_rag.py`
```python
# Add near other imports
from typing import Optional
from pydantic import BaseModel

# Autotune status held in memory; optional persistence later
_AUTOTUNE = {"enabled": False, "current_mode": None, "last_change": None}

class AutoTuneStatus(BaseModel):
    enabled: bool
    current_mode: Optional[str] = None

@app.get("/api/autotune/status")
def autotune_status() -> Dict[str, Any]:
    return dict(_AUTOTUNE)

@app.post("/api/autotune/status")
def autotune_enable(body: AutoTuneStatus) -> Dict[str, Any]:
    import time as _t
    _AUTOTUNE["enabled"] = bool(body.enabled)
    _AUTOTUNE["current_mode"] = body.current_mode
    _AUTOTUNE["last_change"] = _t.time()
    return {"ok": True, **_AUTOTUNE}
```

---

## UI additions (stubs): `gui/index.html` (add under sidepanel)
```html
<details>
  <summary><strong>Auto‑Tune</strong></summary>
  <div class="autotune">
    <label><input type="checkbox" id="autotune-enabled" /> Enable Auto‑Tune</label>
    <div>Current Mode: <strong id="autotune-mode">—</strong></div>
    <div>Business Hours: 9–18 (edit in gui/autotune_policy.json)</div>
    <button id="btn-autotune-refresh">Refresh Status</button>
  </div>
</details>
```

### UI JS: `gui/app.js` (handlers)
```javascript
async function refreshAutotune() {
  const r = await fetch('/api/autotune/status');
  const d = await r.json();
  $('#autotune-enabled').checked = !!d.enabled;
  $('#autotune-mode').textContent = d.current_mode || '—';
}

async function setAutotuneEnabled() {
  const enabled = $('#autotune-enabled').checked;
  await fetch('/api/autotune/status', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({enabled, current_mode: null})});
  await refreshAutotune();
}

// in bindActions()
$('#btn-autotune-refresh').addEventListener('click', refreshAutotune);
$('#autotune-enabled').addEventListener('change', setAutotuneEnabled);

// in init()
await refreshAutotune();
```

---

## One‑liner to run the tuner (bundled, safe to paste)
```bash
python3 -m pip install --upgrade psutil requests && \
python3 autoscaler.py --host http://127.0.0.1:8012 --interval 15
```

---

## Deep Research Prompt (to refine the algorithm scientifically)
```markdown
You are designing a **local RAG auto‑tuner** that adapts `MQ_REWRITES`, `TOPK_{DENSE,SPARSE}`, `FINAL_K`, `HYDRATION_MODE`, and `RERANK_BACKEND/MODEL` based on **system load** and **time windows**.

### Deliverables
1) **throughput_table.json** — measured or well‑cited estimates of CPU/GPU throughput and RAM usage for:
   - Local rerankers (e.g., MiniLM, bge‑reranker‑base, XLM‑R small) — tokens/sec and mem footprint.
   - Embedding models (bge‑small/large, nomic) — vectors/sec, RAM.
   - GEN small/medium local models (qwen3‑coder 7–14B, Llama‑3.x 8B) — tokens/sec, RAM/VRAM.
2) **latency_cost_model.md** — equations that map `MQ_REWRITES` and `FINAL_K` to added latency and RAM pressure; include effect of `HYDRATION_MODE`.
3) **policy_rules.json** — recommended thresholds and hysteresis values (CPU %, free RAM %, optional GPU util) → modes {ECO,BALANCED,TURBO} with env deltas.
4) **bench_protocol.md** — a repeatable 10‑minute local bench to collect the above on macOS (CoreML/ANE), Linux CPU‑only, and NVIDIA GPUs. Include power draw ranges for an electricity estimator.

### Constraints
- Prefer primary sources (model repos, official docs); date every price/metric.
- Where empirical data is missing, provide conservative ranges and label them as estimates.
- Output valid JSON for tables/rules. Avoid placeholders.
```



---

# Tri‑Candidate Cost Selection + Pro Gating + Compatibility Monitor (Enterprise) — Stubs

The following adds: (1) **tri‑candidate** cost selection; (2) **Auto‑Tune behind Pro** flag; (3) **Compatibility Monitor** (Enterprise) backend/UI; (4) a light **Upgrades** page to showcase Pro/Ent features.

## 1) Frontend — Tri‑Candidate selection (add to `gui/index.html` side panel)

Add a tiny results box under the Cost Calculator section:
```html
<div class="tri-results">
  <h4>Top‑3 Plans (auto‑picked)</h4>
  <pre id="tri-out" class="mono small">(run an estimate)</pre>
</div>
<button id="btn-tri-choose">Auto‑Pick & Apply</button>
```

## 1b) Frontend — `gui/app.js` (tri‑candidate logic)
```javascript
function generateCandidates(scan, budget) {
  const hasLocal = !!(scan?.runtimes?.ollama || scan?.runtimes?.coreml);
  const mem = (scan?.info?.mem_gb || 8);
  // Three baseline candidates; adjust by budget + RAM
  const local = {
    name: 'local',
    env: {
      GEN_MODEL: hasLocal ? 'qwen3-coder:14b' : 'gpt-4o-mini',
      EMBEDDING_TYPE: hasLocal ? 'local' : 'openai',
      RERANK_BACKEND: hasLocal ? 'local' : 'cohere',
      MQ_REWRITES: mem >= 32 ? '4' : '3',
      FINAL_K: mem >= 32 ? '10' : '8',
      TOPK_DENSE: '60', TOPK_SPARSE: '60', HYDRATION_MODE: 'lazy'
    }
  };
  const cheapCloud = {
    name: 'cheap_cloud',
    env: {
      GEN_MODEL: 'gpt-4o-mini', EMBEDDING_TYPE: 'openai', RERANK_BACKEND: 'local',
      MQ_REWRITES: budget > 25 ? '4' : '3', FINAL_K: budget > 25 ? '10' : '8',
      TOPK_DENSE: '75', TOPK_SPARSE: '75', HYDRATION_MODE: 'lazy'
    }
  };
  const premium = {
    name: 'premium',
    env: {
      GEN_MODEL: 'gpt-4o-mini', EMBEDDING_TYPE: 'openai', RERANK_BACKEND: 'cohere',
      MQ_REWRITES: budget > 100 ? '6' : '4', FINAL_K: budget > 100 ? '20' : '12',
      TOPK_DENSE: '120', TOPK_SPARSE: '120', HYDRATION_MODE: 'lazy'
    }
  };
  return [local, cheapCloud, premium];
}

async function triCostSelect() {
  // Use current Cost panel inputs for tokens and rpd
  const base = {
    tokens_in: parseInt($('#cost-in').value || '0', 10),
    tokens_out: parseInt($('#cost-out').value || '0', 10),
    embeds: parseInt($('#cost-embeds').value || '0', 10),
    reranks: parseInt($('#cost-rerank').value || '0', 10),
    requests_per_day: parseInt($('#cost-rpd').value || '0', 10)
  };
  const budget = parseFloat($('#budget').value || '0');
  const scan = JSON.parse($('#scan-out').textContent || '{}');
  const cands = generateCandidates(scan, budget);

  const rows = [];
  for (const c of cands) {
    // Decide provider/model from env for cost call
    const provider = (c.env.GEN_MODEL || '').match(/:/) ? 'local' : 'openai';
    const model = c.env.GEN_MODEL || 'gpt-4o-mini';
    const payload = { provider, model, ...base };
    // local electricity optional if provider==local
    if (provider === 'local') {
      const kwh = $('#cost-kwh').value; const watts = $('#cost-watts').value; const hours = $('#cost-hours').value;
      if (kwh) payload.kwh_rate = parseFloat(kwh);
      if (watts) payload.watts = parseInt(watts, 10);
      if (hours) payload.hours_per_day = parseFloat(hours);
    }
    // Call cost API
    const r = await fetch('/api/cost/estimate', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const d = await r.json();
    rows.push({ name: c.name, env: c.env, provider, model, daily: d.daily, monthly: d.monthly, breakdown: d.breakdown });
  }
  // Rank by monthly (ascending), then prefer cheaper that meet budget if budget>0
  const ranked = rows.sort((a,b) => a.monthly - b.monthly);
  let winner = ranked[0];
  if (budget > 0) {
    const within = ranked.filter(r => r.monthly <= budget);
    if (within.length) winner = within[0];
  }
  $('#tri-out').textContent = JSON.stringify({ winner, ranked }, null, 2);
  return { winner, ranked };
}

async function triChooseAndApply() {
  const { winner } = await triCostSelect();
  const r = await fetch('/api/profiles/apply', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ profile: winner.env }) });
  if (!r.ok) { alert('Apply failed'); return; }
  alert(`Applied plan: ${winner.name} ($${winner.monthly.toFixed(2)}/mo)`);
  await loadConfig();
}

// in bindActions()
$('#btn-tri-choose').addEventListener('click', triChooseAndApply);
```

## 2) Pro flag — gate Auto‑Tune (backend)

Add to `feature_flags.py` (already suggested earlier):
```python
# feature_flags.py
import os

def edition() -> str:
    return os.getenv("AGRO_EDITION", "oss").lower()

def is_pro() -> bool:
    return edition() in ("pro", "enterprise")

def is_enterprise() -> bool:
    return edition() == "enterprise"
```

Wrap Auto‑Tune endpoints in `serve_rag.py`:
```python
from feature_flags import is_pro

@app.get("/api/autotune/status")
def autotune_status() -> Dict[str, Any]:
    if not is_pro():
        raise HTTPException(status_code=402, detail="Pro feature")
    return dict(_AUTOTUNE)

@app.post("/api/autotune/status")
def autotune_enable(body: AutoTuneStatus) -> Dict[str, Any]:
    if not is_pro():
        raise HTTPException(status_code=402, detail="Pro feature")
    import time as _t
    _AUTOTUNE["enabled"] = bool(body.enabled)
    _AUTOTUNE["current_mode"] = body.current_mode
    _AUTOTUNE["last_change"] = _t.time()
    return {"ok": True, **_AUTOTUNE}
```

## 3) Enterprise Compatibility Monitor (backend stubs)

**Rule format** (`compat_rules.json`):
```json
{
  "rules": [
    {
      "id": "macos-electron-compat-001",
      "title": "macOS >= 15.0 issues with Electron < 30",
      "severity": "high",
      "conditions": [
        {"fact": "os.name", "op": "=", "value": "macOS"},
        {"fact": "os.version", "op": ">=", "value": "15.0"},
        {"fact": "pkg.electron.version", "op": "<", "value": "30.0.0"}
      ],
      "message": "Known crash/regression affecting Electron apps.",
      "workaround": "Upgrade Electron to >=30 or hold OS update.",
      "refs": ["https://example.com/advisory"]
    }
  ]
}
```

**Endpoints** (add to `serve_rag.py`):
```python
from feature_flags import is_enterprise

_COMPAT = {"enabled": False, "every_hours": 6, "last_scan": None, "alerts": []}
_RULES_PATH = ROOT / "compat_rules.json"

@app.get("/api/compat/config")
def compat_config() -> Dict[str, Any]:
    if not is_enterprise():
        raise HTTPException(status_code=402, detail="Enterprise feature")
    rules = _read_json(_RULES_PATH, {"rules": []})
    return {"monitor": _COMPAT, "rules": rules}

@app.post("/api/compat/config")
def compat_set_config(enabled: bool = True, every_hours: int = 6) -> Dict[str, Any]:
    if not is_enterprise():
        raise HTTPException(status_code=402, detail="Enterprise feature")
    _COMPAT["enabled"] = bool(enabled)
    _COMPAT["every_hours"] = int(every_hours)
    return {"ok": True, **_COMPAT}

@app.post("/api/compat/test")
def compat_test(payload: Dict[str, Any]) -> Dict[str, Any]:
    if not is_enterprise():
        raise HTTPException(status_code=402, detail="Enterprise feature")
    # payload may include { os: {name, version}, pkgs: {electron: "29.1.0", cuda: "12.5"}, env: {...} }
    rules = _read_json(_RULES_PATH, {"rules": []}).get("rules", [])
    hits = []
    for r in rules:
        if _rule_matches(r, payload):
            hits.append({"id": r.get("id"), "title": r.get("title"), "message": r.get("message"), "severity": r.get("severity"), "workaround": r.get("workaround"), "refs": r.get("refs", [])})
    return {"hits": hits}

@app.get("/api/compat/alerts")
def compat_alerts() -> Dict[str, Any]:
    if not is_enterprise():
        raise HTTPException(status_code=402, detail="Enterprise feature")
    return {"alerts": list(_COMPAT.get("alerts", []))}

# --- helpers ---

def _cmp_versions(a: str, b: str) -> int:
    import packaging.version as V
    va, vb = V.parse(a), V.parse(b)
    return (va > vb) - (va < vb)

def _rule_matches(rule: Dict[str, Any], payload: Dict[str, Any]) -> bool:
    def resolve(fact: str) -> Optional[str]:
        # os.name, os.version, pkg.<name>.version, env.<KEY>
        if fact == "os.name":
            return str(payload.get("os", {}).get("name"))
        if fact == "os.version":
            return str(payload.get("os", {}).get("version"))
        if fact.startswith("pkg.") and fact.endswith(".version"):
            name = fact.split(".")[1]
            return str(payload.get("pkgs", {}).get(name))
        if fact.startswith("env."):
            key = fact.split(".", 1)[1]
            return str(payload.get("env", {}).get(key))
        return None

    for cond in rule.get("conditions", []):
        fact, op, val = cond.get("fact"), cond.get("op"), cond.get("value")
        cur = resolve(fact)
        if cur is None:
            return False
        if op == "=":
            if str(cur) != str(val):
                return False
        elif op in (">", ">=", "<", "<="):
            # version compare
            c = _cmp_versions(str(cur), str(val))
            if op == ">" and not (c > 0): return False
            if op == ">=" and not (c >= 0): return False
            if op == "<" and not (c < 0): return False
            if op == "<=" and not (c <= 0): return False
        else:
            return False
    return True
```

**Watcher daemon stub** (`watchdog.py`):
```python
#!/usr/bin/env python3
"""Enterprise Compatibility Watchdog (stub)
- Every N hours: fetch provider feeds (GitHub issues, release notes) — TODO: implement fetchers
- Update compat_rules.json or _COMPAT.alerts when a known breaking change appears
- POST /api/compat/alerts (future) or write to disk; integrate email/Slack/Pushover later
"""
import time, json, argparse
from pathlib import Path
import requests

API = "http://127.0.0.1:8012"
RULES = Path("compat_rules.json")

FETCH_TARGETS = [
  {"name": "electron", "type": "github_issues", "repo": "electron/electron"},
  {"name": "nvidia-cuda", "type": "release_notes", "url": "https://developer.nvidia.com/cuda-toolkit"}
]

def scan_once():
  # TODO: implement real fetchers; for now, no‑op
  return []

def main():
  ap = argparse.ArgumentParser()
  ap.add_argument('--every', type=int, default=6)
  args = ap.parse_args()
  while True:
    alerts = scan_once()
    if alerts:
      try:
        requests.get(f"{API}/api/compat/alerts")  # sanity
      except Exception:
        pass
    time.sleep(max(3600, args.every * 3600))

if __name__ == '__main__':
  main()
```

## 4) UI — Upgrades page (tab 3) to showcase Pro/Enterprise

In `gui/index.html`, extend the tab bar and content:
```html
<button id="tab-btn-3">Upgrades</button>
...
<div id="tab-content-3" class="tab-content">
  <h2>Upgrades</h2>
  <section>
    <h3>Pro</h3>
    <ul>
      <li>Auto‑Tune (system‑aware scaling) <span class="lock" title="Pro">🔒</span></li>
      <li>Model & Pricing Catalog Sync <span class="lock">🔒</span></li>
      <li>Profiles Pro (auto‑bench calibration) <span class="lock">🔒</span></li>
    </ul>
  </section>
  <section>
    <h3>Enterprise</h3>
    <ul>
      <li>Compatibility Monitor (breaking‑change alerts) <span class="lock">🔒</span></li>
      <li>SSO / RBAC / Audit / Policies <span class="lock">🔒</span></li>
      <li>Fleet & Multi‑tenant Controls <span class="lock">🔒</span></li>
    </ul>
  </section>
  <p class="small">Contact via Vivified site for access.</p>
</div>
```
Add binding in `app.js`:
```javascript
// tabs
$('#tab-btn-3').addEventListener('click', () => switchTab(3));
```

CSS tweak (`gui/style.css`):
```css
.lock { opacity: 0.8; margin-left: 6px; }
```

---

### Notes
- Tri‑candidate selection now exists and applies the **winner** automatically; the ranked list renders in `#tri-out`.
- Auto‑Tune endpoints are **Pro‑gated** (402 when OSS).
- Compatibility Monitor is **Enterprise‑gated** with rule engine + test endpoint and a watcher stub ready for real fetchers.
- “Upgrades” page gives a clean place to showcase locked features without crowding the main UI.



---

# Cost Estimator — Add Optional Per‑Day Token Inputs (UI + Logic)

**Goal:** Let users type rough *average tokens per day* and avoid manual math. If provided, we auto‑convert to *tokens per request* using the existing **Requests/day** field. Rough estimates are fine.

## 1) UI change — `gui/index.html` (under Cost Calculator panel)
Add this block right below the existing electricity fieldset:
```html
<fieldset>
  <legend>Per‑day token totals (optional)</legend>
  <label>Tokens In / day <input type="number" id="cost-in-day" /></label>
  <label>Tokens Out / day <input type="number" id="cost-out-day" /></label>
  <p class="small">Use rough averages — we divide by Requests/day automatically.</p>
</fieldset>
```

## 2) Logic change — `gui/app.js` (in `buildCostPayload()`)
Augment the payload builder to translate per‑day totals to per‑request when possible:
```javascript
function buildCostPayload() {
  const payload = {
    provider: $('#cost-provider').value.trim(),
    model: $('#cost-model').value.trim(),
    tokens_in: parseInt($('#cost-in').value, 10) || 0,
    tokens_out: parseInt($('#cost-out').value, 10) || 0,
    embeds: parseInt($('#cost-embeds').value, 10) || 0,
    reranks: parseInt($('#cost-rerank').value, 10) || 0,
    requests_per_day: parseInt($('#cost-rpd').value, 10) || 0,
  };

  // NEW: optional per‑day totals → convert to per‑request
  const inDay = parseInt($('#cost-in-day').value || '0', 10);
  const outDay = parseInt($('#cost-out-day').value || '0', 10);
  const rpd = payload.requests_per_day;
  if ((inDay > 0 || outDay > 0) && rpd > 0) {
    if (inDay > 0) payload.tokens_in = Math.max(0, Math.floor(inDay / rpd));
    if (outDay > 0) payload.tokens_out = Math.max(0, Math.floor(outDay / rpd));
  }

  // Local electricity passthrough (unchanged)
  const kwh = $('#cost-kwh').value; const watts = $('#cost-watts').value; const hours = $('#cost-hours').value;
  if (kwh) payload.kwh_rate = parseFloat(kwh);
  if (watts) payload.watts = parseInt(watts, 10);
  if (hours) payload.hours_per_day = parseFloat(hours);
  return payload;
}
```

> Note: `triCostSelect()` already reuses `buildCostPayload()`, so tri‑candidate ranking and the **Auto‑Pick & Apply** button automatically benefit from per‑day totals.



---

# Enterprise “Issue‑Signal” Compatibility Monitor — Heuristic Stubs (Disabled by Default)

> Purpose: detect **emerging** compat problems (not CVEs/releases) by **scoring GitHub issues** and similar signals (multiple reports, fast comment velocity, specific OS/library/version keywords). **All code is stub‑only**, no schedulers enabled.

## Design (high level)
- **Collectors (stub)**: GitHub Issues Search API queries on a schedule (external CI or manual run). Queries target terms that map to user stacks, e.g., `repo:electron/electron label:bug macOS`, `org:microsoft VSCode crash`, `language:python CUDA driver`, etc. Output raw issues JSON.
- **Signal builder (stub)**: normalize {repo, title, body, labels, created_at, comments_count, reactions, author, OS/version mentions, library/version mentions}. Compute **signals**:
  - Co‑mentions (OS + electron + error keywords),
  - **Velocity** (issues/day, comments/hour),
  - **Uniqueness** (distinct reporters),
  - **Burst** (week-over-week jump),
  - **Repo weight** (stars/downloads),
  - **De‑dupe** (text shingling / embeddings cluster, stubbed as simple Jaccard now).
- **Score** `S = w1*velocity + w2*unique + w3*co_mention + w4*burst + w5*repo_weight`.
- **Thresholds**: `advisory >= 0.6`, `warn >= 0.8` (tunable).
- **Mapping**: match signals to local stack (from `/api/scan-hw` + env + detected packages); only surface relevant hits.
- **Output**: write **compat_rules.json** entries with `conditions` + `message` + `refs`, or post to `/api/compat/alerts` (kept stub).

## Files (stubs)
- `signal_monitor.py` — CLI that runs collectors → signal builder → writes `compat_rules.json`/alerts. **No scheduler; no network calls unless manually executed.**
- `collectors/github_issues.py` — placeholder functions for GitHub search (requires PAT if used later).
- `signals/scoring.py` — scoring functions (weights, dedupe helper), all stubbed with TODOs.

### `signal_monitor.py` (stub outline)
- `collect_targets = [ {"name":"electron","type":"github_issues","repo":"electron/electron"}, {"name":"vscode","type":"github_issues","repo":"microsoft/vscode"} ]`
- `run_once(targets)` → list[raw_issue]
- `build_signals(raw)` → list[{key, score, refs, suggested_rule}]
- `emit(signals)` → update `compat_rules.json` entries with conservative `conditions` (e.g., macOS>=15 & electron<30) and clear **“emerging signal”** message.

**Important:** Everything is **Enterprise‑gated** and **OFF** by default (no cron, no background tasks). This is a blueprint for later.

---

# Upgrades Page — Add Managed Keys (Cost‑Plus Option)

In the **Upgrades** tab content, under **Pro** add:
- **Managed Keys (optional)** — We can host provider API keys with budget caps and cost‑plus billing; or stick to **BYO keys** (default).

Under **Enterprise** add:
- **Issue‑Signal Monitor (heuristic)** — Emerging breakage alerts from cross‑repo issue signals (disabled by default; contact to enable).

> Pricing intentionally omitted; CTA is “Contact via Vivified site.”

