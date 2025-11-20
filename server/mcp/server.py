#!/usr/bin/env python3
from __future__ import annotations
# ruff: noqa: E402

"""
MCP server exposing RAG tools for Codex/Claude integration (stdio transport).

Tools (sanitized names for OpenAI tool spec):
  - rag_answer(repo, question) → full LangGraph answer + citations
  - rag_search(repo, question) → retrieval-only (for debugging)
Compatibility: accepts legacy names "rag.answer" and "rag.search" on tools/call.
"""
import sys
import json
import os
from typing import Dict, Any
import urllib.request
import urllib.error
import urllib.parse
import json as _json
import requests

# Import canonical modules (no sys.path hacks)
from server.langgraph_app import build_graph
from retrieval.hybrid_search import search_routed_multi
from common.config_loader import list_repos


class MCPServer:
    """Minimal MCP server over stdio."""

    def __init__(self):
        self.graph = None
        self._init_graph()

    def _init_graph(self):
        try:
            self.graph = build_graph()
        except Exception as e:
            self._error(f"Failed to initialize graph: {e}")

    def _error(self, msg: str):
        print(f"ERROR: {msg}", file=sys.stderr)

    def _log(self, msg: str):
        print(f"LOG: {msg}", file=sys.stderr)

    def handle_rag_answer(self, repo: str, question: str) -> Dict[str, Any]:
        try:
            # Use API to get event_id for feedback
            response = requests.post('http://127.0.0.1:8012/api/chat', json={
                'question': question,
                'repo': repo
            })
            if response.status_code == 200:
                result = response.json()
                docs = result.get('documents', [])[:5]
                citations = [f"{d['file_path']}:{d['start_line']}-{d['end_line']}" for d in docs]
                return {
                    "answer": result.get('answer', ''),
                    "citations": citations,
                    "repo": result.get('repo', repo or "unknown"),
                    "confidence": float(result.get('confidence', 0.0) or 0.0),
                    "event_id": result.get('event_id')
                }
            else:
                # Fallback to direct graph call
                if not self.graph:
                    self._init_graph()
                if not self.graph:
                    return {"error": "Graph not initialized", "answer": "", "citations": [], "repo": repo or "unknown"}
                
                allowed = set(list_repos())
                if repo not in allowed:
                    return {"error": f"invalid repo '{repo}', allowed={sorted(allowed)}", "answer": "", "citations": [], "repo": repo or "unknown"}
                cfg = {"configurable": {"thread_id": f"mcp-{repo or 'default'}"}}
                state = {"question": question, "documents": [], "generation": "", "iteration": 0, "confidence": 0.0, "repo": repo}
                result = self.graph.invoke(state, cfg)
                docs = result.get("documents", [])[:5]
                citations = [f"{d['file_path']}:{d['start_line']}-{d['end_line']}" for d in docs]
                return {"answer": result.get("generation", ""), "citations": citations, "repo": result.get("repo", repo or "unknown"), "confidence": float(result.get("confidence", 0.0) or 0.0), "event_id": None}
        except Exception as e:
            self._error(f"rag.answer error: {e}")
            return {"error": str(e), "answer": "", "citations": [], "repo": repo or "unknown", "event_id": None}

    def handle_rag_search(self, repo: str, question: str, top_k: int = 10) -> Dict[str, Any]:
        try:
            allowed = set(list_repos())
            if repo not in allowed:
                return {"error": f"invalid repo '{repo}', allowed={sorted(allowed)}", "results": [], "repo": repo or "unknown", "count": 0}
            docs = search_routed_multi(question, repo_override=repo, m=4, final_k=top_k)
            results = [{
                "file_path": d.get("file_path", ""),
                "start_line": d.get("start_line", 0),
                "end_line": d.get("end_line", 0),
                "language": d.get("language", ""),
                "rerank_score": float(d.get("rerank_score", 0.0) or 0.0),
                "repo": d.get("repo", repo or "unknown")
            } for d in docs]
            return {"results": results, "repo": repo or "unknown", "count": len(results)}
        except Exception as e:
            self._error(f"rag.search error: {e}")
            return {"error": str(e), "results": [], "repo": repo or "unknown", "count": 0}

    def handle_rag_feedback(self, event_id: str, rating: int, note: str = None) -> Dict[str, Any]:
        """Submit feedback for a query."""
        try:
            if not event_id:
                return {"error": "Event ID is required", "success": False}
                
            if rating < 1 or rating > 5:
                return {"error": "Rating must be between 1 and 5", "success": False}
                
            signal = f"star{rating}"
            payload = {"event_id": event_id, "signal": signal}
            if note:
                payload["note"] = note
                
            response = requests.post('http://127.0.0.1:8012/api/feedback', json=payload)
            if response.status_code == 200:
                return {"success": True, "message": f"Feedback submitted: {rating}/5 stars"}
            else:
                return {"error": f"Failed to submit feedback: {response.text}", "success": False}
        except Exception as e:
            self._error(f"rag.feedback error: {e}")
            return {"error": str(e), "success": False}

    # --- Netlify helpers ---
    def _netlify_api(self, path: str, method: str = "GET", data: dict | None = None) -> dict:
        api_key = os.getenv("NETLIFY_API_KEY")
        if not api_key:
            raise RuntimeError("NETLIFY_API_KEY not set in environment")
        url = f"https://api.netlify.com/api/v1{path}"
        req = urllib.request.Request(url, method=method)
        req.add_header("Authorization", f"Bearer {api_key}")
        req.add_header("Content-Type", "application/json")
        body = _json.dumps(data).encode("utf-8") if data is not None else None
        try:
            with urllib.request.urlopen(req, data=body, timeout=30) as resp:
                raw = resp.read().decode("utf-8")
                return _json.loads(raw) if raw else {}
        except urllib.error.HTTPError as he:
            err_body = he.read().decode("utf-8", errors="ignore")
            raise RuntimeError(f"Netlify HTTP {he.code}: {err_body}")

    def _netlify_find_site_by_domain(self, domain: str) -> dict | None:
        sites = self._netlify_api("/sites", method="GET")
        if isinstance(sites, list):
            domain_low = (domain or "").strip().lower()
            for s in sites:
                for key in ("custom_domain", "url", "ssl_url"):
                    val = (s.get(key) or "").lower()
                    if val and domain_low in val:
                        return s
        return None

    def handle_netlify_deploy(self, domain: str) -> Dict[str, Any]:
        targets: list[str]
        if domain == "both":
            targets = ["project.net", "project.dev"]
        else:
            targets = [domain]
        results = []
        for d in targets:
            site = self._netlify_find_site_by_domain(d)
            if not site:
                results.append({"domain": d, "status": "not_found"})
                continue
            site_id = site.get("id")
            if not site_id:
                results.append({"domain": d, "status": "no_site_id"})
                continue
            try:
                build = self._netlify_api(f"/sites/{site_id}/builds", method="POST", data={})
                results.append({"domain": d, "status": "triggered", "site_id": site_id, "build_id": build.get("id")})
            except Exception as e:
                results.append({"domain": d, "status": "error", "error": str(e)})
        return {"results": results}

    # --- Web tools (allowlisted) ---
    _WEB_ALLOWED = {"openai.com", "platform.openai.com", "github.com", "openai.github.io"}

    def _is_allowed_url(self, url: str) -> bool:
        try:
            u = urllib.parse.urlparse(url)
            host = (u.netloc or "").lower()
            return any(host == h or host.endswith("." + h) for h in self._WEB_ALLOWED)
        except Exception:
            return False

    def handle_web_get(self, url: str, max_bytes: int = 20000) -> Dict[str, Any]:
        if not (url or "").startswith("http"):
            return {"error": "url must start with http(s)"}
        if not self._is_allowed_url(url):
            return {"error": "host not allowlisted"}
        req = urllib.request.Request(url, method="GET", headers={"User-Agent": "project-rag-mcp/1.0"})
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

    def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        method = request.get("method")
        req_id = request.get("id")

        if method == "tools/list":
            tools = [
                {
                    "name": "rag_answer",
                    "description": "Get a synthesized answer with citations from local codebase",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "repo": {"type": "string"},
                            "question": {"type": "string"}
                        },
                        "required": ["repo", "question"]
                    }
                },
                {
                    "name": "rag_search",
                    "description": "Retrieval-only search (returns file paths + line ranges)",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "repo": {"type": "string"},
                            "question": {"type": "string"},
                            "top_k": {"type": "integer", "default": 10}
                        },
                        "required": ["repo", "question"]
                    }
                },
                {
                    "name": "rag_feedback",
                    "description": "Submit feedback rating (1-5 stars) for a previous query to improve search quality",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "event_id": {"type": "string", "description": "Event ID from previous rag_answer call"},
                            "rating": {"type": "integer", "minimum": 1, "maximum": 5, "description": "Rating from 1 (poor) to 5 (excellent)"},
                            "note": {"type": "string", "description": "Optional feedback note"}
                        },
                        "required": ["event_id", "rating"]
                    }
                },
                {
                    "name": "netlify_deploy",
                    "description": "Trigger a Netlify build for project.net, project.dev, or both (uses NETLIFY_API_KEY)",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "domain": {"type": "string", "enum": ["project.net", "project.dev", "both"], "default": "both"}
                        }
                    }
                },
                {
                    "name": "web_get",
                    "description": "HTTP GET (allowlisted hosts only: openai.com, platform.openai.com, github.com, openai.github.io)",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "url": {"type": "string"},
                            "max_bytes": {"type": "integer", "default": 20000}
                        },
                        "required": ["url"]
                    }
                }
            ]
            return {"jsonrpc": "2.0", "id": req_id, "result": tools}

        elif method == "tools/call":
            params = request.get("params", {})
            tool_name = params.get("name")
            args = params.get("arguments", {})

            if tool_name in ("rag.answer", "rag_answer"):
                result = self.handle_rag_answer(repo=args.get("repo"), question=args.get("question", ""))
                return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}}
            elif tool_name in ("rag.search", "rag_search"):
                result = self.handle_rag_search(repo=args.get("repo"), question=args.get("question", ""), top_k=args.get("top_k", 10))
                return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}}
            elif tool_name in ("rag.feedback", "rag_feedback"):
                result = self.handle_rag_feedback(
                    event_id=args.get("event_id"),
                    rating=args.get("rating"),
                    note=args.get("note")
                )
                return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}}
            elif tool_name in ("netlify.deploy", "netlify_deploy"):
                domain = args.get("domain", "both")
                result = self.handle_netlify_deploy(domain)
                return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}}
            elif tool_name in ("web.get", "web_get"):
                url = args.get("url", "")
                max_bytes = args.get("max_bytes", 20000)
                result = self.handle_web_get(url, max_bytes=max_bytes)
                return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}}
            else:
                return {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": f"Unknown tool: {tool_name}"}}

        elif method == "initialize":
            return {"jsonrpc": "2.0", "id": req_id, "result": {"protocolVersion": "2024-11-05", "capabilities": {"tools": {}}, "serverInfo": {"name": "project-rag-mcp", "version": "1.0.0"}}}

        else:
            return {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": f"Method not found: {method}"}}

    def run(self):
        self._log("MCP server starting (stdio mode)...")
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                request = json.loads(line)
                response = self.handle_request(request)
                print(json.dumps(response), flush=True)
            except json.JSONDecodeError as e:
                self._error(f"Invalid JSON: {e}")
                print(json.dumps({"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Parse error"}}), flush=True)
            except Exception as e:
                self._error(f"Unexpected error: {e}")
                print(json.dumps({"jsonrpc": "2.0", "id": None, "error": {"code": -32603, "message": f"Internal error: {e}"}}), flush=True)


if __name__ == "__main__":
    server = MCPServer()
    server.run()
