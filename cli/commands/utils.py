import os
import sys
import requests
from rich.console import Console
from rich.panel import Panel
from rich.markdown import Markdown
from server.services.config_registry import get_config_registry

console = Console()
_config_registry = get_config_registry()

PORT = _config_registry.get_int('PORT', 8012)
API_BASE = f"http://127.0.0.1:{PORT}"

def get(path: str):
    try:
        r = requests.get(f"{API_BASE}{path}", timeout=5)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        console.print(f"[red]Error connecting to API ({API_BASE}): {e}[/red]")
        sys.exit(1)

def post(path: str, json_data: dict = None):
    try:
        r = requests.post(f"{API_BASE}{path}", json=json_data or {}, timeout=30)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        console.print(f"[red]Error connecting to API ({API_BASE}): {e}[/red]")
        sys.exit(1)

def print_help(title: str, description: str, usage: str, examples: str):
    """Print verbose help with Rich formatting."""
    md = f"""
# {title}

{description}

## Usage
`{usage}`

## Examples
{examples}
    """
    console.print(Panel(Markdown(md), title=f"AGRO Help: {title}", border_style="cyan"))
