// Imported from /gui/index.html - contains all config parameters
// This component uses dangerouslySetInnerHTML to render the exact HTML from /gui

export function RetrievalSubtab() {
  const htmlContent = `                    <!-- Generation Models Section -->
                    <div class="settings-section">
                        <h3>Generation Models</h3>
                        <button class="small-button" id="btn-add-gen-model" style="margin-bottom:12px;">Add Model</button>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                Primary Model (GEN_MODEL)
                                <span class="help-icon" data-tooltip="GEN_MODEL">?</span>
                            </label>
                                <select name="GEN_MODEL" id="gen-model-select" class="model-select" data-component-filter="GEN">
                                    <option value="">Select a model...</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>
                                OpenAI API Key
                                <span class="help-icon" data-tooltip="OPENAI_API_KEY">?</span>
                            </label>
                                <input type="password" name="OPENAI_API_KEY">
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Default Temperature (GEN_TEMPERATURE)
                                    <span class="tooltip-wrap">
                                        <span class="help-icon">?</span>
                                        <div class="tooltip-bubble">
                                            <span class="tt-title">Default Response Creativity</span>
                                            Sets a global default temperature for generation. 0.0 = deterministic; try 0.2 sometimes, or 0.04 for light variation in docs.
                                        </div>
                                    </span>
                                </label>
                                <input type="number" name="GEN_TEMPERATURE" value="0.0" min="0" max="2" step="0.01">
                            </div>
                        </div>
                        <div class="input-row">
                        <div class="input-group">
                            <label>
                                Enrich Model (ENRICH_MODEL)
                                <span class="help-icon" data-tooltip="ENRICH_MODEL">?</span>
                            </label>
                            <select name="ENRICH_MODEL" id="enrich-model-select" class="model-select" data-component-filter="GEN">
                                <option value="">Select a model...</option>
                            </select>
                        </div>
                            <div class="input-group">
                                <label>
                                Enrich Model (Ollama)
                                <span class="help-icon" data-tooltip="ENRICH_MODEL_OLLAMA">?</span>
                            </label>
                                <select name="ENRICH_MODEL_OLLAMA" id="enrich-model-ollama-select" class="model-select">
                                    <option value="">Select a model...</option>
                                </select>
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                Anthropic API Key
                                <span class="help-icon" data-tooltip="ANTHROPIC_API_KEY">?</span>
                            </label>
                                <input type="password" name="ANTHROPIC_API_KEY">
                            </div>
                            <div class="input-group">
                                <label>
                                Google API Key
                                <span class="help-icon" data-tooltip="GOOGLE_API_KEY">?</span>
                            </label>
                                <input type="password" name="GOOGLE_API_KEY">
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                Ollama URL
                                <span class="help-icon" data-tooltip="OLLAMA_URL">?</span>
                            </label>
                                <input type="text" name="OLLAMA_URL" placeholder="http://127.0.0.1:11434">
                            </div>
                            <div class="input-group">
                                <label>
                                OpenAI Base URL (optional)
                                <span class="help-icon" data-tooltip="OPENAI_BASE_URL">?</span>
                            </label>
                                <input type="text" name="OPENAI_BASE_URL" placeholder="For vLLM proxy">
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                HTTP Override Model
                                <span class="help-icon" data-tooltip="GEN_MODEL_HTTP">?</span>
                            </label>
                                <select name="GEN_MODEL_HTTP" id="http-override-model-select">
                                    <option value="">Select a model...</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>
                                MCP Override Model
                                <span class="help-icon" data-tooltip="GEN_MODEL_MCP">?</span>
                            </label>
                                <select name="GEN_MODEL_MCP" id="mcp-override-model-select">
                                    <option value="">Select a model...</option>
                                </select>
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                CLI Override Model
                                <span class="help-icon" data-tooltip="GEN_MODEL_CLI">?</span>
                            </label>
                                <select name="GEN_MODEL_CLI" id="cli-override-model-select">
                                    <option value="">Select a model...</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>
                                Enrich Backend
                                <span class="help-icon" data-tooltip="ENRICH_BACKEND">?</span>
                            </label>
                                <select name="ENRICH_BACKEND" id="enrich-backend-select">
                                    <option value="">Default</option>
                                    <option value="openai">OpenAI</option>
                                    <option value="anthropic">Anthropic</option>
                                    <option value="google">Google</option>
                                    <option value="cohere">Cohere</option>
                                    <option value="ollama">Ollama</option>
                                    <option value="local">Local</option>
                                    <option value="mlx">MLX (Apple)</option>
                                </select>
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Max Tokens
                                    <span class="help-icon" data-tooltip="GEN_MAX_TOKENS">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="GEN_MAX_TOKENS"
                                    name="GEN_MAX_TOKENS"
                                    value="2048"
                                    min="100"
                                    max="8192"
                                    step="128"
                                />
                            </div>
                            <div class="input-group">
                                <label>
                                    Top-P (Nucleus Sampling)
                                    <span class="help-icon" data-tooltip="GEN_TOP_P">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="GEN_TOP_P"
                                    name="GEN_TOP_P"
                                    value="1.0"
                                    min="0.0"
                                    max="1.0"
                                    step="0.05"
                                />
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Timeout (seconds)
                                    <span class="help-icon" data-tooltip="GEN_TIMEOUT">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="GEN_TIMEOUT"
                                    name="GEN_TIMEOUT"
                                    value="60"
                                    min="10"
                                    max="300"
                                    step="5"
                                />
                            </div>
                            <div class="input-group">
                                <label>
                                    Retry Max
                                    <span class="help-icon" data-tooltip="GEN_RETRY_MAX">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="GEN_RETRY_MAX"
                                    name="GEN_RETRY_MAX"
                                    value="2"
                                    min="1"
                                    max="5"
                                    step="1"
                                />
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Enrich Disabled
                                    <span class="help-icon" data-tooltip="ENRICH_DISABLED">?</span>
                                </label>
                                <select id="ENRICH_DISABLED" name="ENRICH_DISABLED">
                                    <option value="0">No (Enable Enrichment)</option>
                                    <option value="1">Yes (Disable Enrichment)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Keywords Parameters Section -->
                    <div class="settings-section">
                        <h3>Keywords Parameters</h3>
                        <p class="small">Discriminative keywords extraction and boosting configuration.</p>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Max Keywords Per Repo
                                    <span class="help-icon" data-tooltip="KEYWORDS_MAX_PER_REPO">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="KEYWORDS_MAX_PER_REPO"
                                    name="KEYWORDS_MAX_PER_REPO"
                                    value="50"
                                    min="10"
                                    max="500"
                                    step="10"
                                />
                            </div>
                            <div class="input-group">
                                <label>
                                    Min Frequency
                                    <span class="help-icon" data-tooltip="KEYWORDS_MIN_FREQ">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="KEYWORDS_MIN_FREQ"
                                    name="KEYWORDS_MIN_FREQ"
                                    value="3"
                                    min="1"
                                    max="10"
                                    step="1"
                                />
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Keywords Boost
                                    <span class="help-icon" data-tooltip="KEYWORDS_BOOST">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="KEYWORDS_BOOST"
                                    name="KEYWORDS_BOOST"
                                    value="1.3"
                                    min="1.0"
                                    max="3.0"
                                    step="0.1"
                                />
                            </div>
                            <div class="input-group">
                                <label>
                                    Auto-Generate Keywords
                                    <span class="help-icon" data-tooltip="KEYWORDS_AUTO_GENERATE">?</span>
                                </label>
                                <select id="KEYWORDS_AUTO_GENERATE" name="KEYWORDS_AUTO_GENERATE">
                                    <option value="1">Enabled</option>
                                    <option value="0">Disabled</option>
                                </select>
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Refresh Hours
                                    <span class="help-icon" data-tooltip="KEYWORDS_REFRESH_HOURS">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="KEYWORDS_REFRESH_HOURS"
                                    name="KEYWORDS_REFRESH_HOURS"
                                    value="24"
                                    min="1"
                                    max="168"
                                    step="1"
                                />
                            </div>
                        </div>
                    </div>

                    <!-- Retrieval Parameters Section -->
                    <div class="settings-section">
                        <h3>Retrieval Parameters</h3>
                        <p class="small">Hybrid search fuses sparse (BM25) + dense (vectors). These knobs tune candidate counts and hydration behavior.</p>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Multi-Query Rewrites
                                    <span class="tooltip-wrap">
                                        <span class="help-icon">?</span>
                                        <div class="tooltip-bubble">
                                            <span class="tt-title">Query Expansion via LLM Rewriting - Improved Recall</span>
                                            Number of query variations to automatically generate using the LLM. Each variation searches independently via hybrid search, results are merged and reranked together. Higher = better chance of finding relevant code but increases latency and API costs.
                                            <br><br>
                                            <strong>Example:</strong> Query "how do we handle payments?" might expand to:
                                            <br>- "payment processing implementation"
                                            <br>- "stripe integration"
                                            <br>- "checkout flow"
                                            <br><br>
                                            <strong>Tuning:</strong> 1-2 for speed, 3-4 for balanced, 5-6 for thorough but expensive searches.
                                            <br>Default: 2. Range: 1-6.
                                            <div class="tt-links">
                                                <a href="https://arxiv.org/abs/2305.14283" target="_blank" rel="noopener">Multi-Query RAG Paper</a>
                                                <a href="https://python.langchain.com/docs/how_to/MultiQueryRetriever/" target="_blank" rel="noopener">LangChain Implementation</a>
                                                <a href="/docs/RETRIEVAL.md#multi-query" target="_blank" rel="noopener">Multi-Query Tuning Guide</a>
                                            </div>
                                            <div class="tt-badges">
                                                <span class="tt-badge info">Better Recall</span>
                                                <span class="tt-badge warn">Higher Cost</span>
                                                <span class="tt-badge warn">Higher Latency</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input type="number" name="MQ_REWRITES" value="2" min="1">
                            </div>
                            <div class="input-group">
                                <label>
                                    Final K
                                    <span class="tooltip-wrap">
                                        <span class="help-icon">?</span>
                                        <div class="tooltip-bubble">
                                            <span class="tt-title">Final Results Count</span>
                                            Number of top results to return after fusion and reranking. This is what you get back from search. Higher = more context but more noise. Default: 10. Range: 5-30.
                                            <div class="tt-badges">
                                                <span class="tt-badge info">Core Setting</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input type="number" name="FINAL_K" value="10" min="1">
                            </div>
                            <div class="input-group">
                                <label>
                                    Use Semantic Synonyms
                                    <span class="tooltip-wrap">
                                        <span class="help-icon">?</span>
                                        <div class="tooltip-bubble">
                                            <span class="tt-title">Query Expansion via Synonym Replacement - Domain Terminology</span>
                                            Expands user queries with hand-curated semantic synonyms to handle domain-specific terminology and abbreviations. Example: "auth" expands to "auth authentication oauth jwt bearer token login".
                                            <br><br>
                                            <strong>Purpose:</strong> Handles acronyms and domain synonyms that LLM rewriting might miss. E.g., "JWT" might not rewrite to "json web token".
                                            <br><strong>Configuration:</strong> Edit data/semantic_synonyms.json to add domain-specific synonym mappings for your codebase.
                                            <br><strong>Note:</strong> Different from Multi-Query Rewrites - this uses pre-defined synonyms, not LLM-generated variations.
                                            <br>Default: ON (enabled).
                                            <div class="tt-links">
                                                <a href="/files/data/semantic_synonyms.json" target="_blank" rel="noopener">Synonym Config File</a>
                                                <a href="/docs/RETRIEVAL.md#synonyms" target="_blank" rel="noopener">Synonym Setup Guide</a>
                                                <a href="/docs/DOMAIN_CUSTOMIZATION.md" target="_blank" rel="noopener">Domain Terminology</a>
                                            </div>
                                            <div class="tt-badges">
                                                <span class="tt-badge info">Better Recall</span>
                                                <span class="tt-badge">No Re-index</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <select name="USE_SEMANTIC_SYNONYMS">
                                    <option value="1">ON</option>
                                    <option value="0">OFF</option>
                                </select>
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Top-K Dense (Qdrant)
                                    <span class="tooltip-wrap">
                                        <span class="help-icon">?</span>
                                        <div class="tooltip-bubble">
                                            <span class="tt-title">Dense Vector Candidates</span>
                                            Number of candidates to retrieve from Qdrant vector search before fusion. Higher = better recall for semantic matches but slower. Should be >= Final K. Default: 75. Range: 20-200.
                                            <div class="tt-badges">
                                                <span class="tt-badge info">Semantic Search</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input type="number" name="TOPK_DENSE" value="75" min="1">
                            </div>
                            <div class="input-group">
                                <label>
                                Vector Backend
                                <span class="help-icon" data-tooltip="VECTOR_BACKEND">?</span>
                            </label>
                                <select name="VECTOR_BACKEND">
                                    <option value="qdrant">Qdrant</option>
                                    <option value="faiss">FAISS (experimental)</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>
                                    Top-K Sparse (BM25)
                                    <span class="tooltip-wrap">
                                        <span class="help-icon">?</span>
                                        <div class="tooltip-bubble">
                                            <span class="tt-title">Sparse BM25 Candidates</span>
                                            Number of candidates to retrieve from BM25 keyword search before fusion. Higher = better recall for exact matches but slower. Should be >= Final K. Default: 75. Range: 20-200.
                                            <div class="tt-badges">
                                                <span class="tt-badge info">Keyword Search</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input type="number" name="TOPK_SPARSE" value="75" min="1">
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Hydration Mode
                                    <span class="tooltip-wrap">
                                        <span class="help-icon">?</span>
                                        <div class="tooltip-bubble">
                                            <span class="tt-title">Code Loading Strategy</span>
                                            Controls when full code is loaded. "Lazy" loads code from chunks.jsonl after retrieval. "None" only returns metadata (file path, line numbers). Lazy is recommended. None is faster but returns no code.
                                            <div class="tt-badges">
                                                <span class="tt-badge">Lazy Recommended</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <select name="HYDRATION_MODE">
                                    <option value="lazy">Lazy</option>
                                    <option value="none">None</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>
                                    Hydration Max Chars
                                    <span class="tooltip-wrap">
                                        <span class="help-icon">?</span>
                                        <div class="tooltip-bubble">
                                            <span class="tt-title">Code Truncation Limit</span>
                                            Maximum characters to load per chunk when hydrating. Prevents huge chunks from bloating responses. 0 = no limit. Default: 2000. Range: 500-5000.
                                            <div class="tt-badges">
                                                <span class="tt-badge">Performance</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input type="number" name="HYDRATION_MAX_CHARS" value="2000">
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Vendor Mode
                                    <span class="tooltip-wrap">
                                        <span class="help-icon">?</span>
                                        <div class="tooltip-bubble">
                                            <span class="tt-title">First-Party vs Vendor Code</span>
                                            Controls scoring bonus for first-party vs vendor code. "Prefer First Party" boosts your code (+0.06) and penalizes vendor libs (-0.08). "Prefer Vendor" boosts vendor code. Most use cases prefer first party.
                                            <div class="tt-badges">
                                                <span class="tt-badge info">Code Priority</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <select name="VENDOR_MODE">
                                    <option value="prefer_first_party">Prefer First Party</option>
                                    <option value="prefer_vendor">Prefer Vendor</option>
                                </select>
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    BM25 Weight
                                    <span class="help-icon" data-tooltip="BM25_WEIGHT">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="BM25_WEIGHT"
                                    name="BM25_WEIGHT"
                                    value="0.3"
                                    min="0.0"
                                    max="1.0"
                                    step="0.1"
                                />
                            </div>
                            <div class="input-group">
                                <label>
                                    Vector Weight
                                    <span class="help-icon" data-tooltip="VECTOR_WEIGHT">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="VECTOR_WEIGHT"
                                    name="VECTOR_WEIGHT"
                                    value="0.7"
                                    min="0.0"
                                    max="1.0"
                                    step="0.1"
                                />
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Card Search Enabled
                                    <span class="help-icon" data-tooltip="CARD_SEARCH_ENABLED">?</span>
                                </label>
                                <select id="CARD_SEARCH_ENABLED" name="CARD_SEARCH_ENABLED">
                                    <option value="1">Enabled</option>
                                    <option value="0">Disabled</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>
                                    Multi-Query M
                                    <span class="help-icon" data-tooltip="MULTI_QUERY_M">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="MULTI_QUERY_M"
                                    name="MULTI_QUERY_M"
                                    value="4"
                                    min="1"
                                    max="10"
                                    step="1"
                                />
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Confidence Top-1 Threshold
                                    <span class="help-icon" data-tooltip="CONF_TOP1">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="CONF_TOP1"
                                    name="CONF_TOP1"
                                    value="0.62"
                                    min="0.0"
                                    max="1.0"
                                    step="0.01"
                                />
                            </div>
                            <div class="input-group">
                                <label>
                                    Confidence Avg-5 Threshold
                                    <span class="help-icon" data-tooltip="CONF_AVG5">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="CONF_AVG5"
                                    name="CONF_AVG5"
                                    value="0.55"
                                    min="0.0"
                                    max="1.0"
                                    step="0.01"
                                />
                            </div>
                        </div>
                    </div>

                    <!-- Advanced RAG Tuning -->
                    <div class="settings-section" style="border-left: 3px solid var(--warn);">
                        <h3>
                            <span class="accent-orange">●</span> Advanced RAG Tuning
                            <span class="tooltip-wrap">
                                <span class="help-icon">?</span>
                                <div class="tooltip-bubble">
                                    <span class="tt-title">Advanced Parameters</span>
                                    Fine-tune scoring, fusion, and iteration behavior. These parameters significantly affect retrieval quality and performance. Only modify if you understand the implications.
                                    <div class="tt-badges">
                                        <span class="tt-badge warn">Expert Only</span>
                                        <span class="tt-badge">No Re-index</span>
                                    </div>
                                </div>
                            </span>
                        </h3>
                        <p class="small">Expert-level controls for fusion weighting, score bonuses, and LangGraph iteration behavior. Changes take effect immediately without re-indexing.</p>

                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    RRF K Divisor
                                    <span class="tooltip-wrap">
                                        <span class="help-icon">?</span>
                                        <div class="tooltip-bubble">
                                            <span class="tt-title">Reciprocal Rank Fusion (RRF) - Hybrid Search Weighting</span>
                                            Controls how hybrid search combines BM25 (keyword) and vector (semantic) results using the RRF algorithm. Formula: score += 1/(K + rank). Lower K = BM25 and vector have more equal weight. Higher K = only top results matter equally.
                                            <br><br>
                                            <strong>Examples:</strong> K=30 (favor top results, aggressive fusion), K=60 (balanced, recommended), K=100 (flatten ranking, lenient fusion)
                                            <br><strong>Tuning:</strong> Lower if keywords and semantics compete; higher if you want diversity.
                                            <br>Default: 60. Range: 10-100.
                                            <div class="tt-links">
                                                <a href="https://en.wikipedia.org/wiki/Reciprocal_rank_fusion" target="_blank" rel="noopener">RRF Algorithm</a>
                                                <a href="https://www.pinecone.io/learn/hybrid-search-intro/" target="_blank" rel="noopener">Hybrid Search Explained</a>
                                                <a href="/docs/RETRIEVAL.md#rrf-fusion" target="_blank" rel="noopener">RRF Tuning Guide</a>
                                            </div>
                                            <div class="tt-badges">
                                                <span class="tt-badge info">Affects Fusion</span>
                                                <span class="tt-badge">No Re-index</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input type="number" name="RRF_K_DIV" value="60" min="10" max="100" step="5">
                            </div>
                            <div class="input-group">
                                <label>
                                    Card Bonus
                                    <span class="tooltip-wrap">
                                        <span class="help-icon">?</span>
                                        <div class="tooltip-bubble">
                                            <span class="tt-title">Card Semantic Summary Bonus - Intent-Based Retrieval</span>
                                            Score boost applied to chunks when matching against AI-generated code card summaries (not raw code). Cards are semantic summaries of code modules/features created by ENRICH_CODE_CHUNKS. Enables "where is auth handled?" to find auth modules even if code contains different keywords.
                                            <br><br>
                                            <strong>Use Case:</strong> Improving conceptual queries by matching against high-level summaries. Raises the score when a card matches, prioritizing that chunk.
                                            <br><strong>Tuning:</strong> Increase (0.12-0.15) if cards are finding relevant code; decrease (0.04-0.06) if cards cause noise.
                                            <br>Default: 0.08. Range: 0.0-0.2.
                                            <div class="tt-links">
                                                <a href="/docs/CARDS.md" target="_blank" rel="noopener">Cards Feature</a>
                                                <a href="/files/indexer/build_cards.py" target="_blank" rel="noopener">Cards Builder Source</a>
                                                <a href="/docs/RETRIEVAL.md#card-scoring" target="_blank" rel="noopener">Card Scoring Logic</a>
                                            </div>
                                            <div class="tt-badges">
                                                <span class="tt-badge info">Improves Intent</span>
                                                <span class="tt-badge">Requires ENRICH_CODE_CHUNKS</span>
                                                <span class="tt-badge">No Re-index</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input type="number" name="CARD_BONUS" value="0.08" min="0" max="0.2" step="0.01">
                            </div>
                        </div>

                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Filename Boost (Exact Match)
                                    <span class="tooltip-wrap">
                                        <span class="help-icon">?</span>
                                        <div class="tooltip-bubble">
                                            <span class="tt-title">Filename Exact Match Score Multiplier - File-Specific Queries</span>
                                            Score multiplier (not additive) applied when query terms match the filename EXACTLY. Example: query "auth.py" matching file "auth.py" gets multiplied by 1.5x.
                                            <br><br>
                                            <strong>Purpose:</strong> Users often ask "find file X.py" - this boost rewards exact filename matches, improving precision for file-specific questions.
                                            <br><strong>Tuning:</strong> Increase (2.0+) to strongly prefer exact filename matches; decrease (1.2) if boost causes over-matching.
                                            <br>Default: 1.5. Range: 1.0-3.0.
                                            <div class="tt-links">
                                                <a href="/docs/RETRIEVAL.md#path-scoring" target="_blank" rel="noopener">Path Scoring Rules</a>
                                                <a href="/docs/RETRIEVAL.md#tuning-multipliers" target="_blank" rel="noopener">Tuning Score Multipliers</a>
                                            </div>
                                            <div class="tt-badges">
                                                <span class="tt-badge info">Precision Boost</span>
                                                <span class="tt-badge">No Re-index</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input type="number" name="FILENAME_BOOST_EXACT" value="1.5" min="1.0" max="3.0" step="0.1">
                            </div>
                            <div class="input-group">
                                <label>
                                    Filename Boost (Partial Match)
                                    <span class="tooltip-wrap">
                                        <span class="help-icon">?</span>
                                        <div class="tooltip-bubble">
                                            <span class="tt-title">Path Component Partial Match Score Multiplier - Directory Path Bonus</span>
                                            Score multiplier applied when query terms match ANY component of the file path (directories or partial filename). Example: query "auth" matching "src/auth/oauth.py" or "routes/authentication.ts" gets multiplied by 1.2x.
                                            <br><br>
                                            <strong>Purpose:</strong> Improves recall by rewarding hits in relevant directories. Users ask "where is auth handled?" and this finds files in "auth/" or "authentication/" dirs.
                                            <br><strong>Tuning:</strong> Increase (1.5+) for stronger directory matching; decrease (1.05) if path matches create noise.
                                            <br><strong>Difference from Exact:</strong> Partial matches ANY path component (dir name, filename prefix); Exact requires full filename match.
                                            <br>Default: 1.2. Range: 1.0-2.0.
                                            <div class="tt-links">
                                                <a href="/docs/RETRIEVAL.md#path-scoring" target="_blank" rel="noopener">Path Scoring Rules</a>
                                                <a href="/docs/RETRIEVAL.md#precision-vs-recall" target="_blank" rel="noopener">Precision vs Recall Tuning</a>
                                            </div>
                                            <div class="tt-badges">
                                                <span class="tt-badge info">Recall Boost</span>
                                                <span class="tt-badge">No Re-index</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input type="number" name="FILENAME_BOOST_PARTIAL" value="1.2" min="1.0" max="2.0" step="0.1">
                            </div>
                        </div>

                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    LangGraph Final K
                                    <span class="tooltip-wrap">
                                        <span class="help-icon">?</span>
                                        <div class="tooltip-bubble">
                                            <span class="tt-title">LangGraph Document Count</span>
                                            Number of documents retrieved for LangGraph RAG pipeline (used by /answer endpoint). Higher = more context but slower + costlier. Separate from retrieval Final K. Default: 20. Range: 5-50.
                                            <div class="tt-badges">
                                                <span class="tt-badge info">Context Window</span>
                                                <span class="tt-badge warn">Higher Cost</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input type="number" name="LANGGRAPH_FINAL_K" value="20" min="5" max="50" step="1">
                            </div>
                            <div class="input-group">
                                <label>
                                    Max Query Rewrites
                                    <span class="tooltip-wrap">
                                        <span class="help-icon">?</span>
                                        <div class="tooltip-bubble">
                                            <span class="tt-title">Iteration Limit</span>
                                            Maximum number of query rewrite iterations in LangGraph when confidence is low. Each iteration generates a new query variant and retrieves again. Default: 3. Range: 1-5.
                                            <div class="tt-badges">
                                                <span class="tt-badge info">Adaptive Search</span>
                                                <span class="tt-badge warn">Higher Latency</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input type="number" name="MAX_QUERY_REWRITES" value="3" min="1" max="5" step="1">
                            </div>
                        </div>

                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Fallback Confidence Threshold
                                    <span class="tooltip-wrap">
                                        <span class="help-icon">?</span>
                                        <div class="tooltip-bubble">
                                            <span class="tt-title">Low-Confidence Fallback</span>
                                            When initial retrieval confidence is below this threshold, triggers a fallback multi-query search with expanded parameters. Lower = more aggressive fallback. Default: 0.55. Range: 0.3-0.8.
                                            <div class="tt-badges">
                                                <span class="tt-badge info">Recall Safety Net</span>
                                                <span class="tt-badge warn">Extra API Calls</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input type="number" name="FALLBACK_CONFIDENCE" value="0.55" min="0.3" max="0.8" step="0.05">
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Layer Bonus (GUI)
                                    <span class="help-icon" data-tooltip="LAYER_BONUS_GUI">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="LAYER_BONUS_GUI"
                                    name="LAYER_BONUS_GUI"
                                    value="0.15"
                                    min="0.0"
                                    max="0.5"
                                    step="0.05"
                                />
                            </div>
                            <div class="input-group">
                                <label>
                                    Layer Bonus (Retrieval)
                                    <span class="help-icon" data-tooltip="LAYER_BONUS_RETRIEVAL">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="LAYER_BONUS_RETRIEVAL"
                                    name="LAYER_BONUS_RETRIEVAL"
                                    value="0.15"
                                    min="0.0"
                                    max="0.5"
                                    step="0.05"
                                />
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Vendor Penalty
                                    <span class="help-icon" data-tooltip="VENDOR_PENALTY">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="VENDOR_PENALTY"
                                    name="VENDOR_PENALTY"
                                    value="-0.1"
                                    min="-0.5"
                                    max="0.0"
                                    step="0.05"
                                />
                            </div>
                            <div class="input-group">
                                <label>
                                    Freshness Bonus
                                    <span class="help-icon" data-tooltip="FRESHNESS_BONUS">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="FRESHNESS_BONUS"
                                    name="FRESHNESS_BONUS"
                                    value="0.05"
                                    min="0.0"
                                    max="0.3"
                                    step="0.05"
                                />
                            </div>
                        </div>
                    </div>

                    <!-- Routing Trace Section -->
                    <div class="settings-section" style="margin-top:16px; border-left:3px solid var(--link);">
                        <h3>Routing Trace</h3>
                        <div class="input-row">
                            <div class="input-group">
                                <label>Load Latest Trace</label>
                                <button class="small-button" id="btn-trace-latest">Open</button>
                            </div>
                            <div class="input-group">
                                <label>Open in LangSmith</label>
                                <button class="small-button" id="btn-trace-open-ls">Open</button>
                            </div>
                            <div class="input-group">
                                <label>
                                Tracing Mode
                                <span class="help-icon" data-tooltip="TRACING_MODE">?</span>
                            </label>
                                <select name="TRACING_MODE">
                                    <option value="off">Off</option>
                                    <option value="local">Local</option>
                                    <option value="langsmith">LangSmith</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>
                                Auto-open in LangSmith
                                <span class="help-icon" data-tooltip="TRACE_AUTO_LS">?</span>
                            </label>
                                <select name="TRACE_AUTO_LS">
                                    <option value="0">No</option>
                                    <option value="1">Yes</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>
                                Trace Retention
                                <span class="help-icon" data-tooltip="TRACE_RETENTION">?</span>
                            </label>
                                <input type="number" name="TRACE_RETENTION" value="50" min="1" max="500">
                            </div>
                        </div>

                        <!-- LangSmith / LangChain Tracing Settings -->
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                LangChain Tracing V2 (LANGCHAIN_TRACING_V2)
                                <span class="help-icon" data-tooltip="LANGCHAIN_TRACING_V2">?</span>
                            </label>
                                <select name="LANGCHAIN_TRACING_V2">
                                    <option value="0">Off</option>
                                    <option value="1">On</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>
                                LangSmith Endpoint (LANGCHAIN_ENDPOINT)
                                <span class="help-icon" data-tooltip="LANGCHAIN_ENDPOINT">?</span>
                            </label>
                                <input type="text" name="LANGCHAIN_ENDPOINT" placeholder="https://api.smith.langchain.com">
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                LangSmith API Key (LANGCHAIN_API_KEY)
                                <span class="help-icon" data-tooltip="LANGCHAIN_API_KEY">?</span>
                            </label>
                                <input type="password" name="LANGCHAIN_API_KEY" placeholder="sk-...">
                            </div>
                            <div class="input-group">
                                <label>
                                LangSmith API Key (alias) (LANGSMITH_API_KEY)
                                <span class="help-icon" data-tooltip="LANGSMITH_API_KEY">?</span>
                            </label>
                                <input type="password" name="LANGSMITH_API_KEY" placeholder="ls_...">
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                LangSmith Project (LANGCHAIN_PROJECT)
                                <span class="help-icon" data-tooltip="LANGCHAIN_PROJECT">?</span>
                            </label>
                                <input type="text" name="LANGCHAIN_PROJECT" placeholder="agro">
                            </div>
                        </div>

                        <!-- LangTrace Settings -->
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                LangTrace API Host (LANGTRACE_API_HOST)
                                <span class="help-icon" data-tooltip="LANGTRACE_API_HOST">?</span>
                            </label>
                                <input type="text" name="LANGTRACE_API_HOST" placeholder="https://app.langtrace.ai/project/.../traces">
                            </div>
                            <div class="input-group">
                                <label>
                                LangTrace Project ID (LANGTRACE_PROJECT_ID)
                                <span class="help-icon" data-tooltip="LANGTRACE_PROJECT_ID">?</span>
                            </label>
                                <input type="text" name="LANGTRACE_PROJECT_ID" placeholder="cmg...">
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group full-width">
                                <label>
                                LangTrace API Key (LANGTRACE_API_KEY)
                                <span class="help-icon" data-tooltip="LANGTRACE_API_KEY">?</span>
                            </label>
                                <input type="password" name="LANGTRACE_API_KEY" placeholder="...">
                            </div>
                        </div>

                        <div id="trace-output" class="result-display" style="min-height:120px;white-space:pre-wrap"></div>
                    </div>
                </div>

`;
  
  return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
}
