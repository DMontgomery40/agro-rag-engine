# CLI Chat

Terminal interface for AGRO.

## Usage

```bash
source .venv/bin/activate
export REPO=my-project
python -m cli.chat_cli
```

## Commands

- `/repo <name>` - Switch repositories
- `/clear` - New conversation thread
- `/trace` - Show LangSmith trace URL
- `/theme` - Change color theme
- `/help` - All commands

## Features

- Conversation memory (Redis-backed)
- Rich formatting
- Streaming responses
- Citation display
