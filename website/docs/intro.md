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

## AGRO Solves This

**91% token reduction**: 12,700 tokens → 1,141 tokens per query
**11x more queries**: 100/week → 1,110/week on the same plan
**Same answer quality**: RAG context matches or beats file reading
**2-3x faster**: No file I/O overhead

### Real-World Impact

```
Without AGRO:
- Monday: 40 queries (508,000 tokens)
- Tuesday: 35 queries (444,500 tokens)
- Wednesday: 25 queries (317,500 tokens)
- Thursday: RATE LIMITED 🚫
- Friday: RATE LIMITED 🚫

With AGRO:
Monday-Friday: Code freely
200+ queries per week, zero rate limits
Never think about token usage again
```

## What is AGRO?

AGRO is **NOT just another RAG engine.** It's a complete, production-ready development workspace:

- **Hybrid RAG**: BM25 + vector search + reranking (not "just throw it at a vector DB")
- **Self-learning reranker**: Gets smarter as you use it
- **GUI-first**: Every feature accessible (ADA-compliant accessibility design)
- **Embedded VS Code**: Edit code right in the browser
- **Grafana telemetry**: Custom dashboards with alerting
- **Multi-transport MCP**: HTTP, SSE, STDIO, WebSocket
- **Cost estimation**: Know what you'll pay before clicking "run"
- **Zero to production**: Evals, monitoring, regression tracking included

![AGRO Dashboard](/img/screenshots/dashboard.png)

## Quick Start

```bash
git clone https://github.com/DMontgomery40/agro-rag-engine.git
cd agro-rag-engine
make dev

# Starts: Docker infra, MCP server, API, and GUI
# GUI at http://127.0.0.1:8012/
```

The onboarding wizard walks you through:
1. Adding your repositories
2. Configuring models (local or cloud)
3. Running your first index
4. Testing retrieval quality
5. Connecting to Claude Code/Codex

**That's it.** No config file editing. No terminal-only gatekeeping. Everything has a GUI.

## Key Features

### Hybrid Search That Actually Works

Not "throw embeddings at Qdrant and hope":

```
Query → Multi-Query Expansion (4 variants)
  ↓
Parallel Retrieval:
  ├─ BM25 Sparse (keyword matching)
  ├─ Dense Vectors (semantic similarity)
  └─ Semantic Cards (conceptual summaries)
  ↓
Reciprocal Rank Fusion
  ↓
Cross-Encoder Reranking
  ↓
Path/Layer/Language Bonuses
  ↓
Top-K Results with Citations
```

**Why this matters:** Code isn't prose. You need exact matches (BM25) AND semantic understanding (vectors) AND learned preferences (reranker). AGRO does all three.

### Self-Learning Reranker

Every click, every thumbs-up, every query trains your custom model:

```
User Feedback → Triplet Mining → Model Training → Eval → Auto-Promotion
```

![Learning Reranker Pipeline](/img/screenshots/learning%20reranker%20pt%201.png)

**Full pipeline included:**
- Automatic feedback collection
- Triplet mining from logs + golden questions
- Cross-encoder training with sentence-transformers
- MRR and Hit@K evaluation
- Hot-reload deployment (no server restart)

![Reranker Training](/img/screenshots/learning%20reranker%20pt%202.png)

### GUI-First Design (Accessibility Requirement)

**Every feature is accessible through the GUI.** This isn't an afterthought—it's an ADA compliance requirement for users with dyslexia and accessibility needs.

![Settings & Profiles](/img/screenshots/settings%20tab-%20profiles%20subtab.png)

- **Settings management**: All env vars, repo configs, model selection
- **Cost estimation**: See exactly what your config will cost
- **Storage calculator**: Plan index size and disk usage
- **Evaluation interface**: Run tests, compare baselines
- **Real-time metrics**: Grafana dashboards embedded
- **VS Code integration**: Optional embedded editor

![Embedded VS Code](/img/screenshots/dev%20tools%20-%20editor%20-%20embedded%20vscode%20editor%20-%20way%20cool.png)

![Cost Estimation](/img/screenshots/analystics%20tab%20-%20cost%20subtab.png)

### Multi-Transport MCP

Most MCP servers only do STDIO. AGRO supports **four transports**:

- **STDIO**: Local Claude Code, Codex CLI
- **HTTP**: Remote agents, web platforms
- **SSE**: Streaming responses
- **WebSocket**: Real-time bidirectional

**Per-transport configuration:** HTTP gets GPT-4o-mini (cheap), STDIO gets Qwen3-Coder 30B (free local).

### Complete Observability

![Grafana Telemetry](/img/screenshots/matrics%20-%20embedded%20grafana%20dash.png)

- **Grafana dashboards**: Request rates, latency, cache hits
- **Prometheus metrics**: Full pipeline instrumentation
- **LangSmith tracing**: See what the LLM saw
- **Query logging**: Every search tracked for training
- **Cost tracking**: Know exactly what you're spending

![Chat Interface](/img/screenshots/chat%20tab.png)

## Model Flexibility

**Cloud options:**
- OpenAI (GPT-4o, embeddings)
- Anthropic Claude (Haiku, Sonnet, Opus)
- Google Gemini (Flash 2.5, Pro 2.5)
- Cohere (rerank-3.5)
- Voyage AI (embeddings)

**Local options:**
- Ollama (Qwen3-Coder, DeepSeek-Coder)
- MLX (Apple Silicon optimized—uses Metal GPU)
- Sentence Transformers (BGE, NV-Embed, Nomic)
- HuggingFace cross-encoders

**Mix and match:**
```yaml
embedding: text-embedding-3-large  # Cloud
generation: qwen3-coder:30b        # Local (Ollama/MLX)
reranking: local cross-encoder     # Local
```

**Zero API cost is possible.** Or cloud-only. Or hybrid. Your choice.

## What Makes AGRO Different

### 1. Production-Ready Out of the Box

Not a demo. Includes:
- **Evaluation harness**: Golden question sets with baseline comparison
- **Regression tracking**: Detect when changes break retrieval
- **Grafana alerts**: Get notified when quality degrades
- **Cost tracking**: Know what you're spending
- **Incremental indexing**: Only re-index changed files

### 2. Accessibility First

GUI for everything. No "just edit the YAML file" gatekeeping. ADA-compliant design for dyslexia and accessibility needs.

### 3. Local-First

Your code never leaves your machine (unless you want cloud models). Use 100% local models for zero API cost and complete privacy.

### 4. Transparent Costs

See exactly what you'll pay **before** clicking "run":
- Embedding cost: $X.XX
- Card generation: $X.XX
- Query cost per 100: $X.XX
- Monthly estimate: $X.XX

### 5. Self-Improving

The system gets better as you use it. Every click trains the reranker. Auto-promotion when new models beat baseline.

### 6. Developer-Focused

Made by developers, for developers, with actual workflows in mind:
- CLI chat with memory
- Code citations with line numbers
- Confidence scores
- Repository switching mid-conversation
- Rich terminal UI with Markdown

## What's Included

- **4 MCP servers**: STDIO, HTTP, SSE, WebSocket
- **FastAPI backend**: Complete REST API
- **LangGraph pipeline**: Stateful retrieval with Redis
- **Hybrid search**: BM25S + Qdrant + cross-encoder
- **AST-aware indexer**: Respects function boundaries
- **CLI chat**: Interactive terminal with memory
- **Eval harness**: Golden tests + baseline comparison
- **Reranker training**: Full ML pipeline
- **GUI**: Complete web interface
- **Grafana**: Pre-configured dashboards + alerts
- **Docker Compose**: Qdrant, Redis, Prometheus, Grafana
- **Scripts**: Index management, eval automation

## Next Steps

Ready to code without rate limits?

1. **[Installation Guide](getting-started/installation)** - Set up AGRO from scratch
2. **[Quick Start](getting-started/quickstart)** - Index your first repo in 5 minutes
3. **[MCP Integration](features/mcp)** - Connect to Claude Code or Codex
4. **[RAG System](features/rag)** - Understand the hybrid search architecture
5. **[API Reference](api/endpoints)** - Explore all HTTP endpoints

## Philosophy

AGRO is built on these principles:

1. **Accessibility First**: GUI for everything. No gatekeeping.
2. **Local-First**: Your code stays on your machine.
3. **Transparent Costs**: Know what you'll pay before running.
4. **Self-Improving**: Gets better as you use it.
5. **Production Ready**: Evals, monitoring, regression tracking included.
6. **Developer Focused**: Real workflows, not demos.

**Token limits shouldn't decide when you can code. AGRO makes sure they don't.**
