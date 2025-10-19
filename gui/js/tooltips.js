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
        ['Redis Docs', 'https://redis.io/docs/latest/']
      ]),
      REPO: L('Active Repository', 'Logical repository name for routing and indexing. MCP and CLI use this to scope retrieval.', [
        ['Docs: MCP Quickstart', '/docs/QUICKSTART_MCP.md']
      ]),
      COLLECTION_NAME: L('Collection Name', 'Optional override for the Qdrant collection name. Defaults to code_chunks_{REPO}. Set this if you maintain multiple profiles.', [
        ['Qdrant Docs: Collections', 'https://qdrant.tech/documentation/concepts/collections/']
      ]),
      COLLECTION_SUFFIX: L('Collection Suffix', 'Optional string appended to the default collection name for side-by-side comparisons.'),
      REPOS_FILE: L('Repos File', 'Path to repos.json that defines repo names, paths, keywords, path boosts, and layer bonuses used for routing.', [
        ['Local repos.json', '/files/repos.json']
      ]),
      REPO_PATH: L('Repo Path (fallback)', 'Absolute path to the active repo if repos.json is not available.'),
      OUT_DIR_BASE: L('Out Dir Base', 'Where retrieval looks for indices (chunks.jsonl, bm25_index/). Use ./out.noindex-shared for one index across branches so MCP and local tools stay in sync. Symptom of mismatch: rag_search returns 0 results.', [
        ['Docs: Shared Index', '/files/README.md']
      ], [['Requires restart (MCP)','info']]),
      RAG_OUT_BASE: L('RAG Out Base', 'Optional override for Out Dir Base; used by internal loaders if provided.'),
      MCP_HTTP_HOST: L('MCP HTTP Host', 'Bind address for the HTTP MCP server (fast transport). Use 0.0.0.0 to listen on all interfaces.', [
        ['Docs: Remote MCP', '/docs/REMOTE_MCP.md']
      ]),
      MCP_HTTP_PORT: L('MCP HTTP Port', 'TCP port for HTTP MCP server (default 8013).', [
        ['Docs: Remote MCP', '/docs/REMOTE_MCP.md']
      ]),
      MCP_HTTP_PATH: L('MCP HTTP Path', 'URL path for the HTTP MCP endpoint (default /mcp).', [
        ['Docs: Remote MCP', '/docs/REMOTE_MCP.md']
      ]),

      // Models / Providers
      GEN_MODEL: L('Generation Model', 'Answer model. Local: qwen3-coder:14b via Ollama. Cloud: gpt-4o-mini, etc. Larger models cost more and can be slower; smaller ones are faster/cheaper.', [
        ['OpenAI Models', 'https://platform.openai.com/docs/models'],
        ['Ollama API (GitHub)', 'https://github.com/ollama/ollama/blob/main/docs/api.md']
      ], [['Affects latency','info']]),
      OLLAMA_URL: L('Ollama URL', 'Local inference endpoint for Ollama (e.g., http://127.0.0.1:11434/api). Used when GEN_MODEL targets a local model.', [
        ['Ollama API (GitHub)', 'https://github.com/ollama/ollama/blob/main/docs/api.md']
      ]),
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
      VOYAGE_EMBED_DIM: L('Voyage Embed Dim', 'Embedding vector dimension when using Voyage embeddings (provider‑specific). Larger dims can improve recall but increase Qdrant storage.', [], [['Requires reindex','reindex']]),

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
      RERANKER_MODEL: L('Local Reranker (HF)', 'Name of local/HuggingFace reranker model when RERANK_BACKEND=local or hf.'),

      // Retrieval tuning
      MQ_REWRITES: L('Multi‑Query Rewrites', 'Rewrite the user query N times to broaden recall; then fuse + rerank. Start at 3–4; raise to 6 for “Where is X implemented?” questions.', [], [['Affects latency','info']]),
      TOPK_DENSE: L('Top‑K Dense', 'Vector hits before fusion. Higher = better recall, more latency. Typical 60–120; start at 75.', [], [['Affects latency','info']]),
      TOPK_SPARSE: L('Top‑K Sparse', 'BM25 hits before fusion. Higher = better recall, more latency. Typical 60–120; start at 75.', [
        ['BM25S (GitHub)', 'https://github.com/xhluca/bm25s']
      ], [['Affects latency','info']]),
      FINAL_K: L('Final Top‑K', 'Results returned after rerank and boosts. Typical 10; increase for browsing, decrease for speed.'),
      HYDRATION_MODE: L('Hydration Mode', 'Attach code bodies to results.\n• lazy — on‑demand (recommended)\n• none — skip hydration (lowest memory)'),
      HYDRATION_MAX_CHARS: L('Hydration Max Chars', 'Max characters of code to attach per result. Lower to reduce RAM usage.'),

      // Confidence
      CONF_TOP1: L('Confidence Top‑1', 'Minimum score to accept top‑1 directly. Recommended ~0.60–0.65. Lower = more answers, more risk.'),
      CONF_AVG5: L('Confidence Avg‑5', 'Average of top‑5; gate for rewriting loops. Recommended ~0.52–0.58.'),
      CONF_ANY: L('Confidence Any', 'Proceed if any candidate exceeds this score (fallback).'),

      // Netlify
      NETLIFY_API_KEY: L('Netlify API Key', 'Key for the netlify_deploy MCP tool to trigger builds.', [
        ['Netlify: Access Tokens', 'https://docs.netlify.com/api/get-started/#access-tokens']
      ]),
      NETLIFY_DOMAINS: L('Netlify Domains', 'Comma‑separated site domains you want to target with the netlify_deploy tool.'),

      // Misc
      THREAD_ID: L('Thread ID', 'Identifier for session state in LangGraph or CLI chat. Use a stable value to preserve memory across runs.', [
        ['CLI Chat Docs', '/docs/CLI_CHAT.md']
      ]),
      TRANSFORMERS_TRUST_REMOTE_CODE: L('Transformers: trust_remote_code', 'Set to true only if you understand the security implications of loading remote model code.', [
        ['Transformers: Security Notes', 'https://huggingface.co/docs/transformers/installation#security-notes']
      ]),
      LANGCHAIN_TRACING_V2: L('LangChain Tracing', 'Enable tracing with LangSmith (Tracing v2).', [
        ['LangSmith Docs', 'https://docs.smith.langchain.com/']
      ]),

      GEN_MODEL_HTTP: L('HTTP Channel Model', 'Override generation model when serving via HTTP channel only. Useful to separate prod vs. local dev.'),
      GEN_MODEL_MCP: L('MCP Channel Model', 'Override generation model when used by MCP tools only (e.g., choose a lighter model to reduce tool costs).'),
      GEN_MODEL_CLI: L('CLI Channel Model', 'Override generation model for the CLI chat only.'),
      NETLIFY_API_KEY: L('Netlify API Key', 'Token used by the netlify_deploy MCP tool to trigger builds.', [
        ['Netlify: Access Tokens', 'https://docs.netlify.com/api/get-started/#access-tokens']
      ]),

      // Additional providers
      ANTHROPIC_API_KEY: L('Anthropic API Key', 'API key for Anthropic models (Claude family).', [
        ['Anthropic: Getting Started', 'https://docs.anthropic.com/en/api/getting-started']
      ]),
      GOOGLE_API_KEY: L('Google API Key', 'API key for Google Gemini models and endpoints.', [
        ['Gemini: API Keys', 'https://ai.google.dev/gemini-api/docs/api-key']
      ]),
      OPENAI_BASE_URL: L('OpenAI Base URL', 'Override API base URL for OpenAI‑compatible endpoints (advanced).', [
        ['OpenAI Models', 'https://platform.openai.com/docs/models']
      ]),

      // Enrichment / Cards / Indexing
      ENRICH_BACKEND: L('Enrichment Backend', 'Backend used for optional code/context enrichment (e.g., MLX or local workflows).'),
      ENRICH_MODEL: L('Enrichment Model', 'Model used for enrichment when enabled (provider‑specific). Use a smaller local model for cost‑free summaries; cloud models improve quality.'),
      ENRICH_MODEL_OLLAMA: L('Enrichment Model (Ollama)', 'Specific Ollama model to use for enrichment if ENRICH_BACKEND targets Ollama.'),
      ENRICH_CODE_CHUNKS: L('Enrich Code Chunks', 'When enabled, stores per‑chunk summaries/keywords during indexing to support features like cards and improved reranking.', [
        ['Cards Builder (source)', '/files/indexer/build_cards.py']
      ]),
      CARDS_MAX: L('Cards Max', 'Maximum number of summary cards to consider when boosting retrieval results.', [
        ['Cards Builder (source)', '/files/indexer/build_cards.py']
      ]),
      SKIP_DENSE: L('Skip Dense Embeddings', 'When set, indexer skips dense embeddings/Qdrant upsert to build a fast BM25‑only index.'),
      VENDOR_MODE: L('Vendor Mode', 'Bias for first‑party vs vendor‑origin code in reranking. Options: prefer_first_party | prefer_vendor.'),
      EMBEDDING_DIM: L('Embedding Dimension', 'Vector length for MXBAI/local embeddings. Typical 384–768. Larger = better recall + larger Qdrant. Changing this requires full reindex.' , [], [['Requires reindex','reindex']]),
      PORT: L('HTTP Port', 'HTTP server port for the GUI/API when running serve_rag.'),
      AGRO_EDITION: L('Edition', 'Product edition flag (oss | pro | enterprise) to toggle advanced features in compatible deployments.'),
      PORT: L('HTTP Port', 'HTTP server port for serve_rag (GUI/API). Change if port 8012 is in use.'),

      // Repo editor (dynamic inputs)
      repo_path: L('Repository Path', 'Absolute path to a repository that should be indexed for this logical name.'),
      repo_keywords: L('Repository Keywords', 'Keywords that help route queries to this repository during retrieval. Add common terms users will ask for.'),
      repo_pathboosts: L('Path Boosts', 'Directory substrings that should be boosted in ranking for this repository (e.g., app/, api/, server/).'),
      repo_layerbonuses: L('Layer Bonuses', 'Per‑intent layer bonus map to tilt retrieval toward UI/server/integration code as needed.'),

      // Evaluation
      GOLDEN_PATH: L('Golden Questions Path', 'Path to your evaluation questions JSON (golden.json by default). Used by eval loop to measure retrieval quality.', [
        ['Eval Script', '/files/eval/eval_loop.py'], ['Docs Index', '/docs/README.md']
      ]),
      BASELINE_PATH: L('Baseline Path', 'Where eval loop saves baseline results for regression comparison.', [
        ['Eval Script', '/files/eval/eval_loop.py']
      ]),
      EVAL_MULTI: L('Eval Multi‑Query', 'Whether eval uses multi‑query expansion (1=yes, 0=no). Turning on improves recall; increases latency.'),
      EVAL_FINAL_K: L('Eval Final‑K', 'How many results eval considers as top‑K when scoring hits. Typical 5–10.'),

      // Repo‑specific env overrides (legacy)
      agro_PATH: L('agro PATH (legacy)', 'Legacy repo path override. Prefer REPO_PATH or repos.json configuration.' , [
        ['Local repos.json', '/files/repos.json']
      ]),
      agro_PATH_BOOSTS: L('agro Path Boosts (CSV)', 'Comma‑separated path substrings to boost ranking for the agro repo (e.g., app/,lib/,config/). Mirrors per‑repo Path Boosts.'),
      LANGCHAIN_agro: L('LangChain (agro)', 'Legacy/internal env key for tracing/metadata. Prefer LANGCHAIN_TRACING_V2 + project config.'),
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

  function attachTooltips(){
    const map = buildTooltipMap();
    const fields = document.querySelectorAll('[name]');
    fields.forEach((field) => {
      const name = field.getAttribute('name');
      const parent = field.closest('.input-group');
      if (!name || !parent) return;
      const label = parent.querySelector('label');
      if (!label) return;
      if (label.querySelector('.help-icon')) return;
      let key = name;
      if (name.startsWith('repo_')) {
        const type = name.split('_')[1];
        key = 'repo_' + type;
      }
      let html = map[key];
      if (!html) {
        html = `<span class=\"tt-title\">${name}</span><div>No detailed tooltip available yet. See our docs for related settings.</div><div class=\"tt-links\"><a href=\"/files/README.md\" target=\"_blank\" rel=\"noopener\">Main README</a> <a href=\"/docs/README.md\" target=\"_blank\" rel=\"noopener\">Docs Index</a></div>`;
      }
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
  }

  window.Tooltips = { buildTooltipMap, attachTooltips, attachManualTooltips };
})();
