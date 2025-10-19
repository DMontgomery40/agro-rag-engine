---
sidebar_position: 1
---

# Quick Start

Get AGRO running in 5 minutes.

## Prerequisites

- Docker & Docker Compose
- Python 3.10+
- Node.js 16+ (for GUI)
- 8GB RAM minimum
- Git

## One-Command Start

```bash
git clone https://github.com/DMontgomery40/agro-rag-engine.git
cd agro-rag-engine
make dev
```

This single command:
- Starts Qdrant and Redis (Docker)
- Creates Python virtual environment
- Installs dependencies
- Starts the API server
- Opens GUI at http://127.0.0.1:8012/

## Verify Installation

1. **Check Infrastructure**
```bash
# Qdrant should respond
curl http://127.0.0.1:6333/collections

# Redis should respond
docker exec rag-redis redis-cli ping
# Should return: PONG
```

2. **Check API**
```bash
curl http://127.0.0.1:8012/health
# Should return: {"status":"healthy"}
```

3. **Open GUI**
Visit http://127.0.0.1:8012/ in your browser.

## Index Your First Repository

```bash
# Activate virtual environment
source .venv/bin/activate

# Index the AGRO codebase itself
REPO=agro python indexer/index_repo.py

# This will:
# - Scan the repository
# - Chunk code files
# - Build BM25 index
# - Generate embeddings
# - Store in Qdrant
```

Progress output:
```
Scanning repository: /path/to/agro-rag-engine
Found 142 code files
Chunking files... 100%
Building BM25 index... done
Generating embeddings... 100%
Upserting to Qdrant... 142/142
✓ Indexed 142 files, 1,247 chunks
```

## Try It Out

### Option 1: CLI Chat (Recommended)

```bash
export REPO=agro
python -m cli.chat_cli
```

Interactive terminal:
```
🤖 AGRO Chat (repo: agro)
Type your question or /help for commands

You: Where is the FastAPI server defined?