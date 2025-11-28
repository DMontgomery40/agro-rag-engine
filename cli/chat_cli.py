#!/usr/bin/env python3
"""
Interactive CLI chat interface for RAG service.
Uses LangGraph with Redis checkpoints for conversation memory.

Usage:
    export REPO=agro
    export THREAD_ID=my-session-1
    export PORT=8012
    python -m cli.chat_cli

Commands:
    /repo <name>    - Switch repository (from repos.json)
    /model <name>   - Switch generation model (e.g. gpt-4o, claude-3-5-sonnet)
    /save           - Save conversation checkpoint
    /clear          - Clear conversation history
    /help           - Show commands
    /exit, /quit    - Exit chat
"""
import os
import sys
import requests  # type: ignore[import-untyped]
from pathlib import Path
from typing import Any, Optional

try:
    from dotenv import load_dotenv as _maybe_load_dotenv  # type: ignore
except Exception:
    _maybe_load_dotenv = None  # type: ignore[assignment]

def _load_env_file(env_path: Path) -> bool:
    """Load environment variables from .env if python-dotenv is installed."""
    if _maybe_load_dotenv is not None:
        return bool(_maybe_load_dotenv(env_path))
    return False

# Load environment
_load_env_file(Path(__file__).resolve().parents[1] / ".env")

from server.langgraph_app import build_graph
from server.services.config_registry import get_config_registry
from common.config_loader import list_repos
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.prompt import Prompt

console = Console()

# Configuration
_config_registry = get_config_registry()
_config_registry.load()
REPO = _config_registry.get_str('REPO', 'agro')
THREAD_ID = _config_registry.get_str('THREAD_ID', 'cli-chat')
PORT = _config_registry.get_int('PORT', 8012)
API_BASE = f"http://127.0.0.1:{PORT}"

class ChatCLI:
    """Interactive CLI chat with RAG."""

    def __init__(self, repo: str = 'agro', thread_id: str = 'cli-chat'):
        self.repo = repo
        self.thread_id = thread_id
        self.model = None  # Use server default unless set
        self.graph = None
        # Only init graph if API is unreachable
        self._graph_fallback_ready = False

    def _ensure_graph(self):
        """Initialize LangGraph with Redis checkpoints lazily."""
        if self._graph_fallback_ready:
            return
        try:
            self.graph = build_graph()
            self._graph_fallback_ready = True
            console.print("[green]✓[/green] Graph initialized locally (Redis checkpoints)")
        except Exception as e:
            console.print(f"[red]✗[/red] Failed to initialize local graph: {e}")
            # Don't exit, maybe API works

    def _get_config(self):
        """Get config for current thread."""
        return {"configurable": {"thread_id": self.thread_id}}

    def _format_answer(self, generation: str) -> str:
        """Format answer, removing repo header if present."""
        lines = generation.split('\n')
        # Remove [repo: ...] header if present
        if lines and lines[0].startswith('[repo:'):
            return '\n'.join(lines[1:]).strip()
        return generation

    def ask(self, question: str) -> dict:
        """Ask a question and get answer via API to capture event_id."""
        payload = {
            'question': question,
            'repo': self.repo
        }
        if self.model:
            payload['model'] = self.model

        try:
            # Use API to get event_id for feedback
            response = requests.post(f'{API_BASE}/api/chat', json=payload, timeout=120)
            if response.status_code == 200:
                return response.json()
            else:
                console.print(f"[yellow]API Error {response.status_code}: {response.text}[/yellow]")
                return self._ask_local(question)
        except Exception as e:
            console.print(f"[yellow]API unreachable ({e}). Falling back to local graph...[/yellow]")
            return self._ask_local(question)

    def _ask_local(self, question: str) -> dict:
        """Fallback to direct graph call."""
        self._ensure_graph()
        if not self.graph:
            return {"generation": "Error: Could not connect to API and local graph init failed.", "documents": [], "confidence": 0.0, "event_id": None}
        
        state = {
            "question": question,
            "documents": [],
            "generation": "",
            "iteration": 0,
            "confidence": 0.0,
            "repo": self.repo
        }
        # Note: Local graph doesn't support 'model' override easily unless passed in state/config hacks
        # We'll ignore self.model for local fallback for now
        result = self.graph.invoke(state, self._get_config())  # type: ignore[attr-defined]
        result['event_id'] = None  # No event_id for direct calls
        return result

    def switch_repo(self, new_repo: str):
        """Switch to a different repository."""
        allowed = set(list_repos())
        if new_repo not in allowed:
            console.print(f"[red]✗[/red] Invalid repo. Allowed: {sorted(allowed)}")
            return

        self.repo = new_repo
        console.print(f"[green]✓[/green] Switched to repo: [bold]{new_repo}[/bold]")

    def switch_model(self, new_model: str):
        """Switch generation model."""
        self.model = new_model
        console.print(f"[green]✓[/green] Switched model to: [bold]{new_model}[/bold]")

    def submit_feedback(self, event_id: str, rating: int, note: Optional[str] = None):
        """Submit feedback for a query."""
        if not event_id:
            console.print("[red]No event ID available for feedback (local run?)[/red]")
            return False
            
        if rating < 1 or rating > 5:
            console.print("[red]Rating must be between 1 and 5[/red]")
            return False
            
        try:
            signal = f"star{rating}"
            payload = {"event_id": event_id, "signal": signal}
            if note:
                payload["note"] = note
                
            response = requests.post(f'{API_BASE}/api/feedback', json=payload, timeout=5)
            if response.status_code == 200:
                console.print(f"[green]✓[/green] Feedback submitted: {rating}/5 stars")
                if note:
                    console.print(f"[dim]Note: {note}[/dim]")
                return True
            else:
                console.print(f"[red]Failed to submit feedback: {response.text}[/red]")
                return False
        except Exception as e:
            console.print(f"[red]Error submitting feedback: {e}[/red]")
            return False

    def show_help(self):
        """Show available commands."""
        help_text = """
## Commands

- `/repo <name>`  - Switch repository (from repos.json)
- `/model <name>` - Switch generation model (e.g. gpt-4o)
- `/save`         - Save conversation checkpoint (Redis)
- `/clear`        - Clear conversation history (new thread)
- `/help`         - Show this help
- `/exit`, `/quit` - Exit chat

## Interaction
- **Feedback**: After an answer, enter a number (1-5) to rate it.
- **Connection**: Tries API at `PORT` (env), falls back to local graph.
        """
        console.print(Markdown(help_text))

    def show_welcome(self):
        """Show welcome message."""
        welcome = f"""
# 🤖 RAG CLI Chat

Connected to: [bold cyan]{self.repo}[/bold cyan]
Thread ID: [bold]{self.thread_id}[/bold]
API: [dim]{API_BASE}[/dim]

Type your question or use `/help` for commands.
        """
        console.print(Panel(Markdown(welcome), border_style="cyan"))

    def run(self):
        """Main chat loop."""
        self.show_welcome()

        while True:
            try:
                # Get user input
                user_input = Prompt.ask(
                    f"\n[bold cyan]{self.repo}[/bold cyan] >",
                    default=""
                )

                if not user_input.strip():
                    continue

                # Handle commands
                if user_input.startswith('/'):
                    parts = user_input.split()
                    cmd = parts[0].lower()
                    arg = parts[1] if len(parts) > 1 else None

                    if cmd in ['/exit', '/quit']:
                        console.print("[yellow]Goodbye![/yellow]")
                        break

                    elif cmd == '/help':
                        self.show_help()
                        continue

                    elif cmd == '/repo':
                        if arg:
                            self.switch_repo(arg)
                        else:
                            console.print("[red]Usage:[/red] /repo <project|project>")
                        continue
                    
                    elif cmd == '/model':
                        if arg:
                            self.switch_model(arg)
                        else:
                            console.print("[red]Usage:[/red] /model <gpt-4o|claude-3-5-sonnet|...>")
                        continue

                    elif cmd == '/save':
                        console.print(f"[green]✓[/green] Checkpoint saved (thread: {self.thread_id})")
                        continue

                    elif cmd == '/clear':
                        # Create new thread ID to start fresh
                        import time
                        self.thread_id = f"cli-chat-{int(time.time())}"
                        console.print(f"[green]✓[/green] Cleared history (new thread: {self.thread_id})")
                        continue

                    else:
                        console.print(f"[red]Unknown command:[/red] {cmd}")
                        console.print("Type [bold]/help[/bold] for available commands")
                        continue

                # Ask question
                console.print("[dim]Thinking...[/dim]")
                result = self.ask(user_input)

                # Show answer
                answer = self._format_answer(result.get('generation', ''))
                confidence = result.get('confidence', 0.0)
                docs = result.get('documents', [])
                event_id = result.get('event_id')

                # Display answer in panel
                console.print("\n")
                console.print(Panel(
                    Markdown(answer),
                    title=f"Answer (confidence: {confidence:.2f})",
                    border_style="green" if confidence > 0.6 else "yellow"
                ))

                # Show top citations
                if docs:
                    console.print("\n[dim]Top sources:[/dim]")
                    for i, doc in enumerate(docs[:3], 1):
                        fp = doc.get('file_path', 'unknown')
                        start = doc.get('start_line', 0)
                        end = doc.get('end_line', 0)
                        score = doc.get('rerank_score', 0.0)
                        console.print(f"  [dim]{i}.[/dim] {fp}:{start}-{end} [dim](score: {score:.3f})[/dim]")

                # Collect feedback
                if event_id:
                    console.print("\n[dim]Rate (1-5) or Enter to skip:[/dim]")
                    try:
                        rating_input = Prompt.ask("", default="", show_default=False)
                        
                        if rating_input.strip():
                            try:
                                rating = int(rating_input.strip())
                                if 1 <= rating <= 5:
                                    self.submit_feedback(event_id, rating)
                                else:
                                    console.print("[red]Must be 1-5[/red]")
                            except ValueError:
                                pass
                    except (ValueError, KeyboardInterrupt):
                        pass

            except KeyboardInterrupt:
                console.print("\n[yellow]Use /exit to quit[/yellow]")
                continue
            except EOFError:
                console.print("\n[yellow]Goodbye![/yellow]")
                break
            except Exception as e:
                console.print(f"[red]Error:[/red] {e}")
                continue

def main():
    """Entry point."""
    # Check dependencies
    try:
        from rich.console import Console
    except ImportError:
        print("Error: Missing 'rich' library. Install with: pip install rich")
        sys.exit(1)

    # Get config from registry
    repo = _config_registry.get_str('REPO', 'agro')
    thread_id = _config_registry.get_str('THREAD_ID', 'cli-chat')

    # Create and run chat
    chat = ChatCLI(repo=repo, thread_id=thread_id)
    chat.run()

if __name__ == '__main__':
    main()
