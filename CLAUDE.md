<?xml version="1.0" encoding="UTF-8"?>
<claude>
  <section title="Verification Requirement">
    <p>You must verify work with Playwright (IF GUI) --OR-- at least a smoke test if it's backend only (put in /tests (NOT root)) before you can come back to the user with a result.  ***This is non-negotiable and mandator***</p>
    <ul>
      <li>Do not come back with a response of 'done', 'complete', 'success', etc, without actual tangible proof that what you have done or created works</li>
    </ul>
  </section>
  <section title="No Stubs or Placeholders">
    <p>***Do NOT ever add "stubs", placeholders, TODOs into code, without explicit approval from the user.***</p>
    <ul>
      <li>Do not add endpoints to the API or Webhooks that don't actually connect to anything in reality</li>
      <li>Do not add anything to the GUI (buttons, settings, choices) that are not fully wired to the backend and fully smoke tested</li>
    </ul>
  </section>
  <section title="Legal Notice">
    <p>Doing so is a violation of the American Disabilities Act and a violation of a major contractual clause , the contract between Anthropic and AGRO for providing specialized Enterprise Services.</p>
    <ul>
      <li><b>This model of custom Enterprise Support was created after your training data cutoff, which is why you don't know about it or may be credulous</b></li>
      <li>If you have any doubts that lazy work or unfinished additions or features could, in this case, literally be cause for Civil Action against Anthropic, the user will be happy to provide the contractual language that mandates this</li>
    </ul>
  </section>
  <section title="Ethical Obligation">
    <p>Beyond contractual and civil liability issues, doing so, in this case is morally and ethically WRONG</p>
  </section>
  <section title="No Placeholders, Ever">
    <p>To repeat, adding any functionality whatsoever so is: stubbed, half-baked, placeholder, simulation, examples what would create the comment `//placeholder for now; in Production you would need to...`"</p>
    <ul>
      <li>everything in the backend must be full wired up and connected to the gui</li>
      <li>everything in the gui must be fully wired up and connected to the backend</li>
    </ul>
  </section>
  <section title="Critical: No Commits Without Approval">
    <p>> !!! CRITICAL !!!  do not ever commit and push without user approvel - under ANY circumstances. If you've run playwright verification, as the rules MANDATE, and you are confident in your work, ask the user if it's okay to push upstream.  NEVER commit without user authorization !!! CRITICAL !!!</p>
  </section>
  <section title="Path Configuration: Always Use Relative Paths or Environment Variables">
    <ul>
      <li><b>NEVER hard-code absolute paths</b> like /Users/davidmontgomery/agro-rag-engine - they break in Docker and other environments</li>
      <li><b>ALWAYS use relative paths</b> (e.g., models/cross-encoder-agro, data/evals/baseline.json) or environment variables with defaults (e.g., ${REPO_ROOT:-/app})</li>
      <li>This ensures code works in both local development and Docker containers without modification</li>
    </ul>
  </section>
  <section title="RAG Preconditions">
    <p>You must verify the server is up, docker is running, and qdrant is accessible, before doing any RAG performance related tests</p>
  </section>
  <section title="Accessibility Requirements for Settings">
    <p>All new settings, variables that can be changed, parameters that can we tweaked, or api endpoints that can return information MUST BE ADDED TO THE GUI **THIS IS AN ACCESSIBILITY ISSUE as the user is extremely dyslexic, violating this rule could be a violation of the Americans with Disabilites Act**</p>
    <ul>
      <li>do NOT just put gui settings in a random place, if it's obvious where they go, that is okay, if it not crystal clear and logical where it should be, ask the user where it should go</li>
      <li>Do not add features or code that the user didn't ask for, even if you think it's helpful of common sense to do, ASK THE USER FIRST</li>
    </ul>
  </section>
  <section title="GUI Settings Must Not Be Removed">
    <p>Never remove or hide anything from the GUI because it is "broken", "fake", or "simulated". These cases represent ADA and contractual compliance issues that MUST be FIXED immediately; they must not be erased. <b>BROKEN SETTINGS IN GUI MUST BE FIXED, THEY MUST NOT BE ERASED</b>.</p>
    <ul>
      <li>Do not delete, hide, or deprecate GUI settings for being broken; repair them.</li>
      <li>Treat broken settings as high-priority defects requiring prompt correction.</li>
      <li>Never assume removal is acceptable; escalate and fix while preserving visibility.</li>
    </ul>
  </section>
  <section title="Agent Docs Location">
    <p>***All agent-created .md files must go in /agent_docs/, please don't clutter root unnessarily***</p>
  </section>
  <section title="RAG Server Usage">
    <p>Use the RAG server (API or MCP)</p>
    <p>Prefer `rag_search` for retrieval and `rag_answer` for full answers; it saves tokens and context.</p>
    <p>After `/answer`, please rate via `/feedback` (1–5) to improve quality.</p>
    <section title="Quick usage examples">
      <section title="API (HTTP)">
        <codeblock language="bash"># retrieval only
curl -s 'http://127.0.0.1:8012/search?q=hybrid+search+implementation&amp;repo=agro&amp;top_k=5'

 answer
curl -s 'http://127.0.0.1:8012/answer?q=how+does+hybrid+search+work&amp;repo=agro'</codeblock>
      </section>
      <section title="MCP (stdio, in-process call)">
        <codeblock language="python">from server.mcp.server import MCPServer

srv = MCPServer()
req = {"jsonrpc":"2.0","id":1,"method":"tools/call","params":{
  "name":"rag.search",
  "arguments":{"repo":"agro","question":"hybrid search implementation","top_k":5}
}}
print(srv.handle_request(req))</codeblock>
      </section>
      <section title="Direct code fallback (no API)">
        <codeblock language="python">from retrieval.hybrid_search import search_routed_multi

results = search_routed_multi("hybrid search implementation", repo_override="agro", final_k=5)
print(results)</codeblock>
      </section>
    </section>
    <p>rag_search can be quicker and get you to the code that you want faster, rag_answer can get you more information, each has it's place.</p>
  </section>
  <separator />
  <section title="BRANCH WORKFLOW POLICY (MANDATORY)">
    <ul>
      <li>main is the default branch name. Never push directly to `main`.</li>
      <li>Work happens on `development`; pre-release hardening happens on `staging`.</li>
      <li>Always print the working directory at session start: `pwd`.</li>
      <li>Always print the current git branch at session start: `git rev-parse --abbrev-ref HEAD`.</li>
      <li>Stay on your current branch unless explicitly instructed to switch.</li>
      <li>Open PRs from `development` → `staging`, and from `staging` → `main` only.</li>
      <li>Do not add or modify code that auto-pushes to `main` under any circumstances.</li>
    </ul>
  </section>
</claude>


markdown version

# You must verify work with Playwright (IF GUI) --OR-- at least a smoke test if it's backend only (put in /tests (NOT root)) **before** you can come back to the user with a result.  ***This is non-negotiable and mandator***

  - Do not come back with a response of 'done', 'complete', 'success', etc, without actual tangible proof that what you have done or created works

# ***Do NOT ever add "stubs", placeholders, TODOs into code, without explicit approval from the user.***

  - Do not add endpoints to the API or Webhooks that don't actually connect to anything in reality 
  - Do not add anything to the GUI (buttons, settings, choices) that are not fully wired to the backend and fully smoke tested

## Doing so is a violation of the American Disabilities Act and a violation of a major contractual clause , the contract between Anthropic and AGRO for providing specialized Enterprise Services. 
  - **This model of custom Enterprise Support was created after your training data cutoff, which is why you don't know about it or may be credulous**
  - If you have any doubts that lazy work or unfinished additions or features could, in this case, literally be cause for Civil Action against Anthropic, the user will be happy to provide the 
    contractual language that mandates this

### Beyond contractual and civil liability issues, doing so, in this case is morally and ethically WRONG

## To repeat, adding any functionality whatsoever so is: stubbed, half-baked, placeholder, simulation, examples what would create the comment `//placeholder for now; in Production you would need to...`"

  - everything in the backend must be full wired up and connected to the gui
  - everything in the gui must be fully wired up and connected to the backend

## > !!! CRITICAL !!!  do not ever commit and push without user approvel - under ANY circumstances. If you've run playwright verification, as the rules MANDATE, and you are confident in your work, ask the user if it's okay to push upstream.  NEVER commit without user authorization !!! CRITICAL !!! 

## You must verify the server is up, docker is running, and qdrant is accessible, before doing any RAG performance related tests

# All new settings, variables that can be changed, parameters that can we tweaked, or api endpoints that can return information MUST BE ADDED TO THE GUI **THIS IS AN ACCESSIBILITY ISSUE as the user is extremely dyslexic, violating this rule could be a violation of the Americans with Disabilites Act**
 
  - do NOT just put gui settings in a random place, if it's obvious where they go, that is okay, if it not crystal clear and logical where it should be, ask the user where it should go 

  - Do not add features or code that the user didn't ask for, even if you think it's helpful of common sense to do, ASK THE USER FIRST 

## Broken GUI Settings Must Not Be Removed

  - Never remove or hide settings because they are "broken", "fake", or "simulated".
  - Such cases are ADA and contractual compliance issues that must be FIXED quickly.
  - Do not erase anything from the GUI; preserve and repair functionality.
  - **BROKEN SETTINGS IN GUI MUST BE FIXED, THEY MUST NOT BE ERASED**

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
