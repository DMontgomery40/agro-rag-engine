# 📚 AGRO Documentation

This is the long‑form reference that pairs with the streamlined, tech‑forward README. Everything config‑related is done in the Settings GUI — not by editing code. If you can’t find a knob, it belongs in the “Misc” tab.

- Start Here

- Launch everything (infra + MCP + API + GUI):
  - `cd agro/scripts/ && ./dev_up.sh`
  - Open the GUI at `http://127.0.0.1:8012/` (server/app.py:1-27)
  - Configure settings in the GUI and click “Apply All Changes.”

## Navigation

- Quickstart for agents (Codex/Claude): [QUICKSTART_MCP.md](QUICKSTART_MCP.md)
- **Complete API Reference**: [API_REFERENCE.md](API_REFERENCE.md) ← **Start here for API docs**
- **Learning Reranker System**: [LEARNING_RERANKER.md](LEARNING_RERANKER.md) ← **Improve search quality with feedback**
- Settings UI & API contract: [API_GUI.md](API_GUI.md)
- CLI Chat usage: [CLI_CHAT.md](CLI_CHAT.md)
- Performance & cost tuning: [PERFORMANCE_AND_COST.md](PERFORMANCE_AND_COST.md)
- Model choices & comparisons: [MODEL_RECOMMENDATIONS.md](MODEL_RECOMMENDATIONS.md), [GEN_MODEL_COMPARISON.md](GEN_MODEL_COMPARISON.md)
- LangSmith setup (traces): [LANGSMITH_SETUP.md](LANGSMITH_SETUP.md)
- Remote MCP (HTTP): [REMOTE_MCP.md](REMOTE_MCP.md)

## Indexing & Repos

- Indexer entry point: indexer/index_repo.py
- Shared index profile helper: scripts/select_index.sh
- Repo config persistence: POST /api/config (server/app.py:1-27)

## HTTP API (local)

- FastAPI app with GUI + REST: server/app.py:1-27
- Core routes: `/health`, `/search`, `/answer`, `/answer_stream`, `/api/*`

## MCP Tools (for agents)

- Stdio server: server/mcp/server.py:1-24
- Tools exposed:
  - `rag_search(repo, question, top_k)`
  - `rag_answer(repo, question)`

## Evals & Tracing

- Eval harness: eval/eval_loop.py
- Golden tests: golden.json
- Local traces and LangSmith integration: server/tracing.py, docs/LANGSMITH_SETUP.md

## Assets

The root `assets/` folder contains screenshots you can embed in issues, PRs, or external docs:
- assets/dashboard.png, assets/chat_built_in.png, assets/tune_and_trace.png, assets/evals.png, assets/storage_calc.png

For the high‑level overview and positioning, see ../README.md.

**Start here if:** You're setting up from scratch or need comprehensive reference.

---

## Onboarding Wizard (5 steps)

Links to the wizard carousel images used in onboarding. Open each to view full size.

- [Step 1](../assets/onboarding_carosel/step1.png)
- [Step 2](../assets/onboarding_carosel/step2.png)
- [Step 3](../assets/onboarding_carosel/step3.png)
- [Step 4](../assets/onboarding_carosel/step4.png)
- [Step 5](../assets/onboarding_carosel/step5.png)

These are referenced from the main README as links only (no inline gallery).

### MCP Integration

#### [QUICKSTART_MCP.md](QUICKSTART_MCP.md) - Fast MCP Setup (149 lines)
**5-minute quick reference for connecting AI agents.**

**Contents:**
- ✅ Essential commands
- ✅ Codex CLI registration
- ✅ Claude Code configuration
- ✅ Quick examples
- ✅ Common troubleshooting

**Start here if:** You want to connect Codex or Claude Code quickly.

---

#### [MCP_README.md](MCP_README.md) - Complete MCP Reference (244 lines)
**Comprehensive technical documentation for the MCP server.**

**Contents:**
- ✅ MCP protocol details (JSON-RPC 2.0)
- ✅ Tool specifications:
  - `rag_answer(repo, question)` - Full pipeline with citations
  - `rag_search(repo, question, top_k)` - Retrieval only
  - `netlify_deploy(domain)` - Trigger Netlify builds
  - `web_get(url, max_bytes)` - HTTP GET for allowlisted docs
- ✅ stdio mode (for local agents)
- ✅ Integration examples
- ✅ Agent behavior rules
- ✅ Complete troubleshooting

**Start here if:** You need technical MCP details or are implementing custom integrations.

---

#### [REMOTE_MCP.md](REMOTE_MCP.md) - Remote MCP Setup (55 lines)
**Expose MCP over HTTP/HTTPS for remote agents and platforms.**

**Contents:**
- ✅ HTTP mode setup (`mcp_server_http.py`)
- ✅ HTTPS with reverse proxy (Caddy/Nginx)
- ✅ Configuration examples
- ✅ Security considerations
- ✅ Tunneling (ngrok/Cloudflare - coming soon)

**Start here if:** You need remote agent access or production HTTPS deployment.

---

### Search Quality & Training

#### [LEARNING_RERANKER.md](LEARNING_RERANKER.md) - Learning Reranker System (~500 lines)
**Continuously improve search quality through user feedback and model training.**

**Contents:**
- ✅ Feedback collection (clicks, thumbs up/down)
- ✅ Training workflow:
  - Mine triplets from logs or golden.json
  - Train cross-encoder models
  - Evaluate with MRR and Hit@K metrics
  - Promote models to production
- ✅ API endpoints for reranker management
- ✅ Hot-reloading without server restart
- ✅ GUI integration with feedback buttons
- ✅ Configuration options (backends, model paths)
- ✅ Troubleshooting and optimization
- ✅ Integration at retrieval/hybrid_search.py:170

**Start here if:** You want AGRO to learn from usage and improve search ranking over time.

---

### Interactive Usage

#### [CLI_CHAT.md](CLI_CHAT.md) - CLI Chat Interface (173 lines)
**Interactive terminal chat with conversation memory.**

**Contents:**
- ✅ Installation and setup
- ✅ Commands reference
- ✅ Features:
  - Redis-backed conversation memory
  - Rich terminal UI with markdown
  - Citation display
  - Repo switching mid-conversation
- ✅ Configuration options
- ✅ Multiple conversation management
- ✅ Troubleshooting
- ✅ Integration with other tools

**Start here if:** You want an interactive chat interface instead of API/MCP calls.

---

### Model Selection & Cost

#### [MODEL_RECOMMENDATIONS.md](MODEL_RECOMMENDATIONS.md) - Model Guide (589 lines)
**Comprehensive guide to embeddings and generation models (updated Oct 2025).**

⚠️ **Note**: Model pricing and rankings change frequently. This guide was accurate as of October 8, 2025 but may be outdated. Always check official sources and current benchmarks.

**Contents:**
- ✅ **20+ embedding models** with comparisons
  - Cloud APIs: OpenAI, Google Gemini, Voyage AI, Cohere
  - Self-hosted: nomic-embed-text, BGE-M3, NV-Embed-v2, Stella
- ✅ **15+ inference/generation models**
  - Cloud: GPT-4o, Gemini 2.5, Claude 4
  - Self-hosted: Qwen 2.5-Coder, DeepSeek-Coder, Code Llama
- ✅ Hardware-specific recommendations
  - Mac M1/M2/M3/M4 (different RAM configs)
  - NVIDIA GPU (16GB, 24GB, 40GB+ VRAM)
  - CPU-only setups
- ✅ Cost/performance analysis
- ✅ Migration guides with code examples
- ✅ ROI calculations
- ✅ Links to current benchmarks

**Benchmark Links (check for latest rankings):**
- [MTEB Leaderboard](https://huggingface.co/spaces/mteb/leaderboard) - Embedding models
- [OpenLLM Leaderboard](https://huggingface.co/spaces/HuggingFaceH4/open_llm_leaderboard) - Generation models

**Start here if:** You want to save money, run locally, or understand model options.

---

#### [GEN_MODEL_COMPARISON.md](GEN_MODEL_COMPARISON.md) - Qwen vs OpenAI (48 lines)
**Head-to-head comparison between local Qwen 3 and OpenAI models.**

**Contents:**
- ✅ Test methodology
- ✅ How to run comparisons
- ✅ Measuring latency and token usage
- ✅ Configuration for both models

**Start here if:** You're deciding between local (Qwen) and cloud (OpenAI) generation.

---

#### [PERFORMANCE_AND_COST.md](PERFORMANCE_AND_COST.md) - Real-World Metrics (169 lines)
**Measured performance and cost data from production usage.**

**Contents:**
- ✅ **Real measurements** (not estimates):
  - RAG via MCP: **99% token reduction** vs Claude alone
  - $86/month saved at 100 queries/day (OpenAI)
  - $95/month saved with local Qwen
- ✅ Per-query cost breakdown
- ✅ Monthly cost projections
- ✅ ROI calculator
- ✅ Scaling considerations
- ✅ When to use local vs cloud
- ✅ Optimization tips
- ✅ Monitoring and tracking

**Start here if:** You want hard numbers on costs and performance.

---

### Operations & Monitoring

#### [../README.md](../README.md) - Operations Section
**Daily workflows, troubleshooting, and monitoring.**

**Contents:**
- ✅ Morning startup routine
- ✅ Re-indexing after code changes
- ✅ Debugging bad answers
- ✅ Testing MCP tools manually
- ✅ Infrastructure troubleshooting
- ✅ Retrieval quality tuning

**Start here if:** You're running this in production or need to debug issues.

---

## 🎯 Documentation by Use Case

### "I want to get this running NOW"
1. [../README.md](../README.md) → Quick Start section
2. [QUICKSTART_MCP.md](QUICKSTART_MCP.md) → Connect your agent

### "I want an interactive chat interface"
1. [../README.md](../README.md) → CLI Chat Interface section
2. [CLI_CHAT.md](CLI_CHAT.md) → Full CLI guide

### "I want to save money on API costs"
1. [PERFORMANCE_AND_COST.md](PERFORMANCE_AND_COST.md) → See the savings
2. [MODEL_RECOMMENDATIONS.md](MODEL_RECOMMENDATIONS.md) → Pick free/local models

### "I want to run 100% locally (no API calls)"
1. [MODEL_RECOMMENDATIONS.md](MODEL_RECOMMENDATIONS.md) → Self-Hosted section
2. [../README.md](../README.md) → Model Selection section

### "I need to connect Codex or Claude Code"
1. [QUICKSTART_MCP.md](QUICKSTART_MCP.md) → 5-minute setup
2. [MCP_README.md](MCP_README.md) → Detailed reference if needed

### "I need remote/HTTP access for agents"
1. [REMOTE_MCP.md](REMOTE_MCP.md) → HTTP/HTTPS setup
2. [MCP_README.md](MCP_README.md) → Tool specifications

### "Files aren't being indexed correctly"
1. [../README.md](../README.md) → Configure RAG Ignore section
2. Check `../data/exclude_globs.txt`
3. Run `../scripts/analyze_keywords.py` to analyze your repo

### "I want to understand what this system does"
1. [PERFORMANCE_AND_COST.md](PERFORMANCE_AND_COST.md) → See the benefits
2. [../README.md](../README.md) → Architecture section

### "I want to improve search quality over time"
1. [LEARNING_RERANKER.md](LEARNING_RERANKER.md) → Full training workflow
2. Collect feedback by using AGRO and clicking results
3. Run the training cycle when you have enough data

### "Something's not working"
1. [../README.md](../README.md) → Troubleshooting section
2. [QUICKSTART_MCP.md](QUICKSTART_MCP.md) → MCP-specific issues

---

## 📄 File Reference

### Documentation Files

| File | Lines | Purpose |
|------|-------|---------|
| **[../README.md](../README.md)** | 1105 | Main setup guide, complete reference |
| **[MODEL_RECOMMENDATIONS.md](MODEL_RECOMMENDATIONS.md)** | 589 | Model selection, pricing, hardware reqs |
| **[LEARNING_RERANKER.md](LEARNING_RERANKER.md)** | ~500 | Learning reranker, feedback, training |
| **[MCP_README.md](MCP_README.md)** | 244 | Complete MCP technical reference |
| **[CLI_CHAT.md](CLI_CHAT.md)** | 173 | Interactive CLI chat guide |
| **[PERFORMANCE_AND_COST.md](PERFORMANCE_AND_COST.md)** | 169 | Real-world metrics and ROI |
| **[QUICKSTART_MCP.md](QUICKSTART_MCP.md)** | 149 | Fast MCP setup (5 min) |
| **[REMOTE_MCP.md](REMOTE_MCP.md)** | 55 | HTTP/HTTPS/tunneling |
| **[GEN_MODEL_COMPARISON.md](GEN_MODEL_COMPARISON.md)** | 48 | Qwen vs OpenAI comparison |
| **TOTAL** | **~3000+** | **Complete documentation** |

### Other Key Files

| File | Purpose |
|------|---------|
| **[../START_HERE.md](../START_HERE.md)** | Navigation hub, quick start options |
| **[../AGENTS.md](../AGENTS.md)** | Agent behavior rules and guidelines |
| **[../golden.json](../golden.json)** | Eval test cases (replace with yours) |
| **[../.env](../.env)** | Environment configuration |
| **[../data/exclude_globs.txt](../data/exclude_globs.txt)** | `.ragignore` patterns |

---

## 🎓 Learning Path

**Recommended reading order for new users:**

1. **Understand the value** → [PERFORMANCE_AND_COST.md](PERFORMANCE_AND_COST.md) (5 min)
2. **Get it running** → [../README.md](../README.md) Quick Start (10 min)
3. **Configure filtering** → [../README.md](../README.md) Configure RAG Ignore (5 min)
4. **Try it out** → [CLI_CHAT.md](CLI_CHAT.md) or [QUICKSTART_MCP.md](QUICKSTART_MCP.md) (5 min)
5. **Optimize costs** → [MODEL_RECOMMENDATIONS.md](MODEL_RECOMMENDATIONS.md) (20 min)

---

## 🔗 External Resources

- **MCP Specification**: https://modelcontextprotocol.io/
- **Codex CLI**: https://github.com/openai/codex
- **LangGraph**: https://python.langchain.com/docs/langgraph
- **Qdrant**: https://qdrant.tech/documentation/
- **MTEB Leaderboard**: https://huggingface.co/spaces/mteb/leaderboard
- **Ollama**: https://ollama.ai/

---

## 📦 System Defaults

**Current configuration in this repo:**

- **Generation**: Qwen 3 via Ollama (local, self-hosted)
  - Set via `GEN_MODEL` and `OLLAMA_URL`
  - Falls back to OpenAI if configured
  
- **Embeddings**: OpenAI text-embedding-3-large (cloud)
  - Auto-falls back to local BGE-small if unavailable
  
- **Reranking**: Cohere rerank-3.5 (cloud)
  - Set via `RERANK_BACKEND=cohere`, `COHERE_RERANK_MODEL=rerank-3.5`
  - Falls back to local cross-encoder if no API key

See [MODEL_RECOMMENDATIONS.md](MODEL_RECOMMENDATIONS.md) to change any of these.

---

## 💡 Quick Tips

- **All docs are cross-linked** - Follow the links to jump between topics
- **Check the main README first** - It's the most comprehensive reference
- **Model pricing changes fast** - Always verify current costs
- **Use the scripts folder** - Auto-generate keywords for your repos
- **Start with CLI chat** - Easiest way to test the system interactively

---

**Last Updated**: October 8, 2025  
**Version**: 2.0.0

**Questions?** All documentation is designed to be self-service. Start with the [main README](../README.md) or pick the doc that matches your use case above.
