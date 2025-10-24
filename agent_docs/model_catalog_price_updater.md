# Model Catalog & Price Updater

Keep an up-to-date catalog of providers, models, capabilities (chat/embed/rerank), and prices. The GUI consumes this to populate dropdowns and compute live costs.

## Artifacts
- `data/models/catalog.json` — canonical model list with metadata: provider, family, model id, task type(s), context window, deprecation flags, etc.
- `data/models/prices.json` — current pricing for input/output/embeddings/rerank per unit (1k tokens or request), with timestamp and source.

## Sources (initial set)
- OpenAI, Anthropic, Google (Vertex), Cohere, Mistral, Voyage, AWS Bedrock, Azure OpenAI.
- Self-host: Hugging Face Hub — discover embeddings (`sentence-transformers`), cross-encoders (`cross-encoder`), and other relevant tasks. Optional local backends (Ollama/MLX) are modeled as provider entries with fixed “$0” pricing and capabilities.

## Updater Scripts
- `scripts/update_model_catalog.py`
  - Scrapes or calls official “models” APIs where available; otherwise scrapes docs.
  - Normalizes to a common schema and writes `catalog.json`.
- `scripts/update_prices.py`
  - Scrapes pricing pages or APIs; normalizes units; writes `prices.json`.
- Both scripts accept `--provider` filter and write repo‑relative paths only. No absolute paths.

## Frequency & CI
- Scheduled (weekly/biweekly) via GitHub Actions to refresh and open a PR with diffs (no auto‑merge).
- Manual run available via `make models.update` or direct `python scripts/...`.

## GUI Integration
- The SPA fetches `catalog.json` and `prices.json` to build dropdowns for chat/embedding/rerank models.
- Cost estimator reads `prices.json`; backend `/api/cost/estimate*` uses the same data to ensure parity.
- Offline fallback: ship a recent snapshot in the repo; warn when stale.

## Guardrails
- Unit and schema validation on scraped data; unknown fields rejected; CI fails on invalid diffs.
- Human review remains required (pricing is sensitive); links to source pages stored with each entry.

