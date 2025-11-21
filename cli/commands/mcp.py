import click
from rich.console import Console
from cli.commands.utils import post, get

console = Console()

HELP = {
    "title": "MCP",
    "description": "Manage Model Context Protocol (MCP) servers.",
    "usage": "agro mcp [status|start|stop|restart|test]",
    "examples": """
    # Check MCP status
    $ agro mcp status

    # Restart MCP server
    $ agro mcp restart

    # Test stdio connection
    $ agro mcp test
    """,
    "commands": {
        "status": {
            "description": "Check health and connectivity of MCP servers.",
            "usage": "agro mcp status",
            "examples": "$ agro mcp status"
        },
        "start": {
            "description": "Start the HTTP MCP server.",
            "usage": "agro mcp start",
            "examples": "$ agro mcp start"
        },
        "stop": {
            "description": "Stop the HTTP MCP server.",
            "usage": "agro mcp stop",
            "examples": "$ agro mcp stop"
        },
        "restart": {
            "description": "Restart the HTTP MCP server.",
            "usage": "agro mcp restart",
            "examples": "$ agro mcp restart"
        },
        "test": {
            "description": "Run a one-shot test against the Stdio MCP server.",
            "usage": "agro mcp test",
            "examples": "$ agro mcp test"
        }
    }
}

@click.command()
def status():
    """Check MCP server status."""
    console.print(get("/api/mcp/http/status"))

@click.command()
def start():
    """Start HTTP MCP server."""
    console.print(post("/api/mcp/http/start"))

@click.command()
def stop():
    """Stop HTTP MCP server."""
    console.print(post("/api/mcp/http/stop"))

@click.command()
def restart():
    """Restart HTTP MCP server."""
    console.print(post("/api/mcp/http/restart"))

@click.command()
def test():
    """Test stdio MCP server (one-shot)."""
    console.print(get("/api/mcp/test"))
