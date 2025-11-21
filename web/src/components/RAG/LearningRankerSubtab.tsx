// Imported from /gui/index.html - contains all config parameters
// This component uses dangerouslySetInnerHTML to render the exact HTML from /gui

export function LearningRankerSubtab() {
  const htmlContent = `                    <div class="settings-section" style="border-left: 3px solid var(--link);">
                        <h2 style="color: var(--link);">🧠 Learning Reranker System</h2>
                        <p class="small">Self-improving retrieval through user feedback. Trains a cross-encoder that learns from thumbs-up/down and clicks to rank better results higher - without touching your chat model.</p>
                    </div>

                    <!-- Status Overview -->
                    <div class="settings-section">
                        <h3>📊 System Status</h3>
                        <div class="input-row">
                            <div class="input-group">
                                <label>Reranker Status</label>
                                <div id="reranker-enabled-status" style="padding: 8px; background: var(--card-bg); border-radius: 4px; font-family: 'SF Mono', monospace; font-size: 13px;">...</div>
                            </div>
                            <div class="input-group">
                                <label>Logged Queries</label>
                                <div id="reranker-query-count" style="padding: 8px; background: var(--card-bg); border-radius: 4px; font-family: 'SF Mono', monospace; font-size: 13px;">...</div>
                            </div>
                            <div class="input-group">
                                <label>Training Triplets</label>
                                <div id="reranker-triplet-count" style="padding: 8px; background: var(--card-bg); border-radius: 4px; font-family: 'SF Mono', monospace; font-size: 13px;">...</div>
                            </div>
                        </div>
                    </div>

                    <!-- Training Workflow -->
                    <div class="settings-section" style="border-left: 3px solid var(--accent);">
                        <h3>🎓 Training Workflow</h3>
                        <p class="small">Click buttons below in order. Each step shows progress and results.</p>

                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 16px 0;">
                            <div style="background: var(--chip-bg); border: 1px solid var(--line); border-radius: 6px; padding: 16px;">
                                <h4 style="margin: 0 0 8px 0; color: var(--link);">1. Mine Triplets</h4>
                                <p style="font-size: 11px; color: var(--fg-muted); margin-bottom: 12px;">Extract training data from logs</p>
                                <button id="reranker-mine-btn" style="width: 100%; background: var(--link); color: var(--fg); border: none; padding: 8px; border-radius: 4px; cursor: pointer; font-weight: 600;">Mine Triplets</button>
                                <div id="reranker-mine-result" style="margin-top: 8px; font-size: 11px; color: var(--fg-muted);"></div>
                            </div>

                            <div style="background: var(--chip-bg); border: 1px solid var(--line); border-radius: 6px; padding: 16px;">
                                <h4 style="margin: 0 0 8px 0; color: var(--accent);">2. Train Model</h4>
                                <p style="font-size: 11px; color: var(--fg-muted); margin-bottom: 12px;">Fine-tune cross-encoder (5-15 min)</p>
                                <button id="reranker-train-btn" style="width: 100%; background: var(--accent); color: var(--accent-contrast); border: none; padding: 8px; border-radius: 4px; cursor: pointer; font-weight: 600;">Train Model</button>
                                <div id="reranker-train-result" style="margin-top: 8px; font-size: 11px; color: var(--fg-muted);"></div>
                            </div>

                            <div style="background: var(--chip-bg); border: 1px solid var(--line); border-radius: 6px; padding: 16px;">
                                <h4 style="margin: 0 0 8px 0; color: var(--warn);">3. Evaluate</h4>
                                <p style="font-size: 11px; color: var(--fg-muted); margin-bottom: 12px;">Measure MRR and Hit@K metrics</p>
                                <button id="reranker-eval-btn" style="width: 100%; background: var(--warn); color: var(--fg); border: none; padding: 8px; border-radius: 4px; cursor: pointer; font-weight: 600;">Evaluate</button>
                                <div id="reranker-eval-result" style="margin-top: 8px; font-size: 11px; color: var(--fg-muted);"></div>
                            </div>
                        </div>

                        <div style="margin-top: 16px; padding: 12px; background: var(--card-bg); border-radius: 6px; border-left: 3px solid var(--link);">
                            <div style="font-size: 12px; color: var(--fg-muted); margin-bottom: 4px;">Current Task:</div>
                            <div id="reranker-status" style="font-size: 14px; font-family: 'SF Mono', monospace; color: var(--fg-muted);">Ready</div>
                        </div>

                        <!-- Live Terminal Container -->
                        <div id="reranker-terminal-container"></div>
                    </div>

                    <!-- Settings -->
                    <div class="settings-section">
                        <h3>⚙️ Reranker Configuration</h3>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                Enable Learning Reranker
                                <span class="help-icon" data-tooltip="AGRO_RERANKER_ENABLED">?</span>
                            </label>
                                <select name="AGRO_RERANKER_ENABLED">
                                    <option value="0">OFF</option>
                                    <option value="1">ON</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>
                                Model Path (AGRO_RERANKER_MODEL_PATH)
                                <span class="help-icon" data-tooltip="AGRO_RERANKER_MODEL_PATH">?</span>
                            </label>
                                <input type="text" name="AGRO_RERANKER_MODEL_PATH" placeholder="cross-encoder/ms-marco-MiniLM-L-12-v2" value="models/cross-encoder-agro">
                            </div>
                            <div class="input-group">
                                <label>
                                Telemetry Log Path
                                <span class="help-icon" data-tooltip="AGRO_LOG_PATH">?</span>
                            </label>
                                <input type="text" name="AGRO_LOG_PATH" placeholder="data/logs/queries.jsonl" value="data/logs/queries.jsonl">
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                Triplets Output (AGRO_TRIPLETS_PATH)
                                <span class="help-icon" data-tooltip="AGRO_TRIPLETS_PATH">?</span>
                            </label>
                                <input type="text" name="AGRO_TRIPLETS_PATH" placeholder="data/training/triplets.jsonl" value="data/training/triplets.jsonl">
                            </div>
                            <div class="input-group">
                                <label>
                                Mine Mode (AGRO_RERANKER_MINE_MODE)
                                <span class="help-icon" data-tooltip="AGRO_RERANKER_MINE_MODE">?</span>
                            </label>
                                <select name="AGRO_RERANKER_MINE_MODE">
                                    <option value="append">append</option>
                                    <option value="replace">replace</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>
                                Reset Before Mine (AGRO_RERANKER_MINE_RESET)
                                <span class="help-icon" data-tooltip="AGRO_RERANKER_MINE_RESET">?</span>
                            </label>
                                <select name="AGRO_RERANKER_MINE_RESET">
                                    <option value="0">No</option>
                                    <option value="1">Yes</option>
                                </select>
                            </div>
                        </div>
                        <div class="input-row" style="margin-top:8px;">
                            <div class="input-group full-width" style="background: var(--card-bg); border:1px solid var(--line); border-radius:6px; padding:10px;">
                                <div style="font-size:11px; color:var(--fg-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Current Reranker (Server)</div>
                                <div class="mono" id="reranker-info-panel" style="font-size:12px; line-height:1.6;">
                                    <div>Enabled: <span id="reranker-info-enabled">—</span></div>
                                    <div>Model Path: <span id="reranker-info-path">—</span></div>
                                    <div>Device: <span id="reranker-info-device">—</span></div>
                                    <div>Alpha: <span id="reranker-info-alpha">—</span> • TopN: <span id="reranker-info-topn">—</span> • Batch: <span id="reranker-info-batch">—</span> • MaxLen: <span id="reranker-info-maxlen">—</span></div>
                                </div>
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                Blend Alpha (CE Weight)
                                <span class="help-icon" data-tooltip="AGRO_RERANKER_ALPHA">?</span>
                            </label>
                                <input type="number" name="AGRO_RERANKER_ALPHA" value="0.7" min="0.0" max="1.0" step="0.05">
                            </div>
                            <div class="input-group">
                                <label>
                                Max Sequence Length
                                <span class="help-icon" data-tooltip="AGRO_RERANKER_MAXLEN">?</span>
                            </label>
                                <input type="number" name="AGRO_RERANKER_MAXLEN" value="512" min="128" max="1024" step="64">
                            </div>
                            <div class="input-group">
                                <label>
                                Batch Size (Inference)
                                <span class="help-icon" data-tooltip="AGRO_RERANKER_BATCH">?</span>
                            </label>
                                <input type="number" name="AGRO_RERANKER_BATCH" value="16" min="1" max="64" step="4">
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Reranker Top-N
                                    <span class="help-icon" data-tooltip="AGRO_RERANKER_TOPN">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="AGRO_RERANKER_TOPN"
                                    name="AGRO_RERANKER_TOPN"
                                    value="50"
                                    min="10"
                                    max="200"
                                    step="5"
                                />
                            </div>
                            <div class="input-group">
                                <label>
                                    Voyage Rerank Model
                                    <span class="help-icon" data-tooltip="VOYAGE_RERANK_MODEL">?</span>
                                </label>
                                <input
                                    type="text"
                                    id="VOYAGE_RERANK_MODEL"
                                    name="VOYAGE_RERANK_MODEL"
                                    value="rerank-2"
                                />
                            </div>
                            <div class="input-group">
                                <label>
                                    Reload on Change
                                    <span class="help-icon" data-tooltip="AGRO_RERANKER_RELOAD_ON_CHANGE">?</span>
                                </label>
                                <select id="AGRO_RERANKER_RELOAD_ON_CHANGE" name="AGRO_RERANKER_RELOAD_ON_CHANGE">
                                    <option value="0">Disabled</option>
                                    <option value="1">Enabled</option>
                                </select>
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                Training Epochs
                                <span class="help-icon" data-tooltip="RERANKER_TRAIN_EPOCHS">?</span>
                            </label>
                                <input type="number" id="reranker-epochs" name="RERANKER_TRAIN_EPOCHS" value="2" min="1" max="10">
                            </div>
                            <div class="input-group">
                                <label>
                                Training Batch Size
                                <span class="help-icon" data-tooltip="RERANKER_TRAIN_BATCH">?</span>
                            </label>
                                <input type="number" id="reranker-batch" name="RERANKER_TRAIN_BATCH" value="16" min="1" max="64" step="4">
                            </div>
                            <div class="input-group">
                                <label>
                                Training Max Length
                                <span class="help-icon" data-tooltip="RERANKER_TRAIN_MAX_LENGTH">?</span>
                            </label>
                                <input type="number" id="reranker-maxlen" name="RERANKER_TRAIN_MAX_LENGTH" value="512" min="128" max="1024" step="64">
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Training Learning Rate
                                    <span class="help-icon" data-tooltip="RERANKER_TRAIN_LR">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="RERANKER_TRAIN_LR"
                                    name="RERANKER_TRAIN_LR"
                                    value="0.00002"
                                    min="0.000001"
                                    max="0.001"
                                    step="0.000001"
                                />
                            </div>
                            <div class="input-group">
                                <label>
                                    Warmup Ratio
                                    <span class="help-icon" data-tooltip="RERANKER_WARMUP_RATIO">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="RERANKER_WARMUP_RATIO"
                                    name="RERANKER_WARMUP_RATIO"
                                    value="0.1"
                                    min="0.0"
                                    max="0.5"
                                    step="0.05"
                                />
                            </div>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>
                                    Triplets Min Count
                                    <span class="help-icon" data-tooltip="TRIPLETS_MIN_COUNT">?</span>
                                </label>
                                <input
                                    type="number"
                                    id="TRIPLETS_MIN_COUNT"
                                    name="TRIPLETS_MIN_COUNT"
                                    value="100"
                                    min="10"
                                    max="10000"
                                    step="10"
                                />
                            </div>
                            <div class="input-group">
                                <label>
                                    Triplets Mine Mode
                                    <span class="help-icon" data-tooltip="TRIPLETS_MINE_MODE">?</span>
                                </label>
                                <select id="TRIPLETS_MINE_MODE" name="TRIPLETS_MINE_MODE">
                                    <option value="replace">Replace</option>
                                    <option value="append">Append</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Evaluation Results -->
                    <div class="settings-section" style="border-left: 3px solid var(--warn);">
                        <h3>📊 Evaluation Metrics</h3>
                        <div id="reranker-metrics-display" style="background: var(--card-bg); border-radius: 6px; padding: 16px; min-height: 120px;">
                            <div style="color: var(--fg-muted); text-align: center; padding: 20px;">No evaluation results yet. Click "Evaluate" above.</div>
                        </div>

                        <div class="input-row" style="margin-top: 16px;">
                            <div class="input-group">
                                <button id="reranker-save-baseline" style="background: var(--link); color: var(--on-link); border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; width: 100%; font-weight: 600;">Save as Baseline</button>
                            </div>
                            <div class="input-group">
                                <button id="reranker-compare-baseline" style="background: var(--warn); color: var(--on-warn); border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 600; width: 100%;">Compare vs Baseline</button>
                            </div>
                            <div class="input-group">
                                <button id="reranker-rollback" style="background: var(--err); color: var(--on-err); border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; width: 100%; font-weight: 600;">Rollback Model</button>
                            </div>
                        </div>
                    </div>

                    <!-- Log Viewer -->
                    <div class="settings-section">
                        <h3>📝 Query Logs</h3>
                        <div class="input-row">
                            <div class="input-group">
                                <button id="reranker-view-logs" style="background: var(--bg-elev1); color: var(--fg); border: 1px solid var(--line); padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 600;">View Logs</button>
                            </div>
                            <div class="input-group">
                                <button id="reranker-download-logs" style="background: var(--bg-elev1); color: var(--fg); border: 1px solid var(--line); padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 600;">Download Logs</button>
                            </div>
                            <div class="input-group">
                                <button id="reranker-clear-logs" style="background: var(--err); color: var(--on-err); border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 600;">Clear Logs</button>
                            </div>
                        </div>
                        <div id="reranker-logs-viewer" style="margin-top: 16px; background: var(--card-bg); border: 1px solid var(--line); border-radius: 6px; padding: 12px; max-height: 400px; overflow-y: auto; display: none; font-family: 'SF Mono', monospace; font-size: 11px;"></div>
                    </div>

                    <!-- Automation -->
                    <div class="settings-section" style="border-left: 3px solid var(--warn);">
                        <h3>🔄 Automation</h3>
                        <p class="small">Set up nightly training to automatically improve the reranker.</p>

                        <div class="input-row">
                            <div class="input-group">
                                <label>Nightly Training Time</label>
                                <input type="time" id="reranker-cron-time" value="02:15">
                            </div>
                            <div class="input-group">
                                <label>&nbsp;</label>
                                <button id="reranker-setup-cron" style="background: var(--link); color: var(--on-link); border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; width: 100%; font-weight: 600;">Setup Nightly Job</button>
                            </div>
                        </div>

                        <div style="margin-top: 8px;">
                            <button id="reranker-remove-cron" style="background: var(--err); color: var(--on-err); border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; width: 100%; font-weight: 600;">Remove Nightly Job</button>
                        </div>

                        <div id="reranker-cron-status" style="margin-top: 12px; padding: 8px; background: var(--card-bg); border-radius: 4px; font-size: 12px; color: var(--fg-muted);"></div>
                    </div>

                    <!-- Smoke Test -->
                    <div class="settings-section" style="border-left: 3px solid var(--accent);">
                        <h3>🧪 Smoke Test</h3>
                        <p class="small">Verify end-to-end functionality: query → retrieve → rerank → log → feedback.</p>
                        <div class="input-row">
                            <div class="input-group">
                                <label>Test Query</label>
                                <input type="text" id="reranker-test-query" placeholder="Where is OAuth validated?" value="Where is OAuth validated?">
                            </div>
                            <div class="input-group">
                                <label>&nbsp;</label>
                                <button id="reranker-smoke-test" style="background: var(--accent); color: var(--accent-contrast); border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 600; width: 100%;">Run Smoke Test</button>
                            </div>
                        </div>
                        <div id="reranker-smoke-result" style="margin-top: 16px; background: var(--card-bg); border: 1px solid var(--line); border-radius: 6px; padding: 12px; display: none; font-family: 'SF Mono', monospace; font-size: 11px;"></div>
                    </div>

                    <!-- Cost Tracking -->
                    <div class="settings-section" style="border-left: 3px solid var(--warn);">
                        <h3>💰 Cost Tracking</h3>
                        <div class="input-row">
                            <div class="input-group">
                                <label>Total Cost (Last 24h)</label>
                                <div id="reranker-cost-24h" style="padding: 8px; background: var(--card-bg); border-radius: 4px; font-family: 'SF Mono', monospace; font-size: 13px; color: var(--accent);">$0.00</div>
                            </div>
                            <div class="input-group">
                                <label>Avg Cost per Query</label>
                                <div id="reranker-cost-avg" style="padding: 8px; background: var(--card-bg); border-radius: 4px; font-family: 'SF Mono', monospace; font-size: 13px; color: var(--accent);">$0.00</div>
                            </div>
                        </div>
                        <button id="reranker-cost-details" style="background: var(--bg-elev1); color: var(--fg); border: 1px solid var(--line); padding: 8px 16px; border-radius: 4px; cursor: pointer; width: 100%; margin-top: 8px; font-weight: 600;">View Cost Breakdown</button>
                    </div>

                    <!-- No-Hit Tracking -->
                    <div class="settings-section" style="border-left: 3px solid var(--err);">
                        <h3>⚠️ No-Hit Queries</h3>
                        <p class="small">Queries that returned no relevant results. Consider reindexing or adding these terms to your corpus.</p>
                        <div id="reranker-nohits-list" style="background: var(--card-bg); border: 1px solid var(--line); border-radius: 6px; padding: 12px; max-height: 200px; overflow-y: auto; font-family: 'SF Mono', monospace; font-size: 11px;">
                            <div style="color: var(--fg-muted); text-align: center; padding: 20px;">Loading no-hit queries...</div>
                        </div>
                    </div>
                </div>

`;
  
  return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
}
