#!/usr/bin/env python3
"""
Make a repos.json from simple CLI args.

Usage examples:
  python scripts/make_repos_json.py repo-a=/abs/path/a repo-b=/abs/path/b --default repo-a

Environment fallbacks:
  REPO and REPO_PATH if provided (single repo).

Behavior:
  - Writes repos.json in repo root (or REPOS_FILE location if set)
  - If repos.json exists, writes a timestamped backup next to it
"""
import os, sys, json, time
from pathlib import Path


def parse_args(argv):
    pairs = []
    default_repo = None
    for arg in argv:
        if arg == '--help' or arg == '-h':
            print(__doc__)
            sys.exit(0)
        if arg.startswith('--default='):
            default_repo = arg.split('=',1)[1].strip()
            continue
        if arg == '--default':
            # next token is default
            # handled in caller for simplicity
            continue
        if '=' in arg:
            name, path = arg.split('=',1)
            name = name.strip()
            path = path.strip()
            if name and path:
                pairs.append((name, path))
    # Handle "--default name" form
    if '--default' in argv:
        i = argv.index('--default')
        if i+1 < len(argv):
            default_repo = argv[i+1].strip()
    return pairs, default_repo


def main():
    args = sys.argv[1:]
    pairs, default_repo = parse_args(args)

    # Fallback to env for single-repo if no pairs passed
    if not pairs:
        env_repo = (os.getenv('REPO') or '').strip()
        env_path = (os.getenv('REPO_PATH') or '').strip()
        if env_repo and env_path:
            pairs = [(env_repo, env_path)]
            if not default_repo:
                default_repo = env_repo
        else:
            print('No repo arguments provided and REPO/REPO_PATH not set. Example: repo-a=/abs/path/a')
            sys.exit(2)

    # Build config structure
    repos = []
    for name, path in pairs:
        repos.append({
            'name': name,
            'path': str(Path(path).expanduser()),
            'keywords': [],
            'path_boosts': [],
            'layer_bonuses': {}
        })

    if not default_repo:
        default_repo = repos[0]['name']

    cfg = {'default_repo': default_repo, 'repos': repos}

    # Output path
    out = os.getenv('REPOS_FILE') or str(Path(__file__).resolve().parents[1] / 'repos.json')
    outp = Path(out)
    outp_parent = outp.parent
    outp_parent.mkdir(parents=True, exist_ok=True)

    # Backup existing
    if outp.exists():
        ts = time.strftime('%Y%m%d-%H%M%S')
        bak = outp.with_suffix(outp.suffix + f'.bak.{ts}')
        bak.write_text(outp.read_text())
        print(f'Backed up existing {outp} -> {bak}')

    outp.write_text(json.dumps(cfg, indent=2))
    print(f'Wrote {outp} with {len(repos)} repo(s); default_repo={default_repo}')


if __name__ == '__main__':
    main()

