import click
import os
from rich.console import Console
from rich.table import Table
from rich.prompt import Prompt
from server.services.config_registry import get_config_registry
from cli.commands.utils import post, get

console = Console()
_config_registry = get_config_registry()

HELP = {
    "title": "Config",
    "description": "View and modify system configuration and profiles.",
    "usage": "agro config [show|set|wizard|profiles|profile-apply]",
    "examples": """
    # Show all config
    $ agro config show

    # Interactive wizard
    $ agro config wizard

    # Set a variable
    $ agro config set GEN_MODEL gpt-4o

    # List profiles
    $ agro config profiles

    # Apply a profile
    $ agro config profile-apply default
    """,
    "commands": {
        "show": {
            "description": "Display all current configuration variables.",
            "usage": "agro config show",
            "examples": "$ agro config show"
        },
        "set": {
            "description": "Update a specific configuration variable (writes to .env).",
            "usage": "agro config set <key> <value>",
            "examples": "$ agro config set LOG_LEVEL debug"
        },
        "wizard": {
            "description": "Interactive configuration wizard for common settings.",
            "usage": "agro config wizard",
            "examples": "$ agro config wizard"
        },
        "profiles": {
            "description": "List all available configuration profiles.",
            "usage": "agro config profiles",
            "examples": "$ agro config profiles"
        },
        "profile-apply": {
            "description": "Apply a named profile to the active configuration.",
            "usage": "agro config profile-apply <name>",
            "examples": "$ agro config profile-apply production"
        }
    }
}

@click.command()
def show():
    """List current configuration."""
    cfg = get("/api/config")
    env = cfg.get("env", {})
    t = Table(title="Configuration")
    t.add_column("Key", style="cyan")
    t.add_column("Value")
    
    for k in sorted(env.keys()):
        val = str(env[k])
        if len(val) > 50: val = val[:47] + "..."
        t.add_row(k, val)
    console.print(t)

@click.command()
@click.argument("key")
@click.argument("value")
def set(key, value):
    """Set a configuration variable."""
    post("/api/config", {key: value})
    console.print(f"[green]Set {key}={value}[/green]")

@click.command()
def wizard():
    """Interactive configuration wizard."""
    console.print("[bold]AGRO Configuration Wizard[/bold]")

    # Generation
    console.print("\n[cyan]Generation Settings[/cyan]")
    gen_model = Prompt.ask("Generation Model", default=_config_registry.get_str("GEN_MODEL", "gpt-4o-mini"))
    post("/api/config", {"GEN_MODEL": gen_model})

    if "gpt" in gen_model and not os.getenv("OPENAI_API_KEY"):
        key = Prompt.ask("OpenAI API Key", password=True)
        if key: post("/api/config", {"OPENAI_API_KEY": key})

    # Retrieval
    console.print("\n[cyan]Retrieval Settings[/cyan]")
    final_k = Prompt.ask("Final Top-K Results", default=str(_config_registry.get_int("FINAL_K", 10)))
    post("/api/config", {"FINAL_K": final_k})

    # Reranker
    console.print("\n[cyan]Reranker Settings[/cyan]")
    curr_rr = "yes" if _config_registry.get_bool("AGRO_RERANKER_ENABLED", False) else "no"
    enable_rr = Prompt.ask("Enable Reranker?", choices=["yes", "no"], default=curr_rr)
    post("/api/config", {"AGRO_RERANKER_ENABLED": "1" if enable_rr == "yes" else "0"})

    console.print("[green]Configuration updated![/green]")

@click.command()
def profiles():
    """List available profiles."""
    p = get("/api/profiles")
    for name in p.get("profiles", []):
        console.print(f"- {name}")

@click.command()
@click.argument("name")
def apply_profile(name):
    """Apply a configuration profile."""
    prof_data = get(f"/api/profiles/{name}")
    if not prof_data.get("ok"):
        console.print(f"[red]Profile {name} not found[/red]")
        return
    prof_content = prof_data.get("profile", {})
    post("/api/profiles/apply", {"profile": prof_content})
    console.print(f"[green]Applied profile: {name}[/green]")
