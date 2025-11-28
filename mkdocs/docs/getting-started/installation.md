# Installation

Detailed setup instructions for AGRO.

## Requirements

**Minimum:**

- macOS, Linux, or Windows (WSL2)
- 8GB RAM
- 10GB disk space
- Docker 20.10+
- Python 3.10-3.12

**Recommended:**

- 16GB+ RAM for local models
- 50GB disk for embeddings cache
- Apple Silicon or NVIDIA GPU for local inference

## Setup

### 1. Clone

```bash
git clone https://github.com/DMontgomery40/agro-rag-engine.git
cd agro-rag-engine
```

### 2. Start Infrastructure

```bash
cd infra
docker compose up -d
cd ..
```

### 3. Python Environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-rag.txt
pip install -r requirements.txt
```

### 4. Start Server

```bash
make dev
```

Or manually:

```bash
uvicorn server.app:app --host 127.0.0.1 --port 8012
```

## Configuration

Configuration is managed through `agro_config.json` and the GUI Settings tab.

See [Settings](../configuration/settings.md) for details.
