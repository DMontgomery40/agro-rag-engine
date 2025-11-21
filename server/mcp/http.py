from __future__ import annotations
import os
import json
import urllib.request
import urllib.error
import urllib.parse
from typing import Dict, Any

from fastmcp import FastMCP

# Canonical imports
from server.langgraph_app import build_graph
from retrieval.hybrid_search import search_routed_multi
from common.config_loader import list_repos


mcp = FastMCP("rag-service")
_graph = None


def _get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph


@mcp.tool()
def answer(repo: str, question: str) -> Dict[str, Any]:
    """Answer a codebase question using local LangGraph (retrieval+generation). Returns text + citations."""
    g = _get_graph()
    allowed = set(list_repos())
    if repo not in allowed:
        return {"error": f"invalid repo '{repo}', allowed={sorted(allowed)}"}
    cfg = {"configurable": {"thread_id": f"http-{repo}"}}
    state = {
        "question": question,
        "documents": [],
        "generation": "",
        "iteration": 0,
        "confidence": 0.0,
        "repo": repo,
    }
    res = g.invoke(state, cfg)
    docs = res.get("documents", [])[:5]
    citations = [f"{d['file_path']}:{d['start_line']}-{d['end_line']}" for d in docs]
    return {
        "answer": res.get("generation", ""),
        "citations": citations,
        "repo": res.get("repo", repo),
        "confidence": float(res.get("confidence", 0.0) or 0.0),
    }


@mcp.tool()
def search(repo: str, question: str, top_k: int = 10) -> Dict[str, Any]:
    """Retrieve relevant code locations without generation."""
    allowed = set(list_repos())
    if repo not in allowed:
        return {"error": f"invalid repo '{repo}', allowed={sorted(allowed)}"}
    docs = search_routed_multi(question, repo_override=repo, m=4, final_k=top_k)
    results = [{
        "file_path": d.get("file_path", ""),
        "start_line": d.get("start_line", 0),
        "end_line": d.get("end_line", 0),
        "language": d.get("language", ""),
        "rerank_score": float(d.get("rerank_score", 0.0) or 0.0),
        "repo": d.get("repo", repo),
    } for d in docs]
    return {"results": results, "repo": repo, "count": len(results)}


@mcp.tool()
def netlify_deploy(domain: str = "both") -> Dict[str, Any]:
    """
    Trigger Netlify builds for configured domains.
    Args:
        domain: Site to deploy - 'project.net', 'project.dev', or 'both'
    """
    def _netlify_api(path: str, method: str = "GET", data: dict = None):
        api_key = os.getenv("NETLIFY_API_KEY")
        if not api_key:
            raise RuntimeError("NETLIFY_API_KEY not set")
        url = f"https://api.netlify.com/api/v1{path}"
        req = urllib.request.Request(url, method=method)
        req.add_header("Authorization", f"Bearer {api_key}")
        req.add_header("Content-Type", "application/json")
        body = json.dumps(data).encode("utf-8") if data else None
        with urllib.request.urlopen(req, data=body, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    
    def _find_site(domain: str):
        sites = _netlify_api("/sites")
        if isinstance(sites, list):
            for s in sites:
                for key in ("custom_domain", "url", "ssl_url"):
                    if domain.lower() in (s.get(key) or "").lower():
                        return s
        return None
    
    targets = ["project.net", "project.dev"] if domain == "both" else [domain]
    results = []
    for d in targets:
        try:
            site = _find_site(d)
            if not site:
                results.append({"domain": d, "status": "not_found"})
                continue
            site_id = site.get("id")
            build = _netlify_api(f"/sites/{site_id}/builds", method="POST", data={})
            results.append({"domain": d, "status": "triggered", "site_id": site_id, "build_id": build.get("id")})
        except Exception as e:
            results.append({"domain": d, "status": "error", "error": str(e)})
    return {"results": results}


@mcp.tool()
def web_get(url: str, max_bytes: int = 20000) -> Dict[str, Any]:
    """
    HTTP GET for allowlisted documentation domains.
    Allowed: openai.com, platform.openai.com, github.com, openai.github.io
    """
    allowed_hosts = {"openai.com", "platform.openai.com", "github.com", "openai.github.io"}
    
    def _is_allowed(url: str) -> bool:
        try:
            u = urllib.parse.urlparse(url)
            host = (u.netloc or "").lower()
            return any(host == h or host.endswith("." + h) for h in allowed_hosts)
        except Exception:
            return False
    
    if not url.startswith("http"):
        return {"error": "url must start with http(s)"}
    if not _is_allowed(url):
        return {"error": "host not allowlisted"}
    
    req = urllib.request.Request(url, method="GET", headers={"User-Agent": "agro-rag-mcp/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read(max_bytes + 1)
            clipped = raw[:max_bytes]
            return {
                "url": url,
                "status": resp.status,
                "length": len(raw),
                "clipped": len(raw) > len(clipped),
                "content_preview": clipped.decode("utf-8", errors="ignore")
            }
    except urllib.error.HTTPError as he:
        body = he.read().decode("utf-8", errors="ignore")
        return {"url": url, "status": he.code, "error": body[:1000]}
    except Exception as e:
        return {"url": url, "error": str(e)}


if __name__ == "__main__":
    # Serve over HTTP for remote MCP (platform evals). Use env overrides for host/port/path.
    host = os.getenv("MCP_HTTP_HOST", "0.0.0.0")
    port = int(os.getenv("MCP_HTTP_PORT", "8013"))
    path = os.getenv("MCP_HTTP_PATH", "/mcp")
    mcp.run(transport="http", host=host, port=port, path=path)
