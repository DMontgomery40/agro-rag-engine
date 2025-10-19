---
sidebar_position: 2
---

# Installation

Complete installation guide for AGRO.

## System Requirements

### Minimum
- **OS**: macOS, Linux, or Windows (WSL2)
- **RAM**: 8GB
- **Disk**: 10GB free space
- **Docker**: 20.10+
- **Python**: 3.10 - 3.12
- **Node.js**: 16+ (for GUI only)

### Recommended
- **RAM**: 16GB+ for local models
- **Disk**: 50GB for embeddings cache
- **GPU**: Optional (NVIDIA/Apple Silicon for local inference)

## Step 1: Clone Repository

```bash
git clone https://github.com/DMontgomery40/agro-rag-engine.git
cd agro-rag-engine
```

## Step 2: Start Infrastructure

AGRO uses Docker Compose for Qdrant and Redis:

```bash
cd infra
docker compose up -d
```

Verify:
```bash
curl http://127.0.0.1:6333/collections
docker exec rag-redis redis-cli ping
```

## Step 3: Python Environment

```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements-rag.txt
pip install -r requirements.txt
```

## Step 4: Configure Environment

Create `.env` file:

```bash
# Infrastructure
QDRANT_URL=http://127.0.0.1:6333
REDIS_URL=redis://127.0.0.1:6379/0

# Repository
REPO=agro

# Models (choose your configuration)
# Option A: OpenAI (cloud)
OPENAI_API_KEY=sk-proj-...
GEN_MODEL=gpt-4o-mini
EMBEDDING_TYPE=openai

# Option B: Local (free)
OLLAMA_URL=http://127.0.0.1:11434/api
GEN_MODEL=qwen3-coder:30b
EMBEDDING_TYPE=local

# Reranking
RERANK_BACKEND=local  # or 'cohere' with API key
```

See [Model Configuration](../configuration/models) for all options.

## Step 5: Index Your First Repo

```bash
source .venv/bin/activate
REPO=agro python indexer/index_repo.py
```

This creates:
- BM25 index in `out/agro/`
- Embeddings in Qdrant collection `code_chunks_agro`
- Local chunks in `out/agro/chunks.jsonl`

## Step 6: Start Services

### API Server
```bash
uvicorn server.app:app --host 127.0.0.1 --port 8012
```

### MCP Server (for AI agents)
```bash
python server/mcp/server.py
```

### GUI (optional)
The API server includes the GUI at http://127.0.0.1:8012/

## Platform-Specific Notes

### macOS
Install Homebrew packages:
```bash
brew install python@3.11 docker
```

For local models with MLX (Apple Silicon):
```bash
pip install mlx mlx-lm
```

### Linux
Install Docker:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### Windows (WSL2)
1. Install WSL2: https://docs.microsoft.com/en-us/windows/wsl/install
2. Install Docker Desktop: https://docs.docker.com/desktop/windows/install/
3. Follow Linux instructions inside WSL2

## Verification

Run the health check:
```bash
curl http://127.0.0.1:8012/health
```

Expected response:
```json
{
  "status": "healthy",
  "qdrant": "connected",
  "redis": "connected",
  "collections": ["code_chunks_agro"]
}
```

## Troubleshooting

### Qdrant connection refused
```bash
docker restart qdrant
curl http://127.0.0.1:6333/collections
```

### Redis connection failed
```bash
docker restart rag-redis
docker exec rag-redis redis-cli ping
```

### Python import errors
```bash
pip install -r requirements-rag.txt --force-reinstall
```

See [Troubleshooting Guide](../operations/troubleshooting) for more.

## Next Steps

- [First Steps](first-steps) - Run your first query
- [MCP Setup](../features/mcp) - Connect Claude Code or Codex
- [Model Selection](../configuration/models) - Choose optimal models
