// Imported from /gui/index.html - contains all config parameters
// This component uses dangerouslySetInnerHTML to render the exact HTML from /gui

export function ExternalRerankersSubtab() {
  const htmlContent = `                    <div class="settings-section" style="border-left: 3px solid var(--link);">
                        <h3>
                            <span class="accent-pink">●</span> Reranking
                            <span class="tooltip-wrap">
                                <span class="help-icon">?</span>
                                <div class="tooltip-bubble">
                                    <span class="tt-title">Cross-Encoder Reranking</span>
                                    Configure reranking backend and models. Set to "none" for offline/BM25-only operation.
                                    <div class="tt-badges">
                                        <span class="tt-badge info">Quality Boost</span>
                                        <span class="tt-badge warn">May require downloads</span>
                                    </div>
                                </div>
                            </span>
                        </h3>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                Rerank Backend (RERANK_BACKEND)
                                <span class="help-icon" data-tooltip="RERANK_BACKEND">?</span>
                            </label>
                                <select name="RERANK_BACKEND">
                                    <option value="none">none</option>
                                    <option value="local">local</option>
                                    <option value="hf">hf</option>
                                    <option value="cohere">cohere</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>
                                Local/HF Model (RERANKER_MODEL)
                                <span class="help-icon" data-tooltip="RERANKER_MODEL">?</span>
                            </label>
                                <input type="text" name="RERANKER_MODEL" placeholder="cross-encoder/ms-marco-MiniLM-L-12-v2">
                            </div>
                        </div>
                        <div class="input-row" style="margin-top:8px;">
                            <div class="input-group full-width" style="background: var(--card-bg); border:1px solid var(--line); border-radius:6px; padding:10px;">
                                <div style="font-size:11px; color:var(--fg-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Current Reranker (Server)</div>
                                <div class="mono" id="reranker-info-panel-ext" style="font-size:12px; line-height:1.6;">
                                    <div>Enabled: <span id="reranker-info-enabled-ext">—</span></div>
                                    <div>Model Path: <span id="reranker-info-path-ext">—</span></div>
                                    <div>Device: <span id="reranker-info-device-ext">—</span></div>
                                    <div>Alpha: <span id="reranker-info-alpha-ext">—</span> • TopN: <span id="reranker-info-topn-ext">—</span> • Batch: <span id="reranker-info-batch-ext">—</span> • MaxLen: <span id="reranker-info-maxlen-ext">—</span></div>
                                </div>
                                <div id="rerank-none-warning" style="display:none; margin-top:8px; padding:8px; border-radius:6px; background: rgba(255, 170, 0, 0.1); border:1px dashed var(--warn); color: var(--warn); font-size:12px;">
                                    ⚠️ No reranker is effectively enabled. Searches will use raw BM25/vector fusion. Configure <strong>Rerank Backend</strong> or <strong>Cohere API Key</strong>.
                                </div>
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                Cohere Model (COHERE_RERANK_MODEL)
                                <span class="help-icon" data-tooltip="COHERE_RERANK_MODEL">?</span>
                            </label>
                                <select name="COHERE_RERANK_MODEL">
                                    <option value="">(select model)</option>
                                    <option value="rerank-3.5">rerank-3.5</option>
                                    <option value="rerank-english-v3.0">rerank-english-v3.0</option>
                                    <option value="rerank-multilingual-v3.0">rerank-multilingual-v3.0</option>
                                    <option value="rerank-english-lite-v3.0">rerank-english-lite-v3.0</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>
                                Cohere API Key (COHERE_API_KEY)
                                <span class="help-icon" data-tooltip="COHERE_API_KEY">?</span>
                            </label>
                                <input type="password" name="COHERE_API_KEY" placeholder="ck_...">
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                HF Trust Remote Code (TRANSFORMERS_TRUST_REMOTE_CODE)
                                <span class="help-icon" data-tooltip="TRANSFORMERS_TRUST_REMOTE_CODE">?</span>
                            </label>
                                <select name="TRANSFORMERS_TRUST_REMOTE_CODE">
                                    <option value="1">1</option>
                                    <option value="0">0</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>
                                Input Snippet Chars (RERANK_INPUT_SNIPPET_CHARS)
                                <span class="help-icon" data-tooltip="RERANK_INPUT_SNIPPET_CHARS">?</span>
                            </label>
                                <input type="number" name="RERANK_INPUT_SNIPPET_CHARS" value="700" min="200" max="2000" step="50">
                            </div>
                        </div>
                    </div>
                </div>

`;
  
  return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
}
