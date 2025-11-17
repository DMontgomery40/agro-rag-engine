import React from 'react';

// Exact legacy dashboard markup via innerHTML for 1:1 parity
export function Dashboard() {
  const inner = `
                <!-- Compact Status + Quick Actions -->
                <div class="settings-section" style="background: var(--panel); border-left: 3px solid var(--accent);">
                    <div style="display: grid; grid-template-columns: 300px 1fr; gap: 24px; align-items: start;">
                        <!-- Left: System Status -->
                        <div>
                            <h3 style="font-size: 14px; margin-bottom: 16px; color: var(--accent); display: flex; align-items: center; gap: 8px;">
                                <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 8px var(--accent);"></span>
                                System Status
                            </h3>
                            <div style="display: flex; flex-direction: column; gap: 10px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--card-bg); border-radius: 4px; border: 1px solid var(--line);">
                                    <span style="font-size: 11px; color: var(--fg-muted); text-transform: uppercase; letter-spacing: 0.5px;">Health</span>
                                    <span id="dash-health" class="mono" style="color: var(--ok); font-weight: 600;">—</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--card-bg); border-radius: 4px; border: 1px solid var(--line);">
                                    <span style="font-size: 11px; color: var(--fg-muted); text-transform: uppercase; letter-spacing: 0.5px;">Repo</span>
                                    <span id="dash-repo" class="mono" style="color: var(--fg); font-weight: 600;">—</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--card-bg); border-radius: 4px; border: 1px solid var(--line);">
                                    <span style="font-size: 11px; color: var(--fg-muted); text-transform: uppercase; letter-spacing: 0.5px;">Branch</span>
                                    <span id="dash-branch" class="mono" style="color: var(--link); font-weight: 600;">—</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--card-bg); border-radius: 4px; border: 1px solid var(--line);">
                                    <span style="font-size: 11px; color: var(--fg-muted); text-transform: uppercase; letter-spacing: 0.5px;">Cards</span>
                                    <span id="dash-cards" class="mono" style="color: var(--link); font-weight: 600;">—</span>
                                </div>
                                <div style="display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; background: var(--card-bg); border-radius: 4px; border: 1px solid var(--line);">
                                    <span style="font-size: 11px; color: var(--fg-muted); text-transform: uppercase; letter-spacing: 0.5px;">MCP Servers</span>
                                    <div id="dash-mcp" style="display: flex; flex-direction: column; gap: 4px; font-size: 10px; font-family: 'SF Mono', monospace; color: var(--link);">
                                        <span>—</span>
                                    </div>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--card-bg); border-radius: 4px; border: 1px solid var(--line);">
                                    <span style="font-size: 11px; color: var(--fg-muted); text-transform: uppercase; letter-spacing: 0.5px;">Auto-Tune</span>
                                    <span id="dash-autotune" class="mono" style="color: var(--warn); font-weight: 600;">—</span>
                                </div>
                            </div>
                        </div>

                        <!-- Right: Quick Actions -->
                        <div>
                            <h3 style="font-size: 14px; margin-bottom: 16px; color: var(--warn); display: flex; align-items: center; gap: 8px;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                                </svg>
                                Quick Actions
                            </h3>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px;">
                                <button class="action-btn" id="btn-generate-keywords" data-action="generate-keywords">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M12 2l2.39 4.85L20 8l-4 3.9.95 5.54L12 15.77 7.05 17.45 8 11.9 4 8l5.61-1.15L12 2z"></path>
                                    </svg>
                                    <span>Generate Keywords</span>
                                </button>
                                <button class="action-btn" id="dash-change-repo" data-action="change-repo">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                                    </svg>
                                    <span>Change Repo</span>
                                </button>
                                <button class="action-btn" id="dash-index-start" data-action="index">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                                    </svg>
                                    <span>Run Indexer</span>
                                </button>
                                <button class="action-btn" id="dash-reload-config" data-action="reload">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="23 4 23 10 17 10"></polyline>
                                        <polyline points="1 20 1 14 7 14"></polyline>
                                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                    </svg>
                                    <span>Reload Config</span>
                                </button>
                                <div style="position: relative;">
                                    <button class="action-btn" id="dash-eval-trigger" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M9 11l3 3L22 4"></path>
                                            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        <span>Run Eval</span>
                                        <svg id="dash-eval-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: auto; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);">
                                            <polyline points="6 9 12 15 18 9"></polyline>
                                        </svg>
                                    </button>
                                    <div id="dash-eval-dropdown" style="
                                        display: none;
                                        position: absolute;
                                        top: 100%;
                                        left: 0;
                                        width: 360px;
                                        background: var(--card-bg);
                                        border: 1px solid var(--line);
                                        border-radius: 8px;
                                        padding: 12px;
                                        box-shadow: 0 10px 30px rgba(0,0,0,0.25);
                                        z-index: 10;
                                    ">
                                        <div class="input-row">
                                            <div class="input-group">
                                                <label>Model</label>
                                                <input type="text" id="dash-eval-model" placeholder="e.g. text-embedding-3-large, rerank-english-v3.0">
                                            </div>
                                            <div class="input-group">
                                                <label>Top K</label>
                                                <input type="number" id="dash-eval-topk" value="5" min="1" max="20">
                                            </div>
                                        </div>
                                        <div class="input-row">
                                            <div class="input-group">
                                                <label>Questions</label>
                                                <input type="text" id="dash-eval-questions" placeholder="id1,id2,id3 (optional - uses golden if empty)">
                                            </div>
                                            <div class="input-group">
                                                <label>Judge</label>
                                                <input type="text" id="dash-eval-judge" placeholder="optional - use GEN_MODEL by default">
                                            </div>
                                        </div>
                                        <div style="display: flex; justify-content: flex-end; gap: 8px;">
                                            <button class="small-button ghost" id="dash-eval-cancel">Cancel</button>
                                            <button class="small-button" id="dash-eval-run">Run</button>
                                        </div>
                                    </div>
                                </div>
                                <button class="action-btn" id="dash-refresh-status" data-action="refresh">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="23 4 23 10 17 10"></polyline>
                                        <polyline points="1 20 1 14 7 14"></polyline>
                                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                    </svg>
                                    <span>Refresh Status</span>
                                </button>
                            </div>

                            <!-- Status Display -->
                            <div id="dash-index-status" style="background: var(--code-bg); border: 1px solid var(--line); border-radius: 6px; padding: 12px; font-family: 'SF Mono', monospace; font-size: 12px; line-height: 1.6; color: var(--fg-muted); min-height: 48px;"></div>

                            <!-- Progress Bar -->
                            <div style="margin-top: 12px; background: var(--card-bg); border: 1px solid var(--line); border-radius: 4px; height: 8px; overflow: hidden;">
                                <div id="dash-index-bar" style="height: 100%; width: 0%; background: linear-gradient(90deg, var(--warn) 0%, var(--accent) 100%); transition: width 0.3s ease, opacity 0.3s ease;"></div>
                            </div>

                            <!-- Live Terminal Container (shared for keywords, indexer, eval) -->
                            <div id="dash-operations-terminal"></div>
                        </div>
                    </div>

                <!-- Top Accessed Folders Section -->
                <div class="settings-section" style="background: var(--panel); border-left: 3px solid var(--warn);">
                    <h3 style="font-size: 14px; margin-bottom: 16px; color: var(--warn); display: flex; align-items: center; gap: 8px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                        </svg>
                        Top Folders (Last 5 Days)
                    </h3>
                    <div id="dash-top-folders-metrics" style="color: var(--fg-muted); font-size: 12px;">Loading folder data...</div>
                </div>

                <div class="settings-section wizard">
                    <h3><span class="accent-blue">●</span> Auto-Profile</h3>
                    <div class="step" style="display: grid; grid-template-columns: 1fr; gap: 16px;">
                        <div class="step-body">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                <div style="background: var(--card-bg); border: 1px solid var(--line); border-radius: 8px; padding: 12px;">
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                        <span style="color: var(--link);">●</span>
                                        <span class="mono" style="font-size: 12px;">Triplet Mining</span>
                                    </div>
                                    <p class="small" style="margin-bottom: 10px;">Find hard negatives and informative pairs from your repo for training.</p>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                        <button class="small-button" id="apv2-mine-default">Mine Triplets</button>
                                        <button class="small-button ghost" id="apv2-mine-configure">Configure</button>
                                    </div>
                                </div>
                                <div style="background: var(--card-bg); border: 1px solid var(--line); border-radius: 8px; padding: 12px;">
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                        <span style="color: var(--link);">●</span>
                                        <span class="mono" style="font-size: 12px;">Train Learning-to-Rank</span>
                                    </div>
                                    <p class="small" style="margin-bottom: 10px;">Train a cross-encoder reranker using the mined triplets and evaluate quality.</p>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                        <button class="small-button" id="apv2-train-default">Train Model</button>
                                        <button class="small-button ghost" id="apv2-train-configure">Configure</button>
                                    </div>
                                </div>
                                <div style="background: var(--card-bg); border: 1px solid var(--line); border-radius: 8px; padding: 12px;">
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                        <span style="color: var(--link);">●</span>
                                        <span class="mono" style="font-size: 12px;">Evaluate Ranking</span>
                                    </div>
                                    <p class="small" style="margin-bottom: 10px;">Run golden questions evaluation on default or selected questions to verify improvements.</p>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                        <button class="small-button" id="apv2-eval-default">Evaluate</button>
                                        <button class="small-button ghost" id="apv2-eval-configure">Configure</button>
                                    </div>
                                </div>
                            </div>
                            <div style="margin-top: 10px; display: flex; gap: 8px; align-items: center; color: var(--fg-muted); font-size: 12px;">
                                <span>Advanced</span>
                                <label class="switch">
                                    <input type="checkbox" id="apv2-toggle">
                                    <span class="slider"></span>
                                </label>
                                <span style="font-size:12px;color: var(--fg-muted);">toggle</span>
                            </div>
                            <div id="apv2-advanced" style="display:none;">
                                <div class="input-row">
                                    <div class="input-group">
                                        <label>Objective</label>
                                        <select id="apv2-mode">
                                            <option value="balanced">Balanced</option>
                                            <option value="cost">Cost</option>
                                            <option value="performance">Performance</option>
                                        </select>
                                    </div>
                                    <div class="input-group">
                                        <label>Monthly Budget (override)</label>
                                        <input type="number" id="apv2-budget" placeholder="uses Budget if empty">
                                    </div>
                                </div>
                                <div class="input-row">
                                    <div class="input-group full-width">
                                        <label>Providers Allowed</label>
                                        <div style="display:flex;flex-wrap:wrap;gap:10px;">
                                            <label style="font-size:12px;color: var(--fg-muted);"><input type="checkbox" value="openai" class="apv2-prov" style="width:auto;"> openai</label>
                                            <label style="font-size:12px;color: var(--fg-muted);"><input type="checkbox" value="anthropic" class="apv2-prov" style="width:auto;"> anthropic</label>
                                            <label style="font-size:12px;color: var(--fg-muted);"><input type="checkbox" value="google" class="apv2-prov" style="width:auto;"> google</label>
                                            <label style="font-size:12px;color: var(--fg-muted);"><input type="checkbox" value="voyage" class="apv2-prov" style="width:auto;"> voyage</label>
                                            <label style="font-size:12px;color: var(--fg-muted);"><input type="checkbox" value="cohere" class="apv2-prov" style="width:auto;"> cohere</label>
                                            <label style="font-size:12px;color: var(--fg-muted);"><input type="checkbox" value="local" class="apv2-prov" style="width:auto;"> local</label>
                                        </div>
                                    </div>
                                </div>
                                <div class="input-row">
                                    <div class="input-group">
                                        <label>Regions Allowed (CSV)</label>
                                        <input type="text" id="apv2-regions" placeholder="us,eu">
                                    </div>
                                    <div class="input-group">
                                        <label>Compliance (CSV)</label>
                                        <input type="text" id="apv2-compliance" placeholder="soc2,hipaa">
                                    </div>
                                </div>
                                <div class="input-row">
                                    <div class="input-group">
                                        <label>Requests/Day</label>
                                        <input type="number" id="apv2-rpd" placeholder="e.g. 100">
                                    </div>
                                    <div class="input-group">
                                        <label>Tokens In / Request</label>
                                        <input type="number" id="apv2-tin" placeholder="e.g. 600">
                                    </div>
                                </div>
                                <div class="input-row">
                                    <div class="input-group">
                                        <label>Tokens Out / Request</label>
                                        <input type="number" id="apv2-tout" placeholder="e.g. 1200">
                                    </div>
                                    <div class="input-group">
                                        <label>Multi‑Query Rewrites</label>
                                        <input type="number" id="apv2-rewrites" placeholder="e.g. 2">
                                    </div>
                                </div>
                                <div class="input-row">
                                    <div class="input-group">
                                        <label>Reranking Strategy</label>
                                        <select id="apv2-rerank">
                                            <option value="default">Default Ranking</option>
                                            <option value="cohere">Cohere Reranker</option>
                                            <option value="local">Cross-Encoder (Local)</option>
                                        </select>
                                    </div>
                                    <div class="input-group">
                                        <label>Top-K Range</label>
                                        <input type="text" id="apv2-topk" placeholder="e.g. 4-8">
                                    </div>
                                </div>
                                <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;">
                                    <button class="small-button ghost" id="apv2-cancel">Cancel</button>
                                    <button class="small-button" id="apv2-apply">Apply</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
  `;

  return (
    <div id="tab-dashboard" className="tab-content active" dangerouslySetInnerHTML={{ __html: inner }} />
  );
}

