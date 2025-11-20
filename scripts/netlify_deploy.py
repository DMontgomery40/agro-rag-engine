#!/usr/bin/env python3
import os
import sys
import json
import urllib.request
import urllib.error

API = "https://api.netlify.com/api/v1"

def api(path: str, method: str = "GET", data: dict | None = None) -> dict:
    token = os.getenv("NETLIFY_API_KEY")
    if not token:
        print("NETLIFY_API_KEY not set", file=sys.stderr)
        sys.exit(2)
    url = f"{API}{path}"
    req = urllib.request.Request(url, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    body = json.dumps(data).encode("utf-8") if data is not None else None
    with urllib.request.urlopen(req, data=body, timeout=30) as resp:
        raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw else {}

def find_site(domain: str) -> dict | None:
    sites = api("/sites", "GET")
    dom = (domain or "").strip().lower()
    if isinstance(sites, list):
        for s in sites:
            for key in ("custom_domain", "url", "ssl_url"):
                val = (s.get(key) or "").lower()
                if val and dom in val:
                    return s
    return None

def trigger(domain: str) -> dict:
    s = find_site(domain)
    if not s:
        return {"domain": domain, "status": "not_found"}
    sid = s.get("id")
    if not sid:
        return {"domain": domain, "status": "no_site_id"}
    try:
        b = api(f"/sites/{sid}/builds", "POST", {})
        return {"domain": domain, "status": "triggered", "site_id": sid, "build_id": b.get("id")}
    except Exception as e:
        return {"domain": domain, "status": "error", "error": str(e)}

def main():
    if len(sys.argv) < 2:
        print("Usage: netlify_deploy.py [project.net|project.dev|both|list]", file=sys.stderr)
        sys.exit(2)
    cmd = sys.argv[1].strip().lower()
    if cmd == "list":
        sites = api("/sites", "GET")
        out = []
        for s in sites if isinstance(sites, list) else []:
            out.append({"id": s.get("id"), "name": s.get("name"), "url": s.get("url"), "custom_domain": s.get("custom_domain")})
        print(json.dumps(out, indent=2))
        return
    domains = ["project.net", "project.dev"] if cmd == "both" else [cmd]
    results = [trigger(d) for d in domains]
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    main()
