// GUI Tooltips: human-readable help + accurate links
// Exposes window.Tooltips.{buildTooltipMap, attachTooltips}
(function(){
  function L(label, body, links, badges){
    const linkHtml = (links||[]).map(([txt, href]) => `<a href="${href}" target="_blank" rel="noopener">${txt}</a>`).join(' ');
    const badgeHtml = (badges||[]).map(([txt, cls]) => `<span class="tt-badge ${cls||''}">${txt}</span>`).join(' ');
    const badgesBlock = badgeHtml ? `<div class="tt-badges">${badgeHtml}</div>` : '';
    return `<span class=\"tt-title\">${label}</span>${badgesBlock}<div>${body}</div>` + (links && links.length ? `<div class=\"tt-links\">${linkHtml}</div>` : '');
  }

  function buildTooltipMap(){
    return {
      // Infrastructure & routing
      QDRANT_URL: L('Qdrant URL', 'HTTP URL for your Qdrant vector database. Used for dense vector queries during retrieval. If unavailable, retrieval still works via BM25 (sparse).', [
        ['Qdrant Docs: Collections', 'https://qdrant.tech/documentation/concepts/collections/'],
        ['Qdrant (GitHub)', 'https://github.com/qdrant/qdrant']
      ]),
      REDIS_URL: L('Redis URL', 'Connection string for Redis, used for LangGraph checkpoints and optional session memory. The graph runs even if Redis is down (stateless mode).', [
        ['Redis Docs', 'https://redis.io/docs/latest/'],
        ['LangGraph Checkpoints', 'https://langchain-ai.github.io/langgraph/concepts/persistence/'],
        ['Redis Connection URLs', 'https://redis.io/docs/latest/develop/connect/clients/']
      ]),
      REPO: L('Active Repository', 'Logical repository name for routing and indexing. MCP and CLI use this to scope retrieval. Must match a repository name defined in repos.json for multi-repo setups. Example: "agro", "myapp", "cli-tool". Used for multi-repo RAG systems where each repo has separate indices, keywords, and path boosts.', [
        ['Namespace Concept', 'https://en.wikipedia.org/wiki/Namespace'],
        ['MCP Protocol Spec', 'https://github.com/modelcontextprotocol/specification'],
        ['LangSmith Context', 'https://www.langchain.com/langsmith']
      ]),
      COLLECTION_NAME: L('Collection Name', 'Optional override for the Qdrant collection name where vectors are stored. Defaults to code_chunks_{REPO}. Set this if you maintain multiple profiles, A/B test embedding models, or run parallel indexing. Must be lowercase alphanumeric + underscore. Examples: code_chunks_v2, vectors_staging, embeddings_prod', [
        ['Qdrant Collections Intro', 'https://qdrant.tech/documentation/concepts/collections/'],
        ['Create Collections', 'https://qdrant.tech/documentation/concepts/collections/#create-collection'],
        ['Database Collections', 'https://en.wikipedia.org/wiki/Database_collection']
      ]),
      COLLECTION_SUFFIX: L(
        'Collection Suffix',
        'Optional string appended to the default collection name (code_chunks_{REPO}) for A/B testing different indexing strategies. For example, suffix "_v2" creates "code_chunks_myrepo_v2". Useful when comparing embedding models, chunking strategies, or reranking approaches without overwriting your production index. Leave empty for default collection.',
        [
          ['Qdrant Collections', 'https://qdrant.tech/documentation/concepts/collections/'],
          ['Collection Management', 'https://qdrant.tech/documentation/concepts/collections/#create-collection'],
          ['Collection Naming', 'https://qdrant.tech/documentation/concepts/collections/#collection-name']
        ],
        [['Experimental', 'warn']]
      ),
      GEN_TEMPERATURE: L(
        'Default Response Creativity',
        'Global default temperature for generation. 0.0 = deterministic; small values (0.04–0.2) add slight variation in prose. Use per‑model tuning for creative tasks vs. code answers.',
        [
          ['Sampling Controls', 'https://platform.openai.com/docs/guides/text-generation'],
          ['Nucleus/Top‑p', 'https://en.wikipedia.org/wiki/Nucleus_sampling']
        ]
      ),
      MAX_QUERY_REWRITES: L(
        'Multi‑Query Rewrites',
        'Number of LLM‑generated query variations. Each variation runs hybrid retrieval; results are merged and reranked. Higher improves recall but increases latency and API cost. Typical: 2–4.',
        [
          ['Multi‑Query Retriever', 'https://python.langchain.com/docs/how_to/MultiQueryRetriever/'],
          ['Multi‑Query RAG (paper)', 'https://arxiv.org/abs/2305.14283']
        ],
        [['Better recall','info'], ['Higher cost','warn']]
      ),
      USE_SEMANTIC_SYNONYMS: L(
        'Semantic Synonyms Expansion',
        'Expands queries with curated domain synonyms and abbreviations (e.g., auth → authentication, oauth, jwt). Complements LLM rewrites. Configure in data/semantic_synonyms.json.',
        [
          ['Synonym Config', '/files/data/semantic_synonyms.json'],
          ['Synonym Guide', '/docs/RETRIEVAL.md#synonyms']
        ]
      ),
      TOPK_DENSE: L(
        'Top‑K Dense Candidates',
        'Vector candidates pulled from Qdrant before fusion. Should be ≥ FINAL_K. Higher improves semantic recall but slows search. Typical: 50–200.',
        [
          ['Qdrant Search', 'https://qdrant.tech/documentation/concepts/search/']
        ]
      ),
      TOPK_SPARSE: L(
        'Top‑K Sparse Candidates',
        'BM25 candidates pulled before fusion. Should be ≥ FINAL_K. Higher improves keyword recall but slows search. Typical: 50–200.',
        [
          ['Okapi BM25', 'https://en.wikipedia.org/wiki/Okapi_BM25']
        ]
      ),
      RRF_K_DIV: L(
        'Reciprocal Rank Fusion (K)',
        'Fusion parameter for combining BM25 + vector rankings: score += 1/(K+rank). Lower K increases influence of lower ranks; higher K flattens. Typical: 30–100 (60 recommended).',
        [
          ['RRF Algorithm', 'https://en.wikipedia.org/wiki/Reciprocal_rank_fusion'],
          ['Hybrid Search', 'https://www.pinecone.io/learn/hybrid-search-intro/']
        ]
      ),
      CARD_BONUS: L(
        'Card Semantic Bonus',
        'Score bonus when a result matches code “Cards” (semantic summaries from enrichment). Improves intent‑based retrieval (e.g., “where is auth handled?”). Requires ENRICH_CODE_CHUNKS.',
        [
          ['Cards Feature', '/docs/CARDS.md'],
          ['Cards Builder', '/files/indexer/build_cards.py']
        ],
        [['Improves intent','info']]
      ),
      FILENAME_BOOST_EXACT: L(
        'Filename Exact Match Multiplier',
        'Score multiplier applied when the filename matches the query exactly (e.g., auth.py). Increase to prioritize file‑specific queries.',
        [
          ['Path Scoring', '/docs/RETRIEVAL.md#path-scoring']
        ]
      ),
      FILENAME_BOOST_PARTIAL: L(
        'Path Component Partial Match Multiplier',
        'Score multiplier for matches in any path component (dir name or filename prefix). Useful for queries like “auth” that should find src/auth/... files.',
        [
          ['Path Scoring', '/docs/RETRIEVAL.md#path-scoring']
        ]
      ),
      LANGGRAPH_FINAL_K: L(
        'LangGraph Final K',
        'Documents retrieved for LangGraph pipeline in /answer. Separate from retrieval FINAL_K. Higher = more context, higher cost. Typical: 10–30.',
        [
          ['LangGraph', 'https://langchain-ai.github.io/langgraph/']
        ]
      ),
      EXCLUDE_PATHS: L(
        'Exclude Directories',
        'Comma‑separated directories to exclude when building semantic Code Cards or indexing. Examples: node_modules, vendor, dist.',
        [
          ['Indexing Guide', '/docs/INDEXING.md']
        ]
      ),
      CODE_CARDS: L(
        'Code Cards',
        'High‑level semantic summaries of code chunks, built during enrichment. Cards enable intent‑based retrieval and better filtering for conceptual queries.',
        [
          ['Cards Feature', '/docs/CARDS.md'],
          ['Cards Builder', '/files/indexer/build_cards.py']
        ],
        [['Improves intent','info']]
      ),
      // Chat UI (React-only helpers)
      CHAT_SETTINGS: L(
        'Chat Configuration',
        'Settings that control model, answer length, rewrite strategy, and retrieval size for the chat interface. These affect latency, cost, and answer quality.',
        [
          ['RAG Retrieval', '/docs/RETRIEVAL.md']
        ],
        [['Affects quality','info'], ['Affects latency','info']]
      ),
      GEN_MODEL_CHAT: L(
        'Chat-Specific Model',
        'Overrides the default generation model for the chat view only. Falls back to GEN_MODEL when empty.',
        [
          ['OpenAI Models', 'https://platform.openai.com/docs/models']
        ]
      ),
      CHAT_TEMPERATURE: L(
        'Response Creativity (Chat)',
        'Controls randomness for chat answers. For code Q&A, prefer 0.0–0.3; for ideation, increase to 0.5–0.9.',
        [
          ['Sampling Controls', 'https://platform.openai.com/docs/guides/text-generation']
        ]
      ),
      CHAT_MAX_TOKENS: L(
        'Max Response Tokens (Chat)',
        'Upper bound on generated tokens for chat answers. ~4 chars ≈ 1 token. Higher values cost more and may slow responses.',
        [
          ['Tokenization Basics', 'https://huggingface.co/docs/transformers/main_classes/tokenizer']
        ]
      ),
      CHAT_CONFIDENCE_THRESHOLD: L(
        'Answer Confidence Threshold',
        'Minimum retrieval confidence to return an answer without fallback. Lower values return more answers (risking guesses); higher values are conservative.',
        [
          ['Precision vs Recall', 'https://en.wikipedia.org/wiki/Precision_and_recall']
        ]
      ),
      CONF_FALLBACK: L(
        'Fallback Confidence Threshold',
        'When initial retrieval confidence falls below this threshold, triggers a fallback with expanded query rewrites. Lower = more aggressive fallback. Typical: 0.5–0.7.',
        [
          ['RAG Retrieval', '/docs/RETRIEVAL.md']
        ]
      ),
      CHAT_SHOW_CITATIONS: L(
        'Inline File References',
        'Display source file paths and line numbers inline with the answer. Citations become clickable links to code locations.',
        [
          ['Retrieval Traceability', '/docs/RETRIEVAL.md#traceability']
        ]
      ),
      ADVANCED_RAG_TUNING: L(
        'Advanced Parameters',
        'Expert controls for fusion weighting, score bonuses, and iteration behavior. These significantly affect retrieval quality and performance. Change only if you understand trade-offs.',
        [
          ['RRF Fusion', 'https://en.wikipedia.org/wiki/Reciprocal_rank_fusion'],
          ['Retrieval Tuning', '/docs/RETRIEVAL.md']
        ],
        [['Expert Only','warn']]
      ),
      REPOS_FILE: L('Repos File', 'Path to repos.json that defines repo names, paths, keywords, path boosts, and layer bonuses used for multi-repo routing. Each repo entry includes name, path, optional keywords for boosting, path_boosts for directory-specific relevance, and layer_bonuses for hierarchical retrieval.', [
        ['JSON Format Reference', 'https://www.json.org/json-en.html'],
        ['Configuration Management', 'https://github.com/topics/configuration-management'],
        ['Config File Concepts', 'https://en.wikipedia.org/wiki/Configuration_file']
      ]),
      REPO_PATH: L(
        'Repo Path (fallback)',
        'Absolute filesystem path to the active repository when repos.json is not configured. This is the directory that will be indexed for code retrieval. Use repos.json instead for multi-repo setups with routing, keywords, and path boosts. Example: /Users/you/projects/myapp or /home/user/code/myrepo',
        [
          ['Path Patterns', 'https://github.com/github/gitignore'],
          ['Python pathlib Module', 'https://docs.python.org/3/library/pathlib.html'],
          ['File System Paths', 'https://en.wikipedia.org/wiki/Path_(computing)']
        ]
      ),
      OUT_DIR_BASE: L('Out Dir Base', 'Where retrieval looks for indices (chunks.jsonl, bm25_index/). Use ./out.noindex-shared for one index across branches so MCP and local tools stay in sync. Stores dense vectors (Qdrant), sparse BM25 index, and indexed chunks. Symptom of mismatch: rag_search returns 0 results.', [
        ['Directory Concepts', 'https://en.wikipedia.org/wiki/Directory_(computing)'],
        ['MCP Protocol Spec', 'https://github.com/modelcontextprotocol/specification'],
        ['Storage Management', 'https://qdrant.tech/documentation/concepts/storage/']
      ], [['Requires restart (MCP)','info']]),
      RAG_OUT_BASE: L(
        'RAG Out Base',
        'Optional override for OUT_DIR_BASE for retrieval-specific output directory. Advanced users can use this to separate indexing output from retrieval search indices while keeping OUT_DIR_BASE for main indexing. Most users should leave empty—use OUT_DIR_BASE only. Primarily for multi-environment setups needing separate retrieval and indexing directories.',
        [
          ['Configuration Management', 'https://12factor.net/config'],
          ['Storage Concepts', 'https://qdrant.tech/documentation/concepts/storage/'],
          ['BM25 Index Storage', 'https://github.com/BM25S/bm25s']
        ],
        [['Advanced', 'warn']]
      ),
      MCP_HTTP_HOST: L('MCP HTTP Host', 'Bind address for the HTTP MCP server (fast transport). Use 0.0.0.0 to listen on all interfaces, 127.0.0.1 for localhost only, or a specific IP like 192.168.1.100 for LAN access. MCP (Model Context Protocol) enables fast communication between clients and the RAG engine.', [
        ['HTTP Host Header Reference', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Host'],
        ['Localhost Concept', 'https://en.wikipedia.org/wiki/Localhost'],
        ['MCP Specification', 'https://github.com/modelcontextprotocol/specification']
      ]),
      MCP_HTTP_PORT: L('MCP HTTP Port', 'TCP port for HTTP MCP server (default 8013). Must not conflict with other services. Use ports 1024+ without special permissions. MCP enables fast, stateless communication for multi-client scenarios.', [
        ['Port Numbers', 'https://en.wikipedia.org/wiki/List_of_TCP_and_UDP_port_numbers'],
        ['HTTP Basics', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP'],
        ['MCP Specification', 'https://github.com/modelcontextprotocol/specification']
      ]),
      MCP_HTTP_PATH: L('MCP HTTP Path', 'URL path for the HTTP MCP endpoint (default /mcp). Example: http://localhost:8013/mcp. Customize for reverse proxies or routing needs. Must match client configuration if changed.', [
        ['URL Structure', 'https://developer.mozilla.org/en-US/docs/Learn/Common_questions/Web_mechanics/What_is_a_URL'],
        ['URI Standard', 'https://en.wikipedia.org/wiki/Uniform_Resource_Identifier'],
        ['MCP Specification', 'https://github.com/modelcontextprotocol/specification']
      ]),
      HOST: L(
        'Server Host',
        'Network interface for the HTTP server to bind to when running serve_rag. Use 0.0.0.0 for all interfaces (accessible from network), 127.0.0.1 for localhost only (secure, dev mode).',
        [
          ['Network Interfaces', 'https://en.wikipedia.org/wiki/Network_interface'],
          ['Localhost vs 0.0.0.0', 'https://stackoverflow.com/questions/20778771/what-is-the-difference-between-0-0-0-0-127-0-0-1-and-localhost']
        ]
      ),
      DATA_DIR: L(
        'Data Directory',
        'Base directory for application data storage (logs, tracking, temp files). Defaults to ./data. Change if you need data stored elsewhere or shared across deployments.',
        [
          ['Directory Structure', 'https://en.wikipedia.org/wiki/Directory_structure']
        ]
      ),
      THEME_MODE: L(
        'GUI Theme',
        'Color theme for web GUI. Options: "light" (light mode), "dark" (dark mode), "auto" (follows system preference). Changes appearance immediately when toggled.',
        [
          ['Dark Mode Benefits', 'https://en.wikipedia.org/wiki/Light-on-dark_color_scheme']
        ]
      ),
      OPEN_BROWSER: L(
        'Auto-Open Browser',
        'Automatically open browser to GUI when server starts (1=yes, 0=no). Convenient for local development, disable for server deployments or headless environments.',
        [
          ['Browser Automation', 'https://en.wikipedia.org/wiki/Browser_automation']
        ]
      ),
      AUTO_COLIMA: L(
        'Auto-Start Colima',
        'Automatically start Colima Docker runtime if not running (macOS only, 1=yes, 0=no). Convenient for local development, ensures Docker containers start without manual intervention.',
        [
          ['Colima', 'https://github.com/abiosoft/colima']
        ]
      ),
      COLIMA_PROFILE: L(
        'Colima Profile',
        'Colima profile name to use when AUTO_COLIMA is enabled. Profiles allow different Docker VM configurations (CPU, memory, disk). Default profile used if empty.',
        [
          ['Colima Profiles', 'https://github.com/abiosoft/colima#profile']
        ]
      ),
      DEV_LOCAL_UVICORN: L(
        'Dev Local Uvicorn',
        'Run Uvicorn ASGI server in direct Python mode instead of Docker for faster development iteration (1=yes, 0=no). Enables hot-reload and easier debugging. Production should use 0 (Docker).',
        [
          ['Uvicorn', 'https://www.uvicorn.org/']
        ]
      ),

      // Code Editor Integration
      EDITOR_ENABLED: L(
        'Editor Enabled',
        'Enable embedded code editor integration in GUI (1=yes, 0=no). Allows viewing and editing code snippets from retrieval results directly in browser.',
        [
          ['Code Editor Integration', 'https://en.wikipedia.org/wiki/Source-code_editor']
        ]
      ),
      EDITOR_PORT: L(
        'Editor Port',
        'TCP port for code editor service. Default: varies by editor. Must not conflict with other services (PORT, MCP_HTTP_PORT, PROMETHEUS_PORT).',
        [
          ['Port Configuration', 'https://en.wikipedia.org/wiki/Port_(computer_networking)']
        ]
      ),
      EDITOR_BIND: L(
        'Editor Bind Address',
        'Network interface for editor service to bind to. Use 127.0.0.1 for localhost-only access (secure), 0.0.0.0 for network access (enable remote editing).',
        [
          ['Network Binding', 'https://en.wikipedia.org/wiki/Network_socket']
        ]
      ),
      EDITOR_EMBED_ENABLED: L(
        'Editor Embed Mode',
        'Enable embedded editor iframe in GUI (1=yes, 0=no). When enabled, editor opens inline. When disabled, opens in new tab/window. Embedding requires CORS configuration.',
        [
          ['iframe Embedding', 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe']
        ]
      ),

      // ---------------- Missing/added keys (wired from React components) ----------------
      VECTOR_BACKEND: L(
        'Vector Backend',
        'Selects the vector search backend used for dense retrieval. Qdrant is the default/primary backend in AGRO and stores your embedding vectors for fast similarity search. Use this to switch between implementations when benchmarking or troubleshooting.',
        [
          ['Qdrant Docs', 'https://qdrant.tech/documentation/'],
          ['LangChain Vector Stores', 'https://python.langchain.com/docs/integrations/vectorstores/']
        ],
        [['Core Setting','info']]
      ),
      RERANKER_BACKEND: L(
        'Reranker Backend',
        'Choose the reranking provider to reorder retrieved results by semantic relevance (cross-encoder). Options typically include Cohere Rerank, the built‑in AGRO Learning Reranker, or none. Reranking improves answer quality but adds latency.',
        [
          ['Cohere Rerank', 'https://docs.cohere.com/docs/rerank'],
          ['Sentence‑Transformers (Cross‑Encoders)', 'https://www.sbert.net/examples/training/cross-encoder/README.html']
        ],
        [['Improves quality','info']]
      ),
      RERANK_INPUT_SNIPPET_CHARS: L(
        'Rerank Snippet Length (chars)',
        'Maximum number of characters from each retrieved chunk to send into the reranker. Larger values can improve fidelity but increase latency and cost; smaller values are faster but risk losing important context. Typical range: 512–2000.',
        [
          ['Tokenization Basics', 'https://huggingface.co/docs/transformers/main_classes/tokenizer'],
          ['Cohere Rerank', 'https://docs.cohere.com/docs/rerank']
        ]
      ),
      CHUNK_SIZE: L(
        'Chunk Size',
        'Target size (in characters) for each indexed chunk. For AST chunking this acts as a guardrail when nodes are large. Larger chunks preserve more context but reduce recall; smaller chunks improve recall but may fragment semantics.',
        [
          ['LangChain: Text Splitters', 'https://python.langchain.com/docs/modules/data_connection/document_transformers/text_splitters/'],
          ['Okapi BM25 (context windows)', 'https://en.wikipedia.org/wiki/Okapi_BM25']
        ],
        [['Affects recall/precision','info']]
      ),
      CHUNK_OVERLAP: L(
        'Chunk Overlap',
        'Number of characters overlapped between adjacent chunks. Overlap reduces boundary effects and improves recall at the cost of a larger index and slower indexing.',
        [
          ['LangChain: Text Splitters', 'https://python.langchain.com/docs/modules/data_connection/document_transformers/text_splitters/']
        ]
      ),
      INDEX_MAX_WORKERS: L(
        'Index Max Workers',
        'Maximum number of parallel workers used during indexing. Increase to speed up indexing on multi‑core machines; decrease if you observe system contention. A good starting point is CPU cores − 1.',
        [
          ['concurrent.futures', 'https://docs.python.org/3/library/concurrent.futures.html'],
          ['multiprocessing', 'https://docs.python.org/3/library/multiprocessing.html']
        ],
        [['Performance','info']]
      ),
      AGRO_RERANKER_ENABLED: L(
        'Learning Reranker Enabled',
        'Enable AGRO’s built‑in Learning Reranker (cross‑encoder) for improved ordering of retrieved chunks. Requires a trained model checkpoint and triplets data for training/mining.',
        [
          ['AGRO: Learning Reranker', '/docs/LEARNING_RERANKER.md'],
          ['Sentence‑Transformers', 'https://www.sbert.net/']
        ],
        [['Improves quality','info']]
      ),
      AGRO_RERANKER_MODEL_PATH: L(
        'Reranker Model Path',
        'Filesystem path to the trained reranker model checkpoint directory (relative paths recommended). The service loads weights from this path on startup or when reloaded.',
        [
          ['Python pathlib', 'https://docs.python.org/3/library/pathlib.html'],
          ['AGRO: Learning Reranker', '/docs/LEARNING_RERANKER.md']
        ]
      ),
      AGRO_LOG_PATH: L(
        'Reranker Log Path',
        'Directory where the reranker writes logs and training progress. Useful for monitoring and resuming experiments. Ensure the path is writable by the server process.',
        [
          ['Python logging', 'https://docs.python.org/3/library/logging.html']
        ]
      ),
      AGRO_TRIPLETS_PATH: L(
        'Triplets Dataset Path',
        'Path to mined triplets used for training the Learning Reranker. Triplets contain (query, positive, negative) examples. Keep under version control or in a reproducible data store.',
        [
          ['Triplet Loss', 'https://en.wikipedia.org/wiki/Triplet_loss'],
          ['SBERT Training Data', 'https://www.sbert.net/examples/training/cross-encoder/README.html']
        ]
      ),
      AGRO_RERANKER_MINE_MODE: L(
        'Triplet Mining Mode',
        'Strategy for mining training triplets: random, semi‑hard, or hard negatives. Harder negatives improve discriminative power but may be noisier and slower to mine.',
        [
          ['Hard Negative Mining', 'https://sbert.net/examples/training/quora_duplicate_questions/README.html']
        ],
        [['Advanced','info']]
      ),
      AGRO_RERANKER_MINE_RESET: L(
        'Reset Triplets Before Mining',
        'If enabled, deletes existing mined triplets before starting a new mining run. Use with caution to avoid losing curated datasets.',
        [
          ['Data Management Basics', 'https://en.wikipedia.org/wiki/Data_management']
        ],
        [['Destructive','warn']]
      ),
      RERANKER_TRAIN_MAX_LENGTH: L(
        'Reranker Train Max Length',
        'Maximum token length for reranker training examples. Longer sequences may improve context but require more memory and training time. Typical range: 256–1024.',
        [
          ['Transformers: Tokenization', 'https://huggingface.co/docs/transformers/main_classes/tokenizer']
        ]
      ),

      // React Chat settings (migrated from inline bubbles)
      INDEXING_PROCESS: L(
        'Indexing Process',
        'Indexing prepares your code for retrieval: it chunks files, builds a BM25 sparse index, optionally generates dense embeddings, and writes vectors to Qdrant. Re‑run after significant code changes to keep answers fresh.',
        [
          ['Okapi BM25', 'https://en.wikipedia.org/wiki/Okapi_BM25'],
          ['Qdrant Docs', 'https://qdrant.tech/documentation/']
        ],
        [['Re‑run after changes','reindex']]
      ),
      INDEX_PROFILES: L(
        'Index Profiles',
        'Preset configurations for common workflows: shared (BM25‑only, fast), full (BM25 + embeddings, best quality), dev (small subset). Profiles change multiple parameters at once to match your goal.',
        [
          ['Indexing Guide', '/docs/INDEXING.md']
        ],
        [['Convenience','info']]
      ),
      CHAT_CONFIDENCE: L(
        'Retrieval Confidence',
        'Show a normalized confidence score (0–1) alongside answers to help judge reliability. Scores reflect retrieval confidence, not model certainty.',
        [
          ['Precision vs Recall', 'https://en.wikipedia.org/wiki/Precision_and_recall']
        ]
      ),
      CHAT_AUTO_SCROLL: L(
        'Auto‑Scroll to New Messages',
        'Automatically scrolls the conversation to the newest message. Disable when reviewing earlier context while messages stream.',
        [
          ['ARIA Live Regions (UX)', 'https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions']
        ]
      ),
      CHAT_SYNTAX_HIGHLIGHT: L(
        'Code Block Highlighting',
        'Apply syntax highlighting to code blocks in responses. Improves readability in multi‑language projects. May increase render time on very long messages.',
        [
          ['Prism.js', 'https://prismjs.com/']
        ],
        [['Experimental','warn']]
      ),
      CHAT_SYSTEM_PROMPT: L(
        'Custom System Prompt',
        'Override the default expert system prompt for Chat. Use to adjust tone, safety constraints, or provide domain instructions. Leave empty to use the built‑in AGRO RAG expert prompt.',
        [
          ['Prompt Engineering (Guide)', 'https://platform.openai.com/docs/guides/prompt-engineering']
        ]
      ),
      CHAT_HISTORY: L(
        'Chat History Storage',
        'Controls how chat history is saved and loaded. History persists in browser localStorage only — no server storage for privacy.',
        [
          ['localStorage', 'https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage']
        ],
        [['Browser storage','info']]
      ),
      CHAT_HISTORY_ENABLED: L(
        'Save Chat Messages',
        'When enabled, messages are persisted to browser localStorage and restored on reload. Disable for ephemeral sessions or shared devices.',
        [
          ['localStorage', 'https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage']
        ]
      ),
      CHAT_HISTORY_LIMIT: L(
        'History Limit',
        'Maximum number of messages to retain in local history. Older messages are pruned when the limit is reached. Typical range: 50–1000.',
        [
          ['Usability: History & Recall', 'https://www.nngroup.com/articles/search-logs/']
        ]
      ),
      CHAT_HISTORY_LOAD_ON_START: L(
        'Load History on Startup',
        'Automatically loads and displays previous conversations when opening the Chat tab. Disable to start with a clean slate every session.',
        [
          ['localStorage', 'https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage']
        ]
      ),

      // Models / Providers
      GEN_MODEL: L('Generation Model', 'Answer model. Local: qwen3-coder:14b via Ollama. Cloud: gpt-4o-mini, etc. Larger models cost more and can be slower; smaller ones are faster/cheaper.', [
        ['OpenAI Models', 'https://platform.openai.com/docs/models'],
        ['Ollama API (GitHub)', 'https://github.com/ollama/ollama/blob/main/docs/api.md']
      ], [['Affects latency','info']]),
      GEN_TEMPERATURE: L(
        'Generation Temperature',
        'Controls randomness for generation across chat and evaluators. Lower values (0.0-0.3) yield deterministic, code-safe answers. Mid values (0.35-0.6) add variety for summaries or docs. High values (>0.7) are creative but can drift off-topic. For code Q&A, stay at 0.0-0.3; for brainstorming or narrative responses, try 0.4-0.6. Adjust alongside GEN_MAX_TOKENS to keep outputs concise.',
        [
          ['Retrieval Augmented Generation (RAG) - LangChain Concepts', 'https://python.langchain.com/docs/concepts/rag/'],
          ['Evaluation Best Practices', 'https://platform.openai.com/docs/guides/evaluation-best-practices']
        ],
        [['Affects tone', 'info']]
      ),
      OLLAMA_URL: L('Ollama URL', 'Local inference endpoint for Ollama running on your machine (e.g., http://127.0.0.1:11434/api). Used when GEN_MODEL targets a local model like llama2, mistral, qwen, or neural-chat. Requires Ollama installed and running: ollama serve', [
        ['Ollama REST API', 'https://github.com/ollama/ollama/blob/main/docs/api.md'],
        ['Ollama Docker Setup', 'https://ollama.com/blog/ollama-is-now-available-as-an-official-docker-image'],
        ['Ollama Model Library', 'https://ollama.com/library']
      ]),
      OLLAMA_REQUEST_TIMEOUT: L(
        'Local Request Timeout (seconds)',
        'Maximum total time to wait for a single local (Ollama) generation request to complete. Increase for long answers; decrease to fail fast on slow models or poor connectivity.',
        [
          ['Ollama API: Generate', 'https://github.com/ollama/ollama/blob/main/docs/api.md#generate-a-completion'],
          ['HTTP Timeouts', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Timeouts']
        ]
      ),
      OLLAMA_STREAM_IDLE_TIMEOUT: L(
        'Local Stream Idle Timeout (seconds)',
        'Maximum idle time allowed between streamed chunks from local (Ollama). If no tokens arrive within this window, the request aborts to prevent hanging streams.',
        [
          ['Streaming Basics', 'https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream'],
          ['Ollama Streaming', 'https://github.com/ollama/ollama/blob/main/docs/api.md#streaming']
        ]
      ),
      OPENAI_API_KEY: L('OpenAI API Key', 'API key used for OpenAI-based embeddings and/or generation.', [
        ['OpenAI: API Keys', 'https://platform.openai.com/docs/quickstart/step-2-set-up-your-api-key'],
        ['OpenAI Models', 'https://platform.openai.com/docs/models']
      ]),
      EMBEDDING_TYPE: L('Embedding Provider', 'Dense vectors (hybrid).\n• openai — strong quality, paid\n• voyage — strong retrieval, paid\n• mxbai — OSS via SentenceTransformers\n• local — any HF ST model', [
        ['OpenAI Embeddings', 'https://platform.openai.com/docs/guides/embeddings'],
        ['Voyage AI Embeddings', 'https://docs.voyageai.com/docs/embeddings'],
        ['Google Gemini Embeddings', 'https://ai.google.dev/gemini-api/docs/embeddings'],
        ['SentenceTransformers Docs', 'https://www.sbert.net/']
      ], [['Requires reindex','reindex']]),
      VOYAGE_API_KEY: L('Voyage API Key', 'API key for Voyage AI embeddings when EMBEDDING_TYPE=voyage.', [
        ['Voyage AI Docs', 'https://docs.voyageai.com/']
      ]),
      VOYAGE_EMBED_DIM: L('Voyage Embed Dim', 'Embedding vector dimension when using Voyage embeddings (provider‑specific). Larger dims can improve recall but increase Qdrant storage. Must match the output dimension of your chosen Voyage model (e.g., voyage-code-2 uses 1536 dims).', [
        ['Voyage Embeddings API', 'https://docs.voyageai.com/docs/embeddings'],
        ['Vector Dimensionality', 'https://www.sbert.net/docs/pretrained_models.html#model-overview'],
        ['Qdrant Storage Config', 'https://qdrant.tech/documentation/concepts/collections/']
      ], [['Requires reindex','reindex']]),

      // Reranking
      RERANK_BACKEND: L('Rerank Backend', 'Reranks fused candidates for better ordering.\n• cohere — best quality, paid (COHERE_API_KEY)\n• local/hf — no cost (ensure model installed)\nDisable only to save cost.', [
        ['Cohere Docs: Rerank', 'https://docs.cohere.com/reference/rerank'],
        ['Cohere Python (GitHub)', 'https://github.com/cohere-ai/cohere-python']
      ]),
      COHERE_API_KEY: L('Cohere API Key', 'API key for Cohere reranking when RERANK_BACKEND=cohere.', [
        ['Cohere Dashboard: API Keys', 'https://dashboard.cohere.com/api-keys']
      ]),
      COHERE_RERANK_MODEL: L('Cohere Rerank Model', 'Cohere rerank model name (e.g., rerank-3.5). Check the provider docs for the latest list and pricing.', [
        ['Cohere Docs: Models', 'https://docs.cohere.com/docs/models']
      ]),
      RERANKER_MODEL: L(
        'Local Reranker (HF)',
        'HuggingFace model name or path for local reranking when RERANK_BACKEND=local or hf. Common options: "cross-encoder/ms-marco-MiniLM-L-6-v2" (fast, good quality), "BAAI/bge-reranker-base" (higher quality, slower), or path to your fine-tuned model like "models/cross-encoder-agro". Local reranking is free but slower than Cohere. Ensure model is downloaded before use.',
        [
          ['Cross-Encoder Models', 'https://www.sbert.net/docs/cross_encoder/pretrained_models.html'],
          ['HuggingFace Model Hub', 'https://huggingface.co/models?pipeline_tag=text-classification&sort=downloads'],
          ['Local Reranker README', '/models/cross-encoder-agro/README.md'],
          ['Learning Reranker', '/docs/LEARNING_RERANKER.md']
        ],
        [['Free (no API costs)', 'info'], ['Requires download', 'warn']]
      ),
      RERANKER_BACKEND: L(
        'Reranker Backend',
        'Provider used for cross-encoder reranking. Options: "none" (skip rerank, fastest), "local"/"hf" (HuggingFace model path, free but requires downloads/VRAM), "cohere" (hosted, strong quality, paid), "voyage" (hosted, strong quality, paid). Choose local/hf for air‑gapped or cost-controlled setups, cohere/voyage for best ordering when latency/cost budgets allow, and none when you only want BM25 + dense fusion. Switches take effect immediately but may reload models/API clients.',
        [
          ['Cohere Rerank model docs', 'https://docs.cohere.com/docs/rerank'],
          ['Voyage AI reranker docs', 'https://docs.voyageai.com/docs/reranker'],
          ['SentenceTransformers cross-encoder guide', 'https://www.sbert.net/examples/applications/cross-encoder/README.html']
        ],
        [['Quality vs cost', 'info'], ['Requires model or API key', 'warn']]
      ),
      RERANK_INPUT_SNIPPET_CHARS: L(
        'Rerank Snippet Length',
        'Maximum characters from each candidate chunk sent to the reranker. Keeps payloads within provider limits and focuses scoring on the most relevant prefix. Typical range: 400-1200 chars. Use 400-600 when providers reject long inputs or latency is critical; 800-1200 when answers depend on longer doc/context blocks. If set too low, quality drops from missing context; too high increases latency and rerank cost per request.',
        [
          ['Voyage reranker token limits', 'https://docs.voyageai.com/docs/reranker'],
          ['Cohere rerank context length', 'https://docs.cohere.com/docs/rerank']
        ],
        [['Affects latency/cost', 'warn'], ['Context guardrail', 'info']]
      ),

      // Reranker Inference (live search blending)
      AGRO_RERANKER_ENABLED: L(
        'Agro Reranker Enabled',
        'Toggle the self-hosted Agro learning reranker (1=yes, 0=no). When enabled, retrieval uses your fine-tuned cross-encoder at AGRO_RERANKER_MODEL_PATH instead of external APIs. Keep on once a trained model is cached locally; turn off while collecting feedback, when falling back to hosted rerankers, or when the local model is unavailable. Requires the model files to be present and readable.',
        [
          ['SentenceTransformers cross-encoder guide', 'https://www.sbert.net/examples/applications/cross-encoder/README.html'],
          ['Voyage reranker docs', 'https://docs.voyageai.com/docs/reranker']
        ],
        [['Quality boost', 'info'], ['Requires local model', 'warn']]
      ),
      AGRO_RERANKER_MODEL_PATH: L(
        'Agro Reranker Model Path',
        'Filesystem path to the fine-tuned Agro reranker checkpoint (e.g., models/cross-encoder-agro). Must be a directory loadable by transformers.from_pretrained. Update after training or syncing a new checkpoint; reload the reranker to apply. Keep paths relative to repo or mounted volume for Docker compatibility.',
        [
          ['Transformers from_pretrained (local path) docs', 'https://huggingface.co/docs/transformers/main_classes/model#transformers.PreTrainedModel.from_pretrained']
        ],
        [['Requires download', 'warn'], ['Keep portable paths', 'info']]
      ),
      AGRO_LOG_PATH: L(
        'Agro Reranker Log Path',
        'Directory for reranker mining/training logs and metrics. Use a persistent, writable location so progress and diagnostics survive restarts. Large runs can create hundreds of MB of logs; rotate or archive when finished. Keep this on a shared volume in Docker to avoid losing history.',
        [
          ['Python logging HOWTO', 'https://docs.python.org/3/howto/logging.html']
        ],
        [['Diagnostics', 'info']]
      ),
      AGRO_TRIPLETS_PATH: L(
        'Triplets Dataset Path',
        'Path to the mined triplets file used for Agro reranker training (query, positive, negative). Store on durable storage so mining and training share the same dataset. Useful for maintaining separate datasets per repo or branch (e.g., data/reranker/triplets.jsonl). Back up before destructive operations.',
        [
          ['SentenceTransformers triplet training (Quora)', 'https://www.sbert.net/examples/training/quora_duplicate_questions/README.html']
        ],
        [['Data quality critical', 'warn']]
      ),
      AGRO_RERANKER_MINE_MODE: L(
        'Triplet Mining Mode',
        'Negative mining strategy for generating new training triplets. "random" = safest baseline, fast but easy negatives. "semi-hard" = balanced default, uses mid-ranked negatives that teach nuance. "hard" = most challenging negatives; best quality when labels are clean but risky if feedback is noisy. Adjust based on data quality and training stability.',
        [
          ['SentenceTransformers triplet training workflow', 'https://www.sbert.net/examples/training/quora_duplicate_questions/README.html']
        ],
        [['Tune for data quality', 'warn']]
      ),
      AGRO_RERANKER_MINE_RESET: L(
        'Reset Mined Triplets',
        'Reset flag for the miner to clear previously gathered triplets before the next mining run (1=yes, 0=no). Use when switching repositories, changing mining rules, or starting a clean dataset. Back up AGRO_TRIPLETS_PATH first—reset discards accumulated positives/negatives.',
        [
          ['SentenceTransformers triplet training workflow', 'https://www.sbert.net/examples/training/quora_duplicate_questions/README.html']
        ],
        [['Destructive operation', 'warn']]
      ),
      AGRO_RERANKER_ALPHA: L(
        'Reranker Blend Alpha',
        'Weight of the cross-encoder reranker score during final fusion. Higher alpha prioritizes semantic pairwise scoring; lower alpha relies more on initial hybrid retrieval (BM25 + dense). Typical range 0.6–0.8. Increasing alpha can improve ordering for nuanced queries but may surface false positives if your model is undertrained.',
        [
          ['Cross-Encoder Overview (SBERT)', 'https://www.sbert.net/examples/applications/cross-encoder/README.html'],
          ['Reciprocal Rank Fusion (RRF)', 'https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf'],
          ['Hybrid Retrieval Concepts', 'https://qdrant.tech/articles/hybrid-search/']
        ],
        [['Affects ranking', 'info']]
      ),
      AGRO_RERANKER_MAXLEN: L(
        'Reranker Max Sequence Length (Inference)',
        'Maximum token length for each (query, text) pair during live reranking. Larger values increase memory/cost and may not improve quality beyond ~256–384 tokens for code. Use higher values for long comments/docs; lower for tight compute budgets.',
        [
          ['Transformers Tokenization', 'https://huggingface.co/docs/transformers/main/en/tokenizer_summary'],
          ['Sequence Length vs Memory', 'https://huggingface.co/docs/transformers/perf_train_gpu_one']
        ],
        [['Performance sensitive', 'warn']]
      ),
      AGRO_RERANKER_BATCH: L(
        'Reranker Batch Size (Inference)',
        'Batch size used when scoring candidates during rerank. Higher values reduce latency but increase memory. If you see OOM or throttling, lower this value.',
        [
          ['Batching Techniques', 'https://huggingface.co/docs/transformers/v4.44.2/en/perf_train_gpu_one#use-mixed-precision'],
          ['Latency vs Throughput', 'https://en.wikipedia.org/wiki/Batch_processing']
        ],
        [['Tune for memory', 'info']]
      ),
      AGRO_RERANKER_TOPN: L(
        'Reranker Top-N',
        'Maximum number of candidates to pass through the cross-encoder reranker stage during retrieval. After hybrid fusion (BM25 + dense), the top-N candidates are reranked using pairwise semantic scoring before final selection. Higher values (50-100) improve recall by considering more candidates but increase reranking latency and compute cost quadratically. Lower values (20-30) are faster but may miss relevant results that scored poorly in initial retrieval but would rank highly after reranking.\n\nSweet spot: 40-60 for most use cases. Use 60-80 for complex queries where initial ranking may be noisy (e.g., ambiguous natural language queries like "where do we handle payments?"). Use 20-40 for tight latency budgets or when initial hybrid retrieval is already high-quality. Reranking cost scales with top-N × query length, so monitor inference time when tuning this parameter.\n\nSymptom of too low: Relevant results appear when you increase top-K but not with default settings. Symptom of too high: Reranking takes >500ms and retrieval latency dominates response time. Most production systems use 40-50 as a balanced default.\n\n• Typical range: 20-80 candidates\n• Balanced default: 40-50 for most workloads\n• High recall: 60-80 for exploratory queries\n• Low latency: 20-30 for speed-critical apps\n• Reranking cost: O(top-N × tokens) per query',
        [
          ['Cross-Encoder Reranking', 'https://www.sbert.net/examples/applications/cross-encoder/README.html'],
          ['Reranking in RAG', 'https://arxiv.org/abs/2407.21059'],
          ['SBERT Reranking Docs', 'https://www.sbert.net/docs/cross_encoder/pretrained_models.html'],
          ['Hybrid Search + Rerank', 'https://qdrant.tech/articles/hybrid-search/']
        ],
        [['Advanced RAG tuning', 'info'], ['Affects latency', 'warn']]
      ),

      // Learning Reranker — Training controls (GUI-only; not env vars)
      RERANKER_TRAIN_EPOCHS: L(
        'Training Epochs',
        'Number of full passes over the training triplets for the learning reranker. More epochs can improve quality but risk overfitting when data is small. Start with 1–2 and increase as your mined dataset grows.',
        [
          ['Fine-tuning Cross-Encoders', 'https://www.sbert.net/examples/training/cross-encoder/README.html'],
          ['InputExample format', 'https://www.sbert.net/docs/package_reference/cross_encoder.html#inputexample']
        ],
        [['Quality vs overfit', 'warn']]
      ),
      RERANKER_TRAIN_BATCH: L(
        'Training Batch Size',
        'Batches per gradient step during training. Larger batch sizes stabilize training but require more memory. For Colima or small GPUs/CPUs, use 1–4. If you see the container exit with code -9 (OOM), reduce this value.',
        [
          ['Memory Tips (HF)', 'https://huggingface.co/docs/transformers/perf_train_gpu_one'],
          ['Colima Resources', 'https://github.com/abiosoft/colima']
        ],
        [['Lower = safer on Colima', 'info']]
      ),
      RERANKER_TRAIN_MAXLEN: L(
        'Training Max Sequence Length',
        'Token limit for the cross-encoder during training. Longer sequences increase memory quadratically. If training fails with OOM (-9) under Docker/Colima, set 128–256. Sequences longer than the limit are truncated by the tokenizer and may emit warnings.',
        [
          ['Tokenization & Truncation', 'https://huggingface.co/docs/tokenizers/index'],
          ['Cross-Encoder Training', 'https://www.sbert.net/examples/training/cross-encoder/README.html']
        ],
        [['Memory sensitive', 'warn']]
      ),
      RERANKER_TRAIN_MAX_LENGTH: L(
        'Training Max Sequence Length (Alias)',
        'Alias for RERANKER_TRAIN_MAXLEN. Caps tokens per (query, document) pair during training to control VRAM/CPU use. Increase (384-512) when you need longer context; decrease (128-256) when hitting OOM or Colima container exits. Inputs above this value are truncated by the tokenizer.',
        [
          ['Transformers tokenizer model_max_length', 'https://huggingface.co/docs/transformers/main_classes/tokenizer#transformers.PreTrainedTokenizerBase.model_max_length']
        ],
        [['Memory sensitive', 'warn']]
      ),
      RERANKER_TRAIN_LR: L(
        'Training Learning Rate',
        'Learning rate for the cross-encoder optimizer during fine-tuning. This controls the size of weight updates during gradient descent. Standard range for cross-encoder fine-tuning is 1e-6 to 5e-5. Higher learning rates (3e-5, 5e-5) converge faster but risk overshooting optimal weights and causing training instability or divergence. Lower learning rates (1e-6, 5e-6) are safer and more stable but require more epochs to converge.\n\nSweet spot: 2e-5 for most cross-encoder fine-tuning tasks. This is the default used in many SBERT examples and works well for code reranking. Use 1e-5 for conservative training when you have limited data (<500 triplets) or notice training loss oscillating. Use 3e-5 for faster convergence when you have abundant data (>2000 triplets) and stable validation metrics. Always monitor training loss - if it spikes or increases, your learning rate is too high.\n\nCombine with RERANKER_WARMUP_RATIO for optimal results. Warmup gradually increases the learning rate from 0 to your target LR over the first N% of training, preventing early instability. Most practitioners use 2e-5 with 0.1 warmup as a reliable baseline.\n\n• Standard range: 1e-6 to 5e-5\n• Conservative (small data): 1e-5\n• Balanced default: 2e-5 (recommended)\n• Aggressive (large data): 3e-5 to 5e-5\n• Symptom too high: Loss spikes, NaN values, divergence\n• Symptom too low: Slow convergence, minimal improvement',
        [
          ['Learning Rate Explained', 'https://machinelearningmastery.com/understand-the-dynamics-of-learning-rate-on-deep-learning-neural-networks/'],
          ['Fine-tuning Cross-Encoders', 'https://www.sbert.net/examples/training/cross-encoder/README.html'],
          ['Learning Rate Schedules', 'https://huggingface.co/docs/transformers/main_classes/optimizer_schedules'],
          ['Cross-Encoder Training Guide', 'https://arxiv.org/abs/1908.10084']
        ],
        [['Advanced ML training', 'warn'], ['Requires tuning', 'info']]
      ),
      RERANKER_WARMUP_RATIO: L(
        'Warmup Ratio',
        'Fraction of total training steps to use for linear learning rate warmup. During warmup, the learning rate gradually increases from 0 to your target RERANKER_TRAIN_LR, preventing early training instability from large gradient updates. After warmup completes, the learning rate follows its normal schedule (typically constant or linear decay). Standard range: 0.0 (no warmup) to 0.2 (20% of training).\n\nSweet spot: 0.1 (10% warmup) for most cross-encoder training. This means if you train for 100 steps, the first 10 steps will gradually increase LR from 0 to your target. Warmup is especially important when fine-tuning from pretrained models, as it prevents catastrophic forgetting early in training. Use 0.05-0.08 for short training runs (<500 steps) and 0.1-0.15 for longer runs (>1000 steps).\n\nWarmup is critical when training with high learning rates (3e-5+) or limited data. Without warmup, the first few batches can cause large weight updates that destabilize the pretrained model. With warmup, training starts gentle and accelerates gradually. Most SBERT training recipes default to 0.1, which works well across domains.\n\n• No warmup: 0.0 (not recommended for fine-tuning)\n• Short training: 0.05-0.08 (e.g., 1-2 epochs, <500 steps)\n• Balanced default: 0.1 (recommended for most cases)\n• Long training: 0.15-0.2 (e.g., 5+ epochs, >2000 steps)\n• Effect: Stabilizes early training, prevents catastrophic forgetting\n• Combines with: RERANKER_TRAIN_LR for optimal convergence',
        [
          ['Warmup Schedules', 'https://huggingface.co/docs/transformers/main_classes/optimizer_schedules#transformers.get_linear_schedule_with_warmup'],
          ['Learning Rate Warmup Paper', 'https://arxiv.org/abs/1706.02677'],
          ['Fine-tuning Best Practices', 'https://www.sbert.net/examples/training/cross-encoder/README.html'],
          ['Scheduler Visualization', 'https://huggingface.co/docs/transformers/main_classes/optimizer_schedules']
        ],
        [['Advanced ML training', 'warn'], ['Stabilizes training', 'info']]
      ),
      TRIPLETS_MIN_COUNT: L(
        'Triplets Min Count',
        'Minimum number of training triplets (query, positive_doc, negative_doc) required to proceed with reranker training. Acts as a data quality gate - training with too few examples leads to severe overfitting and poor generalization. The reranker learns to distinguish relevant from irrelevant results, so it needs diverse examples to learn robust patterns. Standard minimum: 50-100 triplets for proof-of-concept, 500+ for production use.\n\nSweet spot: 200-500 triplets as a training threshold. With 200 triplets, you can run 2-3 epochs without severe overfitting. With 500+, you have enough diversity to learn generalizable patterns. Production systems should target 1000+ triplets from real user queries and feedback for best results. The quality of triplets matters more than quantity - 100 high-quality triplets from actual user interactions beat 500 synthetic triplets.\n\nTriplets are mined from your query logs, feedback data, or golden question sets using the triplet mining tools. Each triplet represents a learning signal: "query A is more relevant to document B than document C." The reranker learns these preferences and generalizes to new queries. If training fails with "insufficient data," increase your mining scope or lower this threshold temporarily for experimentation.\n\n• Absolute minimum: 50 triplets (proof-of-concept only)\n• Development minimum: 100-200 triplets\n• Production minimum: 500+ triplets (recommended)\n• Ideal: 1000-2000+ triplets for robust training\n• Quality over quantity: Real user data > synthetic examples\n• Symptom too low: Overfitting, poor generalization, reranker only works on training queries',
        [
          ['Triplet Loss for Ranking', 'https://arxiv.org/abs/1503.03832'],
          ['Hard Negative Mining', 'https://arxiv.org/abs/2104.08663'],
          ['Triplet Mining in RAG (ACL 2025)', 'https://aclanthology.org/2025.acl-industry.72.pdf'],
          ['Learning to Rank', 'https://en.wikipedia.org/wiki/Learning_to_rank']
        ],
        [['Data quality gate', 'warn'], ['Production needs 500+', 'info']]
      ),
      TRIPLETS_MINE_MODE: L(
        'Triplets Mine Mode',
        'Strategy for mining negative examples when constructing training triplets from query logs and feedback. Negative examples are crucial for learning to rank - they teach the model what NOT to retrieve. Three strategies: "random" (random negatives from corpus), "semi-hard" (negatives that scored moderately but below positives), and "hard" (negatives that scored high but are actually irrelevant). Hard negatives are most effective but require careful mining to avoid false negatives.\n\n"random": Randomly sample documents from the corpus that aren\'t in the positive set. Fast and safe but produces easy negatives that don\'t challenge the model. Use for initial training or small datasets (<200 triplets). Converges quickly but may not improve ranking quality much beyond baseline.\n\n"semi-hard" (recommended): Mine negatives that scored in the 40th-70th percentile of retrieval results but weren\'t marked as relevant. These are plausible but wrong answers. Teaches the model nuanced distinctions. Balances training difficulty and false negative risk. Best for production systems with 500+ triplets.\n\n"hard": Use top-ranked results that are actually irrelevant as negatives. Most effective for learning but risky - if your relevance labels are noisy, you may train on false negatives (actually relevant docs mislabeled as negative). Use only with high-confidence human feedback or click data. Produces strongest rerankers when data quality is high.\n\n• random: Safe baseline, fast, easy negatives, less effective\n• semi-hard: Balanced default, good difficulty, low false negative risk (recommended)\n• hard: Maximum difficulty, best results, requires clean labels, high false negative risk\n• Effect on training: Harder negatives = slower convergence but better final quality\n• Combine with: TRIPLETS_MIN_COUNT (need more data for hard negatives)',
        [
          ['Hard Negative Mining', 'https://arxiv.org/abs/2104.08663'],
          ['Negative Sampling Strategies', 'https://arxiv.org/abs/2007.00808'],
          ['Triplet Mining (ACL 2025)', 'https://aclanthology.org/2025.acl-industry.72.pdf'],
          ['Learning to Rank with Negatives', 'https://www.sbert.net/examples/training/cross-encoder/README.html']
        ],
        [['Advanced training control', 'warn'], ['Use semi-hard for production', 'info']]
      ),

      // Retrieval tuning
      BM25_WEIGHT: L(
        'BM25 Weight (Hybrid Fusion)',
        'Weight assigned to BM25 (sparse lexical) scores during hybrid search fusion. BM25 excels at exact keyword matches - variable names, function names, error codes, technical terms. Higher weights (0.5-0.7) prioritize keyword precision, favoring exact matches over semantic similarity. Lower weights (0.2-0.4) defer to dense embeddings, better for conceptual queries. The fusion formula is: final_score = (BM25_WEIGHT × bm25_score) + (VECTOR_WEIGHT × dense_score).\n\nSweet spot: 0.4-0.5 for balanced hybrid retrieval. Use 0.5-0.6 when users search with specific identifiers (e.g., "getUserById function" or "AuthenticationError exception"). Use 0.3-0.4 for natural language queries (e.g., "how does authentication work?"). The two weights should sum to approximately 1.0 for normalized scoring, though this isn\'t strictly enforced.\n\nSymptom of too high: Semantic matches are buried under keyword matches. Symptom of too low: Exact identifier matches rank poorly despite containing query terms. Production systems often A/B test 0.4 vs 0.5 to optimize for their user query patterns. Code search typically needs higher BM25 weight than document search.\n\n• Range: 0.2-0.7 (typical)\n• Keyword-heavy: 0.5-0.6 (function names, error codes)\n• Balanced: 0.4-0.5 (recommended for mixed queries)\n• Semantic-heavy: 0.3-0.4 (conceptual questions)\n• Should sum with VECTOR_WEIGHT to ~1.0\n• Affects: Hybrid fusion ranking, keyword vs semantic balance',
        [
          ['BM25 Algorithm', 'https://en.wikipedia.org/wiki/Okapi_BM25'],
          ['Hybrid Search Overview', 'https://qdrant.tech/articles/hybrid-search/'],
          ['Fusion Strategies in RAG', 'https://arxiv.org/abs/2402.14734'],
          ['Sparse vs Dense Retrieval', 'https://www.pinecone.io/learn/hybrid-search-intro/']
        ],
        [['Advanced RAG tuning', 'info'], ['Pairs with VECTOR_WEIGHT', 'info']]
      ),
      VECTOR_WEIGHT: L(
        'Vector Weight (Hybrid Fusion)',
        'Weight assigned to dense vector (semantic embedding) scores during hybrid search fusion. Dense embeddings capture semantic meaning and conceptual similarity, excelling at natural language queries and synonym matching. Higher weights (0.5-0.7) prioritize semantic relevance over exact keywords. Lower weights (0.2-0.4) defer to BM25 lexical matching. The fusion formula: final_score = (BM25_WEIGHT × bm25_score) + (VECTOR_WEIGHT × dense_score).\n\nSweet spot: 0.5-0.6 for balanced hybrid retrieval. Use 0.6-0.7 when users ask conceptual questions ("how does X work?", "what handles Y?") where synonyms and paraphrasing matter. Use 0.4-0.5 when exact term matching is important alongside semantics. The two weights should sum to approximately 1.0 for normalized scoring.\n\nSymptom of too high: Exact keyword matches (function names, specific terms) rank below semantic near-matches. Symptom of too low: Conceptually relevant results are buried despite being semantically similar. Most production RAG systems balance 0.5 BM25 with 0.5 vector, then fine-tune based on user feedback and eval metrics.\n\n• Range: 0.3-0.7 (typical)\n• Semantic-heavy: 0.6-0.7 (conceptual queries, natural language)\n• Balanced: 0.5-0.6 (recommended for mixed queries)\n• Keyword-heavy: 0.3-0.4 (when precision matters)\n• Should sum with BM25_WEIGHT to ~1.0\n• Affects: Hybrid fusion ranking, semantic vs keyword balance',
        [
          ['Dense Embeddings', 'https://www.sbert.net/docs/pretrained_models.html'],
          ['Hybrid Search Explained', 'https://qdrant.tech/articles/hybrid-search/'],
          ['Semantic Search', 'https://en.wikipedia.org/wiki/Semantic_search'],
          ['Embedding Models', 'https://weaviate.io/blog/how-to-choose-an-embedding-model']
        ],
        [['Advanced RAG tuning', 'info'], ['Pairs with BM25_WEIGHT', 'info']]
      ),
      LAYER_BONUS_GUI: L(
        'Layer Bonus (GUI)',
        'Score boost applied to chunks from GUI/frontend layers when query intent is classified as UI-related. Part of the multi-layer architecture routing system. When users ask "how does the settings page work?" or "where is the login button?", chunks from directories like frontend/, components/, views/ receive this additive bonus during reranking. Higher values (0.08-0.15) strongly bias toward frontend code. Lower values (0.03-0.06) provide subtle guidance.\n\nSweet spot: 0.06-0.10 for production systems with clear frontend/backend separation. Use 0.10-0.15 for strict layer routing when your architecture is well-organized and layer detection is accurate. Use 0.03-0.06 for loose guidance when layer boundaries are fuzzy. This bonus is only applied when intent classification detects UI/frontend intent from the query.\n\nWorks with repos.json layer_bonuses configuration, which maps intent types to directory patterns. Example: "ui" intent boosts frontend/, components/, views/. Combine with LAYER_BONUS_RETRIEVAL for multi-tier architectures (API, service, data layers). Intent detection uses keyword matching and optional LLM classification.\n\n• Range: 0.03-0.15 (typical)\n• Subtle guidance: 0.03-0.06\n• Balanced: 0.06-0.10 (recommended)\n• Strong routing: 0.10-0.15\n• Applied: Only when query intent = UI/frontend\n• Requires: repos.json layer_bonuses configuration',
        [
          ['Layer Routing in RAG', '/docs/MULTI_REPO.md#layer-bonuses'],
          ['Intent Classification', '/docs/RETRIEVAL.md#intent-classification'],
          ['repos.json Config', '/repos.json'],
          ['Architecture-Aware Retrieval', 'https://arxiv.org/abs/2312.10997']
        ],
        [['Advanced RAG tuning', 'info'], ['Multi-layer architectures', 'info']]
      ),
      LAYER_BONUS_RETRIEVAL: L(
        'Layer Bonus (Retrieval)',
        'Score boost applied to chunks from backend/API/service layers when query intent is classified as retrieval or data-related. Complements LAYER_BONUS_GUI for multi-tier architecture routing. When users ask "how do we fetch user data?" or "where is the search API?", chunks from api/, services/, models/, controllers/ receive this bonus during reranking. Helps route queries to the right architectural layer.\n\nSweet spot: 0.06-0.10 for production systems. Use 0.10-0.15 for strong backend routing when API layer is clearly separated. Use 0.03-0.06 for subtle hints when boundaries are less clear. This bonus applies when intent detection identifies backend/API/data queries via keywords like "fetch", "query", "API", "endpoint", "database".\n\nConfigure layer patterns in repos.json layer_bonuses: map "retrieval" intent to api/, routes/, controllers/, services/, etc. The intent classifier examines query terms and (optionally) uses an LLM to categorize intent. Multiple bonuses can apply simultaneously - a query about "user profile API" might trigger both LAYER_BONUS_GUI and LAYER_BONUS_RETRIEVAL.\n\n• Range: 0.03-0.15 (typical)\n• Subtle guidance: 0.03-0.06\n• Balanced: 0.06-0.10 (recommended)\n• Strong routing: 0.10-0.15\n• Applied: When query intent = API/backend/retrieval/data\n• Requires: repos.json layer_bonuses with retrieval intent mapping',
        [
          ['Layer Routing', '/docs/MULTI_REPO.md#layer-bonuses'],
          ['Intent Detection', '/docs/RETRIEVAL.md#intent-classification'],
          ['Multi-Tier Architectures', 'https://en.wikipedia.org/wiki/Multitier_architecture'],
          ['Backend Routing', '/docs/RETRIEVAL.md#layer-routing']
        ],
        [['Advanced RAG tuning', 'info'], ['Multi-layer architectures', 'info']]
      ),
      VENDOR_PENALTY: L(
        'Vendor Penalty',
        'Score penalty (negative bonus) applied to third-party library code (node_modules, vendor/, site-packages/, etc.) during reranking when VENDOR_MODE is set to prefer_first_party. Helps prioritize your application code over external dependencies. Typical range: -0.05 to -0.12. Higher penalties (more negative) push library code down the rankings more aggressively.\n\nSweet spot: -0.08 to -0.10 for production systems. Use -0.10 to -0.12 for strong first-party preference when you want library code only as fallback. Use -0.05 to -0.08 for moderate preference when library examples are sometimes helpful. Set to 0.0 to disable vendor detection entirely (all code ranked equally).\n\nVendor detection matches common patterns: node_modules/, vendor/, .venv/, site-packages/, bower_components/, Pods/, third_party/. The penalty is applied during final reranking after hybrid fusion. Pair with path boosts in repos.json to further prioritize your core application directories. Most users want to understand THEIR code first, then library internals.\n\n• Range: -0.12 to 0.0 (negative = penalty)\n• No penalty: 0.0 (rank libraries equally)\n• Moderate preference: -0.05 to -0.08\n• Balanced: -0.08 to -0.10 (recommended)\n• Strong first-party: -0.10 to -0.12\n• Opposite mode: Set VENDOR_MODE=prefer_vendor to boost libraries instead',
        [
          ['Vendor Detection Logic', '/docs/RETRIEVAL.md#vendor-detection'],
          ['VENDOR_MODE Setting', '/docs/RETRIEVAL.md#vendor-mode'],
          ['Path Patterns', 'https://github.com/github/gitignore'],
          ['First-Party vs Third-Party', 'https://en.wikipedia.org/wiki/First-party_and_third-party_sources']
        ],
        [['Advanced RAG tuning', 'info'], ['Code priority control', 'info']]
      ),
      FRESHNESS_BONUS: L(
        'Freshness Bonus',
        'Score boost applied to recently modified files during reranking, prioritizing newer code over stale code. Based on file modification time (mtime). Files modified in the last N days receive the full bonus, with linear decay over time. Useful for prioritizing recent work, active features, and current implementation patterns. Typical range: 0.0 (disabled) to 0.10 (strong recency bias).\n\nSweet spot: 0.03-0.06 for subtle freshness preference. Use 0.06-0.10 for strong recency bias when your codebase changes rapidly and recent code is more likely relevant. Use 0.0 to disable entirely for stable codebases where age doesn\'t correlate with relevance. The bonus decays linearly from full value (files modified <7 days ago) to zero (files modified >90 days ago).\n\nExample: With 0.05 bonus, a file modified yesterday gets +0.05, a file modified 30 days ago gets +0.025, a file modified 90+ days ago gets 0. Freshness helps when users ask "how do we currently handle X?" - emphasizes recent implementations over legacy code. Trade-off: May deprioritize well-tested stable code in favor of recent changes.\n\n• Range: 0.0-0.10 (typical)\n• Disabled: 0.0 (age-agnostic ranking)\n• Subtle: 0.03-0.05\n• Balanced: 0.05-0.06 (recommended for active repos)\n• Strong recency: 0.08-0.10\n• Decay window: Full bonus at 0-7 days, linear decay to 90 days\n• Trade-off: Recent code vs battle-tested stable code',
        [
          ['Freshness in Ranking', 'https://en.wikipedia.org/wiki/Freshness_(search_engine)'],
          ['Temporal Relevance', 'https://en.wikipedia.org/wiki/Temporal_information_retrieval'],
          ['Score Boosting', '/docs/RETRIEVAL.md#freshness-scoring'],
          ['Recency Bias', 'https://en.wikipedia.org/wiki/Recency_bias']
        ],
        [['Advanced RAG tuning', 'info'], ['Time-based ranking', 'info']]
      ),
      KEYWORDS_BOOST: L(
        'Keywords Boost',
        'Score boost applied to chunks containing high-frequency repository-specific keywords. Keywords are mined during indexing from your codebase - class names, function names, domain terms that appear frequently in your project but rarely in general code. When a query contains these keywords, matching chunks receive this bonus. Helps surface domain-specific code and project-specific patterns.\n\nSweet spot: 0.08-0.12 for balanced keyword boosting. Use 0.12-0.15 for strong domain term preference when your project has unique terminology (e.g., "Agro", "AgroRAG", "hybrid_search"). Use 0.05-0.08 for subtle boosting when overlap with common terms is high. Keywords must appear >= KEYWORDS_MIN_FREQ times in the codebase to be considered domain-specific.\n\nKeywords are stored during indexing in keywords.json (per-repo). Query terms are matched against this keyword set, and chunks containing these terms get the bonus during reranking. This is separate from BM25 (which scores all terms) - keyword boost targets YOUR project\'s vocabulary. Example: "AuthService" is a keyword in your codebase but not in general code, so queries about "AuthService" get extra boost.\n\n• Range: 0.05-0.15 (typical)\n• Subtle: 0.05-0.08\n• Balanced: 0.08-0.12 (recommended)\n• Strong domain preference: 0.12-0.15\n• Requires: keywords.json generated during indexing\n• Controlled by: KEYWORDS_MIN_FREQ (frequency threshold)',
        [
          ['Keyword Extraction', 'https://en.wikipedia.org/wiki/Keyword_extraction'],
          ['Domain-Specific Terms', 'https://en.wikipedia.org/wiki/Terminology'],
          ['TF-IDF for Keywords', 'https://en.wikipedia.org/wiki/Tf%E2%80%93idf'],
          ['Keywords Mining', '/docs/INDEXING.md#keywords-extraction']
        ],
        [['Advanced RAG tuning', 'info'], ['Domain-specific boosting', 'info']]
      ),
      KEYWORDS_MIN_FREQ: L(
        'Keywords Min Frequency',
        'Minimum frequency threshold for a term to be considered a repository-specific keyword during indexing. Terms appearing fewer than this many times are ignored. Higher thresholds (10-20) focus on common project terms; lower thresholds (3-5) include more specialized terms. Keywords are used by KEYWORDS_BOOST for query-time score boosting.\n\nSweet spot: 5-8 for balanced keyword extraction. Use 8-12 for large codebases (>100k LOC) to focus on truly common terms and avoid noise. Use 3-5 for small codebases (<20k LOC) to capture enough domain vocabulary. Terms must appear at least this many times AND be relatively rare in general code to qualify as keywords.\n\nKeyword mining runs during indexing: terms are counted, filtered by frequency, and compared against a general code corpus to compute TF-IDF-like scores. High-scoring terms (frequent in YOUR repo, rare in general code) become keywords. These are stored in keywords.json and used at query time for KEYWORDS_BOOST scoring. Re-index after changing this setting.\n\n• Range: 3-20 (typical)\n• Small codebases: 3-5 (capture domain terms)\n• Balanced: 5-8 (recommended for most projects)\n• Large codebases: 8-12 (focus on common terms)\n• Very large: 15-20 (only highly frequent terms)\n• Effect: Higher = fewer, more common keywords; Lower = more, rarer keywords\n• Requires reindex: Changes take effect after rebuilding index',
        [
          ['TF-IDF Scoring', 'https://en.wikipedia.org/wiki/Tf%E2%80%93idf'],
          ['Keyword Extraction', 'https://en.wikipedia.org/wiki/Keyword_extraction'],
          ['Document Frequency', 'https://en.wikipedia.org/wiki/Document_frequency'],
          ['Keyword Mining', '/docs/INDEXING.md#keywords-extraction']
        ],
        [['Advanced indexing', 'info'], ['Requires reindex', 'reindex']]
      ),
      MULTI_QUERY_M: L(
        'Multi-Query M (RRF Constant)',
        'Constant "k" parameter in Reciprocal Rank Fusion (RRF) formula used to merge results from multiple query rewrites. RRF formula: score = sum(1 / (k + rank_i)) across all query variants. Higher M values (60-100) compress rank differences, treating top-10 and top-20 results more equally. Lower M values (20-40) emphasize top-ranked results, creating steeper rank penalties.\n\nSweet spot: 50-60 for balanced fusion. This is the standard RRF constant used in most production systems. Use 40-50 for more emphasis on top results (good when rewrites are high quality). Use 60-80 for smoother fusion (good when rewrites produce diverse rankings). The parameter is called "M" in code but represents the "k" constant in academic RRF papers.\n\nRRF fusion happens when MQ_REWRITES > 1: each query variant retrieves results, then RRF merges them by summing reciprocal ranks. Example with M=60: rank-1 result scores 1/61=0.016, rank-10 scores 1/70=0.014. Higher M reduces the gap. This parameter rarely needs tuning - default of 60 works well for most use cases.\n\n• Standard range: 40-80\n• Emphasize top results: 40-50\n• Balanced: 50-60 (recommended, RRF default)\n• Smooth fusion: 60-80\n• Formula: score = sum(1 / (M + rank)) for each query variant\n• Only matters when: MQ_REWRITES > 1 (multi-query enabled)',
        [
          ['Reciprocal Rank Fusion Paper', 'https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf'],
          ['RRF in Practice', 'https://www.elastic.co/guide/en/elasticsearch/reference/current/rrf.html'],
          ['Multi-Query RAG', 'https://arxiv.org/abs/2305.14283'],
          ['Fusion Strategies', 'https://arxiv.org/abs/2402.14734']
        ],
        [['Advanced RAG tuning', 'info'], ['RRF fusion control', 'info']]
      ),
      BM25_TOKENIZER: L(
        'BM25 Tokenizer',
        'Tokenization strategy for BM25 sparse index. Controls how code text is split into searchable terms. Options: "stemmer" (Porter stemming, normalizes word forms like "running" → "run"), "whitespace" (split on spaces only, preserves exact forms), "standard" (lowercase + split on punctuation). For code search, preserving exact forms is usually better than stemming.\n\nSweet spot: "whitespace" or "standard" for code search. Stemming helps with natural language (README files, comments) but can hurt code search by conflating different identifiers. For example, stemming might merge "user" and "users" (good for prose) but also "handler" and "handle" (bad for code). Most code-focused RAG systems avoid stemming.\n\n"whitespace": Splits on whitespace only, preserves case and punctuation. Good for camelCase and snake_case. Example: "getUserData" → ["getUserData"].\n\n"standard": Lowercase + split on punctuation. Better for cross-case matching. Example: "getUserData" → ["getuserdata"] (matches "getuserdata", "getUserData", "GETUSERDATA").\n\n"stemmer": Applies Porter stemmer. Best for natural language, risky for code. Example: "getUserData" → stems individual tokens.\n\n• whitespace: Preserve exact forms, case-sensitive, best for strict code search\n• standard: Lowercase + punctuation split, case-insensitive, balanced (recommended)\n• stemmer: Normalize word forms, best for natural language, risky for code\n• Effect: Changes how BM25 matches query terms to code\n• Requires reindex: Changes take effect after rebuilding BM25 index',
        [
          ['BM25 Algorithm', 'https://en.wikipedia.org/wiki/Okapi_BM25'],
          ['Porter Stemmer', 'https://en.wikipedia.org/wiki/Stemming#Porter_stemmer'],
          ['Tokenization', 'https://en.wikipedia.org/wiki/Lexical_analysis#Tokenization'],
          ['BM25S Tokenizers', 'https://github.com/xhluca/bm25s#tokenization']
        ],
        [['Advanced indexing', 'info'], ['Requires reindex', 'reindex']]
      ),
      MQ_REWRITES: L(
        'Multi‑Query Rewrites',
        'Number of query variations to generate for improved recall. Each rewrite searches independently, then results are fused and reranked. For example, query "auth flow" might expand to "authentication flow", "login process", "user authentication". Higher values (4-6) improve recall for vague questions like "Where is X implemented?" but increase API calls and latency. Start at 2-3 for general use.',
        [
          ['Multi-Query RAG', 'https://arxiv.org/abs/2305.14283'],
          ['Query Expansion', 'https://en.wikipedia.org/wiki/Query_expansion'],
          ['RAG Techniques', 'https://python.langchain.com/docs/how_to/MultiQueryRetriever/']
        ],
        [['Affects latency','info'], ['Higher cost', 'warn']]
      ),
      USE_SEMANTIC_SYNONYMS: L(
        'Use Semantic Synonyms',
        'Expands queries with curated synonyms/aliases from semantic_synonyms.json before retrieval. Helps match acronyms and domain terms (e.g., "auth" → authentication, oauth, jwt). Keeps BM25 and vector search aligned on the expanded terms. Enable for domain-heavy repos; disable if expansions introduce false positives. No re-index required—changes apply on the next query.',
        [
          ['Hybrid Search - LangChain', 'https://python.langchain.com/docs/how_to/hybrid/'],
          ['Search - Qdrant Concepts', 'https://qdrant.tech/documentation/concepts/search/']
        ],
        [['Recall boost', 'info'], ['May add noise', 'warn']]
      ),
      TOPK_DENSE: L(
        'Top‑K Dense',
        'Number of candidate results to retrieve from Qdrant vector (semantic) search before hybrid fusion. Higher values (100-150) improve recall for semantic matches but increase query latency and memory usage. Lower values (40-60) are faster but may miss relevant results. Must be >= FINAL_K. Recommended: 75 for balanced performance, 100-120 for high recall scenarios.',
        [
          ['Vector Similarity Search', 'https://qdrant.tech/documentation/concepts/search/'],
          ['Semantic Search', 'https://en.wikipedia.org/wiki/Semantic_search'],
          ['Top-K Retrieval', 'https://en.wikipedia.org/wiki/Nearest_neighbor_search#k-nearest_neighbors']
        ],
        [['Affects latency','info'], ['Semantic matches', 'info']]
      ),
      VECTOR_BACKEND: L(
        'Vector Backend',
        'Vector database used for dense search. "qdrant" (default) provides HNSW indexing, filtering, and distributed storage—best for production. "faiss" is in-process, good for offline or air‑gapped testing but lacks server-side filtering and persistence across restarts unless you manage snapshots. Switching backends requires rebuilding indexes so embeddings and collections are compatible.',
        [
          ['Qdrant vector search overview', 'https://qdrant.tech/documentation/overview/vector-search/'],
          ['Faiss similarity search documentation', 'https://faiss.ai/']
        ],
        [['Core retrieval', 'info'], ['Requires reindex', 'reindex']]
      ),
      TOPK_SPARSE: L(
        'Top‑K Sparse',
        'Number of candidate results to retrieve from BM25 keyword (lexical) search before hybrid fusion. Higher values (100-150) improve recall for exact keyword matches (variable names, function names, error codes) but increase latency. Lower values (40-60) are faster but may miss exact matches. Must be >= FINAL_K. Recommended: 75 for balanced performance, 100-120 for keyword-heavy queries.',
        [
          ['BM25 Algorithm', 'https://en.wikipedia.org/wiki/Okapi_BM25'],
          ['BM25S Library (GitHub)', 'https://github.com/xhluca/bm25s'],
          ['Lexical vs Semantic', '/docs/RETRIEVAL.md#hybrid-search']
        ],
        [['Affects latency','info'], ['Keyword matches', 'info']]
      ),
      FINAL_K: L(
        'Final Top‑K',
        'Number of top results to return after hybrid fusion, reranking, and scoring boosts. This is what you get back from search. Higher values (15-30) provide more context but may include noise. Lower values (5-10) are faster and more precise. Default: 10. Recommended: 10 for chat, 20-30 for browsing/exploration.',
        [
          ['Precision vs Recall', 'https://en.wikipedia.org/wiki/Precision_and_recall'],
          ['Top-K Selection', 'https://en.wikipedia.org/wiki/Tf%E2%80%93idf#Top-K_retrieval'],
          ['RAG Retrieval', '/docs/RETRIEVAL.md#final-k']
        ],
        [['Core Setting', 'info']]
      ),
      HYDRATION_MODE: L(
        'Hydration Mode',
        'Controls when full code is loaded from chunks.jsonl. "Lazy" (recommended) loads code after retrieval, providing full context with minimal memory overhead. "None" returns only metadata (file path, line numbers) - fastest but no code content. Use "none" for testing retrieval quality or when you only need file locations, not actual code.',
        [
          ['Lazy Loading', 'https://en.wikipedia.org/wiki/Lazy_loading'],
          ['Performance Guide', '/docs/PERFORMANCE_AND_COST.md'],
          ['chunks.jsonl Format', '/docs/INDEXING.md#chunks-format']
        ],
        [['Lazy Recommended', 'info']]
      ),
      HYDRATION_MAX_CHARS: L(
        'Hydration Max Chars',
        'Maximum characters to load per chunk when hydrating results with code content. Prevents huge chunks from bloating responses and consuming excessive memory. 0 = no limit (may cause memory issues with large files). Recommended: 2000 for general use, 1000 for memory-constrained environments, 5000 for detailed code review. Chunks larger than this limit are truncated.',
        [
          ['Text Truncation', 'https://en.wikipedia.org/wiki/Truncation'],
          ['Performance Guide', '/docs/PERFORMANCE_AND_COST.md'],
          ['Chunk Size Tuning', '/docs/INDEXING.md#chunk-size']
        ],
        [['Performance', 'info']]
      ),

      // Confidence
      CONF_TOP1: L(
        'Confidence Top-1',
        'Minimum confidence score (0.0-1.0) required to accept the top-1 result without further processing. If the best result scores above this threshold, it\'s returned immediately. Lower values (0.55-0.60) produce more answers but risk lower quality. Higher values (0.65-0.70) ensure precision but may trigger unnecessary query rewrites. Recommended: 0.60-0.65 for balanced precision/recall.\n\nSweet spot: 0.60-0.65 for production systems. Use 0.65-0.70 when precision is critical and false positives are costly (e.g., production debugging, compliance queries). Use 0.55-0.60 for exploratory search where recall matters more. This threshold gates whether the system accepts the top result or attempts query rewriting for better candidates.\n\nConfidence is computed from hybrid fusion scores, reranking scores, and score boosting. A score of 0.65 means high confidence that the result is relevant. Below the threshold, the system may rewrite the query (if MQ_REWRITES > 1) and try again. Tune this alongside CONF_AVG5 and CONF_ANY for optimal answer rate vs quality.\n\n• Range: 0.55-0.75 (typical)\n• Exploratory: 0.55-0.60 (favor recall)\n• Balanced: 0.60-0.65 (recommended)\n• Precision-critical: 0.65-0.70 (favor precision)\n• Effect: Lower = more answers, higher risk; Higher = fewer answers, higher quality\n• Triggers: Query rewriting when below threshold',
        [
          ['Confidence Thresholds', 'https://en.wikipedia.org/wiki/Confidence_interval'],
          ['Precision-Recall Tradeoff', 'https://developers.google.com/machine-learning/crash-course/classification/precision-and-recall'],
          ['Score Calibration', '/docs/RETRIEVAL.md#confidence-scoring'],
          ['Decision Boundaries', 'https://en.wikipedia.org/wiki/Decision_boundary']
        ],
        [['Advanced RAG tuning', 'info'], ['Affects answer rate', 'warn']]
      ),
      CONF_AVG5: L(
        'Confidence Avg-5',
        'Average confidence score of the top-5 results, used as a gate for query rewriting iterations. If avg(top-5) is below this threshold, the system may rewrite the query and try again. Lower values (0.50-0.53) reduce retries, accepting more borderline results. Higher values (0.56-0.60) force more rewrites for higher quality. Recommended: 0.52-0.58 for balanced behavior.\n\nSweet spot: 0.52-0.55 for production systems. Use 0.55-0.58 when quality is paramount and you have budget for extra LLM calls (query rewriting). Use 0.50-0.52 for cost-sensitive scenarios or when initial retrieval is already high-quality. This threshold examines the top-5 results as a group - even if top-1 is strong, weak supporting results might trigger a rewrite.\n\nAVG5 complements TOP1: TOP1 checks the best result, AVG5 checks overall result quality. A query might pass TOP1 (strong top result) but fail AVG5 (weak supporting results), triggering refinement. Conversely, borderline TOP1 with strong AVG5 might proceed. Tune both thresholds together for optimal precision/recall trade-offs.\n\n• Range: 0.48-0.60 (typical)\n• Cost-sensitive: 0.50-0.52 (fewer retries)\n• Balanced: 0.52-0.55 (recommended)\n• Quality-focused: 0.55-0.58 (more retries)\n• Effect: Higher = more query rewrites, better quality, higher cost\n• Interacts with: CONF_TOP1 (top result threshold), MQ_REWRITES (rewrite budget)',
        [
          ['Iterative Refinement', 'https://en.wikipedia.org/wiki/Iterative_refinement'],
          ['Query Reformulation', 'https://en.wikipedia.org/wiki/Query_reformulation'],
          ['Confidence Scoring', '/docs/RETRIEVAL.md#confidence-thresholds'],
          ['Multi-Query RAG', 'https://arxiv.org/abs/2305.14283']
        ],
        [['Advanced RAG tuning', 'info'], ['Controls retries', 'warn']]
      ),
      CONF_ANY: L(
        'Confidence Any',
        'Fallback threshold - proceed with retrieval if ANY single result exceeds this score, even if top-1 or avg-5 thresholds aren\'t met. This prevents the system from giving up when there\'s at least one decent match. Lower values (0.30-0.40) are more permissive, returning results even with weak confidence. Higher values (0.45-0.50) maintain quality standards. Recommended: 0.35-0.45 as a safety net.',
        [
          ['Fallback Strategies', 'https://en.wikipedia.org/wiki/Fault_tolerance'],
          ['Confidence Bounds', '/docs/RETRIEVAL.md#confidence-fallback'],
          ['Decision Boundaries', 'https://en.wikipedia.org/wiki/Decision_boundary']
        ],
        [['Safety net', 'info']]
      ),

      // Netlify
      NETLIFY_API_KEY: L('Netlify API Key', 'API key for the netlify_deploy MCP tool to trigger automated site deployments and builds. Get your personal access token from Netlify dashboard under User Settings > Applications > Personal Access Tokens. Used to programmatically deploy site updates from your workflow.', [
        ['Netlify: Access Tokens', 'https://docs.netlify.com/api/get-started/#access-tokens'],
        ['MCP README', '/docs/MCP_README.md']
      ]),
      NETLIFY_DOMAINS: L(
        'Netlify Domains',
        'Comma-separated list of Netlify site domains for the netlify_deploy MCP tool (e.g., "mysite.netlify.app,docs.mysite.com"). When deploying, the tool targets these specific sites. Find your site domains in Netlify dashboard under Site Settings > Domain Management. Multiple domains allow you to deploy to staging and production from the same config.',
        [
          ['Netlify Sites', 'https://docs.netlify.com/domains-https/custom-domains/'],
          ['MCP Tools Guide', '/docs/MCP_README.md'],
          ['Netlify Dashboard', 'https://app.netlify.com/']
        ]
      ),

      // Misc
      THREAD_ID: L(
        'Thread ID',
        'Unique identifier for conversation session state in LangGraph checkpoints or CLI chat. Use a stable value (e.g., "session-123", user email, UUID) to preserve chat history and context across runs. Different thread IDs create separate conversation contexts. Useful for multi-user systems or A/B testing different conversation flows. Stored in Redis when available.',
        [
          ['LangGraph Checkpoints', 'https://langchain-ai.github.io/langgraph/concepts/persistence/'],
          ['Thread Management', 'https://langchain-ai.github.io/langgraph/how-tos/persistence/#threads'],
          ['CLI Chat Guide', '/docs/CLI_CHAT.md#sessions']
        ]
      ),
      TRANSFORMERS_TRUST_REMOTE_CODE: L(
        'Transformers: trust_remote_code',
        'SECURITY WARNING: Set to "true" only if you completely trust the model source. Allows HuggingFace Transformers to execute arbitrary Python code from model repositories for custom architectures. Malicious models could run harmful code on your system. Only enable for models from verified sources (official HuggingFace, your organization). Required for some specialized models with custom model classes.',
        [
          ['Security Notes', 'https://huggingface.co/docs/transformers/installation#security-notes'],
          ['Custom Code in Models', 'https://huggingface.co/docs/transformers/custom_models'],
          ['Model Security', 'https://huggingface.co/docs/hub/security']
        ],
        [['Security risk', 'warn'], ['Only for trusted models', 'warn']]
      ),
      LANGCHAIN_TRACING_V2: L(
        'LangChain Tracing',
        'Enable comprehensive tracing with LangSmith (v2 tracing protocol). When true, all LangChain operations (LLM calls, retrieval, agent actions) are logged to LangSmith for debugging, monitoring, and optimization. Set LANGCHAIN_API_KEY and LANGCHAIN_PROJECT in your environment. Traces include inputs, outputs, latency, and token usage. Essential for production debugging and cost tracking.',
        [
          ['LangSmith Setup', 'https://docs.smith.langchain.com/'],
          ['Tracing Guide', 'https://docs.smith.langchain.com/tracing'],
          ['How to Enable', 'https://docs.smith.langchain.com/tracing/faq#how-do-i-turn-on-tracing']
        ],
        [['Requires API key', 'info']]
      ),

      GEN_MODEL_HTTP: L(
        'HTTP Channel Model',
        'Override GEN_MODEL specifically for HTTP API requests (GUI, external API calls). Useful for serving different models to different channels - e.g., use gpt-4o for production HTTP but qwen-coder locally. If not set, falls back to GEN_MODEL. Example use case: cheaper models for public API, expensive models for internal tools.',
        [
          ['Model Recommendations', '/docs/MODEL_RECOMMENDATIONS.md'],
          ['Model Selection', 'https://platform.openai.com/docs/models'],
          ['Cost & Performance', '/docs/PERFORMANCE_AND_COST.md']
        ],
        [['Channel-specific', 'info']]
      ),
      GEN_MODEL_MCP: L(
        'MCP Channel Model',
        'Override GEN_MODEL for MCP tool invocations only. Use a lighter/cheaper model for MCP tools since tool calls are typically simpler than complex reasoning. Example: gpt-4o-mini for MCP, gpt-4o for main chat. Reduces costs when tools are called frequently (search, file operations, etc.). If not set, uses GEN_MODEL.',
        [
          ['MCP Tools Guide', '/docs/MCP_README.md'],
          ['Model Recommendations', '/docs/MODEL_RECOMMENDATIONS.md'],
          ['Model Pricing', 'https://openai.com/api/pricing/']
        ],
        [['Cost savings', 'info'], ['Channel-specific', 'info']]
      ),
      GEN_MODEL_CLI: L(
        'CLI Channel Model',
        'Override GEN_MODEL for CLI chat sessions only. Allows using different models for terminal vs web interface - e.g., faster models for CLI iteration, higher quality for production GUI. Useful for developer workflows where CLI is for quick testing and HTTP is for end users. If not set, uses GEN_MODEL.',
        [
          ['CLI Chat', '/docs/CLI_CHAT.md'],
          ['Model Recommendations', '/docs/MODEL_RECOMMENDATIONS.md'],
          ['Model Selection Guide', '/docs/MODELS.md']
        ],
        [['Channel-specific', 'info']]
      ),

      // Additional providers
      ANTHROPIC_API_KEY: L(
        'Anthropic API Key',
        'API key for Anthropic models (Claude family: claude-3-5-sonnet, claude-3-opus, claude-instant). Required when using Claude models for generation. Get your key from Anthropic Console under Account Settings > API Keys. Claude models excel at code understanding, long context (200K tokens), and following complex instructions. Costs vary by model tier.',
        [
          ['Get API Key', 'https://console.anthropic.com/settings/keys'],
          ['Claude Models', 'https://docs.anthropic.com/en/docs/about-claude/models'],
          ['API Quickstart', 'https://docs.anthropic.com/en/api/getting-started'],
          ['Pricing', 'https://www.anthropic.com/pricing']
        ]
      ),
      GOOGLE_API_KEY: L(
        'Google API Key',
        'API key for Google Gemini models and embedding endpoints (gemini-1.5-pro, gemini-1.5-flash, text-embedding-004). Required when using Google AI services. Create key at Google AI Studio. Gemini 1.5 Pro offers 2M token context window and multimodal capabilities. Flash variant is faster and cheaper. Great for code analysis with long context.',
        [
          ['Get API Key', 'https://ai.google.dev/gemini-api/docs/api-key'],
          ['Gemini Models', 'https://ai.google.dev/gemini-api/docs/models/gemini'],
          ['API Quickstart', 'https://ai.google.dev/gemini-api/docs/quickstart'],
          ['Pricing', 'https://ai.google.dev/pricing']
        ]
      ),
      OPENAI_BASE_URL: L(
        'OpenAI Base URL',
        'ADVANCED: Override the OpenAI API base URL for OpenAI-compatible endpoints. Use cases: local inference servers (LM Studio, vLLM, text-generation-webui), Azure OpenAI (https://YOUR_RESOURCE.openai.azure.com/), proxy services. Default: https://api.openai.com/v1. Useful for development, air-gapped environments, or cost optimization via self-hosted models.',
        [
          ['OpenAI API Reference', 'https://platform.openai.com/docs/api-reference'],
          ['Azure OpenAI', 'https://learn.microsoft.com/en-us/azure/ai-services/openai/'],
          ['LM Studio Setup', 'https://lmstudio.ai/docs/local-server'],
          ['vLLM Compatibility', 'https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html']
        ],
        [['Advanced', 'warn'], ['For compatible endpoints only', 'info']]
      ),

      // Enrichment / Cards / Indexing
      ENRICH_BACKEND: L(
        'Enrichment Backend',
        'Backend service for generating code summaries and enrichment metadata during indexing. Options: "openai" (GPT models, highest quality), "ollama" (local models, free), "mlx" (Apple Silicon optimized). Enrichment adds per-chunk summaries and keywords used by features like cards and improved reranking. Disable to speed up indexing or reduce costs.',
        [
          ['Code Enrichment', '/docs/ENRICHMENT.md'],
          ['MLX on Apple Silicon', 'https://github.com/ml-explore/mlx'],
          ['Ollama Local Models', 'https://ollama.com/library']
        ],
        [['Optional feature', 'info'], ['Increases index time', 'warn']]
      ),
      ENRICH_MODEL: L(
        'Enrichment Model',
        'Specific model name for code enrichment when ENRICH_BACKEND is set. For OpenAI: "gpt-4o-mini" (recommended, cheap), "gpt-4o" (higher quality, costly). For Ollama: specify via ENRICH_MODEL_OLLAMA instead. Smaller models (gpt-4o-mini, qwen2.5-coder:7b) balance cost and quality for summaries. Enrichment happens during indexing, not at query time.',
        [
          ['OpenAI Models', 'https://platform.openai.com/docs/models'],
          ['Model Selection Guide', '/docs/ENRICHMENT.md#model-selection'],
          ['Cost Comparison', 'https://openai.com/api/pricing/']
        ],
        [['Affects index cost', 'warn']]
      ),
      ENRICH_MODEL_OLLAMA: L(
        'Enrichment Model (Ollama)',
        'Ollama model name for code enrichment when ENRICH_BACKEND=ollama. Recommended: "qwen2.5-coder:7b" (fast, code-focused), "deepseek-coder:6.7b" (excellent code understanding), "codellama:13b" (high quality, slower). Model must be pulled via "ollama pull <model>" before use. Local enrichment is free but slower than cloud APIs.',
        [
          ['Ollama Models', 'https://ollama.com/library'],
          ['Pull Models', 'https://github.com/ollama/ollama#quickstart'],
          ['Code-Focused Models', 'https://ollama.com/search?c=tools'],
          ['Enrichment Setup', '/docs/ENRICHMENT.md#ollama']
        ],
        [['Free (local)', 'info'], ['Requires model download', 'warn']]
      ),
      ENRICH_CODE_CHUNKS: L(
        'Enrich Code Chunks',
        'Enable per-chunk code summarization during indexing. When on, each code chunk gets an AI-generated summary and keywords stored alongside the code. Powers the Cards feature (high-level code summaries) and improves reranking by providing semantic context. Increases indexing time and cost (API calls) but significantly improves retrieval quality for conceptual queries like "where is auth handled?"',
        [
          ['Cards Feature', '/docs/CARDS.md'],
          ['Code Summarization', 'https://en.wikipedia.org/wiki/Automatic_summarization'],
          ['Cards Builder Source', '/indexer/build_cards.py'],
          ['Enrichment Guide', '/docs/ENRICHMENT.md']
        ],
        [['Better retrieval', 'info'], ['Slower indexing', 'warn'], ['Costs API calls', 'warn']]
      ),
      CARDS_MAX: L(
        'Cards Max',
        'Maximum number of summary cards to load and consider during retrieval for score boosting. Cards are high-level summaries of code modules/features. Lower values (10-20) are faster but may miss relevant modules. Higher values (30-50) provide better coverage but increase memory and latency. Set to 0 to disable cards entirely. Recommended: 20-30 for balanced performance.',
        [
          ['Cards Feature Overview', '/docs/CARDS.md'],
          ['Cards Builder Source', '/indexer/build_cards.py'],
          ['Score Boosting', '/docs/RETRIEVAL.md#card-boosting']
        ],
        [['Affects memory', 'warn']]
      ),
      SKIP_DENSE: L(
        'Skip Dense Embeddings',
        'Skip vector embeddings and Qdrant during indexing to create a fast BM25-only (keyword-only) index. Useful for quick testing, CI/CD pipelines, or when Qdrant is unavailable. BM25-only mode is faster and uses less resources but loses semantic search capability - only exact keyword matches work. Not recommended for production use unless you have a purely keyword-based use case.',
        [
          ['BM25 vs Semantic', '/docs/RETRIEVAL.md#bm25-vs-dense'],
          ['Hybrid Search Benefits', 'https://www.pinecone.io/learn/hybrid-search-intro/'],
          ['Fast Indexing Guide', '/docs/INDEXING.md#bm25-only']
        ],
        [['Much faster', 'info'], ['Keyword-only', 'warn'], ['No semantic search', 'warn']]
      ),
      VENDOR_MODE: L(
        'Vendor Mode',
        'Controls scoring preference for your code vs third-party library code during reranking. "prefer_first_party" (recommended) boosts your app code (+0.06) and penalizes node_modules/vendor libs (-0.08) - best for understanding YOUR codebase. "prefer_vendor" does the opposite - useful when debugging library internals or learning from open-source code. Most users want prefer_first_party.',
        [
          ['First-Party vs Third-Party', 'https://en.wikipedia.org/wiki/First-party_and_third-party_sources'],
          ['Score Boosting Logic', '/docs/RETRIEVAL.md#vendor-mode'],
          ['Path Detection', '/docs/RETRIEVAL.md#vendor-detection']
        ],
        [['Code priority', 'info']]
      ),
      EMBEDDING_DIM: L(
        'Embedding Dimension',
        'Vector dimensionality for MXBAI/local embedding models. Common sizes: 384 (fast, lower quality), 768 (balanced, recommended), 1024 (best quality, slower). Larger dimensions capture more semantic nuance but increase Qdrant storage requirements and query latency. Must match your embedding model\'s output size. Changing this requires full reindexing - vectors of different dimensions are incompatible.',
        [
          ['Vector Embeddings', 'https://en.wikipedia.org/wiki/Word_embedding'],
          ['Dimensionality Tradeoffs', 'https://www.sbert.net/docs/pretrained_models.html#model-overview'],
          ['Qdrant Vector Config', 'https://qdrant.tech/documentation/concepts/collections/#create-a-collection'],
          ['Reindexing Guide', '/docs/INDEXING.md#full-reindex']
        ],
        [['Requires reindex','reindex'], ['Affects storage', 'warn']]
      ),
      PORT: L(
        'HTTP Port',
        'TCP port for the HTTP server that serves the GUI and API endpoints when running serve_rag. Default: 8012. Change if port 8012 is already in use by another service (common conflict: development servers). After changing, access GUI at http://127.0.0.1:<NEW_PORT>. Requires server restart to take effect.',
        [
          ['TCP Ports', 'https://en.wikipedia.org/wiki/List_of_TCP_and_UDP_port_numbers'],
          ['Port Conflicts', 'https://en.wikipedia.org/wiki/Port_scanner'],
          ['Server Configuration', '/docs/SERVER.md#port-configuration']
        ],
        [['Requires restart', 'warn']]
      ),
      AGRO_EDITION: L(
        'Edition',
        'Product edition identifier for feature gating in multi-tier deployments. Values: "oss" (open source, all community features), "pro" (professional tier with advanced features), "enterprise" (full feature set with support). This flag enables/disables certain UI elements and API endpoints based on licensing. Most users should leave this as "oss".',
        [
          ['Feature Matrix', '/docs/EDITIONS.md'],
          ['Licensing', '/docs/LICENSE.md'],
          ['Enterprise Features', '/docs/ENTERPRISE.md']
        ],
        [['Feature gating', 'info']]
      ),

      // Repo editor (dynamic inputs)
      repo_path: L(
        'Repository Path',
        'Absolute filesystem path to the repository directory to be indexed under this logical repo name. Example: /Users/you/projects/myapp or /home/dev/backend. This directory will be scanned for code files during indexing. Use repos.json to configure multiple repositories with different paths, keywords, and routing rules.',
        [
          ['repos.json Format', '/repos.json'],
          ['Multi-Repo Setup', '/docs/MULTI_REPO.md'],
          ['Indexing Workflow', '/docs/INDEXING.md#repository-setup']
        ]
      ),
      repo_keywords: L(
        'Repository Keywords',
        'Comma-separated keywords for query routing to this repository. When users ask questions containing these keywords, this repo is prioritized. Examples: "auth,authentication,login" or "payment,stripe,billing". Choose terms users naturally use when asking about this repo\'s domain. Helps multi-repo setups route queries to the right codebase.',
        [
          ['Query Routing', '/docs/MULTI_REPO.md#routing'],
          ['Keyword Selection', '/docs/MULTI_REPO.md#keyword-strategy'],
          ['repos.json Examples', '/repos.json']
        ],
        [['Multi-repo only', 'info']]
      ),
      repo_pathboosts: L(
        'Path Boosts',
        'Comma-separated directory path substrings to boost in search rankings for this repo. Examples: "src/,app/,lib/" boosts code in those directories. Use this to prioritize your main application code over tests, docs, or vendor code. Partial matches work - "api/" matches "src/api/", "backend/api/", etc. Boosts are applied during reranking.',
        [
          ['Score Boosting', '/docs/RETRIEVAL.md#path-boosting'],
          ['repos.json Config', '/repos.json'],
          ['Ranking Logic', '/docs/RETRIEVAL.md#ranking-algorithm']
        ],
        [['Affects ranking', 'info']]
      ),
      repo_layerbonuses: L(
        'Layer Bonuses',
        'JSON object mapping intent types to architecture layer bonuses for smart routing. Example: {"ui": {"frontend": 0.1, "components": 0.08}, "api": {"routes": 0.1, "controllers": 0.08}}. When users ask UI questions, code in frontend/ gets a +0.1 boost. Advanced feature for multi-tier architectures. Leave empty if not needed.',
        [
          ['Layer Routing', '/docs/MULTI_REPO.md#layer-bonuses'],
          ['Intent Detection', '/docs/RETRIEVAL.md#intent-classification'],
          ['JSON Format', 'https://www.json.org/json-en.html']
        ],
        [['Advanced', 'warn'], ['Multi-repo only', 'info']]
      ),

      // Evaluation
      GOLDEN_PATH: L(
        'Golden Questions Path',
        'Filesystem path to your golden questions JSON file (default: golden.json). Golden questions are curated query-answer pairs used to evaluate retrieval quality through automated testing. Format: [{"query": "how does auth work?", "expected_file": "src/auth.py"}]. Used by eval loop to measure metrics like Hit@K, MRR, and precision. Create golden questions from real user queries for best results.',
        [
          ['Golden Questions Format', '/docs/EVALUATION.md#golden-format'],
          ['Eval Script Source', '/eval/eval_loop.py'],
          ['Creating Golden Sets', '/docs/EVALUATION.md#creating-golden-questions'],
          ['Evaluation Metrics', 'https://en.wikipedia.org/wiki/Evaluation_measures_(information_retrieval)']
        ]
      ),
      BASELINE_PATH: L(
        'Baseline Path',
        'Directory where evaluation loop saves baseline results for regression testing and A/B comparison. Each eval run\'s metrics (Hit@K, MRR, latency) are stored here with timestamps. Use this to ensure retrieval quality doesn\'t regress after configuration changes, reindexing, or model upgrades. Compare current run against baseline to detect improvements or degradations.',
        [
          ['Baseline Testing', '/docs/EVALUATION.md#baseline-comparison'],
          ['Eval Script Source', '/eval/eval_loop.py'],
          ['Regression Prevention', 'https://en.wikipedia.org/wiki/Software_regression']
        ]
      ),
      EVAL_MULTI: L(
        'Eval Multi‑Query',
        'Enable multi-query expansion during evaluation runs (1=yes, 0=no). When enabled, each golden question is rewritten multiple times (per MQ_REWRITES setting) to test recall under query variation. Turning this on makes eval results match production behavior if you use multi-query in prod, but increases eval runtime. Use 1 to measure realistic performance, 0 for faster eval iterations.',
        [
          ['Multi-Query RAG', 'https://arxiv.org/abs/2305.14283'],
          ['Evaluation Setup', '/docs/EVALUATION.md#multi-query'],
          ['MQ_REWRITES Setting', '/docs/RETRIEVAL.md#multi-query']
        ],
        [['Affects eval time', 'warn']]
      ),
      EVAL_FINAL_K: L(
        'Eval Final‑K',
        'Number of top results to consider when evaluating Hit@K metrics. If set to 10, eval checks if the expected answer appears in the top 10 results. Lower values (5) test precision, higher values (20) test recall. Should match your production FINAL_K setting for realistic evaluation. Common: 5 (strict), 10 (balanced), 20 (lenient).',
        [
          ['Hit@K Metric', 'https://en.wikipedia.org/wiki/Evaluation_measures_(information_retrieval)#Precision_at_K'],
          ['Evaluation Metrics', '/docs/EVALUATION.md#metrics'],
          ['FINAL_K Setting', '/docs/RETRIEVAL.md#final-k']
        ]
      ),
      EVAL_SAMPLE_SIZE: L(
        'Sample Size (Quick vs Full)',
        'Limit evaluation to a subset of golden questions for faster iteration and testing. Quick (10): ~1 minute, good for sanity checks. Medium (25): ~2-3 minutes, better coverage. Large (50): ~5 minutes, more representative. Full (all): Run complete eval suite for milestone validation and regression detection. Leave empty or select "Full" to evaluate all questions. Sample evals are perfect for rapid iteration; use full evals before production changes or major updates.',
        [
          ['Evaluation Best Practices', '/docs/EVALUATION.md#quick-vs-full'],
          ['Regression Testing', '/docs/EVALUATION.md#baseline-comparison'],
          ['Evaluation Metrics Guide', '/docs/EVALUATION.md#metrics']
        ],
        [['Quick testing', 'info'], ['Sample recommended for CI', 'info']]
      ),

      // Repo‑specific env overrides (legacy)
      agro_PATH: L(
        'agro PATH (legacy)',
        'DEPRECATED: Legacy environment variable for setting the agro repository path. This is repo-specific and only works for a repo named "agro". Modern approach: use REPO_PATH for single repos or configure repos.json for multi-repo setups with proper routing. Kept for backwards compatibility - will be removed in future versions.',
        [
          ['repos.json Format', '/repos.json'],
          ['Migration Guide', '/docs/MIGRATION.md#legacy-env-vars'],
          ['REPO_PATH Setting', '/docs/CONFIGURATION.md#repo-path']
        ],
        [['Deprecated', 'warn'], ['Use repos.json instead', 'warn']]
      ),
      agro_PATH_BOOSTS: L(
        'agro Path Boosts (CSV)',
        'DEPRECATED: Legacy comma-separated path boosts for the "agro" repository only (e.g., "app/,lib/,config/"). Repo-specific environment variables like this don\'t scale for multi-repo setups. Modern approach: configure path boosts in repos.json per-repo settings. Kept for backwards compatibility.',
        [
          ['repos.json Path Boosts', '/repos.json'],
          ['Migration Guide', '/docs/MIGRATION.md#path-boosts'],
          ['Modern Path Boosting', '/docs/RETRIEVAL.md#path-boosting']
        ],
        [['Deprecated', 'warn'], ['Use repos.json instead', 'warn']]
      ),
      LANGCHAIN_agro: L(
        'LangChain (agro)',
        'DEPRECATED: Legacy/internal environment variable for LangChain tracing metadata specific to the "agro" repo. Repo-specific tracing keys don\'t work well with modern LangSmith. Modern approach: use LANGCHAIN_TRACING_V2=true + LANGCHAIN_PROJECT in your environment for proper tracing across all repos.',
        [
          ['LangSmith Tracing', 'https://docs.smith.langchain.com/'],
          ['LANGCHAIN_TRACING_V2', 'https://docs.smith.langchain.com/tracing/faq#how-do-i-turn-on-tracing'],
          ['Migration Guide', '/docs/MIGRATION.md#langchain-tracing']
        ],
        [['Deprecated', 'warn'], ['Use LANGCHAIN_TRACING_V2', 'warn']]
      ),

      // Generation & API
      GEN_MAX_TOKENS: L(
        'Max Tokens',
        'Maximum number of tokens the LLM can generate in a single response. Higher values allow longer answers but increase cost and latency. Typical: 512-1024 for concise answers, 2048-4096 for detailed explanations.',
        [
          ['OpenAI Token Limits', 'https://platform.openai.com/docs/guides/text-generation'],
          ['Token Counting', 'https://platform.openai.com/tokenizer']
        ]
      ),
      GEN_TOP_P: L(
        'Top-P (Nucleus Sampling)',
        'Controls randomness via nucleus sampling (0.0-1.0). Lower values (0.1-0.5) make output more focused and deterministic. Higher values (0.9-1.0) increase creativity and diversity. Recommended: 0.9 for general use.',
        [
          ['Nucleus Sampling', 'https://platform.openai.com/docs/guides/text-generation/parameter-details'],
          ['Top-P Explanation', 'https://en.wikipedia.org/wiki/Top-p_sampling']
        ]
      ),
      GEN_TIMEOUT: L(
        'Generation Timeout',
        'Maximum seconds to wait for LLM response before timing out. Prevents hanging on slow models or network issues. Increase for large models or slow connections. Typical: 30-120 seconds.',
        [
          ['Timeout Best Practices', 'https://platform.openai.com/docs/guides/rate-limits'],
          ['HTTP Timeouts', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Timeout']
        ]
      ),
      GEN_RETRY_MAX: L(
        'Generation Max Retries',
        'Number of retry attempts for failed LLM API calls due to rate limits, network errors, or transient failures. Higher values improve reliability but increase latency on failures. Typical: 2-3 retries.',
        [
          ['Retry Strategies', 'https://platform.openai.com/docs/guides/error-codes'],
          ['Exponential Backoff', 'https://en.wikipedia.org/wiki/Exponential_backoff']
        ]
      ),

      // Embedding
      EMBEDDING_CACHE_ENABLED: L(
        'Embedding Cache',
        'Cache embedding API results to disk to avoid re-computing vectors for identical text. Reduces API costs and speeds up reindexing. Disable only for debugging or when embeddings change frequently.',
        [
          ['Caching Strategies', 'https://en.wikipedia.org/wiki/Cache_(computing)'],
          ['Embedding Best Practices', 'https://platform.openai.com/docs/guides/embeddings/use-cases']
        ]
      ),
      EMBEDDING_TIMEOUT: L(
        'Embedding Timeout',
        'Maximum seconds to wait for embedding API response. Similar to GEN_TIMEOUT but for embedding calls during indexing. Increase for large batches or slow networks. Typical: 30-60 seconds.',
        [
          ['API Timeouts', 'https://platform.openai.com/docs/guides/rate-limits'],
          ['Embedding API', 'https://platform.openai.com/docs/api-reference/embeddings']
        ]
      ),
      EMBEDDING_RETRY_MAX: L(
        'Embedding Max Retries',
        'Retry attempts for failed embedding API calls during indexing. Higher values ensure indexing completes despite transient errors but slow down failure recovery. Typical: 2-3 retries.',
        [
          ['Error Handling', 'https://platform.openai.com/docs/guides/error-codes'],
          ['Retry Patterns', 'https://en.wikipedia.org/wiki/Retry_pattern']
        ]
      ),

      // Indexing
      INDEX_EXCLUDED_EXTS: L(
        'Excluded Extensions',
        'Comma-separated file extensions to skip during indexing (e.g., ".png,.jpg,.pdf,.zip"). Prevents indexing binary files, images, or non-code assets. Reduces index size and improves relevance.',
        [
          ['Gitignore Patterns', 'https://git-scm.com/docs/gitignore'],
          ['File Extensions', 'https://en.wikipedia.org/wiki/Filename_extension']
        ]
      ),
      INDEX_MAX_FILE_SIZE_MB: L(
        'Max File Size (MB)',
        'Skip files larger than this size (in megabytes) during indexing. Prevents huge generated files or vendor bundles from bloating the index. Typical: 1-5 MB for source code, higher for docs.',
        [
          ['File Size Management', 'https://en.wikipedia.org/wiki/File_size'],
          ['Indexing Best Practices', '/docs/INDEXING.md#file-size-limits']
        ]
      ),

      // Metrics & Monitoring
      PROMETHEUS_PORT: L(
        'Prometheus Port',
        'TCP port for Prometheus metrics endpoint. Exposes /metrics for scraping by Prometheus or Grafana. Default: 9090. Change to avoid conflicts with existing monitoring tools.',
        [
          ['Prometheus Basics', 'https://prometheus.io/docs/introduction/overview/'],
          ['Metrics Endpoint', 'https://prometheus.io/docs/instrumenting/exposition_formats/']
        ]
      ),
      METRICS_ENABLED: L(
        'Metrics Enabled',
        'Enable Prometheus metrics collection and /metrics endpoint. When on, exposes query latency, cache hits, error rates, etc. Essential for production monitoring. Minimal overhead.',
        [
          ['Prometheus Metrics', 'https://prometheus.io/docs/concepts/metric_types/'],
          ['Monitoring Best Practices', 'https://prometheus.io/docs/practices/naming/']
        ]
      ),

      // Logging & Observability
      LOG_LEVEL: L(
        'Log Level',
        'Logging verbosity level. Options: DEBUG (verbose, dev), INFO (normal, recommended), WARNING (errors + warnings only), ERROR (errors only). Higher levels reduce noise but may hide useful diagnostics.',
        [
          ['Python Logging Levels', 'https://docs.python.org/3/library/logging.html#logging-levels'],
          ['Logging Best Practices', 'https://docs.python.org/3/howto/logging.html']
        ]
      ),
      TRACING_ENABLED: L(
        'Tracing Enabled',
        'Enable distributed tracing for debugging complex RAG pipelines. Traces track request flow through retrieval, reranking, and generation. Useful for debugging latency or finding bottlenecks.',
        [
          ['Distributed Tracing', 'https://opentelemetry.io/docs/concepts/observability-primer/#distributed-traces'],
          ['LangSmith Tracing', 'https://docs.smith.langchain.com/tracing']
        ]
      ),
      TRACING_MODE: L(
        'Tracing Mode',
        'Tracing backend to use. Options: "langsmith" (LangSmith/LangChain), "langtrace" (Langtrace), "none" (disabled). Each backend has different dashboards and features for visualizing RAG pipeline execution.',
        [
          ['LangSmith', 'https://docs.smith.langchain.com/'],
          ['Langtrace', 'https://docs.langtrace.ai/']
        ]
      ),
      TRACE_AUTO_LS: L(
        'Auto LangSmith',
        'Automatically enable LangSmith tracing when LANGSMITH_API_KEY is set (1=yes, 0=no). Convenient for dev environments - no need to manually toggle LANGCHAIN_TRACING_V2.',
        [
          ['LangSmith Setup', 'https://docs.smith.langchain.com/']
        ]
      ),
      TRACE_RETENTION: L(
        'Trace Retention Days',
        'Number of days to retain trace data before automatic cleanup. Lower values save storage, higher values preserve history for debugging. Typical: 7-30 days.',
        [
          ['Data Retention', 'https://en.wikipedia.org/wiki/Data_retention']
        ]
      ),
      LANGSMITH_API_KEY: L(
        'LangSmith API Key',
        'API key for LangSmith tracing service. Get from LangSmith dashboard under Settings > API Keys. Required when TRACING_MODE=langsmith or LANGCHAIN_TRACING_V2=true.',
        [
          ['LangSmith API Keys', 'https://docs.smith.langchain.com/'],
          ['Get API Key', 'https://smith.langchain.com/settings']
        ]
      ),
      LANGCHAIN_API_KEY: L(
        'LangChain API Key',
        'Legacy alias for LANGSMITH_API_KEY. Both keys work for LangSmith authentication. Prefer LANGSMITH_API_KEY for clarity.',
        [
          ['LangSmith Setup', 'https://docs.smith.langchain.com/']
        ]
      ),
      LANGCHAIN_PROJECT: L(
        'LangChain Project',
        'Project name for organizing traces in LangSmith dashboard. Use different project names for dev/staging/prod to separate trace data. Example: "agro-dev", "agro-prod".',
        [
          ['LangSmith Projects', 'https://docs.smith.langchain.com/tracing/faq#how-do-i-use-projects']
        ]
      ),
      LANGCHAIN_ENDPOINT: L(
        'LangChain Endpoint',
        'LangSmith API endpoint URL. Default: https://api.smith.langchain.com. Only change for self-hosted LangSmith or custom proxy setups.',
        [
          ['LangSmith API', 'https://docs.smith.langchain.com/']
        ]
      ),
      LANGTRACE_API_KEY: L(
        'Langtrace API Key',
        'API key for Langtrace observability platform. Get from Langtrace dashboard. Required when TRACING_MODE=langtrace.',
        [
          ['Langtrace Setup', 'https://docs.langtrace.ai/']
        ]
      ),
      LANGTRACE_API_HOST: L(
        'Langtrace API Host',
        'Langtrace API endpoint URL. Default: https://langtrace.ai/api. Only change for self-hosted Langtrace instances.',
        [
          ['Langtrace Docs', 'https://docs.langtrace.ai/']
        ]
      ),
      LANGTRACE_PROJECT_ID: L(
        'Langtrace Project ID',
        'Project identifier for organizing traces in Langtrace. Find in Langtrace dashboard under project settings.',
        [
          ['Langtrace Projects', 'https://docs.langtrace.ai/']
        ]
      ),

      // Grafana Integration
      GRAFANA_BASE_URL: L(
        'Grafana Base URL',
        'Base URL for Grafana dashboard server (e.g., http://localhost:3000). Used for embedded dashboard iframes in GUI and direct links to monitoring dashboards.',
        [
          ['Grafana Setup', 'https://grafana.com/docs/grafana/latest/setup-grafana/']
        ]
      ),
      GRAFANA_AUTH_TOKEN: L(
        'Grafana Auth Token',
        'API token or service account token for Grafana authentication. Generate in Grafana under Configuration > API Keys or Service Accounts.',
        [
          ['Grafana API Keys', 'https://grafana.com/docs/grafana/latest/administration/api-keys/']
        ]
      ),
      GRAFANA_AUTH_MODE: L(
        'Grafana Auth Mode',
        'Authentication method for Grafana. Options: "token" (API token), "basic" (username/password), "none" (public dashboards).',
        [
          ['Grafana Auth', 'https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/']
        ]
      ),
      GRAFANA_DASHBOARD_UID: L(
        'Grafana Dashboard UID',
        'Unique identifier for default Grafana dashboard to display in GUI. Find UID in dashboard settings or URL (e.g., /d/abc123/dashboard-name -> UID is abc123).',
        [
          ['Dashboard UIDs', 'https://grafana.com/docs/grafana/latest/dashboards/']
        ]
      ),

      // Webhooks & Alerts
      ALERT_WEBHOOK_TIMEOUT: L(
        'Alert Webhook Timeout',
        'Maximum seconds to wait for alert webhook response (Slack, Discord, etc.). Prevents slow webhooks from blocking the main process. Typical: 5-10 seconds.',
        [
          ['Webhook Timeouts', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Timeout'],
          ['Slack Webhooks', 'https://api.slack.com/messaging/webhooks']
        ]
      ),

      // Keywords & Routing
      KEYWORDS_REFRESH_HOURS: L(
        'Keywords Refresh (Hours)',
        'How often (in hours) to regenerate repository keywords from code for improved query routing. Lower values keep keywords fresh but increase indexing overhead. Typical: 24-168 hours (1-7 days).',
        [
          ['Query Routing', '/docs/MULTI_REPO.md#keyword-routing'],
          ['Keyword Extraction', 'https://en.wikipedia.org/wiki/Keyword_extraction']
        ]
      ),

      // RAG Parameters (chunking, embeddings, indexing, enrichment)
      CARD_SEARCH_ENABLED: L(
        'Card Search Enabled',
        'Enable card-based boosting during retrieval to surface relevant code modules and features. When enabled, the system loads summary cards (high-level descriptions of modules/classes/features) and boosts results that match card content. This improves retrieval for conceptual queries like "where is payment processing?" at the cost of slightly increased memory and query latency. Requires ENRICH_CODE_CHUNKS=1 and cards to be built during indexing.\n\nRecommended: 1 (enabled) for production with enrichment, 0 (disabled) for development or when enrichment is off.',
        [
          ['Cards Feature Guide', '/docs/CARDS.md'],
          ['Card Builder Source', '/indexer/build_cards.py'],
          ['Score Boosting Logic', '/docs/RETRIEVAL.md#card-boosting']
        ],
        [['Better conceptual search', 'info'], ['Requires enrichment', 'warn']]
      ),
      EMBEDDING_MODEL: L(
        'Embedding Model (OpenAI)',
        'OpenAI embedding model name when EMBEDDING_TYPE=openai. Current options: "text-embedding-3-small" (512-3072 dims, $0.02/1M tokens, fast), "text-embedding-3-large" (256-3072 dims, $0.13/1M tokens, highest quality), "text-embedding-ada-002" (legacy, 1536 dims, $0.10/1M tokens). Larger models improve semantic search quality but cost more and require more storage. Changing this requires full reindexing as embeddings are incompatible across models.\n\nRecommended: text-embedding-3-small for most use cases, text-embedding-3-large for production systems demanding highest quality.',
        [
          ['OpenAI Embeddings Guide', 'https://platform.openai.com/docs/guides/embeddings'],
          ['Embedding Models', 'https://platform.openai.com/docs/models/embeddings'],
          ['Pricing Calculator', 'https://openai.com/api/pricing/']
        ],
        [['Requires reindex', 'reindex'], ['Costs API calls', 'warn']]
      ),
      VOYAGE_MODEL: L(
        'Voyage Embedding Model',
        'Voyage AI embedding model when EMBEDDING_TYPE=voyage. Options: "voyage-code-2" (1536 dims, optimized for code, recommended), "voyage-3" (1024 dims, general-purpose, fast), "voyage-3-lite" (512 dims, budget option). Voyage models are specialized for code retrieval and often outperform OpenAI on technical queries. Code-specific models understand programming constructs, API patterns, and documentation better than general embeddings.\n\nRecommended: voyage-code-2 for code-heavy repos, voyage-3 for mixed content (code + docs).',
        [
          ['Voyage Embeddings API', 'https://docs.voyageai.com/docs/embeddings'],
          ['voyage-code-2 Details', 'https://docs.voyageai.com/docs/voyage-code-2'],
          ['Model Comparison', 'https://docs.voyageai.com/docs/model-comparison']
        ],
        [['Requires reindex', 'reindex'], ['Code-optimized', 'info']]
      ),
      EMBEDDING_MODEL_LOCAL: L(
        'Local Embedding Model',
        'HuggingFace model name or local path when EMBEDDING_TYPE=local or mxbai. Popular options: "mixedbread-ai/mxbai-embed-large-v1" (1024 dims, excellent quality), "BAAI/bge-small-en-v1.5" (384 dims, fast), "sentence-transformers/all-MiniLM-L6-v2" (384 dims, lightweight). Local embeddings are free but slower than API-based options. Model is downloaded on first use and cached locally. Choose larger models (768-1024 dims) for quality or smaller (384 dims) for speed.\n\nRecommended: mxbai-embed-large-v1 for best free quality, all-MiniLM-L6-v2 for resource-constrained environments.',
        [
          ['Sentence Transformers Models', 'https://www.sbert.net/docs/sentence_transformer/pretrained_models.html'],
          ['HuggingFace Model Hub', 'https://huggingface.co/models?pipeline_tag=feature-extraction&sort=downloads'],
          ['MTEB Leaderboard', 'https://huggingface.co/spaces/mteb/leaderboard']
        ],
        [['Free (no API)', 'info'], ['Requires download', 'warn']]
      ),
      EMBEDDING_BATCH_SIZE: L(
        'Embedding Batch Size',
        'Number of text chunks to embed in a single API call or local batch during indexing. Higher values (50-200) speed up indexing by reducing API round trips but may hit rate limits or memory constraints. Lower values (10-30) are safer but slower. For OpenAI/Voyage APIs, batching significantly reduces total indexing time. For local models, larger batches improve GPU utilization but require more VRAM. If indexing fails with rate limit or OOM errors, reduce this value.\n\nRecommended: 100-150 for API providers, 16-32 for local models (GPU), 4-8 for CPU-only.',
        [
          ['OpenAI Batch Embedding', 'https://platform.openai.com/docs/guides/embeddings/use-cases'],
          ['Rate Limits', 'https://platform.openai.com/docs/guides/rate-limits'],
          ['GPU Memory Management', 'https://huggingface.co/docs/transformers/en/perf_train_gpu_one']
        ],
        [['Performance tuning', 'info'], ['Watch rate limits', 'warn']]
      ),
      EMBEDDING_MAX_TOKENS: L(
        'Embedding Max Tokens',
        'Maximum token length for text chunks sent to embedding models during indexing. Text exceeding this length is truncated by the tokenizer. Most embedding models support 512-8192 tokens. Longer limits preserve more context per chunk but increase embedding cost and processing time. Shorter limits are faster and cheaper but may lose semantic context for large functions/classes. Balance based on your average code chunk size and model capabilities.\n\nRecommended: 512 for most code (functions/methods), 1024 for documentation-heavy repos, 256 for ultra-fast indexing.',
        [
          ['Tokenization Basics', 'https://huggingface.co/docs/transformers/main/en/tokenizer_summary'],
          ['OpenAI Token Limits', 'https://platform.openai.com/docs/guides/embeddings/embedding-models'],
          ['Voyage Limits', 'https://docs.voyageai.com/docs/embeddings#input-text']
        ],
        [['Affects cost', 'warn'], ['Context preservation', 'info']]
      ),
      INDEXING_BATCH_SIZE: L(
        'Indexing Batch Size',
        'Number of chunks to process in parallel during the indexing pipeline (chunking, enrichment, embedding, Qdrant upload). Higher values (100-500) maximize throughput on fast networks and powerful machines but increase memory usage and risk batch failures. Lower values (20-50) are more stable and provide better progress visibility. If indexing crashes with OOM or connection errors, reduce this. For large repos (100k+ files), use higher values for efficiency.\n\nRecommended: 100-200 for normal repos, 50-100 for large repos or slow connections, 500+ for small repos on powerful hardware.',
        [
          ['Batch Processing', 'https://en.wikipedia.org/wiki/Batch_processing'],
          ['Qdrant Upload Performance', 'https://qdrant.tech/documentation/guides/bulk-upload/'],
          ['Indexing Guide', '/docs/INDEXING.md#performance']
        ],
        [['Performance tuning', 'info'], ['Memory sensitive', 'warn']]
      ),
      INDEXING_WORKERS: L(
        'Indexing Workers',
        'Number of parallel worker threads for CPU-intensive indexing tasks (file parsing, chunking, BM25 indexing). Higher values (4-16) utilize multi-core CPUs better and speed up indexing significantly. Lower values (1-2) reduce CPU load but increase indexing time. Set based on available CPU cores - typically use cores-1 or cores-2 to leave headroom for OS/other processes. For Docker/containers, ensure resource limits allow multiple workers.\n\nRecommended: 4-8 for most systems, 1-2 for low-power machines or containers with CPU limits, 12-16 for powerful servers.',
        [
          ['Parallel Processing', 'https://en.wikipedia.org/wiki/Parallel_computing'],
          ['Python ThreadPoolExecutor', 'https://docs.python.org/3/library/concurrent.futures.html#threadpoolexecutor'],
          ['Docker CPU Limits', 'https://docs.docker.com/engine/containers/resource_constraints/#cpu']
        ],
        [['CPU utilization', 'info'], ['Faster indexing', 'info']]
      ),
      INDEX_MAX_WORKERS: L(
        'Indexing Max Workers',
        'Upper bound on worker threads the indexer will spin up. Caps auto-tuned worker counts so shared machines are not saturated. Set near available CPU cores (e.g., 8 on an 8–12 core box) for predictable throughput; lower (2-4) on laptops or CI to avoid fan/thermal throttling. If INDEXING_WORKERS exceeds this cap, the cap wins. Increase when CPU is underutilized; decrease if indexing causes contention with Docker/Qdrant.',
        [
          ['Python ThreadPoolExecutor reference', 'https://docs.python.org/3/library/concurrent.futures.html#threadpoolexecutor']
        ],
        [['CPU/IO load', 'warn'], ['Performance guardrail', 'info']]
      ),
      INDEXING_PROCESS: L(
        'Indexing Process',
        'Runs the full pipeline: chunk source files, build BM25 sparse index, generate embeddings, and write vectors to Qdrant. Use after code changes, config changes (CHUNK_SIZE, EMBEDDING_TYPE, COLLECTION_NAME), or when switching repos/profiles. Expect heavier CPU/network usage; ensure Qdrant and embedding providers are reachable. Re-run to refresh stale indices or after cleaning the output directory.',
        [
          ['Qdrant indexing concepts', 'https://qdrant.tech/documentation/concepts/indexing/']
        ],
        [['Core workflow', 'info'], ['Requires reindex', 'reindex']]
      ),
      INDEX_PROFILES: L(
        'Index Profiles',
        'Preset index configurations for different scenarios (e.g., shared/BM25-only for speed, full hybrid for quality, dev for small subsets). Switching profiles updates indexing knobs in one click and may trigger a rebuild to match the selected profile. Use shared for quick smoke tests, full for production-quality retrieval, and dev when iterating on pipeline changes without reindexing the entire repo.',
        [
          ['Qdrant collections and optimizer overview', 'https://qdrant.tech/documentation/concepts/collections/']
        ],
        [['Profile switch', 'info'], ['May require reindex', 'warn']]
      ),
      BM25_STEMMER_LANG: L(
        'BM25 Stemmer Language',
        'Language for stemming/normalization in BM25 sparse indexing. Common values: "en" (English - default), "multilingual" (multiple languages), "none" (disable stemming). Stemming reduces words to root forms (e.g., "running" -> "run") to improve keyword matching. English stemming works well for code comments, docs, and variable names. Use "none" for non-English repos or when exact keyword matching is critical (e.g., API names, error codes).\n\nRecommended: "en" for English codebases, "multilingual" for international teams, "none" for strict keyword matching.',
        [
          ['BM25 Algorithm', 'https://en.wikipedia.org/wiki/Okapi_BM25'],
          ['Stemming Explained', 'https://en.wikipedia.org/wiki/Stemming'],
          ['BM25S Library', 'https://github.com/xhluca/bm25s#supported-stemmers']
        ],
        [['Affects keyword search', 'info']]
      ),
      VOYAGE_RERANK_MODEL: L(
        'Voyage Rerank Model',
        'Voyage AI reranker model name when RERANK_BACKEND=voyage. Current option: "rerank-2" (latest, best quality). Voyage rerankers are cross-encoders that score (query, document) pairs for precise relevance ranking. Generally more accurate than open-source rerankers but costs per API call. Use when retrieval quality is critical and budget allows. Pricing is per rerank request (typically $0.05-0.10 per 1000 candidates).\n\nRecommended: Use Voyage reranking for production systems with quality requirements; use local rerankers (RERANKER_MODEL) for development/testing.',
        [
          ['Voyage Rerank API', 'https://docs.voyageai.com/docs/reranker'],
          ['rerank-2 Details', 'https://docs.voyageai.com/docs/rerank-2'],
          ['Pricing', 'https://docs.voyageai.com/docs/pricing']
        ],
        [['Costs API calls', 'warn'], ['High quality', 'info']]
      ),
      AGRO_RERANKER_RELOAD_ON_CHANGE: L(
        'Reranker Auto-Reload',
        'Automatically reload the local reranker model when RERANKER_MODEL path changes during runtime (1=yes, 0=no). When enabled, the system detects model path changes and hot-reloads the new model without server restart. Useful during development when switching between reranker models or testing fine-tuned versions. In production, disable to avoid unexpected reloads and ensure stability. Model reloading adds 2-5 seconds of latency on first query after change.\n\nRecommended: 1 for development/testing, 0 for production deployments.',
        [
          ['Model Management', '/docs/LEARNING_RERANKER.md#testing-models'],
          ['Hot Reload Patterns', 'https://en.wikipedia.org/wiki/Hot_swapping'],
          ['Reranker Training', '/docs/LEARNING_RERANKER.md']
        ],
        [['Development feature', 'info'], ['Disable in production', 'warn']]
      ),
      ENRICH_DISABLED: L(
        'Disable Enrichment',
        'Completely disable code enrichment (summaries, keywords, cards) during indexing (1=disable, 0=enable). When disabled, indexing is much faster and cheaper (no LLM API calls) but you lose card search, enriched metadata, and semantic boosting. Use this for quick re-indexing during development, CI/CD pipelines, or when working with non-code content. Re-enable for production to get full retrieval quality benefits.\n\nRecommended: 0 (enrichment ON) for production, 1 (enrichment OFF) for fast iteration and testing.',
        [
          ['Enrichment Guide', '/docs/ENRICHMENT.md'],
          ['Cards Feature', '/docs/CARDS.md'],
          ['Fast Indexing Mode', '/docs/INDEXING.md#skip-enrichment']
        ],
        [['Much faster indexing', 'info'], ['Loses card search', 'warn']]
      ),
      KEYWORDS_MAX_PER_REPO: L(
        'Keywords Max Per Repo',
        'Maximum number of repository-specific keywords to extract and store for query routing in multi-repo setups. Higher values (100-200) capture more routing signals but increase memory and may introduce noise. Lower values (20-50) keep routing focused on core concepts. Keywords are extracted from code, docs, and enrichment metadata. Used by the router to determine which repositories are most relevant for a given query.\n\nRecommended: 50-100 for most repos, 150-200 for large multi-domain codebases, 20-30 for focused microservices.',
        [
          ['Query Routing', '/docs/MULTI_REPO.md#routing'],
          ['Keyword Extraction', '/docs/MULTI_REPO.md#automatic-keywords'],
          ['repos.json Config', '/repos.json']
        ],
        [['Multi-repo only', 'info'], ['Auto-generated', 'info']]
      ),
      KEYWORDS_AUTO_GENERATE: L(
        'Auto-Generate Keywords',
        'Automatically extract repository keywords from code and documentation during indexing (1=yes, 0=no). When enabled, the system analyzes class names, function names, docstrings, and comments to build a keyword set for routing. This supplements manually-defined keywords in repos.json. Auto-generation is useful for new repos or when you don\'t know what routing keywords to use. Disable if you prefer full manual control via repos.json.\n\nRecommended: 1 for automatic keyword discovery, 0 for strict manual control.',
        [
          ['Keyword Extraction Logic', '/docs/MULTI_REPO.md#keyword-generation'],
          ['repos.json Keywords', '/repos.json'],
          ['Routing Guide', '/docs/MULTI_REPO.md#routing-algorithm']
        ],
        [['Multi-repo feature', 'info'], ['Complements manual keywords', 'info']]
      ),
      TRACE_SAMPLING_RATE: L(
        'Trace Sampling Rate',
        'Percentage of requests to trace with LangSmith/observability (0.0-1.0). 1.0 = trace everything (100%), 0.1 = trace 10% of requests, 0.0 = no tracing. Lower sampling reduces LangSmith costs and overhead while still providing visibility into system behavior. Use 1.0 during development/debugging, 0.05-0.2 in production for cost-effective monitoring. Sampling is random - every request has this probability of being traced.\n\nRecommended: 1.0 for development, 0.1-0.2 for production monitoring, 0.05 for high-traffic systems.',
        [
          ['LangSmith Tracing', 'https://docs.smith.langchain.com/tracing'],
          ['Sampling Strategies', 'https://docs.smith.langchain.com/tracing/faq#how-do-i-sample-traces'],
          ['Trace Costs', 'https://www.langchain.com/pricing']
        ],
        [['Cost control', 'info'], ['Observability', 'info']]
      ),

      // Chunking
      AST_OVERLAP_LINES: L(
        'AST Overlap Lines',
        'Number of overlapping lines between consecutive AST-based code chunks. Overlap ensures context continuity across chunk boundaries, preventing loss of meaning when functions or classes are split. Higher overlap (5-15 lines) improves retrieval quality by providing more context but increases index size and duplicate content. Lower overlap (0-5 lines) reduces redundancy but risks fragmenting logical units.\n\nSweet spot: 3-5 lines for balanced context preservation. Use 5-10 lines for codebases with large functions or complex nested structures where context matters heavily. Use 0-2 lines for memory-constrained environments or when chunk boundaries align well with natural code structure (e.g., clean function boundaries). AST-aware chunking (cAST method) respects syntax boundaries, so overlap supplements structural chunking.\n\nExample: With 5-line overlap, if chunk 1 ends at line 100, chunk 2 starts at line 96, creating a 5-line bridge. This helps when a query matches content near chunk boundaries - the overlapping region appears in both chunks, improving recall. The cAST paper (EMNLP 2025) shows overlap significantly improves code retrieval accuracy.\n\n• Range: 0-15 lines (typical)\n• Minimal: 0-2 lines (tight memory, clean boundaries)\n• Balanced: 3-5 lines (recommended for most codebases)\n• High context: 5-10 lines (complex nested code)\n• Very high: 10-15 lines (maximum context, high redundancy)\n• Trade-off: More overlap = better recall, larger index',
        [
          ['cAST Chunking Paper (EMNLP 2025)', 'https://arxiv.org/abs/2506.15655'],
          ['AST Chunking Toolkit', 'https://github.com/yilinjz/astchunk'],
          ['Context Window in RAG', 'https://arxiv.org/abs/2312.10997'],
          ['Chunking Strategies', '/docs/INDEXING.md#ast-chunking']
        ],
        [['Advanced chunking', 'info'], ['Requires reindex', 'reindex']]
      ),
      MAX_CHUNK_SIZE: L(
        'Max Chunk Size (Tokens)',
        'Maximum token length for a single code chunk during AST-based chunking. Limits chunk size to fit within embedding model token limits (typically 512-8192 tokens). Larger chunks (1000-2000 tokens) capture more context per chunk, reducing fragmentation of large functions/classes. Smaller chunks (200-512 tokens) create more granular units, improving precision but potentially losing broader context.\n\nSweet spot: 512-768 tokens for balanced chunking. This fits most embedding models (e.g., OpenAI text-embedding-3 supports up to 8191 tokens, but 512-768 is practical). Use 768-1024 for code with large docstrings or complex classes where context matters. Use 256-512 for tight memory budgets or when targeting very specific code snippets. AST chunking respects syntax, so chunks won\'t split mid-function even if size limit is hit (falls back to greedy chunking).\n\nToken count is approximate (based on whitespace heuristics, not exact tokenization). Actual embedding input may vary slightly. If a logical unit (function, class) exceeds MAX_CHUNK_SIZE, the chunker splits it using GREEDY_FALLBACK_TARGET for sub-chunking while preserving structure where possible.\n\n• Range: 200-2000 tokens (typical)\n• Small: 256-512 tokens (precision, tight memory)\n• Balanced: 512-768 tokens (recommended, fits most models)\n• Large: 768-1024 tokens (more context, larger functions)\n• Very large: 1024-2000 tokens (maximum context, risky for some models)\n• Constraint: Must not exceed embedding model token limit',
        [
          ['Token Limits by Model', 'https://platform.openai.com/docs/guides/embeddings/embedding-models'],
          ['cAST Paper', 'https://arxiv.org/abs/2506.15655'],
          ['Chunking Size Tradeoffs', 'https://weaviate.io/blog/chunking-strategies-for-rag'],
          ['Token Estimation', 'https://github.com/openai/tiktoken']
        ],
        [['Advanced chunking', 'info'], ['Requires reindex', 'reindex']]
      ),
      MIN_CHUNK_CHARS: L(
        'Min Chunk Chars',
        'Minimum character count for a valid chunk. Chunks smaller than this are discarded or merged with adjacent chunks to avoid indexing trivial code fragments (empty functions, single-line comments, import statements). Higher minimums (100-200 chars) filter out noise and reduce index size but may skip small utility functions. Lower minimums (20-50 chars) index everything but include low-value chunks.\n\nSweet spot: 50-100 characters for balanced filtering. Use 100-200 for aggressive noise reduction when you have many trivial functions or auto-generated code. Use 20-50 to index everything, including tiny utilities (useful for finding specific one-liners or constants). This threshold applies after AST chunking - if a logical unit is too small, it\'s skipped unless PRESERVE_IMPORTS is enabled.\n\nExample: A 2-line import block (30 chars) would be skipped with MIN_CHUNK_CHARS=50 unless PRESERVE_IMPORTS=1. A 5-line utility function (80 chars) would pass the filter. This prevents embedding API calls and index bloat from non-semantic content. Adjust based on your codebase style - functional codebases with many small functions may need lower thresholds.\n\n• Range: 20-300 characters (typical)\n• Very permissive: 20-50 chars (index everything, including tiny snippets)\n• Balanced: 50-100 chars (recommended, filter trivial fragments)\n• Aggressive filtering: 100-200 chars (skip small utilities, focus on substantial code)\n• Very aggressive: 200-300 chars (only meaningful functions/classes)\n• Trade-off: Higher threshold = cleaner index, may miss small but relevant code',
        [
          ['Noise Filtering', '/docs/INDEXING.md#filtering'],
          ['Code Chunking Best Practices', 'https://weaviate.io/blog/chunking-strategies-for-rag'],
          ['Index Optimization', '/docs/PERFORMANCE_AND_COST.md#index-size'],
          ['cAST Filtering', 'https://github.com/yilinjz/astchunk#filtering']
        ],
        [['Index quality control', 'info'], ['Requires reindex', 'reindex']]
      ),
      CHUNK_SIZE: L(
        'Chunk Size (chars)',
        'Target size in characters for each chunk during indexing. Larger chunks (1500-2500) preserve more surrounding code context (good for flows across functions/classes) but reduce granularity and increase embedding cost. Smaller chunks (600-1200) improve precision and lower cost but may split logic across chunks. Tune with CHUNK_OVERLAP to avoid cutting important boundaries. Changing this requires a full re-index to regenerate chunks and embeddings.',
        [
          ['Cohere embeddings guide (chunking section)', 'https://docs.cohere.com/docs/embeddings#chunking'],
          ['Qdrant indexing concepts', 'https://qdrant.tech/documentation/concepts/indexing/']
        ],
        [['Requires reindex', 'reindex'], ['Context vs precision', 'info']]
      ),
      CHUNK_OVERLAP: L(
        'Chunk Overlap (chars)',
        'Number of overlapping characters to keep between adjacent chunks. Prevents context loss when functions, classes, or paragraphs straddle chunk boundaries. Typical range: 100-400. Use 250-400 for long functions/docs so references carry across chunks; 100-200 to reduce duplicate content and index size. Too much overlap inflates storage and can surface near-duplicate hits. Adjust alongside CHUNK_SIZE, then re-index.',
        [
          ['Cohere embeddings guide (chunking section)', 'https://docs.cohere.com/docs/embeddings#chunking'],
          ['Qdrant indexing concepts', 'https://qdrant.tech/documentation/concepts/indexing/']
        ],
        [['Requires reindex', 'reindex'], ['Controls recall', 'info']]
      ),
      GREEDY_FALLBACK_TARGET: L(
        'Greedy Fallback Target (Chars)',
        'Target chunk size (in characters) for greedy fallback chunking when AST-based chunking fails or encounters oversized logical units. Greedy chunking splits text at line boundaries to hit this approximate size. Used as a safety mechanism when: (1) file syntax is unparseable, (2) a single function/class exceeds MAX_CHUNK_SIZE, (3) non-code files (markdown, text) are indexed.\n\nSweet spot: 500-800 characters for fallback chunks. This roughly corresponds to 100-150 tokens, providing reasonable context when AST chunking isn\'t possible. Use 800-1200 for larger fallback chunks (more context but less precise boundaries). Use 300-500 for smaller fallback chunks (tighter boundaries, less context). Greedy chunking is less semantic than AST chunking - it splits at line breaks regardless of code structure.\n\nExample: If a 3000-char function exceeds MAX_CHUNK_SIZE and can\'t be split structurally, greedy fallback divides it into ~4 chunks of ~750 chars each (based on GREEDY_FALLBACK_TARGET=800). This preserves some of the function in each chunk. Greedy fallback is rare in well-formed code but essential for robustness.\n\n• Range: 300-1500 characters (typical)\n• Small: 300-500 chars (tight boundaries, less context)\n• Balanced: 500-800 chars (recommended, ~100-150 tokens)\n• Large: 800-1200 chars (more context per fallback chunk)\n• Very large: 1200-1500 chars (maximum context, rare use)\n• When used: Syntax errors, oversized units, non-code files',
        [
          ['Fallback Strategies', '/docs/INDEXING.md#greedy-fallback'],
          ['Chunking Robustness', 'https://github.com/yilinjz/astchunk#fallback-modes'],
          ['AST Parsing Failures', '/docs/INDEXING.md#error-handling'],
          ['Greedy Chunking', 'https://en.wikipedia.org/wiki/Chunking_(psychology)']
        ],
        [['Fallback mechanism', 'info'], ['Requires reindex', 'reindex']]
      ),
      CHUNKING_STRATEGY: L(
        'Chunking Strategy',
        'Primary strategy for splitting code into chunks during indexing. Options: "ast" (AST-aware, syntax-respecting, recommended for code), "greedy" (line-based splitting, simpler), "hybrid" (AST with greedy fallback). AST chunking uses the cAST method (EMNLP 2025) to respect function/class boundaries, preserving semantic units. Greedy chunking splits at line breaks to hit target size, ignoring syntax. Hybrid uses AST primarily with greedy fallback for unparseable files.\n\n"ast" (recommended for code): Parses syntax tree and chunks at natural boundaries (functions, classes, methods). Produces semantically coherent chunks. Best for code retrieval. Requires parseable syntax - fails gracefully on malformed code.\n\n"greedy": Simple line-based splitting at target character count. Fast, always works, but may split mid-function or mid-class, fragmenting semantic units. Use for non-code (markdown, text) or when AST parsing is too slow.\n\n"hybrid": Tries AST first, falls back to greedy on parse errors. Balanced approach - gets AST benefits for well-formed code, handles edge cases gracefully. Recommended for mixed codebases (code + docs + config).\n\n• ast: Syntax-aware, best retrieval quality, code-only, requires parseable syntax (recommended for code)\n• greedy: Fast, always works, ignores syntax, lower quality chunks, good for non-code\n• hybrid: AST + greedy fallback, balanced, handles all files (recommended for mixed repos)\n• Effect: Fundamental impact on chunk quality, retrieval precision, index structure\n• Requires reindex: Changes take effect after full rebuild',
        [
          ['cAST Chunking Paper (EMNLP 2025)', 'https://arxiv.org/abs/2506.15655'],
          ['AST Chunking Toolkit', 'https://github.com/yilinjz/astchunk'],
          ['Chunking Strategies Guide', '/docs/INDEXING.md#chunking-strategies'],
          ['RAG Chunking Best Practices', 'https://weaviate.io/blog/chunking-strategies-for-rag']
        ],
        [['Core indexing choice', 'warn'], ['Requires reindex', 'reindex']]
      ),
      PRESERVE_IMPORTS: L(
        'Preserve Imports',
        'Include import/require statements in chunks even if they fall below MIN_CHUNK_CHARS threshold (1=yes, 0=no). When enabled, import blocks become searchable, helping users find dependency usage and module relationships. When disabled, imports are filtered out as low-value content. Enabling increases index size slightly but improves dependency discovery (e.g., "where do we use requests library?").\n\nSweet spot: 1 (enabled) for codebases where dependency tracking matters. Use 0 (disabled) to reduce index size and focus on implementation code rather than declarations. Import preservation is especially valuable in polyglot repos (Python, JavaScript, Go) where import patterns reveal architecture. Imports are still visible in full file context; this setting only affects whether they\'re indexed as standalone chunks.\n\nExample: With PRESERVE_IMPORTS=1, a 3-line import block becomes a searchable chunk even if it\'s <MIN_CHUNK_CHARS. A query like "where do we import AuthService?" will match this chunk. With PRESERVE_IMPORTS=0, the import block is skipped, and only code using AuthService is indexed.\n\n• 0: Disabled - skip import statements, reduce noise, smaller index, focus on implementation\n• 1: Enabled - index imports, discover dependencies, find module usage, slightly larger index (recommended)\n• Use case: Dependency audits, security reviews, architecture analysis\n• Trade-off: Slightly larger index vs better dependency discovery',
        [
          ['Import Analysis', '/docs/INDEXING.md#imports'],
          ['Dependency Discovery', '/docs/RETRIEVAL.md#import-search'],
          ['Code Structure Analysis', 'https://en.wikipedia.org/wiki/Dependency_analysis'],
          ['Module Systems', 'https://en.wikipedia.org/wiki/Modular_programming']
        ],
        [['Dependency tracking', 'info'], ['Requires reindex', 'reindex']]
      ),

      // Chat & Streaming
      CHAT_STREAMING_ENABLED: L(
        'Chat Streaming',
        'Enable streaming responses for chat interfaces. When on, tokens appear incrementally (like typing). Better UX but requires SSE support. Disable for simple request-response APIs.',
        [
          ['Server-Sent Events', 'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events'],
          ['Streaming API', 'https://platform.openai.com/docs/api-reference/streaming']
        ]
      ),
    };
  }

  function attachTooltipListeners(icon, bubble, wrap) {
    let hideTimeout = null;

    function show(){
      clearTimeout(hideTimeout);
      bubble.classList.add('tooltip-visible');
    }

    function hide(){
      // Delay hiding to allow moving mouse to tooltip
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        bubble.classList.remove('tooltip-visible');
      }, 150);
    }

    // Show on icon hover/focus
    icon.addEventListener('mouseenter', show);
    icon.addEventListener('mouseleave', hide);
    icon.addEventListener('focus', show);
    icon.addEventListener('blur', hide);

    // Keep tooltip visible when hovering over it
    bubble.addEventListener('mouseenter', show);
    bubble.addEventListener('mouseleave', hide);

    // Toggle on click
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      clearTimeout(hideTimeout);
      bubble.classList.toggle('tooltip-visible');
    });

    // Hide when clicking outside
    document.addEventListener('click', (evt) => {
      if (!wrap.contains(evt.target)) {
        clearTimeout(hideTimeout);
        bubble.classList.remove('tooltip-visible');
      }
    });
  }

  function attachManualTooltips() {
    // Attach event listeners to any manually-created tooltips in HTML
    const manualTooltips = document.querySelectorAll('.tooltip-wrap');
    manualTooltips.forEach((wrap) => {
      const icon = wrap.querySelector('.help-icon');
      const bubble = wrap.querySelector('.tooltip-bubble');
      if (!icon || !bubble) return;
      // Check if already has listeners (avoid double-attaching)
      if (icon.dataset.tooltipAttached) return;
      icon.dataset.tooltipAttached = 'true';
      attachTooltipListeners(icon, bubble, wrap);
    });
  }

  function getTooltipHtml(map, key, fallbackLabel) {
    const html = map[key];
    if (html) return html;
    const label = fallbackLabel || key;
    return `<span class=\"tt-title\">${label}</span><div>No detailed tooltip available yet. See our docs for related settings.</div><div class=\"tt-links\"><a href=\"/README.md\" target=\"_blank\" rel=\"noopener\">Main README</a> <a href=\"/docs/README_INDEX.md\" target=\"_blank\" rel=\"noopener\">Docs Index</a></div>`;
  }

  function ensureTooltipWrap(icon) {
    let wrap = icon.closest('.tooltip-wrap');
    if (!wrap) {
      wrap = document.createElement('span');
      wrap.className = 'tooltip-wrap';
      icon.replaceWith(wrap);
      wrap.appendChild(icon);
    }
    return wrap;
  }

  function attachDataTooltipIcon(icon, map, fallbackLabel) {
    const key = (icon.dataset.tooltip || '').trim();
    if (!key || icon.dataset.tooltipAttached === 'true') return;
    const wrap = ensureTooltipWrap(icon);
    let bubble = wrap.querySelector('.tooltip-bubble');
    const html = getTooltipHtml(map, key, fallbackLabel || icon.textContent || key);
    if (!bubble) {
      bubble = document.createElement('div');
      bubble.className = 'tooltip-bubble';
      bubble.setAttribute('role', 'tooltip');
      wrap.appendChild(bubble);
    }
    bubble.innerHTML = html;
    if (!icon.hasAttribute('tabindex')) icon.setAttribute('tabindex', '0');
    if (!icon.getAttribute('aria-label')) icon.setAttribute('aria-label', `Help: ${key}`);
    icon.dataset.tooltipAttached = 'true';
    attachTooltipListeners(icon, bubble, wrap);
  }

  function attachDataTooltipIcons(map) {
    const labeledIcons = document.querySelectorAll('.help-icon[data-tooltip]');
    labeledIcons.forEach((icon) => {
      attachDataTooltipIcon(icon, map, icon.closest('label')?.textContent?.trim());
    });

    const labelsWithData = document.querySelectorAll('label[data-tooltip]');
    labelsWithData.forEach((label) => {
      const key = (label.dataset.tooltip || '').trim();
      if (!key) return;
      const existingIcon = label.querySelector('.help-icon[data-tooltip]');
      if (existingIcon) {
        attachDataTooltipIcon(existingIcon, map, label.textContent?.trim());
        return;
      }
      const icon = document.createElement('span');
      icon.className = 'help-icon';
      icon.dataset.tooltip = key;
      icon.textContent = '?';
      label.appendChild(icon);
      attachDataTooltipIcon(icon, map, label.textContent?.trim());
    });
  }

  function attachTooltips(){
    const map = buildTooltipMap();
    attachDataTooltipIcons(map);
    const fields = document.querySelectorAll('[name]');
    fields.forEach((field) => {
      const name = field.getAttribute('name');
      const parent = field.closest('.input-group');
      if (!name || !parent) return;
      const label = parent.querySelector('label');
      if (!label) return;
      const existingIcon = label.querySelector('.help-icon');
      if (existingIcon) {
        if (existingIcon.dataset.tooltip && existingIcon.dataset.tooltipAttached !== 'true') {
          attachDataTooltipIcon(existingIcon, map, label.textContent || name);
        }
        return;
      }
      
      // Skip labels that are part of toggle controls - they have special structure
      if (label.classList.contains('toggle')) {
        // For toggle labels, we need to preserve the existing structure
        // and only add tooltips to the label text, not replace everything
        const existingText = label.querySelector('.toggle-label');
        if (existingText && !label.querySelector('.help-icon')) {
          // Build tooltip HTML (same keying as non-toggle path)
          let key = name;
          if (name.startsWith('repo_')) {
            const type = name.split('_')[1];
            key = 'repo_' + type;
          }
          const htmlContent = getTooltipHtml(map, key, name);
          const spanText = document.createElement('span');
          spanText.className = 'label-text';
          spanText.textContent = existingText.textContent;
          existingText.textContent = '';
          existingText.appendChild(spanText);
          const wrap = document.createElement('span');
          wrap.className = 'tooltip-wrap';
          const icon = document.createElement('span');
          icon.className = 'help-icon';
          icon.setAttribute('tabindex', '0');
          icon.setAttribute('aria-label', `Help: ${name}`);
          icon.textContent = '?';
          icon.dataset.tooltipAttached = 'true';
          const bubble = document.createElement('div');
          bubble.className = 'tooltip-bubble';
          bubble.setAttribute('role', 'tooltip');
          bubble.innerHTML = htmlContent;
          wrap.appendChild(icon);
          wrap.appendChild(bubble);
          existingText.appendChild(wrap);
          attachTooltipListeners(icon, bubble, wrap);
        }
        return;
      }
      let key = name;
      if (name.startsWith('repo_')) {
        const type = name.split('_')[1];
        key = 'repo_' + type;
      }
      const html = getTooltipHtml(map, key, name);
      const spanText = document.createElement('span');
      spanText.className = 'label-text';
      spanText.textContent = label.textContent;
      label.textContent = '';
      label.appendChild(spanText);
      const wrap = document.createElement('span');
      wrap.className = 'tooltip-wrap';
      const icon = document.createElement('span');
      icon.className = 'help-icon';
      icon.setAttribute('tabindex', '0');
      icon.setAttribute('aria-label', `Help: ${name}`);
      icon.textContent = '?';
      icon.dataset.tooltipAttached = 'true';
      const bubble = document.createElement('div');
      bubble.className = 'tooltip-bubble';
      bubble.setAttribute('role', 'tooltip');
      bubble.innerHTML = html;
      wrap.appendChild(icon);
      wrap.appendChild(bubble);
      label.appendChild(wrap);
      attachTooltipListeners(icon, bubble, wrap);
    });

    // Also attach to manual tooltips in HTML
    attachManualTooltips();

    // Also attach tooltips for training controls that are identified by id (no name attributes)
    const trainingFields = [
      { id: 'reranker-epochs', key: 'RERANKER_TRAIN_EPOCHS' },
      { id: 'reranker-batch', key: 'RERANKER_TRAIN_BATCH' },
      { id: 'reranker-maxlen', key: 'RERANKER_TRAIN_MAXLEN' },
    ];
    trainingFields.forEach(({id, key}) => {
      const field = document.getElementById(id);
      if (!field) return;
      const parent = field.closest('.input-group');
      if (!parent) return;
      const label = parent.querySelector('label');
      if (!label || label.querySelector('.help-icon')) return;
      const html = getTooltipHtml(map, key, label.textContent || key);
      const spanText = document.createElement('span');
      spanText.className = 'label-text';
      spanText.textContent = label.textContent;
      label.textContent = '';
      label.appendChild(spanText);
      const wrap = document.createElement('span');
      wrap.className = 'tooltip-wrap';
      const icon = document.createElement('span');
      icon.className = 'help-icon';
      icon.setAttribute('tabindex', '0');
      icon.setAttribute('aria-label', `Help: ${label.textContent}`);
      icon.textContent = '?';
      icon.dataset.tooltipAttached = 'true';
      const bubble = document.createElement('div');
      bubble.className = 'tooltip-bubble';
      bubble.setAttribute('role', 'tooltip');
      bubble.innerHTML = html;
      wrap.appendChild(icon);
      wrap.appendChild(bubble);
      label.appendChild(wrap);
      attachTooltipListeners(icon, bubble, wrap);
    });
  }

  window.Tooltips = { buildTooltipMap, attachTooltips, attachManualTooltips };
})();
