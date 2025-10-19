---
sidebar_position: 1
slug: /
---

# Welcome to AGRO

**AGRO is NOT just a RAG engine.**

AGRO is a complete, GUI-first development workspace that combines:
- **Intelligent code search** with hybrid RAG (BM25 + semantic embeddings)
- **Self-learning ML pipeline** that gets smarter as you use it
- **Embedded VS Code** for editing right in the browser
- **Grafana telemetry** with custom dashboards and alerting
- **Multi-transport MCP server** (HTTP, SSE, STDIO, WebSocket)
- **Cost estimation** and storage calculators
- **Performance profiling** and debugging tools
- **Complete GUI** for all settings and operations (accessibility-first design)

![AGRO Dashboard](/img/screenshots/dashboard.png)

## Why AGRO Exists

### The Token Crisis

If you use Claude Code or GitHub Copilot heavily, you've hit this wall: **rate limits.**

Claude Pro ($200/month) still limits you to ~1.27M tokens per week for Sonnet, ~300K for Opus. Without RAG, a single complex query can burn 12,700+ tokens. That's only **100 queries per week** on Sonnet before you're blocked.

**AGRO solves this:**
- **91% token reduction**: 12,700 tokens → 1,141 tokens per query
- **11x more queries**: 100/week → 1,110/week on the same Claude Pro plan
- **Same quality answers**: RAG context is just as good (often better) than file reading
- **2-3x faster**: No file I/O overhead

### Real-World Impact

```
Without AGRO:
- Monday: 40 queries (508,000 tokens)
- Tuesday: 35 queries (444,500 tokens)
- Wednesday: 25 queries (317,500 tokens)
- Thursday: RATE LIMITED 🚫
- Friday: RATE LIMITED 🚫

With AGRO:
- Monday through Friday: Code freely
- 200+ queries per week, no rate limits
- Never think about token usage again
```

## Quick Start

```bash
git clone https://github.com/DMontgomery40/agro-rag-engine.git
cd agro-rag-engine
make dev

# Starts: Docker infra, MCP server, API, and GUI
# GUI at http://127.0.0.1:8012/
```

That's it. The onboarding wizard walks you through:
1. Adding your repositories
2. Configuring models (local or cloud)
3. Running your first index
4. Testing retrieval quality
5. Connecting to Claude Code/Codex

## What Makes AGRO Different

### 1. GUI-First Design (Accessibility Focus)

**Every feature is accessible through the GUI.** This isn't an afterthought - it's a requirement per ADA compliance for users with dyslexia and other accessibility needs.

![Settings & Profiles](/img/screenshots/settings%20tab-%20profiles%20subtab.png)

- **Settings management**: All environment variables, repo configs, model selection
- **Cost estimation**: See exactly what your config will cost before running it
- **Storage calculator**: Plan your index size and disk usage
- **Evaluation interface**: Run golden tests, compare baselines, track regressions
- **Real-time metrics**: Grafana dashboards embedded right in the UI
- **VS Code integration**: Optional embedded editor (because why not?)

![Embedded VS Code](/img/screenshots/dev%20tools%20-%20editor%20-%20embedded%20vscode%20editor%20-%20way%20cool.png)

**Analytics & Cost Tracking**

![Cost Estimation](/img/screenshots/analystics%20tab%20-%20cost%20subtab.png)

### 2. Self-Learning Reranker

AGRO includes a **complete ML pipeline** that trains a custom transformer model on YOUR codebase:

```
User Feedback → Triplet Mining → Model Training → Evaluation → Auto-Promotion
```

Every time you click a search result or give thumbs up/down feedback, AGRO learns. The reranker gets better at finding what YOU actually need, not what worked for someone else's repo.

![Learning Reranker Pipeline](/img/screenshots/learning%20reranker%20pt%201.png)

**Full pipeline included:**
- Automatic feedback collection (clicks, ratings)
- Triplet mining from logs and golden questions
- Cross-encoder training with sentence-transformers
- MRR and Hit@K evaluation metrics
- Hot-reload deployment (no server restart needed)

![Reranker Training](/img/screenshots/learning%20reranker%20pt%202.png)

### 3. Multi-Transport MCP

Most MCP servers only do STDIO. AGRO supports **four transports**:

- **STDIO**: For local Claude Code, Codex CLI
- **HTTP**: For remote agents and web platforms
- **SSE (Server-Sent Events)**: For streaming responses
- **WebSocket**: For bidirectional real-time communication

**Per-transport configuration**: Use different models for different clients. Maybe HTTP gets GPT-4o-mini (cheap), but your local STDIO uses Qwen3-Coder 30B (free, powerful).

### 4. Hybrid Search Architecture

Not just "throw it at a vector database and hope":

```
Query
  ↓
Multi-Query Expansion (4+ variants)
  ↓
Parallel Retrieval:
  ├─ BM25 Sparse Search (keyword matching)
  ├─ Dense Vector Search (semantic similarity)
  └─ Semantic Cards (high-level summaries)
  ↓
Reciprocal Rank Fusion (RRF)
  ↓
Cross-Encoder Reranking (learned model)
  ↓
Confidence Gating & Local Hydration
  ↓
Top-K Results with Citations
```

**Keywords auto-generated** from your codebase. **Path boosting** for important directories. **Layer bonuses** for matching file types.

### 5. Complete Observability

![Grafana Telemetry](/img/screenshots/matrics%20-%20embedded%20grafana%20dash.png)

- **Grafana dashboards**: Request rates, latency, cache hits, error rates
- **Prometheus metrics**: Full instrumentation of retrieval and generation
- **LangSmith tracing**: See exactly what the LLM saw and generated
- **Query logging**: Every search tracked for training data
- **Cost tracking**: Know exactly what you're spending

![Chat Interface](/img/screenshots/chat%20tab.png)

### 6. Production-Ready Features

**Evaluation & Regression Tracking:**
- Golden question sets with expect_paths matching
- Top-1 and Top-K accuracy metrics
- Baseline comparison (detect when changes break retrieval)
- Continuous eval mode (watch for degradation)

**Indexing Intelligence:**
- AST-aware code chunking (respects function boundaries)
- Language detection (Python, JS, TS, Go, Rust, Ruby, Java, C++)
- Smart filtering (excludes node_modules, .venv, build artifacts)
- Incremental updates (only re-index changed files)

**Cost Control:**
- Embedding caching (never re-embed unchanged code)
- Local model fallbacks (zero API cost option)
- Batch processing (minimize API calls)
- Storage optimization (quantization, compression)

## Key Features

### RAG & Retrieval
- Hybrid search (BM25 + dense vectors + reranking)
- Multi-query expansion for better recall
- Confidence gating to prevent hallucination
- Local chunk hydration (add context from adjacent code)
- Repository isolation (never mix agro with agro)

### Learning & Training
- Self-learning reranker with feedback collection
- Automatic triplet mining from usage logs
- Cross-encoder training pipeline
- MRR/Hit@K evaluation
- Golden test suite with regression tracking

### MCP Integration
- 4 transport modes (STDIO, HTTP, SSE, WebSocket)
- Tools: `rag_answer`, `rag_search`, `netlify_deploy`, `web_get`
- Per-transport model configuration
- Streaming response support
- OAuth 2.0 authentication (optional)

### GUI & Accessibility
- Complete settings management
- Cost estimation calculator
- Storage planning tool
- Evaluation interface
- Grafana metrics integration
- Embedded VS Code (optional)
- Alert management
- Profile switching

### Developer Experience
- CLI chat interface with memory
- Rich terminal UI with Markdown rendering
- Repository switching mid-conversation
- Code citations with line numbers
- Confidence scores for every result

## Model Flexibility

**Cloud options:**
- OpenAI (GPT-4o, GPT-4o-mini, text-embedding-3-large)
- Anthropic Claude (Haiku, Sonnet, Opus)
- Google Gemini (Flash 2.5, Pro 2.5)
- Cohere (rerank-3.5, rerank-2.5)
- Voyage AI (embeddings)

**Local options:**
- Ollama (Qwen3-Coder, DeepSeek-Coder, etc.)
- MLX (Apple Silicon optimized - uses Metal GPU, not ANE)
- Sentence Transformers (BGE, NV-Embed, Nomic)
- HuggingFace models (any cross-encoder)

**Mix and match:**
```yaml
embedding: text-embedding-3-large  # Cloud
generation: qwen3-coder:30b        # Local (Ollama or MLX)
reranking: local cross-encoder     # Local
```

Zero API cost is possible. Or cloud-only. Or hybrid. Your choice.

## What's Included

- **MCP Servers**: STDIO, HTTP, SSE, WebSocket implementations
- **FastAPI backend**: Complete REST API with /answer, /search, /chat
- **LangGraph pipeline**: Stateful retrieval with Redis checkpointing
- **Hybrid search**: BM25S + Qdrant vector DB + cross-encoder reranking
- **Indexer**: AST-aware chunking for 10+ languages
- **CLI chat**: Interactive terminal chat with conversation memory
- **Eval harness**: Golden tests with baseline comparison
- **Reranker training**: Full ML pipeline from feedback to deployment
- **GUI**: Complete web interface for all features
- **Grafana**: Pre-configured dashboards and alerts
- **Docker Compose**: Qdrant, Redis, Prometheus, Grafana
- **Scripts**: Index management, keyword generation, eval automation

## Next Steps

Ready to dive in?

1. **[Installation Guide](getting-started/installation)** - Set up AGRO from scratch
2. **[Quick Start](getting-started/quickstart)** - Index your first repo in 5 minutes
3. **[MCP Integration](features/mcp)** - Connect to Claude Code or Codex
4. **[Learning Reranker](features/learning-reranker)** - Train a custom model on your code
5. **[API Reference](api/reference)** - Explore all HTTP endpoints

## Philosophy

AGRO is built on these principles:

1. **Accessibility First**: GUI for everything. No "just edit the config file" gatekeeping.
2. **Local-First**: Your code never leaves your machine (unless you want cloud models).
3. **Transparent Costs**: Know exactly what you'll pay before you click "run".
4. **Self-Improving**: The system gets better as you use it.
5. **Production Ready**: Not a demo. Includes evals, monitoring, regression tracking.
6. **Developer Focused**: Made by developers, for developers, with actual workflows in mind.

**Token limits shouldn't decide when you can code. AGRO makes sure they don't.**
