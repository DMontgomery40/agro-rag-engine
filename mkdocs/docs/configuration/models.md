# Model configuration

AGRO treats “models” as configuration, not as a hard‑coded list.

All the knobs you see in the UI ultimately flow through Pydantic models (e.g. `agro_config.json` → `AgroConfig` → runtime). That means:

- You can point AGRO at **any** model that your chosen backend can talk to (OpenAI, Anthropic, Gemini, Ollama, local MLX, SentenceTransformers, custom HTTP, etc.).
- Validation, defaults, and help text all live in one place.
- You don’t have to recompile or patch AGRO to add a new model – you just change config.

This page walks through:

- Generation models (chat / completion)
- Embedding models
- Rerankers
- How to add custom models
- How the Pydantic config flow works

---

## High‑level model types

AGRO separates model usage into a few roles:

| Role                | What it does                                                   | Typical providers                        | Where it’s configured                                                                 |
|---------------------|----------------------------------------------------------------|------------------------------------------|----------------------------------------------------------------------------------------|
| **Generation**      | Answer questions, explain code, write docs, etc.              | OpenAI, Anthropic, Gemini, Ollama, MLX  | `GEN_MODEL`, `ENRICH_MODEL`, `ENRICH_BACKEND`, `agro_config.json` (UI: “Generation”)  |
| **Embedding**       | Turn code/comments into vectors for search                    | OpenAI, Voyage, SentenceTransformers    | `EmbeddingConfig` in `agro_config.json` (UI: “Embeddings”)                            |
| **Reranking**       | Re‑score retrieved chunks to improve ordering                 | Local cross‑encoder, cloud rerank APIs  | `RerankingConfig` in `agro_config.json` (UI: “Reranking”)                             |
| **Indexing backend**| Store vectors and metadata                                    | Qdrant, Chroma, Weaviate                 | `IndexingConfig.vector_backend`                                                       |

!!! note "Not a fixed menu of models"
    Anywhere you see a `"model"` string, it’s just that – a string.  
    If your backend accepts it, AGRO will use it. There is **no baked‑in enum of models**.

---

## Generation models

Generation models are used in a few places:

- Chat UI / API
- Query rewriting and “enrichment”
- Internal evaluation pipelines

There are three main execution backends for generation in the current code:

1. :material-cloud-outline: **OpenAI Responses API**
2. :material-chip: **Local MLX (Apple Silicon)**
3. :material-lan::material-chip: **Ollama**

The core entry point is `server/env_model.py::generate_text`.

### OpenAI (Responses API)

AGRO currently enforces the modern OpenAI SDK:

```python linenums="1" hl_lines="4-10"
from importlib import import_module
from packaging.version import Version

_OPENAI_SDK = import_module("openai")
_OPENAI_VERSION = Version(getattr(_OPENAI_SDK, "__version__", "0.0.0"))
if _OPENAI_VERSION < Version("1.0.0"):
    raise RuntimeError("openai>=1.0.0 is required")
OpenAI = getattr(_OPENAI_SDK, "OpenAI", None)
if OpenAI is None:
    raise RuntimeError("openai>=1.x is required for Responses API")
```

AGRO uses the **Responses API** rather than chat/completions so it can:

- Set temperature, `reasoning` options, `response_format`, and `instructions` cleanly.
- Track usage and approximate cost (for OpenAI) via `server.api_tracker`.

Basic flow:

```python linenums="1" hl_lines="6 13 18"
def generate_text(user_input: str, *, system_instructions: str | None = None, model: str | None = None, ...):
    mdl = model or _DEFAULT_MODEL
    kwargs = {
        "model": mdl,
        "input": user_input,
        "store": store,
        "temperature": _GEN_TEMPERATURE,
    }
    if system_instructions:
        kwargs["instructions"] = system_instructions
    if reasoning_effort:
        kwargs["reasoning"] = {"effort": reasoning_effort}
    if response_format:
        kwargs["response_format"] = response_format

    resp = client().responses.create(**kwargs)
    text = _extract_text(resp)
    return text, {"response": resp, "backend": "openai", "provider": "openai", "model": mdl}
```

Where does `_DEFAULT_MODEL` and `_GEN_TEMPERATURE` come from? See [Pydantic config flow](#pydantic-config-flow) below – they’re loaded from:

- `agro_config.json` via the config registry, **or**
- Environment variables as a fallback:

```python linenums="1" hl_lines="6-11"
_GEN_MODEL = os.getenv('GEN_MODEL', 'gpt-4o-mini')
_GEN_TEMPERATURE = float(os.getenv('GEN_TEMPERATURE', '0.0') or '0.0')
_GEN_MAX_TOKENS = int(os.getenv('GEN_MAX_TOKENS', '2048') or '2048')
_GEN_TOP_P = float(os.getenv('GEN_TOP_P', '1.0') or '1.0')
_GEN_TIMEOUT = int(os.getenv('GEN_TIMEOUT', '60') or '60')
_GEN_RETRY_MAX = int(os.getenv('GEN_RETRY_MAX', '2') or '2')
```

=== "Example: use a different OpenAI model"

```bash
export GEN_MODEL="gpt-4.1-mini"
export GEN_TEMPERATURE="0.1"
```

=== "Example: via agro_config.json"

```json
{
  "generation": {
    "model": "gpt-4.1-mini",
    "temperature": 0.1
  }
}
```

!!! tip
    As long as the string you set in `model` is a valid OpenAI model name, AGRO will use it.  
    There is no whitelist on AGRO’s side.

### Local MLX models

If you set the enrichment backend to `"mlx"` or pick an MLX community model, AGRO will bypass OpenAI and route to `mlx_lm` instead:

```python linenums="1" hl_lines="6 9 16-24"
_ENRICH_BACKEND = _config_registry.get_str('ENRICH_BACKEND', 'openai')

def _get_mlx_model():
    from mlx_lm import load
    model_name = _GEN_MODEL or "mlx-community/Qwen3-Coder-30B-A3B-Instruct-4bit"
    return load(model_name)

def generate_text(..., model: str | None = None, ...):
    mdl = model or _DEFAULT_MODEL
    ENRICH_BACKEND = (_ENRICH_BACKEND or "").lower()
    is_mlx_model = mdl.startswith("mlx-community/") if mdl else False
    prefer_mlx = (ENRICH_BACKEND == "mlx") or is_mlx_model

    if prefer_mlx:
        from mlx_lm import generate
        model, tokenizer = _get_mlx_model()
        prompt = f"<system>{system_instructions}</system>\n{user_input}" if system_instructions else user_input
        text = generate(model, tokenizer, prompt=prompt, max_tokens=2048, verbose=False)
        return text, {"response": text, "backend": "mlx"}
```

You control this via:

- `GEN_MODEL`: set to something like `"mlx-community/Qwen2.5-Coder-7B-Instruct-4bit"`.
- `ENRICH_BACKEND`: `"mlx"` to force MLX even if `GEN_MODEL` doesn’t start with `mlx-community/`.

!!! note
    MLX support assumes you’re on Apple Silicon and have installed `mlx_lm`.  
    If MLX import or generation fails, AGRO silently falls back to the next backend (Ollama or OpenAI).

### Ollama models

Ollama support is model‑name agnostic. AGRO does **not** guess “this looks like an Ollama model” from a colon or suffix; it actually queries the Ollama server to see if the model exists:

```python linenums="1" hl_lines="4 7 24-26"
def _ollama_has_model(base_url: str, name: str) -> bool:
    import requests as _rq
    b = str(base_url).rstrip('/')
    candidates = [f"{b}/api/tags", f"{b}/tags"]
    for u in candidates:
        r = _rq.get(u, timeout=1.0)
        ...
        names = [...]
        return name in names

OLLAMA_URL = os.getenv("OLLAMA_URL")
_ollama_present = bool(OLLAMA_URL)
_ollama_has = _ollama_has_model(OLLAMA_URL, str(mdl)) if _ollama_present else False
prefer_ollama = _ollama_present and _ollama_has
```

If `prefer_ollama` is true, AGRO streams from `/api/generate`:

```python linenums="1" hl_lines="6 7 10 22 37"
with requests.post(
    url,
    json={
        "model": mdl,
        "prompt": prompt,
        "stream": True,
        "options": {"temperature": temp, "num_ctx": _OLLAMA_NUM_CTX},
    },
    timeout=chunk_timeout,
    stream=True,
) as r:
    ...
    text = ("".join(buf) or "").strip()
    if text:
        meta = last or {"response": text}
        meta.setdefault("backend", "ollama")
        meta.setdefault("provider", "ollama")
        meta.setdefault("model", mdl)
        meta.setdefault("ollama", {"url": OLLAMA_URL, "model_present": True})
        return text, meta
```

You control this via environment:

```bash
export OLLAMA_URL="http://127.0.0.1:11434"
export GEN_MODEL="qwen2.5-coder:7b"
export OLLAMA_NUM_CTX="8192"
export OLLAMA_REQUEST_TIMEOUT="300"
export OLLAMA_STREAM_IDLE_TIMEOUT="60"
export GEN_RETRY_MAX="2"
```

!!! tip "Choosing between MLX, Ollama, and OpenAI"
    The decision order in `generate_text` is:

    1. If `ENRICH_BACKEND == "mlx"` **or** model name starts with `mlx-community/` → **MLX**.
    2. Else if `OLLAMA_URL` is set and Ollama reports the model exists → **Ollama**.
    3. Else → **OpenAI Responses API**.

    So you can “pin” a model to a backend by naming convention or config.

---

## Embedding models

Embeddings are configured via `EmbeddingConfig` in `server/models/agro_config_model.py`.

```python linenums="1" hl_lines="5-27"
class EmbeddingConfig(BaseModel):
    """Embedding generation and caching configuration."""

    embedding_type: str = Field(
        default="openai",
        pattern="^(openai|voyage|local|mxbai)$",
        description="Embedding provider"
    )
    embedding_model: str = Field(
        default="text-embedding-3-large",
        description="OpenAI embedding model"
    )
    embedding_dim: int = Field(
        default=3072,
        ge=512,
        le=3072,
        description="Embedding dimensions"
    )
    voyage_model: str = Field(
        default="voyage-code-3",
        description="Voyage embedding model"
    )
    embedding_model_local: str = Field(
        default="all-MiniLM-L6-v2",
        description="Local SentenceTransformer model"
    )
    embedding_batch_size: int = Field(
        default=64,
        ge=1,
        le=256,
        description="Batch size for embedding generation"
    )
    embedding_max_tokens: int = Field(
        default=8000,
        ge=512,
        le=8192,
        description="Max tokens per embedding chunk"
    )
    embedding_cache_enabled: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable embedding cache"
    )
    embedding_timeout: int = Field(
        default=30,
        ge=5,
        le=120,
        description="Embedding API timeout (seconds)"
    )
    embedding_retry_max: int = Field(
        default=3,
        ge=1,
        le=5,
        description="Max retries for embedding API"
    )
```

A small validator keeps you from accidentally setting absurd dimensions:

```python linenums="1" hl_lines="2-7"
@field_validator('embedding_dim')
@classmethod
def validate_dim_matches_model(cls, v):
    if v not in [128, 256, 384, 512, 768, 1024, 1536, 3072]:
        raise ValueError(
            f'Uncommon embedding dimension: {v}. Expected one of [128, 256, 384, 512, 768, 1024, 1536, 3072]'
        )
    return v
```

=== "OpenAI embeddings"

```json
{
  "embedding": {
    "embedding_type": "openai",
    "embedding_model": "text-embedding-3-large",
    "embedding_dim": 3072
  }
}
```

=== "Voyage embeddings"

```json
{
  "embedding": {
    "embedding_type": "voyage",
    "voyage_model": "voyage-code-3",
    "embedding_dim": 1536
  }
}
```

=== "Local SentenceTransformers"

```json
{
  "embedding": {
    "embedding_type": "local",
    "embedding_model_local": "all-MiniLM-L6-v2",
    "embedding_dim": 384
  }
}
```

!!! note
    The `"pattern"` on `embedding_type` (`"^(openai|voyage|local|mxbai)$"`) is about **provider kind**, not specific models.  
    Inside each provider, `embedding_model`, `voyage_model`, or `embedding_model_local` are free‑form strings – you can use any model supported by that library or API.

---

## Reranker options

Reranking is handled by `RerankingConfig` in `agro_config_model.py`. The code is truncated in the snippet, but the important parts are:

```python linenums="1" hl_lines="5-24"
class RerankingConfig(BaseModel):
    """Reranking configuration for result refinement."""

    reranker_active: str = Field(
        default="local",
        description="Active reranker choice (local/learning/HF vs cloud provider)"
    )

    reranker_provider: str = Field(
        default="",
        description="Cloud reranker provider when using external API"
    )

    reranker_cloud_model: str = Field(
        default="rerank-3.5",
        description="Selected cloud reranker model for the chosen provider"
    )

    reranker_model: str = Field(
        default="cross-encoder/ms-marco-MiniLM-L-12-v2",
        description="Reranker model path"
    )

    agro_reranker_enabled: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable reranking"
    )

    agro_reranker_alpha: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Blend weight for reranker scores"
    )
```

Typical usage:

- **Local reranker** (HF cross‑encoder):

  ```json
  {
    "reranking": {
      "agro_reranker_enabled": 1,
      "reranker_active": "local",
      "reranker_model": "cross-encoder/ms-marco-MiniLM-L-12-v2",
      "agro_reranker_alpha": 0.7
    }
  }
  ```

- **Cloud reranker** (e.g. a provider that exposes a rerank API):

  ```json
  {
    "reranking": {
      "agro_reranker_enabled": 1,
      "reranker_active": "cloud",
      "reranker_provider": "my-provider",
      "reranker_cloud_model": "rerank-3.5",
      "agro_reranker_alpha": 0.6
    }
  }
  ```

!!! tip "Alpha blending"
    `agro_reranker_alpha` controls how much weight the reranker gets vs. original retrieval scores.  
    Values near `1.0` → trust the reranker heavily; near `0.0` → mostly keep original ranking.

---

## How to add custom models

Because AGRO doesn’t hard‑code model lists, “adding a model” usually means one of:

1. Pointing an existing backend at a new model name.
2. Teaching AGRO about a **new backend** (e.g. a custom HTTP service).

### 1. New model on an existing backend

For generation:

- **OpenAI / Anthropic / Gemini** (via OpenAI‑compatible or other client): set `GEN_MODEL` and any corresponding API keys.
- **Ollama**: pull the model into Ollama, then set `GEN_MODEL` to that name.
- **MLX**: make sure `mlx_lm` can load your model, then set `GEN_MODEL` to its identifier and `ENRICH_BACKEND="mlx"`.

=== "Example: custom Ollama model"

```bash
ollama pull my-coder:latest

export OLLAMA_URL="http://127.0.0.1:11434"
export GEN_MODEL="my-coder:latest"
```

AGRO will:

1. Ask Ollama if `my-coder:latest` exists.
2. If yes, use it via `/api/generate`.
3. If not, fall back to OpenAI (and record the failover in tracing metadata).

For embeddings:

- Set `embedding_type` to one of the supported providers.
- Set the model name to anything your embedding library/API accepts.
- Adjust `embedding_dim` to match the model.

=== "Example: custom SentenceTransformers model"

```json
{
  "embedding": {
    "embedding_type": "local",
    "embedding_model_local": "intfloat/multilingual-e5-large",
    "embedding_dim": 1024,
    "embedding_batch_size": 32
  }
}
```

### 2. Adding a new backend (code change)

If you want AGRO to talk to a completely different service (e.g. a homegrown HTTP LLM or a different embedding API), the pattern is:

1. **Extend the Pydantic config** (`agro_config_model.py`):

   ```python linenums="1" hl_lines="3-9"
   class EmbeddingConfig(BaseModel):
       embedding_type: str = Field(
           default="openai",
           pattern="^(openai|voyage|local|mxbai|mybackend)$",
           description="Embedding provider"
       )
       mybackend_api_url: str = Field(
           default="https://my-embeddings/api",
           description="My backend base URL"
       )
       mybackend_model: str = Field(
           default="my-emb-1",
           description="My backend model name"
       )
   ```

2. **Use that config in the embedding code path** (not shown here, but typically something like):

   ```python linenums="1"
   if cfg.embedding.embedding_type == "mybackend":
       # call your HTTP API using cfg.embedding.mybackend_api_url and mybackend_model
   ```

3. The UI and MCP servers will automatically see the new fields via the Pydantic schema and surface tooltips.

!!! note
    This is where the “local‑first, explain‑itself” design shows up: once the Pydantic model knows about your backend, the rest of AGRO (UI, docs, validation) can introspect it and help you configure it without extra wiring.

---

## Pydantic config flow

Most of these knobs are defined in `server/models/agro_config_model.py`. A very simplified view:

```mermaid
flowchart TD
    A[agro_config.json] --> B[Config loader<br/>(config_registry)]
    B --> C[Pydantic models<br/>RetrievalConfig / EmbeddingConfig / ...]
    C --> D[Module-level cache<br/>env_model._GEN_MODEL, etc.]
    D --> E[Runtime code<br/>generate_text, embedding pipeline, reranker]
```

### How it works end‑to‑end

1. **Load JSON**  
   At startup (or when you reload config), AGRO loads `agro_config.json` into a config registry.

2. **Validate with Pydantic**  
   The config registry instantiates models like `RetrievalConfig`, `EmbeddingConfig`, `IndexingConfig`, `RerankingConfig`, etc. This:

   - Applies defaults.
   - Validates ranges and patterns.
   - Runs model/field validators (e.g. normalize weights, check overlaps, etc.).

3. **Populate module‑level caches**  
   `server/env_model.py` calls `_load_cached_config()`:

   ```python linenums="1" hl_lines="3-9 13-19"
   from server.services.config_registry import get_config_registry
   _config_registry = get_config_registry()

   def _load_cached_config():
       global _GEN_MODEL, _GEN_TEMPERATURE, _GEN_MAX_TOKENS, _GEN_TOP_P
       ...
       if _config_registry is None:
           # fallback to env vars
           _GEN_MODEL = os.getenv('GEN_MODEL', 'gpt-4o-mini')
           ...
       else:
           _GEN_MODEL = _config_registry.get_str('GEN_MODEL', 'gpt-4o-mini')
           _GEN_TEMPERATURE = _config_registry.get_float('GEN_TEMPERATURE', 0.0)
           ...
   ```

   This gives you:

   - A consistent place to override **per‑repo** or **per‑environment**.
   - A way to hot‑reload config via `reload_config()` without restarting the server.

4. **Runtime consumption**  
   Functions like `generate_text` and the embedding/reranking code only read from these cached values and Pydantic models – they don’t need to know where the config came from.

??? collapsible "Example: full minimal agro_config.json snippet"

    ```json
    {
      "generation": {
        "GEN_MODEL": "gpt-4o-mini",
        "GEN_TEMPERATURE": 0.0
      },
      "embedding": {
        "embedding_type": "openai",
        "embedding_model": "text-embedding-3-large",
        "embedding_dim": 3072
      },
      "reranking": {
        "agro_reranker_enabled": 1,
        "reranker_active": "local",
        "reranker_model": "cross-encoder/ms-marco-MiniLM-L-12-v2",
        "agro_reranker_alpha": 0.7
      }
    }
    ```

---

## Indexing backend and repo config (

