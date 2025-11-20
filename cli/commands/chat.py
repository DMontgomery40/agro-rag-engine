import click
import os
from rich.console import Console
from cli.commands.utils import post

console = Console()

HELP = {
    "title": "Chat",
    "description": "Interactive chat interface for querying your codebase. Supports history, streaming, and feedback.",
    "usage": "agro chat [--repo <name>] [--model <model>]",
    "examples": """
    # Start default chat
    $ agro chat

    # Chat with a specific repository
    $ agro chat --repo my-project

    # Use a specific model
    $ agro chat --model gpt-4o
    """
}

@click.command()
@click.option("--repo", default=os.getenv("REPO", "agro"), help="Repository to chat with")
@click.option("--model", default=None, help="Generation model override")
def chat(repo, model):
    """Start interactive RAG chat."""
    # Import here to avoid heavy dependencies on startup
    from cli.chat_cli import ChatCLI
    c = ChatCLI(repo=repo)
    if model:
        c.switch_model(model)
    c.run()
