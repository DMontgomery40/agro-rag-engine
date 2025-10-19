---
sidebar_position: 1
slug: /
---

# Welcome to AGRO

## The Token Crisis is Real

You love Claude Code. You love Copilot. But you **hate** this wall:

```
⛔ Rate limit exceeded
You've used 1.27M tokens this week
Try again Monday
```

**The math is brutal:**
- Claude Pro: $200/month
- Weekly limit: 1.27M tokens (Sonnet), 300K (Opus)
- One complex query: **12,700+ tokens**
- **Result: 100 queries per week MAX**

That's 14 queries per day. If you code for 8 hours, that's less than **2 queries per hour**.

**Stop. Coding. When. You. Hit. Limits.**

## AGRO Solves This

AGRO is a **hybrid RAG engine** that reduces token usage by **91%** while maintaining the same answer quality:

**Without AGRO (Claude Code alone):**
- Reads 10-15 full files per query
- Burns 12,700 tokens
- Hits rate limit by Wednesday
- No coding Thursday/Friday

**With AGRO (Claude Code + RAG):**
- Returns 5-10 relevant chunks
- Burns 1,141 tokens (91% reduction)
- **11x more queries on same plan**
- Code all week, zero limits

### Real-World Impact

```
Without AGRO:
Monday:    40 queries → 508,000 tokens
Tuesday:   35 queries → 444,500 tokens
Wednesday: 25 queries → 317,500 tokens
Thursday:  🚫 RATE LIMITED
Friday:    🚫 RATE LIMITED

With AGRO:
Monday-Friday: 200+ queries, ZERO rate limits
```

![AGRO Dashboard](/img/screenshots/dashboard.png)

## Not Just Another RAG Engine

AGRO isn't "throw embeddings at Qdrant and hope." It's a **complete development workspace**:

### 1. Hybrid Search That Actually Works

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

**Why this matters for code:** You need exact matches (BM25) AND semantic understanding (vectors) AND learned preferences (reranker). AGRO does all three.

**Proof:**

| Method | Top-1 Accuracy | MRR |
|--------|----------------|-----|
| Hybrid (AGRO) | 82% | 0.88 |
| Dense only | 68% | 0.74 |
| BM25 only | 61% | 0.69 |

### 2. Self-Learning Reranker

Every click, every thumbs-up, every query **trains your custom model**:

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

**Impact:** MRR jumps from 0.72 → 0.88 on the AGRO codebase itself.

![Reranker Training](/img/screenshots/learning%20reranker%20pt%202.png)

### 3. GUI-First (Accessibility Requirement)

**Every feature is accessible through the GUI.** This isn't optional—it's an **ADA compliance requirement** for users with dyslexia and accessibility needs.

![Settings & Profiles](/img/screenshots/settings%20tab-%20profiles%20subtab.png)

No "just edit the YAML file" gatekeeping:
- Settings management for all env vars, repo configs, model selection
- Cost estimation (see what you'll pay before clicking "run")
- Storage calculator (plan index size and disk usage)
- Evaluation interface (run tests, compare baselines)
- Real-time Grafana metrics embedded
- Optional VS Code integration

![Embedded VS Code](/img/screenshots/dev%20tools%20-%20editor%20-%20embedded%20vscode%20editor%20-%20way%20cool.png)

![Cost Estimation](/img/screenshots/analystics%20tab%20-%20cost%20subtab.png)

### 4. Multi-Transport MCP

Most MCP servers only do STDIO. AGRO supports **four transports**:

- **STDIO**: Local Claude Code, Codex CLI
- **HTTP**: Remote agents, web platforms
- **SSE**: Streaming responses
- **WebSocket**: Real-time bidirectional

**Per-transport configuration:** HTTP gets GPT-4o-mini (cheap), STDIO gets Qwen3-Coder 30B (free local).

### 5. Complete Observability

![Grafana Telemetry](/img/screenshots/matrics%20-%20embedded%20grafana%20dash.png)

- **Grafana dashboards**: Request rates, latency, cache hits
- **Prometheus metrics**: Full pipeline instrumentation
- **LangSmith tracing**: See what the LLM saw
- **Query logging**: Every search tracked for training
- **Cost tracking**: Know exactly what you're spending

![Chat Interface](/img/screenshots/chat%20tab.png)

## Production-Ready Out of the Box

Not a demo. Includes:

- **Evaluation harness**: Golden question sets with baseline comparison
- **Regression tracking**: Detect when changes break retrieval
- **Grafana alerts**: Get notified when quality degrades
- **Cost tracking**: Know what you're spending
- **Incremental indexing**: Only re-index changed files
- **Backup/restore**: Full data recovery procedures
- **Docker Compose**: All infrastructure pre-configured

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

## What Makes AGRO Different

### 1. Accessibility First

GUI for everything. No "just edit the YAML file" gatekeeping. ADA-compliant design for dyslexia and accessibility needs.

### 2. Local-First

Your code never leaves your machine (unless you want cloud models). Use 100% local models for zero API cost and complete privacy.

### 3. Transparent Costs

See exactly what you'll pay **before** clicking "run":
- Embedding cost: $X.XX
- Card generation: $X.XX
- Query cost per 100: $X.XX
- Monthly estimate: $X.XX

### 4. Self-Improving

The system gets better as you use it. Every click trains the reranker. Auto-promotion when new models beat baseline.

### 5. Developer-Focused

Made by developers, for developers, with actual workflows in mind:
- CLI chat with memory
- Code citations with line numbers
- Confidence scores
- Repository switching mid-conversation
- Rich terminal UI with Markdown

### 6. Zero Hallucination Tolerance

**Confidence gating** prevents LLM hallucination:
- Gate answers on rerank-based confidence scores
- Rewrite query or return safe fallback when confidence is low
- **Result:** Zero hallucinated answers across golden test suite

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

## Performance Benchmarks

**Token savings:**
```
Query: "Where is OAuth processed in this repo,
        and which plugins must validate with it?"

Without RAG: 12,700 tokens (read 10 files)
With RAG:     1,141 tokens (5 relevant chunks)
Savings:      91% reduction
```

**Speed:**
```
Hybrid Search:     200ms (BM25 + Qdrant + RRF)
Reranking:         150ms (local cross-encoder)
LLM Generation:    2-5s  (Ollama Qwen3 30B local)
Total:             2.5-5.5s

Same speed as Claude reading 10 files, 11x more queries/week
```

**Accuracy (Golden Test Suite):**
```
Top-1 Accuracy:  82%
Top-5 Accuracy:  95%
MRR:             0.88
Retrieval confidence matches or beats file reading
```

## Cost Comparison

**Claude Pro without AGRO:**
- $200/month
- 100 complex queries/week MAX
- Hit limits by Wednesday
- Zero coding Thu/Fri

**Claude Pro with AGRO (local models):**
- $200/month (same)
- 1,100+ queries/week (11x more)
- Code all week
- Zero API costs (100% local)

**Claude Pro with AGRO (cloud models):**
- $200/month + ~$15/month (embeddings + LLM calls)
- 1,100+ queries/week (11x more)
- Code all week
- Still massive savings vs hitting limits

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
