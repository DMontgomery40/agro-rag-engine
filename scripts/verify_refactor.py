import ast
import os
from pathlib import Path
import sys

# Colors
GREEN = '\033[92m'
RED = '\033[91m'
RESET = '\033[0m'

def _router_prefixes(tree: ast.AST) -> dict:
    """Map variable names (e.g. `router`) to APIRouter prefixes from assignments like
    `router = APIRouter(prefix="/api")`.
    """
    prefixes: dict[str, str] = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign) and isinstance(node.value, ast.Call):
            # APIRouter(...) possibly qualified or imported
            func = node.value.func
            is_apirouter = (
                isinstance(func, ast.Name) and func.id == 'APIRouter'
            ) or (
                isinstance(func, ast.Attribute) and func.attr == 'APIRouter'
            )
            if not is_apirouter:
                continue
            prefix_val = ''
            for kw in node.value.keywords or []:
                if kw.arg == 'prefix' and isinstance(kw.value, ast.Constant) and isinstance(kw.value.value, str):
                    prefix_val = kw.value.value
                    break
            for tgt in node.targets:
                if isinstance(tgt, ast.Name):
                    prefixes[tgt.id] = prefix_val or ''
    return prefixes


def _join_path(prefix: str, path: str) -> str:
    if not prefix:
        return path
    if not path:
        return prefix
    p = (prefix.rstrip('/') + '/' + path.lstrip('/'))
    # collapse '//' if any
    return '/' + '/'.join([seg for seg in p.split('/') if seg]) if p != '/' else '/'


def get_routes_from_file(path: Path | str) -> set[str]:
    """Extract routes from decorators in a Python module.

    Handles:
    - @app.get/post/... and @router.get/post/...
    - @router.api_route(path, methods=[...]) → expands per method
    - APIRouter(prefix="/api") prefixes on router variables
    """
    p = Path(path)
    try:
        text = p.read_text(encoding='utf-8')
    except Exception as e:
        print(f"Error reading {p}: {e}")
        return set()

    try:
        tree = ast.parse(text)
    except Exception as e:
        print(f"Error parsing {p}: {e}")
        return set()

    prefixes = _router_prefixes(tree)
    routes: set[str] = set()

    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            for dec in node.decorator_list:
                if not isinstance(dec, ast.Call):
                    continue
                if not isinstance(dec.func, ast.Attribute):
                    continue
                method = dec.func.attr
                if method not in {'get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'api_route'}:
                    continue

                # Determine base (app or router var)
                base_name = ''
                if isinstance(dec.func.value, ast.Name):
                    base_name = dec.func.value.id

                # Extract path argument (string literal only)
                route_path = None
                if dec.args and isinstance(dec.args[0], ast.Constant) and isinstance(dec.args[0].value, str):
                    route_path = dec.args[0].value
                else:
                    # skip non-constant paths (f-strings/variables)
                    continue

                # Expand api_route methods if present
                methods = []
                if method == 'api_route':
                    for kw in dec.keywords or []:
                        if kw.arg == 'methods' and isinstance(kw.value, (ast.List, ast.Tuple)):
                            for elt in kw.value.elts:
                                if isinstance(elt, ast.Constant) and isinstance(elt.value, str):
                                    methods.append(elt.value.upper())
                    if not methods:
                        methods = ['GET']
                else:
                    methods = [method.upper()]

                # Apply router prefix if known
                prefix = prefixes.get(base_name, '')
                full_path = _join_path(prefix, route_path)

                for m in methods:
                    # Add canonical and with-trailing-slash forms to be lenient in comparisons
                    routes.add(f"{m} {full_path}")
                    if full_path != '/' and not full_path.endswith('/'):
                        routes.add(f"{m} {full_path}/")

    return routes

def get_router_files() -> list[Path]:
    """Find all modular router files in the codebase."""
    router_dir = Path("server/routers")
    files: list[Path] = []
    if router_dir.exists():
        files.extend(sorted(router_dir.glob("*.py")))
    # Additional top-level routers
    for extra in [
        Path("server/feedback.py"),
        Path("server/alerts.py"),  # includes alerts_router and monitoring_router
        Path("server/reranker_info.py"),
    ]:
        if extra.exists():
            files.append(extra)
    return files


def find_monolith_backup() -> Path | None:
    """Locate the monolith backup file to diff against.

    Tries several common filenames found in this repo.
    """
    candidates = [
        Path("server/app.py.monolithic.bak"),
        Path("server/app.monolithic.bak.py"),
        Path("server/app.backup.py"),
        Path("server/app.py.bak"),
        Path("server/app.py"),  # last resort (if monolith still present)
    ]
    for c in candidates:
        if c.exists():
            return c
    return None


def _canonicalize(routes: set[str]) -> set[str]:
    out: set[str] = set()
    for r in routes:
        try:
            meth, path = r.split(' ', 1)
        except ValueError:
            out.add(r)
            continue
        # canonical path: strip trailing slash except root
        if path != '/' and path.endswith('/'):
            path = path.rstrip('/')
        out.add(f"{meth} {path}")
    return out

def main():
    print("🔍 Verifying Route Parity...")
    
    # 1. Baseline: Monolith (backup)
    backup_path = find_monolith_backup()
    if not backup_path:
        print(f"{RED}Error: could not locate monolith backup (tried several names).{RESET}")
        sys.exit(1)

    old_routes = get_routes_from_file(backup_path)
    print(f"📦 Monolith ({backup_path.name}): Found {len(old_routes)} routes")

    # 2. Current: Distributed
    new_routes = set()
    
    # Scan all potential router files
    router_files = get_router_files()
    print(f"📂 Scanning {len(router_files)} router files...")
    for rf in router_files:
        if rf.exists():
            print(f"  - {rf}")
            r_routes = get_routes_from_file(rf)
            new_routes.update(r_routes)
            
    # Also scan asgi.py itself for root routes (like health and "/")
    new_routes.update(get_routes_from_file(Path("server/asgi.py")))

    print(f"🚀 Distributed System: Found {len(new_routes)} routes")
    
    # 3. Compare
    # Canonicalize (be lenient about trailing slash)
    missing = _canonicalize(old_routes) - _canonicalize(new_routes)

    # Known intentional removals/renames can be listed here if needed
    INTENTIONAL: set[str] = set()
    missing -= INTENTIONAL
    
    if missing:
        print(f"\n{RED}❌ MISSING ROUTES ({len(missing)}):{RESET}")
        for r in sorted(missing):
            print(f"  - {r}")
        sys.exit(1)
    else:
        print(f"\n{GREEN}✅ SUCCESS: All {len(old_routes)} routes from monolith are present in the new system.{RESET}")

if __name__ == "__main__":
    main()
