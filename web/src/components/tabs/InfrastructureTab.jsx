export default function InfrastructureTab() {
  return (
    <>
                {/* Infrastructure Services (from settings-docker) */}
                <div className="settings-section" style={{borderLeft: '3px solid var(--warn)'}}>
                    <h3>
                        <span style={{color: 'var(--warn)'}}>●</span> Infrastructure Services
                        <span className="tooltip-wrap">
                            <span className="help-icon">?</span>
                            <div className="tooltip-bubble">
                                <span className="tt-title">Infrastructure</span>
                                Core services for AGRO:
                                <ul style={{marginTop: '8px', paddingLeft: '16px'}}>
                                    <li><strong>Qdrant:</strong> Vector database (port 6333)</li>
                                    <li><strong>Redis:</strong> LangGraph memory (port 6379)</li>
                                    <li><strong>Prometheus:</strong> Metrics (port 9090)</li>
                                    <li><strong>Grafana:</strong> Dashboards (port 3000)</li>
                                </ul>
                            </div>
                        </span>
                    </h3>

                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px', marginBottom: '16px'}}>
                        {/* Qdrant */}
                        <div style={{background: 'var(--bg-elev2)', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                                <div style={{fontWeight: '600', color: 'var(--accent)'}}>Qdrant</div>
                                <div id="qdrant-status" style={{fontSize: '11px', color: 'var(--fg-muted)'}}>Checking...</div>
                            </div>
                            <div style={{fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '12px'}}>
                                Vector database • Port 6333
                            </div>
                            <div style={{display: 'flex', gap: '8px'}}>
                                <button className="small-button" id="btn-qdrant-open" style={{flex: '1', background: 'var(--bg-elev2)', color: 'var(--link)', border: '1px solid var(--link)'}}>
                                    🌐 Open UI
                                </button>
                                <button className="small-button" id="btn-qdrant-restart" style={{flex: '1', background: 'var(--bg-elev2)', color: 'var(--warn)', border: '1px solid var(--warn)'}}>
                                    ↻ Restart
                                </button>
                            </div>
                        </div>

                        {/* Redis */}
                        <div style={{background: 'var(--bg-elev2)', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                                <div style={{fontWeight: '600', color: 'var(--err)'}}>Redis</div>
                                <div id="redis-status" style={{fontSize: '11px', color: 'var(--fg-muted)'}}>Checking...</div>
                            </div>
                            <div style={{fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '12px'}}>
                                Memory store • Port 6379
                            </div>
                            <div style={{display: 'flex', gap: '8px'}}>
                                <button className="small-button" id="btn-redis-ping" style={{flex: '1', background: 'var(--bg-elev2)', color: 'var(--err)', border: '1px solid var(--err)'}}>
                                    📡 Ping
                                </button>
                                <button className="small-button" id="btn-redis-restart" style={{flex: '1', background: 'var(--bg-elev2)', color: 'var(--warn)', border: '1px solid var(--warn)'}}>
                                    ↻ Restart
                                </button>
                            </div>
                        </div>

                        {/* Prometheus */}
                        <div style={{background: 'var(--bg-elev2)', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                                <div style={{fontWeight: '600', color: 'var(--warn)'}}>Prometheus</div>
                                <div id="prometheus-status" style={{fontSize: '11px', color: 'var(--fg-muted)'}}>Checking...</div>
                            </div>
                            <div style={{fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '12px'}}>
                                Metrics collector • Port 9090
                            </div>
                            <div style={{display: 'flex', gap: '8px'}}>
                                <button className="small-button" id="btn-prometheus-open" style={{flex: '1', background: 'var(--bg-elev2)', color: 'var(--warn)', border: '1px solid var(--warn)'}}>
                                    🌐 Open UI
                                </button>
                            </div>
                        </div>

                        {/* Grafana */}
                        <div style={{background: 'var(--bg-elev2)', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                                <div style={{fontWeight: '600', color: 'var(--link)'}}>Grafana</div>
                                <div id="grafana-status" style={{fontSize: '11px', color: 'var(--fg-muted)'}}>Checking...</div>
                            </div>
                            <div style={{fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '12px'}}>
                                Dashboards • Port 3000
                            </div>
                            <div style={{display: 'flex', gap: '8px'}}>
                                <button className="small-button" id="btn-grafana-open" style={{flex: '1', background: 'var(--bg-elev2)', color: 'var(--link)', border: '1px solid var(--link)'}}>
                                    🌐 Open UI
                                </button>
                            </div>
                            <div style={{fontSize: '10px', color: 'var(--fg-muted)', marginTop: '8px'}}>
                                Login: admin / ********
                            </div>
                        </div>
                    </div>

                    <div style={{display: 'flex', gap: '8px'}}>
                        <button className="small-button" id="btn-infra-up" style={{flex: '1', background: 'var(--accent)', color: 'var(--accent-contrast)', padding: '12px', fontWeight: '600'}}>
                            ▶ Start All Infrastructure
                        </button>
                        <button className="small-button" id="btn-infra-down" style={{flex: '1', background: 'var(--err)', color: 'var(--fg)', padding: '12px', fontWeight: '600'}}>
                            ■ Stop All Infrastructure
                        </button>
                    </div>
                </div>

                {/* Docker Status (from settings-docker) */}
                <div className="settings-section" style={{borderLeft: '3px solid var(--link)'}}>
                    <h3 id="infra-docker-anchor">
                        <span style={{color: 'var(--link)'}}>●</span> Docker Status
                        <button className="small-button" id="btn-docker-refresh" style={{float: 'right', padding: '4px 12px', fontSize: '11px'}}>
                            ↻ Refresh All
                        </button>
                    </h3>

                    <div id="docker-status-display" style={{marginBottom: '16px'}}>
                        {/* Populated by JS */}
                    </div>
                </div>

                {/* Running Containers (from settings-docker) */}
                <div className="settings-section" style={{borderLeft: '3px solid var(--accent)'}}>
                    <h3>
                        <span style={{color: 'var(--accent)'}}>●</span> All Containers
                        <button className="small-button" id="btn-docker-refresh-containers" style={{float: 'right', padding: '4px 12px', fontSize: '11px'}}>
                            ↻ Refresh
                        </button>
                    </h3>

                    <div id="docker-containers-grid" style={{display: 'grid', gap: '12px', marginBottom: '16px'}}>
                        {/* Container cards populated by JS */}
                    </div>
                </div>

                {/* Docker Settings (from settings-docker) */}
                <div className="settings-section" style={{borderLeft: '3px solid var(--link)'}}>
                    <h3>
                        <span style={{color: 'var(--link)'}}>●</span> Docker Settings
                    </h3>

                    <div className="input-row">
                        <div className="input-group">
                            <label>Auto-start Colima</label>
                            <select name="AUTO_COLIMA">
                                <option value="1">On (auto-start if needed)</option>
                                <option value="0">Off (manual start)</option>
                            </select>
                            <p className="small" style={{color: 'var(--fg-muted)'}}>Automatically start Colima Docker runtime on macOS</p>
                        </div>
                        <div className="input-group">
                            <label>Colima Profile</label>
                            <input type="text" name="COLIMA_PROFILE" placeholder="default" />
                            <p className="small" style={{color: 'var(--fg-muted)'}}>Colima profile name (leave empty for default)</p>
                        </div>
                    </div>

                    <button className="small-button" id="btn-save-docker-settings" style={{background: 'var(--link)', color: 'var(--accent-contrast)', fontWeight: '600'}}>
                        💾 Save Settings
                    </button>
                </div>

                {/* MCP Servers (from devtools-integrations) */}
                <div className="settings-section">
                    <h3 id="infra-git-hooks-anchor">Git Hooks (Auto-Index)</h3>
                    <p className="small">Install local git hooks to auto-run BM25 indexing on branch changes and commits. Enable it with <code>AUTO_INDEX=1</code>.</p>
                    <div className="input-row">
                        <div className="input-group">
                            <label>Install Hooks</label>
                            <button className="small-button" id="btn-install-hooks">Install</button>
                        </div>
                        <div className="input-group">
                            <label>Status</label>
                            <div id="hooks-status" className="mono">—</div>
                        </div>
                    </div>
                    <div className="input-row">
                        <div className="input-group full-width">
                            <label>Enable</label>
                            <input type="text" readOnly value="export AUTO_INDEX=1" onClick={(e) => { e.target.select(); document.execCommand('copy'); }} />
                        </div>
                    </div>
                </div>

                <div className="settings-section" style={{marginTop: '16px'}}>
                    <h3>Commit Metadata (Agent/Session Signing)</h3>
                    <p className="small">Append a Chat Session trailer to every commit and optionally set git user info. This helps trace changes to a local chat session ID.</p>

                    <div className="input-row">
                        <div className="input-group">
                            <label>Agent Name</label>
                            <input type="text" id="git-agent-name" placeholder="Codex Agent" />
                        </div>
                        <div className="input-group">
                            <label>Agent Email</label>
                            <input type="email" id="git-agent-email" placeholder="agent@example.com" />
                        </div>
                    </div>

                    <div className="input-row">
                        <div className="input-group">
                            <label>Chat Session ID</label>
                            <input type="text" id="git-chat-session" placeholder="paste your local chat session id" />
                        </div>
                        <div className="input-group">
                            <label>Trailer Key</label>
                            <input type="text" id="git-trailer-key" value="Chat-Session" />
                        </div>
                    </div>

                    <div className="input-row">
                        <div className="input-group">
                            <label><input type="checkbox" id="git-set-user" /> Set git user.name/email</label>
                        </div>
                        <div className="input-group">
                            <label><input type="checkbox" id="git-append-trailer" checked /> Append session trailer via hook</label>
                        </div>
                    </div>

                    <div className="input-row">
                        <div className="input-group">
                            <label><input type="checkbox" id="git-enable-template" /> Use commit template</label>
                        </div>
                        <div className="input-group">
                            <label><input type="checkbox" id="git-install-hook" checked /> Install/refresh prepare-commit-msg hook</label>
                        </div>
                    </div>

                    <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                        <button className="small-button" id="btn-save-commit-meta" style={{background: 'var(--accent)', color: 'var(--accent-contrast)'}}>💾 Save Commit Metadata</button>
                        <div id="git-commit-meta-status" className="mono" style={{fontSize: '12px', color: 'var(--fg-muted)'}}>—</div>
                    </div>
                </div>

                {/* Paths & Endpoints (from config-infra) */}
                <div className="settings-section">
                    <h3 id="infra-paths-anchor">Infrastructure Configuration</h3>
                    <div className="input-row">
                        <div className="input-group">
                            <label>Qdrant URL</label>
                            <input type="text" name="QDRANT_URL" value="http://127.0.0.1:6333" />
                        </div>
                        <div className="input-group">
                            <label>Redis URL</label>
                            <input type="text" name="REDIS_URL" value="redis://127.0.0.1:6379/0" />
                        </div>
                    </div>
                    <div className="input-row">
                        <div className="input-group">
                            <label>Repo Root</label>
                            <input type="text" name="REPO_ROOT" placeholder="Override project root (optional)" />
                        </div>
                        <div className="input-group">
                            <label>Files Root</label>
                            <input type="text" name="FILES_ROOT" placeholder="/files mount root (optional)" />
                        </div>
                    </div>
                    <div className="input-row">
                        <div className="input-group">
                            <label>Active Repository</label>
                            <select name="REPO" id="repo-select"></select>
                        </div>
                        <div className="input-group">
                            <label>Collection Suffix</label>
                            <input type="text" name="COLLECTION_SUFFIX" placeholder="default" />
                        </div>
                    </div>
                    <div className="input-row">
                        <div className="input-group">
                            <label>Collection Name</label>
                            <input type="text" name="COLLECTION_NAME" placeholder="code_chunks_{REPO}" />
                        </div>
                        <div className="input-group">
                            <label>Repo Path (fallback)</label>
                            <input type="text" name="REPO_PATH" placeholder="/path/to/repo" />
                        </div>
                    </div>
                    <div className="input-row">
                        <div className="input-group">
                            <label>GUI Directory</label>
                            <input type="text" name="GUI_DIR" placeholder="./gui" />
                        </div>
                        <div className="input-group">
                            <label>Docs Directory</label>
                            <input type="text" name="DOCS_DIR" placeholder="./docs" />
                        </div>
                    </div>
                    <div className="input-row">
                        <div className="input-group">
                            <label>Data Directory</label>
                            <input type="text" name="DATA_DIR" placeholder="./data" />
                        </div>
                        <div className="input-group">
                        </div>
                    </div>
                    <div className="input-row">
                        <div className="input-group">
                            <label>Repos File</label>
                            <input type="text" name="REPOS_FILE" value="./repos.json" />
                        </div>
                        <div className="input-group">
                            <label>Out Dir Base</label>
                            <input type="text" name="OUT_DIR_BASE" placeholder="./out.noindex or ./out" />
                            <p className="small" style={{color: 'var(--fg-muted)'}}>
                                Primary storage location for all indexed data. This is the <strong>single source</strong> for this setting.
                            </p>
                        </div>
                    </div>
                    <div className="input-row">
                        <div className="input-group">
                            <label>RAG Out Base</label>
                            <input type="text" name="RAG_OUT_BASE" placeholder="Override for OUT_DIR_BASE" />
                        </div>
                        <div className="input-group">
                            <label>MCP HTTP Host</label>
                            <input type="text" name="MCP_HTTP_HOST" value="0.0.0.0" />
                        </div>
                    </div>
                    <div className="input-row">
                        <div className="input-group">
                            <label>MCP HTTP Port</label>
                            <input type="number" name="MCP_HTTP_PORT" value="8013" />
                        </div>
                        <div className="input-group">
                            <label>MCP HTTP Path</label>
                            <input type="text" name="MCP_HTTP_PATH" value="/mcp" />
                        </div>
                    </div>
                </div>

                {/* Performance Monitoring (from analytics-performance) */}
                <div className="settings-section" style={{borderLeft: '3px solid var(--link)'}}>
                    <h3>📊 Performance & Reliability Alerts</h3>
                    <p className="small">Set thresholds for error rates, latency, and timeout incidents.</p>

                    <div className="input-row">
                        <div className="input-group">
                            <label>Error Rate Threshold (%)</label>
                            <input type="number" id="alert_error_rate_threshold_percent" min="0.1" max="50" step="0.1" placeholder="5.0" />
                            <p className="small" style={{color: 'var(--fg-muted)', marginTop: '4px'}}>Alert when error rate exceeds this percentage</p>
                        </div>
                        <div className="input-group">
                            <label>Request Latency P99 (seconds)</label>
                            <input type="number" id="alert_request_latency_p99_seconds" min="0.1" max="60" step="0.1" placeholder="5.0" />
                            <p className="small" style={{color: 'var(--fg-muted)', marginTop: '4px'}}>Alert when 99th percentile latency exceeds this</p>
                        </div>
                    </div>

                    <div className="input-row">
                        <div className="input-group">
                            <label>Timeout Errors (per 5 min)</label>
                            <input type="number" id="alert_timeout_errors_per_5min" min="1" max="1000" step="1" placeholder="10" />
                            <p className="small" style={{color: 'var(--fg-muted)', marginTop: '4px'}}>Alert when timeout count exceeds this</p>
                        </div>
                        <div className="input-group">
                            <label>Rate Limit Errors (per 5 min)</label>
                            <input type="number" id="alert_rate_limit_errors_per_5min" min="1" max="1000" step="1" placeholder="5" />
                            <p className="small" style={{color: 'var(--fg-muted)', marginTop: '4px'}}>Alert when rate limit hits exceed this</p>
                        </div>
                    </div>
                </div>

                {/* Usage Statistics (from analytics-usage) */}
                <div className="settings-section" style={{borderLeft: '3px solid var(--accent)'}}>
                    <h3>🌐 API Anomaly Alerts</h3>
                    <p className="small">Detect unusual API calling patterns that might indicate issues or loops.</p>

                    <div className="input-row">
                        <div className="input-group">
                            <label>Endpoint Call Frequency (calls/min)</label>
                            <input type="number" id="alert_endpoint_call_frequency_per_minute" min="1" max="1000" step="1" placeholder="10" />
                            <p className="small" style={{color: 'var(--fg-muted)', marginTop: '4px'}}>Alert when a single endpoint gets called this frequently</p>
                        </div>
                        <div className="input-group">
                            <label>Sustained Frequency Duration (minutes)</label>
                            <input type="number" id="alert_endpoint_frequency_sustained_minutes" min="1" max="60" step="1" placeholder="2" />
                            <p className="small" style={{color: 'var(--fg-muted)', marginTop: '4px'}}>Duration threshold for sustained frequency alert</p>
                        </div>
                    </div>

                    <div className="input-row">
                        <div className="input-group">
                            <label>Cohere Rerank Calls (calls/min)</label>
                            <input type="number" id="alert_cohere_rerank_calls_per_minute" min="1" max="1000" step="1" placeholder="30" />
                            <p className="small" style={{color: 'var(--fg-muted)', marginTop: '4px'}}>Alert when Cohere reranking calls spike</p>
                        </div>
                    </div>
                </div>

                {/* Tracing & Observability (from analytics-tracing) */}
                <div className="settings-section" style={{borderLeft: '3px solid var(--link)'}}>
                    <h3>
                        <span className="accent-blue">●</span> LangSmith (Preview)
                    </h3>
                    <p className="small">View the real LangSmith run inside AGRO. Uses a shared link for embedding.</p>
                    <div className="input-row">
                        <div className="input-group">
                            <label>Project</label>
                            <input type="text" id="ls-project" placeholder="agro" />
                        </div>
                        <div className="input-group">
                            <label>Share</label>
                            <select id="ls-share">
                                <option value="true" selected>Yes (public share link)</option>
                                <option value="false">No (requires login)</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <button className="small-button" id="btn-ls-latest">Load Latest</button>
                        </div>
                    </div>
                    <div className="input-row">
                        <div className="input-group full-width">
                            <a id="ls-open" href="#" target="_blank" style={{display: 'none'}}>Open in new tab ↗</a>
                        </div>
                    </div>
                    <div id="ls-embed-wrap" style={{position: 'relative', width: '100%', height: '480px', background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', overflow: 'hidden'}}>
                        <iframe id="ls-iframe" style={{width: '100%', height: '100%', border: 'none', background: 'var(--panel)'}}></iframe>
                    </div>
                    <p className="small" id="ls-note" style={{color: 'var(--fg-muted)', marginTop: '8px', display: 'none'}}>If the viewer is blocked by the site, use the "Open in new tab" link above.</p>
                </div>
    </>
  )
}
