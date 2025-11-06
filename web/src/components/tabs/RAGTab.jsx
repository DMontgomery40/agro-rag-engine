export default function RAGTab() {
  return (
    <>
{/* RAG Subtab: Data Quality */}
                <div id="tab-rag-data-quality" className="rag-subtab-content active">
                    {/* Repository Configuration */}
                    <div className="settings-section">
                        <h3>Repository Configuration</h3>
                        <div id="repos-section"></div>
                    </div>

                    {/* Cards Builder & Viewer */}
                    <div className="settings-section" style={{borderLeft: '3px solid var(--accent)'}}>
                        <h3>
                            <span className="accent-green">●</span> Code Cards Builder & Viewer
                            <span className="tooltip-wrap">
                                <span className="help-icon">?</span>
                                <div className="tooltip-bubble">
                                    <span className="tt-title">Code Cards</span>
                                    High-level semantic summaries of code chunks for faster retrieval with AI-powered enrichment and filtering.
                                </div>
                            </span>
                        </h3>

                        {/* Repository Selection */}
                        <div className="input-row" style={{marginBottom: '12px'}}>
                            <div className="input-group">
                                <label>Repository to Build Cards For</label>
                                <select id="cards-repo-select" style={{width: '100%'}}>
                                    <option value="">Loading...</option>
                                </select>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="input-row" style={{marginBottom: '12px'}}>
                            <div className="input-group">
                                <label>Exclude Directories (comma-separated)</label>
                                <input type="text" id="cards-exclude-dirs" placeholder="e.g., node_modules, vendor, dist" style={{width: '100%'}} />
                                <p className="small" style={{color: 'var(--fg-muted)'}}>Directories to skip when building cards</p>
                            </div>
                        </div>

                        <div className="input-row" style={{marginBottom: '12px'}}>
                            <div className="input-group">
                                <label>Exclude Patterns (comma-separated)</label>
                                <input type="text" id="cards-exclude-patterns" placeholder="e.g., .test.js, .spec.ts, .min.js" style={{width: '100%'}} />
                                <p className="small" style={{color: 'var(--fg-muted)'}}>File patterns to skip</p>
                            </div>
                        </div>

                        <div className="input-row" style={{marginBottom: '16px'}}>
                            <div className="input-group">
                                <label>Exclude Keywords (comma-separated)</label>
                                <input type="text" id="cards-exclude-keywords" placeholder="e.g., deprecated, legacy, TODO" style={{width: '100%'}} />
                                <p className="small" style={{color: 'var(--fg-muted)'}}>Skip chunks containing these keywords</p>
                            </div>
                        </div>

                        {/* Options */}
                        <div className="input-row" style={{marginBottom: '16px', alignItems: 'flex-end'}}>
                            <div className="input-group">
                                <label>Cards Max</label>
                                <input type="number" id="cards-max" name="CARDS_MAX" value="0" min="0" step="10" style={{maxWidth: '160px'}} />
                                <p className="small" style={{color: 'var(--fg-muted)'}}>Limit chunks (0 = all)</p>
                            </div>
                            <div className="input-group">
                                <label>
                                    <input type="checkbox" id="cards-enrich-gui" checked /> Enrich with AI
                                </label>
                                <p className="small" style={{color: 'var(--fg-muted)'}}>Use LLM for rich semantic cards</p>
                            </div>
                        </div>

                        {/* PERMANENT VISIBLE PROGRESS DISPLAY */}
                        <div id="cards-progress-container" style={{display: 'none', background: 'var(--card-bg)', border: '2px solid var(--accent)', borderRadius: '8px', padding: '16px', marginBottom: '16px'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                                <div style={{fontWeight: 700, fontSize: '16px', color: 'var(--fg)'}}>⚡ Building Cards...</div>
                                <div id="cards-progress-repo" style={{fontSize: '12px', fontWeight: 600, color: 'var(--accent)'}}></div>
                            </div>

                            <div style={{display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap'}}>
                                <div id="cards-progress-stage-scan" className="cards-stage-pill" style={{fontSize: '11px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--line)', color: 'var(--fg-muted)', background: 'transparent'}}>scan</div>
                                <div id="cards-progress-stage-chunk" className="cards-stage-pill" style={{fontSize: '11px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--line)', color: 'var(--fg-muted)', background: 'transparent'}}>chunk</div>
                                <div id="cards-progress-stage-summarize" className="cards-stage-pill" style={{fontSize: '11px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--line)', color: 'var(--fg-muted)', background: 'transparent'}}>summarize</div>
                                <div id="cards-progress-stage-sparse" className="cards-stage-pill" style={{fontSize: '11px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--line)', color: 'var(--fg-muted)', background: 'transparent'}}>sparse</div>
                                <div id="cards-progress-stage-write" className="cards-stage-pill" style={{fontSize: '11px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--line)', color: 'var(--fg-muted)', background: 'transparent'}}>write</div>
                                <div id="cards-progress-stage-finalize" className="cards-stage-pill" style={{fontSize: '11px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--line)', color: 'var(--fg-muted)', background: 'transparent'}}>finalize</div>
                            </div>

                            <div style={{background: 'var(--bg-elev1)', border: '1px solid var(--line)', borderRadius: '6px', height: '24px', overflow: 'hidden', marginBottom: '8px', position: 'relative'}}>
                                <div id="cards-progress-bar" style={{height: '100%', width: '0%', background: 'linear-gradient(90deg, var(--ok) 0%, var(--accent) 100%)', transition: 'width 0.3s ease'}}></div>
                            </div>

                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontFamily: "'SF Mono', monospace", color: 'var(--fg)', marginBottom: '12px'}}>
                                <div id="cards-progress-stats" style={{fontWeight: 600}}>0 / 0 (0%)</div>
                                <div id="cards-progress-throughput" style={{color: 'var(--link)'}}>--</div>
                                <div id="cards-progress-eta" style={{color: 'var(--warn)'}}>ETA: --</div>
                            </div>

                            <div id="cards-progress-tip" style={{fontSize: '12px', color: 'var(--link)', marginBottom: '12px', fontStyle: 'italic', padding: '8px', background: 'var(--bg-elev2)', borderRadius: '4px'}}>
                                💡 Starting...
                            </div>

                            <div style={{display: 'flex', gap: '8px'}}>
                                <button id="cards-progress-cancel" className="small-button" style={{flex: 1, background: 'var(--err)', color: '#fff', fontWeight: 600}}>
                                    ■ Cancel Build
                                </button>
                                <button id="cards-progress-logs" className="small-button" style={{flex: 1, background: 'var(--bg-elev2)', color: 'var(--link)', border: '1px solid var(--link)'}}>
                                    📄 View Logs
                                </button>
                                <button id="cards-progress-clear" className="small-button" style={{flex: 1, background: 'var(--bg-elev2)', color: 'var(--fg-muted)', border: '1px solid var(--line)'}}>
                                    ✕ Clear
                                </button>
                            </div>
                        </div>

                        {/* Build Button */}
                        <div className="action-buttons" style={{marginBottom: '16px', display: 'flex', gap: '8px'}}>
                            <button id="btn-cards-build" style={{flex: 1, background: 'var(--accent)', color: 'var(--fg)', fontWeight: 600, padding: '12px'}}>
                                <span style={{marginRight: '4px'}}>⚡</span> Build Cards
                            </button>
                            <button id="btn-cards-refresh" style={{flex: 1, background: 'var(--bg-elev2)', color: 'var(--ok)', border: '1px solid var(--ok)'}}>
                                <span style={{marginRight: '4px'}}>↻</span> Refresh
                            </button>
                            <button id="btn-cards-view-all" style={{flex: 1, background: 'var(--bg-elev2)', color: 'var(--link)', border: '1px solid var(--link)'}}>
                                <span style={{marginRight: '4px'}}>📋</span> View All
                            </button>
                        </div>

                        {/* Cards Viewer */}
                        <div id="cards-viewer-container" style={{background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px', minHeight: '300px', maxHeight: '600px', overflowY: 'auto'}}>
                            <div id="cards-last-build" className="mono" style={{fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '8px', display: 'none'}}></div>
                            <div id="cards-viewer" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', width: '100%'}}></div>
                        </div>
                        <p className="small" style={{color: 'var(--fg-muted)', marginTop: '8px'}}>Click a card to navigate to its source location.</p>
                    </div>

                    {/* Semantic Synonyms Note */}
                    <div className="settings-section" style={{borderLeft: '3px solid var(--link)'}}>
                        <h3>
                            <span style={{color: 'var(--link)'}}>●</span> Semantic Synonyms
                            <span className="tooltip-wrap">
                                <span className="help-icon">?</span>
                                <div className="tooltip-bubble">
                                    <span className="tt-title">Synonym Expansion</span>
                                    Expands queries with semantic synonyms to improve retrieval. Example: "auth" → "auth authentication oauth jwt bearer". Configured via data/semantic_synonyms.json
                                </div>
                            </span>
                        </h3>
                        <p>Semantic synonyms are configured in <code>data/semantic_synonyms.json</code>. Enable/disable via the Retrieval tab settings (USE_SEMANTIC_SYNONYMS).</p>
                    </div>
                </div>

                {/* RAG Subtab: Retrieval */}
                <div id="tab-rag-retrieval" className="rag-subtab-content">
                    {/* Generation Models Section */}
                    <div className="settings-section">
                        <h3>Generation Models</h3>
                        <button className="small-button" id="btn-add-gen-model" style={{marginBottom: '12px'}}>Add Model</button>
                        <div className="input-row">
                            <div className="input-group">
                                <label>Primary Model (GEN_MODEL)</label>
                                <input type="text" name="GEN_MODEL" placeholder="gpt-4o-mini or qwen3-coder:30b" list="gen-model-list" />
                                <datalist id="gen-model-list"></datalist>
                            </div>
                            <div className="input-group">
                                <label>OpenAI API Key</label>
                                <input type="password" name="OPENAI_API_KEY" />
                            </div>
                        </div>
                        <div className="input-row">
                            <div className="input-group">
                                <label>
                                    Default Temperature (GEN_TEMPERATURE)
                                    <span className="tooltip-wrap">
                                        <span className="help-icon">?</span>
                                        <div className="tooltip-bubble">
                                            <span className="tt-title">Default Response Creativity</span>
                                            Sets a global default temperature for generation. 0.0 = deterministic; try 0.2 sometimes, or 0.04 for light variation in docs.
                                        </div>
                                    </span>
                                </label>
                                <input type="number" name="GEN_TEMPERATURE" value="0.0" min="0" max="2" step="0.01" />
                            </div>
                        </div>
                        <div className="input-row">
                            <div className="input-group">
                                <label>Enrich Model (ENRICH_MODEL)</label>
                                <input type="text" name="ENRICH_MODEL" placeholder="gpt-4o-mini" />
                            </div>
                            <div className="input-group">
                                <label>Enrich Model (Ollama)</label>
                                <input type="text" name="ENRICH_MODEL_OLLAMA" placeholder="qwen3-coder:30b" />
                            </div>
                        </div>
                        <div className="input-row">
                            <div className="input-group">
                                <label>Anthropic API Key</label>
                                <input type="password" name="ANTHROPIC_API_KEY" />
                            </div>
                            <div className="input-group">
                                <label>Google API Key</label>
                                <input type="password" name="GOOGLE_API_KEY" />
                            </div>
                        </div>
                        <div className="input-row">
                            <div className="input-group">
                                <label>Ollama URL</label>
                                <input type="text" name="OLLAMA_URL" placeholder="http://127.0.0.1:11434" />
                            </div>
                            <div className="input-group">
                                <label>OpenAI Base URL (optional)</label>
                                <input type="text" name="OPENAI_BASE_URL" placeholder="For vLLM proxy" />
                            </div>
                        </div>
                        <div className="input-row">
                            <div className="input-group">
                                <label>HTTP Override Model</label>
                                <input type="text" name="GEN_MODEL_HTTP" />
                            </div>
                            <div className="input-group">
                                <label>MCP Override Model</label>
                                <input type="text" name="GEN_MODEL_MCP" />
                            </div>
                        </div>
                        <div className="input-row">
                            <div className="input-group">
                                <label>CLI Override Model</label>
                                <input type="text" name="GEN_MODEL_CLI" />
                            </div>
                            <div className="input-group">
                                <label>Enrich Backend</label>
                                <select name="ENRICH_BACKEND">
                                    <option value="">Default</option>
                                    <option value="openai">OpenAI</option>
                                    <option value="mlx">MLX (Apple)</option>
                                    <option value="ollama">Ollama</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Retrieval Parameters Section */}
                    <div className="settings-section">
                        <h3>Retrieval Parameters</h3>
                        <p className="small">Hybrid search fuses sparse (BM25) + dense (vectors). These knobs tune candidate counts and hydration behavior.</p>
                        <div className="input-row">
                            <div className="input-group">
                                <label>
                                    Multi-Query Rewrites
                                    <span className="tooltip-wrap">
                                        <span className="help-icon">?</span>
                                        <div className="tooltip-bubble">
                                            <span className="tt-title">Query Expansion via LLM Rewriting - Improved Recall</span>
                                            Number of query variations to automatically generate using the LLM. Each variation searches independently via hybrid search, results are merged and reranked together. Higher = better chance of finding relevant code but increases latency and API costs.
                                            <br /><br />
                                            <strong>Example:</strong> Query "how do we handle payments?" might expand to:
                                            <br />- "payment processing implementation"
                                            <br />- "stripe integration"
                                            <br />- "checkout flow"
                                            <br /><br />
                                            <strong>Tuning:</strong> 1-2 for speed, 3-4 for balanced, 5-6 for thorough but expensive searches.
                                            <br />Default: 2. Range: 1-6.
                                            <div className="tt-links">
                                                <a href="https://arxiv.org/abs/2305.14283" target="_blank" rel="noopener">Multi-Query RAG Paper</a>
                                                <a href="https://python.langchain.com/docs/how_to/MultiQueryRetriever/" target="_blank" rel="noopener">LangChain Implementation</a>
                                                <a href="/docs/RETRIEVAL.md#multi-query" target="_blank" rel="noopener">Multi-Query Tuning Guide</a>
                                            </div>
                                            <div className="tt-badges">
                                                <span className="tt-badge info">Better Recall</span>
                                                <span className="tt-badge warn">Higher Cost</span>
                                                <span className="tt-badge warn">Higher Latency</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input type="number" name="MQ_REWRITES" value="2" min="1" />
                            </div>
                            <div className="input-group">
                                <label>
                                    Final K
                                    <span className="tooltip-wrap">
                                        <span className="help-icon">?</span>
                                        <div className="tooltip-bubble">
                                            <span className="tt-title">Final Results Count</span>
                                            Number of top results to return after fusion and reranking. This is what you get back from search. Higher = more context but more noise. Default: 10. Range: 5-30.
                                            <div className="tt-badges">
                                                <span className="tt-badge info">Core Setting</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input type="number" name="FINAL_K" value="10" min="1" />
                            </div>
                            <div className="input-group">
                                <label>
                                    Use Semantic Synonyms
                                    <span className="tooltip-wrap">
                                        <span className="help-icon">?</span>
                                        <div className="tooltip-bubble">
                                            <span className="tt-title">Query Expansion via Synonym Replacement - Domain Terminology</span>
                                            Expands user queries with hand-curated semantic synonyms to handle domain-specific terminology and abbreviations. Example: "auth" expands to "auth authentication oauth jwt bearer token login".
                                            <br /><br />
                                            <strong>Purpose:</strong> Handles acronyms and domain synonyms that LLM rewriting might miss. E.g., "JWT" might not rewrite to "json web token".
                                            <br /><strong>Configuration:</strong> Edit data/semantic_synonyms.json to add domain-specific synonym mappings for your codebase.
                                            <br /><strong>Note:</strong> Different from Multi-Query Rewrites - this uses pre-defined synonyms, not LLM-generated variations.
                                            <br />Default: ON (enabled).
                                            <div className="tt-links">
                                                <a href="/files/data/semantic_synonyms.json" target="_blank" rel="noopener">Synonym Config File</a>
                                                <a href="/docs/RETRIEVAL.md#synonyms" target="_blank" rel="noopener">Synonym Setup Guide</a>
                                                <a href="/docs/DOMAIN_CUSTOMIZATION.md" target="_blank" rel="noopener">Domain Terminology</a>
                                            </div>
                                            <div className="tt-badges">
                                                <span className="tt-badge info">Better Recall</span>
                                                <span className="tt-badge">No Re-index</span>
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
                        <div className="input-row">
                            <div className="input-group">
                                <label>
                                    Top-K Dense (Qdrant)
                                    <span className="tooltip-wrap">
                                        <span className="help-icon">?</span>
                                        <div className="tooltip-bubble">
                                            <span className="tt-title">Dense Vector Candidates</span>
                                            Number of candidates to retrieve from Qdrant vector search before fusion. Higher = better recall for semantic matches but slower. Should be >= Final K. Default: 75. Range: 20-200.
                                            <div className="tt-badges">
                                                <span className="tt-badge info">Semantic Search</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input type="number" name="TOPK_DENSE" value="75" min="1" />
                            </div>
                            <div className="input-group">
                                <label>Vector Backend</label>
                                <select name="VECTOR_BACKEND">
                                    <option value="qdrant">Qdrant</option>
                                    <option value="faiss">FAISS (experimental)</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>
                                    Top-K Sparse (BM25)
                                    <span className="tooltip-wrap">
                                        <span className="help-icon">?</span>
                                        <div className="tooltip-bubble">
                                            <span className="tt-title">Sparse BM25 Candidates</span>
                                            Number of candidates to retrieve from BM25 keyword search before fusion. Higher = better recall for exact matches but slower. Should be >= Final K. Default: 75. Range: 20-200.
                                            <div className="tt-badges">
                                                <span className="tt-badge info">Keyword Search</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input type="number" name="TOPK_SPARSE" value="75" min="1" />
                            </div>
                        </div>
                        <div className="input-row">
                            <div className="input-group">
                                <label>
                                    Hydration Mode
                                    <span className="tooltip-wrap">
                                        <span className="help-icon">?</span>
                                        <div className="tooltip-bubble">
                                            <span className="tt-title">Code Loading Strategy</span>
                                            Controls when full code is loaded. "Lazy" loads code from chunks.jsonl after retrieval. "None" only returns metadata (file path, line numbers). Lazy is recommended. None is faster but returns no code.
                                            <div className="tt-badges">
                                                <span className="tt-badge">Lazy Recommended</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <select name="HYDRATION_MODE">
                                    <option value="lazy">Lazy</option>
                                    <option value="none">None</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>
                                    Hydration Max Chars
                                    <span className="tooltip-wrap">
                                        <span className="help-icon">?</span>
                                        <div className="tooltip-bubble">
                                            <span className="tt-title">Code Truncation Limit</span>
                                            Maximum characters to load per chunk when hydrating. Prevents huge chunks from bloating responses. 0 = no limit. Default: 2000. Range: 500-5000.
                                            <div className="tt-badges">
                                                <span className="tt-badge">Performance</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input type="number" name="HYDRATION_MAX_CHARS" value="2000" />
                            </div>
                        </div>
                        <div className="input-row">
                            <div className="input-group">
                                <label>
                                    Vendor Mode
                                    <span className="tooltip-wrap">
                                        <span className="help-icon">?</span>
                                        <div className="tooltip-bubble">
                                            <span className="tt-title">First-Party vs Vendor Code</span>
                                            Controls scoring bonus for first-party vs vendor code. "Prefer First Party" boosts your code (+0.06) and penalizes vendor libs (-0.08). "Prefer Vendor" boosts vendor code. Most use cases prefer first party.
                                            <div className="tt-badges">
                                                <span className="tt-badge info">Code Priority</span>
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
                    </div>

                    {/* Advanced RAG Tuning */}
                    <div className="settings-section" style={{borderLeft: '3px solid var(--warn)'}}>
                        <h3>
                            <span className="accent-orange">●</span> Advanced RAG Tuning
                            <span className="tooltip-wrap">
                                <span className="help-icon">?</span>
                                <div className="tooltip-bubble">
                                    <span className="tt-title">Advanced Parameters</span>
                                    Fine-tune scoring, fusion, and iteration behavior. These parameters significantly affect retrieval quality and performance. Only modify if you understand the implications.
                                    <div className="tt-badges">
                                        <span className="tt-badge warn">Expert Only</span>
                                        <span className="tt-badge">No Re-index</span>
                                    </div>
                                </div>
                            </span>
                        </h3>
                        <p className="small">Expert-level controls for fusion weighting, score bonuses, and LangGraph iteration behavior. Changes take effect immediately without re-indexing.</p>

                        <div className="input-row">
                            <div className="input-group">
                                <label>
                                    RRF K Divisor
                                    <span className="tooltip-wrap">
                                        <span className="help-icon">?</span>
                                        <div className="tooltip-bubble">
                                            <span className="tt-title">Reciprocal Rank Fusion (RRF) - Hybrid Search Weighting</span>
                                            Controls how hybrid search combines BM25 (keyword) and vector (semantic) results using the RRF algorithm. Formula: score += 1/(K + rank). Lower K = BM25 and vector have more equal weight. Higher K = only top results matter equally.
                                            <br /><br />
                                            <strong>Examples:</strong> K=30 (favor top results, aggressive fusion), K=60 (balanced, recommended), K=100 (flatten ranking, lenient fusion)
                                            <br /><strong>Tuning:</strong> Lower if keywords and semantics compete; higher if you want diversity.
                                            <br />Default: 60. Range: 10-100.
                                            <div className="tt-links">
                                                <a href="https://en.wikipedia.org/wiki/Reciprocal_rank_fusion" target="_blank" rel="noopener">RRF Algorithm</a>
                                                <a href="https://www.pinecone.io/learn/hybrid-search-intro/" target="_blank" rel="noopener">Hybrid Search Explained</a>
                                                <a href="/docs/RETRIEVAL.md#rrf-fusion" target="_blank" rel="noopener">RRF Tuning Guide</a>
                                            </div>
                                            <div className="tt-badges">
                                                <span className="tt-badge info">Affects Fusion</span>
                                                <span className="tt-badge">No Re-index</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input type="number" name="RRF_K_DIV" value="60" min="10" max="100" step="5" />
                            </div>
                            <div className="input-group">
                                <label>
                                    Card Bonus
                                    <span className="tooltip-wrap">
                                        <span className="help-icon">?</span>
                                        <div className="tooltip-bubble">
                                            <span className="tt-title">Card Semantic Summary Bonus - Intent-Based Retrieval</span>
                                            Score boost applied to chunks when matching against AI-generated code card summaries (not raw code). Cards are semantic summaries of code modules/features created by ENRICH_CODE_CHUNKS. Enables "where is auth handled?" to find auth modules even if code contains different keywords.
                                            <br /><br />
                                            <strong>Use Case:</strong> Improving conceptual queries by matching against high-level summaries. Raises the score when a card matches, prioritizing that chunk.
                                            <br /><strong>Tuning:</strong> Increase (0.12-0.15) if cards are finding relevant code; decrease (0.04-0.06) if cards cause noise.
                                            <br />Default: 0.08. Range: 0.0-0.2.
                                            <div className="tt-links">
                                                <a href="/docs/CARDS.md" target="_blank" rel="noopener">Cards Feature</a>
                                                <a href="/files/indexer/build_cards.py" target="_blank" rel="noopener">Cards Builder Source</a>
                                                <a href="/docs/RETRIEVAL.md#card-scoring" target="_blank" rel="noopener">Card Scoring Logic</a>
                                            </div>
                                            <div className="tt-badges">
                                                <span className="tt-badge info">Improves Intent</span>
                                                <span className="tt-badge">Requires ENRICH_CODE_CHUNKS</span>
                                                <span className="tt-badge">No Re-index</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input type="number" name="CARD_BONUS" value="0.08" min="0" max="0.2" step="0.01" />
                            </div>
                        </div>

                        <div className="input-row">
                            <div className="input-group">
                                <label>
                                    Filename Boost (Exact Match)
                                    <span className="tooltip-wrap">
                                        <span className="help-icon">?</span>
                                        <div className="tooltip-bubble">
                                            <span className="tt-title">Filename Exact Match Score Multiplier - File-Specific Queries</span>
                                            Score multiplier (not additive) applied when query terms match the filename EXACTLY. Example: query "auth.py" matching file "auth.py" gets multiplied by 1.5x.
                                            <br /><br />
                                            <strong>Purpose:</strong> Users often ask "find file X.py" - this boost rewards exact filename matches, improving precision for file-specific questions.
                                            <br /><strong>Tuning:</strong> Increase (2.0+) to strongly prefer exact filename matches; decrease (1.2) if boost causes over-matching.
                                            <br />Default: 1.5. Range: 1.0-3.0.
                                            <div className="tt-links">
                                                <a href="/docs/RETRIEVAL.md#path-scoring" target="_blank" rel="noopener">Path Scoring Rules</a>
                                                <a href="/docs/RETRIEVAL.md#tuning-multipliers" target="_blank" rel="noopener">Tuning Score Multipliers</a>
                                            </div>
                                            <div className="tt-badges">
                                                <span className="tt-badge info">Precision Boost</span>
                                                <span className="tt-badge">No Re-index</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input type="number" name="FILENAME_BOOST_EXACT" value="1.5" min="1.0" max="3.0" step="0.1" />
                            </div>
                            <div className="input-group">
                                <label>
                                    Filename Boost (Partial Match)
                                    <span className="tooltip-wrap">
                                        <span className="help-icon">?</span>
                                        <div className="tooltip-bubble">
                                            <span className="tt-title">Path Component Partial Match Score Multiplier - Directory Path Bonus</span>
                                            Score multiplier applied when query terms match ANY component of the file path (directories or partial filename). Example: query "auth" matching "src/auth/oauth.py" or "routes/authentication.ts" gets multiplied by 1.2x.
                                            <br /><br />
                                            <strong>Purpose:</strong> Improves recall by rewarding hits in relevant directories. Users ask "where is auth handled?" and this finds files in "auth/" or "authentication/" dirs.
                                            <br /><strong>Tuning:</strong> Increase (1.5+) for stronger directory matching; decrease (1.05) if path matches create noise.
                                            <br /><strong>Difference from Exact:</strong> Partial matches ANY path component (dir name, filename prefix); Exact requires full filename match.
                                            <br />Default: 1.2. Range: 1.0-2.0.
                                            <div className="tt-links">
                                                <a href="/docs/RETRIEVAL.md#path-scoring" target="_blank" rel="noopener">Path Scoring Rules</a>
                                                <a href="/docs/RETRIEVAL.md#precision-vs-recall" target="_blank" rel="noopener">Precision vs Recall Tuning</a>
                                            </div>
                                            <div className="tt-badges">
                                                <span className="tt-badge info">Recall Boost</span>
                                                <span className="tt-badge">No Re-index</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input type="number" name="FILENAME_BOOST_PARTIAL" value="1.2" min="1.0" max="2.0" step="0.1" />
                            </div>
                        </div>

                        <div className="input-row">
                            <div className="input-group">
                                <label>
                                    LangGraph Final K
                                    <span className="tooltip-wrap">
                                        <span className="help-icon">?</span>
                                        <div className="tooltip-bubble">
                                            <span className="tt-title">LangGraph Document Count</span>
                                            Number of documents retrieved for LangGraph RAG pipeline (used by /answer endpoint). Higher = more context but slower + costlier. Separate from retrieval Final K. Default: 20. Range: 5-50.
                                            <div className="tt-badges">
                                                <span className="tt-badge info">Context Window</span>
                                                <span className="tt-badge warn">Higher Cost</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input type="number" name="LANGGRAPH_FINAL_K" value="20" min="5" max="50" step="1" />
                            </div>
                            <div className="input-group">
                                <label>
                                    Max Query Rewrites
                                    <span className="tooltip-wrap">
                                        <span className="help-icon">?</span>
                                        <div className="tooltip-bubble">
                                            <span className="tt-title">Iteration Limit</span>
                                            Maximum number of query rewrite iterations in LangGraph when confidence is low. Each iteration generates a new query variant and retrieves again. Default: 3. Range: 1-5.
                                            <div className="tt-badges">
                                                <span className="tt-badge info">Adaptive Search</span>
                                                <span className="tt-badge warn">Higher Latency</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input type="number" name="MAX_QUERY_REWRITES" value="3" min="1" max="5" step="1" />
                            </div>
                        </div>

                        <div className="input-row">
                            <div className="input-group">
                                <label>
                                    Fallback Confidence Threshold
                                    <span className="tooltip-wrap">
                                        <span className="help-icon">?</span>
                                        <div className="tooltip-bubble">
                                            <span className="tt-title">Low-Confidence Fallback</span>
                                            When initial retrieval confidence is below this threshold, triggers a fallback multi-query search with expanded parameters. Lower = more aggressive fallback. Default: 0.55. Range: 0.3-0.8.
                                            <div className="tt-badges">
                                                <span className="tt-badge info">Recall Safety Net</span>
                                                <span className="tt-badge warn">Extra API Calls</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <input type="number" name="FALLBACK_CONFIDENCE" value="0.55" min="0.3" max="0.8" step="0.05" />
                            </div>
                        </div>
                    </div>

                    {/* Routing Trace Section */}
                    <div className="settings-section" style={{marginTop: '16px', borderLeft: '3px solid var(--link)'}}>
                        <h3>Routing Trace</h3>
                        <div className="input-row">
                            <div className="input-group">
                                <label>Load Latest Trace</label>
                                <button className="small-button" id="btn-trace-latest">Open</button>
                            </div>
                            <div className="input-group">
                                <label>Open in LangSmith</label>
                                <button className="small-button" id="btn-trace-open-ls">Open</button>
                            </div>
                            <div className="input-group">
                                <label>Tracing Mode</label>
                                <select name="TRACING_MODE">
                                    <option value="off">Off</option>
                                    <option value="local">Local</option>
                                    <option value="langsmith">LangSmith</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Auto-open in LangSmith</label>
                                <select name="TRACE_AUTO_LS">
                                    <option value="0">No</option>
                                    <option value="1">Yes</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Trace Retention</label>
                                <input type="number" name="TRACE_RETENTION" value="50" min="1" max="500" />
                            </div>
                        </div>

                        {/* LangSmith / LangChain Tracing Settings */}
                        <div className="input-row">
                            <div className="input-group">
                                <label>LangChain Tracing V2 (LANGCHAIN_TRACING_V2)</label>
                                <select name="LANGCHAIN_TRACING_V2">
                                    <option value="0">Off</option>
                                    <option value="1">On</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>LangSmith Endpoint (LANGCHAIN_ENDPOINT)</label>
                                <input type="text" name="LANGCHAIN_ENDPOINT" placeholder="https://api.smith.langchain.com" />
                            </div>
                        </div>
                        <div className="input-row">
                            <div className="input-group">
                                <label>LangSmith API Key (LANGCHAIN_API_KEY)</label>
                                <input type="password" name="LANGCHAIN_API_KEY" placeholder="sk-..." />
                            </div>
                            <div className="input-group">
                                <label>LangSmith API Key (alias) (LANGSMITH_API_KEY)</label>
                                <input type="password" name="LANGSMITH_API_KEY" placeholder="ls_..." />
                            </div>
                        </div>
                        <div className="input-row">
                            <div className="input-group">
                                <label>LangSmith Project (LANGCHAIN_PROJECT)</label>
                                <input type="text" name="LANGCHAIN_PROJECT" placeholder="agro" />
                            </div>
                        </div>

                        {/* LangTrace Settings */}
                        <div className="input-row">
                            <div className="input-group">
                                <label>LangTrace API Host (LANGTRACE_API_HOST)</label>
                                <input type="text" name="LANGTRACE_API_HOST" placeholder="https://app.langtrace.ai/project/.../traces" />
                            </div>
                            <div className="input-group">
                                <label>LangTrace Project ID (LANGTRACE_PROJECT_ID)</label>
                                <input type="text" name="LANGTRACE_PROJECT_ID" placeholder="cmg..." />
                            </div>
                        </div>
                        <div className="input-row">
                            <div className="input-group full-width">
                                <label>LangTrace API Key (LANGTRACE_API_KEY)</label>
                                <input type="password" name="LANGTRACE_API_KEY" placeholder="..." />
                            </div>
                        </div>

                        <div id="trace-output" className="result-display" style={{minHeight: '120px', whiteSpace: 'pre-wrap'}}></div>
                    </div>
                </div>

                {/* RAG Subtab: External Rerankers */}
                <div id="tab-rag-external-rerankers" className="rag-subtab-content">
                    <div className="settings-section" style={{borderLeft: '3px solid var(--link)'}}>
                        <h3>
                            <span className="accent-pink">●</span> Reranking
                            <span className="tooltip-wrap">
                                <span className="help-icon">?</span>
                                <div className="tooltip-bubble">
                                    <span className="tt-title">Cross-Encoder Reranking</span>
                                    Configure reranking backend and models. Set to "none" for offline/BM25-only operation.
                                    <div className="tt-badges">
                                        <span className="tt-badge info">Quality Boost</span>
                                        <span className="tt-badge warn">May require downloads</span>
                                    </div>
                                </div>
                            </span>
                        </h3>
                        <div className="input-row">
                            <div className="input-group">
                                <label>Rerank Backend (RERANK_BACKEND)</label>
                                <select name="RERANK_BACKEND">
                                    <option value="none">none</option>
                                    <option value="local">local</option>
                                    <option value="hf">hf</option>
                                    <option value="cohere">cohere</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Local/HF Model (RERANKER_MODEL)</label>
                                <input type="text" name="RERANKER_MODEL" placeholder="cross-encoder/ms-marco-MiniLM-L-12-v2" />
                            </div>
                        </div>
                        <div className="input-row" style={{marginTop: '8px'}}>
                            <div className="input-group full-width" style={{background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '10px'}}>
                                <div style={{fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px'}}>Current Reranker (Server)</div>
                                <div className="mono" id="reranker-info-panel-ext" style={{fontSize: '12px', lineHeight: 1.6}}>
                                    <div>Enabled: <span id="reranker-info-enabled-ext">—</span></div>
                                    <div>Model Path: <span id="reranker-info-path-ext">—</span></div>
                                    <div>Device: <span id="reranker-info-device-ext">—</span></div>
                                    <div>Alpha: <span id="reranker-info-alpha-ext">—</span> • TopN: <span id="reranker-info-topn-ext">—</span> • Batch: <span id="reranker-info-batch-ext">—</span> • MaxLen: <span id="reranker-info-maxlen-ext">—</span></div>
                                </div>
                            </div>
                        </div>
                        <div className="input-row">
                            <div className="input-group">
                                <label>Cohere Model (COHERE_RERANK_MODEL)</label>
                                <select name="COHERE_RERANK_MODEL">
                                    <option value="">(select model)</option>
                                    <option value="rerank-3.5">rerank-3.5</option>
                                    <option value="rerank-english-v3.0">rerank-english-v3.0</option>
                                    <option value="rerank-multilingual-v3.0">rerank-multilingual-v3.0</option>
                                    <option value="rerank-english-lite-v3.0">rerank-english-lite-v3.0</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Cohere API Key (COHERE_API_KEY)</label>
                                <input type="password" name="COHERE_API_KEY" placeholder="ck_..." />
                            </div>
                        </div>
                        <div className="input-row">
                            <div className="input-group">
                                <label>HF Trust Remote Code (TRANSFORMERS_TRUST_REMOTE_CODE)</label>
                                <select name="TRANSFORMERS_TRUST_REMOTE_CODE">
                                    <option value="1">1</option>
                                    <option value="0">0</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Input Snippet Chars (RERANK_INPUT_SNIPPET_CHARS)</label>
                                <input type="number" name="RERANK_INPUT_SNIPPET_CHARS" value="700" min="200" max="2000" step="50" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* RAG Subtab: Learning Ranker */}
                <div id="tab-rag-learning-ranker" className="rag-subtab-content">
                    <div className="settings-section" style={{borderLeft: '3px solid var(--link)'}}>
                        <h2 style={{color: 'var(--link)'}}>🧠 Learning Reranker System</h2>
                        <p className="small">Self-improving retrieval through user feedback. Trains a cross-encoder that learns from thumbs-up/down and clicks to rank better results higher - without touching your chat model.</p>
                    </div>

                    {/* Status Overview */}
                    <div className="settings-section">
                        <h3>📊 System Status</h3>
                        <div className="input-row">
                            <div className="input-group">
                                <label>Reranker Status</label>
                                <div id="reranker-enabled-status" style={{padding: '8px', background: 'var(--card-bg)', borderRadius: '4px', fontFamily: "'SF Mono', monospace", fontSize: '13px'}}>...</div>
                            </div>
                            <div className="input-group">
                                <label>Logged Queries</label>
                                <div id="reranker-query-count" style={{padding: '8px', background: 'var(--card-bg)', borderRadius: '4px', fontFamily: "'SF Mono', monospace", fontSize: '13px'}}>...</div>
                            </div>
                            <div className="input-group">
                                <label>Training Triplets</label>
                                <div id="reranker-triplet-count" style={{padding: '8px', background: 'var(--card-bg)', borderRadius: '4px', fontFamily: "'SF Mono', monospace", fontSize: '13px'}}>...</div>
                            </div>
                        </div>
                    </div>

                    {/* Training Workflow */}
                    <div className="settings-section" style={{borderLeft: '3px solid var(--accent)'}}>
                        <h3>🎓 Training Workflow</h3>
                        <p className="small">Click buttons below in order. Each step shows progress and results.</p>

                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', margin: '16px 0'}}>
                            <div style={{background: 'var(--chip-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px'}}>
                                <h4 style={{margin: '0 0 8px 0', color: 'var(--link)'}}>1. Mine Triplets</h4>
                                <p style={{fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '12px'}}>Extract training data from logs</p>
                                <button id="reranker-mine-btn" style={{width: '100%', background: 'var(--link)', color: 'var(--fg)', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600}}>Mine Triplets</button>
                                <div id="reranker-mine-result" style={{marginTop: '8px', fontSize: '11px', color: 'var(--fg-muted)'}}></div>
                            </div>

                            <div style={{background: 'var(--chip-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px'}}>
                                <h4 style={{margin: '0 0 8px 0', color: 'var(--accent)'}}>2. Train Model</h4>
                                <p style={{fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '12px'}}>Fine-tune cross-encoder (5-15 min)</p>
                                <button id="reranker-train-btn" style={{width: '100%', background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600}}>Train Model</button>
                                <div id="reranker-train-result" style={{marginTop: '8px', fontSize: '11px', color: 'var(--fg-muted)'}}></div>
                            </div>

                            <div style={{background: 'var(--chip-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px'}}>
                                <h4 style={{margin: '0 0 8px 0', color: 'var(--warn)'}}>3. Evaluate</h4>
                                <p style={{fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '12px'}}>Measure MRR and Hit@K metrics</p>
                                <button id="reranker-eval-btn" style={{width: '100%', background: 'var(--warn)', color: 'var(--fg)', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600}}>Evaluate</button>
                                <div id="reranker-eval-result" style={{marginTop: '8px', fontSize: '11px', color: 'var(--fg-muted)'}}></div>
                            </div>
                        </div>

                        <div style={{marginTop: '16px', padding: '12px', background: 'var(--card-bg)', borderRadius: '6px', borderLeft: '3px solid var(--link)'}}>
                            <div style={{fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '4px'}}>Current Task:</div>
                            <div id="reranker-status" style={{fontSize: '14px', fontFamily: "'SF Mono', monospace", color: 'var(--fg-muted)'}}>Ready</div>
                        </div>

                        {/* Live Terminal Container */}
                        <div id="reranker-terminal-container"></div>
                    </div>

                    {/* Settings */}
                    <div className="settings-section">
                        <h3>⚙️ Reranker Configuration</h3>
                        <div className="input-row">
                            <div className="input-group">
                                <label>Enable Learning Reranker</label>
                                <select name="AGRO_RERANKER_ENABLED">
                                    <option value="0">OFF</option>
                                    <option value="1">ON</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Model Path (AGRO_RERANKER_MODEL_PATH)</label>
                                <input type="text" name="AGRO_RERANKER_MODEL_PATH" placeholder="cross-encoder/ms-marco-MiniLM-L-12-v2" value="models/cross-encoder-agro" />
                            </div>
                            <div className="input-group">
                                <label>Telemetry Log Path</label>
                                <input type="text" name="AGRO_LOG_PATH" placeholder="data/logs/queries.jsonl" value="data/logs/queries.jsonl" />
                            </div>
                        </div>
                        <div className="input-row">
                            <div className="input-group">
                                <label>Triplets Output (AGRO_TRIPLETS_PATH)</label>
                                <input type="text" name="AGRO_TRIPLETS_PATH" placeholder="data/training/triplets.jsonl" value="data/training/triplets.jsonl" />
                            </div>
                            <div className="input-group">
                                <label>Mine Mode (AGRO_RERANKER_MINE_MODE)</label>
                                <select name="AGRO_RERANKER_MINE_MODE">
                                    <option value="append">append</option>
                                    <option value="replace">replace</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Reset Before Mine (AGRO_RERANKER_MINE_RESET)</label>
                                <select name="AGRO_RERANKER_MINE_RESET">
                                    <option value="0">No</option>
                                    <option value="1">Yes</option>
                                </select>
                            </div>
                        </div>
                        <div className="input-row" style={{marginTop: '8px'}}>
                            <div className="input-group full-width" style={{background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '10px'}}>
                                <div style={{fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px'}}>Current Reranker (Server)</div>
                                <div className="mono" id="reranker-info-panel" style={{fontSize: '12px', lineHeight: 1.6}}>
                                    <div>Enabled: <span id="reranker-info-enabled">—</span></div>
                                    <div>Model Path: <span id="reranker-info-path">—</span></div>
                                    <div>Device: <span id="reranker-info-device">—</span></div>
                                    <div>Alpha: <span id="reranker-info-alpha">—</span> • TopN: <span id="reranker-info-topn">—</span> • Batch: <span id="reranker-info-batch">—</span> • MaxLen: <span id="reranker-info-maxlen">—</span></div>
                                </div>
                            </div>
                        </div>
                        <div className="input-row">
                            <div className="input-group">
                                <label>Blend Alpha (CE Weight)</label>
                                <input type="number" name="AGRO_RERANKER_ALPHA" value="0.7" min="0.0" max="1.0" step="0.05" />
                            </div>
                            <div className="input-group">
                                <label>Max Sequence Length</label>
                                <input type="number" name="AGRO_RERANKER_MAXLEN" value="512" min="128" max="1024" step="64" />
                            </div>
                            <div className="input-group">
                                <label>Batch Size (Inference)</label>
                                <input type="number" name="AGRO_RERANKER_BATCH" value="16" min="1" max="64" step="4" />
                            </div>
                        </div>
                        <div className="input-row">
                            <div className="input-group">
                                <label>Training Epochs</label>
                                <input type="number" id="reranker-epochs" value="2" min="1" max="10" />
                            </div>
                            <div className="input-group">
                                <label>Training Batch Size</label>
                                <input type="number" id="reranker-batch" value="16" min="1" max="64" step="4" />
                            </div>
                        </div>
                    </div>

                    {/* Evaluation Results */}
                    <div className="settings-section" style={{borderLeft: '3px solid var(--warn)'}}>
                        <h3>📊 Evaluation Metrics</h3>
                        <div id="reranker-metrics-display" style={{background: 'var(--card-bg)', borderRadius: '6px', padding: '16px', minHeight: '120px'}}>
                            <div style={{color: 'var(--fg-muted)', textAlign: 'center', padding: '20px'}}>No evaluation results yet. Click "Evaluate" above.</div>
                        </div>

                        <div className="input-row" style={{marginTop: '16px'}}>
                            <div className="input-group">
                                <button id="reranker-save-baseline" style={{background: 'var(--link)', color: 'var(--on-link)', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', width: '100%', fontWeight: 600}}>Save as Baseline</button>
                            </div>
                            <div className="input-group">
                                <button id="reranker-compare-baseline" style={{background: 'var(--warn)', color: 'var(--on-warn)', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, width: '100%'}}>Compare vs Baseline</button>
                            </div>
                            <div className="input-group">
                                <button id="reranker-rollback" style={{background: 'var(--err)', color: 'var(--on-err)', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', width: '100%', fontWeight: 600}}>Rollback Model</button>
                            </div>
                        </div>
                    </div>

                    {/* Log Viewer */}
                    <div className="settings-section">
                        <h3>📝 Query Logs</h3>
                        <div className="input-row">
                            <div className="input-group">
                                <button id="reranker-view-logs" style={{background: 'var(--bg-elev1)', color: 'var(--fg)', border: '1px solid var(--line)', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600}}>View Logs</button>
                            </div>
                            <div className="input-group">
                                <button id="reranker-download-logs" style={{background: 'var(--bg-elev1)', color: 'var(--fg)', border: '1px solid var(--line)', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600}}>Download Logs</button>
                            </div>
                            <div className="input-group">
                                <button id="reranker-clear-logs" style={{background: 'var(--err)', color: 'var(--on-err)', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600}}>Clear Logs</button>
                            </div>
                        </div>
                        <div id="reranker-logs-viewer" style={{marginTop: '16px', background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '12px', maxHeight: '400px', overflowY: 'auto', display: 'none', fontFamily: "'SF Mono', monospace", fontSize: '11px'}}></div>
                    </div>

                    {/* Automation */}
                    <div className="settings-section" style={{borderLeft: '3px solid var(--warn)'}}>
                        <h3>🔄 Automation</h3>
                        <p className="small">Set up nightly training to automatically improve the reranker.</p>

                        <div className="input-row">
                            <div className="input-group">
                                <label>Nightly Training Time</label>
                                <input type="time" id="reranker-cron-time" value="02:15" />
                            </div>
                            <div className="input-group">
                                <label>&nbsp;</label>
                                <button id="reranker-setup-cron" style={{background: 'var(--link)', color: 'var(--on-link)', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', width: '100%', fontWeight: 600}}>Setup Nightly Job</button>
                            </div>
                        </div>

                        <div style={{marginTop: '8px'}}>
                            <button id="reranker-remove-cron" style={{background: 'var(--err)', color: 'var(--on-err)', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', width: '100%', fontWeight: 600}}>Remove Nightly Job</button>
                        </div>

                        <div id="reranker-cron-status" style={{marginTop: '12px', padding: '8px', background: 'var(--card-bg)', borderRadius: '4px', fontSize: '12px', color: 'var(--fg-muted)'}}></div>
                    </div>

                    {/* Smoke Test */}
                    <div className="settings-section" style={{borderLeft: '3px solid var(--accent)'}}>
                        <h3>🧪 Smoke Test</h3>
                        <p className="small">Verify end-to-end functionality: query → retrieve → rerank → log → feedback.</p>
                        <div className="input-row">
                            <div className="input-group">
                                <label>Test Query</label>
                                <input type="text" id="reranker-test-query" placeholder="Where is OAuth validated?" value="Where is OAuth validated?" />
                            </div>
                            <div className="input-group">
                                <label>&nbsp;</label>
                                <button id="reranker-smoke-test" style={{background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, width: '100%'}}>Run Smoke Test</button>
                            </div>
                        </div>
                        <div id="reranker-smoke-result" style={{marginTop: '16px', background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '12px', display: 'none', fontFamily: "'SF Mono', monospace", fontSize: '11px'}}></div>
                    </div>

                    {/* Cost Tracking */}
                    <div className="settings-section" style={{borderLeft: '3px solid var(--warn)'}}>
                        <h3>💰 Cost Tracking</h3>
                        <div className="input-row">
                            <div className="input-group">
                                <label>Total Cost (Last 24h)</label>
                                <div id="reranker-cost-24h" style={{padding: '8px', background: 'var(--card-bg)', borderRadius: '4px', fontFamily: "'SF Mono', monospace", fontSize: '13px', color: 'var(--accent)'}}>$0.00</div>
                            </div>
                            <div className="input-group">
                                <label>Avg Cost per Query</label>
                                <div id="reranker-cost-avg" style={{padding: '8px', background: 'var(--card-bg)', borderRadius: '4px', fontFamily: "'SF Mono', monospace", fontSize: '13px', color: 'var(--accent)'}}>$0.00</div>
                            </div>
                        </div>
                        <button id="reranker-cost-details" style={{background: 'var(--bg-elev1)', color: 'var(--fg)', border: '1px solid var(--line)', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', width: '100%', marginTop: '8px', fontWeight: 600}}>View Cost Breakdown</button>
                    </div>

                    {/* No-Hit Tracking */}
                    <div className="settings-section" style={{borderLeft: '3px solid var(--err)'}}>
                        <h3>⚠️ No-Hit Queries</h3>
                        <p className="small">Queries that returned no relevant results. Consider reindexing or adding these terms to your corpus.</p>
                        <div id="reranker-nohits-list" style={{background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '12px', maxHeight: '200px', overflowY: 'auto', fontFamily: "'SF Mono', monospace", fontSize: '11px'}}>
                            <div style={{color: 'var(--fg-muted)', textAlign: 'center', padding: '20px'}}>Loading no-hit queries...</div>
                        </div>
                    </div>
                </div>

                {/* RAG Subtab: Indexing */}
                <div id="tab-rag-indexing" className="rag-subtab-content">
                    {/* ONE SIMPLE INDEX BUTTON */}
                    <div className="settings-section" style={{borderLeft: '3px solid var(--ok)', padding: '32px'}}>
                        <h2 style={{margin: '0 0 24px 0', fontSize: '24px', fontWeight: 700}}>
                            🚀 Index Repository
                        </h2>

                        <div style={{maxWidth: '800px'}}>
                            <div style={{marginBottom: '20px'}}>
                                <label style={{display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px'}}>Repository:</label>
                                <select id="simple-repo-select" style={{width: '100%', padding: '12px', fontSize: '16px', border: '2px solid var(--line)', borderRadius: '8px', background: 'var(--input-bg)', color: 'var(--fg)'}}>
                                    <option value="">Loading...</option>
                                </select>
                            </div>

                            <div style={{marginBottom: '24px'}}>
                                <label style={{display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '16px'}}>
                                    <input type="checkbox" id="simple-dense-check" checked style={{width: '24px', height: '24px', cursor: 'pointer'}} />
                                    <span style={{fontWeight: 600}}>Include Dense Embeddings (Recommended)</span>
                                </label>
                                <p style={{fontSize: '13px', color: 'var(--fg-muted)', margin: '8px 0 0 36px'}}>Enables semantic vector search via Qdrant</p>
                            </div>

                            <button id="simple-index-btn" style={{width: '100%', padding: '20px', fontSize: '20px', fontWeight: 700, background: 'var(--ok)', color: '#000', border: 'none', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,255,136,0.3)'}} onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 6px 20px rgba(0,255,136,0.4)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 12px rgba(0,255,136,0.3)'">
                                🚀 INDEX NOW
                            </button>

                            <pre id="simple-output" style={{display: 'none', marginTop: '24px', padding: '20px', background: 'var(--code-bg)', color: 'var(--code-fg)', border: '2px solid var(--line)', borderRadius: '8px', fontFamily: "'SF Mono', 'Consolas', monospace", fontSize: '12px', lineHeight: 1.5, maxHeight: '600px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordWrap: 'break-word'}}></pre>
                        </div>
                    </div>

                    {/* Indexing Operations */}
                    <div className="settings-section" style={{borderLeft: '3px solid var(--link)'}}>
                        <h3>
                            <span style={{color: 'var(--link)'}}>●</span> Build Index
                            <span className="tooltip-wrap">
                                <span className="help-icon">?</span>
                                <div className="tooltip-bubble">
                                    <span className="tt-title">Indexing Process</span>
                                    Indexing processes your codebase to enable RAG:
                                    <ul style={{marginTop: '8px', paddingLeft: '16px'}}>
                                        <li>Chunks code into semantic segments</li>
                                        <li>Creates BM25 sparse index</li>
                                        <li>Generates embeddings (OpenAI or local)</li>
                                        <li>Stores vectors in Qdrant</li>
                                    </ul>
                                    <br />
                                    Run after code changes for fresh results.
                                </div>
                            </span>
                        </h3>

                        <div className="input-row">
                            <div className="input-group">
                                <label>Repository to Index</label>
                                <select id="index-repo-select" style={{background: 'var(--bg-elev2)', color: 'var(--fg)', border: '1px solid var(--line)', padding: '8px', borderRadius: '4px'}}>
                                    {/* Populated by JS */}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Embedding Type</label>
                                <select name="EMBEDDING_TYPE" style={{background: 'var(--bg-elev2)', color: 'var(--fg)', border: '1px solid var(--line)', padding: '8px', borderRadius: '4px'}}>
                                    <option value="openai">OpenAI (text-embedding-3-large)</option>
                                    <option value="local">Local (BGE-small, no API)</option>
                                    <option value="voyage">Voyage AI</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Skip Dense Index</label>
                                <select id="index-skip-dense" style={{background: 'var(--bg-elev2)', color: 'var(--fg)', border: '1px solid var(--line)', padding: '8px', borderRadius: '4px'}}>
                                    <option value="0">No (full index)</option>
                                    <option value="1">Yes (BM25 only, faster)</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Enrich Code Chunks</label>
                                <select id="index-enrich-chunks" style={{background: 'var(--bg-elev2)', color: 'var(--fg)', border: '1px solid var(--line)', padding: '8px', borderRadius: '4px'}}>
                                    <option value="0">No (faster indexing)</option>
                                    <option value="1">Yes (adds summaries + keywords)</option>
                                </select>
                                <p className="small" style={{color: 'var(--fg-muted)', marginTop: '4px'}}>Generate AI summaries and extract keywords for each code chunk. Improves semantic search but slower.</p>
                            </div>
                        </div>

                        <div className="input-row" style={{display: 'flex', gap: '8px'}}>
                            <button className="small-button" id="btn-index-start" style={{flex: 1, background: 'var(--accent)', color: 'var(--accent-contrast)', padding: '12px', fontWeight: 600}}>
                                ▶ Start Indexing
                            </button>
                            <button className="small-button" id="btn-index-stop" style={{flex: 1, background: 'var(--err)', color: 'var(--fg)', padding: '12px', fontWeight: 600}}>
                                ■ Stop
                            </button>
                        </div>

                        <div style={{marginTop: '16px'}}>
                            <label style={{display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--accent)'}}>Progress</label>
                            <div className="progress" style={{background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', height: '24px', overflow: 'hidden'}}>
                                <div id="index-bar" style={{height: '100%', width: '0%', background: 'linear-gradient(90deg, var(--accent), var(--link))', transition: 'width 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                    <span id="index-bar-text" style={{fontSize: '11px', color: 'var(--accent-contrast)', fontWeight: 600, mixBlendMode: 'difference'}}></span>
                                </div>
                            </div>
                            <div id="index-status" className="result-display" style={{minHeight: '100px', maxHeight: '300px', overflowY: 'auto', marginTop: '12px', background: 'var(--card-bg)', color: 'var(--fg-muted)', padding: '12px', border: '1px solid var(--line)', borderRadius: '6px', fontFamily: "'SF Mono', monospace", fontSize: '11px', lineHeight: 1.6, whiteSpace: 'pre-wrap'}}></div>
                        </div>
                    </div>

                    {/* Index Settings */}
                    <div className="settings-section" style={{borderLeft: '3px solid var(--link)'}}>
                        <h3>
                            <span style={{color: 'var(--link)'}}>●</span> Advanced Settings
                        </h3>

                        <div className="input-row">
                            <div className="input-group">
                                <label>Output Directory Base</label>
                                <input type="text" name="OUT_DIR_BASE" placeholder="./out" value="./out" disabled style={{background: 'var(--bg-elev1)', cursor: 'not-allowed'}} />
                                <p className="small" style={{color: 'var(--fg-muted)'}}>Where to store index files (chunks, BM25, etc.)</p>
                                <p className="small" style={{color: 'var(--accent)', fontStyle: 'italic'}}>
                                    <strong>Note:</strong> This setting is managed in the <strong>Infrastructure</strong> tab. Value shown here is read-only.
                                </p>
                            </div>
                            <div className="input-group">
                                <label>Collection Name</label>
                                <input type="text" name="COLLECTION_NAME" placeholder="code_chunks_{repo}" />
                                <p className="small" style={{color: 'var(--fg-muted)'}}>Qdrant collection name (leave empty for auto)</p>
                            </div>
                        </div>

                        <div className="input-row">
                            <div className="input-group">
                                <label>Chunk Size (tokens)</label>
                                <input type="number" name="CHUNK_SIZE" value="1000" min="100" max="4000" step="100" />
                            </div>
                            <div className="input-group">
                                <label>Chunk Overlap (tokens)</label>
                                <input type="number" name="CHUNK_OVERLAP" value="200" min="0" max="1000" step="50" />
                            </div>
                            <div className="input-group">
                                <label>Max Workers</label>
                                <input type="number" name="INDEX_MAX_WORKERS" value="4" min="1" max="16" />
                            </div>
                        </div>

                        <button className="small-button" id="btn-save-index-settings" style={{background: 'var(--link)', color: 'var(--accent-contrast)', fontWeight: 600}}>
                            💾 Save Settings
                        </button>
                    </div>

                    {/* Index Profiles */}
                    <div className="settings-section" style={{borderLeft: '3px solid var(--err)'}}>
                        <h3>
                            <span style={{color: 'var(--err)'}}>●</span> Index Profiles
                            <span className="tooltip-wrap">
                                <span className="help-icon">?</span>
                                <div className="tooltip-bubble">
                                    <span className="tt-title">Index Profiles</span>
                                    Different index configurations for different use cases:
                                    <ul style={{marginTop: '8px', paddingLeft: '16px'}}>
                                        <li><strong>shared:</strong> Fast BM25-only, no API calls</li>
                                        <li><strong>full:</strong> BM25 + dense embeddings (best quality)</li>
                                        <li><strong>dev:</strong> Small subset for testing</li>
                                    </ul>
                                </div>
                            </span>
                        </h3>

                        <div className="input-row">
                            <div className="input-group" style={{flex: 2}}>
                                <label>Active Profile</label>
                                <select id="index-profile-select" style={{background: 'var(--bg-elev2)', color: 'var(--fg)', border: '1px solid var(--line)', padding: '8px', borderRadius: '4px'}}>
                                    <option value="shared">Shared (BM25-only, fast)</option>
                                    <option value="full">Full (BM25 + embeddings)</option>
                                    <option value="dev">Development (small subset)</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>&nbsp;</label>
                                <button className="small-button" id="btn-apply-profile" style={{background: 'var(--err)', color: 'var(--fg)', fontWeight: 600, width: '100%'}}>
                                    Apply Profile
                                </button>
                            </div>
                        </div>

                        <div id="profile-description" style={{marginTop: '12px', padding: '12px', background: 'var(--bg-elev2)', border: '1px solid var(--line)', borderRadius: '6px', fontSize: '12px', color: 'var(--fg-muted)'}}>
                            {/* Profile details populated by JS */}
                        </div>
                    </div>
                </div>

                {/* RAG Subtab: Evaluate */}
                <div id="tab-rag-evaluate" className="rag-subtab-content">
                    {/* Golden Questions Manager */}
                    <div className="settings-section" style={{borderLeft: '3px solid var(--link)'}}>
                        <h3>
                            <span className="accent-blue">●</span> Golden Questions Manager
                            <span className="tooltip-wrap">
                                <span className="help-icon">?</span>
                                <div className="tooltip-bubble">
                                    <span className="tt-title">Golden Questions</span>
                                    Questions with known-good answers used to measure RAG quality. Each question should have expected file paths that contain the answer.
                                    <div className="tt-badges">
                                        <span className="tt-badge info">Quality Assurance</span>
                                        <span className="tt-badge">No Re-index</span>
                                    </div>
                                </div>
                            </span>
                        </h3>
                        <p className="small">Manage test questions for evaluating retrieval quality. Add, edit, test individual questions, or run full evaluation suite.</p>

                        {/* Add New Question Form */}
                        <div id="golden-add-form" style={{background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px', marginBottom: '16px'}}>
                            <h4 style={{fontSize: '13px', color: 'var(--accent)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Add New Question</h4>
                            <div className="input-group" style={{marginBottom: '12px'}}>
                                <label>Question Text</label>
                                <textarea id="golden-new-q" placeholder="e.g., Where is OAuth token validated?" style={{minHeight: '60px'}}></textarea>
                            </div>
                            <div className="input-row" style={{marginBottom: '12px'}}>
                                <div className="input-group">
                                    <label>Repository</label>
                                    <select id="golden-new-repo">
                                        <option value="agro">agro</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>Expected Paths (comma-separated)</label>
                                    <input type="text" id="golden-new-paths" placeholder="auth, oauth, token" />
                                </div>
                            </div>
                            <div style={{display: 'flex', gap: '8px'}}>
                                <button className="small-button" id="btn-golden-add" style={{background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', width: 'auto', flex: 1}}>Add Question</button>
                                <button className="small-button" id="btn-golden-test-new" style={{width: 'auto'}}>Test First</button>
                            </div>
                        </div>

                        {/* Questions List */}
                        <div id="golden-questions-list" style={{background: 'var(--code-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px', maxHeight: '400px', overflowY: 'auto'}}>
                            <div id="golden-questions-content" style={{fontSize: '13px', color: 'var(--fg-muted)'}}>
                                Loading questions...
                            </div>
                        </div>

                        <div className="action-buttons" style={{marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                            <button id="btn-golden-refresh" style={{flex: 1}}>Refresh List</button>
                            <button id="btn-golden-load-recommended" style={{flex: 1, background: 'var(--bg-elev2)', color: 'var(--link)', border: '1px solid var(--link)'}}>Load Recommended</button>
                            <button id="btn-golden-run-tests" style={{flex: 1, background: 'var(--bg-elev2)', color: 'var(--link)', border: '1px solid var(--link)'}}>Run All Tests</button>
                            <button id="btn-golden-export" style={{flex: 1, background: 'var(--bg-elev2)', color: 'var(--accent)'}}>Export JSON</button>
                        </div>
                    </div>

                    {/* Evaluation Runner */}
                    <div className="settings-section" style={{borderLeft: '3px solid var(--link)'}}>
                        <h3>
                            <span className="accent-purple">●</span> Evaluation Runner
                            <span className="tooltip-wrap">
                                <span className="help-icon">?</span>
                                <div className="tooltip-bubble">
                                    <span className="tt-title">Evaluation System</span>
                                    Runs all golden questions and measures retrieval accuracy. Tracks regressions vs. saved baseline.
                                    <div className="tt-badges">
                                        <span className="tt-badge info">Accuracy Metrics</span>
                                        <span className="tt-badge warn">Can Be Slow</span>
                                    </div>
                                </div>
                            </span>
                        </h3>
                        <p className="small">Run full evaluation suite to measure RAG quality. Compare against baseline to detect regressions.</p>

                        {/* Settings */}
                        <div className="input-row" style={{marginBottom: '16px'}}>
                            <div className="input-group">
                                <label>
                                    Use Multi-Query
                                    <span className="tooltip-wrap">
                                        <span className="help-icon">?</span>
                                        <div className="tooltip-bubble">
                                            <span className="tt-title">Multi-Query Expansion</span>
                                            Generate multiple query variations for better recall. Increases API costs but improves accuracy. Recommended: enabled.
                                            <div className="tt-badges">
                                                <span className="tt-badge info">Better Recall</span>
                                                <span className="tt-badge warn">Higher Cost</span>
                                            </div>
                                        </div>
                                    </span>
                                </label>
                                <select id="eval-use-multi">
                                    <option value="1">Yes</option>
                                    <option value="0">No</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>
                                    Final K Results
                                    <span className="tooltip-wrap">
                                        <span className="help-icon">?</span>
                                        <div className="tooltip-bubble">
                                            <span className="tt-title">Results Count</span>
                                            Number of results to return per question. Higher = more context but more noise. Recommended: 5-10.
                                        </div>
                                    </span>
                                </label>
                                <input type="number" id="eval-final-k" value="5" min="1" max="20" />
                            </div>
                        </div>

                        {/* Eval Paths */}
                        <div className="input-row" style={{marginBottom: '16px'}}>
                            <div className="input-group" style={{flex: 2}}>
                                <label>
                                    Golden Questions Path
                                    <span className="tooltip-wrap">
                                        <span className="help-icon">?</span>
                                        <div className="tooltip-bubble">
                                            <span className="tt-title">GOLDEN_PATH</span>
                                            Path to your evaluation questions JSON. Defaults to data/golden.json.
                                        </div>
                                    </span>
                                </label>
                                <input type="text" id="eval-golden-path" placeholder="data/golden.json" />
                            </div>
                            <div className="input-group" style={{flex: 2}}>
                                <label>
                                    Baseline Path
                                    <span className="tooltip-wrap">
                                        <span className="help-icon">?</span>
                                        <div className="tooltip-bubble">
                                            <span className="tt-title">BASELINE_PATH</span>
                                            Where evaluation baselines are saved/compared. Defaults to data/evals/eval_baseline.json.
                                        </div>
                                    </span>
                                </label>
                                <input type="text" id="eval-baseline-path" placeholder="data/evals/eval_baseline.json" />
                            </div>
                        </div>

                        <div className="input-row" style={{marginBottom: '16px', justifyContent: 'flex-end'}}>
                            <button id="btn-eval-save-settings" className="small-button" style={{background: 'var(--bg-elev2)', color: 'var(--link)', border: '1px solid var(--link)', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer'}}>
                                Save Eval Settings
                            </button>
                        </div>

                        {/* Run Button */}
                        <button className="action-buttons" id="btn-eval-run" style={{width: '100%', background: 'var(--link)', color: 'var(--accent-contrast)', fontSize: '15px', padding: '14px'}}>
                            Run Full Evaluation
                        </button>

                        {/* Progress */}
                        <div id="eval-progress" style={{marginTop: '16px', display: 'none'}}>
                            <div style={{background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '4px', height: '8px', overflow: 'hidden', marginBottom: '8px'}}>
                                <div id="eval-progress-bar" style={{height: '100%', width: '0%', background: 'linear-gradient(90deg, var(--link) 0%, var(--accent) 100%)', transition: 'width 0.3s ease'}}></div>
                            </div>
                            <div id="eval-status" className="mono" style={{fontSize: '12px', color: 'var(--fg-muted)', textAlign: 'center'}}>—</div>
                        </div>

                        {/* Results Display */}
                        <div id="eval-results" style={{marginTop: '16px', display: 'none'}}>
                            {/* Overall Metrics */}
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px'}}>
                                <div style={{background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '12px', textAlign: 'center'}}>
                                    <div style={{fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px'}}>Top-1 Accuracy</div>
                                    <div id="eval-top1-acc" className="mono" style={{fontSize: '24px', color: 'var(--accent)', fontWeight: 700}}>—</div>
                                </div>
                                <div style={{background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '12px', textAlign: 'center'}}>
                                    <div style={{fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px'}}>Top-K Accuracy</div>
                                    <div id="eval-topk-acc" className="mono" style={{fontSize: '24px', color: 'var(--accent)', fontWeight: 700}}>—</div>
                                </div>
                                <div style={{background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '12px', textAlign: 'center'}}>
                                    <div style={{fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px'}}>Duration</div>
                                    <div id="eval-duration" className="mono" style={{fontSize: '24px', color: 'var(--link)', fontWeight: 700}}>—</div>
                                </div>
                            </div>

                            {/* Per-Question Results */}
                            <div id="eval-details" style={{background: 'var(--code-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px', maxHeight: '300px', overflowY: 'auto'}}></div>

                            {/* Baseline Actions */}
                            <div className="action-buttons" style={{marginTop: '16px'}}>
                                <button id="btn-eval-save-baseline" style={{flex: 1}}>Save as Baseline</button>
                                <button id="btn-eval-compare" style={{flex: 1, background: 'var(--bg-elev2)', color: 'var(--accent)'}}>Compare to Baseline</button>
                                <button id="btn-eval-export" style={{flex: 1, background: 'var(--bg-elev2)', color: 'var(--accent)'}}>Export Results</button>
                            </div>
                        </div>

                        {/* Comparison Results */}
                        <div id="eval-comparison" style={{marginTop: '16px', display: 'none'}}></div>

                        {/* Evaluation Run History */}
                        <div style={{marginTop: '24px', background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '8px', padding: '20px'}}>
                            <h4 style={{margin: '0 0 8px 0', color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <span style={{color: 'var(--accent-green)'}}>●</span>
                                Evaluation Run History
                            </h4>
                            <p className="small" style={{color: 'var(--fg-muted)', margin: '0 0 16px 0'}}>Compare BM25-only baseline vs trained cross-encoder performance across runs.</p>

                            <div style={{overflowX: 'auto'}}>
                                <table id="eval-history-table" style={{width: '100%', fontSize: '12px', borderCollapse: 'collapse', background: 'var(--code-bg)', border: '1px solid var(--line)', borderRadius: '6px'}}>
                                    <thead>
                                        <tr style={{background: 'var(--bg-elev2)', borderBottom: '2px solid var(--line)'}}>
                                            <th style={{padding: '10px', textAlign: 'left', color: 'var(--fg-muted)', fontWeight: 600}}>Timestamp</th>
                                            <th style={{padding: '10px', textAlign: 'left', color: 'var(--fg-muted)', fontWeight: 600}}>Configuration</th>
                                            <th style={{padding: '10px', textAlign: 'center', color: 'var(--fg-muted)', fontWeight: 600}}>Top-1</th>
                                            <th style={{padding: '10px', textAlign: 'center', color: 'var(--fg-muted)', fontWeight: 600}}>Top-5</th>
                                            <th style={{padding: '10px', textAlign: 'center', color: 'var(--fg-muted)', fontWeight: 600}}>Time (s)</th>
                                            <th style={{padding: '10px', textAlign: 'center', color: 'var(--fg-muted)', fontWeight: 600}}>Δ Top-5</th>
                                        </tr>
                                    </thead>
                                    <tbody id="eval-history-tbody">
                                        <tr>
                                            <td colspan="6" style={{padding: '20px', textAlign: 'center', color: 'var(--fg-muted)'}}>No evaluation history yet. Run evaluations to see comparisons.</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div style={{marginTop: '12px', display: 'flex', gap: '8px'}}>
                                <button id="btn-eval-history-refresh" style={{flex: 1, background: 'var(--bg-elev2)', color: 'var(--link)', border: '1px solid var(--link)', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'}}>Refresh History</button>
                                <button id="btn-eval-history-clear" style={{flex: 1, background: 'var(--bg-elev2)', color: 'var(--warn)', border: '1px solid var(--warn)', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'}}>Clear History</button>
                            </div>
                        </div>
                    </div>
                </div>
    </>
  )
}
