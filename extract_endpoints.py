#!/usr/bin/env python3
"""
Extract all endpoints from server/app.py and router files.
Outputs comprehensive CSV mapping for endpoint audit.
"""
import re
import csv
from pathlib import Path
from typing import List, Dict, Tuple

REPO_ROOT = Path(__file__).parent

def extract_app_endpoints() -> List[Dict]:
    """Extract all @app.METHOD(...) endpoints from app.py."""
    app_file = REPO_ROOT / "server" / "app.py"

    endpoints = []
    with open(app_file, 'r') as f:
        lines = f.readlines()

    # Pattern: @app.get("/path")
    pattern = r'@app\.(get|post|put|delete|patch)\(["\']([^"\']+)["\']'

    for line_num, line in enumerate(lines, 1):
        match = re.search(pattern, line)
        if match:
            method = match.group(1).upper()
            path = match.group(2)

            # Determine category based on path
            category = categorize_endpoint(path)

            endpoints.append({
                'category': category,
                'method': method,
                'path': path,
                'line_app': line_num,
                'router_file': '',
                'status': 'inline',
                'priority': get_priority(category)
            })

    return endpoints


def extract_router_endpoints() -> Dict[str, List[Dict]]:
    """Extract all endpoints from router files."""
    router_dir = REPO_ROOT / "server" / "routers"

    routers = {}

    # Get all .py files in routers/
    for router_file in router_dir.glob("*.py"):
        router_name = router_file.stem
        endpoints = []

        with open(router_file, 'r') as f:
            lines = f.readlines()

        # Pattern: @router.METHOD("/path")
        pattern = r'@router\.(get|post|put|delete|patch)\(["\']([^"\']+)["\']'

        for line_num, line in enumerate(lines, 1):
            match = re.search(pattern, line)
            if match:
                method = match.group(1).upper()
                path = match.group(2)

                category = categorize_endpoint(path)

                endpoints.append({
                    'category': category,
                    'method': method,
                    'path': path,
                    'line_router': line_num,
                    'router_file': f"routers/{router_name}.py",
                    'status': 'router-only',
                    'priority': get_priority(category)
                })

        if endpoints:
            routers[router_name] = endpoints

    return routers


def extract_special_routers() -> List[Dict]:
    """Extract endpoints from special routers: feedback, reranker_info, alerts, monitoring."""
    special_files = {
        'feedback': REPO_ROOT / "server" / "feedback.py",
        'reranker_info': REPO_ROOT / "server" / "reranker_info.py",
        'alerts': REPO_ROOT / "server" / "alerts.py",
    }

    all_endpoints = []

    for name, file_path in special_files.items():
        if not file_path.exists():
            continue

        with open(file_path, 'r') as f:
            lines = f.readlines()

        # Pattern: @router.METHOD("/path") or @monitoring_router.METHOD("/path")
        pattern = r'@(?:router|monitoring_router)\.(get|post|put|delete|patch)\(["\']([^"\']+)["\']'

        for line_num, line in enumerate(lines, 1):
            match = re.search(pattern, line)
            if match:
                method = match.group(1).upper()
                path = match.group(2)

                category = categorize_endpoint(path)

                all_endpoints.append({
                    'category': category,
                    'method': method,
                    'path': path,
                    'line_router': line_num,
                    'router_file': f"server/{file_path.name}",
                    'status': 'mounted',
                    'priority': get_priority(category)
                })

    return all_endpoints


def categorize_endpoint(path: str) -> str:
    """Categorize endpoint by path."""
    path_lower = path.lower()

    if '/search' in path_lower or '/answer' in path_lower or '/chat' in path_lower:
        return 'search'
    elif '/index' in path_lower:
        return 'indexing'
    elif '/docker' in path_lower:
        return 'docker'
    elif '/reranker' in path_lower:
        return 'reranker'
    elif '/eval' in path_lower or '/golden' in path_lower:
        return 'eval'
    elif '/config' in path_lower or '/secrets' in path_lower or '/env' in path_lower:
        return 'config'
    elif '/repos' in path_lower:
        return 'repos'
    elif '/cards' in path_lower:
        return 'cards'
    elif '/mcp' in path_lower:
        return 'mcp'
    elif '/profiles' in path_lower or '/checkpoint' in path_lower:
        return 'profiles'
    elif '/editor' in path_lower:
        return 'editor'
    elif '/langsmith' in path_lower or '/traces' in path_lower:
        return 'tracing'
    elif '/keywords' in path_lower:
        return 'keywords'
    elif '/pipeline' in path_lower:
        return 'pipeline'
    elif '/onboarding' in path_lower:
        return 'onboarding'
    elif '/autotune' in path_lower:
        return 'autotune'
    elif '/git' in path_lower:
        return 'git'
    elif '/cost' in path_lower or '/prices' in path_lower:
        return 'cost'
    elif '/health' in path_lower:
        return 'health'
    elif '/feedback' in path_lower:
        return 'feedback'
    elif '/alert' in path_lower or '/monitoring' in path_lower or '/webhooks' in path_lower:
        return 'monitoring'
    elif path == '/':
        return 'root'
    else:
        return 'other'


def get_priority(category: str) -> str:
    """Assign priority based on category."""
    p1 = {'search', 'indexing', 'config', 'health'}
    p2 = {'docker', 'reranker', 'eval', 'repos', 'tracing', 'pipeline'}

    if category in p1:
        return 'P1'
    elif category in p2:
        return 'P2'
    else:
        return 'P3'


def check_duplicates(app_endpoints: List[Dict], router_endpoints: Dict[str, List[Dict]],
                     special_endpoints: List[Dict]) -> List[Dict]:
    """Check for endpoints that exist in both app.py and routers."""
    duplicates = []

    # Build map of paths from app.py
    app_paths = {(e['method'], e['path']): e for e in app_endpoints}

    # Check router endpoints
    all_router_endpoints = special_endpoints.copy()
    for router_name, endpoints in router_endpoints.items():
        all_router_endpoints.extend(endpoints)

    for router_ep in all_router_endpoints:
        key = (router_ep['method'], router_ep['path'])
        if key in app_paths:
            # Found duplicate
            app_ep = app_paths[key]
            duplicates.append({
                'category': router_ep['category'],
                'method': router_ep['method'],
                'path': router_ep['path'],
                'line_app': app_ep['line_app'],
                'router_file': router_ep['router_file'],
                'status': 'duplicate',
                'priority': router_ep['priority']
            })

    return duplicates


def main():
    """Main execution."""
    print("Extracting endpoints from server/app.py...")
    app_endpoints = extract_app_endpoints()
    print(f"  Found {len(app_endpoints)} endpoints in app.py")

    print("\nExtracting endpoints from server/routers/...")
    router_endpoints = extract_router_endpoints()
    total_router = sum(len(eps) for eps in router_endpoints.values())
    print(f"  Found {total_router} endpoints across {len(router_endpoints)} router files")

    print("\nExtracting endpoints from special routers (feedback, alerts, etc.)...")
    special_endpoints = extract_special_routers()
    print(f"  Found {len(special_endpoints)} endpoints in special routers")

    print("\nChecking for duplicates...")
    duplicates = check_duplicates(app_endpoints, router_endpoints, special_endpoints)
    print(f"  Found {len(duplicates)} duplicate endpoints")

    # Combine all endpoints
    all_endpoints = []

    # Add app.py endpoints (excluding duplicates)
    duplicate_keys = {(d['method'], d['path']) for d in duplicates}
    for ep in app_endpoints:
        if (ep['method'], ep['path']) not in duplicate_keys:
            all_endpoints.append(ep)

    # Add router endpoints
    for router_name, endpoints in router_endpoints.items():
        for ep in endpoints:
            if (ep['method'], ep['path']) not in duplicate_keys:
                all_endpoints.append(ep)

    # Add special router endpoints
    for ep in special_endpoints:
        if (ep['method'], ep['path']) not in duplicate_keys:
            all_endpoints.append(ep)

    # Add duplicates with status='duplicate'
    all_endpoints.extend(duplicates)

    # Sort by category, then path
    all_endpoints.sort(key=lambda x: (x['category'], x['path']))

    # Write CSV
    output_file = REPO_ROOT / "agent_docs" / "endpoint-map.csv"
    output_file.parent.mkdir(exist_ok=True)

    print(f"\nWriting CSV to {output_file}...")
    with open(output_file, 'w', newline='') as f:
        fieldnames = ['Category', 'Method', 'Path', 'Line in app.py', 'Router File', 'Status', 'Priority']
        writer = csv.DictWriter(f, fieldnames=fieldnames)

        writer.writeheader()
        for ep in all_endpoints:
            writer.writerow({
                'Category': ep['category'],
                'Method': ep['method'],
                'Path': ep['path'],
                'Line in app.py': ep.get('line_app', ''),
                'Router File': ep.get('router_file', ''),
                'Status': ep['status'],
                'Priority': ep['priority']
            })

    print(f"\nSummary:")
    print(f"  Total endpoints: {len(all_endpoints)}")
    print(f"  Inline (app.py only): {sum(1 for e in all_endpoints if e['status'] == 'inline')}")
    print(f"  Router only: {sum(1 for e in all_endpoints if e['status'] == 'router-only')}")
    print(f"  Mounted: {sum(1 for e in all_endpoints if e['status'] == 'mounted')}")
    print(f"  Duplicates: {sum(1 for e in all_endpoints if e['status'] == 'duplicate')}")
    print(f"\nBy priority:")
    print(f"  P1: {sum(1 for e in all_endpoints if e['priority'] == 'P1')}")
    print(f"  P2: {sum(1 for e in all_endpoints if e['priority'] == 'P2')}")
    print(f"  P3: {sum(1 for e in all_endpoints if e['priority'] == 'P3')}")
    print(f"\nCSV written to: {output_file}")


if __name__ == '__main__':
    main()
