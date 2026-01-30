#!/usr/bin/env python3
import sys
from pathlib import Path

# Ensure project root is in sys.path for imports to work from any directory
_project_root = Path(__file__).resolve().parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

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

# Config group (short: config, long: configuration)
@click.group(name="config")
def config_group():
    """Configuration management."""
    pass
config_group.add_command(config.show)
config_group.add_command(config.set)
config_group.add_command(config.profiles)
config_group.add_command(config.apply_profile)
cli.add_command(config_group)
cli.add_command(config_group, name="configuration")

# Eval group (short: eval, long: evaluation)
@click.group(name="eval")
def eval_group():
    """Evaluation suite."""
    pass
eval_group.add_command(eval.run)
eval_group.add_command(eval.status)
eval_group.add_command(eval.results)
eval_group.add_command(eval.save_baseline)
eval_group.add_command(eval.compare)
cli.add_command(eval_group)
cli.add_command(eval_group, name="evaluation")

# Reranker group (short: reranker, long: reranking)
@click.group(name="reranker")
def reranker_group():
    """Reranker operations."""
    pass
reranker_group.add_command(reranker.status)
reranker_group.add_command(reranker.train)
reranker_group.add_command(reranker.mine)
reranker_group.add_command(reranker.mine_golden)
reranker_group.add_command(reranker.evaluate)
reranker_group.add_command(reranker.costs)
cli.add_command(reranker_group)
cli.add_command(reranker_group, name="reranking")

# Golden group (short: golden, long: gold)
@click.group(name="golden")
def golden_group():
    """Golden dataset management."""
    pass
golden_group.add_command(golden.list)
golden_group.add_command(golden.add)
golden_group.add_command(golden.test)
cli.add_command(golden_group)
cli.add_command(golden_group, name="gold")

# Ops group (short: ops, long: operations)
@click.group(name="ops")
def ops_group():
    """System operations."""
    pass
ops_group.add_command(ops.status)
ops_group.add_command(ops.scan_hw)
ops_group.add_command(ops.containers)
ops_group.add_command(ops.start)
ops_group.add_command(ops.stop)
ops_group.add_command(ops.restart)
ops_group.add_command(ops.logs)
ops_group.add_command(ops.git_status)
ops_group.add_command(ops.git_install)
cli.add_command(ops_group)
cli.add_command(ops_group, name="operations")

# MCP group (short: mcp, long: model-context)
@click.group(name="mcp")
def mcp_group():
    """MCP server management."""
    pass
mcp_group.add_command(mcp.status)
mcp_group.add_command(mcp.start)
mcp_group.add_command(mcp.stop)
mcp_group.add_command(mcp.restart)
mcp_group.add_command(mcp.test)
cli.add_command(mcp_group)
cli.add_command(mcp_group, name="model-context")

if __name__ == "__main__":
    cli()
