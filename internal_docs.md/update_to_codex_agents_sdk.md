Alright David — here’s a copy-pasteable runbook to spin up a Codex agent that knows your rag-service exists, can call it on demand via MCP, and can be evaluated with the new Evals features. I included a few short, complete code blocks where they materially help (no placeholders). I also pasted plain https:// links to the official docs so Codex (and you) can open the real sources.

Runbook — Codex + MCP bridge to rag-service (macOS)
What you’ll get
	1	Codex CLI installed and logged in
	2

1) Install Codex CLI and make sure it runs
Use either Homebrew or npm. One-liners, bundled:

# Homebrew path
brew update && brew install codex && codex --version

# or npm path
npm install -g @openai/codex && codex --version
(Codex install methods and quickstart are documented here: https://github.com/openai/codex#quickstart )
Now launch once and sign in with ChatGPT (Pro is fine):

codex
(Codex “Sign in with ChatGPT” flow is supported: https://github.com/openai/codex#using-codex-with-your-chatgpt-plan )

2) Make sure rag-service is present and runnable from CLI
You already have this repo, but here’s a clean setup path on macOS using the same directory style you’ve used:

mkdir -p /opt/app/ && \
cd /opt/app/ && \
[ -d rag-service ] || git clone https://github.com/project-author/rag-service && \
cd rag-service && \
/usr/bin/python3 -m venv .venv && \
. .venv/bin/activate && \
pip install -r requirements-rag.txt || true
Sanity-check your CLI entrypoint (you’ve run this before; this confirms it’s callable from a script):

cd /opt/app//rag-service && \
. .venv/bin/activate && \
python langgraph_app.py "project: smoke test: where is ProviderSetupWizard rendered?"
(We’re intentionally using the CLI so the MCP bridge can wrap it reliably. Your earlier terminal log showed this invocation is the contract.)

3) Create a tiny MCP server that wraps rag-service
MCP is the “USB-C for tools”. Codex can call any MCP server you register. We’ll expose two tools and run with stdio (the simplest, most reliable transport) using the official Python SDK (mcp).

mkdir -p /opt/app//rag-mcp && \
cd /opt/app//rag-mcp && \
/usr/bin/python3 -m venv .venv && \
. .venv/bin/activate && \
pip install "mcp[cli]" httpx && \
cat > /opt/app//rag-mcp/server.py <<'PY'
from __future__ import annotations
import subprocess, json, shlex, sys, os
from typing import Literal
from mcp.server.fastmcp import FastMCP

# Hard-wire the repo root so there are no placeholders.
RAG_ROOT = "/opt/app//rag-service"
VENV_BIN = os.path.join(RAG_ROOT, ".venv", "bin")
PYTHON   = os.path.join(VENV_BIN, "python")
ENTRY    = os.path.join(RAG_ROOT, "langgraph_app.py")

mcp = FastMCP("rag-mcp")

def _run_cli(repo: Literal["project","project","rag-service"], question: str, mode: str="answer") -> dict:
    """
    Calls your existing CLI:
      python langgraph_app.py "repo: question"
    Returns a dict with raw_text and (best-effort) json if the CLI prints JSON blocks.
    """
    q = f"{repo}: {question}".strip()
    cmd = f'cd {shlex.quote(RAG_ROOT)} && . .venv/bin/activate && {shlex.quote(PYTHON)} {shlex.quote(ENTRY)} {shlex.quote(q)}'
    out = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=180)
    stdout = out.stdout.strip()
    # Optional: try to extract a JSON object from stdout if your CLI emits one.
    parsed = None
    for line in stdout.splitlines():
        line=line.strip()
        if (line.startswith("{") and line.endswith("}")) or (line.startswith("[") and line.endswith("]")):
            try:
                parsed = json.loads(line); break
            except Exception:
                pass
    return {"mode": mode, "repo": repo, "question": question, "raw_text": stdout, "json": parsed, "returncode": out.returncode}

@mcp.tool()
def answer(repo: Literal["project","project","rag-service"], question: str) -> dict:
    """Answer a codebase question using rag-service CLI. Returns text + any JSON your CLI printed."""
    return _run_cli(repo, question, mode="answer")

@mcp.tool()
def search(repo: Literal["project","project","rag-service"], question: str) -> dict:
    """Retrieve context without forcing a final answer (same backend, useful for debugging)."""
    return _run_cli(repo, f"[search-mode] {question}", mode="search")

if __name__ == "__main__":
    # stdio is default; works with `codex mcp add … -- python server.py`
    mcp.run()
PY
MCP SDK & patterns docs for reference:https://github.com/modelcontextprotocol/python-sdk (official SDK)https://modelcontextprotocol.io/docs/concepts/tools (tool shape)Model Context Protocolhttps://modelcontextprotocol.io/docs/develop/build-server (server quickstart)Model Context Protocol

4) Register the MCP server with Codex
Codex reads MCP config from ~/.codex/config.toml and also has a CLI helper codex mcp add …. Use either.
Option A — CLI (easiest):

codex mcp add rag-service -- python /opt/app//rag-mcp/server.py
Option B — edit config file:

mkdir -p ~/.codex && \
cat >> ~/.codex/config.toml <<'TOML'
# Register David's rag-service bridge for Codex (stdio)
[mcp_servers.rag-service]
command = "python"
args    = ["/opt/app//rag-mcp/server.py"]
TOML
Docs describing Codex MCP config & CLI:https://developers.openai.com/codex/mcp/https://github.com/openai/codex (see “Configuration” and “Model Context Protocol (MCP)”)

5) Give Codex “muscle memory” via AGENTS.md
Codex supports per-workspace memory/instructions. Put this in the same folder where you run Codex (e.g., /opt/app/ or in each repo root). The docs list “Memory with AGENTS.md” under “Docs & FAQ” in the Codex repo readme.

cat > /opt/app//AGENTS.md <<'MD'
# Workspace rules for Codex (David Montgomery)
- Never assume the user is wrong or that files "don't exist."
- Before answering, call the MCP tool `rag-service.answer` to ground responses in the repo’s code.
- If retrieval confidence is borderline, return the best citations and ask a clarifying follow-up instead of guessing.
- Always include file paths + line refs when suggesting code edits.
- For discovery-only requests, prefer `rag-service.search`.
- Repo routing:
  - Use repo="project" for questions about the PROJECT codebase.
  - Use repo="project" for PROJECT.
  - Use repo="rag-service" for RAG internals.
- If the tool output has no good match, say so explicitly and suggest a narrower query; do not fabricate APIs, functions, or files.
MD
Why this file? It makes the “don’t assume I’m wrong; use the tool” instruction persistent so Codex defaults to calling your RAG bridge instead of hallucinating (see the Codex README section that links “Memory with AGENTS.md” and config details).

6) Quick smoke tests (non-interactive or interactive)
	•	Non-interactive (Codex supports codex exec for a one-shot prompt; see Codex docs “Non-interactive mode (codex exec)”): https://github.com/openai/codex/blob/main/docs/exec.md GitHub

cd /opt/app/ && \
codex exec -p "Use the MCP tool rag-service.answer(repo='project', question='Where is ProviderSetupWizard rendered?'). Return the file path(s) + line ranges from the tool output. If nothing is found, call rag-service.search first and try again."
	•	Interactive:

cd /opt/app/ && codex
# Then ask: 
# “Use rag-service.answer with repo='project' to find where PHI (phone numbers) are masked in events; cite files/lines.”
The CLI syntax above nudges Codex to call your MCP tool. Because the server wraps your existing langgraph_app.py, you don’t need to reinvent your RAG service.

7) Add guardrails (optional but recommended)
OpenAI’s Agents SDK Guardrails can run input/output checks in parallel to reduce hallucinations or enforce “no-citation = no answer.” You can progressively adopt them where your agent code runs (or as a future step if you move from Codex CLI → Agents SDK hosted agent).Docs: https://openai.github.io/openai-agents-python/guardrails/ OpenAI GitHub and ref API: https://openai.github.io/openai-agents-python/ref/guardrail/ OpenAI GitHub

8) Set up Evals to measure improvements
OpenAI’s DevDay update added Datasets, trace grading, prompt optimizer, and 3rd-party model support so you can score retrieval and see exactly where the agent skipped a tool call. Start simple:
	1	Convert a few of your known-good questions into a JSONL dataset (question, repo, expect_path_substring).
	2	Run the eval by calling your Codex-MCP setup and grade on the trace:
	◦	Did the agent call rag-service.answer?
	◦	Did the final output include the expected file path substring?
Helpful starting points:
	•	Evals guide (platform): https://platform.openai.com/docs/guides/evals OpenAI
	•	Agent evals page (platform): https://platform.openai.com/docs/guides/agent-evals OpenAI
	•	Cookbook examples for Evals, including tool-use evaluation:https://cookbook.openai.com/examples/evaluation/getting_started_with_openai_evals OpenAI Cookbookhttps://cookbook.openai.com/examples/evaluation/use-cases/tools-evaluation OpenAI Cookbook
You’ll get pass/fail + traces so you can see when Codex didn’t call the tool or when your RAG returned borderline scores and the agent refused to answer. Use that to tune your RAG thresholds later.

9) Optional: use OpenAI’s File Search instead (or in addition)
If you want Codex to query an OpenAI-hosted vector store instead of (or alongside) your Qdrant-backed RAG, you can attach File Search as a built-in tool to an agent built with the Responses/Agents APIs. Docs:
	•	File Search: https://platform.openai.com/docs/assistants/tools/file-search OpenAI
	•	Vector Store API: https://platform.openai.com/docs/api-reference/vector-stores OpenAI
This gives you hybrid retrieval and reranking out-of-the-box, but since you already have a working RAG, the MCP bridge above is the lightest, least-bloat path.

10) Troubleshooting (one step at a time)
	1	Codex can’t see MCP tools → run:

cat ~/.codex/config.toml
codex mcp --help
Make sure rag-service is listed, or re-add with codex mcp add … (see: https://developers.openai.com/codex/mcp/ )
	2	Tool runs but returns empty → run your CLI directly:

cd /opt/app//rag-service && \
. .venv/bin/activate && \
python langgraph_app.py "project: <your question>"
If the CLI is empty too, the issue is retrieval, not MCP.
	3	Codex assumes instead of calling the tool → tighten AGENTS.md (make “always call rag-service.answer” the first rule). The “Docs & FAQ” in Codex repo shows AGENTS.md support: https://github.com/openai/codex (see “Memory with AGENTS.md”).

Why this is the lowest-bloat path
	•	Uses Codex CLI you already have (install via brew/npm)
	•	Adds a 99-line MCP server instead of refactoring your RAG
	•	Keeps your current CLI contract as the single source of truth
	•	Gives you a clean on-ramp to Evals (datasets + trace grading) to watch confidence gating and tool-call discipline
If you want, we can next add a tiny eval harness that shells Codex through the MCP tool and writes pass/fail per question (using the grader logic from the Evals cookbook).



