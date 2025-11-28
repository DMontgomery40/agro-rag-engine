# Quick Start

Get AGRO running in 5 minutes.

## Prerequisites

- Docker & Docker Compose
- Python 3.10+
- Git
- 8GB RAM minimum

## Steps

```bash
git clone https://github.com/DMontgomery40/agro-rag-engine.git
cd agro-rag-engine
make dev
```

This starts everything:

- Qdrant (vector database)
- Redis (caching)
- API server on port 8012
- GUI with onboarding wizard

## Verify

```bash
curl http://127.0.0.1:8012/health
```

Should return:

```json
{"status": "healthy", "qdrant": "connected", "redis": "connected"}
```

## Next Steps

- [Installation](installation.md) - Detailed setup
- [First Steps](first-steps.md) - Configure your models
