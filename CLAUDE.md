# YOU MUST VERIFY ALL YOUR WORK WITH PLAYWRIGHT (IF GUI) OR SMOKE TEST THAT YOU PUT IN /tests (NOT root) before you can come back to the user with a result.  This is non-negotiable 

## > !!! CRITICAL !!!  do not ever `git push` without user approvel - under ANY circumstances. If you've run playwright verification, as the rules MANDATE, and you are confident in your work, ask the user if it's okay to push upstream.  NEVER commit without user authorization !!! CRITICAL !!! 

## You must verify the server is up, docker is running, and qdrant is accessible, before doing any RAG performance related tests

# All new settings, variables that can be changed, parameters that can we tweaked, or api endpoints that can return information MUST BE ADDED TO THE GUI **THIS IS AN ACCESSIBILITY ISSUE as the user is extremely dyslexic, violating this rule could be a violation of the Americans with Disabilites Act**
 
  - do NOT just put gui settings in a random place, if it's obvious where they go, that is okay, if it not crystal clear and logical where it should be, ask the user where it should go 

  - Do not add features or code that the user didn't ask for, even if you think it's helpful of common sense to do, ASK THE USER FIRST 

# ***All agent-created .md files must go in /agent_docs/, please don't clutter root unnessarily***

# Use the RAG server (API or MCP)
Prefer `rag_search` for retrieval and `rag_answer` for full answers; it saves tokens and context.
After `/answer`, please rate via `/feedback` (1–5) to improve quality.

## Quick usage examples

- **API (HTTP)**

```bash
# retrieval only
curl -s 'http://127.0.0.1:8012/search?q=hybrid+search+implementation&repo=agro&top_k=5'

# full answer
curl -s 'http://127.0.0.1:8012/answer?q=how+does+hybrid+search+work&repo=agro'
```

- **MCP (stdio, in-process call)**

```python
from server.mcp.server import MCPServer

srv = MCPServer()
req = {"jsonrpc":"2.0","id":1,"method":"tools/call","params":{
  "name":"rag.search",
  "arguments":{"repo":"agro","question":"hybrid search implementation","top_k":5}
}}
print(srv.handle_request(req))
```

- **Direct code fallback (no API)**

```python
from retrieval.hybrid_search import search_routed_multi

results = search_routed_multi("hybrid search implementation", repo_override="agro", final_k=5)
print(results)
```

## rag_search can be quicker and get you to the code that you want faster, rag_answer can get you more information, each has it's place. 


---

# BRANCH WORKFLOW POLICY (MANDATORY)

- main is the default branch name. Never push directly to `main`.
- Work happens on `development`; pre-release hardening happens on `staging`.
- Always print the working directory at session start: `pwd`.
- Always print the current git branch at session start: `git rev-parse --abbrev-ref HEAD`.
- Stay on your current branch unless explicitly instructed to switch.
- Open PRs from `development` → `staging`, and from `staging` → `main` only.
- Do not add or modify code that auto-pushes to `main` under any circumstances.