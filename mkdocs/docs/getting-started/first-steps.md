# First Steps

What to do after AGRO is running.

## Index a Repository

```bash
source .venv/bin/activate
REPO=my-project python indexer/index_repo.py
```

## Ask Questions

### GUI

Open http://127.0.0.1:8012/ and use the Chat tab.

### CLI

```bash
export REPO=my-project
python -m cli.chat_cli
```

### API

```bash
curl 'http://127.0.0.1:8012/answer?q=How+does+search+work&repo=my-project'
```

## Configure Models

See [Models](../configuration/models.md) for setting up generation and embedding models.

## Next Steps

- [Hybrid Search](../features/rag.md) - How retrieval works
- [MCP Integration](../features/mcp.md) - Connect to Claude Code
