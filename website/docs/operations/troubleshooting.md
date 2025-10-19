---
sidebar_position: 3
---

# Troubleshooting

Common issues and solutions for AGRO deployment, retrieval, and performance problems.

## Quick Diagnostics

### Health Check Script

```bash
#!/bin/bash
# Run this first to diagnose issues

echo "=== AGRO Health Check ==="

# 1. Check Docker
echo -n "Docker: "
if docker ps > /dev/null 2>&1; then
    echo "✓ Running"
else
    echo "✗ Not running or permission denied"
fi

# 2. Check containers
echo "Containers:"
docker ps --filter "name=qdrant" --format "  qdrant: {{.Status}}"
docker ps --filter "name=rag-redis" --format "  redis: {{.Status}}"
docker ps --filter "name=agro-grafana" --format "  grafana: {{.Status}}"

# 3. Check API
echo -n "API Server: "
if curl -s http://127.0.0.1:8012/health > /dev/null; then
    echo "✓ Responding"
else
    echo "✗ Not responding"
fi

# 4. Check Qdrant
echo -n "Qdrant: "
if curl -s http://127.0.0.1:6333/health > /dev/null; then
    echo "✓ Healthy"
else
    echo "✗ Unhealthy or unreachable"
fi

# 5. Check Redis
echo -n "Redis: "
if docker exec rag-redis redis-cli ping 2>&1 | grep -q PONG; then
    echo "✓ PONG"
else
    echo "✗ No response"
fi

# 6. Check index
echo "Index stats:"
curl -s http://127.0.0.1:8012/api/index/stats | python3 -m json.tool 2>/dev/null || echo "  ✗ API not responding"
```

Save as `health_check.sh`, run with `bash health_check.sh`.

---

## Docker Issues

### Container Won't Start

**Symptom:** `docker compose up -d` fails or container exits immediately.

**Diagnosis:**
```bash
# Check container logs
docker logs qdrant
docker logs rag-redis

# Check for port conflicts
sudo lsof -i :6333  # Qdrant
sudo lsof -i :6379  # Redis
sudo lsof -i :8012  # API server
```

**Solutions:**

**Port conflict:**
```bash
# Kill conflicting process
sudo kill -9 $(lsof -t -i:6333)

# Or change port in docker-compose.yml
ports:
  - "6334:6333"  # Use different host port
```

**Permission issues:**
```bash
# Fix data directory permissions
sudo chown -R $(whoami):$(whoami) data/
chmod -R 755 data/

# Restart containers
docker compose down
docker compose up -d
```

**Out of disk space:**
```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a --volumes
```

---

### Qdrant Connection Errors

**Symptom:** `QdrantException: Connection refused` or `Could not connect to Qdrant at http://127.0.0.1:6333`

**Diagnosis:**
```bash
# Is Qdrant running?
docker ps | grep qdrant

# Check Qdrant logs
docker logs qdrant --tail 50

# Test connection directly
curl http://127.0.0.1:6333/health
```

**Solutions:**

**Qdrant not running:**
```bash
docker compose up -d qdrant
```

**Wrong URL in .env:**
```bash
# Correct URL (check .env)
QDRANT_URL=http://127.0.0.1:6333

# NOT:
# QDRANT_URL=http://localhost:6333  # May fail on some systems
# QDRANT_URL=https://...  # Qdrant uses HTTP by default
```

**Firewall blocking:**
```bash
# Allow Docker bridge network
sudo ufw allow from 172.16.0.0/12 to any port 6333
```

---

### Redis Errors

**Symptom:** `redis.exceptions.ConnectionError` or `Redis LOADING Dataset in memory`

**Diagnosis:**
```bash
# Check Redis status
docker exec rag-redis redis-cli ping

# Check logs
docker logs rag-redis --tail 50
```

**Solutions:**

**Redis still loading AOF:**
```bash
# Wait 30-60 seconds for Redis to finish loading
# Monitor logs:
docker logs -f rag-redis

# Or disable persistence (faster startup, riskier):
# In docker-compose.yml:
environment:
  - REDIS_ARGS=--save ""
```

**Corrupted AOF file:**
```bash
# Stop Redis
docker compose stop redis

# Delete corrupted AOF
rm data/redis/appendonlydir/*

# Restart
docker compose up -d redis
```

---

## Indexing Issues

### "No chunks generated" / Empty Index

**Symptom:** Indexing completes but `/api/index/stats` shows 0 chunks.

**Diagnosis:**
```bash
# Check if chunks.jsonl exists and has content
ls -lh data/agro/chunks.jsonl

# Count lines
wc -l data/agro/chunks.jsonl

# Check first chunk
head -n 1 data/agro/chunks.jsonl | python3 -m json.tool
```

**Solutions:**

**Wrong SOURCE_DIR:**
```bash
# Check .env
echo $SOURCE_DIR

# Should be absolute path to code repository
SOURCE_DIR=/Users/you/agro-rag-engine  # Good
SOURCE_DIR=./agro-rag-engine  # Bad (relative path)
```

**All files excluded:**
```bash
# Check exclude patterns
cat data/exclude_globs.txt

# Common mistake: excluding too much
# BAD:
*.py  # Excludes ALL Python files

# GOOD:
tests/**/*.py  # Only excludes test files
```

**No supported files found:**
```bash
# Check what files exist in SOURCE_DIR
find $SOURCE_DIR -type f -name "*.py" | head -10

# Supported extensions:
# .py, .js, .jsx, .ts, .tsx, .go, .java, .rs, .c, .cpp, .sh, .yml, .md
```

**Tree-sitter failure (silent):**
```bash
# Test chunking manually
python3 -c "
from retrieval.ast_chunker import chunk_code
code = open('server/app.py').read()
chunks = chunk_code(code, 'server/app.py', 'python')
print(f'Generated {len(chunks)} chunks')
"
```

---

### Embedding Failures

**Symptom:** `OpenAIError: API key invalid` or `RateLimitError` during indexing.

**Diagnosis:**
```bash
# Check API key
echo $OPENAI_API_KEY

# Test API directly
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**Solutions:**

**Invalid API key:**
```bash
# Get new key from platform.openai.com/api-keys
# Update .env
OPENAI_API_KEY=sk-proj-...

# Reload environment
source .env
```

**Rate limit hit:**
```bash
# Switch to local embeddings (slower, free)
EMBEDDING_TYPE=local
EMBEDDING_MODEL_LOCAL=BAAI/bge-small-en-v1.5

# Or wait and retry:
python scripts/full_index.py --repo agro --dense-only
```

**Quota exceeded:**
```bash
# Check quota at platform.openai.com/usage

# Use Voyage AI instead (cheaper)
EMBEDDING_TYPE=voyage
VOYAGE_API_KEY=...
```

---

### Slow Indexing

**Symptom:** Indexing takes >1 hour for <10k files.

**Diagnosis:**
```bash
# Check what's slow (add verbose logging)
export LOG_LEVEL=DEBUG
python scripts/full_index.py --repo agro

# Watch for:
# - "Embedding chunk X/Y" (embeddings slow)
# - "Building BM25 index" (BM25 slow - normal for large repos)
# - "Generating card for chunk X" (card generation slow)
```

**Solutions:**

**Slow embeddings (cloud API):**
```bash
# Batch embeddings (if supported by indexer)
# Or switch to local embeddings
EMBEDDING_TYPE=local
```

**Slow card generation:**
```bash
# Skip cards initially
# Index code first, generate cards later:
curl -X POST http://127.0.0.1:8012/api/cards/build/start \
  -H 'Content-Type: application/json' \
  -d '{"repo": "agro"}'
```

**Large files/chunks:**
```bash
# Check chunk sizes
python3 -c "
import json
with open('data/agro/chunks.jsonl') as f:
    sizes = [len(json.loads(line)['code']) for line in f]
print(f'Mean: {sum(sizes)/len(sizes):.0f} chars')
print(f'Max: {max(sizes)} chars')
"

# If chunks are huge (>5000 chars), adjust target size
# In ast_chunker.py:
chunk_code(src, fpath, lang, target=900)  # Default
chunk_code(src, fpath, lang, target=600)  # Smaller chunks
```

---

## Retrieval Issues

### "No results found" for Known Code

**Symptom:** Query returns empty results even though code exists.

**Diagnosis:**
```bash
# 1. Check if indexed
curl http://127.0.0.1:8012/api/index/stats

# 2. Test BM25 directly
python3 -c "
from retrieval.hybrid_search import search
docs = search('your query', repo='agro', final_k=10)
print(f'Found {len(docs)} results')
for d in docs[:3]:
    print(f\"  {d['file_path']}:{d['start_line']} (score: {d['rerank_score']:.3f})\")
"

# 3. Check Qdrant collection
curl http://127.0.0.1:6333/collections/code_chunks_agro
```

**Solutions:**

**Index doesn't exist:**
```bash
# Rebuild index
curl -X POST http://127.0.0.1:8012/api/index/start \
  -H 'Content-Type: application/json' \
  -d '{"repo": "agro", "force": true}'
```

**Query too specific:**
```bash
# Try broader query
# BAD: "FastAPI endpoint for answering questions using LangGraph"
# GOOD: "answer endpoint"

# Enable multi-query expansion (should be default)
QUERY_EXPANSION_COUNT=4
```

**Wrong repository:**
```bash
# Check which repo is active
curl http://127.0.0.1:8012/api/config | grep REPO

# Override in query
curl 'http://127.0.0.1:8012/search?q=test&repo=agro'
```

**Discriminative keywords boosting wrong files:**
```bash
# Check keywords
cat discriminative_keywords.json

# If test files are boosted, regenerate
python scripts/generate_keywords.py --exclude-patterns "tests/**" --save
```

---

### Wrong Results / Poor Ranking

**Symptom:** Search returns irrelevant results or ranks wrong files #1.

**Diagnosis:**
```bash
# Get detailed scores
curl 'http://127.0.0.1:8012/search?q=your+query&top_k=20' | python3 -m json.tool

# Check:
# - rerank_score (should be >0.6 for top result)
# - file_path (is expected file in top 5?)
# - card_hit (did semantic cards help?)
```

**Solutions:**

**Reranker not working:**
```bash
# Check reranker backend
echo $RERANK_BACKEND

# Test local reranker
python3 -c "
from retrieval.rerank import rerank_results
docs = [{'code': 'def health(): return ok', 'file_path': 'server/app.py'}]
results = rerank_results('health check', docs, top_k=1)
print(results[0]['rerank_score'])
"

# Expected: >0.5 for relevant result
```

**Layer bonuses wrong:**
```bash
# Check layer bonuses in repos.json
cat gui/repos.json | python3 -m json.tool

# Adjust via GUI: Settings → Profiles → Layer Bonuses
# Or manually edit repos.json
```

**Need custom reranker:**
```bash
# Train on your golden questions
curl -X POST http://127.0.0.1:8012/api/reranker/mine
curl -X POST http://127.0.0.1:8012/api/reranker/train \
  -H 'Content-Type: application/json' \
  -d '{"epochs": 3, "batch_size": 16}'
```

---

### Slow Search Queries

**Symptom:** Search takes >3 seconds.

**Diagnosis:**
```bash
# Enable LangSmith tracing to see latency breakdown
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=...

# Make query, get trace URL:
curl http://127.0.0.1:8012/api/langsmith/latest

# Check Prometheus metrics
curl http://127.0.0.1:9090/api/v1/query?query=agro_request_duration_seconds

# Or Grafana: http://127.0.0.1:3000
```

**Solutions:**

**Reranking slow (local model):**
```bash
# Reduce candidates before reranking
TOPK_SPARSE=50  # Default: 75
TOPK_DENSE=50   # Default: 75

# Or use Cohere API (faster, costs $0.002/query)
RERANK_BACKEND=cohere
COHERE_API_KEY=...
```

**Multi-query expansion slow:**
```bash
# Reduce expansion count
QUERY_EXPANSION_COUNT=2  # Default: 4

# Or disable for simple queries (auto-detected)
```

**Hydration slow:**
```bash
# Already using lazy hydration? Check:
HYDRATION_MODE=lazy  # Good (default)
HYDRATION_MODE=eager  # Bad (loads all code upfront)

# Reduce chars per chunk
HYDRATION_MAX_CHARS=1000  # Default: 2000
```

---

## Generation Issues

### Hallucinated Answers

**Symptom:** LLM generates answers not grounded in retrieved code.

**Diagnosis:**
```bash
# Check confidence scores
curl 'http://127.0.0.1:8012/api/chat' \
  -H 'Content-Type: application/json' \
  -d '{"question": "your question", "repo": "agro"}' \
  | python3 -m json.tool | grep confidence

# Low confidence (<0.5) should trigger fallback
```

**Solutions:**

**Confidence gating too permissive:**
```bash
# Increase thresholds (in .env or repos.json)
CONF_TOP1=0.70  # Default: 0.62
CONF_AVG5=0.60  # Default: 0.55
CONF_ANY=0.60   # Default: 0.55

# Restart server
```

**Poor retrieval:**
```bash
# Fix retrieval first (see "Wrong Results" section)
# Hallucination is usually a symptom of bad retrieval
```

**System prompt too creative:**
```bash
# Set stricter system prompt
SYSTEM_PROMPT="You answer ONLY from the provided code context. If information is not in the context, say 'I don't have enough context'. Always cite file paths and line ranges."
```

---

### Incomplete Answers

**Symptom:** Answer is cut off mid-sentence.

**Diagnosis:**
```bash
# Check token limits
echo $MAX_COMPLETION_TOKENS

# Check generation model limits
# GPT-4o: 16k output tokens
# GPT-4o-mini: 16k output tokens
# Ollama models: varies (often 2k-4k)
```

**Solutions:**

**Hit model token limit:**
```bash
# Use model with higher output limit
GENERATION_MODEL=gpt-4o  # 16k output

# Or increase limit (if supported)
MAX_COMPLETION_TOKENS=8192
```

**Timeout:**
```bash
# Increase request timeout (in gunicorn)
--timeout 120  # Default

# Or in Nginx proxy
proxy_read_timeout 300s;
```

---

## Performance Issues

### High Memory Usage

**Symptom:** Server uses >4GB RAM, Docker containers OOM.

**Diagnosis:**
```bash
# Check memory usage
docker stats --no-stream

# Check Python process
ps aux | grep uvicorn
```

**Solutions:**

**Qdrant using too much memory:**
```bash
# Enable mmap (disk-backed)
# In docker-compose.yml:
environment:
  - QDRANT__STORAGE__USE_MMAP=true

# Restart
docker compose restart qdrant
```

**Too many workers:**
```bash
# Reduce Gunicorn workers
gunicorn --workers 2 ...  # Instead of 4
```

**BM25 index too large:**
```bash
# Check index size
du -sh data/agro/bm25_index/

# If >500MB, consider excluding docs or splitting repos
```

**Memory leak (rare):**
```bash
# Restart server periodically via systemd
# In /etc/systemd/system/agro.service:
RuntimeMaxSec=86400  # Restart daily
```

---

### High CPU Usage

**Symptom:** Server uses >80% CPU even when idle.

**Diagnosis:**
```bash
# Check what's running
top -p $(pgrep -f uvicorn)

# Check for infinite loops
strace -p $(pgrep -f uvicorn) -e trace=read,write
```

**Solutions:**

**Reranker hogging CPU:**
```bash
# Switch to API reranker
RERANK_BACKEND=cohere

# Or limit local reranker to GPU (if available)
# Set in rerank.py: device='cuda'
```

**LangGraph retrying too much:**
```bash
# Check iteration limits
# In langgraph_app.py:
if it >= 3:  # Default max iterations
    decision = "fallback"
```

**Background card generation:**
```bash
# Check if card job is running
curl http://127.0.0.1:8012/api/cards/build/status/...

# Cancel if needed
curl -X POST http://127.0.0.1:8012/api/cards/build/cancel/...
```

---

## MCP Integration Issues

### Claude Code Can't Find MCP Server

**Symptom:** MCP tools don't appear in Claude Code/Codex.

**Diagnosis:**
```bash
# Check MCP config
cat ~/.config/claude/mcp.json

# Test server manually
python mcp/stdio_server.py
# Type: {"jsonrpc":"2.0","method":"ping","id":1}
# Expected: pong response
```

**Solutions:**

**Wrong path in mcp.json:**
```json
{
  "mcpServers": {
    "agro": {
      "command": "python",
      "args": ["/absolute/path/to/agro-rag-engine/mcp/stdio_server.py"],
      "env": {
        "REPO": "agro"
      }
    }
  }
}
```

**Python not in PATH:**
```bash
# Use full Python path
which python3
# /usr/local/bin/python3

# In mcp.json:
"command": "/usr/local/bin/python3"
```

**Virtual environment not activated:**
```bash
# MCP server needs access to installed packages
# Option 1: Use venv Python
"command": "/path/to/agro-rag-engine/.venv/bin/python"

# Option 2: Install globally (not recommended)
pip install -r requirements.txt
```

---

### MCP Tools Return Errors

**Symptom:** `rag_search` or `rag_answer` returns error in Claude Code.

**Diagnosis:**
```bash
# Test tool manually via HTTP MCP server
python mcp/http_server.py --port 8013 &

curl -X POST http://127.0.0.1:8013/tools/rag_search \
  -H 'Content-Type: application/json' \
  -d '{"query": "test", "repo": "agro"}'
```

**Solutions:**

**Main API server not running:**
```bash
# MCP server calls http://127.0.0.1:8012/search internally
# Make sure API is running:
uvicorn server.app:app --port 8012 &
```

**Wrong REPO env var:**
```bash
# In mcp.json:
"env": {
  "REPO": "agro"  # Must match indexed repo name
}
```

**Network unreachable:**
```bash
# Test connection from MCP server
python -c "import requests; print(requests.get('http://127.0.0.1:8012/health').json())"
```

---

## GUI Issues

### GUI Won't Load / Blank Screen

**Symptom:** http://127.0.0.1:8012/ shows blank page or 404.

**Diagnosis:**
```bash
# Check server logs
tail -f logs/server.log

# Check browser console (F12)
# Look for JavaScript errors

# Test API directly
curl http://127.0.0.1:8012/health
```

**Solutions:**

**Server not serving GUI:**
```bash
# Check gui/index.html exists
ls -lh gui/index.html

# Restart server
pkill -f uvicorn
uvicorn server.app:app --port 8012
```

**CORS error in browser console:**
```bash
# Add CORS origins to .env
AGRO_CORS_ORIGINS=http://127.0.0.1:8012,http://localhost:8012

# Restart server
```

**JavaScript error:**
```bash
# Check browser console for specifics
# Common: "fetch is not defined" → update browser
# Common: "Cannot read property X of undefined" → API response changed
```

---

### GUI Features Not Working

**Symptom:** Clicking buttons does nothing or shows errors.

**Diagnosis:**
```bash
# Open browser DevTools (F12)
# Check Console for errors
# Check Network tab for failed requests

# Test API endpoint directly
curl http://127.0.0.1:8012/api/index/stats
```

**Solutions:**

**API endpoint missing:**
```bash
# Check if endpoint exists in server/app.py
grep "def index_stats" server/app.py

# If missing, update AGRO to latest version
git pull origin main
pip install -r requirements.txt --force-reinstall
```

**JavaScript module not loaded:**
```bash
# Check gui/js/ files exist
ls gui/js/

# Check HTML loads them
grep "<script" gui/index.html
```

---

## Common Error Messages

### "Collection 'code_chunks_agro' not found"

**Fix:**
```bash
# Index doesn't exist, rebuild
curl -X POST http://127.0.0.1:8012/api/index/start \
  -H 'Content-Type: application/json' \
  -d '{"repo": "agro", "force": true}'
```

---

### "LOADING Redis is loading the dataset in memory"

**Fix:**
```bash
# Wait 30-60 seconds for Redis to finish loading
# Or disable persistence:
docker compose down
# Edit docker-compose.yml: REDIS_ARGS=--save ""
docker compose up -d
```

---

### "ModuleNotFoundError: No module named 'X'"

**Fix:**
```bash
# Reinstall dependencies
source .venv/bin/activate
pip install -r requirements.txt --force-reinstall
```

---

### "HTTPError: 429 Rate limit exceeded"

**Fix:**
```bash
# OpenAI/Voyage/Cohere rate limit hit
# Wait a few minutes, or:
# Switch to local models
EMBEDDING_TYPE=local
GENERATION_MODEL=ollama:qwen3-coder:30b
RERANK_BACKEND=local
```

---

## Getting Help

### Collect Debug Information

Before opening an issue, gather:

```bash
# 1. System info
uname -a
python --version
docker --version

# 2. Docker status
docker compose ps
docker logs qdrant --tail 50 > qdrant.log
docker logs rag-redis --tail 50 > redis.log

# 3. API health
curl http://127.0.0.1:8012/health > health.json

# 4. Index stats
curl http://127.0.0.1:8012/api/index/stats > index_stats.json

# 5. Environment (redact API keys!)
cat .env | grep -v API_KEY > env_sanitized.txt

# 6. Server logs
tail -n 100 logs/server.log > server.log
```

### Open GitHub Issue

Include:
- Problem description
- Steps to reproduce
- Expected vs actual behavior
- Debug info from above
- AGRO version (`git rev-parse HEAD`)

**GitHub Issues:** https://github.com/DMontgomery40/agro-rag-engine/issues

---

## Next Steps

- **[Deployment](deployment.md)** - Production setup
- **[Architecture](../development/architecture.md)** - System internals
- **[Contributing](../development/contributing.md)** - Development workflow
