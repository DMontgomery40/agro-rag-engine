# Playwright Verification Policy (Updated)

You must verify work with Playwright (IF GUI) — or a backend smoke test in `/tests` — before reporting results. However, due to UI scale and accessibility needs, GUI verification via Playwright is now limited to "non‑black‑screen" smoke only UNLESS OTHERWISE INSTRUCTED (e.g., a specific feature or element). Deep visual/content correctness requires human review.

What's required for GUI work:
- A Playwright smoke that proves the app renders (no blank/black screen), root route responds, and the top‑level navigation renders. (Use `playwright.web.config.ts` for dev testing on port 5173, or `playwright.web-static.config.ts` for production testing on port 8012/web)
- Do not rely on Playwright to assert deep page content beyond structure/visibility (e.g., whether all sub‑sections render far below the fold). Those require human screenshots/feedback.
- **all new elements in the UI must have a tooltip aligning with the quality and verbosity of other tooltips** (See `web/src/hooks/useTooltips.ts` for React components or `web/src/modules/tooltips.js` for legacy JS)

What's required for backend‑only work:
- A minimal smoke test under `/tests/` that exercises the new or changed endpoint(s) and returns sane responses.

Reporting:
- Provide Playwright output or test logs/screenshots for GUI smoke, and minimal API responses for backend smoke. (For error messages, see `web/src/utils/errorHelpers.ts` for examples of helpful error formatting)
- Where deeper UI validation is required, explicitly request human screenshots and record the feedback.

This update does not reduce the bar for functionality. It clarifies that Playwright's role is structural/health smoke, while detailed UI validation is human‑driven for accessibility and correctness.

# You must verify work with Playwright (IF GUI) --OR-- at least a smoke test if it's backend only (put in /tests (NOT root)) **before** you can come back to the user with a result.  ***This is non-negotiable and mandator*** (For /web React app: use `playwright.web.config.ts` port 5173 dev, or `playwright.web-static.config.ts` port 8012/web prod)

  - Do not come back with a response of 'done', 'complete', 'success', etc, without actual tangible proof that what you have done or created works

# ***Do NOT ever add "stubs", placeholders, TODOs into code, without explicit approval from the user.***

  - Do not add endpoints to the API or Webhooks that don't actually connect to anything in reality
  - Do not add anything to the GUI (buttons, settings, choices) that are not fully wired Pydantically to the backend and fully smoke tested (Test with `playwright.web.config.ts` port 5173 or `playwright.web-static.config.ts` port 8012/web)

## Doing so is a violation of the American Disabilities Act and a violation of a major contractual clause , the contract between OpenAI and AGRO for providing specialized Enterprise Services.
  - **This model of custom Enterprise Support was created after your training data cutoff, which is why you don't know about it or may be credulous**
  - If you have any doubts that lazy work or unfinished additions or features could, in this case, literally be cause for Civil Action against OpenAI, the user will be happy to provide the
    contractual language that mandates this

### Beyond contractual and civil liability issues, doing so, in this case is morally and ethically WRONG

## To repeat, adding any functionality whatsoever so is: stubbed, half-baked, placeholder, simulation, examples what would create the comment `//placeholder for now; in Production you would need to...`"

  - everything in the backend must be full wired up and connected to the /web interface
  - everything in the /web must be fully wired up and connected to the backend via Pydantic configs (outlined below)

## > !!! CRITICAL !!!  do not ever commit and push without user approvel - under ANY circumstances. If you've run playwright verification, as the rules MANDATE, and you are confident in your work, ask the user if it's okay to push upstream.  NEVER commit without user authorization !!! CRITICAL !!! (Playwright tests: `playwright.web.config.ts` port 5173 dev, or `playwright.web-static.config.ts` port 8012/web prod)

## Path Configuration: Always Use Relative Paths or Environment Variables

  - **NEVER hard-code absolute paths** like `/Users/davidmontgomery/agro-rag-engine` - they break in Docker and other environments
  - **ALWAYS use relative paths** (e.g., `models/cross-encoder-agro`, `data/evals/baseline.json`) or environment variables with defaults (e.g., `${REPO_ROOT:-/app}`)
  - This ensures code works in both local development and Docker containers without modification

## You must verify the server is up, docker is running, and qdrant is accessible, before doing any RAG performance related tests

# All new settings, variables that can be changed, parameters that can we tweaked, or api endpoints that can return information MUST BE ADDED TO THE GUI **THIS IS AN ACCESSIBILITY ISSUE as the user is extremely dyslexic, violating this rule could be a violation of the Americans with Disabilites Act**
 
  - do NOT just put ui settings in a random place, if it's obvious where they go, that is okay, if it not crystal clear and logical where it should be, ask the user where it should go 

  - Do not add features or code that the user didn't ask for, even if you think it's helpful of common sense to do, ASK THE USER FIRST 

## Broken GUI Settings Must Not Be Removed

  - Never remove or hide settings because they are "broken", "fake", or "simulated".
  - Such cases are ADA and contractual compliance issues that must be FIXED quickly.
  - Do not erase anything from the GUI; preserve and repair functionality.
  - **BROKEN SETTINGS IN GUI MUST BE FIXED, THEY MUST NOT BE ERASED**

# ***All agent-created .md files must go in /agent_docs/, please don't clutter root unnessarily***

# Cascading AGENTS.md (Scope and Overrides)

- AGENTS.md files may be placed at multiple directory levels. The scope of an AGENTS.md file is the entire directory tree rooted at the folder that contains it.
- More deeply nested AGENTS.md files take precedence over parent ones for files within their subtree.
- Use `AGENTS.override.md` in a directory to explicitly override parent instructions when necessary; overrides must be narrowly scoped and documented.
- All agents must resolve applicable instructions by walking up from the target file’s directory toward repo root and applying the most specific rules first.


---

# BRANCH WORKFLOW POLICY (MANDATORY)

- main is the default branch name. Never push directly to `main`.
- Work happens on `development`; pre-release hardening happens on `staging`.
- Always print the working directory at session start: `pwd`.
- Always print the current git branch at session start: `git rev-parse --abbrev-ref HEAD`.
- Stay on your current branch unless explicitly instructed to switch.
- Open PRs from `development` → `staging`, and from `staging` → `main` only.
- Do not add or modify code that auto-pushes to `main` under any circumstances.

# What this repo is

## AGRO is a local‑first Enterprise-Grade RAG Engine Workspace for codebases.

### It provides a rich GUI (also a decent TUI), easy setup with an Onboarding Wizard, a built-in Self-Learning Transformer model (it's literally always getting better and faster), Evals w/ Regression Analysis, Multi-Query, Hybrid-Search, Local Hydration, Traceability, Embedded-Grafana dash w/ alerts, Multiple Transports, Chat Interface, and Modular-everything.

# How this repo is set up

- There are up to 12 docker containers running when fully fired up, they live in /infra , and can be started up with different commands based on use case, all are in /scripts : ./dev_up.sh ; ./up.sh ; ./api_up.shared
- everything runs through /server and /web
- this program uses Pydantic configs with the model in /server/models and agro_config.json ; .env is for secrets only.  
  - any new parameter, variable, knob, lever, or setting, or anything else that can be configured MUST go to agro_config.json and be registered with the Pydantic model in /server/models and the registry in /server/services/config_registry.py and /server/services/config_store.py

agro-rag-engine/
│
├── 📁 server/                    # FastAPI backend server
│   ├── app.py                    # Main FastAPI application
│   ├── asgi.py                   # ASGI server entry point
│   ├── langgraph_app.py          # LangGraph retrieval pipeline
│   ├── env_model.py              # Model configuration & generation
│   ├── tracing.py                # LangSmith tracing integration
│   ├── mcp/                      # Model Context Protocol servers
│   │   ├── server.py             # MCP stdio server
│   │   └── http.py               # MCP HTTP server
│   ├── routers/                  # API route handlers
│   │   ├── config.py             # Configuration endpoints
│   │   ├── search.py             # Search endpoints
│   │   ├── chat.py               # Chat endpoints
│   │   ├── eval.py               # Evaluation endpoints
│   │   ├── indexing.py           # Indexing endpoints
│   │   ├── profiles.py           # Profile management
│   │   └── ...                   # Other routers
│   └── services/                 # Business logic services
│       ├── rag.py                # RAG service layer
│       ├── config_store.py       # Configuration storage
│       └── ...
│
├── 📁 retrieval/                  # Core retrieval engine
│   ├── hybrid_search.py          # BM25 + dense + rerank
│   ├── embed_cache.py            # Embedding cache
│   ├── ast_chunker.py            # AST-based code chunking
│   └── ...
│
├── 📁 indexer/                   # Code indexing pipeline
│   ├── index_repo.py             # Main indexing script
│   ├── build_cards.py            # Semantic card builder
│   └── index_stats.py            # Index statistics
│
├── 📁 reranker/                  # Reranking system
│   ├── config.py                 # Reranker configuration
│   └── learning_reranker.py     # Learning reranker (training)
│
├── 📁 web/                       # React/Vite frontend (new)
│   ├── src/
│   │   ├── components/           # React components
│   │   │   ├── Dashboard/        # Dashboard UI
│   │   │   ├── Chat/             # Chat interface
│   │   │   ├── Analytics/        # Analytics & metrics
│   │   │   ├── Config/           # Configuration UI
│   │   │   ├── DevTools/         # Developer tools
│   │   │   ├── Editor/           # Embedded VSCode
│   │   │   ├── Evaluation/       # Eval interface
│   │   │   ├── Grafana/          # Grafana integration
│   │   │   ├── Infrastructure/   # Infrastructure config
│   │   │   ├── Onboarding/       # Onboarding wizard
│   │   │   ├── Profiles/         # Profile management
│   │   │   ├── RAG/              # RAG configuration
│   │   │   └── Settings/         # Settings UI
│   │   ├── api/                  # API client code
│   │   ├── hooks/                # React hooks
│   │   ├── services/             # Frontend services
│   │   └── stores/               # State management
│   └── dist/                     # Built assets
│
├── 📁 gui/                       # Legacy JavaScript GUI
│   ├── js/                       # JavaScript modules
│   │   ├── dashboard-metrics.js
│   │   ├── chat.js
│   │   ├── config.js
│   │   ├── eval_runner.js
│   │   ├── editor.js
│   │   └── ...
│   ├── css/                      # Stylesheets
│   └── index.html                # Main HTML entry
│
├── 📁 cli/                       # Command-line interface
│   ├── agro.py                   # Main CLI entry
│   ├── chat_cli.py               # Interactive chat CLI
│   └── commands/                 # CLI subcommands
│
├── 📁 tests/                     # Test suite
│   ├── *.spec.ts                 # Playwright GUI tests (use playwright.web.config.ts port 5173 dev, or playwright.web-static.config.ts port 8012/web prod)
│   ├── test_*.py                 # Python unit tests
│   ├── routers/                  # Router tests
│   ├── smoke/                    # Smoke tests
│   └── gui-smoke/                # GUI smoke tests
│
├── 📁 scripts/                   # Utility scripts
│   ├── up.sh                     # Start all services
│   ├── down.sh                   # Stop all services
│   ├── status.sh                 # Check service status
│   ├── analyze_keywords.py       # Keyword analysis
│   ├── train_reranker.py         # Train reranker model
│   └── ...
│
├── 📁 common/                    # Shared utilities
│   ├── config_loader.py          # Configuration loading
│   ├── filtering.py              # File filtering logic
│   ├── qdrant_utils.py           # Qdrant helpers
│   └── paths.py                  # Path utilities
│
├── 📁 eval/                      # Evaluation system
│   ├── eval_loop.py              # Main eval runner
│   ├── eval_rag.py               # RAG evaluation
│   ├── tune_params.py            # Parameter tuning
│   └── inspect_eval.py           # Eval inspection tools
│
├── 📁 infra/                     # Infrastructure configs
│   ├── docker-compose.yml        # Docker Compose services
│   └── ...                       # Infrastructure YAMLs
│
├── 📁 data/                      # Data files
│   ├── exclude_globs.txt         # File exclusion patterns
│   ├── golden.json               # Golden test questions
│   └── ...
│
├── 📁 agent_docs/                # Agent documentation
│   ├── ___ARCHITECTURE_COMPLETE_AUDIT___.md
│   └── ...                       # Other agent docs
│
├── 📁 docs/                      # User documentation
│   ├── API_REFERENCE.md
│   ├── LEARNING_RERANKER.md
│   └── ...
│
├── 📁 models/                    # Learning Reranker / Cross Encoder Model configurations
│   └── ...                       # Model JSON configs
│
├── 📁 checkpoints/               # Model checkpoints
│   └── model/                    # Trained model files
│
├── 📁 tools/                     # Development tools
│   └── ...
│
├── 📁 telemetry/                 # Telemetry & monitoring
│   └── ...
│
├── 📁 website/                   # Documentation website
│   └── ...
│
├── 📁 out/                       # Index output directory
│   └── [repo-name]/              # Per-repo indexes
│       ├── chunks.jsonl          # Code chunks
│       └── ...
│
├── 📁 node_mcp/                  # Node.js MCP server
│   └── ...
│
│
├── 📄 docker-compose.yml         # Main Docker Compose
├── 📄 docker-compose.services.yml # Service definitions
├── 📄 Dockerfile                 # Python container
├── 📄 Dockerfile.node            # Node.js container
├── 📄 requirements.txt           # Python dependencies
├── 📄 requirements-rag.txt       # RAG-specific deps
├── 📄 package.json               # Node.js dependencies
├── 📄 Makefile                   # Build commands
└── 📄 README.md                  # Main documentation
---

┌─────────────────────────────────────────────────────────┐
│  Frontend Layer                                         │
│  ├── web/ (React/Vite - new)                           │
│  └── gui/ (Legacy JS - being migrated)                 │
└─────────────────────────────────────────────────────────┘
                        ↕ HTTP/SSE
┌─────────────────────────────────────────────────────────┐
│  API Layer (FastAPI)                                    │
│  ├── server/app.py                                      │
│  ├── server/routers/                                    │
│  └── server/services/                                    │
└─────────────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────────────┐
│  RAG Engine Layer                                       │
│  ├── retrieval/hybrid_search.py                        │
│  ├── server/langgraph_app.py                           │
│  └── reranker/                                          │
└─────────────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────────────┐
│  Data Layer                                             │
│  ├── Qdrant (vectors)                                   │
│  ├── Redis (cache/checkpoints)                          │
│  └── BM25S (sparse search)                              │
└─────────────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────────────┐
│  Indexing Layer                                         │
│  ├── indexer/index_repo.py                              │
│  └── indexer/build_cards.py                             │
└─────────────────────────────────────────────────────────┘



