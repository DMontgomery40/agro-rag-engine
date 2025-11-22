import click
import os
from rich.console import Console
from server.services.config_registry import get_config_registry
from cli.commands.utils import post, get

console = Console()
_config_registry = get_config_registry()

HELP = {
    "title": "Index",
    "description": "Trigger indexing for a repository. Supports BM25 (sparse) and Vector (dense) indexing.",
    "usage": "agro index [--repo <name>] [--dense/--no-dense]\nagro index-status",
    "examples": """
    # Index 'agro' with dense embeddings (default)
    $ agro index --repo agro

    # Index quickly (BM25 only)
    $ agro index --no-dense

    # Check status
    $ agro index-status
    """
}

@click.command()
@click.option("--repo", default=lambda: _config_registry.get_str("REPO", "agro"), help="Repository to index")
@click.option("--dense/--no-dense", default=True, help="Enable dense embeddings")
def index(repo, dense):
    """Trigger indexing for a repository."""
    console.print(f"Triggering index for [bold]{repo}[/bold] (dense={dense})...")
    res = post(f"/api/index/run?repo={repo}&dense={str(dense).lower()}")
    console.print(res)

@click.command()
def status():
    """Check indexing status."""
    idx = get("/api/index/status")
    console.print(idx)
