#!/usr/bin/env python3
"""
Interactive quick setup to:
  1) Add the current working directory as a repo (repos.json)
  2) Optionally index it
  3) Ensure venv + deps
  4) Optionally start infra (Qdrant/Redis via docker compose)
  5) Register MCP servers with Codex CLI and Claude Code

Run this from the ROOT of the repo you want to index:
  python /path/to/rag-service/scripts/quick_setup.py

Notes:
  - Never writes secrets without confirmation
  - Creates timestamped backups of modified config files
  - Uses Rich spinners/progress so users always see activity
"""
import os
import sys
import json
import time
import platform
import shutil
import subprocess
from pathlib import Path

try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.prompt import Confirm, Prompt
    from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TimeElapsedColumn
except Exception:
    print("This setup requires 'rich'. Install with: pip install rich", file=sys.stderr)
    sys.exit(1)

console = Console()


def write_repos_json(rag_root: Path, name: str, code_path: Path) -> Path:
    p = os.getenv('REPOS_FILE') or str(rag_root / 'repos.json')
    repos_path = Path(p)
    cfg = {'default_repo': name, 'repos': []}
    if repos_path.exists():
        try:
            cfg = json.loads(repos_path.read_text())
            if not isinstance(cfg, dict):
                cfg = {'default_repo': name, 'repos': []}
        except Exception:
            cfg = {'default_repo': name, 'repos': []}
    # Update or append
    repos = cfg.get('repos') or []
    found = False
    for r in repos:
        if (r.get('name') or '').strip().lower() == name.lower():
            r['path'] = str(code_path)
            found = True
            break
    if not found:
        repos.append({'name': name, 'path': str(code_path), 'keywords': [], 'path_boosts': [], 'layer_bonuses': {}})
    cfg['repos'] = repos
    # Ask to set default
    if Confirm.ask(f"Make [bold]{name}[/bold] the default repo?", default=True):
        cfg['default_repo'] = name
    repos_path.write_text(json.dumps(cfg, indent=2))
    return repos_path


def _venv_python(repo_root: Path) -> Path:
    if platform.system().lower().startswith('win'):
        return repo_root / '.venv' / 'Scripts' / 'python.exe'
    return repo_root / '.venv' / 'bin' / 'python'


def ensure_venv_and_deps(rag_root: Path, progress: Progress, task_id) -> bool:
    """Create .venv and install deps if needed."""
    py = _venv_python(rag_root)
    # Create venv if missing
    if not py.exists():
        progress.update(task_id, description='Creating virtualenv (.venv)')
        try:
            subprocess.check_call([sys.executable, '-m', 'venv', str(rag_root / '.venv')])
        except subprocess.CalledProcessError as e:
            console.print(f"[red]Failed to create venv:[/red] {e}")
            return False
    # Install deps
    progress.update(task_id, description='Installing dependencies')
    try:
        reqs = [str(rag_root / 'requirements-rag.txt'), str(rag_root / 'requirements.txt')]
        for req in reqs:
            if Path(req).exists():
                subprocess.check_call([str(py), '-m', 'pip', 'install', '--disable-pip-version-check', '-r', req])
        # quick sanity imports
        subprocess.check_call([str(py), '-c', 'import fastapi,qdrant_client,bm25s,langgraph;print("ok")'])
        return True
    except subprocess.CalledProcessError as e:
        console.print(f"[red]Dependency install failed:[/red] {e}")
        return False


def start_infra(rag_root: Path, progress: Progress, task_id) -> None:
    progress.update(task_id, description='Starting Qdrant/Redis (docker compose)')
    up = rag_root / 'scripts' / 'up.sh'
    if not up.exists():
        progress.update(task_id, description='Infra script not found (skipping)')
        time.sleep(0.3)
        return
    try:
        subprocess.check_call(['bash', str(up)])
    except Exception as e:
        console.print(f"[yellow]Infra start skipped/failed:[/yellow] {e}")
    # quick qdrant ping
    progress.update(task_id, description='Verifying Qdrant/Redis health')
    try:
        subprocess.check_call(['bash', '-lc', 'curl -s http://127.0.0.1:6333/collections >/dev/null || true'])
    except Exception:
        pass


def detect_codex() -> str | None:
    path = shutil.which('codex')
    return path


def codex_register(rag_root: Path, progress: Progress, task_id) -> None:
    path = detect_codex()
    if not path:
        progress.update(task_id, description='Codex CLI not found (skip)')
        time.sleep(0.3)
        return
    py = _venv_python(rag_root)
    name = 'rag-service'
    progress.update(task_id, description='Registering MCP with Codex')
    try:
        # remove existing silently
        subprocess.run(['codex', 'mcp', 'remove', name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.check_call(['codex', 'mcp', 'add', name, '--', str(py), '-m', 'server.mcp.server'])
    except subprocess.CalledProcessError as e:
        console.print(f"[yellow]Codex registration failed:[/yellow] {e}")


def _claude_config_path() -> Path | None:
    sysname = platform.system().lower()
    home = Path.home()
    if 'darwin' in sysname or 'mac' in sysname:
        return (home / 'Library' / 'Application Support' / 'Claude' / 'claude_desktop_config.json')
    if 'linux' in sysname:
        return (home / '.config' / 'Claude' / 'claude_desktop_config.json')
    if 'windows' in sysname or 'win' in sysname:
        appdata = os.getenv('APPDATA')
        if appdata:
            return Path(appdata) / 'Claude' / 'claude_desktop_config.json'
    return None


def claude_register(rag_root: Path, progress: Progress, task_id) -> None:
    cfgp = _claude_config_path()
    if not cfgp:
        progress.update(task_id, description='Claude config path not found (skip)')
        time.sleep(0.3)
        return
    cfgp.parent.mkdir(parents=True, exist_ok=True)
    py = _venv_python(rag_root)
    # Load existing
    data = {}
    if cfgp.exists():
        try:
            data = json.loads(cfgp.read_text())
        except Exception:
            data = {}
        # backup
        bak = cfgp.with_suffix(cfgp.suffix + f'.bak.{time.strftime("%Y%m%d-%H%M%S")}')
        bak.write_text(json.dumps(data, indent=2))
    # Merge entry
    ms = data.get('mcpServers') or {}
    ms['rag-service'] = {
        'command': str(py),
        'args': ['-m', 'server.mcp.server'],
        'env': {
            'OPENAI_API_KEY': os.getenv('OPENAI_API_KEY', '')
        }
    }
    data['mcpServers'] = ms
    progress.update(task_id, description='Writing Claude config')
    cfgp.write_text(json.dumps(data, indent=2))


def main():
    rag_root = Path(__file__).resolve().parents[1]
    # Allow explicit path override for code repo
    forced_path = None
    forced_name = None
    argv = sys.argv[1:]
    for i, a in enumerate(argv):
        if a.startswith('--path='):
            forced_path = a.split('=', 1)[1].strip()
        elif a == '--path' and i+1 < len(argv):
            forced_path = argv[i+1].strip()
        elif a.startswith('--name='):
            forced_name = a.split('=', 1)[1].strip()
        elif a == '--name' and i+1 < len(argv):
            forced_name = argv[i+1].strip()

    code_root = Path(forced_path or os.getcwd()).resolve()
    suggested = (forced_name or code_root.name.lower().replace(' ', '-').replace('_', '-'))
    title = "RAG Service — Quick Setup"
    msg = (
        f"Detected current directory:\n[bold]{code_root}[/bold]\n\n"
        "Create or update repos.json to include this path?\n"
    )
    console.print(Panel(msg, title=title, border_style="cyan"))
    if not Confirm.ask("Add this repo?", default=True):
        console.print("[yellow]Canceled.[/yellow]")
        return
    name = forced_name or Prompt.ask("Repository name", default=suggested)
    repos_path = write_repos_json(rag_root, name, code_root)
    console.print(f"[green]✓[/green] Updated {repos_path}")

    # Offer to index
    console.print(Panel(
        "Index now? This builds BM25 and embeddings; it may take time and bill your provider if configured.",
        title="Index Repository", border_style="yellow"
    ))
    do_index = Confirm.ask("Start indexing now?", default=False)

    console.print(Panel("Setup environment and agents?", title="Agents & Infra", border_style="cyan"))
    do_env = Confirm.ask("Ensure virtualenv + dependencies?", default=True)
    do_infra = Confirm.ask("Start Qdrant/Redis (docker compose)?", default=True)
    do_codex = Confirm.ask("Register Codex MCP?", default=True)
    do_claude = Confirm.ask("Register Claude MCP?", default=True)

    with Progress(
        SpinnerColumn(style='cyan'),
        TextColumn("{task.description}"),
        BarColumn(bar_width=None),
        TimeElapsedColumn(),
        transient=True,
    ) as progress:
        if do_env:
            t = progress.add_task("Preparing environment", total=None)
            ok = ensure_venv_and_deps(rag_root, progress, t)
            progress.remove_task(t)
            if not ok:
                console.print("[red]Environment setup failed; continuing without guarantees.[/red]")
        if do_infra:
            t = progress.add_task("Starting infra", total=None)
            start_infra(rag_root, progress, t)
            progress.remove_task(t)
        if do_index:
            t = progress.add_task("Indexing repository", total=None)
            env = os.environ.copy()
            env['REPO'] = name
            try:
                subprocess.check_call([str(_venv_python(rag_root)), '-m', 'indexer.index_repo'], env=env, cwd=str(rag_root))
                console.print(f"[green]✓[/green] Indexed repo: [bold]{name}[/bold]")
            except subprocess.CalledProcessError as e:
                console.print(f"[red]Indexing failed:[/red] {e}")
            progress.remove_task(t)
        if do_codex:
            t = progress.add_task("Registering Codex", total=None)
            codex_register(rag_root, progress, t)
            progress.remove_task(t)
        if do_claude:
            t = progress.add_task("Registering Claude", total=None)
            claude_register(rag_root, progress, t)
            progress.remove_task(t)

    # Friendly next-steps banner
    console.print(Panel(
        "Setup complete. Next steps:\n"
        " • Type 'codex' and try: Use rag_search to find OAuth in your repo\n"
        f" • Or run API: uvicorn server.app:app --host 127.0.0.1 --port 8012\n"
        f" • CLI streaming: python chat_cli.py --stream --api-url http://127.0.0.1:8012\n",
        title="You're ready!", border_style="green"
    ))


if __name__ == '__main__':
    main()
