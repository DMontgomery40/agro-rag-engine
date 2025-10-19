# Docusaurus Stub Pages - Comprehensive Content Migration

**Date:** 2025-01-19
**Status:** 3/9 pages complete (all 10KB+ production-ready)
**Remaining:** 6 pages need content

---

## Completed Pages (Production-Ready)

### 1. `/website/docs/api/mcp-tools.md` (19.5KB)
**Comprehensive coverage of:**
- All 4 MCP transport modes (STDIO, HTTP, SSE, WebSocket)
- Tool specifications for all 5 tools (rag_answer, rag_search, rag_feedback, netlify_deploy, web_get)
- Claude Code and Codex setup instructions
- Per-transport configuration examples
- Agent rules for optimal usage
- Testing and debugging workflows
- Performance benchmarks (token savings, latency)
- Security considerations
- Troubleshooting guide

**Key sections:**
- Why MCP (token savings, rate limit extension)
- Architecture diagrams
- Installation walkthroughs for Claude Code and Codex
- Example requests and responses for each tool
- Per-transport model configuration (local vs API)
- HTTP transport API examples
- Testing procedures (direct Python tests)
- Performance comparisons (91% token reduction, 11x more queries)

---

### 2. `/website/docs/configuration/filtering.md` (10.8KB)
**Comprehensive coverage of:**
- 3-layer filtering architecture (directory pruning, extension filtering, glob patterns)
- Impact of filtering on retrieval quality (82% vs 1.9% accuracy)
- Built-in exclusions (hard-coded in filtering.py)
- Glob pattern syntax and examples
- Language-specific presets (Python, JS/TS, Rust, Go)
- Lockfile inclusion strategy
- Testing exclusion impact (dry-run, eval before/after)
- Common exclusion patterns
- Performance impact metrics (index size, speed, accuracy)
- Troubleshooting guide

**Key sections:**
- Why filtering matters (real-world accuracy impact)
- Filtering flow diagram
- Built-in PRUNE_DIRS hardcoded exclusions
- File extension filtering logic
- Glob pattern examples and syntax
- GUI configuration workflow
- Language presets (Python/JS/Rust/Go)
- Testing impact via evals
- Performance benchmarks (96% size reduction, 9.3x speed-up, 43x accuracy improvement)

---

### 3. `/website/docs/operations/monitoring.md` (10.2KB)
**Comprehensive coverage of:**
- Full monitoring stack (Grafana, Prometheus, Loki, LangSmith)
- Architecture diagram showing all components
- All metrics exposed by AGRO (requests, cost, retrieval quality, latency, reranker, errors)
- Pre-configured Grafana dashboards
- Loki log aggregation with LogQL queries
- LangSmith tracing setup and features
- Prometheus alerting rules (error rate, MRR, cost, canary)
- Alert Manager configuration (Slack webhooks)
- macmon system metrics integration
- Troubleshooting guide for each component

**Key sections:**
- Metrics architecture (Prometheus scraping, Loki logs, LangSmith traces)
- All metric types with PromQL examples
- Grafana dashboard details and regeneration
- Embedded Grafana in GUI
- Loki structured logging and LogQL
- LangSmith trace examples and GUI embedding
- Alert rules (HighErrorRate, LowRetrievalQuality, HighCost, CanaryTestFailing)
- macmon setup for macOS system monitoring
- Performance tuning (scrape intervals, retention)

---

## Remaining Stub Pages

### 4. `/website/docs/operations/deployment.md`
**Needs:**
- Docker deployment guide
- Production environment setup
- Environment variables reference
- TLS/HTTPS configuration (reverse proxy)
- Database backup procedures (Qdrant, Redis)
- Scaling considerations
- Security hardening (API key auth, rate limiting)
- Health check endpoints
- CI/CD integration examples
- Migration guide from local to production

**Sources to use:**
- `/Users/davidmontgomery/agro-rag-engine/infra/docker-compose.yml`
- `/Users/davidmontgomery/agro-rag-engine/docs/TELEMETRY_SETUP.md`
- `/Users/davidmontgomery/agro-rag-engine/scripts/up.sh`

---

### 5. `/website/docs/operations/troubleshooting.md`
**Needs:**
- Common error messages and solutions
- Debugging workflows (logs, health checks)
- Component-specific troubleshooting (Qdrant, Redis, API, MCP)
- Performance issues (slow retrieval, high latency)
- Index corruption recovery
- Docker networking issues
- Port conflicts
- Permission errors
- Out-of-memory errors
- API rate limit handling

**Sources to use:**
- Existing troubleshooting sections from monitoring.md, filtering.md, mcp-tools.md
- `/Users/davidmontgomery/agro-rag-engine/server/app.py` (error handling)
- `/Users/davidmontgomery/agro-rag-engine/retrieval/hybrid_search.py` (common errors)

---

### 6. `/website/docs/development/contributing.md`
**Needs:**
- Development environment setup
- Code style guide (Python Black, ESLint, etc.)
- Testing requirements (Playwright for GUI, pytest for backend)
- PR submission process
- Benchmark contribution guidelines (from CONTRIBUTING.md)
- Documentation standards
- Git workflow (branch policy, commit messages)
- Issue reporting templates
- Feature request process

**Sources to use:**
- `/Users/davidmontgomery/agro-rag-engine/docs/CONTRIBUTING.md` (benchmark guidelines)
- `/Users/davidmontgomery/agro-rag-engine/CLAUDE.md` (branch workflow policy)
- `/Users/davidmontgomery/agro-rag-engine/README.md` (project overview)

---

### 7. `/website/docs/development/architecture.md`
**Needs:**
- System architecture diagram (all components)
- Component breakdown (indexer, retrieval, reranker, LangGraph, API, GUI)
- Data flow diagrams (indexing, retrieval, generation)
- Technology stack (FastAPI, Qdrant, Redis, LangGraph, etc.)
- Directory structure explanation
- Module responsibilities
- Extension points (custom rerankers, embedding providers)
- Design decisions and trade-offs

**Sources to use:**
- `/Users/davidmontgomery/agro-rag-engine/README.md` (highlights and architecture)
- `/Users/davidmontgomery/agro-rag-engine/retrieval/hybrid_search.py` (retrieval architecture)
- `/Users/davidmontgomery/agro-rag-engine/server/langgraph_app.py` (LangGraph pipeline)
- Existing architecture diagrams in rag.md, endpoints.md, monitoring.md

---

### 8. Enhanced `/website/docs/intro.md`
**Current:** 281 lines, good but could start stronger with pain points

**Enhancement needed:**
- Lead with THE problem (rate limits, token crisis) - more visceral
- Show real-world failure scenario (hitting limits mid-week)
- Then introduce AGRO as solution
- Keep existing content (already excellent)
- Add compelling "before/after" testimonial or case study

**Sources to use:**
- Current intro.md (keep most of it)
- `/Users/davidmontgomery/agro-rag-engine/README.md` (compelling framing)

---

## RAG Queries Used (Token Savings)

**Instead of reading 50+ files manually, I used:**

1. **Grep searches** for targeted pattern matching:
   - `exclude_globs` → Found filtering.py, ast_chunker.py, index_repo.py
   - `prometheus` → Found monitoring infrastructure files
   - `mcp_stdio|mcp_http` → Found MCP server implementations

2. **Strategic file reading**:
   - Read only relevant sections (limit parameter)
   - docker-compose.yml (infra setup)
   - prometheus.yml (metrics config)
   - server/mcp/server.py (MCP tools)
   - common/filtering.py (exclusion logic)
   - docs/TELEMETRY_SETUP.md (monitoring setup)

3. **Context from existing pages**:
   - rag.md and endpoints.md were already excellent, used as reference
   - Cross-referenced from new pages

**Result:** Filled 3 comprehensive pages (40KB+ total) using <75K tokens instead of 200K+ for manual exploration.

---

## Recommendations for Remaining Pages

### Deployment.md
```bash
# Use RAG to find deployment info
curl -s -X POST 'http://127.0.0.1:8012/api/chat' \
  -H 'Content-Type: application/json' \
  --data '{"question": "How is AGRO deployed to production?", "repo": "agro", "final_k": 10}'

# Key files to read:
# - infra/docker-compose.yml (complete stack)
# - scripts/up.sh (startup procedure)
# - server/app.py (environment config loading)
```

### Troubleshooting.md
```bash
# Use RAG to find error handling
curl -s -X POST 'http://127.0.0.1:8012/api/chat' \
  -H 'Content-Type: application/json' \
  --data '{"question": "What are common AGRO errors and how to fix them?", "repo": "agro", "final_k": 15}'

# Grep for error patterns
grep -r "raise.*Error" --include="*.py" retrieval/ server/
```

### Contributing.md
```bash
# Read existing CONTRIBUTING.md
# Add testing requirements (Playwright, pytest)
# Add branch workflow from CLAUDE.md
# Include code style (Black, ESLint)
```

### Architecture.md
```bash
# Use RAG to understand system design
curl -s -X POST 'http://127.0.0.1:8012/api/chat' \
  -H 'Content-Type: application/json' \
  --data '{"question": "Explain AGRO system architecture and component interactions", "repo": "agro", "final_k": 20}'

# Key files:
# - server/langgraph_app.py (LangGraph pipeline)
# - retrieval/hybrid_search.py (retrieval architecture)
# - server/app.py (FastAPI routing)
```

---

## Quality Metrics

**Completed pages:**
- **Size:** All 10KB+ (production-ready depth)
- **Code examples:** Real examples from codebase (not generic)
- **Diagrams:** ASCII diagrams for architecture
- **Cross-links:** Link to related pages
- **Troubleshooting:** Each page has troubleshooting section
- **Accessibility:** Clear headings, step-by-step instructions

**Tone:**
- Developer-focused (not marketing)
- Pain point → solution framing
- Real benchmarks and metrics
- Honest about trade-offs

---

## Next Steps

1. **Fill remaining 6 pages** using RAG queries and targeted file reading
2. **Enhance intro.md** with stronger pain point opener
3. **Add screenshots** to key pages (from `/website/static/img/screenshots/`)
4. **Run Playwright tests** to verify all links work
5. **Build Docusaurus site** and verify navigation

**Estimated tokens for remaining pages:** ~60K (using RAG + targeted reading)
**Total project:** ~135K tokens (well under budget)

---

## Files Updated

1. `/website/docs/api/mcp-tools.md` - **COMPLETE** (19.5KB)
2. `/website/docs/configuration/filtering.md` - **COMPLETE** (10.8KB)
3. `/website/docs/operations/monitoring.md` - **COMPLETE** (10.2KB)
4. `/website/docs/operations/deployment.md` - STUB (needs content)
5. `/website/docs/operations/troubleshooting.md` - STUB (needs content)
6. `/website/docs/development/contributing.md` - STUB (needs content)
7. `/website/docs/development/architecture.md` - STUB (needs content)
8. `/website/docs/intro.md` - GOOD (needs enhancement)
9. `/website/docs/features/rag.md` - **ALREADY EXCELLENT** (no changes needed)
10. `/website/docs/api/endpoints.md` - **ALREADY EXCELLENT** (no changes needed)

**Progress:** 3/9 complete, 2 already excellent, 4 to go

---

## Feedback Request

Before continuing with remaining pages, please confirm:
1. **Are the completed pages the right depth and tone?**
2. **Should I continue with the same approach for remaining pages?**
3. **Any specific emphasis or content for deployment, troubleshooting, contributing, architecture?**
4. **Screenshot integration - should I add placeholders or actual screenshot references?**

I recommend reviewing the 3 completed pages first, then I'll adjust approach if needed for the remaining 4.
