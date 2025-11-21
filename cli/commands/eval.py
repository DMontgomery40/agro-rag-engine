import click
from rich.console import Console
from cli.commands.utils import post, get

console = Console()

HELP = {
    "title": "Eval",
    "description": "Run retrieval evaluations against the Golden Dataset.",
    "usage": "agro eval [run|status|results|save_baseline|compare]",
    "examples": """
    # Run evaluation (limit 10 questions)
    $ agro eval run --limit 10

    # Check progress
    $ agro eval status

    # See results
    $ agro eval results

    # Compare with baseline
    $ agro eval compare
    """,
    "commands": {
        "run": {
            "description": "Execute the full evaluation suite against the Golden Dataset.",
            "usage": "agro eval run [--limit <int>]",
            "examples": "$ agro eval run --limit 50"
        },
        "status": {
            "description": "Check if an evaluation is currently running.",
            "usage": "agro eval status",
            "examples": "$ agro eval status"
        },
        "results": {
            "description": "Show results from the last evaluation run.",
            "usage": "agro eval results",
            "examples": "$ agro eval results"
        },
        "save_baseline": {
            "description": "Save current results as the new baseline for regression testing.",
            "usage": "agro eval save_baseline",
            "examples": "$ agro eval save_baseline"
        },
        "compare": {
            "description": "Compare current results against the saved baseline.",
            "usage": "agro eval compare",
            "examples": "$ agro eval compare"
        }
    }
}

@click.command()
@click.option("--limit", default=None, type=int, help="Limit number of questions")
def run(limit):
    """Run RAG evaluation suite."""
    payload = {}
    if limit: payload["sample_limit"] = limit
    res = post("/api/eval/run", payload)
    console.print(f"[green]Evaluation started:[/green] {res.get('message')}")
    console.print("Use `agro eval status` to check progress.")

@click.command()
def status():
    """Check evaluation status."""
    s = get("/api/eval/status")
    console.print(s)

@click.command()
def results():
    """Show latest evaluation results."""
    r = get("/api/eval/results")
    console.print(r)

@click.command()
def save_baseline():
    """Save current results as baseline."""
    res = post("/api/eval/baseline/save")
    console.print(res)

@click.command()
def compare():
    """Compare current results with baseline."""
    res = get("/api/eval/baseline/compare")
    console.print(res)
