# Profiles

Profiles are saved configurations for AGRO’s environment and repositories. They live entirely on disk as JSON files under `web/public/profiles` (via `GUI_DIR/profiles`) and can be listed, loaded, saved, and applied through the API and UI.

Profiles are intentionally simple:

- A profile is just a JSON object (`profile`) plus a name
- Saving a profile writes `web/public/profiles/<name>.json`
- Applying a profile sets environment variables for this AGRO process
- You can also checkpoint the **current** configuration into a timestamped profile

---

## What is in a profile?

A profile is an arbitrary JSON object. In practice, the UI typically stores:

- Environment-like key/value pairs (e.g. `OPENAI_API_KEY`, `AGRO_RERANKER_BACKEND`, `REPO`, etc.)
- Repository configuration (mirroring what `get_config` returns: `default_repo`, `repos`, etc.)
- Any other config knobs you want to persist

!!! note
    Profiles are **not** validated Pydantic models. They’re raw JSON blobs that you choose to interpret in the UI or via your own tooling.

---

## API overview

All profile endpoints are in `server/routers/profiles.py`.

```mermaid
flowchart TD
    A[Client / UI] -->|GET /api/profiles| B[List Profiles]
    A -->|GET /api/profiles/{name}| C[Load Profile]
    A -->|POST /api/profiles/save| D[Save Profile]
    A -->|POST /api/profiles/apply| E[Apply Profile (env)]
    A -->|POST /api/profile/autoselect| F[Auto-select Profile]
    A -->|POST /api/checkpoint/config| G[Checkpoint Current Config]
```

---

## Listing and loading profiles

=== "List profiles"

    ```http
    GET /api/profiles
    ```

    Returns all saved profile names:

    ```json
    {
      "profiles": ["default", "eval-run", "cheap-models"],
      "default": null
    }
    ```

=== "Get a profile"

    ```http
    GET /api/profiles/{name}
    ```

    Example:

    ```http
    GET /api/profiles/eval-run
    ```

    ```json
    {
      "ok": true,
      "name": "eval-run",
      "profile": {
        "REPO": "my-monorepo",
        "AGRO_RERANKER_BACKEND": "local",
        "OPENAI_API_KEY": "••••••••"
      }
    }
    ```

    !!! warning
        If the file `web/public/profiles/{name}.json` does not exist, the API returns `404`.

---

## Creating and saving profiles

To create or update a profile, send the name and an arbitrary JSON object as `profile`.

```http
POST /api/profiles/save
Content-Type: application/json
```

```json
{
  "name": "cheap-models",
  "profile": {
    "REPO": "my-small-repo",
    "AGRO_LLM_MODEL": "gpt-4o-mini",
    "AGRO_RERANKER_BACKEND": "none"
  }
}
```

- The server writes: `web/public/profiles/cheap-models.json`
- Writes are atomic via `atomic_write_json` (:material-shield-check: safe against partial writes)

!!! warning
    If `name` is empty or missing, the API returns `400` with `"missing name"`.

---

## Applying a profile (env only)

`/api/profiles/apply` **does not** interpret the profile as a full AGRO config. It simply:

1. Iterates over `profile.items()`
2. Calls `os.environ[str(k)] = str(v)` for each key
3. Returns the list of applied keys

```http
POST /api/profiles/apply
Content-Type: application/json
```

```json
{
  "profile": {
    "REPO": "my-monorepo",
    "AGRO_RERANKER_BACKEND": "cohere",
    "COHERE_API_KEY": "abc123"
  }
}
```

Response:

```json
{
  "ok": true,
  "applied_keys": [
    "REPO",
    "AGRO_RERANKER_BACKEND",
    "COHERE_API_KEY"
  ]
}
```

!!! danger
    This endpoint will happily overwrite any environment variable in the AGRO process. Use it with care, especially in shared or long-lived instances.

!!! tip
    For more structured updates (including `repos.json` and `agro_config.json`), use the config store endpoints (`get_config` / `set_config`) instead of raw profiles.

---

## Auto-selecting a profile (autoprofile v2)

If `server.autoprofile` is available, AGRO can suggest an environment configuration based on your payload and current model pricing.

```http
POST /api/profile/autoselect
Content-Type: application/json
```

```json
{
  "task": "heavy-code-refactor",
  "latency_tolerance": "medium"
}
```

Internally:

1. The router calls `prices_get()` from `config_store` to get model prices.
2. Calls `_ap_select(payload, prices)`.
3. If `env` is empty, it returns `422` with the reason.
4. Otherwise:

    ```json
    {
      "env": {
        "AGRO_LLM_MODEL": "gpt-4.1",
        "AGRO_RERANKER_BACKEND": "local"
      },
      "reason": "selected based on task and pricing"
    }
    ```

!!! note
    The autoprofile module is optional. If it’s not importable, this endpoint returns `500` with `"autoprofile module not available"`.

---

## Checkpointing the current configuration

You can snapshot the current configuration (environment + repos) into a timestamped profile. This is useful for:

- Keeping a log of “known good” setups
- Sharing a one-off configuration with teammates
- Rolling back after experiments

```http
POST /api/checkpoint/config
```

Internally this:

1. Calls `get_config()` from `config_store` (includes `env`, `repos`, and hints).
2. Writes it to:

   ```text
   web/public/profiles/checkpoint-YYYYMMDD-HHMMSS.json
   ```

Example response:

```json
{
  "ok": true,
  "path": "web/public/profiles/checkpoint-20251129-135012.json"
}
```

??? collapsible "What exactly is in a checkpoint?"
    A checkpoint is the raw output of `get_config()`:

    ```json
    {
      "env": {
        "REPO_ROOT": "/path/to/root",
        "REPO": "my-monorepo",
        "AGRO_LLM_MODEL": "gpt-4.1",
        "...": "..."
      },
      "default_repo": "my-monorepo",
      "repos": [
        {
          "name": "my-monorepo",
          "path": "/path/to/monorepo",
          "keywords": ["backend", "api"]
        }
      ],
      "hints": {
        "rerank_backend": {
          "backend": "local",
          "reason": "recent_local_model"
        },
        "config_sources": {
          "AGRO_LLM_MODEL": {
            "source": "agro_config.json"
          }
        }
      }
    }
    ```

---

## Typical use cases

| Use case                                      | Example profile contents                                                                 |
|----------------------------------------------|------------------------------------------------------------------------------------------|
| Different repos per task                     | `{"REPO": "frontend", "AGRO_LLM_MODEL": "gpt-4o-mini"}`                                  |
| “Expensive but accurate” vs “cheap & fast”   | Change model, reranker backend, maybe temperature                                       |
| Evaluation / CI runs                         | Lock down `REPO`, `AGRO_LLM_MODEL`, `AGRO_RERANKER_BACKEND`, and any custom env flags   |
| Debugging config issues                      | Use `/api/checkpoint/config` to capture a snapshot, compare across runs                 |

!!! tip
    Nothing stops you from mixing “profile-style” JSON with the config store. A common pattern is:

    1. Use `/api/checkpoint/config` to capture a baseline.
    2. Edit the JSON manually (or via scripts).
    3. Feed the relevant pieces back into `set_config` for a more controlled update.