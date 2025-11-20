// Imported from /gui/index.html - contains all config parameters
// This component uses dangerouslySetInnerHTML to render the exact HTML from /gui

export function DataQualitySubtab() {
  const htmlContent = `                    <div id="data-quality-loading" class="loading-panel" role="status" aria-live="polite" style="display:none; background: var(--card-bg); border: 1px solid var(--line); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <span id="data-quality-loading-label" style="font-weight:600; color: var(--fg);">Preparing Data Quality…</span>
                            <span id="data-quality-loading-percent" class="mono" style="color: var(--accent);">0%</span>
                        </div>
                        <div style="height:8px; background: var(--bg-elev2); border: 1px solid var(--line); border-radius:999px; overflow:hidden;">
                            <div id="data-quality-loading-bar" style="width:0%; height:100%; background: linear-gradient(90deg, var(--accent) 0%, var(--link) 100%); transition: width 0.3s ease;"></div>
                        </div>
                        <div id="data-quality-loading-step" class="small" style="margin-top:8px; color: var(--fg-muted);">Initializing…</div>
                    </div>

                    <!-- Repository Configuration -->
                    <div class="settings-section">
                        <h3>Repository Configuration</h3>
                        <div id="repos-section"></div>
                    </div>

                    <!-- Cards Builder & Viewer -->
                    <div class="settings-section" style="border-left: 3px solid var(--accent);">
                        <h3>
                            <span class="accent-green">●</span> Code Cards Builder & Viewer
                            <span class="tooltip-wrap">
                                <span class="help-icon">?</span>
                                <div class="tooltip-bubble">
                                    <span class="tt-title">Code Cards</span>
                                    High-level semantic summaries of code chunks for faster retrieval with AI-powered enrichment and filtering.
                                </div>
                            </span>
                        </h3>

                        <!-- Repository Selection -->
                        <div class="input-row" style="margin-bottom: 12px;">
                            <div class="input-group">
                                <label>
                                    Repository to Build Cards For
                                    <span class="help-icon" data-tooltip="CARDS_REPO">?</span>
                                </label>
                                <select id="cards-repo-select" style="width: 100%;">
                                    <option value="">Loading...</option>
                                </select>
                            </div>
                        </div>

                        <!-- Filters -->
                        <div class="input-row" style="margin-bottom: 12px;">
                            <div class="input-group">
                                <label>
                                    Exclude Directories (comma-separated)
                                    <span class="help-icon" data-tooltip="CARDS_EXCLUDE_DIRS">?</span>
                                </label>
                                <input type="text" id="cards-exclude-dirs" placeholder="e.g., node_modules, vendor, dist" style="width: 100%;">
                                <p class="small" style="color:var(--fg-muted);">Directories to skip when building cards</p>
                            </div>
                        </div>

                        <div class="input-row" style="margin-bottom: 12px;">
                            <div class="input-group">
                                <label>
                                    Exclude Patterns (comma-separated)
                                    <span class="help-icon" data-tooltip="CARDS_EXCLUDE_PATTERNS">?</span>
                                </label>
                                <input type="text" id="cards-exclude-patterns" placeholder="e.g., .test.js, .spec.ts, .min.js" style="width: 100%;">
                                <p class="small" style="color:var(--fg-muted);">File patterns to skip</p>
                            </div>
                        </div>

                        <div class="input-row" style="margin-bottom: 16px;">
                            <div class="input-group">
                                <label>
                                    Exclude Keywords (comma-separated)
                                    <span class="help-icon" data-tooltip="CARDS_EXCLUDE_KEYWORDS">?</span>
                                </label>
                                <input type="text" id="cards-exclude-keywords" placeholder="e.g., deprecated, legacy, TODO" style="width: 100%;">
                                <p class="small" style="color:var(--fg-muted);">Skip chunks containing these keywords</p>
                            </div>
                        </div>

                        <!-- Options -->
                        <div class="input-row" style="margin-bottom: 16px; align-items: flex-end;">
                            <div class="input-group">
                                <label>
                                    Cards Max
                                    <span class="help-icon" data-tooltip="CARDS_MAX">?</span>
                                </label>
                                <input type="number" id="cards-max" name="CARDS_MAX" value="0" min="0" step="10" style="max-width: 160px;">
                                <p class="small" style="color:var(--fg-muted);">Limit chunks (0 = all)</p>
                            </div>
                            <div class="input-group">
                                <label>
                                    <input type="checkbox" id="cards-enrich-gui" checked> Enrich with AI
                                </label>
                                <p class="small" style="color:var(--fg-muted);">Use LLM for rich semantic cards</p>
                            </div>
                        </div>

                        <!-- PERMANENT VISIBLE PROGRESS DISPLAY -->
                        <div id="cards-progress-container" style="display: none; background: var(--card-bg); border: 2px solid var(--accent); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                <div style="font-weight: 700; font-size: 16px; color: var(--fg);">⚡ Building Cards...</div>
                                <div id="cards-progress-repo" style="font-size: 12px; font-weight: 600; color: var(--accent);"></div>
                            </div>

                            <div id="cards-progress-models" style="font-family: 'SF Mono', monospace; font-size: 11px; color: var(--fg-muted); margin-bottom: 8px; display:none;">
                                Models — embed: <span data-model="embed">—</span> • enrich: <span data-model="enrich">—</span> • rerank: <span data-model="rerank">—</span>
                            </div>

                            <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                                <div id="cards-progress-stage-scan" class="cards-stage-pill" style="font-size: 11px; padding: 4px 8px; border-radius: 4px; border: 1px solid var(--line); color: var(--fg-muted); background: transparent;">scan</div>
                                <div id="cards-progress-stage-chunk" class="cards-stage-pill" style="font-size: 11px; padding: 4px 8px; border-radius: 4px; border: 1px solid var(--line); color: var(--fg-muted); background: transparent;">chunk</div>
                                <div id="cards-progress-stage-summarize" class="cards-stage-pill" style="font-size: 11px; padding: 4px 8px; border-radius: 4px; border: 1px solid var(--line); color: var(--fg-muted); background: transparent;">summarize</div>
                                <div id="cards-progress-stage-sparse" class="cards-stage-pill" style="font-size: 11px; padding: 4px 8px; border-radius: 4px; border: 1px solid var(--line); color: var(--fg-muted); background: transparent;">sparse</div>
                                <div id="cards-progress-stage-write" class="cards-stage-pill" style="font-size: 11px; padding: 4px 8px; border-radius: 4px; border: 1px solid var(--line); color: var(--fg-muted); background: transparent;">write</div>
                                <div id="cards-progress-stage-finalize" class="cards-stage-pill" style="font-size: 11px; padding: 4px 8px; border-radius: 4px; border: 1px solid var(--line); color: var(--fg-muted); background: transparent;">finalize</div>
                            </div>

                            <div style="background: var(--bg-elev1); border: 1px solid var(--line); border-radius: 6px; height: 24px; overflow: hidden; margin-bottom: 8px; position: relative;">
                                <div id="cards-progress-bar" style="height: 100%; width: 0%; background: linear-gradient(90deg, var(--ok) 0%, var(--accent) 100%); transition: width 0.3s ease;"></div>
                            </div>

                            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-family: 'SF Mono', monospace; color: var(--fg); margin-bottom: 12px;">
                                <div id="cards-progress-stats" style="font-weight: 600;">0 / 0 (0%)</div>
                                <div id="cards-progress-throughput" style="color: var(--link);">--</div>
                                <div id="cards-progress-eta" style="color: var(--warn);">ETA: --</div>
                            </div>

                            <div id="cards-progress-tip" style="font-size: 12px; color: var(--link); margin-bottom: 12px; font-style: italic; padding: 8px; background: var(--bg-elev2); border-radius: 4px;">
                                💡 Starting...
                            </div>

                            <div style="display: flex; gap: 8px;">
                                <button id="cards-progress-cancel" class="small-button" style="flex: 1; background: var(--err); color: #fff; font-weight: 600;">
                                    ■ Cancel Build
                                </button>
                                <button id="cards-progress-logs" class="small-button" style="flex: 1; background: var(--bg-elev2); color: var(--link); border: 1px solid var(--link);">
                                    📄 View Logs
                                </button>
                                <button id="cards-progress-clear" class="small-button" style="flex: 1; background: var(--bg-elev2); color: var(--fg-muted); border: 1px solid var(--line);">
                                    ✕ Clear
                                </button>
                            </div>
                        </div>

                        <div id="cards-terminal-container"></div>

                        <!-- Build Button -->
                        <div class="action-buttons" style="margin-bottom: 16px; display:flex; gap:8px;">
                            <button id="btn-cards-build" style="flex: 1; background: var(--accent); color: var(--fg); font-weight: 600; padding: 12px;">
                                <span style="margin-right: 4px;">⚡</span> Build Cards
                            </button>
                            <button id="btn-cards-refresh" style="flex: 1; background: var(--bg-elev2); color: var(--ok); border: 1px solid var(--ok);">
                                <span style="margin-right: 4px;">↻</span> Refresh
                            </button>
                            <button id="btn-cards-view-all" style="flex: 1; background: var(--bg-elev2); color: var(--link); border: 1px solid var(--link);">
                                <span style="margin-right: 4px;">📋</span> View All
                            </button>
                        </div>

                        <!-- Cards Viewer -->
                        <div id="cards-viewer-container" style="background: var(--card-bg); border: 1px solid var(--line); border-radius: 6px; padding: 16px; min-height: 300px; max-height: 600px; overflow-y: auto;">
                            <div id="cards-last-build" class="mono" style="font-size: 11px; color: var(--fg-muted); margin-bottom: 8px; display:none;"></div>
                            <div id="cards-viewer" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:16px; width:100%;"></div>
                        </div>
                        <p class="small" style="color: var(--fg-muted); margin-top:8px;">Click a card to navigate to its source location.</p>
                    </div>

                    <!-- Semantic Synonyms Note -->
                    <div class="settings-section" style="border-left: 3px solid var(--link);">
                        <h3>
                            <span style="color: var(--link);">●</span> Semantic Synonyms
                            <span class="tooltip-wrap">
                                <span class="help-icon">?</span>
                                <div class="tooltip-bubble">
                                    <span class="tt-title">Synonym Expansion</span>
                                    Expands queries with semantic synonyms to improve retrieval. Example: "auth" → "auth authentication oauth jwt bearer". Configured via data/semantic_synonyms.json
                                </div>
                            </span>
                        </h3>
                        <p>Semantic synonyms are configured in <code>data/semantic_synonyms.json</code>. Enable/disable via the Retrieval tab settings (USE_SEMANTIC_SYNONYMS).</p>
                    </div>
`;
  
  return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
}
