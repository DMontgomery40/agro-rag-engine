# GUI Tooltip Coverage Tracker

Goal: Every tab and every setting has a helpful tooltip with human-readable guidance and accurate links (internal docs or verified vendor pages).

Status legend: [x] done · [ ] pending

Infra & Routing
- [x] QDRANT_URL — GitHub Qdrant link
- [x] REDIS_URL — GitHub Redis link
- [x] REPO — internal docs link
- [x] COLLECTION_NAME — GitHub Qdrant link
- [x] COLLECTION_SUFFIX
- [x] REPOS_FILE — link to local repos.json
- [x] REPO_PATH
- [x] OUT_DIR_BASE — link to README (shared index)
- [x] RAG_OUT_BASE
- [x] MCP_HTTP_HOST / MCP_HTTP_PORT / MCP_HTTP_PATH — link to Remote MCP docs

Models & Retrieval
- [x] GEN_MODEL — OpenAI Models + Ollama GitHub
- [x] OLLAMA_URL — Ollama GitHub
- [x] OPENAI_API_KEY — OpenAI API key + Models
- [x] EMBEDDING_TYPE — OpenAI Embeddings + SentenceTransformers GitHub
- [x] VOYAGE_API_KEY / VOYAGE_EMBED_DIM
- [x] RERANK_BACKEND — Cohere Python GitHub (vendor docs not linked due to allowlist)
- [x] COHERE_API_KEY / COHERE_RERANK_MODEL — Cohere Python GitHub
- [x] RERANKER_MODEL
- [x] MQ_REWRITES / TOPK_DENSE / TOPK_SPARSE / FINAL_K
- [x] HYDRATION_MODE / HYDRATION_MAX_CHARS

Confidence & Misc
- [x] CONF_TOP1 / CONF_AVG5 / CONF_ANY
- [x] NETLIFY_API_KEY / NETLIFY_DOMAINS
- [x] THREAD_ID — CLI Chat docs
- [x] TRANSFORMERS_TRUST_REMOTE_CODE
- [x] LANGCHAIN_TRACING_V2
- [x] GEN_MODEL_HTTP / GEN_MODEL_MCP / GEN_MODEL_CLI

Repository Editor (dynamic)
- [x] repo_path
- [x] repo_keywords
- [x] repo_pathboosts
- [x] repo_layerbonuses

Notes
- Vendor docs links for Cohere, Qdrant, Redis, Ollama are restricted to GitHub due to current web allowlist. If broader domains become allowlisted, update these to official vendor docs.
- Internal docs are served at /docs (this folder) and /files (repo root) by the FastAPI server.

Last updated: 2025-10-11
