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
      COLLECTION_SUFFIX: L(
        'Collection Suffix',
        'Optional string appended to the default collection name (code_chunks_{REPO}) for A/B testing different indexing strategies. For example, suffix "_v2" creates "code_chunks_myrepo_v2". Useful when comparing embedding models, chunking strategies, or reranking approaches without overwriting your production index. Leave empty for default collection.',
        [
          ['Qdrant Collections', 'https://qdrant.tech/documentation/concepts/collections/'],
          ['Collection Management', 'https://qdrant.tech/documentation/concepts/collections/#create-collection'],
          ['A/B Testing Indexes', '/docs/AB_TESTING_INDEXES.md']
        ],
        [['Experimental', 'warn']]
      ),
      REPOS_FILE: L('Repos File', 'Path to repos.json that defines repo names, paths, keywords, path boosts, and layer bonuses used for routing.', [
        ['Local repos.json', '/files/repos.json']
      ]),
      REPO_PATH: L(
        'Repo Path (fallback)',
        'Absolute filesystem path to the active repository when repos.json is not configured. This is the directory that will be indexed for code retrieval. Use repos.json instead for multi-repo setups with routing, keywords, and path boosts. Example: /Users/you/projects/myapp',
        [
          ['repos.json Format', '/files/repos.json'],
          ['Indexing Guide', '/docs/INDEXING.md'],
          ['File System Paths', 'https://en.wikipedia.org/wiki/Path_(computing)']
        ]
      ),
      OUT_DIR_BASE: L('Out Dir Base', 'Where retrieval looks for indices (chunks.jsonl, bm25_index/). Use ./out.noindex-shared for one index across branches so MCP and local tools stay in sync. Symptom of mismatch: rag_search returns 0 results.', [
        ['Docs: Shared Index', '/files/README.md']
      ], [['Requires restart (MCP)','info']]),
      RAG_OUT_BASE: L(
        'RAG Out Base',
        'Optional override for OUT_DIR_BASE setting. Advanced users can set this to use a different output directory for specific retrieval operations while keeping OUT_DIR_BASE for indexing. Most users should leave this empty and only configure OUT_DIR_BASE. Used internally by loader modules.',
        [
          ['Directory Structure', '/docs/DIRECTORY_STRUCTURE.md'],
          ['Advanced Configuration', '/docs/CONFIGURATION.md#advanced']
        ],
        [['Advanced', 'warn']]
      ),
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
      RERANKER_MODEL: L(
        'Local Reranker (HF)',
        'HuggingFace model name or path for local reranking when RERANK_BACKEND=local or hf. Common options: "cross-encoder/ms-marco-MiniLM-L-6-v2" (fast, good quality), "BAAI/bge-reranker-base" (higher quality, slower), or path to your fine-tuned model like "models/cross-encoder-agro". Local reranking is free but slower than Cohere. Ensure model is downloaded before use.',
        [
          ['Cross-Encoder Models', 'https://www.sbert.net/docs/cross_encoder/pretrained_models.html'],
          ['HuggingFace Model Hub', 'https://huggingface.co/models?pipeline_tag=text-classification&sort=downloads'],
          ['Local Reranker README', '/models/cross-encoder-agro.baseline/README.md'],
          ['Training Custom Reranker', '/docs/RERANKER.md#training']
        ],
        [['Free (no API costs)', 'info'], ['Requires download', 'warn']]
      ),

      // Reranker Inference (live search blending)
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

      // Learning Reranker — Training controls
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

      // Retrieval tuning
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
          ['Memory vs Performance', '/docs/PERFORMANCE.md#hydration'],
          ['chunks.jsonl Format', '/docs/INDEXING.md#chunks-format']
        ],
        [['Lazy Recommended', 'info']]
      ),
      HYDRATION_MAX_CHARS: L(
        'Hydration Max Chars',
        'Maximum characters to load per chunk when hydrating results with code content. Prevents huge chunks from bloating responses and consuming excessive memory. 0 = no limit (may cause memory issues with large files). Recommended: 2000 for general use, 1000 for memory-constrained environments, 5000 for detailed code review. Chunks larger than this limit are truncated.',
        [
          ['Text Truncation', 'https://en.wikipedia.org/wiki/Truncation'],
          ['Memory Management', '/docs/PERFORMANCE.md#memory-optimization'],
          ['Chunk Size Tuning', '/docs/INDEXING.md#chunk-size']
        ],
        [['Performance', 'info']]
      ),

      // Confidence
      CONF_TOP1: L(
        'Confidence Top‑1',
        'Minimum confidence score (0.0-1.0) required to accept the top-1 result without further processing. If the best result scores above this threshold, it\'s returned immediately. Lower values (0.55-0.60) produce more answers but risk lower quality. Higher values (0.65-0.70) ensure precision but may trigger unnecessary query rewrites. Recommended: 0.60-0.65 for balanced precision/recall.',
        [
          ['Confidence Thresholds', 'https://en.wikipedia.org/wiki/Confidence_interval'],
          ['Precision-Recall Tradeoff', 'https://developers.google.com/machine-learning/crash-course/classification/precision-and-recall'],
          ['Score Calibration', '/docs/RETRIEVAL.md#confidence-scoring']
        ],
        [['Affects answer rate', 'info']]
      ),
      CONF_AVG5: L(
        'Confidence Avg‑5',
        'Average confidence score of the top-5 results, used as a gate for query rewriting iterations. If avg(top-5) is below this threshold, the system may rewrite the query and try again. Lower values (0.50-0.53) reduce retries, accepting more borderline results. Higher values (0.56-0.60) force more rewrites for higher quality. Recommended: 0.52-0.58 for balanced behavior.',
        [
          ['Iterative Refinement', 'https://en.wikipedia.org/wiki/Iterative_refinement'],
          ['Query Reformulation', 'https://en.wikipedia.org/wiki/Query_reformulation'],
          ['Confidence Scoring', '/docs/RETRIEVAL.md#confidence-thresholds']
        ],
        [['Controls retries', 'warn']]
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
      NETLIFY_API_KEY: L('Netlify API Key', 'Key for the netlify_deploy MCP tool to trigger builds.', [
        ['Netlify: Access Tokens', 'https://docs.netlify.com/api/get-started/#access-tokens']
      ]),
      NETLIFY_DOMAINS: L(
        'Netlify Domains',
        'Comma-separated list of Netlify site domains for the netlify_deploy MCP tool (e.g., "mysite.netlify.app,docs.mysite.com"). When deploying, the tool targets these specific sites. Find your site domains in Netlify dashboard under Site Settings > Domain Management. Multiple domains allow you to deploy to staging and production from the same config.',
        [
          ['Netlify Sites', 'https://docs.netlify.com/domains-https/custom-domains/'],
          ['MCP Tool Usage', '/docs/MCP_TOOLS.md#netlify-deploy'],
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
          ['Channel Overrides', '/docs/CHANNEL_ROUTING.md'],
          ['Model Selection', 'https://platform.openai.com/docs/models'],
          ['Cost Optimization', '/docs/COST_OPTIMIZATION.md']
        ],
        [['Channel-specific', 'info']]
      ),
      GEN_MODEL_MCP: L(
        'MCP Channel Model',
        'Override GEN_MODEL for MCP tool invocations only. Use a lighter/cheaper model for MCP tools since tool calls are typically simpler than complex reasoning. Example: gpt-4o-mini for MCP, gpt-4o for main chat. Reduces costs when tools are called frequently (search, file operations, etc.). If not set, uses GEN_MODEL.',
        [
          ['MCP Tools', '/docs/MCP_TOOLS.md'],
          ['Channel Routing', '/docs/CHANNEL_ROUTING.md'],
          ['Model Pricing', 'https://openai.com/api/pricing/']
        ],
        [['Cost savings', 'info'], ['Channel-specific', 'info']]
      ),
      GEN_MODEL_CLI: L(
        'CLI Channel Model',
        'Override GEN_MODEL for CLI chat sessions only. Allows using different models for terminal vs web interface - e.g., faster models for CLI iteration, higher quality for production GUI. Useful for developer workflows where CLI is for quick testing and HTTP is for end users. If not set, uses GEN_MODEL.',
        [
          ['CLI Chat', '/docs/CLI_CHAT.md'],
          ['Channel Overrides', '/docs/CHANNEL_ROUTING.md'],
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
          ['Cards Builder Source', '/files/indexer/build_cards.py'],
          ['Enrichment Guide', '/docs/ENRICHMENT.md']
        ],
        [['Better retrieval', 'info'], ['Slower indexing', 'warn'], ['Costs API calls', 'warn']]
      ),
      CARDS_MAX: L(
        'Cards Max',
        'Maximum number of summary cards to load and consider during retrieval for score boosting. Cards are high-level summaries of code modules/features. Lower values (10-20) are faster but may miss relevant modules. Higher values (30-50) provide better coverage but increase memory and latency. Set to 0 to disable cards entirely. Recommended: 20-30 for balanced performance.',
        [
          ['Cards Feature Overview', '/docs/CARDS.md'],
          ['Cards Builder Source', '/files/indexer/build_cards.py'],
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
          ['repos.json Format', '/files/repos.json'],
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
          ['repos.json Examples', '/files/repos.json']
        ],
        [['Multi-repo only', 'info']]
      ),
      repo_pathboosts: L(
        'Path Boosts',
        'Comma-separated directory path substrings to boost in search rankings for this repo. Examples: "src/,app/,lib/" boosts code in those directories. Use this to prioritize your main application code over tests, docs, or vendor code. Partial matches work - "api/" matches "src/api/", "backend/api/", etc. Boosts are applied during reranking.',
        [
          ['Score Boosting', '/docs/RETRIEVAL.md#path-boosting'],
          ['repos.json Config', '/files/repos.json'],
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
          ['Eval Script Source', '/files/eval/eval_loop.py'],
          ['Creating Golden Sets', '/docs/EVALUATION.md#creating-golden-questions'],
          ['Evaluation Metrics', 'https://en.wikipedia.org/wiki/Evaluation_measures_(information_retrieval)']
        ]
      ),
      BASELINE_PATH: L(
        'Baseline Path',
        'Directory where evaluation loop saves baseline results for regression testing and A/B comparison. Each eval run\'s metrics (Hit@K, MRR, latency) are stored here with timestamps. Use this to ensure retrieval quality doesn\'t regress after configuration changes, reindexing, or model upgrades. Compare current run against baseline to detect improvements or degradations.',
        [
          ['Baseline Testing', '/docs/EVALUATION.md#baseline-comparison'],
          ['Eval Script Source', '/files/eval/eval_loop.py'],
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

      // Repo‑specific env overrides (legacy)
      agro_PATH: L(
        'agro PATH (legacy)',
        'DEPRECATED: Legacy environment variable for setting the agro repository path. This is repo-specific and only works for a repo named "agro". Modern approach: use REPO_PATH for single repos or configure repos.json for multi-repo setups with proper routing. Kept for backwards compatibility - will be removed in future versions.',
        [
          ['repos.json Format', '/files/repos.json'],
          ['Migration Guide', '/docs/MIGRATION.md#legacy-env-vars'],
          ['REPO_PATH Setting', '/docs/CONFIGURATION.md#repo-path']
        ],
        [['Deprecated', 'warn'], ['Use repos.json instead', 'warn']]
      ),
      agro_PATH_BOOSTS: L(
        'agro Path Boosts (CSV)',
        'DEPRECATED: Legacy comma-separated path boosts for the "agro" repository only (e.g., "app/,lib/,config/"). Repo-specific environment variables like this don\'t scale for multi-repo setups. Modern approach: configure path boosts in repos.json per-repo settings. Kept for backwards compatibility.',
        [
          ['repos.json Path Boosts', '/files/repos.json'],
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

    // Attach training control tooltips by id (React inputs don’t always use name=)
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
      let html = map[key];
      if (!html) return;
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
