#!/usr/bin/env python3
import click
from rich.console import Console
from rich.panel import Panel
from rich.markdown import Markdown
from cli.commands import chat, index, config, eval, reranker, golden, ops, mcp
from cli.commands.utils import print_help

console = Console()

@click.group()
def cli():
    """AGRO RAG Engine CLI.
    
    Unified control for Chat, Indexing, Configuration, and Ops.
    """
    pass

# Help command
@cli.command()
@click.argument("topic", required=False)
@click.argument("subcommand", required=False)
def help(topic, subcommand):
    """Show verbose rich help."""
    modules = {
        "chat": chat,
        "index": index,
        "config": config,
        "eval": eval,
        "reranker": reranker,
        "golden": golden,
        "ops": ops,
        "mcp": mcp
    }
    
    if not topic:
        console.print(Panel(Markdown("""
# AGRO CLI

The unified command-line interface for the AGRO RAG Engine.

## Available Commands
- `chat`: Interactive chat
- `index`: Manage indexing
- `config`: Configuration & Profiles
- `eval`: Evaluation suite
- `reranker`: Reranker operations
- `golden`: Golden dataset management
- `ops`: System operations (Docker, Git)
- `mcp`: MCP server management

Run `agro help <command>` for verbose help and examples.
        """), title="AGRO CLI", border_style="green"))
        return

    mod = modules.get(topic)
    if not mod:
        console.print(f"[red]Unknown command topic: {topic}[/red]")
        return
        
    if hasattr(mod, "HELP"):
        h = mod.HELP
        if subcommand and "commands" in h:
            sub = h["commands"].get(subcommand)
            if sub:
                print_help(f"{topic} {subcommand}", sub["description"], sub["usage"], sub["examples"])
                return
            else:
                 console.print(f"[yellow]No help found for subcommand: {subcommand}[/yellow]")

        # Show group help if no subcommand or subcommand not found
        print_help(h["title"], h["description"], h["usage"], h["examples"])
    else:
        console.print(f"[yellow]No verbose help available for {topic}[/yellow]")

# Add commands
cli.add_command(chat.chat)
cli.add_command(index.index)
cli.add_command(index.status, name="index-status")

# Config group
@cli.group()
def configuration():
    """Configuration management."""
    pass
configuration.add_command(config.show)
configuration.add_command(config.set)
configuration.add_command(config.profiles)
configuration.add_command(config.apply_profile)
cli.add_command(configuration, name="config")

# Eval group
@cli.group()
def evaluation():
    """Evaluation suite."""
    pass
evaluation.add_command(eval.run)
evaluation.add_command(eval.status)
evaluation.add_command(eval.results)
evaluation.add_command(eval.save_baseline)
evaluation.add_command(eval.compare)
cli.add_command(evaluation, name="eval")

# Reranker group
@cli.group()
def reranking():
    """Reranker operations."""
    pass
reranking.add_command(reranker.status)
reranking.add_command(reranker.train)
reranking.add_command(reranker.mine)
reranking.add_command(reranker.mine_golden)
reranking.add_command(reranker.evaluate)
reranking.add_command(reranker.costs)
cli.add_command(reranking, name="reranker")

# Golden group
@cli.group()
def gold():
    """Golden dataset management."""
    pass
gold.add_command(golden.list)
gold.add_command(golden.add)
gold.add_command(golden.test)
cli.add_command(gold, name="golden")

# Ops group (Docker/Git/Hardware)
@cli.group()
def operations():
    """System operations."""
    pass
operations.add_command(ops.status)
operations.add_command(ops.scan_hw)
operations.add_command(ops.containers)
operations.add_command(ops.start)
operations.add_command(ops.stop)
operations.add_command(ops.restart)
operations.add_command(ops.logs)
operations.add_command(ops.git_status)
operations.add_command(ops.git_install)
cli.add_command(operations, name="ops")

# MCP group
@cli.group()
def model_context():
    """MCP server management."""
    pass
model_context.add_command(mcp.status)
model_context.add_command(mcp.start)
model_context.add_command(mcp.stop)
model_context.add_command(mcp.restart)
model_context.add_command(mcp.test)
cli.add_command(model_context, name="mcp")

if __name__ == "__main__":
    cli()
