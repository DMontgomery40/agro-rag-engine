# API Endpoints

HTTP endpoints for AGRO.

## Core Endpoints

### GET /health

Health check.

```bash
curl http://127.0.0.1:8012/health
```

### GET /answer

Ask a question.

```bash
curl 'http://127.0.0.1:8012/answer?q=How+does+search+work&repo=my-project'
```

### GET /search

Search only (no LLM).

```bash
curl 'http://127.0.0.1:8012/search?q=authentication&repo=my-project&top_k=10'
```

### GET /answer_stream

Streaming response.

```bash
curl 'http://127.0.0.1:8012/answer_stream?q=How+does+search+work&repo=my-project'
```

## Configuration

### GET /api/config

Get current configuration.

### POST /api/config

Update configuration.

## See Also

- [OpenAPI](openapi.md) - Full API spec
