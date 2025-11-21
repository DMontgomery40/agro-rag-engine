import click
from rich.console import Console
from rich.table import Table
from cli.commands.utils import post, get

console = Console()

HELP = {
    "title": "Ops",
    "description": "System operations: Docker, Git, Hardware.",
    "usage": "agro ops [status|scan_hw|containers|start|stop|logs|git_status|git_install]",
    "examples": """
    # Check system health
    $ agro ops status

    # List containers
    $ agro ops containers

    # Get logs for a container
    $ agro ops logs <container_id> --tail 100
    """,
    "commands": {
        "status": {
            "description": "Show overall system health (API, Docker, Indexer).",
            "usage": "agro ops status",
            "examples": "$ agro ops status"
        },
        "scan_hw": {
            "description": "Scan server hardware capabilities (GPU, CPU, RAM).",
            "usage": "agro ops scan_hw",
            "examples": "$ agro ops scan_hw"
        },
        "containers": {
            "description": "List managed Docker containers and their status.",
            "usage": "agro ops containers",
            "examples": "$ agro ops containers"
        },
        "start": {
            "description": "Start a specific Docker container.",
            "usage": "agro ops start <container_id>",
            "examples": "$ agro ops start agro-api"
        },
        "stop": {
            "description": "Stop a specific Docker container.",
            "usage": "agro ops stop <container_id>",
            "examples": "$ agro ops stop agro-api"
        },
        "restart": {
            "description": "Restart a specific Docker container.",
            "usage": "agro ops restart <container_id>",
            "examples": "$ agro ops restart agro-api"
        },
        "logs": {
            "description": "Fetch logs for a container.",
            "usage": "agro ops logs <container_id> [--tail <n>]",
            "examples": "$ agro ops logs agro-api --tail 50"
        },
        "git_status": {
            "description": "Check status of installed Git hooks.",
            "usage": "agro ops git_status",
            "examples": "$ agro ops git_status"
        },
        "git_install": {
            "description": "Install/Update Git hooks for auto-indexing.",
            "usage": "agro ops git_install",
            "examples": "$ agro ops git_install"
        }
    }
}

@click.command()
def status():
    """Show system health."""
    health = get("/api/health")
    console.print(f"API Health: [green]{health.get('status')}[/green] @ {health.get('ts')}")
    
    docker = get("/api/docker/status")
    console.print(f"Docker: [blue]{docker.get('runtime')}[/blue] - {docker.get('containers_count')} containers running")

@click.command()
def scan_hw():
    """Scan hardware capabilities."""
    console.print(post("/api/scan-hw"))

# --- DOCKER ---
@click.command()
def containers():
    """List docker containers."""
    res = get("/api/docker/containers")
    t = Table(title="Containers")
    t.add_column("Name")
    t.add_column("State")
    t.add_column("Status")
    
    for c in res.get("containers", []):
        style = "green" if c["state"] == "running" else "red"
        t.add_row(c["name"], f"[{style}]{c['state']}[/{style}]", c["status"])
    console.print(t)

@click.command()
@click.argument("container_id")
def start(container_id):
    """Start a container."""
    console.print(post(f"/api/docker/container/{container_id}/start"))

@click.command()
@click.argument("container_id")
def stop(container_id):
    """Stop a container."""
    console.print(post(f"/api/docker/container/{container_id}/stop"))

@click.command()
@click.argument("container_id")
def restart(container_id):
    """Restart a container."""
    console.print(post(f"/api/docker/container/{container_id}/restart"))

@click.command()
@click.argument("container_id")
@click.option("--tail", default=20, help="Number of lines")
def logs(container_id, tail):
    """Get container logs."""
    res = get(f"/api/docker/container/{container_id}/logs?tail={tail}")
    console.print(res.get("logs", ""))

# --- GIT ---
@click.command()
def git_status():
    """Show git hooks status."""
    console.print(get("/api/git/hooks/status"))

@click.command()
def git_install():
    """Install git hooks."""
    console.print(post("/api/git/hooks/install"))
