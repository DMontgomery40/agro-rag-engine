import click
from rich.console import Console
from rich.table import Table
from cli.commands.utils import post, get

console = Console()

HELP = {
    "title": "Golden",
    "description": "Manage the Golden Dataset (Question/Answer pairs) for evaluation.",
    "usage": "agro golden [list|add|test]",
    "examples": """
    # List questions
    $ agro golden list

    # Add a question
    $ agro golden add -q "How does auth work?" -e "server/auth.py" -e "middleware.py"

    # Test a specific question
    $ agro golden test "How does auth work?"
    """,
    "commands": {
        "list": {
            "description": "List all questions in the golden dataset.",
            "usage": "agro golden list",
            "examples": "$ agro golden list"
        },
        "add": {
            "description": "Add a new question/expected-path pair to the dataset.",
            "usage": "agro golden add -q <question> -e <file_path> [-e <file_path>...]",
            "examples": "$ agro golden add -q 'Login logic' -e 'auth.py'"
        },
        "test": {
            "description": "Run retrieval for a single question and check against expected paths.",
            "usage": "agro golden test <question>",
            "examples": "$ agro golden test 'Login logic'"
        }
    }
}

@click.command()
def list():
    """List golden questions."""
    data = get("/api/golden")
    t = Table(title="Golden Questions")
    t.add_column("Question")
    t.add_column("Expected Paths")
    
    for q in data.get("questions", []):
        paths = ", ".join(q.get("expect_paths", []))
        t.add_row(q.get("q"), paths)
    console.print(t)

@click.command()
@click.option("--question", "-q", required=True, help="The question")
@click.option("--expect", "-e", multiple=True, help="Expected file path (can repeat)")
@click.option("--repo", default="agro", help="Repository")
def add(question, expect, repo):
    """Add a new golden question."""
    payload = {
        "q": question,
        "repo": repo,
        "expect_paths": list(expect)
    }
    res = post("/api/golden", payload)
    console.print(res)

@click.command()
@click.argument("question")
def test(question):
    """Test a single question (adhoc)."""
    res = post("/api/golden/test", {"q": question})
    console.print(res)
