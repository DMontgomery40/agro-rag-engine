// Imported from /gui/index.html - contains all config parameters
// This component uses dangerouslySetInnerHTML to render the exact HTML from /gui

export function IndexingSubtab() {
  const htmlContent = `                    <!-- Current Repo Display -->
                    <div style="background: var(--bg-elev1); border: 2px solid var(--ok); border-radius: 8px; padding: 16px 24px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="color: var(--fg-muted); font-size: 13px; font-family: 'SF Mono', monospace; text-transform: uppercase; letter-spacing: 0.5px;">Current Repo:</span>
                            <select id="indexing-repo-selector" style="background: var(--ok); color: #000; border: none; padding: 6px 12px; border-radius: 4px; font-size: 14px; font-weight: 700; font-family: 'SF Mono', monospace; cursor: pointer;">
                                <option value="">Loading...</option>
                            </select>
                        </div>
                        <div style="color: var(--fg-muted); font-size: 11px; font-family: 'SF Mono', monospace;">
                            <span style="color: var(--fg-muted);">Branch:</span> <span id="indexing-branch-display" style="color: var(--link); font-weight: 600;">—</span>
                        </div>
                    </div>

                    <!-- ONE SIMPLE INDEX BUTTON -->
                    <div class="settings-section" style="border-left: 3px solid var(--ok); padding: 32px;">
                        <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700;">
                            🚀 Index Repository
                        </h2>

                        <div style="max-width: 800px;">
                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px;">Repository:</label>
                                <select id="simple-repo-select" style="width: 100%; padding: 12px; font-size: 16px; border: 2px solid var(--line); border-radius: 8px; background: var(--input-bg); color: var(--fg);">
                                    <option value="">Loading...</option>
                                </select>
                            </div>

                            <div style="margin-bottom: 24px;">
                                <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; font-size: 16px;">
                                    <input type="checkbox" id="simple-dense-check" checked style="width: 24px; height: 24px; cursor: pointer;">
                                    <span style="font-weight: 600;">Include Dense Embeddings (Recommended)</span>
                                </label>
                                <p style="font-size: 13px; color: var(--fg-muted); margin: 8px 0 0 36px;">Enables semantic vector search via Qdrant</p>
                            </div>

                            <button id="simple-index-btn" style="
                                width: 100%;
                                padding: 20px;
                                font-size: 20px;
                                font-weight: 700;
                                background: var(--ok);
                                color: #000;
                                border: none;
                                border-radius: 12px;
                                cursor: pointer;
                                transition: all 0.2s;
                                box-shadow: 0 4px 12px rgba(0,255,136,0.3);
                            " onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 6px 20px rgba(0,255,136,0.4)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 12px rgba(0,255,136,0.3)'">
                                🚀 INDEX NOW
                            </button>

                            <pre id="simple-output" style="
                                display: none;
                                margin-top: 24px;
                                padding: 20px;
                                background: var(--code-bg);
                                color: var(--code-fg);
                                border: 2px solid var(--line);
                                border-radius: 8px;
                                font-family: 'SF Mono', 'Consolas', monospace;
                                font-size: 12px;
                                line-height: 1.5;
                                max-height: 600px;
                                overflow-y: auto;
                                white-space: pre-wrap;
                                word-wrap: break-word;
                            "></pre>
                        </div>
                    </div>

                    <!-- Indexing Operations -->
                    <div class="settings-section" style="border-left: 3px solid var(--link);">
                        <h3>
                            <span style="color: var(--link);">●</span> Build Index
                            <span class="tooltip-wrap">
                                <span class="help-icon">?</span>
                                <div class="tooltip-bubble">
                                    <span class="tt-title">Indexing Process</span>
                                    Indexing processes your codebase to enable RAG:
                                    <ul style="margin-top:8px; padding-left:16px;">
                                        <li>Chunks code into semantic segments</li>
                                        <li>Creates BM25 sparse index</li>
                                        <li>Generates embeddings (OpenAI or local)</li>
                                        <li>Stores vectors in Qdrant</li>
                                    </ul>
                                    <br>
                                    Run after code changes for fresh results.
                                </div>
                            </span>
                        </h3>

                        <div class="input-row">
                            <div class="input-group">
                                <label>Repository to Index</label>
                                <select id="index-repo-select" style="background: var(--bg-elev2); color: var(--fg); border: 1px solid var(--line); padding: 8px; border-radius: 4px;">
                                    <!-- Populated by JS -->
                                </select>
                            </div>
                            <div class="input-group">
                                <label>
                                Embedding Type
                                <span class="help-icon" data-tooltip="EMBEDDING_TYPE">?</span>
                            </label>
                                <select name="EMBEDDING_TYPE" style="background: var(--bg-elev2); color: var(--fg); border: 1px solid var(--line); padding: 8px; border-radius: 4px;">
                                    <option value="openai">OpenAI (text-embedding-3-large)</option>
                                    <option value="local">Local (BGE-small, no API)</option>
                                    <option value="voyage">Voyage AI</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>Skip Dense Index</label>
                                <select id="index-skip-dense" style="background: var(--bg-elev2); color: var(--fg); border: 1px solid var(--line); padding: 8px; border-radius: 4px;">
                                    <option value="0">No (full index)</option>
                                    <option value="1">Yes (BM25 only, faster)</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>Enrich Code Chunks</label>
                                <select id="index-enrich-chunks" style="background: var(--bg-elev2); color: var(--fg); border: 1px solid var(--line); padding: 8px; border-radius: 4px;">
                                    <option value="0">No (faster indexing)</option>
                                    <option value="1">Yes (adds summaries + keywords)</option>
                                </select>
                                <p class="small" style="color: var(--fg-muted); margin-top: 4px;">Generate AI summaries and extract keywords for each code chunk. Improves semantic search but slower.</p>
                            </div>
                        </div>

                        <div class="input-row" style="display: flex; gap: 8px;">
                            <button class="small-button" id="btn-index-start" style="flex: 1; background: var(--accent); color: var(--accent-contrast); padding: 12px; font-weight: 600;">
                                ▶ Start Indexing
                            </button>
                            <button class="small-button" id="btn-index-stop" style="flex: 1; background: var(--err); color: var(--fg); padding: 12px; font-weight: 600;">
                                ■ Stop
                            </button>
                        </div>

                        <div style="margin-top: 16px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--accent);">Progress</label>
                            <div class="progress" style="background:var(--card-bg); border:1px solid var(--line); border-radius:6px; height:24px; overflow:hidden;">
                                <div id="index-bar" style="height:100%; width:0%; background: linear-gradient(90deg, var(--accent), var(--link)); transition: width 0.3s ease; display: flex; align-items: center; justify-content: center;">
                                    <span id="index-bar-text" style="font-size: 11px; color: var(--accent-contrast); font-weight: 600; mix-blend-mode: difference;"></span>
                                </div>
                            </div>
                            <div id="index-status" class="result-display" style="min-height: 100px; max-height: 300px; overflow-y: auto; margin-top: 12px; background: var(--card-bg); color: var(--fg-muted); padding: 12px; border: 1px solid var(--line); border-radius: 6px; font-family: 'SF Mono', monospace; font-size: 11px; line-height: 1.6; white-space: pre-wrap;"></div>
                        </div>
                    </div>

                    <!-- Index Settings -->
                    <div class="settings-section" style="border-left: 3px solid var(--link);">
                        <h3>
                            <span style="color: var(--link);">●</span> Advanced Settings
                        </h3>

                        <div class="input-row">
                            <div class="input-group">
                                <label>Output Directory Base</label>
                                <input type="text" name="OUT_DIR_BASE" placeholder="./out" value="./out" disabled="disabled" style="background: var(--bg-elev1); cursor: not-allowed;">
                                <p class="small" style="color: var(--fg-muted);">Where to store index files (chunks, BM25, etc.)</p>
                                <p class="small" style="color: var(--accent); font-style: italic;">
                                    <strong>Note:</strong> This setting is managed in the <strong>Infrastructure</strong> tab. Value shown here is read-only.
                                </p>
                            </div>
                            <div class="input-group">
                                <label>
                                Collection Name
                                <span class="help-icon" data-tooltip="COLLECTION_NAME">?</span>
                            </label>
                                <input type="text" name="COLLECTION_NAME" placeholder="code_chunks_{repo}">
                                <p class="small" style="color: var(--fg-muted);">Qdrant collection name (leave empty for auto)</p>
                            </div>
                        </div>

                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                Chunk Size (tokens)
                                <span class="help-icon" data-tooltip="CHUNK_SIZE">?</span>
                            </label>
                                <input type="number" name="CHUNK_SIZE" value="1000" min="100" max="4000" step="100">
                            </div>
                            <div class="input-group">
                                <label>
                                Chunk Overlap (tokens)
                                <span class="help-icon" data-tooltip="CHUNK_OVERLAP">?</span>
                            </label>
                                <input type="number" name="CHUNK_OVERLAP" value="200" min="0" max="1000" step="50">
                            </div>
                            <div class="input-group">
                                <label>
                                Max Workers
                                <span class="help-icon" data-tooltip="INDEX_MAX_WORKERS">?</span>
                            </label>
                                <input type="number" name="INDEX_MAX_WORKERS" value="4" min="1" max="16">
                            </div>
                        </div>

                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    AST Overlap Lines
                                    <span class="help-icon" data-tooltip="AST_OVERLAP_LINES">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="AST_OVERLAP_LINES"
                                    name="AST_OVERLAP_LINES"
                                    value="20"
                                    min="0"
                                    max="100"
                                    step="5"
                                />
                            </div>
                            <div class="input-group">
                                <label>
                                    Max Chunk Size (bytes)
                                    <span class="help-icon" data-tooltip="MAX_CHUNK_SIZE">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="MAX_CHUNK_SIZE"
                                    name="MAX_CHUNK_SIZE"
                                    value="2000000"
                                    min="10000"
                                    max="10000000"
                                    step="100000"
                                />
                            </div>
                        </div>

                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Min Chunk Chars
                                    <span class="help-icon" data-tooltip="MIN_CHUNK_CHARS">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="MIN_CHUNK_CHARS"
                                    name="MIN_CHUNK_CHARS"
                                    value="50"
                                    min="10"
                                    max="500"
                                    step="10"
                                />
                            </div>
                            <div class="input-group">
                                <label>
                                    Greedy Fallback Target
                                    <span class="help-icon" data-tooltip="GREEDY_FALLBACK_TARGET">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="GREEDY_FALLBACK_TARGET"
                                    name="GREEDY_FALLBACK_TARGET"
                                    value="800"
                                    min="200"
                                    max="2000"
                                    step="100"
                                />
                            </div>
                        </div>

                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Chunking Strategy
                                    <span class="help-icon" data-tooltip="CHUNKING_STRATEGY">?</span>
                                </label>
                                <select id="CHUNKING_STRATEGY" name="CHUNKING_STRATEGY">
                                    <option value="ast">AST-based</option>
                                    <option value="greedy">Greedy</option>
                                    <option value="hybrid">Hybrid</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>
                                    Preserve Imports
                                    <span class="help-icon" data-tooltip="PRESERVE_IMPORTS">?</span>
                                </label>
                                <select id="PRESERVE_IMPORTS" name="PRESERVE_IMPORTS">
                                    <option value="1">Yes</option>
                                    <option value="0">No</option>
                                </select>
                            </div>
                        </div>

                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Indexing Batch Size
                                    <span class="help-icon" data-tooltip="INDEXING_BATCH_SIZE">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="INDEXING_BATCH_SIZE"
                                    name="INDEXING_BATCH_SIZE"
                                    value="100"
                                    min="10"
                                    max="1000"
                                    step="10"
                                />
                            </div>
                            <div class="input-group">
                                <label>
                                    Indexing Workers
                                    <span class="help-icon" data-tooltip="INDEXING_WORKERS">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="INDEXING_WORKERS"
                                    name="INDEXING_WORKERS"
                                    value="4"
                                    min="1"
                                    max="16"
                                    step="1"
                                />
                            </div>
                        </div>

                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    BM25 Tokenizer
                                    <span class="help-icon" data-tooltip="BM25_TOKENIZER">?</span>
                                </label>
                                <select id="BM25_TOKENIZER" name="BM25_TOKENIZER">
                                    <option value="stemmer">Stemmer</option>
                                    <option value="lowercase">Lowercase</option>
                                    <option value="whitespace">Whitespace</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>
                                    BM25 Stemmer Language
                                    <span class="help-icon" data-tooltip="BM25_STEMMER_LANG">?</span>
                                </label>
                                <input
                                    type="text"
                                    id="BM25_STEMMER_LANG"
                                    name="BM25_STEMMER_LANG"
                                    value="english"
                                />
                            </div>
                        </div>

                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Index Excluded Extensions
                                    <span class="help-icon" data-tooltip="INDEX_EXCLUDED_EXTS">?</span>
                                </label>
                                <input
                                    type="text"
                                    id="INDEX_EXCLUDED_EXTS"
                                    name="INDEX_EXCLUDED_EXTS"
                                    value=".png,.jpg,.gif,.ico,.svg,.woff,.ttf"
                                />
                            </div>
                            <div class="input-group">
                                <label>
                                    Max File Size (MB)
                                    <span class="help-icon" data-tooltip="INDEX_MAX_FILE_SIZE_MB">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="INDEX_MAX_FILE_SIZE_MB"
                                    name="INDEX_MAX_FILE_SIZE_MB"
                                    value="10"
                                    min="1"
                                    max="100"
                                    step="1"
                                />
                            </div>
                        </div>

                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Embedding Model
                                    <span class="help-icon" data-tooltip="EMBEDDING_MODEL">?</span>
                                </label>
                                <input
                                    type="text"
                                    id="EMBEDDING_MODEL"
                                    name="EMBEDDING_MODEL"
                                    value="text-embedding-3-large"
                                />
                            </div>
                            <div class="input-group">
                                <label>
                                    Embedding Dimensions
                                    <span class="help-icon" data-tooltip="EMBEDDING_DIM">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="EMBEDDING_DIM"
                                    name="EMBEDDING_DIM"
                                    value="3072"
                                    min="512"
                                    max="3072"
                                    step="256"
                                />
                            </div>
                        </div>

                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Voyage Model
                                    <span class="help-icon" data-tooltip="VOYAGE_MODEL">?</span>
                                </label>
                                <input
                                    type="text"
                                    id="VOYAGE_MODEL"
                                    name="VOYAGE_MODEL"
                                    value="voyage-code-3"
                                />
                            </div>
                            <div class="input-group">
                                <label>
                                    Local Embedding Model
                                    <span class="help-icon" data-tooltip="EMBEDDING_MODEL_LOCAL">?</span>
                                </label>
                                <input
                                    type="text"
                                    id="EMBEDDING_MODEL_LOCAL"
                                    name="EMBEDDING_MODEL_LOCAL"
                                    value="all-MiniLM-L6-v2"
                                />
                            </div>
                        </div>

                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Embedding Batch Size
                                    <span class="help-icon" data-tooltip="EMBEDDING_BATCH_SIZE">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="EMBEDDING_BATCH_SIZE"
                                    name="EMBEDDING_BATCH_SIZE"
                                    value="64"
                                    min="1"
                                    max="256"
                                    step="8"
                                />
                            </div>
                            <div class="input-group">
                                <label>
                                    Embedding Max Tokens
                                    <span class="help-icon" data-tooltip="EMBEDDING_MAX_TOKENS">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="EMBEDDING_MAX_TOKENS"
                                    name="EMBEDDING_MAX_TOKENS"
                                    value="8000"
                                    min="512"
                                    max="8192"
                                    step="512"
                                />
                            </div>
                        </div>

                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Embedding Cache Enabled
                                    <span class="help-icon" data-tooltip="EMBEDDING_CACHE_ENABLED">?</span>
                                </label>
                                <select id="EMBEDDING_CACHE_ENABLED" name="EMBEDDING_CACHE_ENABLED">
                                    <option value="1">Enabled</option>
                                    <option value="0">Disabled</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>
                                    Embedding Timeout (seconds)
                                    <span class="help-icon" data-tooltip="EMBEDDING_TIMEOUT">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="EMBEDDING_TIMEOUT"
                                    name="EMBEDDING_TIMEOUT"
                                    value="30"
                                    min="5"
                                    max="120"
                                    step="5"
                                />
                            </div>
                        </div>

                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Embedding Retry Max
                                    <span class="help-icon" data-tooltip="EMBEDDING_RETRY_MAX">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="EMBEDDING_RETRY_MAX"
                                    name="EMBEDDING_RETRY_MAX"
                                    value="3"
                                    min="1"
                                    max="5"
                                    step="1"
                                />
                            </div>
                        </div>

                        <button class="small-button" id="btn-save-index-settings" style="background: var(--link); color: var(--accent-contrast); font-weight: 600;">
                            💾 Save Settings
                        </button>
                    </div>

                    <!-- Index Profiles -->
                    <div class="settings-section" style="border-left: 3px solid var(--err);">
                        <h3>
                            <span style="color: var(--err);">●</span> Index Profiles
                            <span class="tooltip-wrap">
                                <span class="help-icon">?</span>
                                <div class="tooltip-bubble">
                                    <span class="tt-title">Index Profiles</span>
                                    Different index configurations for different use cases:
                                    <ul style="margin-top:8px; padding-left:16px;">
                                        <li><strong>shared:</strong> Fast BM25-only, no API calls</li>
                                        <li><strong>full:</strong> BM25 + dense embeddings (best quality)</li>
                                        <li><strong>dev:</strong> Small subset for testing</li>
                                    </ul>
                                </div>
                            </span>
                        </h3>

                        <div class="input-row">
                            <div class="input-group" style="flex: 2;">
                                <label>Active Profile</label>
                                <select id="index-profile-select" style="background: var(--bg-elev2); color: var(--fg); border: 1px solid var(--line); padding: 8px; border-radius: 4px;">
                                    <option value="shared">Shared (BM25-only, fast)</option>
                                    <option value="full">Full (BM25 + embeddings)</option>
                                    <option value="dev">Development (small subset)</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>&nbsp;</label>
                                <button class="small-button" id="btn-apply-profile" style="background: var(--err); color: var(--fg); font-weight: 600; width: 100%;">
                                    Apply Profile
                                </button>
                            </div>
                        </div>

                        <div id="profile-description" style="margin-top: 12px; padding: 12px; background: var(--bg-elev2); border: 1px solid var(--line); border-radius: 6px; font-size: 12px; color: var(--fg-muted);">
                            <!-- Profile details populated by JS -->
                        </div>
                    </div>
                </div>

`;
  
  return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
}
