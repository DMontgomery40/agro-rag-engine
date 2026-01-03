---
paths: cli/**/*
---

# CLI System

Click-based command-line interface with Rich formatting.

## Entry Point

```bash
agro [command] [subcommand] [options]
agro help [topic] [subcommand]
```

Main file: `cli/agro.py`

## Command Groups

| Group | Aliases | Subcommands |
|-------|---------|-------------|
| chat | - | `chat` |
| index | indexing | `index`, `status` |
| config | configuration | `show`, `set`, `wizard`, `profiles`, `apply-profile` |
| eval | evaluation | `run`, `status`, `results`, `save-baseline`, `compare` |
| reranker | reranking | `status`, `train`, `mine`, `mine-golden`, `evaluate`, `costs` |
| golden | gold | `list`, `add`, `test` |
| ops | operations | `status`, `scan-hw`, `containers`, `start`, `stop`, `restart`, `logs`, `git-status`, `git-install` |
| mcp | model-context | `status`, `start`, `stop`, `restart`, `test` |

## HELP Dict Pattern

Every command module has:
```python
HELP = {
    "title": "CommandName",
    "description": "Brief description...",
    "usage": "agro cmd [options]",
    "examples": "$ agro cmd example",
    "commands": {
        "subcommand": {
            "description": "What it does",
            "usage": "agro cmd subcommand [options]",
            "examples": "$ agro cmd subcommand"
        }
    }
}
```

## Click Patterns

### Command Registration
```python
@click.group()
def cli():
    """AGRO RAG Engine CLI."""
    pass

# Direct command
cli.add_command(chat.chat)

# Group with alias
cli.add_command(config_group)
cli.add_command(config_group, name="configuration")
```

### Dynamic Defaults
```python
@click.option(
    "--repo",
    default=lambda: _config_registry.get_str("REPO", "agro"),
    help="Repository name"
)
```

### Multiple Values
```python
@click.option("--expect", "-e", multiple=True, help="Expected file (repeatable)")
# Usage: agro golden add -e file1.py -e file2.py
```

### Choices
```python
@click.option("--mode", type=click.Choice(["append", "replace"]))
```

## Rich Output Patterns

### Console
```python
from rich.console import Console
console = Console()
```

### Tables
```python
from rich.table import Table

t = Table(title="Configuration")
t.add_column("Key", style="cyan")
t.add_column("Value")
t.add_row(key, value)
console.print(t)
```

### Panels
```python
from rich.panel import Panel
from rich.markdown import Markdown

console.print(Panel(Markdown(content), title="Title", border_style="cyan"))
```

### Prompts
```python
from rich.prompt import Prompt

model = Prompt.ask("Generation Model", default="gpt-4o-mini")
```

### Status Styling
```python
console.print("[green]✓[/green] Success")
console.print("[red]✗[/red] Error message")
console.print("[yellow]Warning...[/yellow]")
console.print("[dim]Secondary info[/dim]")
console.print("[bold]Emphasis[/bold]")
console.print("[cyan]Label[/cyan]")
```

## API Communication

Utils: `cli/commands/utils.py`

```python
def get(path: str):
    """GET request with error handling."""
    r = requests.get(f"{API_BASE}{path}", timeout=5)
    r.raise_for_status()
    return r.json()

def post(path: str, json_data: dict = None):
    """POST request with error handling."""
    r = requests.post(f"{API_BASE}{path}", json=json_data or {}, timeout=30)
    r.raise_for_status()
    return r.json()
```

API Base: `http://127.0.0.1:{PORT}` (from config registry)

## Key Commands

### Chat
```bash
agro chat --repo agro --model gpt-4o-mini
```
Interactive REPL with `/repo`, `/model`, `/save`, `/clear`, `/help`, `/exit`

### Index
```bash
agro index --repo agro --dense    # Full indexing
agro index --repo agro --no-dense # BM25 only
agro index-status                 # Check progress
```

### Config
```bash
agro config show                  # Display all config
agro config set KEY value         # Update config
agro config wizard                # Interactive setup
agro config profiles              # List profiles
agro config apply-profile fast    # Apply profile
```

### Eval
```bash
agro eval run --limit 10          # Run evaluation
agro eval status                  # Check if running
agro eval results                 # Show last results
agro eval save-baseline           # Save as baseline
agro eval compare                 # Compare to baseline
```

### Reranker
```bash
agro reranker status              # Training status
agro reranker train --epochs 3    # Fine-tune model
agro reranker mine --mode append  # Extract triplets
agro reranker evaluate            # Run metrics
```

### Ops
```bash
agro ops status                   # System health
agro ops scan-hw                  # GPU/CPU/RAM info
agro ops containers               # List containers
agro ops logs api --tail 50       # View logs
agro ops git-install              # Install hooks
```

## Config Integration

All commands use config registry:
```python
from server.services.config_registry import get_config_registry

_config_registry = get_config_registry()
_config_registry.load()

repo = _config_registry.get_str("REPO", "agro")
port = _config_registry.get_int("PORT", 8012)
```

## Error Handling

```python
try:
    result = get("/api/endpoint")
except requests.RequestException as e:
    console.print(f"[red]Error connecting to API: {e}[/red]")
    sys.exit(1)

# Validation
if repo not in allowed_repos:
    console.print(f"[red]✗[/red] Invalid repo. Allowed: {sorted(allowed)}")
    sys.exit(1)
```

## File Structure

```
cli/
├── agro.py           # Main CLI router
├── chat_cli.py       # Interactive chat (standalone)
└── commands/
    ├── chat.py       # Chat command
    ├── index.py      # Indexing commands
    ├── config.py     # Config commands
    ├── eval.py       # Evaluation commands
    ├── reranker.py   # Reranker commands
    ├── golden.py     # Golden dataset commands
    ├── ops.py        # Operations commands
    ├── mcp.py        # MCP server commands
    └── utils.py      # Shared utilities
```
